import json
import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

from accounts.models import AccountProfile


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--json', action='store_true')

    def handle(self, *args, **options):
        User = get_user_model()
        users = User.objects.all()
        admins = users.filter(is_superuser=True)
        executor = MigrationExecutor(connection)
        applied = {app: name for app, name in executor.loader.applied_migrations}
        config = settings.DATABASES['default']
        media_root = str(settings.MEDIA_ROOT)
        profile_table_exists = AccountProfile._meta.db_table in connection.introspection.table_names()
        data = {
            'database': {'engine': config['ENGINE'], 'name': str(config['NAME']), 'host': config.get('HOST', '')},
            'users': {'total': users.count(), 'staff': users.filter(is_staff=True).count(), 'superusers': admins.count()},
            'admins': [{'username': user.username, 'is_active': user.is_active, 'is_staff': user.is_staff, 'is_superuser': user.is_superuser} for user in admins],
            'profiles_missing': users.exclude(account_profile__isnull=False).count() if profile_table_exists else users.count(),
            'media': {'root': media_root, 'exists': os.path.isdir(media_root), 'writable': os.access(media_root, os.W_OK)},
            'migrations': {app: applied.get(app) for app in ('auth', 'accounts', 'jdr', 'muscu')},
        }
        if options['json']:
            self.stdout.write(json.dumps(data, ensure_ascii=False, indent=2))
            return
        self.stdout.write(f"Base active : {data['database']['engine']} / {data['database']['name']}")
        self.stdout.write(f"Utilisateurs : {data['users']['total']} ; admins : {data['users']['superusers']}")
        self.stdout.write(f"Profils compte manquants : {data['profiles_missing']}")
        self.stdout.write(f"Media : {media_root} (existe={data['media']['exists']}, écrivable={data['media']['writable']})")
        for admin in data['admins']:
            self.stdout.write(f"Admin {admin['username']} actif={admin['is_active']} staff={admin['is_staff']}")
