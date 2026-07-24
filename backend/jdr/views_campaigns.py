"""Vues JDR — Campagnes.

Gère le cycle de vie des campagnes : CRUD, sessions en direct,
avance inter-session (marché + jardin), invitations et membres.
"""
from django.db import transaction
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Campaign, CampaignEvent, CampaignMembership, Character, City, MarketPrice,
    MerchantOrder, Notification, Resource,
)
from .services.merchant_inventory import receive_delivery
from .serializers import (
    CampaignEventSerializer, CampaignMembershipSerializer,
    CampaignSerializer, CampaignSettingsSerializer, CityListSerializer,
    CharacterSerializer,
)


class CampaignViewSet(viewsets.ModelViewSet):
    serializer_class = CampaignSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Campaign.objects.filter(
            Q(game_master=user) | Q(memberships__player=user, memberships__is_active=True)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(game_master=self.request.user)

    def get_permissions(self):
        from .permissions import IsMJ
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsMJ()]
        return super().get_permissions()

    @action(detail=True, methods=['post'], url_path='advance-session')
    @transaction.atomic
    def advance_session(self, request, pk=None):
        campaign = Campaign.objects.select_for_update().get(pk=pk)
        if campaign.game_master != request.user:
            return Response(
                {'detail': 'Seul le MJ peut avancer la session.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        campaign.current_session_number += 1
        campaign.save(update_fields=['current_session_number'])

        new_session = campaign.current_session_number

        # ── Merchant inter-session logic ──
        from .views_economy import generate_market_prices
        generate_market_prices(campaign, new_session)

        # Détecter changements de prix significatifs (> 10%) et notifier les marchands
        prev_prices = {
            mp.city_export_id: mp.current_price
            for mp in MarketPrice.objects.filter(
                campaign=campaign, session_number=new_session - 1,
            )
        }
        new_prices = MarketPrice.objects.filter(
            campaign=campaign, session_number=new_session,
        ).select_related('city_export__resource', 'city_export__city')

        significant_changes: list[str] = []
        for mp in new_prices:
            prev = prev_prices.get(mp.city_export_id)
            if prev and prev > 0:
                change_pct = abs(float(mp.current_price - prev) / float(prev))
                if change_pct > 0.10:
                    direction = '↑' if mp.current_price > prev else '↓'
                    significant_changes.append(
                        f'{mp.city_export.resource.name} à {mp.city_export.city.name}: '
                        f'{direction} {change_pct:.0%}'
                    )

        # Décrémenter transit des commandes et livrer
        transit_orders = MerchantOrder.objects.select_for_update().filter(
            campaign=campaign, status='in_transit',
        ).select_related('character', 'resource')

        delivered_notifications: list[Notification] = []
        for order in transit_orders:
            order.sessions_remaining -= 1
            if order.sessions_remaining <= 0:
                order.sessions_remaining = 0
                order.status = 'delivered'
                delivered_notifications.append(Notification(
                    recipient=order.character.player,
                    title='Commande livrée',
                    message=(
                        f'{order.quantity}× {order.resource.name} livré(e)s ! '
                        f'Vous pouvez maintenant vendre depuis le Comptoir Commercial.'
                    ),
                    notification_type='info',
                ))

                receive_delivery(
                    character=order.character,
                    resource=order.resource,
                    quantity=order.quantity,
                    unit_cost=order.buy_price_unit,
                )

            order.save(update_fields=['sessions_remaining', 'status'])

        # Passer les commandes pending → in_transit
        MerchantOrder.objects.filter(
            campaign=campaign, status='pending',
        ).update(status='in_transit')

        if delivered_notifications:
            Notification.objects.bulk_create(delivered_notifications)

        # Notifier les marchands des fluctuations de prix
        if significant_changes:
            merchant_chars = Character.objects.filter(
                campaign=campaign, class_type__iexact='marchand',
            ).select_related('player')
            price_msg = 'Changements de prix significatifs :\n' + '\n'.join(significant_changes[:10])
            price_notifs = [
                Notification(
                    recipient=c.player,
                    title='Fluctuation du marché',
                    message=price_msg,
                    notification_type='info',
                )
                for c in merchant_chars
            ]
            if price_notifs:
                Notification.objects.bulk_create(price_notifs)

        # ── Garden inter-session logic ──
        from .views_garden import advance_garden_session
        garden_notifs = advance_garden_session(campaign)
        if garden_notifs:
            Notification.objects.bulk_create(garden_notifs)

        # Notifier tous les membres
        members = campaign.memberships.filter(is_active=True)
        notifications = [
            Notification(
                recipient=m.player,
                title='Nouvelle inter-session',
                message=f'La campagne "{campaign.name}" passe à la session {new_session}.',
                notification_type='intersession',
            )
            for m in members
        ]
        Notification.objects.bulk_create(notifications)

        CampaignEvent.objects.create(
            campaign=campaign,
            event_type='advance',
            actor=request.user,
            actor_name=request.user.username,
            message=f'Session avancée à #{new_session}.',
            link_hash=f'#/jdr/campaign/{campaign.id}',
        )

        return Response({'current_session_number': new_session})

    @action(detail=True, methods=['post'], url_path='toggle-session')
    def toggle_session(self, request, pk=None):
        campaign = self.get_object()
        if campaign.game_master != request.user:
            return Response(
                {'detail': 'Seul le MJ peut lancer ou arrêter une session.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        campaign.session_active = not campaign.session_active
        campaign.save(update_fields=['session_active'])

        if campaign.session_active:
            players = Character.objects.filter(
                campaign=campaign,
            ).select_related('player').values_list('player', flat=True).distinct()

            notifications = [
                Notification(
                    recipient_id=player_id,
                    title='Session en direct !',
                    message=f'Le MJ a lancé une session pour « {campaign.name} ». Rejoignez maintenant !',
                    notification_type='info',
                    link=f'#/jdr/session/{campaign.id}',
                )
                for player_id in players
                if player_id != request.user.id
            ]
            if notifications:
                Notification.objects.bulk_create(notifications)

            CampaignEvent.objects.create(
                campaign=campaign,
                event_type='session_start',
                actor=request.user,
                actor_name=request.user.username,
                message='Session en direct lancée.',
                link_hash=f'#/jdr/session/{campaign.id}',
            )
        else:
            CampaignEvent.objects.create(
                campaign=campaign,
                event_type='session_end',
                actor=request.user,
                actor_name=request.user.username,
                message='Session en direct terminée.',
            )

        return Response(CampaignSerializer(campaign).data)

    @action(detail=True, methods=['post'], url_path='invite')
    def invite(self, request, pk=None):
        campaign = self.get_object()
        if campaign.game_master != request.user:
            return Response(
                {'detail': "Seul le MJ peut générer un code d'invitation."},
                status=status.HTTP_403_FORBIDDEN,
            )
        code = campaign.generate_invite_code()
        return Response({'invite_code': code})

    @action(detail=False, methods=['post'], url_path='join')
    def join(self, request):
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
                {'detail': 'Vous êtes déjà le MJ de cette campagne.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership, created = CampaignMembership.objects.get_or_create(
            campaign=campaign,
            player=request.user,
            defaults={'is_active': True},
        )
        if not created and not membership.is_active:
            membership.is_active = True
            membership.save(update_fields=['is_active'])

        CampaignEvent.objects.create(
            campaign=campaign,
            event_type='join',
            actor=request.user,
            actor_name=request.user.username,
            message=f'{request.user.username} a rejoint la campagne.',
        )
        Notification.objects.create(
            recipient=campaign.game_master,
            title='Nouveau joueur',
            message=f'{request.user.username} a rejoint la campagne « {campaign.name} ».',
            notification_type='info',
        )

        return Response({'detail': 'Vous avez rejoint la campagne.', 'campaign_id': campaign.id})

    @action(detail=True, methods=['get'], url_path='members')
    def members(self, request, pk=None):
        campaign = self.get_object()
        memberships = campaign.memberships.filter(is_active=True).select_related('player')
        serializer = CampaignMembershipSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='characters')
    def campaign_characters(self, request, pk=None):
        campaign = self.get_object()
        characters = Character.objects.filter(campaign=campaign)
        serializer = CharacterSerializer(characters, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post', 'delete'], url_path='cities')
    def cities(self, request, pk=None):
        campaign = self.get_object()
        if request.method == 'GET':
            cities = campaign.cities.all()
            serializer = CityListSerializer(cities, many=True)
            return Response(serializer.data)
        if campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut modifier les villes.'}, status=status.HTTP_403_FORBIDDEN)
        city_ids = request.data.get('city_ids', [])
        if not city_ids:
            return Response({'detail': 'city_ids requis.'}, status=status.HTTP_400_BAD_REQUEST)
        cities_qs = City.objects.filter(pk__in=city_ids)
        if request.method == 'POST':
            campaign.cities.add(*cities_qs)
        elif request.method == 'DELETE':
            campaign.cities.remove(*cities_qs)
        return Response(CityListSerializer(campaign.cities.all(), many=True).data)

    @action(detail=True, methods=['get'], url_path='events')
    def events(self, request, pk=None):
        campaign = self.get_object()
        qs = CampaignEvent.objects.filter(campaign=campaign)
        event_type = request.query_params.get('type')
        if event_type:
            qs = qs.filter(event_type=event_type)
        qs = qs[:100]
        serializer = CampaignEventSerializer(qs, many=True)
        return Response(serializer.data)
