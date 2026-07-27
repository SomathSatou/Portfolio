from django.conf import settings
from django.db import migrations, models


def create_profiles_and_copy_legacy_avatars(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    AccountProfile = apps.get_model('accounts', 'AccountProfile')
    UserProfile = apps.get_model('jdr', 'UserProfile')
    MuscuProfile = apps.get_model('muscu', 'MuscuProfile')

    jdr_avatars = {
        profile.user_id: profile.avatar.name
        for profile in UserProfile.objects.exclude(avatar='')
        if profile.avatar
    }
    muscu_avatars = {
        profile.user_id: profile.avatar.name
        for profile in MuscuProfile.objects.exclude(avatar='')
        if profile.avatar
    }

    for user in User.objects.iterator():
        avatar = jdr_avatars.get(user.pk) or muscu_avatars.get(user.pk)
        AccountProfile.objects.get_or_create(user_id=user.pk, defaults={'avatar': avatar})


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0001_add_email_verified_at'),
        ('jdr', '0027_monster_scope'),
        ('muscu', '0002_cardio_metrics'),
    ]

    operations = [
        migrations.CreateModel(
            name='AccountProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('avatar', models.ImageField(blank=True, null=True, upload_to='accounts/avatars/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(on_delete=models.deletion.CASCADE, related_name='account_profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.RunPython(create_profiles_and_copy_legacy_avatars, migrations.RunPython.noop),
    ]
