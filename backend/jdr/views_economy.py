"""Vues JDR — Économie (villes, ressources, marché).

Fournit aussi les helpers partagés :
- `AVAILABILITY_RANGES`
- `compute_fluctuated_price`
- `generate_market_prices`
"""
import random
from decimal import Decimal

from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Campaign, City, CityExport, CityImport, MarketPrice, Resource,
)
from .serializers import (
    CityDetailSerializer, CityListSerializer, MarketPriceSerializer,
    ResourceSerializer,
)


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
