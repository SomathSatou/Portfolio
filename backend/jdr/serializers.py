from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    AlchemyPlant, Campaign, CampaignEvent, CampaignMembership, Character,
    CharacterItem, CharacterSpell, CharacterStat, ChatMessage,
    City, CityExport, CityImport,
    GardenPlot, GardenUpgrade, HarvestLog, Item, MarketPrice, MerchantInventory,
    MerchantOrder, Monster, Notification, PlantUsage, Resource, RuneCollection, RuneDrawing,
    RuneTemplate, SessionNote, SharedFolder, SharedFolderAccess, Spell, Stat, UserProfile,
)


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Cet email est déjà utilisé.')
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Les mots de passe ne correspondent pas.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        UserProfile.objects.create(user=user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'email', 'role', 'avatar', 'created_at']
        read_only_fields = ['id', 'created_at']


class MeSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='jdr_profile.role', read_only=True, default='joueur')
    avatar = serializers.ImageField(source='jdr_profile.avatar', read_only=True, default=None)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'avatar']
        read_only_fields = ['id', 'username', 'email']


class CampaignSerializer(serializers.ModelSerializer):
    game_master_name = serializers.CharField(source='game_master.username', read_only=True)
    member_count = serializers.SerializerMethodField()
    city_count = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            'id', 'name', 'description', 'game_master', 'game_master_name',
            'created_at', 'is_active', 'session_active', 'current_session_number',
            'invite_code', 'member_count', 'city_count',
        ]
        read_only_fields = ['id', 'game_master', 'created_at', 'current_session_number', 'session_active', 'invite_code']

    def get_member_count(self, obj) -> int:
        return obj.memberships.filter(is_active=True).count()

    def get_city_count(self, obj) -> int:
        return obj.cities.count()


class CampaignMembershipSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.username', read_only=True)

    class Meta:
        model = CampaignMembership
        fields = ['id', 'campaign', 'player', 'player_name', 'joined_at', 'is_active']
        read_only_fields = ['id', 'joined_at']


class CharacterSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.username', read_only=True)
    campaign_name = serializers.SerializerMethodField()

    class Meta:
        model = Character
        fields = [
            'id', 'name', 'player', 'player_name', 'campaign', 'campaign_name',
            'class_type', 'level', 'description', 'avatar', 'stats',
            'gold', 'silver', 'copper', 'created_at',
        ]
        read_only_fields = ['id', 'player', 'created_at']
        extra_kwargs = {'campaign': {'required': False, 'allow_null': True}}

    def get_campaign_name(self, obj: Character) -> str:
        return obj.campaign.name if obj.campaign else ''


class AvatarUploadSerializer(serializers.Serializer):
    avatar = serializers.ImageField()


class CampaignEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignEvent
        fields = [
            'id', 'campaign', 'event_type', 'actor', 'actor_name',
            'message', 'link_hash', 'created_at',
        ]
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'title', 'message', 'notification_type',
            'is_read', 'link', 'created_at',
        ]
        read_only_fields = ['id', 'recipient', 'created_at']


# ─── Campaign Content (Spells, Items, Stats) ─────────────────────────────────

class SpellSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spell
        fields = [
            'id', 'campaign', 'name', 'description', 'level', 'mana_cost',
            'damage', 'range_distance', 'casting_time', 'duration', 'school',
            'extra', 'created_at',
        ]
        read_only_fields = ['id', 'campaign', 'created_at']


class ItemSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source='resource.name', read_only=True, default='')

    class Meta:
        model = Item
        fields = [
            'id', 'campaign', 'resource', 'resource_name', 'name', 'description',
            'rarity', 'item_type', 'weight', 'value', 'properties', 'is_magical',
            'created_at',
        ]
        read_only_fields = ['id', 'campaign', 'resource', 'created_at']


class StatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stat
        fields = ['id', 'campaign', 'name', 'display_order']
        read_only_fields = ['id', 'campaign']


