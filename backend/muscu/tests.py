from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Exercise, Gym, Machine, Muscle, MuscleGroup, Workout, WorkoutSet


class ExerciseAPITests(APITestCase):
    def setUp(self):
        self.group = MuscleGroup.objects.create(name='Cardio', icon='🫀', order=1)
        self.muscle = Muscle.objects.create(name='Cœur', group=self.group)
        self.user = User.objects.create_user(
            username='lifter', email='lifter@example.com', password='pass',
        )
        self.other = User.objects.create_user(
            username='other', email='other@example.com', password='pass',
        )
        self.admin = User.objects.create_user(
            username='admin', email='admin@example.com', password='pass', is_staff=True,
        )
        for u in (self.user, self.other, self.admin):
            from .models import MuscuProfile
            MuscuProfile.objects.create(user=u, can_access_muscu=True)
        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.other_token = str(RefreshToken.for_user(self.other).access_token)
        self.admin_token = str(RefreshToken.for_user(self.admin).access_token)
        self.exercise = Exercise.objects.create(
            name='Course', metric_type='duration', created_by=self.user,
        )

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_create_cardio_exercise(self):
        self._auth(self.token)
        res = self.client.post('/api/muscu/exercises/', {
            'name': 'Vélo',
            'metric_type': 'distance',
            'muscle_ids': [self.muscle.id],
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['metric_type'], 'distance')
        self.assertEqual(len(res.data['muscle_targets']), 1)

    def test_update_own_exercise(self):
        self._auth(self.token)
        res = self.client.patch(f'/api/muscu/exercises/{self.exercise.id}/', {
            'name': 'Course modifiée',
            'metric_type': 'distance',
            'muscle_ids': [self.muscle.id],
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['name'], 'Course modifiée')
        self.assertEqual(res.data['metric_type'], 'distance')

    def test_update_other_exercise_forbidden(self):
        self.exercise.is_public = True
        self.exercise.save()
        self._auth(self.other_token)
        res = self.client.patch(f'/api/muscu/exercises/{self.exercise.id}/', {
            'name': 'Hacked',
        })
        self.assertEqual(res.status_code, 403)

    def test_admin_update_public_exercise(self):
        self.exercise.is_public = True
        self.exercise.save()
        self._auth(self.admin_token)
        res = self.client.patch(f'/api/muscu/exercises/{self.exercise.id}/', {
            'name': 'Admin renamed',
        })
        self.assertEqual(res.status_code, 200)


class WorkoutSetAPITests(APITestCase):
    def setUp(self):
        self.group = MuscleGroup.objects.create(name='Cardio', icon='🫀', order=1)
        self.muscle = Muscle.objects.create(name='Cœur', group=self.group)
        self.user = User.objects.create_user(
            username='lifter', email='lifter@example.com', password='pass',
        )
        from .models import MuscuProfile
        MuscuProfile.objects.create(user=self.user, can_access_muscu=True)
        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.gym = Gym.objects.create(name='Basic Fit', city='Angers')
        self.workout = Workout.objects.create(user=self.user, gym=self.gym)
        self.cardio = Exercise.objects.create(
            name='Course', metric_type='duration', created_by=self.user,
        )
        self.lift = Exercise.objects.create(
            name='Squat', metric_type='weight_reps', created_by=self.user,
        )

    def _auth(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_add_cardio_set_requires_quantity(self):
        self._auth()
        res = self.client.post(f'/api/muscu/workouts/{self.workout.id}/sets/', {
            'exercise': self.cardio.id,
            'weight_kg': 10,
            'reps': 10,
        })
        self.assertEqual(res.status_code, 400)

    def test_add_lift_set_requires_weight_and_reps(self):
        self._auth()
        res = self.client.post(f'/api/muscu/workouts/{self.workout.id}/sets/', {
            'exercise': self.lift.id,
            'quantity_value': 10,
        })
        self.assertEqual(res.status_code, 400)

    def test_add_cardio_set_accepts_quantity(self):
        self._auth()
        res = self.client.post(f'/api/muscu/workouts/{self.workout.id}/sets/', {
            'exercise': self.cardio.id,
            'quantity_value': 30,
        })
        self.assertEqual(res.status_code, 201)

    def test_add_lift_set_accepts_weight_and_reps(self):
        self._auth()
        res = self.client.post(f'/api/muscu/workouts/{self.workout.id}/sets/', {
            'exercise': self.lift.id,
            'weight_kg': 80,
            'reps': 8,
        })
        self.assertEqual(res.status_code, 201)
