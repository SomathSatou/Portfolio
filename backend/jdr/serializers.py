from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Campaign, CampaignMembership, Character, Notification, UserProfile


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

    class Meta:
        model = Campaign
        fields = [
            'id', 'name', 'description', 'game_master', 'game_master_name',
            'created_at', 'is_active', 'current_session_number', 'invite_code',
            'member_count',
        ]
        read_only_fields = ['id', 'game_master', 'created_at', 'current_session_number', 'invite_code']

    def get_member_count(self, obj) -> int:
        return obj.memberships.filter(is_active=True).count()


class CampaignMembershipSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.username', read_only=True)

    class Meta:
        model = CampaignMembership
        fields = ['id', 'campaign', 'player', 'player_name', 'joined_at', 'is_active']
        read_only_fields = ['id', 'joined_at']


class CharacterSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.username', read_only=True)
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)

    class Meta:
        model = Character
        fields = [
            'id', 'name', 'player', 'player_name', 'campaign', 'campaign_name',
            'class_type', 'level', 'description', 'avatar', 'stats', 'created_at',
        ]
        read_only_fields = ['id', 'player', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'title', 'message', 'notification_type',
            'is_read', 'link', 'created_at',
        ]
        read_only_fields = ['id', 'recipient', 'created_at']


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
