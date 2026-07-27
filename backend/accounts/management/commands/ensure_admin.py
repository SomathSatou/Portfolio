import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--reset-password', action='store_true')

    def handle(self, *args, **options):
        username = os.getenv('BOOTSTRAP_ADMIN_USERNAME', '').strip()
        email = os.getenv('BOOTSTRAP_ADMIN_EMAIL', '').strip()
        password = os.getenv('BOOTSTRAP_ADMIN_PASSWORD', '')
        if not username or not email or not password:
            self.stdout.write('Bootstrap admin ignoré : configuration incomplète.')
            return

        User = get_user_model()
        user = User.objects.filter(username=username).first() or User.objects.filter(email=email).first()
        if user is None:
            User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write(self.style.SUCCESS('Administrateur bootstrap créé.'))
            return

        changed = []
        for field in ('is_staff', 'is_superuser', 'is_active'):
            if not getattr(user, field):
                setattr(user, field, True)
                changed.append(field)
        if options['reset_password']:
            user.set_password(password)
            changed.append('password')
        if changed:
            user.save(update_fields=changed)
            self.stdout.write(self.style.SUCCESS('Administrateur bootstrap mis à jour.'))
        else:
            self.stdout.write('Administrateur bootstrap déjà conforme.')
