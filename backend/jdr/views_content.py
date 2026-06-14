"""Vues JDR — Contenu de campagne.

Gère les sorts, objets, stats, monstres, compétences actives/passives,
et les associations personnage-contenu.

Helpers partagés :
- `_check_campaign_mj` : vérifie que l'utilisateur est MJ de la campagne.
- `_check_campaign_access` : vérifie que l'utilisateur est MJ ou membre.
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Campaign, CampaignMembership, CampaignSettings, Character,
    CharacterItem, CharacterPassiveSkill, CharacterSkill, CharacterSpell,
    CharacterStat, Item, Monster, PassiveSkill, Skill, Spell, Stat,
)
from .serializers import (
    CampaignSettingsSerializer, CharacterItemSerializer,
    CharacterPassiveSkillSerializer, CharacterSkillSerializer,
    CharacterSpellSerializer, CharacterStatSerializer,
    ItemSerializer, MonsterSerializer, PassiveSkillSerializer,
    SkillSerializer, SpellSerializer, StatSerializer,
)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _check_campaign_mj(request, campaign_id):
    """Vérifie que request.user est le MJ de la campagne.

    Retourne (campaign, None) si OK, ou (None|campaign, error_response) sinon.
    """
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
    """Vérifie que request.user est MJ ou membre actif.

    Retourne (campaign, is_mj, None) si OK, ou (None, False, error_response) sinon.
    """
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
            {'detail': "Vous n'avez pas accès à cette campagne."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return campaign, is_mj, None


# ─── Sorts ───────────────────────────────────────────────────────────────────

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


# ─── Objets ──────────────────────────────────────────────────────────────────

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


# ─── Stats ───────────────────────────────────────────────────────────────────

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
        # Auto-créer CharacterStat pour tous les personnages de la campagne
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


# ─── Monstres ────────────────────────────────────────────────────────────────

class MonsterListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign, _is_mj, err = _check_campaign_access(request, campaign_id)
        if err:
            return err
        monsters = Monster.objects.filter(campaign=campaign)
        return Response(MonsterSerializer(monsters, many=True).data)

    def post(self, request):
        campaign_id = request.data.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign, err = _check_campaign_mj(request, campaign_id)
        if err:
            return err
        serializer = MonsterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(campaign=campaign)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MonsterDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            monster = Monster.objects.get(pk=pk)
        except Monster.DoesNotExist:
            return Response({'detail': 'Monstre introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if monster.campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut modifier.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = MonsterSerializer(monster, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            monster = Monster.objects.get(pk=pk)
        except Monster.DoesNotExist:
            return Response({'detail': 'Monstre introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if monster.campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut supprimer.'}, status=status.HTTP_403_FORBIDDEN)
        monster.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Paramètres de campagne ───────────────────────────────────────────────────

class CampaignSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        campaign, _is_mj, err = _check_campaign_access(request, pk)
        if err:
            return err
        settings, _ = CampaignSettings.objects.get_or_create(campaign=campaign)
        return Response(CampaignSettingsSerializer(settings).data)

    def patch(self, request, pk):
        campaign, err = _check_campaign_mj(request, pk)
        if err:
            return err
        settings, _ = CampaignSettings.objects.get_or_create(campaign=campaign)
        serializer = CampaignSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─── Stats personnage ─────────────────────────────────────────────────────────

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
        """Mise à jour en lot des stats d'un personnage.

        Body : { character: int, stats: [{stat: int, value: int}] }
        Vérifie que le total ne dépasse pas les points autorisés par le niveau.
        """
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

        settings = None
        if character.campaign:
            settings, _ = CampaignSettings.objects.get_or_create(campaign=character.campaign)

        stat_min = settings.stat_min if settings else 0
        stat_max = settings.stat_max if settings else 20
        base_points = settings.base_points if settings else 10
        points_per_level = settings.points_per_level if settings else 5
        total_allowed = base_points + (character.level - 1) * points_per_level

        current_stats = {
            cs.stat_id: cs.value
            for cs in CharacterStat.objects.filter(character=character)
        }
        proposed = dict(current_stats)
        for stat_entry in stats_data:
            stat_id = stat_entry.get('stat')
            value = int(stat_entry.get('value', 0))
            value = max(stat_min, min(stat_max, value))
            proposed[stat_id] = value

        proposed_total = sum(proposed.values())
        if proposed_total > total_allowed:
            return Response(
                {
                    'detail': (
                        f'Total de points ({proposed_total}) dépasse le maximum autorisé '
                        f'({total_allowed}) pour le niveau {character.level}.'
                    ),
                    'total_allowed': total_allowed,
                    'total_proposed': proposed_total,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        for stat_id, value in proposed.items():
            if stat_id in {e.get('stat') for e in stats_data}:
                CharacterStat.objects.update_or_create(
                    character=character, stat_id=stat_id,
                    defaults={'value': value},
                )
        stats = CharacterStat.objects.filter(character=character).select_related('stat')
        return Response(CharacterStatSerializer(stats, many=True).data)


# ─── Sorts / compétences du personnage ───────────────────────────────────────

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


class SkillListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        skills = Skill.objects.filter(campaign_id=campaign_id)
        return Response(SkillSerializer(skills, many=True).data)

    def post(self, request):
        campaign_id = request.data.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            campaign = Campaign.objects.get(pk=campaign_id)
        except Campaign.DoesNotExist:
            return Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut créer des compétences.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = SkillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(campaign=campaign)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SkillDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            skill = Skill.objects.get(pk=pk)
        except Skill.DoesNotExist:
            return Response({'detail': 'Compétence introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SkillSerializer(skill).data)

    def patch(self, request, pk):
        try:
            skill = Skill.objects.select_related('campaign').get(pk=pk)
        except Skill.DoesNotExist:
            return Response({'detail': 'Compétence introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if skill.campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut modifier les compétences.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = SkillSerializer(skill, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            skill = Skill.objects.select_related('campaign').get(pk=pk)
        except Skill.DoesNotExist:
            return Response({'detail': 'Compétence introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if skill.campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut supprimer les compétences.'}, status=status.HTTP_403_FORBIDDEN)
        skill.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PassiveSkillListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        passive_skills = PassiveSkill.objects.filter(campaign_id=campaign_id)
        return Response(PassiveSkillSerializer(passive_skills, many=True).data)

    def post(self, request):
        campaign_id = request.data.get('campaign')
        if not campaign_id:
            return Response({'detail': 'Paramètre campaign requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            campaign = Campaign.objects.get(pk=campaign_id)
        except Campaign.DoesNotExist:
            return Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut créer des compétences passives.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = PassiveSkillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(campaign=campaign)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PassiveSkillDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            ps = PassiveSkill.objects.get(pk=pk)
        except PassiveSkill.DoesNotExist:
            return Response({'detail': 'Compétence passive introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PassiveSkillSerializer(ps).data)

    def patch(self, request, pk):
        try:
            ps = PassiveSkill.objects.select_related('campaign').get(pk=pk)
        except PassiveSkill.DoesNotExist:
            return Response({'detail': 'Compétence passive introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if ps.campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut modifier les compétences passives.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = PassiveSkillSerializer(ps, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            ps = PassiveSkill.objects.select_related('campaign').get(pk=pk)
        except PassiveSkill.DoesNotExist:
            return Response({'detail': 'Compétence passive introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if ps.campaign.game_master != request.user:
            return Response({'detail': 'Seul le MJ peut supprimer les compétences passives.'}, status=status.HTTP_403_FORBIDDEN)
        ps.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CharacterSkillsView(APIView):
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
        skills = CharacterSkill.objects.filter(character=character).select_related('skill')
        return Response(CharacterSkillSerializer(skills, many=True).data)

    def post(self, request):
        character_id = request.data.get('character')
        skill_id = request.data.get('skill')
        if not character_id or not skill_id:
            return Response({'detail': 'Paramètres character et skill requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            character = Character.objects.select_related('campaign').get(pk=character_id)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = character.player == request.user
        is_mj = character.campaign and character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            skill = Skill.objects.get(pk=skill_id, campaign=character.campaign)
        except Skill.DoesNotExist:
            return Response({'detail': 'Compétence introuvable dans cette campagne.'}, status=status.HTTP_404_NOT_FOUND)
        cs, created = CharacterSkill.objects.get_or_create(
            character=character, skill=skill,
            defaults={'notes': request.data.get('notes', '')},
        )
        if not created:
            return Response({'detail': 'Cette compétence est déjà connue.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CharacterSkillSerializer(cs).data, status=status.HTTP_201_CREATED)


class CharacterSkillRemoveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            cs = CharacterSkill.objects.select_related('character__campaign').get(pk=pk)
        except CharacterSkill.DoesNotExist:
            return Response({'detail': 'Entrée introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = cs.character.player == request.user
        is_mj = cs.character.campaign and cs.character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        cs.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CharacterPassiveSkillsView(APIView):
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
        ps = CharacterPassiveSkill.objects.filter(character=character).select_related('passive_skill')
        return Response(CharacterPassiveSkillSerializer(ps, many=True).data)

    def post(self, request):
        character_id = request.data.get('character')
        passive_skill_id = request.data.get('passive_skill')
        if not character_id or not passive_skill_id:
            return Response({'detail': 'Paramètres character et passive_skill requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            character = Character.objects.select_related('campaign').get(pk=character_id)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = character.player == request.user
        is_mj = character.campaign and character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            passive_skill = PassiveSkill.objects.get(pk=passive_skill_id, campaign=character.campaign)
        except PassiveSkill.DoesNotExist:
            return Response({'detail': 'Compétence passive introuvable dans cette campagne.'}, status=status.HTTP_404_NOT_FOUND)
        cps, created = CharacterPassiveSkill.objects.get_or_create(
            character=character, passive_skill=passive_skill,
            defaults={'notes': request.data.get('notes', '')},
        )
        if not created:
            return Response({'detail': 'Cette compétence passive est déjà connue.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CharacterPassiveSkillSerializer(cps).data, status=status.HTTP_201_CREATED)


class CharacterPassiveSkillRemoveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            cps = CharacterPassiveSkill.objects.select_related('character__campaign').get(pk=pk)
        except CharacterPassiveSkill.DoesNotExist:
            return Response({'detail': 'Entrée introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = cps.character.player == request.user
        is_mj = cps.character.campaign and cps.character.campaign.game_master == request.user
        if not is_owner and not is_mj:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
        cps.delete()
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
        """Ajoute un objet à un personnage (MJ ou propriétaire)."""
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
        return Response(
            CharacterItemSerializer(ci).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


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
