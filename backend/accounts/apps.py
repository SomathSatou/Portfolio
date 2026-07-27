from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """App Django pour l'authentification unifiée JDR + IRL RPG."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        from . import signals
