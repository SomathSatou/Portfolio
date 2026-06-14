"""Vues JDR — Combat (CombatSession, CombatParticipant)."""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Campaign, Character, CombatParticipant, CombatSession, Monster
from .serializers import (
    AddParticipantSerializer, CombatSessionSerializer, UpdateParticipantHpSerializer,
)
from .views_content import _check_campaign_access, _check_campaign_mj


def _broadcast_combat(campaign_id: int, payload: dict) -> None:
    """Broadcast a combat event to all members of the campaign WS group."""
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    group_name = f'jdr_chat_{campaign_id}'
    async_to_sync(channel_layer.group_send)(group_name, payload)


def _get_agi_value(character: Character) -> int:
    """Return the Agilité stat value for a character, or 0 if not found."""
    for cs in character.character_stats.select_related('stat').all():
        if cs.stat.name.upper() in ('AGI', 'AGILITÉ', 'AGILITE', 'AGILITY'):
            return cs.value
    return 0


def _rebuild_order(combat: CombatSession) -> None:
    """Recalculate order_index for all participants sorted by initiative desc."""
    participants = list(combat.participants.all())
    participants.sort(key=lambda p: (-p.initiative, p.is_monster))
    for i, p in enumerate(participants):
        p.order_index = i
    CombatParticipant.objects.bulk_update(participants, ['order_index'])


class CombatStateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        campaign, _is_mj, err = _check_campaign_access(request, pk)
        if err:
            return err
        combat = CombatSession.objects.filter(campaign=campaign).prefetch_related(
            'participants__character__character_stats__stat',
        ).first()
        if not combat:
            return Response({'is_active': False, 'participants': []})
        return Response(CombatSessionSerializer(combat).data)


class CombatStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        campaign, err = _check_campaign_mj(request, pk)
        if err:
            return err

        combat, _created = CombatSession.objects.get_or_create(campaign=campaign)
        combat.is_active = True
        combat.current_turn_index = 0
        combat.round_number = 1
        combat.save(update_fields=['is_active', 'current_turn_index', 'round_number'])

        combat.participants.all().delete()

        characters = Character.objects.filter(
            campaign=campaign,
        ).prefetch_related('character_stats__stat')
        participants = []
        for char in characters:
            agi = _get_agi_value(char)
            p = CombatParticipant(
                combat=combat,
                character=char,
                initiative=agi,
                hp_current=char.hp,
                hp_max=char.max_hp if char.max_hp else char.hp,
                is_monster=False,
                order_index=0,
            )
            participants.append(p)
        CombatParticipant.objects.bulk_create(participants)
        _rebuild_order(combat)

        combat.refresh_from_db()
        data = CombatSessionSerializer(
            CombatSession.objects.prefetch_related(
                'participants__character__character_stats__stat',
            ).get(pk=combat.pk)
        ).data
        _broadcast_combat(campaign.id, {'type': 'combat.event', 'event': 'combat_start', 'combat': data})
        return Response(data, status=status.HTTP_201_CREATED)


class CombatEndView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        campaign, err = _check_campaign_mj(request, pk)
        if err:
            return err
        try:
            combat = CombatSession.objects.get(campaign=campaign)
        except CombatSession.DoesNotExist:
            return Response({'detail': 'Pas de combat actif.'}, status=status.HTTP_404_NOT_FOUND)
        combat.is_active = False
        combat.save(update_fields=['is_active'])
        data = CombatSessionSerializer(combat).data
        _broadcast_combat(campaign.id, {'type': 'combat.event', 'event': 'combat_end', 'combat': data})
        return Response(data)


