"""Modèles de l'app idleone — profil de jeu et sauvegardes cloud.

IdleOne réutilise le `django.contrib.auth.User` partagé avec JDR et IRL RPG
(pattern établi : un profil OneToOne par app, créé à la volée au login).

Le contenu de sauvegarde (`IdleOneSave.data`) est le JSON `SaveData` du client
Unity stocké verbatim — le serveur ne fait pas office d'autorité de jeu,
il se contente de stocker et d'exposer les métadonnées pour le listing.
"""
from django.conf import settings
from django.db import models


class IdleOneProfile(models.Model):
    """Profil IdleOne lié au compte partagé."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='idleone_profile',
    )
    last_login_at = models.DateTimeField(blank=True, null=True)
    last_sync_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Profil IdleOne'
        verbose_name_plural = 'Profils IdleOne'

    def __str__(self) -> str:
        return f'{self.user.username} (idleone)'


class IdleOneSave(models.Model):
    """Un slot de sauvegarde cloud par utilisateur (3 slots max, comme le client).

    `data` contient l'objet `SaveData` sérialisé par JsonUtility (clés
    PascalCase : Metadata, Profile, Version, ExpeditionState, ...).
    Les métadonnées sont dénormalisées pour permettre le listing sans
    désérialiser le payload complet.
    """

    MAX_SLOTS = 3

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='idleone_saves',
    )
    slot = models.PositiveSmallIntegerField()
    data = models.JSONField()

    # Métadonnées dénormalisées (extraites de data['Metadata'] à l'upload)
    player_name = models.CharField(max_length=150, blank=True, default='')
    run_count = models.PositiveIntegerField(default=1)
    play_time = models.FloatField(default=0.0)
    last_saved_at = models.CharField(max_length=64, blank=True, default='')
    save_version = models.CharField(max_length=16, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'slot'],
                name='unique_idleone_save_per_slot',
            ),
        ]
        ordering = ['slot']
        verbose_name = 'Sauvegarde IdleOne'
        verbose_name_plural = 'Sauvegardes IdleOne'

    def __str__(self) -> str:
        return f'{self.user.username} — slot {self.slot} ({self.player_name})'
