import random
from decimal import Decimal

from django.db import models as db_models
from django.db.models import Q, Sum
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Campaign, CampaignMembership, Character, City, CityExport, CityImport,
    MarketPrice, MerchantInventory, MerchantOrder, Notification, Resource, UserProfile,
)
from .permissions import IsCampaignMember, IsMJ, IsOwner
from .serializers import (
    CampaignMembershipSerializer,
    CampaignSerializer,
    CharacterSerializer,
    CityDetailSerializer,
    CityListSerializer,
    CreateOrderSerializer,
    MarketPriceSerializer,
    MeSerializer,
    MerchantInventorySerializer,
    MerchantOrderSerializer,
    NotificationSerializer,
    RegisterSerializer,
    ResourceSerializer,
    SellOrderSerializer,
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

    @action(detail=True, methods=['post'], url_path='join')
    def join(self, request, pk=None):
        campaign = self.get_object()
        code = request.data.get('invite_code', '')
        if campaign.invite_code != code:
            return Response(
                {'detail': 'Code d\'invitation invalide.'},
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

        return Response({'detail': 'Vous avez rejoint la campagne.'})

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

        serializer = MerchantOrderSerializer(order)
        return Response(serializer.data)


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
