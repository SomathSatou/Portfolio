"""Vues JDR — Inventaire de campagne (Sac de Lug)."""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Campaign, CampaignInventoryEntry, Character, CharacterItem, CombatSession, Item
from .serializers import (
    CampaignInventoryEntrySerializer, InventoryTransferSerializer,
)
from .views_content import _check_campaign_access, _check_campaign_mj


def _broadcast_inventory(campaign_id: int, payload: dict) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    group_name = f'jdr_chat_{campaign_id}'
    async_to_sync(channel_layer.group_send)(group_name, payload)


class CampaignInventoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        campaign, _is_mj, err = _check_campaign_access(request, pk)
        if err:
            return err
        entries = CampaignInventoryEntry.objects.filter(campaign=campaign).select_related('item')
        return Response(CampaignInventoryEntrySerializer(entries, many=True).data)

    @transaction.atomic
    def post(self, request, pk):
        campaign, err = _check_campaign_mj(request, pk)
        if err:
            return err
        campaign = Campaign.objects.select_for_update().get(pk=campaign.pk)
        item_id = request.data.get('item_id')
        try:
            quantity = int(request.data.get('quantity', 1))
        except (TypeError, ValueError):
            return Response({'detail': 'Quantité invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity <= 0:
            return Response({'detail': 'La quantité doit être positive.'}, status=status.HTTP_400_BAD_REQUEST)
        notes = request.data.get('notes', '')
        try:
            item = Item.objects.get(pk=item_id, campaign=campaign)
        except Item.DoesNotExist:
            return Response({'detail': 'Objet introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        entry, _created = CampaignInventoryEntry.objects.select_for_update().get_or_create(
            campaign=campaign, item=item, defaults={'quantity': 0},
        )
        entry.quantity += quantity
        entry.notes = notes or entry.notes
        entry.save(update_fields=['quantity', 'notes'])
        data = CampaignInventoryEntrySerializer(entry).data
        transaction.on_commit(
            lambda: _broadcast_inventory(
                campaign.id,
                {'type': 'inventory.update', 'campaign_id': campaign.id},
            )
        )
        return Response(data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def delete(self, request, pk):
        campaign, err = _check_campaign_mj(request, pk)
        if err:
            return err
        entry_id = request.data.get('entry_id')
        try:
            entry = CampaignInventoryEntry.objects.get(pk=entry_id, campaign=campaign)
        except CampaignInventoryEntry.DoesNotExist:
            return Response({'detail': 'Entrée introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        entry.delete()
        transaction.on_commit(
            lambda: _broadcast_inventory(
                campaign.id,
                {'type': 'inventory.update', 'campaign_id': campaign.id},
            )
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class CampaignInventoryTransferView(APIView):
    """Transfer items between character inventories and the campaign sac de Lug."""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        campaign, is_mj, err = _check_campaign_access(request, pk)
        if err:
            return err
        campaign = Campaign.objects.select_for_update().get(pk=campaign.pk)

        ser = InventoryTransferSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        combat = CombatSession.objects.filter(campaign=campaign, is_active=True).first()
        if combat and not is_mj:
            return Response(
                {'detail': 'Transfert impossible pendant un combat actif.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            item = Item.objects.get(pk=d['item_id'], campaign=campaign)
        except Item.DoesNotExist:
            return Response({'detail': 'Objet introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        quantity = d['quantity']

        # ── Source ──────────────────────────────────────────────────────────
        if d['from_type'] == 'character':
            from_char_id = d.get('from_character_id')
            if not from_char_id:
                return Response({'detail': 'from_character_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                from_char = Character.objects.get(pk=from_char_id, campaign=campaign)
            except Character.DoesNotExist:
                return Response({'detail': 'Personnage source introuvable.'}, status=status.HTTP_404_NOT_FOUND)
            if not is_mj and from_char.player != request.user:
                return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
            try:
                char_item = CharacterItem.objects.select_for_update().get(character=from_char, item=item)
            except CharacterItem.DoesNotExist:
                return Response({'detail': 'L\'objet n\'est pas dans l\'inventaire du personnage.'}, status=status.HTTP_404_NOT_FOUND)
            if char_item.quantity < quantity:
                return Response({'detail': 'Quantité insuffisante.'}, status=status.HTTP_400_BAD_REQUEST)
            char_item.quantity -= quantity
            if char_item.quantity == 0:
                char_item.delete()
            else:
                char_item.save(update_fields=['quantity'])

        elif d['from_type'] == 'campaign':
            try:
                camp_entry = CampaignInventoryEntry.objects.select_for_update().get(campaign=campaign, item=item)
            except CampaignInventoryEntry.DoesNotExist:
                return Response({'detail': 'L\'objet n\'est pas dans le sac de Lug.'}, status=status.HTTP_404_NOT_FOUND)
            if camp_entry.quantity < quantity:
                return Response({'detail': 'Quantité insuffisante dans le sac.'}, status=status.HTTP_400_BAD_REQUEST)
            camp_entry.quantity -= quantity
            if camp_entry.quantity == 0:
                camp_entry.delete()
            else:
                camp_entry.save(update_fields=['quantity'])

        # ── Destination ──────────────────────────────────────────────────────
        if d['to_type'] == 'character':
            to_char_id = d.get('to_character_id')
            if not to_char_id:
                return Response({'detail': 'to_character_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                to_char = Character.objects.get(pk=to_char_id, campaign=campaign)
            except Character.DoesNotExist:
                return Response({'detail': 'Personnage destinataire introuvable.'}, status=status.HTTP_404_NOT_FOUND)
            char_item, _created = CharacterItem.objects.select_for_update().get_or_create(
                character=to_char, item=item, defaults={'quantity': 0},
            )
            char_item.quantity += quantity
            char_item.save(update_fields=['quantity'])

        elif d['to_type'] == 'campaign':
            camp_entry, _created = CampaignInventoryEntry.objects.select_for_update().get_or_create(
                campaign=campaign, item=item, defaults={'quantity': 0},
            )
            camp_entry.quantity += quantity
            camp_entry.save(update_fields=['quantity'])

        transaction.on_commit(
            lambda: _broadcast_inventory(
                campaign.id,
                {'type': 'inventory.update', 'campaign_id': campaign.id},
            )
        )
        return Response({'detail': 'Transfert effectué.'})
