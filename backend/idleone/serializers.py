"""Serializers de l'app idleone — sauvegardes cloud."""
from rest_framework import serializers

from .models import IdleOneSave


class CloudSaveUploadSerializer(serializers.Serializer):
    """Valide le payload d'upload d'un slot cloud.

    Le client envoie `{ "data": <SaveData JsonUtility> }` — les clés internes
    sont en PascalCase (Metadata, Profile, Version). Miroir de la validation
    côté client (`SaveManager.TryValidateSaveJson`).
    """

    data = serializers.DictField()

    def validate_data(self, value):
        if 'Version' not in value or 'Profile' not in value:
            raise serializers.ValidationError(
                "Payload invalide : les champs 'Version' et 'Profile' sont requis."
            )
        return value


class CloudSaveMetaSerializer(serializers.ModelSerializer):
    """Métadonnées d'un slot cloud pour le listing (sans le payload)."""

    class Meta:
        model = IdleOneSave
        fields = [
            'slot', 'player_name', 'run_count', 'play_time',
            'last_saved_at', 'save_version', 'updated_at',
        ]


class CloudSaveSerializer(serializers.ModelSerializer):
    """Slot cloud complet, payload inclus (download / réponse d'upload)."""

    class Meta:
        model = IdleOneSave
        fields = [
            'slot', 'data', 'player_name', 'run_count', 'play_time',
            'last_saved_at', 'save_version', 'updated_at',
        ]
