"""Vues JDR — Jardin alchimique (cultivateur).

Fournit aussi le helper `advance_garden_session` utilisé par CampaignViewSet.
"""
from decimal import Decimal

from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AlchemyPlant, Campaign, CampaignEvent, Character,
    DiscoveredRecipe, GardenPlot, GardenUpgrade, HarvestLog, Notification,
    PlotMutationLog,
)
from .serializers import (
    AlchemyPlantListSerializer, AlchemyPlantSerializer,
    DiscoveredRecipeSerializer, FertilizePlotSerializer,
    GardenPlotSerializer, HarvestLogSerializer, PlantActionSerializer,
    PlotMutationLogSerializer, SellHarvestSerializer,
)
from .services.garden_mutations import harvest_plot


def _ensure_garden(character: Character) -> GardenUpgrade:
    """Garantit l'existence d'un GardenUpgrade et des parcelles initiales."""
    upgrade, _created = GardenUpgrade.objects.get_or_create(character=character)
    existing_count = GardenPlot.objects.filter(character=character).count()
    if existing_count < upgrade.max_plots:
        plots_to_create = [
            GardenPlot(character=character, plot_number=i)
            for i in range(existing_count + 1, upgrade.max_plots + 1)
        ]
        GardenPlot.objects.bulk_create(plots_to_create)
    return upgrade


def advance_garden_session(campaign: Campaign) -> list[Notification]:
    """Avance toutes les parcelles d'une campagne d'une inter-session."""
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
        return Response({
            'plots': GardenPlotSerializer(plots, many=True).data,
            'max_plots': upgrade.max_plots,
            'grid_columns': upgrade.grid_columns,
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
                {'detail': "Cette parcelle n'est pas vide."},
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
        return Response(GardenPlotSerializer(plot).data)


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
                {'detail': "Cette parcelle n'est pas prête à être récoltée."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign = plot.character.campaign
        session = campaign.current_session_number if campaign else 0

        try:
            result = harvest_plot(plot, session)
        except ValueError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)

        result_plant = result['result_plant']
        quantity = result['quantity']
        mutated = result['mutated']
        new_recipe = result['new_recipe']

        if campaign:
            CampaignEvent.objects.create(
                campaign=campaign,
                event_type='harvest',
                actor=request.user,
                actor_name=request.user.username,
                message=f'{plot.character.name} a récolté {quantity}× {result_plant.name}.',
                link_hash=f'#/jdr/character/{plot.character.id}',
            )

        return Response({
            'detail': f'{quantity}× {result_plant.name} récoltée(s) !',
            'plant_name': result_plant.name,
            'plant_icon': result_plant.icon,
            'quantity': quantity,
            'mutated': mutated,
            'new_recipe': new_recipe,
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


class GardenPlotFertilizeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ser = FertilizePlotSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            plot = GardenPlot.objects.select_related('character').get(
                pk=pk, character__player=request.user,
            )
        except GardenPlot.DoesNotExist:
            return Response({'detail': 'Parcelle introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if plot.status == 'empty':
            return Response(
                {'detail': "Vous ne pouvez pas fertiliser une parcelle vide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plot.fertilizer = ser.validated_data['fertilizer']
        plot.save(update_fields=['fertilizer'])
        return Response(GardenPlotSerializer(plot).data)


class GardenRecipesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        discovered = DiscoveredRecipe.objects.filter(
            character_id=character_id,
            character__player=request.user,
        ).select_related('recipe', 'recipe__result_plant')
        return Response(DiscoveredRecipeSerializer(discovered, many=True).data)


class GardenMutationLogsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logs = PlotMutationLog.objects.filter(
            plot__character_id=character_id,
            plot__character__player=request.user,
        ).select_related('harvested_plant', 'result_plant').order_by('-created_at')[:50]
        return Response(PlotMutationLogSerializer(logs, many=True).data)


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

        unsold = HarvestLog.objects.filter(
            character=character, plant=plant, sold=False,
        ).order_by('harvested_at_session')

        available = sum(h.quantity for h in unsold)
        if available < d['quantity']:
            return Response(
                {'detail': f'Stock insuffisant. Disponible : {available}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

        plant_counts: dict[str, int] = {}
        for h in all_logs:
            name = f'{h.plant.icon} {h.plant.name}'
            plant_counts[name] = plant_counts.get(name, 0) + h.quantity
        top_plants = sorted(plant_counts.items(), key=lambda x: -x[1])[:5]

        session_rev: dict[int, float] = {}
        for h in sold_logs:
            session_rev[h.harvested_at_session] = (
                session_rev.get(h.harvested_at_session, 0) + float(h.sell_price_total or 0)
            )
        revenue_by_session = [
            {'session': s, 'revenue': r} for s, r in sorted(session_rev.items())
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
        return Response(HarvestLogSerializer(logs, many=True).data)
