import io
import os
import tempfile
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile


User = get_user_model()


def _create_image():
    image = Image.new('RGB', (100, 100), color='red')
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)
    return InMemoryUploadedFile(buffer, 'avatar', 'test.png', 'image/png', buffer.getbuffer().nbytes, None)


class AccountProfileSignalTests(TestCase):
    def test_profile_created_on_user_creation(self):
        user = User.objects.create_user(username='signaluser', email='signal@example.com', password='testpass123')
        self.assertTrue(AccountProfile.objects.filter(user=user).exists())


class MeAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='meuser', email='me@example.com', password='testpass123'
        )
        self.url = reverse('auth-me')

    def _authenticate(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_get_me_returns_avatar_none(self):
        self._authenticate()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'meuser')
        self.assertIsNone(response.data['avatar'])

    def test_patch_username(self):
        self._authenticate()
        response = self.client.patch(self.url, {'username': 'newname'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'newname')


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class AvatarAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='avataruser', email='avatar@example.com', password='testpass123'
        )
        self.url = reverse('auth-me-avatar')

    def tearDown(self):
        for profile in AccountProfile.objects.all():
            if profile.avatar:
                profile.avatar.delete(save=False)

    def _authenticate(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_upload_avatar_requires_auth(self):
        image = _create_image()
        response = self.client.post(self.url, {'avatar': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_upload_and_delete_avatar(self):
        self._authenticate()
        image = _create_image()
        response = self.client.post(self.url, {'avatar': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['avatar'])

        delete_response = self.client.delete(self.url)
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        self.assertIsNone(delete_response.data['avatar'])

    def test_upload_invalid_format_rejected(self):
        self._authenticate()
        buffer = io.BytesIO(b'not an image')
        response = self.client.post(self.url, {'avatar': buffer}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class EnsureAdminCommandTests(TestCase):
    def test_noop_when_config_missing(self):
        with patch.dict(os.environ, {}, clear=True):
            out = io.StringIO()
            call_command('ensure_admin', stdout=out)
            self.assertIn('Bootstrap admin ignoré', out.getvalue())
        self.assertFalse(User.objects.filter(username='bootstrap_admin').exists())

    def test_creates_admin_when_config_present(self):
        env = {
            'BOOTSTRAP_ADMIN_USERNAME': 'bootstrap_admin',
            'BOOTSTRAP_ADMIN_EMAIL': 'bootstrap@example.com',
            'BOOTSTRAP_ADMIN_PASSWORD': 'verysecurepassword123',
        }
        with patch.dict(os.environ, env):
            call_command('ensure_admin')
        user = User.objects.get(username='bootstrap_admin')
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_active)

    def test_second_run_does_not_reset_password(self):
        env = {
            'BOOTSTRAP_ADMIN_USERNAME': 'bootstrap_admin2',
            'BOOTSTRAP_ADMIN_EMAIL': 'bootstrap2@example.com',
            'BOOTSTRAP_ADMIN_PASSWORD': 'firstpassword123',
        }
        with patch.dict(os.environ, env):
            call_command('ensure_admin')
        user = User.objects.get(username='bootstrap_admin2')
        user.set_password('changedpassword123')
        user.save(update_fields=['password'])

        env['BOOTSTRAP_ADMIN_PASSWORD'] = 'newpassword123'
        with patch.dict(os.environ, env):
            call_command('ensure_admin')
        user.refresh_from_db()
        self.assertTrue(user.check_password('changedpassword123'))

    def test_repairs_flags_without_resetting_password(self):
        user = User.objects.create_user(
            username='repairme', email='repair@example.com', password='originalpass123'
        )
        user.is_staff = False
        user.is_superuser = False
        user.save(update_fields=['is_staff', 'is_superuser'])

        env = {
            'BOOTSTRAP_ADMIN_USERNAME': 'repairme',
            'BOOTSTRAP_ADMIN_EMAIL': 'repair@example.com',
            'BOOTSTRAP_ADMIN_PASSWORD': 'doesnotmatter123',
        }
        with patch.dict(os.environ, env):
            call_command('ensure_admin')
        user.refresh_from_db()
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.check_password('originalpass123'))


class AuditAuthStateCommandTests(TestCase):
    def test_audit_runs(self):
        out = io.StringIO()
        call_command('audit_auth_state', '--json', stdout=out)
        output = out.getvalue()
        self.assertIn('database', output)
        self.assertIn('users', output)
        self.assertIn('migrations', output)
