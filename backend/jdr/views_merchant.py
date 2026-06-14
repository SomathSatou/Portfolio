"""Vues JDR — Marchand (inventaire, commandes, ventes, statistiques)."""
from decimal import Decimal

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Campaign, CampaignEvent, Character, CharacterItem, City,
    CityImport, Item, MerchantInventory, MerchantOrder, Notification, Resource,
)
from .serializers import (
    CreateOrderSerializer, MerchantInventorySerializer,
    MerchantOrderSerializer, SellFromInventorySerializer, SellOrderSerializer,
)
from .views_economy import compute_fluctuated_price
from .views_content import _check_campaign_access


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
        return Response(MerchantInventorySerializer(inventory, many=True).data)

    def post(self, request):
        """Vend une ressource directement depuis l'inventaire marchand."""
        ser = SellFromInventorySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            character = Character.objects.select_related('campaign').get(
                pk=d['character_id'], player=request.user,
            )
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        campaign = character.campaign
        if not campaign:
            return Response({'detail': 'Personnage sans campagne.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            resource = Resource.objects.get(pk=d['resource_id'])
        except Resource.DoesNotExist:
            return Response({'detail': 'Ressource introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        sell_city = City.objects.filter(pk=d['sell_city_id']).first()
        if not sell_city:
            return Response({'detail': 'Ville de vente introuvable.'}, status=status.HTTP_404_NOT_FOUND)

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

        city_import = CityImport.objects.filter(city=sell_city, resource=resource).first()
        sell_price = city_import.price if city_import else resource.base_price
        sell_price = compute_fluctuated_price(sell_price, resource.availability)

        total_revenue = sell_price * d['quantity']
        total_cost = inv.average_buy_price * d['quantity']
        profit = total_revenue - total_cost

        inv.quantity -= d['quantity']
        if inv.quantity <= 0:
            inv.quantity = 0
        inv.save(update_fields=['quantity'])

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

        order = MerchantOrder.objects.create(
            character=character,
            campaign=campaign,
            resource=resource,
            quantity=d['quantity'],
            buy_city=sell_city,
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
        return Response(MerchantOrderSerializer(order).data)


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
        return Response(MerchantOrderSerializer(qs, many=True).data)

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

        from .models import MarketPrice, CityExport
        market_price = MarketPrice.objects.filter(
            city_export__city=city,
            city_export__resource=resource,
            campaign=campaign,
            session_number=campaign.current_session_number,
        ).first()

        if not market_price:
            export = CityExport.objects.filter(city=city, resource=resource).first()
            if not export:
                return Response(
                    {'detail': "Cette ressource n'est pas disponible dans cette ville."},
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
        return Response(MerchantOrderSerializer(order).data, status=status.HTTP_201_CREATED)


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

        city_import = CityImport.objects.filter(city=sell_city, resource=order.resource).first()
        sell_price = city_import.price if city_import else order.resource.base_price
        sell_price = compute_fluctuated_price(sell_price, order.resource.availability)

        total_revenue = sell_price * order.quantity
        profit = total_revenue - order.total_cost

        order.sell_city = sell_city
        order.sell_price_unit = sell_price
        order.total_revenue = total_revenue
        order.profit = profit
        order.status = 'sold'
        order.save(update_fields=['sell_city', 'sell_price_unit', 'total_revenue', 'profit', 'status'])

        try:
            mi = MerchantInventory.objects.get(character=order.character, resource=order.resource)
            mi.quantity -= order.quantity
            if mi.quantity <= 0:
                mi.quantity = 0
            mi.save(update_fields=['quantity'])
        except MerchantInventory.DoesNotExist:
            pass

        try:
            item = Item.objects.get(campaign=order.campaign, resource=order.resource)
            ci = CharacterItem.objects.get(character=order.character, item=item)
            ci.quantity -= order.quantity
            if ci.quantity <= 0:
                ci.delete()
            else:
                ci.save(update_fields=['quantity'])
        except (Item.DoesNotExist, CharacterItem.DoesNotExist):
            pass

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
        return Response(MerchantOrderSerializer(order).data)


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

        city_import = CityImport.objects.filter(city=sell_city, resource=resource).first()
        sell_price = city_import.price if city_import else resource.base_price
        sell_price = compute_fluctuated_price(sell_price, resource.availability)

        return Response({
            'sell_price_unit': str(sell_price),
            'resource_name': resource.name,
            'city_name': sell_city.name,
        })


class MerchantStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum
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

        profit_by_session = list(
            sold_orders.values('created_at_session')
            .annotate(session_profit=Sum('profit'))
            .order_by('created_at_session')
        )

        best_routes = list(
            sold_orders.values('buy_city__name', 'sell_city__name', 'resource__name')
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