class CharacterStatSerializer(serializers.ModelSerializer):
    stat_name = serializers.CharField(source='stat.name', read_only=True)

    class Meta:
        model = CharacterStat
        fields = ['id', 'character', 'stat', 'stat_name', 'value']
        read_only_fields = ['id', 'character']


class CharacterWithStatsSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.username', read_only=True)
    campaign_name = serializers.SerializerMethodField()
    character_stats = CharacterStatSerializer(many=True, read_only=True)

    class Meta:
        model = Character
        fields = [
            'id', 'name', 'player', 'player_name', 'campaign', 'campaign_name',
            'class_type', 'level', 'description', 'avatar', 'stats',
            'gold', 'silver', 'copper', 'created_at', 'character_stats',
        ]
        read_only_fields = fields

    def get_campaign_name(self, obj: Character) -> str:
        return obj.campaign.name if obj.campaign else ''


class CharacterSpellSerializer(serializers.ModelSerializer):
    spell_name = serializers.CharField(source='spell.name', read_only=True)
    spell_level = serializers.IntegerField(source='spell.level', read_only=True)
    spell_description = serializers.CharField(source='spell.description', read_only=True)
    spell_school = serializers.CharField(source='spell.school', read_only=True)
    spell_mana_cost = serializers.IntegerField(source='spell.mana_cost', read_only=True)

    class Meta:
        model = CharacterSpell
        fields = [
            'id', 'character', 'spell', 'spell_name', 'spell_level',
            'spell_description', 'spell_school', 'spell_mana_cost',
            'notes', 'acquired_at',
        ]
        read_only_fields = ['id', 'character', 'acquired_at']


class CharacterItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_rarity = serializers.CharField(source='item.rarity', read_only=True)
    item_type = serializers.CharField(source='item.item_type', read_only=True)
    item_description = serializers.CharField(source='item.description', read_only=True)
    item_is_magical = serializers.BooleanField(source='item.is_magical', read_only=True)

    class Meta:
        model = CharacterItem
        fields = [
            'id', 'character', 'item', 'item_name', 'item_rarity', 'item_type',
            'item_description', 'item_is_magical',
            'quantity', 'is_equipped', 'notes', 'acquired_at',
        ]
        read_only_fields = ['id', 'character', 'acquired_at']


# ─── Bestiary ───────────────────────────────────────────────────────────────

class MonsterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Monster
        fields = [
            'id', 'campaign', 'name', 'description', 'hp', 'armor_class',
            'attack', 'damage', 'special_abilities', 'challenge_rating',
            'monster_type', 'image', 'stats', 'created_at',
        ]
        read_only_fields = ['id', 'campaign', 'created_at']


# ─── Economy ─────────────────────────────────────────────────────────────────

class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = ['id', 'name', 'craft_type', 'base_price', 'unit', 'availability']


class CityExportSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    craft_type = serializers.CharField(source='resource.craft_type', read_only=True)
    unit = serializers.CharField(source='resource.unit', read_only=True)
    resource_id = serializers.IntegerField(source='resource.id', read_only=True)

    class Meta:
        model = CityExport
        fields = [
            'id', 'resource_id', 'resource_name', 'craft_type', 'unit',
            'price', 'availability',
        ]


class CityImportSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    craft_type = serializers.CharField(source='resource.craft_type', read_only=True)
    unit = serializers.CharField(source='resource.unit', read_only=True)
    resource_id = serializers.IntegerField(source='resource.id', read_only=True)
    origin_city_name = serializers.CharField(source='origin_city.name', read_only=True)

    class Meta:
        model = CityImport
        fields = [
            'id', 'resource_id', 'resource_name', 'craft_type', 'unit',
            'price', 'origin_city_name',
        ]


