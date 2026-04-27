from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView  # noqa: F401

from .models import (
    Badge, DashboardConfig, Exercise, ExerciseMuscle, Goal, Gym, Machine,
    Muscle, MuscleGroup, MuscleXP, MuscuProfile, UserBadge, UserGymMembership,
    UserTotalXP, Workout, WorkoutSet,
)
from .serializers import (
    AdminBadgeSerializer, AdminExerciseSerializer, AdminGymSerializer,
    AdminMachineSerializer, AdminMuscleGroupSerializer, AdminMuscleSerializer,
    AdminUserSerializer, AdminWorkoutSerializer, BadgeSerializer,
    DashboardConfigSerializer,
    ExerciseCreateSerializer, ExerciseSerializer, GoalSerializer,
    GymSerializer, MachineSerializer, MeSerializer, MuscleGroupSerializer,
    MuscleSerializer, MuscleXPSerializer, UserBadgeSerializer,
    UserGymMembershipSerializer, UserTotalXPSerializer,
    WorkoutCreateSerializer, WorkoutSerializer, WorkoutSetCreateSerializer,
    WorkoutSetSerializer,
)
from .xp_engine import check_badges_for_user, distribute_xp_for_workout, update_goals_for_workout


# ─── Permission helpers ──────────────────────────────────────────────────────

