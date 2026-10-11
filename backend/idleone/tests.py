"""Tests de l'app idleone — endpoints de sauvegardes cloud."""
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import IdleOneProfile, IdleOneSave

SAVE_PAYLOAD = {
    'Version': '1.0.0',
    'Metadata': {
        'PlayerName': 'Testeur',
        'RunCount': 2,
        'PlayTime': 123.5,
        'LastSavedAt': '2026-10-11T12:00:00Z',
        'GameVersion': '1.0.0',
    },
    'Profile': {
        'PlayerName': 'Testeur',
        'RunCount': 2,
        'PlayTime': 123.5,
    },
}


def _auth(user) -> dict:
    return {'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(user).access_token}'}


class IdleOneAuthTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='player1', email='p1@example.com', password='password123',
            is_active=True,
        )

    def test_login_creates_profile(self):
        response = self.client.post(
            '/api/idleone/auth/login/',
            {'email': 'p1@example.com', 'password': 'password123'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertTrue(IdleOneProfile.objects.filter(user=self.user).exists())

    def test_me_creates_profile(self):
        response = self.client.get('/api/idleone/auth/me/', **_auth(self.user))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(IdleOneProfile.objects.filter(user=self.user).exists())


class IdleOneSavesTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='player1', email='p1@example.com', password='password123',
            is_active=True,
        )
        self.other = User.objects.create_user(
            username='player2', email='p2@example.com', password='password123',
            is_active=True,
        )

    def test_endpoints_require_auth(self):
        self.assertEqual(
            self.client.get('/api/idleone/saves/').status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(
            self.client.put('/api/idleone/saves/0/', {'data': SAVE_PAYLOAD}, format='json').status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_upload_download_roundtrip(self):
        put = self.client.put(
            '/api/idleone/saves/0/', {'data': SAVE_PAYLOAD}, format='json', **_auth(self.user),
        )
        self.assertEqual(put.status_code, status.HTTP_200_OK)
        self.assertEqual(put.data['player_name'], 'Testeur')
        self.assertEqual(put.data['run_count'], 2)
        self.assertEqual(put.data['save_version'], '1.0.0')

        get = self.client.get('/api/idleone/saves/0/', **_auth(self.user))
        self.assertEqual(get.status_code, status.HTTP_200_OK)
        self.assertEqual(get.data['data']['Version'], '1.0.0')
        self.assertEqual(get.data['data']['Profile']['PlayerName'], 'Testeur')

        listing = self.client.get('/api/idleone/saves/', **_auth(self.user))
        self.assertEqual(len(listing.data), 1)
        self.assertEqual(listing.data[0]['slot'], 0)
        self.assertNotIn('data', listing.data[0])

    def test_upload_upserts_existing_slot(self):
        self.client.put('/api/idleone/saves/1/', {'data': SAVE_PAYLOAD}, format='json', **_auth(self.user))
        updated = {**SAVE_PAYLOAD, 'Metadata': {**SAVE_PAYLOAD['Metadata'], 'RunCount': 5}}
        self.client.put('/api/idleone/saves/1/', {'data': updated}, format='json', **_auth(self.user))
        self.assertEqual(IdleOneSave.objects.filter(user=self.user, slot=1).count(), 1)
        self.assertEqual(IdleOneSave.objects.get(user=self.user, slot=1).run_count, 5)

    def test_invalid_payload_rejected(self):
        response = self.client.put(
            '/api/idleone/saves/0/', {'data': {'foo': 'bar'}}, format='json', **_auth(self.user),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_slot_rejected(self):
        response = self.client.put(
            '/api/idleone/saves/5/', {'data': SAVE_PAYLOAD}, format='json', **_auth(self.user),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_slot_returns_404(self):
        response = self.client.get('/api/idleone/saves/2/', **_auth(self.user))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_slot(self):
        self.client.put('/api/idleone/saves/0/', {'data': SAVE_PAYLOAD}, format='json', **_auth(self.user))
        response = self.client.delete('/api/idleone/saves/0/', **_auth(self.user))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(IdleOneSave.objects.filter(user=self.user, slot=0).exists())
        # Idempotent
        self.assertEqual(
            self.client.delete('/api/idleone/saves/0/', **_auth(self.user)).status_code,
            status.HTTP_204_NO_CONTENT,
        )

    def test_saves_isolated_per_user(self):
        self.client.put('/api/idleone/saves/0/', {'data': SAVE_PAYLOAD}, format='json', **_auth(self.user))
        response = self.client.get('/api/idleone/saves/0/', **_auth(self.other))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get('/api/idleone/saves/', **_auth(self.other)).data, [])
