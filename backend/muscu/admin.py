from django.contrib import admin

from .models import (
    Badge, DashboardConfig, Exercise, ExerciseMuscle, Goal, Gym, Machine,
    Muscle, MuscleGroup, MuscleXP, MuscuProfile, UserBadge, UserGymMembership,
    UserTotalXP, Workout, WorkoutSet,
)


class ExerciseMuscleInline(admin.TabularInline):
    model = ExerciseMuscle
    extra = 1


@admin.register(MuscuProfile)
class MuscuProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'can_access_muscu', 'is_banned', 'created_at']
    list_filter = ['can_access_muscu', 'is_banned']
    search_fields = ['user__username', 'user__email']


@admin.register(MuscleGroup)
class MuscleGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'order']
    ordering = ['order']


@admin.register(Muscle)
class MuscleAdmin(admin.ModelAdmin):
    list_display = ['name', 'group']
    list_filter = ['group']


@admin.register(Gym)
class GymAdmin(admin.ModelAdmin):
    list_display = ['name', 'city']
    search_fields = ['name', 'city']


@admin.register(Machine)
class MachineAdmin(admin.ModelAdmin):
    list_display = ['name', 'gym']
    list_filter = ['gym']


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_public', 'created_by', 'difficulty_factor']
    list_filter = ['is_public']
    inlines = [ExerciseMuscleInline]


@admin.register(Workout)
class WorkoutAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'gym', 'status', 'started_at', 'finished_at']
    list_filter = ['status']


@admin.register(WorkoutSet)
class WorkoutSetAdmin(admin.ModelAdmin):
    list_display = ['workout', 'exercise', 'weight_kg', 'reps', 'order']


@admin.register(MuscleXP)
class MuscleXPAdmin(admin.ModelAdmin):
    list_display = ['user', 'muscle', 'xp', 'level']


@admin.register(UserTotalXP)
class UserTotalXPAdmin(admin.ModelAdmin):
    list_display = ['user', 'xp', 'level', 'rank']


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['name', 'trigger_type', 'trigger_value', 'icon']


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'earned_at']


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ['user', 'exercise', 'metric', 'target_value', 'current_value', 'status']
    list_filter = ['status', 'metric']


@admin.register(UserGymMembership)
class UserGymMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'gym', 'joined_at']


@admin.register(DashboardConfig)
class DashboardConfigAdmin(admin.ModelAdmin):
    list_display = ['user']