class HasMuscuAccess(permissions.BasePermission):
    """Allow access if user.is_staff or muscu_profile.can_access_muscu and not banned."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        profile = getattr(user, 'muscu_profile', None)
        if profile is None:
            return False
        return profile.can_access_muscu and not profile.is_banned


# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        password = request.data.get('password', '')

        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Identifiants invalides.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = authenticate(request, username=user_obj.username, password=password)
        if user is None:
            return Response(
                {'detail': 'Identifiants invalides.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Check muscu access
        profile, _ = MuscuProfile.objects.get_or_create(user=user)
        if not user.is_staff and not profile.can_access_muscu:
            return Response(
                {'detail': "Accès IRL RPG non autorisé. Contactez l'administrateur."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if profile.is_banned:
            return Response(
                {'detail': 'Votre compte est suspendu.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class MeView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        MuscuProfile.objects.get_or_create(user=self.request.user)
        return self.request.user


# ─── Muscle Groups & Muscles ────────────────────────────────────────────────

class MuscleGroupListView(generics.ListAPIView):
    permission_classes = [HasMuscuAccess]
    serializer_class = MuscleGroupSerializer
    queryset = MuscleGroup.objects.prefetch_related('muscles').all()


class MuscleListView(generics.ListAPIView):
    permission_classes = [HasMuscuAccess]
    serializer_class = MuscleSerializer
    queryset = Muscle.objects.select_related('group').all()


# ─── Gyms & Machines ────────────────────────────────────────────────────────

class GymListView(generics.ListAPIView):
    permission_classes = [HasMuscuAccess]
    serializer_class = GymSerializer
    queryset = Gym.objects.all()


class GymMachinesView(generics.ListAPIView):
    permission_classes = [HasMuscuAccess]
    serializer_class = MachineSerializer

    def get_queryset(self):
        return Machine.objects.filter(gym_id=self.kwargs['gym_id'])


class MyGymMembershipsView(generics.ListCreateAPIView):
    permission_classes = [HasMuscuAccess]
    serializer_class = UserGymMembershipSerializer

    def get_queryset(self):
        return UserGymMembership.objects.filter(user=self.request.user).select_related('gym')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MyGymMembershipDeleteView(generics.DestroyAPIView):
    permission_classes = [HasMuscuAccess]

    def get_queryset(self):
        return UserGymMembership.objects.filter(user=self.request.user)


# ─── Exercises ───────────────────────────────────────────────────────────────

class ExerciseListCreateView(generics.ListCreateAPIView):
    permission_classes = [HasMuscuAccess]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ExerciseCreateSerializer
        return ExerciseSerializer

    def get_queryset(self):
        user = self.request.user
        return Exercise.objects.filter(
            Q(is_public=True) | Q(created_by=user)
        ).select_related('machine', 'created_by').prefetch_related(
            'muscle_targets__muscle__group',
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        exercise = Exercise.objects.select_related(
            'machine', 'created_by',
        ).prefetch_related(
            'muscle_targets__muscle__group',
        ).get(pk=serializer.instance.pk)
        return Response(
            ExerciseSerializer(exercise).data,
            status=status.HTTP_201_CREATED,
        )


class ExerciseDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [HasMuscuAccess]
    serializer_class = ExerciseSerializer

    def get_queryset(self):
        user = self.request.user
        return Exercise.objects.filter(
            Q(is_public=True) | Q(created_by=user)
        ).select_related('machine', 'created_by').prefetch_related(
            'muscle_targets__muscle__group',
        )

    def perform_destroy(self, instance):
        if instance.created_by != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Vous ne pouvez supprimer que vos propres exercices.')
        instance.delete()


# ─── Workouts ────────────────────────────────────────────────────────────────

class WorkoutListCreateView(generics.ListCreateAPIView):
    permission_classes = [HasMuscuAccess]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return WorkoutCreateSerializer
        return WorkoutSerializer

    def get_queryset(self):
        return Workout.objects.filter(user=self.request.user).select_related('gym').prefetch_related(
            'sets__exercise',
        )

    def perform_create(self, serializer):
        # Ensure no open workout
        if Workout.objects.filter(user=self.request.user, status='open').exists():
            raise serializers_ValidationError('Vous avez déjà une séance en cours.')
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WorkoutDetailView(generics.RetrieveAPIView):
    permission_classes = [HasMuscuAccess]
    serializer_class = WorkoutSerializer

    def get_queryset(self):
        return Workout.objects.filter(user=self.request.user).select_related('gym').prefetch_related(
            'sets__exercise',
        )


class WorkoutSetAddView(generics.CreateAPIView):
    permission_classes = [HasMuscuAccess]
    serializer_class = WorkoutSetCreateSerializer

    def perform_create(self, serializer):
        workout = Workout.objects.get(
            pk=self.kwargs['workout_id'], user=self.request.user, status='open',
        )
        serializer.save(workout=workout)


class WorkoutSetDeleteView(generics.DestroyAPIView):
    permission_classes = [HasMuscuAccess]

    def get_queryset(self):
        return WorkoutSet.objects.filter(
            workout_id=self.kwargs['workout_id'],
            workout__user=self.request.user,
            workout__status='open',
        )


class WorkoutCloseView(APIView):
    permission_classes = [HasMuscuAccess]

    def post(self, request, workout_id):
        try:
            workout = Workout.objects.get(
                pk=workout_id, user=request.user, status='open',
            )
        except Workout.DoesNotExist:
            return Response(
                {'detail': 'Séance non trouvée ou déjà terminée.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        workout.status = 'closed'
        workout.finished_at = timezone.now()
        workout.save(update_fields=['status', 'finished_at'])

        # XP distribution
        xp_dist = distribute_xp_for_workout(workout)

        # Update goals
        achieved_goals = update_goals_for_workout(workout)

        # Check badges
        new_badges = check_badges_for_user(request.user)

        return Response({
            'detail': 'Séance terminée.',
            'xp_gained': xp_dist,
            'achieved_goals': achieved_goals,
            'new_badges': new_badges,
        })


# ─── XP & Badges ────────────────────────────────────────────────────────────

class MyXPView(APIView):
    permission_classes = [HasMuscuAccess]

    def get(self, request):
        muscle_xps = MuscleXP.objects.filter(
            user=request.user,
        ).select_related('muscle__group')
        total_xp, _ = UserTotalXP.objects.get_or_create(user=request.user)

        return Response({
            'muscles': MuscleXPSerializer(muscle_xps, many=True).data,
            'total': UserTotalXPSerializer(total_xp).data,
        })


class BadgeListView(generics.ListAPIView):
    permission_classes = [HasMuscuAccess]
    serializer_class = BadgeSerializer
    queryset = Badge.objects.all()


class MyBadgesView(generics.ListAPIView):
    permission_classes = [HasMuscuAccess]
    serializer_class = UserBadgeSerializer

    def get_queryset(self):
        return UserBadge.objects.filter(user=self.request.user).select_related('badge')


# ─── Goals ───────────────────────────────────────────────────────────────────

class GoalListCreateView(generics.ListCreateAPIView):
    permission_classes = [HasMuscuAccess]
    serializer_class = GoalSerializer

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user).select_related('exercise')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class GoalDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [HasMuscuAccess]
    serializer_class = GoalSerializer

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user)


# ─── Leaderboard ─────────────────────────────────────────────────────────────

class LeaderboardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


class LeaderboardView(APIView):
    permission_classes = [HasMuscuAccess]

    def get(self, request):
        scope = request.query_params.get('scope', 'global')
        gym_id = request.query_params.get('gym_id')
        muscle_id = request.query_params.get('muscle_id')
        period = request.query_params.get('period', 'all')
        sort_by = request.query_params.get('sort', 'xp')

        # Base user set: users with muscu access and not banned
        users = User.objects.filter(
            Q(muscu_profile__can_access_muscu=True) | Q(is_staff=True),
            muscu_profile__is_banned=False,
        ).distinct()

        # Filter by gym membership
        if scope == 'gym' and gym_id:
            users = users.filter(gym_memberships__gym_id=gym_id)

        # Period filter for dynamic stats
        date_filter = {}
        if period == 'day':
            date_filter['started_at__date'] = timezone.now().date()
        elif period == 'week':
            date_filter['started_at__gte'] = timezone.now() - timezone.timedelta(days=7)
        elif period == 'month':
            date_filter['started_at__gte'] = timezone.now() - timezone.timedelta(days=30)

        # Build annotation
        workout_filter = Q(workouts__status='closed')
        if date_filter:
            for k, v in date_filter.items():
                workout_filter &= Q(**{f'workouts__{k}': v})

        set_filter = Q(workouts__sets__isnull=False) & Q(workouts__status='closed')
        if date_filter:
            for k, v in date_filter.items():
                set_filter &= Q(**{f'workouts__{k}': v})

        # Muscle-specific leaderboard
        if muscle_id:
            users = users.filter(
                muscle_xps__muscle_id=muscle_id,
            ).annotate(
                sort_xp=Sum('muscle_xps__xp', filter=Q(muscle_xps__muscle_id=muscle_id)),
            ).order_by('-sort_xp')
        else:
            users = users.annotate(
                total_xp_val=Sum('muscle_xps__xp'),
                workout_count=Count('workouts', filter=workout_filter, distinct=True),
                total_volume=Sum(
                    F('workouts__sets__weight_kg') * F('workouts__sets__reps'),
                    filter=set_filter,
                ),
            )

            if sort_by == 'workouts':
                users = users.order_by('-workout_count')
            elif sort_by == 'volume':
                users = users.order_by(F('total_volume').desc(nulls_last=True))
            else:
                users = users.order_by(F('total_xp_val').desc(nulls_last=True))

        # Paginate
        paginator = LeaderboardPagination()
        page = paginator.paginate_queryset(users, request)

        results = []
        for i, u in enumerate(page):
            total_xp_obj = getattr(u, 'total_xp', None)
            entry = {
                'rank': paginator.page.start_index() + i,
                'user': {
                    'id': u.id,
                    'username': u.username,
                    'rank_tier': total_xp_obj.rank if total_xp_obj else 'bronze',
                },
                'xp': getattr(u, 'total_xp_val', None) or (total_xp_obj.xp if total_xp_obj else 0),
                'level': total_xp_obj.level if total_xp_obj else 1,
                'workouts': getattr(u, 'workout_count', 0) or 0,
                'volume': getattr(u, 'total_volume', 0) or 0,
            }
            if muscle_id:
                entry['xp'] = getattr(u, 'sort_xp', 0) or 0
            results.append(entry)

        # Find current user's rank
        my_rank = None
        for i, u in enumerate(users):
            if u.id == request.user.id:
                my_rank = i + 1
                break

        return Response({
            'results': results,
            'my_rank': my_rank,
            'total': paginator.page.paginator.count,
            'page': paginator.page.number,
            'pages': paginator.page.paginator.num_pages,
        })


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    permission_classes = [HasMuscuAccess]

    def get(self, request):
        user = request.user

        # Rank
        total_xp, _ = UserTotalXP.objects.get_or_create(user=user)
        rank_position = UserTotalXP.objects.filter(xp__gt=total_xp.xp).count() + 1

        # Most visited gym
        fav_gym = (
            Workout.objects.filter(user=user, status='closed', gym__isnull=False)
            .values('gym__name')
            .annotate(cnt=Count('id'))
            .order_by('-cnt')
            .first()
        )

        # Top muscle
        top_muscle = (
            MuscleXP.objects.filter(user=user)
            .select_related('muscle')
            .order_by('-level', '-xp')
            .first()
        )

        return Response({
            'rank': {
                'tier': total_xp.rank,
                'level': total_xp.level,
                'xp': total_xp.xp,
                'position': rank_position,
            },
            'favorite_gym': fav_gym['gym__name'] if fav_gym else None,
            'top_muscle': {
                'name': top_muscle.muscle.name,
                'level': top_muscle.level,
                'xp': top_muscle.xp,
            } if top_muscle else None,
        })


class DashboardChartDataView(APIView):
    permission_classes = [HasMuscuAccess]

    def get(self, request):
        chart_type = request.query_params.get('type', 'weight_progress')
        exercise_id = request.query_params.get('exercise_id')
        period = request.query_params.get('period', 'month')

        user = request.user
        date_from = None
        if period == 'week':
            date_from = timezone.now() - timezone.timedelta(days=7)
        elif period == 'month':
            date_from = timezone.now() - timezone.timedelta(days=30)
        elif period == 'year':
            date_from = timezone.now() - timezone.timedelta(days=365)

        if chart_type in ('weight_progress', 'reps_progress', 'onerm_progress'):
            if not exercise_id:
                return Response({'detail': 'exercise_id requis.'}, status=400)
            qs = WorkoutSet.objects.filter(
                workout__user=user, workout__status='closed', exercise_id=exercise_id,
            ).select_related('workout')
            if date_from:
                qs = qs.filter(workout__started_at__gte=date_from)
            qs = qs.order_by('workout__started_at')

            data = []
            for s in qs:
                entry = {'date': s.workout.started_at.isoformat(), 'weight': s.weight_kg, 'reps': s.reps}
                if chart_type == 'onerm_progress':
                    entry['onerm'] = round(s.weight_kg * (1 + s.reps / 30), 1)
                data.append(entry)
            return Response({'data': data})

        if chart_type == 'volume_weekly':
            qs = WorkoutSet.objects.filter(
                workout__user=user, workout__status='closed',
            )
            if date_from:
                qs = qs.filter(workout__started_at__gte=date_from)
            from django.db.models.functions import TruncWeek
            weekly = (
                qs.annotate(week=TruncWeek('workout__started_at'))
                .values('week')
                .annotate(volume=Sum(F('weight_kg') * F('reps')))
                .order_by('week')
            )
            return Response({'data': list(weekly)})

        if chart_type == 'muscle_radar':
            muscle_xps = MuscleXP.objects.filter(user=user).select_related('muscle__group')
            from collections import defaultdict
            groups: dict[str, int] = defaultdict(int)
            for mx in muscle_xps:
                groups[mx.muscle.group.name] += mx.xp
            return Response({'data': [{'group': k, 'xp': v} for k, v in groups.items()]})

        return Response({'data': []})


class DashboardConfigView(APIView):
    permission_classes = [HasMuscuAccess]

    def get(self, request):
        config, _ = DashboardConfig.objects.get_or_create(user=request.user)
        return Response(DashboardConfigSerializer(config).data)

    def put(self, request):
        config, _ = DashboardConfig.objects.get_or_create(user=request.user)
        serializer = DashboardConfigSerializer(config, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─── Admin Views ─────────────────────────────────────────────────────────────

class AdminMuscleGroupView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminMuscleGroupSerializer
    queryset = MuscleGroup.objects.all()


class AdminMuscleGroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminMuscleGroupSerializer
    queryset = MuscleGroup.objects.all()


class AdminMuscleView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminMuscleSerializer
    queryset = Muscle.objects.select_related('group').all()


class AdminMuscleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminMuscleSerializer
    queryset = Muscle.objects.all()


class AdminGymView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminGymSerializer
    queryset = Gym.objects.prefetch_related('machines').all()


class AdminGymDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminGymSerializer
    queryset = Gym.objects.all()


class AdminMachineView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminMachineSerializer
    queryset = Machine.objects.select_related('gym').all()


class AdminMachineDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminMachineSerializer
    queryset = Machine.objects.all()


class AdminExerciseView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminExerciseSerializer
    queryset = Exercise.objects.select_related('machine', 'created_by').prefetch_related(
        'muscle_targets__muscle__group',
    ).all()


class AdminExerciseDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminExerciseSerializer
    queryset = Exercise.objects.all()


class AdminExercisePublishView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            exercise = Exercise.objects.get(pk=pk)
        except Exercise.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        exercise.is_public = not exercise.is_public
        exercise.save(update_fields=['is_public'])
        return Response({'is_public': exercise.is_public})

    patch = post


class AdminBadgeView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminBadgeSerializer
    queryset = Badge.objects.all()


class AdminBadgeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminBadgeSerializer
    queryset = Badge.objects.all()


class AdminUserListView(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        qs = User.objects.select_related('muscu_profile', 'total_xp').all()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(username__icontains=search) | Q(email__icontains=search))
        return qs


class AdminUserUpdateView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        profile, _ = MuscuProfile.objects.get_or_create(user=user)

        if 'can_access_muscu' in request.data:
            profile.can_access_muscu = request.data['can_access_muscu']
        if 'is_banned' in request.data:
            profile.is_banned = request.data['is_banned']
        profile.save()

        return Response({'detail': 'Utilisateur mis à jour.'})


class AdminUserResetView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        MuscleXP.objects.filter(user=user).delete()
        UserTotalXP.objects.filter(user=user).delete()
        UserBadge.objects.filter(user=user).delete()
        Goal.objects.filter(user=user).update(status='abandoned')

        return Response({'detail': 'Stats réinitialisées.'})


class AdminWorkoutListView(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminWorkoutSerializer

    def get_queryset(self):
        qs = Workout.objects.select_related('user', 'gym').prefetch_related('sets__exercise').all()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        gym_id = self.request.query_params.get('gym_id')
        if gym_id:
            qs = qs.filter(gym_id=gym_id)
        return qs


class AdminWorkoutDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = WorkoutSerializer
    queryset = Workout.objects.select_related('user', 'gym').prefetch_related('sets__exercise').all()


class AdminWorkoutSetEditView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = WorkoutSetSerializer

    def get_queryset(self):
        return WorkoutSet.objects.filter(workout_id=self.kwargs['workout_id'])


class AdminWorkoutForceCloseView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            workout = Workout.objects.get(pk=pk, status='open')
        except Workout.DoesNotExist:
            return Response(
                {'detail': 'Séance non trouvée ou déjà terminée.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        workout.status = 'closed'
        workout.finished_at = timezone.now()
        workout.save(update_fields=['status', 'finished_at'])

        distribute_xp_for_workout(workout)
        update_goals_for_workout(workout)
        check_badges_for_user(workout.user)

        return Response({'detail': 'Séance fermée de force.'})


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        active_users = MuscuProfile.objects.filter(can_access_muscu=True, is_banned=False).count()
        now = timezone.now()
        workouts_week = Workout.objects.filter(
            status='closed', started_at__gte=now - timezone.timedelta(days=7),
        ).count()
        workouts_month = Workout.objects.filter(
            status='closed', started_at__gte=now - timezone.timedelta(days=30),
        ).count()
        total_volume = WorkoutSet.objects.filter(
            workout__status='closed',
        ).aggregate(vol=Sum(F('weight_kg') * F('reps')))['vol'] or 0

        top_exercises = (
            WorkoutSet.objects.filter(workout__status='closed')
            .values('exercise__name')
            .annotate(cnt=Count('id'))
            .order_by('-cnt')[:5]
        )

        rank_dist = (
            UserTotalXP.objects.values('rank')
            .annotate(cnt=Count('id'))
            .order_by('rank')
        )

        total_users = User.objects.count()
        total_workouts = Workout.objects.filter(status='closed').count()
        total_sets = WorkoutSet.objects.count()
        total_exercises = Exercise.objects.count()

        return Response({
            'total_users': total_users,
            'total_workouts': total_workouts,
            'total_sets': total_sets,
            'total_exercises': total_exercises,
            'active_users': active_users,
            'workouts_week': workouts_week,
            'workouts_month': workouts_month,
            'total_volume': total_volume,
            'top_exercises': list(top_exercises),
            'rank_distribution': list(rank_dist),
        })


def serializers_ValidationError(msg):
    """Helper to raise a validation error without circular import."""
    from rest_framework.exceptions import ValidationError
    return ValidationError(msg)
