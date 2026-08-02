"""Vues JDR — Personnages.

CRUD des personnages avec contrôle d'accès propriétaire/MJ,
gestion des jointures et départs de campagne.
"""
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Q

from .models import (
    Campaign, CampaignEvent, CampaignMembership, Character,
    CharacterStat, Notification, Stat,
)
from .permissions import is_full_access
from .serializers import CharacterSerializer


class CharacterViewSet(viewsets.ModelViewSet):
    serializer_class = CharacterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from .permissions import is_full_access
        user = self.request.user
        qs = Character.objects.select_related('campaign', 'player').filter(is_hidden=False)
        if is_full_access(user):
            return qs
        profile = getattr(user, 'jdr_profile', None)
        if profile and profile.role == 'mj':
            return qs.filter(
                Q(player=user) | Q(campaign__game_master=user)
            ).distinct()
        return qs.filter(player=user)

    def perform_create(self, serializer):
        serializer.save(player=self.request.user)

    def check_object_permissions(self, request, obj):
        from .permissions import is_full_access
        super().check_object_permissions(request, obj)
        if is_full_access(request.user):
            return
        if obj.player == request.user:
            return
        if obj.campaign and obj.campaign.game_master == request.user:
            return
        self.permission_denied(request)

    @action(detail=True, methods=['post'], url_path='join-campaign')
    def join_campaign(self, request, pk=None):
        """Assigne un personnage à une campagne via code d'invitation."""
        character = self.get_object()
        if character.player != request.user:
            return Response(
                {'detail': 'Seul le propriétaire du personnage peut rejoindre une campagne.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if character.campaign is not None:
            return Response(
                {'detail': "Ce personnage est déjà dans une campagne. Retirez-le d'abord."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        code = request.data.get('invite_code', '').strip()
        if not code:
            return Response(
                {'detail': "Code d'invitation requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            campaign = Campaign.objects.get(invite_code=code)
        except Campaign.DoesNotExist:
            return Response(
                {'detail': "Code d'invitation invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if campaign.game_master == request.user:
            return Response(
                {'detail': 'Vous êtes le MJ de cette campagne, vous ne pouvez pas la rejoindre en tant que joueur.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        character.campaign = campaign
        character.save(update_fields=['campaign'])
        membership, created = CampaignMembership.objects.get_or_create(
            campaign=campaign,
            player=request.user,
            defaults={'is_active': True},
        )
        if not created and not membership.is_active:
            membership.is_active = True
            membership.save(update_fields=['is_active'])
        # Auto-créer les CharacterStat pour les stats de la campagne
        campaign_stats = Stat.objects.filter(campaign=campaign)
        CharacterStat.objects.bulk_create([
            CharacterStat(character=character, stat=s, value=0)
            for s in campaign_stats
        ], ignore_conflicts=True)
        CampaignEvent.objects.create(
            campaign=campaign,
            event_type='join',
            actor=request.user,
            actor_name=request.user.username,
            message=f'{character.name} ({request.user.username}) a rejoint la campagne.',
        )
        Notification.objects.create(
            recipient=campaign.game_master,
            title='Nouveau personnage',
            message=f'{character.name} ({request.user.username}) a rejoint « {campaign.name} ».',
            notification_type='info',
        )
        return Response(CharacterSerializer(character).data)

    @action(detail=True, methods=['post'], url_path='leave-campaign')
    def leave_campaign(self, request, pk=None):
        """Retire un personnage de sa campagne."""
        character = self.get_object()
        if character.player != request.user:
            return Response(
                {'detail': 'Seul le propriétaire peut retirer le personnage.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if character.campaign is None:
            return Response(
                {'detail': "Ce personnage n'est dans aucune campagne."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old_campaign = character.campaign
        character.campaign = None
        character.save(update_fields=['campaign'])
        has_other = Character.objects.filter(
            player=request.user, campaign=old_campaign,
        ).exists()
        if not has_other:
            CampaignMembership.objects.filter(
                campaign=old_campaign, player=request.user,
            ).update(is_active=False)
        return Response(CharacterSerializer(character).data)


class MJCharacterView(APIView):
    """Retourne (et crée si besoin) le personnage MJ caché d'une campagne."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        campaign = None
        if campaign_id:
            try:
                campaign = Campaign.objects.get(pk=campaign_id)
            except Campaign.DoesNotExist:
                return Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)
            if campaign.game_master != request.user and not is_full_access(request.user):
                return Response({'detail': 'Seul le MJ de la campagne peut utiliser ce personnage.'}, status=status.HTTP_403_FORBIDDEN)
        else:
            campaign = Campaign.objects.filter(game_master=request.user).order_by('-created_at').first()
            if not campaign:
                return Response({'detail': 'Aucune campagne gérée.'}, status=status.HTTP_404_NOT_FOUND)

        character, _created = Character.objects.get_or_create(
            name='MJ',
            player=request.user,
            campaign=campaign,
            defaults={
                'class_type': 'MJ',
                'description': 'Personnage système du Maître du Jeu',
                'level': 1,
                'is_hidden': True,
            },
        )
        return Response(CharacterSerializer(character).data)
