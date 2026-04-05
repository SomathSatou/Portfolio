import random
from decimal import Decimal

from django.db import models as db_models
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    AlchemyPlant, Campaign, CampaignEvent, CampaignMembership, Character,
    CharacterItem, CharacterSpell, CharacterStat, ChatMessage,
    City, CityExport, CityImport,
    GardenPlot, GardenUpgrade, HarvestLog, Item, MarketPrice, MerchantInventory,
    MerchantOrder, Notification, Resource, RuneCollection, RuneDrawing, RuneTemplate,
    SessionNote, SharedFolder, SharedFolderAccess, Spell, Stat, UserProfile,
)
from .permissions import IsCampaignMember, IsMJ, IsOwner
from .serializers import (
    AlchemyPlantListSerializer,
    AlchemyPlantSerializer,
    AvatarUploadSerializer,
    CampaignEventSerializer,
    CampaignMembershipSerializer,
    CampaignSerializer,
    CharacterItemSerializer,
    CharacterSerializer,
    CharacterSpellSerializer,
    CharacterStatSerializer,
    CharacterWithStatsSerializer,
    ChatMessageSerializer,
    ItemSerializer,
    SpellSerializer,
    StatSerializer,
    CityDetailSerializer,
    CityListSerializer,
    CreateOrderSerializer,
    CreateRuneDrawingSerializer,
    CreateSharedFolderSerializer,
    GardenPlotSerializer,
    GardenUpgradeSerializer,
    HarvestLogSerializer,
    MarketPriceSerializer,
    MeSerializer,
    MerchantInventorySerializer,
    MerchantOrderSerializer,
    NotificationSerializer,
    PlantActionSerializer,
    RegisterSerializer,
    ResourceSerializer,
    ReviewRuneDrawingSerializer,
    RuneCollectionSerializer,
    RuneDrawingSerializer,
    RuneTemplateListSerializer,
    RuneTemplateSerializer,
    SellHarvestSerializer,
    SellFromInventorySerializer,
    SellOrderSerializer,
    SessionNoteSerializer,
    SharedFolderSerializer,
    UpdateSharedFolderSerializer,
    WalletUpdateSerializer,
)


# ─── Auth ────────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'detail': 'Inscription réussie.', 'user_id': user.id},
            status=status.HTTP_201_CREATED,
        )


