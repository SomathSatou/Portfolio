from django.conf import settings
from django.db import models


# ─── Profile & Auth ──────────────────────────────────────────────────────────

class MuscuProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='muscu_profile',
    )
    can_access_muscu = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to='muscu/avatars/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Profil Muscu'
        verbose_name_plural = 'Profils Muscu'

    def __str__(self) -> str:
        return f'{self.user.username} (muscu)'


# ─── Muscles ─────────────────────────────────────────────────────────────────

class MuscleGroup(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, blank=True, default='')
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Groupe musculaire'
        verbose_name_plural = 'Groupes musculaires'

    def __str__(self) -> str:
        return self.name


class Muscle(models.Model):
    name = models.CharField(max_length=100)
    group = models.ForeignKey(MuscleGroup, on_delete=models.CASCADE, related_name='muscles')

    class Meta:
        ordering = ['group__order', 'name']
        verbose_name = 'Muscle'
        verbose_name_plural = 'Muscles'

    def __str__(self) -> str:
        return f'{self.name} ({self.group.name})'


# ─── Gyms & Machines ────────────────────────────────────────────────────────

class Gym(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True, default='')
    city = models.CharField(max_length=100)

    class Meta:
        ordering = ['city', 'name']
        verbose_name = 'Salle'
        verbose_name_plural = 'Salles'

    def __str__(self) -> str:
        return self.name


class UserGymMembership(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gym_memberships',
    )
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name='members')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'gym')
        verbose_name = 'Abonnement salle'
        verbose_name_plural = 'Abonnements salle'

    def __str__(self) -> str:
        return f'{self.user.username} → {self.gym.name}'


class Machine(models.Model):
    name = models.CharField(max_length=200)
    gym = models.ForeignKey(Gym, on_delete=models.CASCADE, related_name='machines')
    description = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['gym', 'name']
        verbose_name = 'Machine'
        verbose_name_plural = 'Machines'

    def __str__(self) -> str:
        return f'{self.name} ({self.gym.name})'


# ─── Exercises ───────────────────────────────────────────────────────────────

class Exercise(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    machine = models.ForeignKey(
        Machine, on_delete=models.SET_NULL, null=True, blank=True, related_name='exercises',
    )
    is_public = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_exercises',
    )
    difficulty_factor = models.FloatField(default=1.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Exercice'
        verbose_name_plural = 'Exercices'

    def __str__(self) -> str:
        return self.name


class ExerciseMuscle(models.Model):
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name='muscle_targets')
    muscle = models.ForeignKey(Muscle, on_delete=models.CASCADE, related_name='exercise_targets')
    involvement = models.FloatField(default=1.0)

    class Meta:
        unique_together = ('exercise', 'muscle')
        verbose_name = 'Exercice ↔ Muscle'
        verbose_name_plural = 'Exercices ↔ Muscles'

    def __str__(self) -> str:
        return f'{self.exercise.name} → {self.muscle.name} ({self.involvement})'


# ─── Workouts ────────────────────────────────────────────────────────────────

class Workout(models.Model):
    STATUS_CHOICES = [('open', 'En cours'), ('closed', 'Terminée')]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workouts',
    )
    gym = models.ForeignKey(Gym, on_delete=models.SET_NULL, null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Séance'
        verbose_name_plural = 'Séances'

    def __str__(self) -> str:
        return f'Séance {self.id} — {self.user.username} ({self.status})'


class WorkoutSet(models.Model):
    workout = models.ForeignKey(Workout, on_delete=models.CASCADE, related_name='sets')
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    weight_kg = models.FloatField()
    reps = models.IntegerField()
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = 'Série'
        verbose_name_plural = 'Séries'

    def __str__(self) -> str:
        return f'{self.exercise.name}: {self.weight_kg}kg × {self.reps}'


# ─── Gamification ────────────────────────────────────────────────────────────

class MuscleXP(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='muscle_xps',
    )
    muscle = models.ForeignKey(Muscle, on_delete=models.CASCADE)
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)

    class Meta:
        unique_together = ('user', 'muscle')
        verbose_name = 'XP Muscle'
        verbose_name_plural = 'XP Muscles'

    def __str__(self) -> str:
        return f'{self.user.username} — {self.muscle.name}: {self.xp} XP (Niv. {self.level})'


class UserTotalXP(models.Model):
    RANK_CHOICES = [
        ('bronze', 'Bronze'),
        ('argent', 'Argent'),
        ('or', 'Or'),
        ('platine', 'Platine'),
        ('diamant', 'Diamant'),
        ('master', 'Master'),
        ('legende', 'Légende'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='total_xp',
    )
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    rank = models.CharField(max_length=20, choices=RANK_CHOICES, default='bronze')

    class Meta:
        verbose_name = 'XP Total'
        verbose_name_plural = 'XP Totaux'

    def __str__(self) -> str:
        return f'{self.user.username}: {self.xp} XP (Niv. {self.level}, {self.rank})'


class Badge(models.Model):
    TRIGGER_CHOICES = [
        ('first_workout', 'Première séance'),
        ('streak', 'Streak consécutif'),
        ('total_volume', 'Volume total'),
        ('total_workouts', 'Nombre de séances'),
        ('muscle_level', 'Niveau muscle'),
        ('total_level', 'Niveau global'),
        ('custom', 'Personnalisé'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField()
    icon = models.CharField(max_length=50, default='🏆')
    trigger_type = models.CharField(max_length=30, choices=TRIGGER_CHOICES)
    trigger_value = models.IntegerField(default=0)
    trigger_muscle = models.ForeignKey(
        Muscle, null=True, blank=True, on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['trigger_type', 'trigger_value']
        verbose_name = 'Badge'
        verbose_name_plural = 'Badges'

    def __str__(self) -> str:
        return self.name


class UserBadge(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='muscu_badges',
    )
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'badge')
        verbose_name = 'Badge obtenu'
        verbose_name_plural = 'Badges obtenus'

    def __str__(self) -> str:
        return f'{self.user.username} — {self.badge.name}'


# ─── Goals ───────────────────────────────────────────────────────────────────

class Goal(models.Model):
    METRIC_CHOICES = [
        ('max_weight', 'Poids max (kg)'),
        ('max_reps', 'Reps max'),
        ('total_volume', 'Volume total (kg)'),
    ]
    STATUS_CHOICES = [
        ('active', 'En cours'),
        ('achieved', 'Atteint'),
        ('abandoned', 'Abandonné'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='goals',
    )
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    metric = models.CharField(max_length=20, choices=METRIC_CHOICES)
    target_value = models.FloatField()
    current_value = models.FloatField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    achieved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Objectif'
        verbose_name_plural = 'Objectifs'

    def __str__(self) -> str:
        return f'{self.user.username} — {self.exercise.name}: {self.metric} → {self.target_value}'


# ─── Dashboard Config ────────────────────────────────────────────────────────

class DashboardConfig(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='muscu_dashboard_config',
    )
    config_json = models.JSONField(default=dict)

    class Meta:
        verbose_name = 'Config Dashboard'
        verbose_name_plural = 'Configs Dashboard'

    def __str__(self) -> str:
        return f'Dashboard config — {self.user.username}'