class CityListSerializer(serializers.ModelSerializer):
    export_count = serializers.SerializerMethodField()
    import_count = serializers.SerializerMethodField()

    class Meta:
        model = City
        fields = ['id', 'name', 'description', 'export_count', 'import_count']

    def get_export_count(self, obj: City) -> int:
        return obj.exports.count()

    def get_import_count(self, obj: City) -> int:
        return obj.imports.count()


class CityDetailSerializer(serializers.ModelSerializer):
    exports = CityExportSerializer(many=True, read_only=True)
    imports = CityImportSerializer(many=True, read_only=True)

    class Meta:
        model = City
        fields = ['id', 'name', 'description', 'exports', 'imports']


class MarketPriceSerializer(serializers.ModelSerializer):
    resource_id = serializers.IntegerField(source='city_export.resource.id', read_only=True)
    resource_name = serializers.CharField(source='city_export.resource.name', read_only=True)
    craft_type = serializers.CharField(source='city_export.resource.craft_type', read_only=True)
    unit = serializers.CharField(source='city_export.resource.unit', read_only=True)
    availability = serializers.CharField(source='city_export.availability', read_only=True)
    base_price = serializers.DecimalField(
        source='city_export.price', max_digits=10, decimal_places=2, read_only=True,
    )
    city_export_id = serializers.IntegerField(source='city_export.id', read_only=True)

    class Meta:
        model = MarketPrice
        fields = [
            'id', 'city_export_id', 'resource_id', 'resource_name', 'craft_type',
            'unit', 'availability', 'base_price', 'current_price', 'session_number',
        ]


# ─── Merchant ────────────────────────────────────────────────────────────────

class MerchantOrderSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    resource_unit = serializers.CharField(source='resource.unit', read_only=True)
    buy_city_name = serializers.CharField(source='buy_city.name', read_only=True)
    sell_city_name = serializers.CharField(source='sell_city.name', read_only=True, default=None)
    character_name = serializers.CharField(source='character.name', read_only=True)

    class Meta:
        model = MerchantOrder
        fields = [
            'id', 'character', 'character_name', 'campaign', 'resource', 'resource_name',
            'resource_unit', 'quantity', 'buy_city', 'buy_city_name', 'buy_price_unit',
            'sell_city', 'sell_city_name', 'sell_price_unit', 'status',
            'transit_sessions', 'sessions_remaining', 'created_at_session',
            'total_cost', 'total_revenue', 'profit', 'created_at',
        ]
        read_only_fields = [
            'id', 'character', 'campaign', 'buy_price_unit', 'sell_price_unit',
            'status', 'transit_sessions', 'sessions_remaining', 'created_at_session',
            'total_cost', 'total_revenue', 'profit', 'created_at',
        ]


class CreateOrderSerializer(serializers.Serializer):
    resource_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    buy_city_id = serializers.IntegerField()
    character_id = serializers.IntegerField()
    campaign_id = serializers.IntegerField()


class SellOrderSerializer(serializers.Serializer):
    sell_city_id = serializers.IntegerField()


class SellFromInventorySerializer(serializers.Serializer):
    character_id = serializers.IntegerField()
    resource_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    sell_city_id = serializers.IntegerField()


class MerchantInventorySerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    resource_unit = serializers.CharField(source='resource.unit', read_only=True)
    craft_type = serializers.CharField(source='resource.craft_type', read_only=True)

    class Meta:
        model = MerchantInventory
        fields = [
            'id', 'character', 'resource', 'resource_name', 'resource_unit',
            'craft_type', 'quantity', 'average_buy_price',
        ]
        read_only_fields = ['id', 'character', 'resource']


# ─── Garden / Alchemy ──────────────────────────────────────────────────────

class PlantUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlantUsage
        fields = ['id', 'recipe_name', 'quantity_needed']


class AlchemyPlantSerializer(serializers.ModelSerializer):
    usages = PlantUsageSerializer(many=True, read_only=True)
    origin_city_name = serializers.CharField(source='origin_city.name', read_only=True, default=None)

    class Meta:
        model = AlchemyPlant
        fields = [
            'id', 'name', 'category', 'rarity', 'growth_time', 'yield_amount',
            'special_conditions', 'description', 'sell_price', 'origin_city',
            'origin_city_name', 'icon', 'usages',
        ]


class AlchemyPlantListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlchemyPlant
        fields = [
            'id', 'name', 'category', 'rarity', 'growth_time', 'yield_amount',
            'special_conditions', 'sell_price', 'icon',
        ]


class GardenPlotSerializer(serializers.ModelSerializer):
    plant_name = serializers.CharField(source='plant.name', read_only=True, default=None)
    plant_icon = serializers.CharField(source='plant.icon', read_only=True, default=None)
    plant_rarity = serializers.CharField(source='plant.rarity', read_only=True, default=None)
    plant_growth_time = serializers.IntegerField(source='plant.growth_time', read_only=True, default=None)
    plant_yield_amount = serializers.IntegerField(source='plant.yield_amount', read_only=True, default=None)

    class Meta:
        model = GardenPlot
        fields = [
            'id', 'character', 'plot_number', 'plant', 'plant_name', 'plant_icon',
            'plant_rarity', 'plant_growth_time', 'plant_yield_amount',
            'planted_at_session', 'sessions_grown', 'is_ready', 'status',
        ]
        read_only_fields = [
            'id', 'character', 'plot_number', 'planted_at_session',
            'sessions_grown', 'is_ready', 'status',
        ]


class GardenUpgradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = GardenUpgrade
        fields = ['id', 'character', 'max_plots', 'fertilizer_bonus', 'special_soils']
        read_only_fields = ['id', 'character']


class HarvestLogSerializer(serializers.ModelSerializer):
    plant_name = serializers.CharField(source='plant.name', read_only=True)
    plant_icon = serializers.CharField(source='plant.icon', read_only=True)

    class Meta:
        model = HarvestLog
        fields = [
            'id', 'character', 'plant', 'plant_name', 'plant_icon',
            'quantity', 'harvested_at_session', 'sold', 'sell_price_total',
        ]
        read_only_fields = ['id', 'character', 'plant', 'quantity', 'harvested_at_session']


class PlantActionSerializer(serializers.Serializer):
    plant_id = serializers.IntegerField()


class SellHarvestSerializer(serializers.Serializer):
    plant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


# ─── Enchanteur / Runes ──────────────────────────────────────────────────────

class RuneTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuneTemplate
        fields = [
            'id', 'name', 'description', 'difficulty', 'category',
            'reference_image', 'mana_cost', 'effect_description', 'required_materials',
        ]


class RuneTemplateListSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuneTemplate
        fields = [
            'id', 'name', 'difficulty', 'category', 'reference_image', 'mana_cost',
        ]


class RuneDrawingSerializer(serializers.ModelSerializer):
    character_name = serializers.CharField(source='character.name', read_only=True)
    player_name = serializers.CharField(source='character.player.username', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True, default=None)
    template_reference_image = serializers.ImageField(
        source='template.reference_image', read_only=True, default=None,
    )

    class Meta:
        model = RuneDrawing
        fields = [
            'id', 'character', 'character_name', 'player_name', 'template', 'template_name',
            'template_reference_image', 'image_data', 'title', 'notes', 'status',
            'mj_feedback', 'submitted_at', 'reviewed_at', 'created_at', 'campaign',
        ]
        read_only_fields = [
            'id', 'character', 'status', 'mj_feedback', 'submitted_at', 'reviewed_at', 'created_at',
        ]


class CreateRuneDrawingSerializer(serializers.Serializer):
    template_id = serializers.IntegerField(required=False, allow_null=True)
    title = serializers.CharField(max_length=200)
    image_data = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    character_id = serializers.IntegerField()
    campaign_id = serializers.IntegerField()


class ReviewRuneDrawingSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['approved', 'rejected'])
    feedback = serializers.CharField(required=False, allow_blank=True, default='')


