"""Modèles pour l'app accounts — gestion de la vérification d'email."""
import secrets

from django.contrib.auth.models import User
from django.db import models


class EmailVerification(models.Model):
    """Stocke le token de vérification d'email pour un utilisateur nouvellement créé."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='email_verification',
    )
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(48)[:64]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"EmailVerification({self.user.username}, verified={self.verified_at is not None})"
