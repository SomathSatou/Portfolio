"""Vues de l'app idleone — auth déléguée à accounts + slots de sauvegarde cloud.

Pattern identique à `jdr/views_auth.py` : le login hérite de la vue partagée
et s'assure que le `IdleOneProfile` existe. L'accès est ouvert à tout compte
vérifié (pas de gate type `can_access_muscu`).
"""
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.serializers import MeSerializer as AccountsMeSerializer
from accounts.views import LoginView as _BaseLoginView
from accounts.views import RegisterView  # noqa: F401 — ré-exporté pour urls.py
from accounts.views import (  # noqa: F401 — ré-exportés pour urls.py
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ResendVerificationEmailView,
    VerifyEmailView,
)

from .models import IdleOneProfile, IdleOneSave
from .serializers import (
    CloudSaveMetaSerializer,
    CloudSaveSerializer,
    CloudSaveUploadSerializer,
)

# Taille max du corps d'une requête d'upload de sauvegarde (5 Mo).
IDLEONE_SAVE_MAX_BYTES = 5 * 1024 * 1024


class IdleOneLoginView(_BaseLoginView):
    """Login IdleOne : délègue à accounts.LoginView puis s'assure que
    le IdleOneProfile existe."""

    def post(self, request):
        response = super().post(request)
        if response.status_code == 200:
            email = request.data.get('email', '').strip()
            user = User.objects.filter(email__iexact=email).order_by('id').first()
            if user is not None:
                profile, _ = IdleOneProfile.objects.get_or_create(user=user)
                profile.last_login_at = timezone.now()
                profile.save(update_fields=['last_login_at'])
        return response


class IdleOneMeView(generics.RetrieveUpdateAPIView):
    """Profil utilisateur IdleOne — garantit l'existence du IdleOneProfile."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AccountsMeSerializer

    def get_object(self):
        IdleOneProfile.objects.get_or_create(user=self.request.user)
        return self.request.user


class SaveListView(APIView):
    """Liste les métadonnées des slots cloud de l'utilisateur.

    GET /api/idleone/saves/ → [ {slot, player_name, run_count, ...}, ... ]
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        saves = IdleOneSave.objects.filter(user=request.user).order_by('slot')
        return Response(CloudSaveMetaSerializer(saves, many=True).data)


class SaveSlotView(APIView):
    """Lecture / écriture / suppression d'un slot cloud individuel.

    GET    /api/idleone/saves/<slot>/ → slot complet (payload inclus), 404 si vide
    PUT    /api/idleone/saves/<slot>/ → upload {data: SaveData} → 200 (upsert)
    DELETE /api/idleone/saves/<slot>/ → 204 (idempotent)
    """

    permission_classes = [permissions.IsAuthenticated]

    @staticmethod
    def _slot_valid(slot) -> bool:
        return isinstance(slot, int) and 0 <= slot < IdleOneSave.MAX_SLOTS

    def get(self, request, slot):
        if not self._slot_valid(slot):
            return Response({'detail': 'Slot invalide (0-2).'}, status=status.HTTP_400_BAD_REQUEST)
        save = IdleOneSave.objects.filter(user=request.user, slot=slot).first()
        if save is None:
            return Response(
                {'detail': 'Aucune sauvegarde cloud dans ce slot.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(CloudSaveSerializer(save).data)

    def put(self, request, slot):
        if not self._slot_valid(slot):
            return Response({'detail': 'Slot invalide (0-2).'}, status=status.HTTP_400_BAD_REQUEST)
        if len(request.body) > IDLEONE_SAVE_MAX_BYTES:
            return Response(
                {'detail': 'Sauvegarde trop volumineuse (max 5 Mo).'},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        serializer = CloudSaveUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data['data']

        metadata = data.get('Metadata') or {}
        profile_data = data.get('Profile') or {}
        save, _ = IdleOneSave.objects.update_or_create(
            user=request.user,
            slot=slot,
            defaults={
                'data': data,
                'player_name': metadata.get('PlayerName') or profile_data.get('PlayerName') or '',
                'run_count': metadata.get('RunCount') or profile_data.get('RunCount') or 1,
                'play_time': metadata.get('PlayTime') or profile_data.get('PlayTime') or 0.0,
                'last_saved_at': metadata.get('LastSavedAt') or profile_data.get('LastSavedAt') or '',
                'save_version': data.get('Version', ''),
            },
        )

        profile = getattr(request.user, 'idleone_profile', None)
        if profile is not None:
            profile.last_sync_at = timezone.now()
            profile.save(update_fields=['last_sync_at'])

        return Response(CloudSaveSerializer(save).data)

    def delete(self, request, slot):
        if not self._slot_valid(slot):
            return Response({'detail': 'Slot invalide (0-2).'}, status=status.HTTP_400_BAD_REQUEST)
        IdleOneSave.objects.filter(user=request.user, slot=slot).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