class RuneCollectionSerializer(serializers.ModelSerializer):
    drawing_title = serializers.CharField(source='rune_drawing.title', read_only=True)
    drawing_image = serializers.CharField(source='rune_drawing.image_data', read_only=True)
    template_name = serializers.CharField(source='rune_drawing.template.name', read_only=True, default=None)
    template_effect = serializers.CharField(
        source='rune_drawing.template.effect_description', read_only=True, default=None,
    )
    template_category = serializers.CharField(
        source='rune_drawing.template.category', read_only=True, default=None,
    )

    class Meta:
        model = RuneCollection
        fields = [
            'id', 'character', 'rune_drawing', 'drawing_title', 'drawing_image',
            'template_name', 'template_effect', 'template_category',
            'acquired_at_session', 'uses_remaining',
        ]
        read_only_fields = ['id', 'character', 'rune_drawing', 'acquired_at_session']


# ─── Nextcloud / Files ──────────────────────────────────────────────────────

class SharedFolderAccessSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.username', read_only=True)

    class Meta:
        model = SharedFolderAccess
        fields = ['id', 'folder', 'player', 'player_name', 'can_edit', 'can_upload']
        read_only_fields = ['id']


class SharedFolderSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    access_entries = SharedFolderAccessSerializer(many=True, read_only=True)

    class Meta:
        model = SharedFolder
        fields = [
            'id', 'campaign', 'campaign_name', 'nextcloud_path', 'name', 'description',
            'category', 'access_level', 'created_by', 'created_by_name', 'created_at',
            'access_entries',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']


class CreateSharedFolderSerializer(serializers.Serializer):
    campaign_id = serializers.IntegerField()
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    category = serializers.ChoiceField(choices=SharedFolder.CATEGORY_CHOICES, default='other')
    access_level = serializers.ChoiceField(
        choices=SharedFolder.ACCESS_LEVEL_CHOICES, default='all_players',
    )
    player_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list,
    )


class UpdateSharedFolderSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    category = serializers.ChoiceField(choices=SharedFolder.CATEGORY_CHOICES, required=False)
    access_level = serializers.ChoiceField(choices=SharedFolder.ACCESS_LEVEL_CHOICES, required=False)
    player_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False,
    )


# ─── Session (Notes + Chat) ─────────────────────────────────────────────────

class SessionNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionNote
        fields = ['id', 'campaign', 'content', 'is_private', 'updated_at', 'created_at']
        read_only_fields = ['id', 'campaign', 'is_private', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'campaign', 'author', 'author_name', 'author_avatar', 'content',
            'is_dice_roll', 'dice_result', 'created_at',
        ]
        read_only_fields = [
            'id', 'campaign', 'author', 'is_dice_roll', 'dice_result', 'created_at',
        ]

    def _get_character(self, obj):
        """Cache character lookup per message to avoid duplicate queries."""
        if not hasattr(obj, '_cached_char'):
            obj._cached_char = Character.objects.filter(
                player=obj.author, campaign=obj.campaign,
            ).first()
        return obj._cached_char

    def get_author_name(self, obj) -> str:
        """Return character name for players, or 'username (MJ)' for the game master."""
        if obj.campaign.game_master_id == obj.author_id:
            return f'{obj.author.username} (MJ)'
        char = self._get_character(obj)
        if char:
            return char.name
        return obj.author.username

    def get_author_avatar(self, obj) -> str | None:
        """Return character avatar URL, or None."""
        if obj.campaign.game_master_id == obj.author_id:
            return None
        char = self._get_character(obj)
        if char and char.avatar:
            return char.avatar.url
        return None


class WalletUpdateSerializer(serializers.Serializer):
    character_id = serializers.IntegerField()
    gold = serializers.IntegerField(min_value=0, required=False)
    silver = serializers.IntegerField(min_value=0, required=False)
    copper = serializers.IntegerField(min_value=0, required=False)