class LoginView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.contrib.auth import authenticate

        email = request.data.get('email', '')
        password = request.data.get('password', '')

        # Django User uses username for auth; look up by email
        from django.contrib.auth.models import User
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Identifiants invalides.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = authenticate(request, username=user_obj.username, password=password)
        if user is None:
            return Response(
                {'detail': 'Identifiants invalides.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Ensure profile exists
        UserProfile.objects.get_or_create(user=user)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class MeView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        UserProfile.objects.get_or_create(user=self.request.user)
        return self.request.user


# ─── Campaigns ───────────────────────────────────────────────────────────────

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
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsMJ()]
        return super().get_permissions()

    @action(detail=True, methods=['post'], url_path='advance-session')
    def advance_session(self, request, pk=None):
        campaign = self.get_object()
        if campaign.game_master != request.user:
            return Response(
                {'detail': 'Seul le MJ peut avancer la session.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        campaign.current_session_number += 1
        campaign.save(update_fields=['current_session_number'])

        new_session = campaign.current_session_number

        # ── Merchant inter-session logic ──
        # 1. Generate new market prices with fluctuation
        generate_market_prices(campaign, new_session)

        # 2. Detect significant price changes (> 10%) and notify merchants
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

        # 3. Decrement transit on in_transit orders & deliver
        transit_orders = MerchantOrder.objects.filter(
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

                # Auto-create Item from Resource + add to character inventory
                availability_rarity = {
                    'Abondant': 'commun', 'Commun': 'commun', 'Moyen': 'peu_commun',
                    'Rare': 'rare', 'Légendaire': 'légendaire',
                }
                item, _created = Item.objects.get_or_create(
                    campaign=campaign,
                    resource=order.resource,
                    defaults={
                        'name': order.resource.name,
                        'description': f'Ressource marchande ({order.resource.craft_type})',
                        'item_type': order.resource.craft_type,
                        'rarity': availability_rarity.get(order.resource.availability, 'commun'),
                        'value': order.buy_price_unit,
                    },
                )
                ci, ci_created = CharacterItem.objects.get_or_create(
                    character=order.character,
                    item=item,
                    defaults={'quantity': order.quantity},
                )
                if not ci_created:
                    ci.quantity += order.quantity
                    ci.save(update_fields=['quantity'])

                # Update MerchantInventory (weighted average buy price)
                mi, mi_created = MerchantInventory.objects.get_or_create(
                    character=order.character,
                    resource=order.resource,
                    defaults={
                        'quantity': order.quantity,
                        'average_buy_price': order.buy_price_unit,
                    },
                )
                if not mi_created:
                    old_total = mi.average_buy_price * mi.quantity
                    new_total = order.buy_price_unit * order.quantity
                    mi.quantity += order.quantity
                    if mi.quantity > 0:
                        mi.average_buy_price = (old_total + new_total) / mi.quantity
                    mi.save(update_fields=['quantity', 'average_buy_price'])

            order.save(update_fields=['sessions_remaining', 'status'])

        # 4. Move pending orders to in_transit
        MerchantOrder.objects.filter(
            campaign=campaign, status='pending',
        ).update(status='in_transit')

        if delivered_notifications:
            Notification.objects.bulk_create(delivered_notifications)

        # 5. Notify merchants about significant price changes
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
        garden_notifs = advance_garden_session(campaign)
        if garden_notifs:
            Notification.objects.bulk_create(garden_notifs)

        # Notify all members
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

        # Log event
        CampaignEvent.objects.create(
            campaign=campaign,
            event_type='advance',
            actor=request.user,
            actor_name=request.user.username,
            message=f'Session avancée à #{new_session}.',
            link_hash=f'#/jdr/campaign/{campaign.id}',
        )

        return Response({
            'current_session_number': new_session,
        })

    @action(detail=True, methods=['post'], url_path='invite')
    def invite(self, request, pk=None):
        campaign = self.get_object()
        if campaign.game_master != request.user:
            return Response(
                {'detail': 'Seul le MJ peut générer un code d\'invitation.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        code = campaign.generate_invite_code()
        return Response({'invite_code': code})

    @action(detail=False, methods=['post'], url_path='join')
    def join(self, request):
        code = request.data.get('invite_code', '').strip()
        if not code:
            return Response(
                {'detail': 'Code d\'invitation requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            campaign = Campaign.objects.get(invite_code=code)
        except Campaign.DoesNotExist:
            return Response(
                {'detail': 'Code d\'invitation invalide.'},
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

        # Log event + notify GM
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
        # POST: add cities, DELETE: remove cities
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


# ─── Characters ──────────────────────────────────────────────────────────────

class CharacterViewSet(viewsets.ModelViewSet):
    serializer_class = CharacterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Character.objects.select_related('campaign', 'player')
        # MJ can see characters in their campaigns
        profile = getattr(user, 'jdr_profile', None)
        if profile and profile.role == 'mj':
            return qs.filter(
                Q(player=user) | Q(campaign__game_master=user)
            ).distinct()
        return qs.filter(player=user)

    def perform_create(self, serializer):
        serializer.save(player=self.request.user)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        # Allow owner or campaign MJ to edit
        if obj.player == request.user:
            return
        if obj.campaign.game_master == request.user:
            return
        self.permission_denied(request)


# ─── Campaign Content (Spells, Items, Stats) ─────────────────────────────────

def _check_campaign_mj(request, campaign_id):
    """Return (campaign, error_response). If error_response is not None, return it."""
    try:
        campaign = Campaign.objects.get(pk=campaign_id)
    except Campaign.DoesNotExist:
        return None, Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    if campaign.game_master != request.user:
        return campaign, Response(
            {'detail': 'Seul le MJ peut modifier le contenu de la campagne.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return campaign, None


def _check_campaign_access(request, campaign_id):
    """Check user is MJ or member. Returns (campaign, is_mj, error_response)."""
    try:
        campaign = Campaign.objects.get(pk=campaign_id)
    except Campaign.DoesNotExist:
        return None, False, Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    is_mj = campaign.game_master == request.user
    is_member = CampaignMembership.objects.filter(
        campaign=campaign, player=request.user, is_active=True,
    ).exists()
    if not is_mj and not is_member:
        return campaign, False, Response(
            {'detail': 'Vous n\'avez pas accès à cette campagne.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return campaign, is_mj, None


class SpellListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign, _is_mj, err = _check_campaign_access(request, campaign_id)
        if err:
            return err
        spells = Spell.objects.filter(campaign=campaign)
        return Response(SpellSerializer(spells, many=True).data)

    def post(self, request):
        campaign_id = request.data.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign, err = _check_campaign_mj(request, campaign_id)
        if err:
            return err
        serializer = SpellSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(campaign=campaign)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SpellDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            spell = Spell.objects.get(pk=pk)
        except Spell.DoesNotExist:
            return Response({'detail': 'Sort introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if spell.campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut modifier.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = SpellSerializer(spell, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            spell = Spell.objects.get(pk=pk)
        except Spell.DoesNotExist:
            return Response({'detail': 'Sort introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if spell.campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut supprimer.'}, status=status.HTTP_403_FORBIDDEN)
        spell.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ItemListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign, _is_mj, err = _check_campaign_access(request, campaign_id)
        if err:
            return err
        items = Item.objects.filter(campaign=campaign)
        return Response(ItemSerializer(items, many=True).data)

    def post(self, request):
        campaign_id = request.data.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign, err = _check_campaign_mj(request, campaign_id)
        if err:
            return err
        serializer = ItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(campaign=campaign)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ItemDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            item = Item.objects.get(pk=pk)
        except Item.DoesNotExist:
            return Response({'detail': 'Objet introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if item.campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut modifier.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            item = Item.objects.get(pk=pk)
        except Item.DoesNotExist:
            return Response({'detail': 'Objet introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if item.campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut supprimer.'}, status=status.HTTP_403_FORBIDDEN)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StatListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign, _is_mj, err = _check_campaign_access(request, campaign_id)
        if err:
            return err
        stats = Stat.objects.filter(campaign=campaign)
        return Response(StatSerializer(stats, many=True).data)

    def post(self, request):
        campaign_id = request.data.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign, err = _check_campaign_mj(request, campaign_id)
        if err:
            return err
        serializer = StatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        stat = serializer.save(campaign=campaign)
        # Auto-create CharacterStat for all characters in campaign
        characters = Character.objects.filter(campaign=campaign)
        CharacterStat.objects.bulk_create([
            CharacterStat(character=c, stat=stat, value=0)
            for c in characters
        ], ignore_conflicts=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class StatDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            stat = Stat.objects.get(pk=pk)
        except Stat.DoesNotExist:
            return Response({'detail': 'Stat introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if stat.campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut modifier.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = StatSerializer(stat, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            stat = Stat.objects.get(pk=pk)
        except Stat.DoesNotExist:
            return Response({'detail': 'Stat introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if stat.campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut supprimer.'}, status=status.HTTP_403_FORBIDDEN)
        stat.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CharacterStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response({'detail': 'Paramètre character requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            character = Character.objects.select_related('campaign').get(pk=character_id)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = character.player == request.user
        is_mj = character.campaign and character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        # Ensure all campaign stats exist for this character
        if character.campaign:
            campaign_stats = Stat.objects.filter(campaign=character.campaign)
            existing_ids = set(
                CharacterStat.objects.filter(character=character).values_list('stat_id', flat=True)
            )
            to_create = [
                CharacterStat(character=character, stat=s, value=0)
                for s in campaign_stats if s.id not in existing_ids
            ]
            if to_create:
                CharacterStat.objects.bulk_create(to_create, ignore_conflicts=True)
        stats = CharacterStat.objects.filter(character=character).select_related('stat')
        return Response(CharacterStatSerializer(stats, many=True).data)

    def patch(self, request):
        """Bulk update character stats. Expects: { character: int, stats: [{stat: int, value: int}] }"""
        character_id = request.data.get('character')
        stats_data = request.data.get('stats', [])
        if not character_id:
            return Response({'detail': 'Paramètre character requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            character = Character.objects.select_related('campaign').get(pk=character_id)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = character.player == request.user
        is_mj = character.campaign and character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        for stat_entry in stats_data:
            stat_id = stat_entry.get('stat')
            value = max(0, min(20, int(stat_entry.get('value', 0))))
            CharacterStat.objects.update_or_create(
                character=character, stat_id=stat_id,
                defaults={'value': value},
            )
        stats = CharacterStat.objects.filter(character=character).select_related('stat')
        return Response(CharacterStatSerializer(stats, many=True).data)


class CharacterSpellsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response({'detail': 'Paramètre character requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            character = Character.objects.select_related('campaign').get(pk=character_id)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = character.player == request.user
        is_mj = character.campaign and character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        spells = CharacterSpell.objects.filter(character=character).select_related('spell')
        return Response(CharacterSpellSerializer(spells, many=True).data)

    def post(self, request):
        """Add a spell to a character. MJ or owner can do this."""
        character_id = request.data.get('character')
        spell_id = request.data.get('spell')
        if not character_id or not spell_id:
            return Response({'detail': 'Paramètres character et spell requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            character = Character.objects.select_related('campaign').get(pk=character_id)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = character.player == request.user
        is_mj = character.campaign and character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            spell = Spell.objects.get(pk=spell_id, campaign=character.campaign)
        except Spell.DoesNotExist:
            return Response({'detail': 'Sort introuvable dans cette campagne.'}, status=status.HTTP_404_NOT_FOUND)
        cs, created = CharacterSpell.objects.get_or_create(
            character=character, spell=spell,
            defaults={'notes': request.data.get('notes', '')},
        )
        if not created:
            return Response({'detail': 'Ce sort est déjà connu.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CharacterSpellSerializer(cs).data, status=status.HTTP_201_CREATED)


class CharacterSpellRemoveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            cs = CharacterSpell.objects.select_related('character__campaign').get(pk=pk)
        except CharacterSpell.DoesNotExist:
            return Response({'detail': 'Entrée introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = cs.character.player == request.user
        is_mj = cs.character.campaign and cs.character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        cs.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CharacterItemsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response({'detail': 'Paramètre character requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            character = Character.objects.select_related('campaign').get(pk=character_id)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = character.player == request.user
        is_mj = character.campaign and character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        items = CharacterItem.objects.filter(character=character).select_related('item')
        return Response(CharacterItemSerializer(items, many=True).data)

    def post(self, request):
        """Add an item to a character. MJ or owner can do this."""
        character_id = request.data.get('character')
        item_id = request.data.get('item')
        if not character_id or not item_id:
            return Response({'detail': 'Paramètres character et item requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            character = Character.objects.select_related('campaign').get(pk=character_id)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = character.player == request.user
        is_mj = character.campaign and character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            item = Item.objects.get(pk=item_id, campaign=character.campaign)
        except Item.DoesNotExist:
            return Response({'detail': 'Objet introuvable dans cette campagne.'}, status=status.HTTP_404_NOT_FOUND)
        ci, created = CharacterItem.objects.get_or_create(
            character=character, item=item,
            defaults={
                'quantity': request.data.get('quantity', 1),
                'is_equipped': request.data.get('is_equipped', False),
                'notes': request.data.get('notes', ''),
            },
        )
        if not created:
            ci.quantity += int(request.data.get('quantity', 1))
            ci.save(update_fields=['quantity'])
        return Response(CharacterItemSerializer(ci).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class CharacterItemDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            ci = CharacterItem.objects.select_related('character__campaign').get(pk=pk)
        except CharacterItem.DoesNotExist:
            return Response({'detail': 'Entrée introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = ci.character.player == request.user
        is_mj = ci.character.campaign and ci.character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = CharacterItemSerializer(ci, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            ci = CharacterItem.objects.select_related('character__campaign').get(pk=pk)
        except CharacterItem.DoesNotExist:
            return Response({'detail': 'Entrée introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = ci.character.player == request.user
        is_mj = ci.character.campaign and ci.character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        ci.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Notifications ───────────────────────────────────────────────────────────

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('is_read', '-created_at')

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if notification.recipient != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'detail': 'Notification marquée comme lue.'})

    @action(detail=False, methods=['post'], url_path='read-all')
    def read_all(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'Toutes les notifications marquées comme lues.'})


# ─── Economy ─────────────────────────────────────────────────────────────────

AVAILABILITY_RANGES: dict[str, tuple[float, float]] = {
    'Abondant': (0.8, 1.0),
    'Commun': (0.9, 1.1),
    'Moyen': (1.0, 1.3),
    'Rare': (1.2, 1.8),
    'Légendaire': (1.5, 3.0),
}


def compute_fluctuated_price(base_price: Decimal, availability: str) -> Decimal:
    low, high = AVAILABILITY_RANGES.get(availability, (0.9, 1.1))
    multiplier = random.uniform(low, high)
    return (base_price * Decimal(str(multiplier))).quantize(Decimal('0.01'))


def generate_market_prices(campaign: Campaign, session_number: int) -> list[MarketPrice]:
    exports = CityExport.objects.select_related('resource').all()
    prices = []
    for export in exports:
        price = compute_fluctuated_price(export.price, export.availability)
        prices.append(MarketPrice(
            city_export=export,
            campaign=campaign,
            session_number=session_number,
            current_price=price,
        ))
    return MarketPrice.objects.bulk_create(prices, ignore_conflicts=True)


class CityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = City.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CityDetailSerializer
        return CityListSerializer


class ResourceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        craft_type = self.request.query_params.get('craft_type')
        if craft_type:
            qs = qs.filter(craft_type=craft_type)
        availability = self.request.query_params.get('availability')
        if availability:
            qs = qs.filter(availability=availability)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class MarketView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        city_id = request.query_params.get('city')
        campaign_id = request.query_params.get('campaign')
        if not city_id or not campaign_id:
            return Response(
                {'detail': 'Paramètres city et campaign requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            campaign = Campaign.objects.get(pk=campaign_id)
        except Campaign.DoesNotExist:
            return Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        session = campaign.current_session_number

        # Generate prices for current session if they don't exist
        existing = MarketPrice.objects.filter(
            campaign=campaign, session_number=session,
            city_export__city_id=city_id,
        )
        if not existing.exists():
            generate_market_prices(campaign, session)

        prices = MarketPrice.objects.filter(
            campaign=campaign,
            session_number=session,
            city_export__city_id=city_id,
        ).select_related('city_export__resource')

        # Also fetch previous session for trend
        prev_prices_qs = MarketPrice.objects.filter(
            campaign=campaign,
            session_number=session - 1,
            city_export__city_id=city_id,
        ).select_related('city_export__resource')
        prev_map: dict[int, Decimal] = {
            mp.city_export_id: mp.current_price for mp in prev_prices_qs
        }

        serializer = MarketPriceSerializer(prices, many=True)
        data = serializer.data
        for item in data:
            ce_id = item['city_export_id']
            prev = prev_map.get(ce_id)
            if prev is not None:
                current = Decimal(str(item['current_price']))
                if current > prev:
                    item['trend'] = 'up'
                elif current < prev:
                    item['trend'] = 'down'
                else:
                    item['trend'] = 'stable'
            else:
                item['trend'] = 'stable'

        return Response(data)


# ─── Merchant ────────────────────────────────────────────────────────────────

class MerchantInventoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        inventory = MerchantInventory.objects.filter(
            character_id=character_id,
            character__player=request.user,
            quantity__gt=0,
        ).select_related('resource')
        serializer = MerchantInventorySerializer(inventory, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Sell a resource directly from merchant inventory."""
        ser = SellFromInventorySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        # Validate character ownership
        try:
            character = Character.objects.select_related('campaign').get(
                pk=d['character_id'], player=request.user,
            )
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        campaign = character.campaign
        if not campaign:
            return Response({'detail': 'Personnage sans campagne.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate resource
        try:
            resource = Resource.objects.get(pk=d['resource_id'])
        except Resource.DoesNotExist:
            return Response({'detail': 'Ressource introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # Validate sell city
        sell_city = City.objects.filter(pk=d['sell_city_id']).first()
        if not sell_city:
            return Response({'detail': 'Ville de vente introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # Check merchant inventory stock
        try:
            inv = MerchantInventory.objects.get(character=character, resource=resource)
        except MerchantInventory.DoesNotExist:
            return Response(
                {'detail': 'Vous ne possédez pas cette ressource.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if inv.quantity < d['quantity']:
            return Response(
                {'detail': f'Stock insuffisant ({inv.quantity} disponible(s)).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate sell price (CityImport or fallback base_price + fluctuation)
        city_import = CityImport.objects.filter(city=sell_city, resource=resource).first()
        if city_import:
            sell_price = city_import.price
        else:
            sell_price = resource.base_price

        sell_price = compute_fluctuated_price(sell_price, resource.availability)

        total_revenue = sell_price * d['quantity']
        total_cost = inv.average_buy_price * d['quantity']
        profit = total_revenue - total_cost

        # Decrement MerchantInventory
        inv.quantity -= d['quantity']
        if inv.quantity <= 0:
            inv.quantity = 0
        inv.save(update_fields=['quantity'])

        # Decrement CharacterItem
        try:
            item = Item.objects.get(campaign=campaign, resource=resource)
            ci = CharacterItem.objects.get(character=character, item=item)
            ci.quantity -= d['quantity']
            if ci.quantity <= 0:
                ci.delete()
            else:
                ci.save(update_fields=['quantity'])
        except (Item.DoesNotExist, CharacterItem.DoesNotExist):
            pass

        # Create a MerchantOrder with status='sold' for history
        order = MerchantOrder.objects.create(
            character=character,
            campaign=campaign,
            resource=resource,
            quantity=d['quantity'],
            buy_city=sell_city,  # no original buy city — use sell city
            buy_price_unit=inv.average_buy_price,
            sell_city=sell_city,
            sell_price_unit=sell_price,
            status='sold',
            transit_sessions=0,
            sessions_remaining=0,
            created_at_session=campaign.current_session_number,
            total_cost=total_cost,
            total_revenue=total_revenue,
            profit=profit,
        )

        # Notify GM + CampaignEvent
        profit_str = f'+{profit}' if profit >= 0 else str(profit)
        sell_msg = (
            f'{character.name} ({request.user.username}) a vendu '
            f'{d["quantity"]}× {resource.name} à {sell_city.name} '
            f'({profit_str} po de bénéfice).'
        )
        Notification.objects.create(
            recipient=campaign.game_master,
            title='Vente marchande (inventaire)',
            message=sell_msg,
            notification_type='info',
        )
        CampaignEvent.objects.create(
            campaign=campaign,
            event_type='order',
            actor=request.user,
            actor_name=request.user.username,
            message=sell_msg,
            link_hash=f'#/jdr/character/{character.id}',
        )

        serializer = MerchantOrderSerializer(order)
        return Response(serializer.data)


class MerchantOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        status_filter = request.query_params.get('status')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = MerchantOrder.objects.filter(
            character_id=character_id,
            character__player=request.user,
        ).select_related('resource', 'buy_city', 'sell_city', 'character')
        if status_filter:
            qs = qs.filter(status=status_filter)
        serializer = MerchantOrderSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        ser = CreateOrderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            character = Character.objects.get(pk=d['character_id'], player=request.user)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            campaign = Campaign.objects.get(pk=d['campaign_id'])
        except Campaign.DoesNotExist:
            return Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            resource = Resource.objects.get(pk=d['resource_id'])
        except Resource.DoesNotExist:
            return Response({'detail': 'Ressource introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        city = City.objects.filter(pk=d['buy_city_id']).first()
        if not city:
            return Response({'detail': 'Ville introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # Get current market price
        market_price = MarketPrice.objects.filter(
            city_export__city=city,
            city_export__resource=resource,
            campaign=campaign,
            session_number=campaign.current_session_number,
        ).first()

        if not market_price:
            # Try base export price
            export = CityExport.objects.filter(city=city, resource=resource).first()
            if not export:
                return Response(
                    {'detail': 'Cette ressource n\'est pas disponible dans cette ville.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            buy_price = export.price
        else:
            buy_price = market_price.current_price

        total_cost = buy_price * d['quantity']

        order = MerchantOrder.objects.create(
            character=character,
            campaign=campaign,
            resource=resource,
            quantity=d['quantity'],
            buy_city=city,
            buy_price_unit=buy_price,
            status='pending',
            transit_sessions=1,
            sessions_remaining=1,
            created_at_session=campaign.current_session_number,
            total_cost=total_cost,
        )

        # Notify GM + log campaign event
        order_msg = (
            f'{character.name} ({request.user.username}) a commandé '
            f'{d["quantity"]}× {resource.name} à {city.name} '
            f'pour {total_cost} po.'
        )
        Notification.objects.create(
            recipient=campaign.game_master,
            title='Nouvelle commande marchande',
            message=order_msg,
            notification_type='info',
        )
        CampaignEvent.objects.create(
            campaign=campaign,
            event_type='order',
            actor=request.user,
            actor_name=request.user.username,
            message=order_msg,
            link_hash=f'#/jdr/character/{character.id}',
        )

        serializer = MerchantOrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MerchantOrderSellView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            order = MerchantOrder.objects.select_related(
                'resource', 'buy_city', 'character', 'campaign',
            ).get(pk=pk, character__player=request.user)
        except MerchantOrder.DoesNotExist:
            return Response({'detail': 'Commande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'delivered':
            return Response(
                {'detail': 'Seules les commandes livrées peuvent être vendues.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ser = SellOrderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        sell_city = City.objects.filter(pk=ser.validated_data['sell_city_id']).first()
        if not sell_city:
            return Response({'detail': 'Ville de vente introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # Find import price for this resource in sell city
        city_import = CityImport.objects.filter(
            city=sell_city, resource=order.resource,
        ).first()

        if city_import:
            sell_price = city_import.price
        else:
            # Fallback: use base price with a small markup
            sell_price = order.resource.base_price

        # Apply availability fluctuation
        sell_price = compute_fluctuated_price(sell_price, order.resource.availability)

        total_revenue = sell_price * order.quantity
        profit = total_revenue - order.total_cost

        order.sell_city = sell_city
        order.sell_price_unit = sell_price
        order.total_revenue = total_revenue
        order.profit = profit
        order.status = 'sold'
        order.save(update_fields=[
            'sell_city', 'sell_price_unit', 'total_revenue', 'profit', 'status',
        ])

        # Decrement MerchantInventory
        try:
            mi = MerchantInventory.objects.get(
                character=order.character, resource=order.resource,
            )
            mi.quantity -= order.quantity
            if mi.quantity <= 0:
                mi.quantity = 0
            mi.save(update_fields=['quantity'])
        except MerchantInventory.DoesNotExist:
            pass

        # Decrement CharacterItem inventory
        try:
            item = Item.objects.get(campaign=order.campaign, resource=order.resource)
            ci = CharacterItem.objects.get(character=order.character, item=item)
            ci.quantity -= order.quantity
            if ci.quantity <= 0:
                ci.delete()
            else:
                ci.save(update_fields=['quantity'])
        except (Item.DoesNotExist, CharacterItem.DoesNotExist):
            pass  # Item may not exist if order was created before this feature

        profit_str = f'+{profit}' if profit >= 0 else str(profit)
        sell_msg = (
            f'{order.character.name} a vendu {order.quantity}× {order.resource.name} '
            f'à {sell_city.name} ({profit_str} po de bénéfice).'
        )
        Notification.objects.create(
            recipient=order.campaign.game_master,
            title='Vente marchande',
            message=sell_msg,
            notification_type='info',
        )
        CampaignEvent.objects.create(
            campaign=order.campaign,
            event_type='order',
            actor=request.user,
            actor_name=request.user.username,
            message=sell_msg,
            link_hash=f'#/jdr/character/{order.character.id}',
        )

        serializer = MerchantOrderSerializer(order)
        return Response(serializer.data)


class SellEstimateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        resource_id = request.query_params.get('resource_id')
        sell_city_id = request.query_params.get('sell_city_id')
        campaign_id = request.query_params.get('campaign_id')

        if not resource_id or not sell_city_id or not campaign_id:
            return Response(
                {'detail': 'Paramètres resource_id, sell_city_id et campaign_id requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign, _is_mj, err = _check_campaign_access(request, campaign_id)
        if err:
            return err

        try:
            resource = Resource.objects.get(pk=resource_id)
        except Resource.DoesNotExist:
            return Response({'detail': 'Ressource introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            sell_city = City.objects.get(pk=sell_city_id)
        except City.DoesNotExist:
            return Response({'detail': 'Ville introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        city_import = CityImport.objects.filter(
            city=sell_city, resource=resource,
        ).first()

        if city_import:
            sell_price = city_import.price
        else:
            sell_price = resource.base_price

        sell_price = compute_fluctuated_price(sell_price, resource.availability)

        return Response({
            'sell_price_unit': str(sell_price),
            'resource_name': resource.name,
            'city_name': sell_city.name,
        })


class MerchantStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sold_orders = MerchantOrder.objects.filter(
            character_id=character_id,
            character__player=request.user,
            status='sold',
        )

        totals = sold_orders.aggregate(
            total_profit=Sum('profit'),
            total_revenue=Sum('total_revenue'),
            total_cost=Sum('total_cost'),
        )

        trade_count = sold_orders.count()

        # Profit by session
        profit_by_session = list(
            sold_orders.values('created_at_session')
            .annotate(session_profit=Sum('profit'))
            .order_by('created_at_session')
        )

        # Best routes
        best_routes = list(
            sold_orders.values(
                'buy_city__name', 'sell_city__name', 'resource__name',
            )
            .annotate(route_profit=Sum('profit'))
            .order_by('-route_profit')[:5]
        )

        return Response({
            'total_profit': totals['total_profit'] or 0,
            'total_revenue': totals['total_revenue'] or 0,
            'total_cost': totals['total_cost'] or 0,
            'trade_count': trade_count,
            'profit_by_session': profit_by_session,
            'best_routes': best_routes,
        })


# ─── Garden / Alchemy ──────────────────────────────────────────────────────

def _ensure_garden(character: Character) -> GardenUpgrade:
    """Ensure a character has a GardenUpgrade and initial plots."""
    upgrade, created = GardenUpgrade.objects.get_or_create(character=character)
    existing_count = GardenPlot.objects.filter(character=character).count()
    if existing_count < upgrade.max_plots:
        plots_to_create = [
            GardenPlot(character=character, plot_number=i)
            for i in range(existing_count + 1, upgrade.max_plots + 1)
        ]
        GardenPlot.objects.bulk_create(plots_to_create)
    return upgrade


def advance_garden_session(campaign: Campaign) -> list[Notification]:
    """Advance all garden plots in the campaign by one inter-session."""
    notifications: list[Notification] = []

    plots = GardenPlot.objects.filter(
        character__campaign=campaign,
        status__in=['growing', 'ready'],
    ).select_related('plant', 'character')

    for plot in plots:
        if plot.status == 'growing' and plot.plant:
            plot.sessions_grown += 1
            if plot.sessions_grown >= plot.plant.growth_time:
                plot.status = 'ready'
                plot.is_ready = True
                notifications.append(Notification(
                    recipient=plot.character.player,
                    title='Plante prête à récolter !',
                    message=f'{plot.plant.icon} {plot.plant.name} est prête dans la parcelle {plot.plot_number}.',
                    notification_type='info',
                ))
            plot.save(update_fields=['sessions_grown', 'status', 'is_ready'])

        elif plot.status == 'ready' and plot.plant:
            plot.sessions_grown += 1
            if plot.sessions_grown >= plot.plant.growth_time + 3:
                plot.status = 'withered'
                plot.is_ready = False
                notifications.append(Notification(
                    recipient=plot.character.player,
                    title='Plante flétrie !',
                    message=f'{plot.plant.icon} {plot.plant.name} a flétri dans la parcelle {plot.plot_number}. Nettoyez-la.',
                    notification_type='alert',
                ))
                plot.save(update_fields=['sessions_grown', 'status', 'is_ready'])

    return notifications


class AlchemyPlantViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AlchemyPlant.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AlchemyPlantSerializer
        return AlchemyPlantListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        rarity = self.request.query_params.get('rarity')
        if rarity:
            qs = qs.filter(rarity=rarity)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class GardenPlotsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            character = Character.objects.get(pk=character_id, player=request.user)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        upgrade = _ensure_garden(character)
        plots = GardenPlot.objects.filter(character=character).select_related('plant')
        serializer = GardenPlotSerializer(plots, many=True)

        return Response({
            'plots': serializer.data,
            'max_plots': upgrade.max_plots,
            'fertilizer_bonus': upgrade.fertilizer_bonus,
            'special_soils': upgrade.special_soils,
        })


class GardenPlotPlantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ser = PlantActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            plot = GardenPlot.objects.select_related('character', 'character__campaign').get(
                pk=pk, character__player=request.user,
            )
        except GardenPlot.DoesNotExist:
            return Response({'detail': 'Parcelle introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if plot.status != 'empty':
            return Response(
                {'detail': 'Cette parcelle n\'est pas vide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            plant = AlchemyPlant.objects.get(pk=ser.validated_data['plant_id'])
        except AlchemyPlant.DoesNotExist:
            return Response({'detail': 'Plante introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        campaign = plot.character.campaign
        plot.plant = plant
        plot.planted_at_session = campaign.current_session_number
        plot.sessions_grown = 0
        plot.is_ready = False
        plot.status = 'growing'
        plot.save(update_fields=['plant', 'planted_at_session', 'sessions_grown', 'is_ready', 'status'])

        serializer = GardenPlotSerializer(plot)
        return Response(serializer.data)


class GardenPlotHarvestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            plot = GardenPlot.objects.select_related('plant', 'character', 'character__campaign').get(
                pk=pk, character__player=request.user,
            )
        except GardenPlot.DoesNotExist:
            return Response({'detail': 'Parcelle introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if plot.status != 'ready' or not plot.plant:
            return Response(
                {'detail': 'Cette parcelle n\'est pas prête à être récoltée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plant = plot.plant
        campaign = plot.character.campaign

        HarvestLog.objects.create(
            character=plot.character,
            plant=plant,
            quantity=plant.yield_amount,
            harvested_at_session=campaign.current_session_number,
        )

        # Clear the plot
        plot.plant = None
        plot.planted_at_session = None
        plot.sessions_grown = 0
        plot.is_ready = False
        plot.status = 'empty'
        plot.save(update_fields=['plant', 'planted_at_session', 'sessions_grown', 'is_ready', 'status'])

        if campaign:
            CampaignEvent.objects.create(
                campaign=campaign,
                event_type='harvest',
                actor=request.user,
                actor_name=request.user.username,
                message=f'{plot.character.name} a récolté {plant.yield_amount}× {plant.name}.',
                link_hash=f'#/jdr/character/{plot.character.id}',
            )

        return Response({
            'detail': f'{plant.yield_amount}× {plant.name} récoltée(s) !',
            'plant_name': plant.name,
            'quantity': plant.yield_amount,
        })


class GardenPlotClearView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            plot = GardenPlot.objects.get(pk=pk, character__player=request.user)
        except GardenPlot.DoesNotExist:
            return Response({'detail': 'Parcelle introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if plot.status != 'withered':
            return Response(
                {'detail': 'Seules les parcelles flétries peuvent être nettoyées.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plot.plant = None
        plot.planted_at_session = None
        plot.sessions_grown = 0
        plot.is_ready = False
        plot.status = 'empty'
        plot.save(update_fields=['plant', 'planted_at_session', 'sessions_grown', 'is_ready', 'status'])

        return Response({'detail': 'Parcelle nettoyée.'})


class GardenInventoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        harvests = HarvestLog.objects.filter(
            character_id=character_id,
            character__player=request.user,
            sold=False,
        ).select_related('plant')

        # Aggregate by plant
        inventory: dict[int, dict] = {}
        for h in harvests:
            if h.plant_id not in inventory:
                inventory[h.plant_id] = {
                    'plant_id': h.plant_id,
                    'plant_name': h.plant.name,
                    'plant_icon': h.plant.icon,
                    'plant_rarity': h.plant.rarity,
                    'sell_price': float(h.plant.sell_price),
                    'quantity': 0,
                }
            inventory[h.plant_id]['quantity'] += h.quantity

        return Response(list(inventory.values()))


class GardenSellView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = SellHarvestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        character_id = request.data.get('character_id')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character_id requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            character = Character.objects.get(pk=character_id, player=request.user)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            plant = AlchemyPlant.objects.get(pk=d['plant_id'])
        except AlchemyPlant.DoesNotExist:
            return Response({'detail': 'Plante introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # Find unsold harvest logs for this plant
        unsold = HarvestLog.objects.filter(
            character=character, plant=plant, sold=False,
        ).order_by('harvested_at_session')

        available = sum(h.quantity for h in unsold)
        if available < d['quantity']:
            return Response(
                {'detail': f'Stock insuffisant. Disponible : {available}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark as sold, consuming oldest first
        remaining = d['quantity']
        total_price = Decimal('0')
        for h in unsold:
            if remaining <= 0:
                break
            if h.quantity <= remaining:
                remaining -= h.quantity
                total_price += plant.sell_price * h.quantity
                h.sold = True
                h.sell_price_total = plant.sell_price * h.quantity
                h.save(update_fields=['sold', 'sell_price_total'])
            else:
                # Split: mark partial as sold by creating a new sold log
                sold_qty = remaining
                h.quantity -= sold_qty
                h.save(update_fields=['quantity'])
                HarvestLog.objects.create(
                    character=character,
                    plant=plant,
                    quantity=sold_qty,
                    harvested_at_session=h.harvested_at_session,
                    sold=True,
                    sell_price_total=plant.sell_price * sold_qty,
                )
                total_price += plant.sell_price * sold_qty
                remaining = 0

        return Response({
            'detail': f'{d["quantity"]}× {plant.name} vendu(es) pour {total_price} po.',
            'total_price': float(total_price),
        })


class GardenStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        all_logs = HarvestLog.objects.filter(
            character_id=character_id,
            character__player=request.user,
        ).select_related('plant')

        total_harvested = sum(h.quantity for h in all_logs)
        sold_logs = [h for h in all_logs if h.sold]
        total_sold = sum(h.quantity for h in sold_logs)
        total_revenue = sum(float(h.sell_price_total or 0) for h in sold_logs)

        # Most harvested plants
        plant_counts: dict[str, int] = {}
        for h in all_logs:
            name = f'{h.plant.icon} {h.plant.name}'
            plant_counts[name] = plant_counts.get(name, 0) + h.quantity
        top_plants = sorted(plant_counts.items(), key=lambda x: -x[1])[:5]

        # Revenue by session
        session_rev: dict[int, float] = {}
        for h in sold_logs:
            session_rev[h.harvested_at_session] = session_rev.get(h.harvested_at_session, 0) + float(h.sell_price_total or 0)
        revenue_by_session = [
            {'session': s, 'revenue': r}
            for s, r in sorted(session_rev.items())
        ]

        return Response({
            'total_harvested': total_harvested,
            'total_sold': total_sold,
            'total_revenue': total_revenue,
            'top_plants': [{'name': n, 'count': c} for n, c in top_plants],
            'revenue_by_session': revenue_by_session,
        })


class GardenHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logs = HarvestLog.objects.filter(
            character_id=character_id,
            character__player=request.user,
        ).select_related('plant').order_by('-harvested_at_session')[:50]

        serializer = HarvestLogSerializer(logs, many=True)
        return Response(serializer.data)


# ─── Enchanteur / Runes ──────────────────────────────────────────────────────

class RuneTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RuneTemplate.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RuneTemplateSerializer
        return RuneTemplateListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            qs = qs.filter(difficulty=difficulty)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class RuneDrawingListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        drawings = RuneDrawing.objects.filter(
            character_id=character_id,
            character__player=request.user,
        ).select_related('template', 'character__player')
        serializer = RuneDrawingSerializer(drawings, many=True)
        return Response(serializer.data)

    def post(self, request):
        ser = CreateRuneDrawingSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            character = Character.objects.get(pk=d['character_id'], player=request.user)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            campaign = Campaign.objects.get(pk=d['campaign_id'])
        except Campaign.DoesNotExist:
            return Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        template = None
        if d.get('template_id'):
            try:
                template = RuneTemplate.objects.get(pk=d['template_id'])
            except RuneTemplate.DoesNotExist:
                return Response({'detail': 'Modèle de rune introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        drawing = RuneDrawing.objects.create(
            character=character,
            campaign=campaign,
            template=template,
            title=d['title'],
            image_data=d['image_data'],
            notes=d.get('notes', ''),
            status='draft',
        )

        serializer = RuneDrawingSerializer(drawing)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RuneDrawingDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        try:
            drawing = RuneDrawing.objects.get(pk=pk, character__player=request.user)
        except RuneDrawing.DoesNotExist:
            return Response({'detail': 'Dessin introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if drawing.status not in ('draft', 'rejected'):
            return Response(
                {'detail': 'Seuls les brouillons ou dessins rejetés peuvent être modifiés.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        drawing.title = request.data.get('title', drawing.title)
        drawing.notes = request.data.get('notes', drawing.notes)
        if 'image_data' in request.data:
            drawing.image_data = request.data['image_data']
        if drawing.status == 'rejected':
            drawing.status = 'draft'
            drawing.mj_feedback = ''
        drawing.save()

        serializer = RuneDrawingSerializer(drawing)
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            drawing = RuneDrawing.objects.get(pk=pk, character__player=request.user)
        except RuneDrawing.DoesNotExist:
            return Response({'detail': 'Dessin introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if drawing.status not in ('draft', 'rejected'):
            return Response(
                {'detail': 'Seuls les brouillons ou dessins rejetés peuvent être supprimés.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        drawing.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RuneDrawingSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            drawing = RuneDrawing.objects.select_related('character', 'campaign').get(
                pk=pk, character__player=request.user,
            )
        except RuneDrawing.DoesNotExist:
            return Response({'detail': 'Dessin introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if drawing.status not in ('draft', 'rejected'):
            return Response(
                {'detail': 'Ce dessin ne peut pas être soumis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        drawing.status = 'submitted'
        drawing.submitted_at = timezone.now()
        drawing.mj_feedback = ''
        drawing.save(update_fields=['status', 'submitted_at', 'mj_feedback'])

        # Notify the campaign MJ
        Notification.objects.create(
            recipient=drawing.campaign.game_master,
            title='Nouvelle rune soumise',
            message=f'{drawing.character.name} a soumis la rune "{drawing.title}" pour validation.',
            notification_type='info',
        )

        CampaignEvent.objects.create(
            campaign=drawing.campaign,
            event_type='rune_submit',
            actor=request.user,
            actor_name=request.user.username,
            message=f'{drawing.character.name} a soumis la rune « {drawing.title} ».',
            link_hash=f'#/jdr/character/{drawing.character.id}',
        )

        serializer = RuneDrawingSerializer(drawing)
        return Response(serializer.data)


class RunePendingView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsMJ]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        qs = RuneDrawing.objects.filter(
            status='submitted',
        ).select_related('template', 'character__player', 'campaign')

        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id, campaign__game_master=request.user)
        else:
            qs = qs.filter(campaign__game_master=request.user)

        serializer = RuneDrawingSerializer(qs, many=True)
        return Response(serializer.data)


class RuneDrawingReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsMJ]

    def post(self, request, pk):
        try:
            drawing = RuneDrawing.objects.select_related(
                'character', 'campaign', 'template',
            ).get(pk=pk, campaign__game_master=request.user)
        except RuneDrawing.DoesNotExist:
            return Response({'detail': 'Dessin introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if drawing.status != 'submitted':
            return Response(
                {'detail': 'Ce dessin n\'est pas en attente de validation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ser = ReviewRuneDrawingSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        drawing.status = d['status']
        drawing.mj_feedback = d.get('feedback', '')
        drawing.reviewed_at = timezone.now()
        drawing.save(update_fields=['status', 'mj_feedback', 'reviewed_at'])

        # If approved, add to collection
        if d['status'] == 'approved':
            RuneCollection.objects.create(
                character=drawing.character,
                rune_drawing=drawing,
                acquired_at_session=drawing.campaign.current_session_number,
            )

        # Notify the player
        status_label = 'approuvée ✓' if d['status'] == 'approved' else 'rejetée ✗'
        feedback_text = f'\nCommentaire : {d["feedback"]}' if d.get('feedback') else ''
        Notification.objects.create(
            recipient=drawing.character.player,
            title=f'Rune {status_label}',
            message=f'Votre rune "{drawing.title}" a été {status_label} par le MJ.{feedback_text}',
            notification_type='info',
        )

        CampaignEvent.objects.create(
            campaign=drawing.campaign,
            event_type='rune_review',
            actor=request.user,
            actor_name=request.user.username,
            message=f'Rune « {drawing.title} » de {drawing.character.name} {status_label}.',
            link_hash=f'#/jdr/character/{drawing.character.id}',
        )

        serializer = RuneDrawingSerializer(drawing)
        return Response(serializer.data)


class RuneCollectionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        collection = RuneCollection.objects.filter(
            character_id=character_id,
            character__player=request.user,
        ).select_related('rune_drawing__template')
        serializer = RuneCollectionSerializer(collection, many=True)
        return Response(serializer.data)


# ─── Nextcloud / Files ──────────────────────────────────────────────────────

def _user_can_access_folder(user, folder: SharedFolder) -> bool:
    """Check if a user can access a shared folder."""
    # MJ always has access
    if folder.campaign.game_master == user:
        return True
    # Check access level
    if folder.access_level == 'mj_only':
        return False
    if folder.access_level == 'all_players':
        return folder.campaign.memberships.filter(player=user, is_active=True).exists()
    if folder.access_level == 'specific_players':
        return folder.access_entries.filter(player=user).exists()
    return False


def _user_can_upload_to_folder(user, folder: SharedFolder) -> bool:
    """Check if a user can upload to a shared folder."""
    if folder.campaign.game_master == user:
        return True
    access = folder.access_entries.filter(player=user).first()
    return access is not None and access.can_upload


def _nextcloud_webdav_url(path: str) -> str:
    """Build the full WebDAV URL for a Nextcloud path."""
    from django.conf import settings as django_settings
    base = django_settings.NEXTCLOUD_URL.rstrip('/')
    user = django_settings.NEXTCLOUD_ADMIN_USER
    return f'{base}/remote.php/dav/files/{user}/{path.lstrip("/")}'


def _nextcloud_auth():
    """Return (username, password) tuple for Nextcloud admin."""
    from django.conf import settings as django_settings
    return (django_settings.NEXTCLOUD_ADMIN_USER, django_settings.NEXTCLOUD_ADMIN_PASSWORD)


class SharedFolderListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        if not campaign_id:
            return Response(
                {'detail': 'Paramètre campaign requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            campaign = Campaign.objects.get(pk=campaign_id)
        except Campaign.DoesNotExist:
            return Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # Check membership
        is_mj = campaign.game_master == request.user
        is_member = campaign.memberships.filter(player=request.user, is_active=True).exists()
        if not is_mj and not is_member:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)

        folders = SharedFolder.objects.filter(campaign=campaign).prefetch_related('access_entries')

        # Filter by access
        accessible = []
        for f in folders:
            if _user_can_access_folder(request.user, f):
                accessible.append(f)

        serializer = SharedFolderSerializer(accessible, many=True)
        return Response(serializer.data)

    def post(self, request):
        ser = CreateSharedFolderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            campaign = Campaign.objects.get(pk=d['campaign_id'])
        except Campaign.DoesNotExist:
            return Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if campaign.game_master != request.user:
            return Response(
                {'detail': 'Seul le MJ peut créer des dossiers partagés.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Build Nextcloud path
        safe_campaign = campaign.name.replace(' ', '_').replace('/', '_')
        safe_name = d['name'].replace(' ', '_').replace('/', '_')
        nc_path = f'jdr/{safe_campaign}/{d["category"]}/{safe_name}'

        # Create folder on Nextcloud via WebDAV MKCOL
        import requests as http_requests
        auth = _nextcloud_auth()
        if auth[0] and auth[1]:
            try:
                webdav_url = _nextcloud_webdav_url(nc_path)
                # Create parent directories
                parts = nc_path.split('/')
                for i in range(1, len(parts) + 1):
                    partial = '/'.join(parts[:i])
                    http_requests.request(
                        'MKCOL',
                        _nextcloud_webdav_url(partial),
                        auth=auth,
                        timeout=10,
                    )
            except http_requests.RequestException:
                pass  # Nextcloud may not be available in dev

        folder = SharedFolder.objects.create(
            campaign=campaign,
            nextcloud_path=nc_path,
            name=d['name'],
            description=d.get('description', ''),
            category=d.get('category', 'other'),
            access_level=d.get('access_level', 'all_players'),
            created_by=request.user,
        )

        # Create access entries for specific players
        player_ids = d.get('player_ids', [])
        if player_ids and d.get('access_level') == 'specific_players':
            from django.contrib.auth.models import User
            players = User.objects.filter(pk__in=player_ids)
            access_entries = [
                SharedFolderAccess(folder=folder, player=p)
                for p in players
            ]
            SharedFolderAccess.objects.bulk_create(access_entries)

        serializer = SharedFolderSerializer(folder)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SharedFolderDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        try:
            folder = SharedFolder.objects.select_related('campaign').get(pk=pk)
        except SharedFolder.DoesNotExist:
            return Response({'detail': 'Dossier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if folder.campaign.game_master != request.user:
            return Response(
                {'detail': 'Seul le MJ peut modifier les dossiers partagés.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = UpdateSharedFolderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        if 'name' in d:
            folder.name = d['name']
        if 'description' in d:
            folder.description = d['description']
        if 'category' in d:
            folder.category = d['category']
        if 'access_level' in d:
            folder.access_level = d['access_level']
        folder.save()

        # Update access entries if player_ids provided
        if 'player_ids' in d:
            folder.access_entries.all().delete()
            if d['access_level'] == 'specific_players' or folder.access_level == 'specific_players':
                from django.contrib.auth.models import User
                players = User.objects.filter(pk__in=d['player_ids'])
                access_entries = [
                    SharedFolderAccess(folder=folder, player=p)
                    for p in players
                ]
                SharedFolderAccess.objects.bulk_create(access_entries)

        serializer = SharedFolderSerializer(folder)
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            folder = SharedFolder.objects.select_related('campaign').get(pk=pk)
        except SharedFolder.DoesNotExist:
            return Response({'detail': 'Dossier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if folder.campaign.game_master != request.user:
            return Response(
                {'detail': 'Seul le MJ peut supprimer les dossiers partagés.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        folder.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SharedFolderContentView(APIView):
    """Proxy vers Nextcloud WebDAV — liste le contenu d'un dossier."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            folder = SharedFolder.objects.select_related('campaign').get(pk=pk)
        except SharedFolder.DoesNotExist:
            return Response({'detail': 'Dossier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if not _user_can_access_folder(request.user, folder):
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)

        import requests as http_requests
        auth = _nextcloud_auth()
        if not auth[0] or not auth[1]:
            return Response(
                {'detail': 'Nextcloud non configuré.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        webdav_url = _nextcloud_webdav_url(folder.nextcloud_path)

        # PROPFIND to list directory contents
        propfind_body = '''<?xml version="1.0" encoding="UTF-8"?>
        <d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
          <d:prop>
            <d:displayname/>
            <d:getcontenttype/>
            <d:getcontentlength/>
            <d:getlastmodified/>
            <d:resourcetype/>
          </d:prop>
        </d:propfind>'''

        try:
            resp = http_requests.request(
                'PROPFIND',
                webdav_url,
                auth=auth,
                headers={'Content-Type': 'application/xml', 'Depth': '1'},
                data=propfind_body,
                timeout=15,
            )
        except http_requests.RequestException as e:
            return Response(
                {'detail': f'Erreur de connexion à Nextcloud: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if resp.status_code not in (200, 207):
            return Response(
                {'detail': f'Nextcloud a répondu avec le code {resp.status_code}.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Parse WebDAV XML response
        import xml.etree.ElementTree as ET
        try:
            root = ET.fromstring(resp.text)
        except ET.ParseError:
            return Response(
                {'detail': 'Réponse Nextcloud invalide.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        ns = {'d': 'DAV:'}
        files = []
        for response_el in root.findall('d:response', ns):
            href = response_el.findtext('d:href', '', ns)
            propstat = response_el.find('d:propstat', ns)
            if propstat is None:
                continue
            prop = propstat.find('d:prop', ns)
            if prop is None:
                continue

            display_name = prop.findtext('d:displayname', '', ns)
            content_type = prop.findtext('d:getcontenttype', '', ns)
            content_length = prop.findtext('d:getcontentlength', '0', ns)
            last_modified = prop.findtext('d:getlastmodified', '', ns)
            resource_type = prop.find('d:resourcetype', ns)
            is_dir = resource_type is not None and resource_type.find('d:collection', ns) is not None

            # Skip the folder itself (first entry)
            if href.rstrip('/').endswith(folder.nextcloud_path.rstrip('/')):
                continue

            files.append({
                'name': display_name or href.split('/')[-1] or href.split('/')[-2],
                'href': href,
                'content_type': content_type,
                'size': int(content_length) if content_length else 0,
                'last_modified': last_modified,
                'is_directory': is_dir,
            })

        return Response({
            'folder_id': folder.id,
            'folder_name': folder.name,
            'nextcloud_path': folder.nextcloud_path,
            'files': files,
            'can_upload': _user_can_upload_to_folder(request.user, folder),
        })


class SharedFolderUploadView(APIView):
    """Upload de fichier vers Nextcloud via WebDAV PUT."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            folder = SharedFolder.objects.select_related('campaign').get(pk=pk)
        except SharedFolder.DoesNotExist:
            return Response({'detail': 'Dossier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if not _user_can_upload_to_folder(request.user, folder):
            return Response(
                {'detail': 'Vous n\'avez pas la permission d\'uploader dans ce dossier.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {'detail': 'Aucun fichier fourni.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import requests as http_requests
        auth = _nextcloud_auth()
        if not auth[0] or not auth[1]:
            return Response(
                {'detail': 'Nextcloud non configuré.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        file_path = f'{folder.nextcloud_path}/{uploaded_file.name}'
        webdav_url = _nextcloud_webdav_url(file_path)

        try:
            resp = http_requests.put(
                webdav_url,
                auth=auth,
                data=uploaded_file.read(),
                headers={'Content-Type': uploaded_file.content_type or 'application/octet-stream'},
                timeout=60,
            )
        except http_requests.RequestException as e:
            return Response(
                {'detail': f'Erreur d\'upload vers Nextcloud: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if resp.status_code not in (200, 201, 204):
            return Response(
                {'detail': f'Nextcloud a répondu avec le code {resp.status_code}.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({
            'detail': f'Fichier "{uploaded_file.name}" uploadé avec succès.',
            'file_name': uploaded_file.name,
            'file_path': file_path,
        }, status=status.HTTP_201_CREATED)


class NextcloudEmbedUrlView(APIView):
    """Retourne l'URL Nextcloud à intégrer en iframe."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.conf import settings as django_settings
        nc_url = django_settings.NEXTCLOUD_URL.rstrip('/')

        folder_id = request.query_params.get('folder')
        if folder_id:
            try:
                folder = SharedFolder.objects.select_related('campaign').get(pk=folder_id)
            except SharedFolder.DoesNotExist:
                return Response({'detail': 'Dossier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

            if not _user_can_access_folder(request.user, folder):
                return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)

            embed_url = f'{nc_url}/apps/files/?dir=/{folder.nextcloud_path}'
        else:
            embed_url = f'{nc_url}/apps/files/'

        return Response({
            'embed_url': embed_url,
            'nextcloud_url': nc_url,
        })


# ─── Session (Avatar, Notes, Chat, Wallet) ─────────────────────────────────

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
        ).select_related('player').prefetch_related(
            'character_stats__stat',
        )
        serializer = CharacterWithStatsSerializer(characters, many=True)
        return Response(serializer.data)


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
