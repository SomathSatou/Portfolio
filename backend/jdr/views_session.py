"""Vues JDR — Session en direct (avatar, notes, chat, wallet)."""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Campaign, Character, ChatMessage, SessionNote
from .serializers import (
    AvatarUploadSerializer, CharacterSerializer,
    CharacterWithStatsSerializer, ChatMessageSerializer,
    SessionNoteSerializer, WalletUpdateSerializer,
)
from .views_content import _check_campaign_access, _check_campaign_mj


class CharacterAvatarUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            character = Character.objects.select_related('campaign').get(pk=pk)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = character.player == request.user
        is_mj = character.campaign and character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = AvatarUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        character.avatar = serializer.validated_data['avatar']
        character.save(update_fields=['avatar'])
        return Response(CharacterSerializer(character).data)


class CharactersWithStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        campaign, _is_mj, err = _check_campaign_access(request, pk)
        if err:
            return err
        characters = Character.objects.filter(
            campaign=campaign,
        ).select_related('player').prefetch_related('character_stats__stat')
        return Response(CharacterWithStatsSerializer(characters, many=True).data)


class SessionNoteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign, is_mj, err = _check_campaign_access(request, campaign_id)
        if err:
            return err
        qs = SessionNote.objects.filter(campaign=campaign)
        if not is_mj:
            qs = qs.filter(is_private=False)
        return Response(SessionNoteSerializer(qs, many=True).data)

    def patch(self, request):
        campaign_id = request.data.get('campaign')
        is_private = request.data.get('is_private', False)
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign, err = _check_campaign_mj(request, campaign_id)
        if err:
            return err
        note, _created = SessionNote.objects.get_or_create(
            campaign=campaign, is_private=is_private,
        )
        note.content = request.data.get('content', note.content)
        note.save(update_fields=['content', 'updated_at'])
        return Response(SessionNoteSerializer(note).data)


class ChatMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign, _is_mj, err = _check_campaign_access(request, campaign_id)
        if err:
            return err
        limit = min(int(request.query_params.get('limit', 100)), 500)
        messages = ChatMessage.objects.filter(
            campaign=campaign,
        ).select_related('author', 'campaign').order_by('-created_at')[:limit]
        data = ChatMessageSerializer(messages, many=True).data
        data.reverse()
        return Response(data)


class WalletUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        campaign, err = _check_campaign_mj(request, pk)
        if err:
            return err
        wallets = request.data.get('wallets', [])
        if not wallets:
            return Response({'detail': 'Paramètre wallets requis.'}, status=status.HTTP_400_BAD_REQUEST)
        updated = []
        for entry in wallets:
            ser = WalletUpdateSerializer(data=entry)
            ser.is_valid(raise_exception=True)
            d = ser.validated_data
            try:
                character = Character.objects.get(pk=d['character_id'], campaign=campaign)
            except Character.DoesNotExist:
                continue
            if 'gold' in d:
                character.gold = d['gold']
            if 'silver' in d:
                character.silver = d['silver']
            if 'copper' in d:
                character.copper = d['copper']
            character.save(update_fields=['gold', 'silver', 'copper'])
            updated.append(CharacterSerializer(character).data)
        return Response(updated)
