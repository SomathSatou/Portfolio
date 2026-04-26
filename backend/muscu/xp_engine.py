"""XP calculation engine for the IRL RPG muscu module."""
import math
from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone

from .models import (
    Badge, MuscleXP, UserBadge, UserTotalXP, Workout, WorkoutSet, Goal,
)

# ─── Level / Rank helpers ────────────────────────────────────────────────────

RANK_THRESHOLDS = [
    (200_000, 'legende'),
    (80_000, 'master'),
    (30_000, 'diamant'),
    (12_000, 'platine'),
    (4_000, 'or'),
    (1_500, 'argent'),
    (0, 'bronze'),
]


def xp_for_level(level: int) -> int:
    """XP cumulé nécessaire pour atteindre le niveau donné."""
    return int(200 * (level ** 1.8))


def level_from_xp(xp: int) -> int:
    """Calcule le niveau correspondant à un montant d'XP."""
    level = 1
    while xp_for_level(level + 1) <= xp:
        level += 1
    return level


def rank_from_xp(xp: int) -> str:
    """Calcule le rang correspondant à un montant d'XP total."""
    for threshold, rank in RANK_THRESHOLDS:
        if xp >= threshold:
            return rank
    return 'bronze'


# ─── XP distribution ────────────────────────────────────────────────────────

def distribute_xp_for_workout(workout: Workout) -> dict:
    """
    Distribue l'XP pour une séance fermée.
    Retourne un dict { muscle_id: xp_gained }.
    """
    xp_distribution: dict[int, float] = {}

    for wset in workout.sets.select_related('exercise').all():
        exercise = wset.exercise
        volume = wset.weight_kg * wset.reps
        xp_brut = math.log2(volume + 1) * 10

        for em in exercise.muscle_targets.select_related('muscle').all():
            xp_muscle = xp_brut * exercise.difficulty_factor * em.involvement
            xp_distribution[em.muscle_id] = xp_distribution.get(em.muscle_id, 0) + xp_muscle

    # Apply XP to MuscleXP records
    for muscle_id, xp_gained in xp_distribution.items():
        xp_int = int(xp_gained)
        if xp_int <= 0:
            continue
        muscle_xp, _ = MuscleXP.objects.get_or_create(
            user=workout.user, muscle_id=muscle_id,
        )
        muscle_xp.xp += xp_int
        muscle_xp.level = level_from_xp(muscle_xp.xp)
        muscle_xp.save(update_fields=['xp', 'level'])

    # Update total XP
    total_xp_val = MuscleXP.objects.filter(user=workout.user).aggregate(
        total=Sum('xp'),
    )['total'] or 0

    total_xp_obj, _ = UserTotalXP.objects.get_or_create(user=workout.user)
    total_xp_obj.xp = total_xp_val
    total_xp_obj.level = level_from_xp(total_xp_val)
    total_xp_obj.rank = rank_from_xp(total_xp_val)
    total_xp_obj.save(update_fields=['xp', 'level', 'rank'])

    return {mid: int(xp) for mid, xp in xp_distribution.items()}


# ─── Goal update ─────────────────────────────────────────────────────────────

def update_goals_for_workout(workout: Workout) -> list[int]:
    """
    Met à jour les objectifs actifs après une séance.
    Retourne la liste des goal IDs nouvellement atteints.
    """
    achieved_ids: list[int] = []
    user = workout.user
    active_goals = Goal.objects.filter(user=user, status='active').select_related('exercise')

    for goal in active_goals:
        sets_for_exercise = workout.sets.filter(exercise=goal.exercise)
        if not sets_for_exercise.exists():
            continue

        if goal.metric == 'max_weight':
            max_w = max(s.weight_kg for s in sets_for_exercise)
            if max_w > goal.current_value:
                goal.current_value = max_w
        elif goal.metric == 'max_reps':
            max_r = max(s.reps for s in sets_for_exercise)
            if max_r > goal.current_value:
                goal.current_value = max_r
        elif goal.metric == 'total_volume':
            vol = sum(s.weight_kg * s.reps for s in sets_for_exercise)
            goal.current_value += vol

        if goal.current_value >= goal.target_value:
            goal.status = 'achieved'
            goal.achieved_at = timezone.now()
            achieved_ids.append(goal.id)

        goal.save(update_fields=['current_value', 'status', 'achieved_at'])

    return achieved_ids


# ─── Badge check ─────────────────────────────────────────────────────────────

def check_badges_for_user(user) -> list[int]:
    """
    Vérifie et attribue les badges non encore obtenus.
    Retourne la liste des badge IDs nouvellement attribués.
    """
    earned_ids = set(UserBadge.objects.filter(user=user).values_list('badge_id', flat=True))
    new_badges: list[int] = []

    all_badges = Badge.objects.all()
    for badge in all_badges:
        if badge.id in earned_ids:
            continue

        if _badge_condition_met(badge, user):
            UserBadge.objects.create(user=user, badge=badge)
            new_badges.append(badge.id)

    return new_badges


def _badge_condition_met(badge: Badge, user) -> bool:
    """Check if a badge condition is met for the given user."""
    if badge.trigger_type == 'first_workout':
        return Workout.objects.filter(user=user, status='closed').count() >= badge.trigger_value

    if badge.trigger_type == 'total_workouts':
        return Workout.objects.filter(user=user, status='closed').count() >= badge.trigger_value

    if badge.trigger_type == 'total_volume':
        total = WorkoutSet.objects.filter(
            workout__user=user, workout__status='closed',
        ).aggregate(
            vol=Sum(models_F_weight_times_reps()),
        )['vol'] or 0
        return total >= badge.trigger_value

    if badge.trigger_type == 'muscle_level':
        return MuscleXP.objects.filter(user=user, level__gte=badge.trigger_value).exists()

    if badge.trigger_type == 'total_level':
        total_xp = getattr(user, 'total_xp', None)
        if total_xp is None:
            return False
        return total_xp.level >= badge.trigger_value

    if badge.trigger_type == 'streak':
        return _compute_streak(user) >= badge.trigger_value

    return False


def _compute_streak(user) -> int:
    """Compute the current consecutive-day workout streak."""
    today = timezone.now().date()
    dates = (
        Workout.objects.filter(user=user, status='closed')
        .values_list('started_at', flat=True)
        .order_by('-started_at')
    )
    unique_dates = sorted({d.date() for d in dates}, reverse=True)

    streak = 0
    expected = today
    for d in unique_dates:
        if d == expected:
            streak += 1
            expected -= timedelta(days=1)
        elif d < expected:
            break
    return streak


def models_F_weight_times_reps():
    """Return an F expression for weight_kg * reps."""
    from django.db.models import F
    return F('weight_kg') * F('reps')