class CombatNextTurnView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        campaign, err = _check_campaign_mj(request, pk)
        if err:
            return err
        try:
            combat = CombatSession.objects.prefetch_related('participants').get(campaign=campaign)
        except CombatSession.DoesNotExist:
            return Response({'detail': 'Pas de combat actif.'}, status=status.HTTP_404_NOT_FOUND)
        if not combat.is_active:
            return Response({'detail': 'Le combat est terminé.'}, status=status.HTTP_400_BAD_REQUEST)

        participant_count = combat.participants.count()
        if participant_count == 0:
            return Response({'detail': 'Aucun participant.'}, status=status.HTTP_400_BAD_REQUEST)

        next_index = combat.current_turn_index + 1
        if next_index >= participant_count:
            next_index = 0
            combat.round_number += 1
        combat.current_turn_index = next_index
        combat.save(update_fields=['current_turn_index', 'round_number'])

        data = CombatSessionSerializer(
            CombatSession.objects.prefetch_related(
                'participants__character__character_stats__stat',
            ).get(pk=combat.pk)
        ).data
        _broadcast_combat(campaign.id, {'type': 'combat.event', 'event': 'combat_next_turn', 'combat': data})
        return Response(data)


class CombatAddParticipantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        campaign, err = _check_campaign_mj(request, pk)
        if err:
            return err
        try:
            combat = CombatSession.objects.get(campaign=campaign)
        except CombatSession.DoesNotExist:
            return Response({'detail': 'Pas de combat actif.'}, status=status.HTTP_404_NOT_FOUND)

        ser = AddParticipantSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        character = None
        is_monster = True
        monster_name = d.get('monster_name', '')
        hp = d.get('hp', 10)
        initiative = d.get('initiative', 0)

        if d.get('character_id'):
            try:
                character = Character.objects.prefetch_related('character_stats__stat').get(
                    pk=d['character_id'], campaign=campaign,
                )
                is_monster = False
                monster_name = ''
                if not initiative:
                    initiative = _get_agi_value(character)
                if not hp:
                    hp = character.hp or 10
            except Character.DoesNotExist:
                return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        elif d.get('monster_id'):
            try:
                monster = Monster.objects.get(pk=d['monster_id'], campaign=campaign)
                is_monster = True
                monster_name = monster.name
                if not hp:
                    hp = monster.hp
                if not initiative:
                    initiative = monster.stats.get('initiative', 0) if monster.stats else 0
            except Monster.DoesNotExist:
                return Response({'detail': 'Monstre introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        elif not monster_name:
            return Response(
                {'detail': 'Fournir character_id, monster_id ou monster_name.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participant = CombatParticipant.objects.create(
            combat=combat,
            character=character,
            monster_name=monster_name,
            initiative=initiative,
            hp_current=hp,
            hp_max=hp,
            is_monster=is_monster,
            order_index=0,
        )
        _rebuild_order(combat)
        participant.refresh_from_db()

        data = CombatSessionSerializer(
            CombatSession.objects.prefetch_related(
                'participants__character__character_stats__stat',
            ).get(pk=combat.pk)
        ).data
        _broadcast_combat(campaign.id, {'type': 'combat.event', 'event': 'combat_participant_add', 'combat': data})
        return Response(data, status=status.HTTP_201_CREATED)


class CombatUpdateHpView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        campaign, err = _check_campaign_mj(request, pk)
        if err:
            return err
        try:
            combat = CombatSession.objects.get(campaign=campaign)
        except CombatSession.DoesNotExist:
            return Response({'detail': 'Pas de combat actif.'}, status=status.HTTP_404_NOT_FOUND)

        ser = UpdateParticipantHpSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            participant = CombatParticipant.objects.get(pk=d['participant_id'], combat=combat)
        except CombatParticipant.DoesNotExist:
            return Response({'detail': 'Participant introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        participant.hp_current = d['hp_current']
        participant.save(update_fields=['hp_current'])

        data = CombatSessionSerializer(
            CombatSession.objects.prefetch_related(
                'participants__character__character_stats__stat',
            ).get(pk=combat.pk)
        ).data
        _broadcast_combat(campaign.id, {'type': 'combat.event', 'event': 'combat_hp_update', 'combat': data})
        return Response(data)
