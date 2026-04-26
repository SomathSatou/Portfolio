from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Badge, DashboardConfig, Exercise, ExerciseMuscle, Goal, Gym, Machine,
    Muscle, MuscleGroup, MuscleXP, MuscuProfile, UserBadge, UserGymMembership,
    UserTotalXP, Workout, WorkoutSet,
)


# ─── Auth ────────────────────────────────────────────────────────────────────

class MeSerializer(serializers.ModelSerializer):
    is_staff = serializers.BooleanField(read_only=True)
    can_access_muscu = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'can_access_muscu', 'avatar']
        read_only_fields = ['id', 'username', 'email']

    def get_can_access_muscu(self, obj) -> bool:
        profile = getattr(obj, 'muscu_profile', None)
        if profile is None:
            return obj.is_staff
        return profile.can_access_muscu or obj.is_staff

    def get_avatar(self, obj) -> str | None:
        profile = getattr(obj, 'muscu_profile', None)
        if profile and profile.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(profile.avatar.url)
            return profile.avatar.url
        return None


# ─── Muscles ─────────────────────────────────────────────────────────────────

class MuscleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Muscle
        fields = ['id', 'name', 'group']


class MuscleGroupSerializer(serializers.ModelSerializer):
    muscles = MuscleSerializer(many=True, read_only=True)

    class Meta:
        model = MuscleGroup
        fields = ['id', 'name', 'icon', 'order', 'muscles']


# ─── Gyms & Machines ────────────────────────────────────────────────────────

class GymSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gym
        fields = ['id', 'name', 'address', 'city']


class MachineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Machine
        fields = ['id', 'name', 'gym', 'description']


class UserGymMembershipSerializer(serializers.ModelSerializer):
    gym_name = serializers.CharField(source='gym.name', read_only=True)

    class Meta:
        model = UserGymMembership
        fields = ['id', 'gym', 'gym_name', 'joined_at']
        read_only_fields = ['id', 'joined_at']


# ─── Exercises ───────────────────────────────────────────────────────────────

class ExerciseMuscleSerializer(serializers.ModelSerializer):
    muscle_name = serializers.CharField(source='muscle.name', read_only=True)
    muscle_group = serializers.CharField(source='muscle.group.name', read_only=True)

    class Meta:
        model = ExerciseMuscle
        fields = ['id', 'muscle', 'muscle_name', 'muscle_group', 'involvement']


class ExerciseSerializer(serializers.ModelSerializer):
    muscle_targets = ExerciseMuscleSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    machine_name = serializers.CharField(source='machine.name', read_only=True, default=None)

    class Meta:
        model = Exercise
        fields = [
            'id', 'name', 'description', 'machine', 'machine_name',
            'is_public', 'created_by', 'created_by_name',
            'difficulty_factor', 'muscle_targets', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'is_public']


class ExerciseCreateSerializer(serializers.ModelSerializer):
    muscle_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False, default=[],
    )

    class Meta:
        model = Exercise
        fields = ['id', 'name', 'description', 'machine', 'difficulty_factor', 'muscle_ids']
        read_only_fields = ['id']

    def create(self, validated_data):
        muscle_ids = validated_data.pop('muscle_ids', [])
        exercise = Exercise.objects.create(**validated_data)
        for mid in muscle_ids:
            ExerciseMuscle.objects.create(exercise=exercise, muscle_id=mid)
        return exercise


# ─── Workouts ────────────────────────────────────────────────────────────────

class WorkoutSetSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source='exercise.name', read_only=True)

    class Meta:
        model = WorkoutSet
        fields = ['id', 'exercise', 'exercise_name', 'weight_kg', 'reps', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']


class WorkoutSerializer(serializers.ModelSerializer):
    sets = WorkoutSetSerializer(many=True, read_only=True)
    gym_name = serializers.CharField(source='gym.name', read_only=True, default=None)

    class Meta:
        model = Workout
        fields = [
            'id', 'gym', 'gym_name', 'started_at', 'finished_at',
            'status', 'notes', 'sets',
        ]
        read_only_fields = ['id', 'started_at', 'finished_at', 'status']


class WorkoutCreateSerializer(serializers.ModelSerializer):
    sets = WorkoutSetSerializer(many=True, read_only=True)
    gym_name = serializers.CharField(source='gym.name', read_only=True, default=None)

    class Meta:
        model = Workout
        fields = ['id', 'gym', 'gym_name', 'started_at', 'status', 'notes', 'sets']
        read_only_fields = ['id', 'started_at', 'status']


class WorkoutSetCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutSet
        fields = ['id', 'exercise', 'weight_kg', 'reps', 'order']
        read_only_fields = ['id']


# ─── Gamification ────────────────────────────────────────────────────────────

class MuscleXPSerializer(serializers.ModelSerializer):
    muscle_name = serializers.CharField(source='muscle.name', read_only=True)
    muscle_group = serializers.CharField(source='muscle.group.name', read_only=True)

    class Meta:
        model = MuscleXP
        fields = ['muscle', 'muscle_name', 'muscle_group', 'xp', 'level']


class UserTotalXPSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserTotalXP
        fields = ['xp', 'level', 'rank']


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = [
            'id', 'name', 'description', 'icon', 'trigger_type',
            'trigger_value', 'trigger_muscle', 'created_at',
        ]


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ['id', 'badge', 'earned_at']


# ─── Goals ───────────────────────────────────────────────────────────────────

class GoalSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source='exercise.name', read_only=True)

    class Meta:
        model = Goal
        fields = [
            'id', 'exercise', 'exercise_name', 'metric',
            'target_value', 'current_value', 'status',
            'created_at', 'achieved_at',
        ]
        read_only_fields = ['id', 'current_value', 'created_at', 'achieved_at']


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardConfig
        fields = ['config_json']


# ─── Admin ───────────────────────────────────────────────────────────────────

class AdminMuscleGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = MuscleGroup
        fields = ['id', 'name', 'icon', 'order']


class AdminMuscleSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = Muscle
        fields = ['id', 'name', 'group', 'group_name']


class AdminGymSerializer(serializers.ModelSerializer):
    machine_count = serializers.SerializerMethodField()

    class Meta:
        model = Gym
        fields = ['id', 'name', 'address', 'city', 'machine_count']

    def get_machine_count(self, obj) -> int:
        return obj.machines.count()


class AdminMachineSerializer(serializers.ModelSerializer):
    gym_name = serializers.CharField(source='gym.name', read_only=True)

    class Meta:
        model = Machine
        fields = ['id', 'name', 'gym', 'gym_name', 'description']


class AdminExerciseSerializer(serializers.ModelSerializer):
    muscle_targets = ExerciseMuscleSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Exercise
        fields = [
            'id', 'name', 'description', 'machine', 'is_public',
            'created_by', 'created_by_name', 'difficulty_factor',
            'muscle_targets', 'created_at',
        ]


class AdminBadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = [
            'id', 'name', 'description', 'icon', 'trigger_type',
            'trigger_value', 'trigger_muscle', 'created_at',
        ]


class AdminWorkoutSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    gym_name = serializers.CharField(source='gym.name', read_only=True, default=None)
    sets_count = serializers.SerializerMethodField()

    class Meta:
        model = Workout
        fields = ['id', 'user_name', 'gym_name', 'status', 'started_at', 'finished_at', 'sets_count']

    def get_sets_count(self, obj) -> int:
        return obj.sets.count()


class AdminUserSerializer(serializers.ModelSerializer):
    can_access_muscu = serializers.SerializerMethodField()
    is_banned = serializers.SerializerMethodField()
    total_xp = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    rank = serializers.SerializerMethodField()
    workout_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'is_staff',
            'can_access_muscu', 'is_banned',
            'total_xp', 'level', 'rank', 'workout_count',
        ]

    def get_can_access_muscu(self, obj) -> bool:
        profile = getattr(obj, 'muscu_profile', None)
        return profile.can_access_muscu if profile else False

    def get_is_banned(self, obj) -> bool:
        profile = getattr(obj, 'muscu_profile', None)
        return profile.is_banned if profile else False

    def get_total_xp(self, obj) -> int:
        xp_obj = getattr(obj, 'total_xp', None)
        return xp_obj.xp if xp_obj else 0

    def get_level(self, obj) -> int:
        xp_obj = getattr(obj, 'total_xp', None)
        return xp_obj.level if xp_obj else 1

    def get_rank(self, obj) -> str:
        xp_obj = getattr(obj, 'total_xp', None)
        return xp_obj.rank if xp_obj else 'bronze'

    def get_workout_count(self, obj) -> int:
        return obj.workouts.filter(status='closed').count()
