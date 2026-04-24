from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    # Auth
    LoginView, MeView,
    # Muscles
    MuscleGroupListView, MuscleListView,
    # Gyms
    GymListView, GymMachinesView, MyGymMembershipsView, MyGymMembershipDeleteView,
    # Exercises
    ExerciseListCreateView, ExerciseDetailView,
    # Workouts
    WorkoutListCreateView, WorkoutDetailView, WorkoutSetAddView,
    WorkoutSetDeleteView, WorkoutCloseView,
    # XP & Badges
    MyXPView, BadgeListView, MyBadgesView,
    # Goals
    GoalListCreateView, GoalDetailView,
    # Leaderboard
    LeaderboardView,
    # Dashboard
    DashboardStatsView, DashboardChartDataView, DashboardConfigView,
    # Admin
    AdminMuscleGroupView, AdminMuscleGroupDetailView,
    AdminMuscleView, AdminMuscleDetailView,
    AdminGymView, AdminGymDetailView,
    AdminMachineView, AdminMachineDetailView,
    AdminExerciseView, AdminExerciseDetailView, AdminExercisePublishView,
    AdminBadgeView, AdminBadgeDetailView,
    AdminUserListView, AdminUserUpdateView, AdminUserResetView,
    AdminWorkoutListView, AdminWorkoutDetailView, AdminWorkoutSetEditView,
    AdminWorkoutForceCloseView, AdminStatsView,
)

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────
    path('auth/login/', LoginView.as_view(), name='muscu-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='muscu-token-refresh'),
    path('auth/me/', MeView.as_view(), name='muscu-me'),

    # ── Muscles ───────────────────────────────────────────────────────────
    path('muscle-groups/', MuscleGroupListView.as_view(), name='muscu-muscle-groups'),
    path('muscles/', MuscleListView.as_view(), name='muscu-muscles'),

    # ── Gyms & Machines ──────────────────────────────────────────────────
    path('gyms/', GymListView.as_view(), name='muscu-gyms'),
    path('gyms/<int:gym_id>/machines/', GymMachinesView.as_view(), name='muscu-gym-machines'),
    path('my-gyms/', MyGymMembershipsView.as_view(), name='muscu-my-gyms'),
    path('my-gyms/<int:pk>/', MyGymMembershipDeleteView.as_view(), name='muscu-my-gym-delete'),

    # ── Exercises ─────────────────────────────────────────────────────────
    path('exercises/', ExerciseListCreateView.as_view(), name='muscu-exercises'),
    path('exercises/<int:pk>/', ExerciseDetailView.as_view(), name='muscu-exercise-detail'),

    # ── Workouts ──────────────────────────────────────────────────────────
    path('workouts/', WorkoutListCreateView.as_view(), name='muscu-workouts'),
    path('workouts/<int:pk>/', WorkoutDetailView.as_view(), name='muscu-workout-detail'),
    path('workouts/<int:workout_id>/sets/', WorkoutSetAddView.as_view(), name='muscu-workout-set-add'),
    path('workouts/<int:workout_id>/sets/<int:pk>/', WorkoutSetDeleteView.as_view(), name='muscu-workout-set-delete'),
    path('workouts/<int:workout_id>/close/', WorkoutCloseView.as_view(), name='muscu-workout-close'),

    # ── XP & Badges ───────────────────────────────────────────────────────
    path('xp/', MyXPView.as_view(), name='muscu-xp'),
    path('badges/', BadgeListView.as_view(), name='muscu-badges'),
    path('my-badges/', MyBadgesView.as_view(), name='muscu-my-badges'),

    # ── Goals ─────────────────────────────────────────────────────────────
    path('goals/', GoalListCreateView.as_view(), name='muscu-goals'),
    path('goals/<int:pk>/', GoalDetailView.as_view(), name='muscu-goal-detail'),

    # ── Leaderboard ───────────────────────────────────────────────────────
    path('leaderboard/', LeaderboardView.as_view(), name='muscu-leaderboard'),

    # ── Dashboard ─────────────────────────────────────────────────────────
    path('dashboard/stats/', DashboardStatsView.as_view(), name='muscu-dashboard-stats'),
    path('dashboard/chart-data/', DashboardChartDataView.as_view(), name='muscu-dashboard-chart'),
    path('dashboard/config/', DashboardConfigView.as_view(), name='muscu-dashboard-config'),

    # ── Admin ─────────────────────────────────────────────────────────────
    path('admin/muscle-groups/', AdminMuscleGroupView.as_view(), name='muscu-admin-muscle-groups'),
    path('admin/muscle-groups/<int:pk>/', AdminMuscleGroupDetailView.as_view(), name='muscu-admin-muscle-group-detail'),
    path('admin/muscles/', AdminMuscleView.as_view(), name='muscu-admin-muscles'),
    path('admin/muscles/<int:pk>/', AdminMuscleDetailView.as_view(), name='muscu-admin-muscle-detail'),
    path('admin/gyms/', AdminGymView.as_view(), name='muscu-admin-gyms'),
    path('admin/gyms/<int:pk>/', AdminGymDetailView.as_view(), name='muscu-admin-gym-detail'),
    path('admin/machines/', AdminMachineView.as_view(), name='muscu-admin-machines'),
    path('admin/machines/<int:pk>/', AdminMachineDetailView.as_view(), name='muscu-admin-machine-detail'),
    path('admin/exercises/', AdminExerciseView.as_view(), name='muscu-admin-exercises'),
    path('admin/exercises/<int:pk>/', AdminExerciseDetailView.as_view(), name='muscu-admin-exercise-detail'),
    path('admin/exercises/<int:pk>/publish/', AdminExercisePublishView.as_view(), name='muscu-admin-exercise-publish'),
    path('admin/badges/', AdminBadgeView.as_view(), name='muscu-admin-badges'),
    path('admin/badges/<int:pk>/', AdminBadgeDetailView.as_view(), name='muscu-admin-badge-detail'),
    path('admin/users/', AdminUserListView.as_view(), name='muscu-admin-users'),
    path('admin/users/<int:pk>/', AdminUserUpdateView.as_view(), name='muscu-admin-user-update'),
    path('admin/users/<int:pk>/reset/', AdminUserResetView.as_view(), name='muscu-admin-user-reset'),
    path('admin/workouts/', AdminWorkoutListView.as_view(), name='muscu-admin-workouts'),
    path('admin/workouts/<int:pk>/', AdminWorkoutDetailView.as_view(), name='muscu-admin-workout-detail'),
    path('admin/workouts/<int:workout_id>/sets/<int:pk>/', AdminWorkoutSetEditView.as_view(), name='muscu-admin-set-edit'),
    path('admin/workouts/<int:pk>/force-close/', AdminWorkoutForceCloseView.as_view(), name='muscu-admin-force-close'),
    path('admin/stats/', AdminStatsView.as_view(), name='muscu-admin-stats'),
]
