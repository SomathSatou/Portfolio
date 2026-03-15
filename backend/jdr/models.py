import uuid

from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('mj', 'Maître du Jeu'),
        ('joueur', 'Joueur'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='jdr_profile',
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='joueur')
    avatar = models.ImageField(upload_to='jdr/avatars/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Profil JDR'
        verbose_name_plural = 'Profils JDR'

    def __str__(self) -> str:
        return f'{self.user.username} ({self.get_role_display()})'


class Campaign(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    game_master = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mastered_campaigns',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    current_session_number = models.IntegerField(default=0)
    invite_code = models.CharField(max_length=36, unique=True, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Campagne'
        verbose_name_plural = 'Campagnes'

    def __str__(self) -> str:
        return self.name

    def generate_invite_code(self) -> str:
        self.invite_code = uuid.uuid4().hex[:8]
        self.save(update_fields=['invite_code'])
        return self.invite_code


class CampaignMembership(models.Model):
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='campaign_memberships',
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('campaign', 'player')
        verbose_name = 'Membre de campagne'
        verbose_name_plural = 'Membres de campagne'

    def __str__(self) -> str:
        return f'{self.player.username} → {self.campaign.name}'


class Character(models.Model):
    name = models.CharField(max_length=200)
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='characters',
    )
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='characters',
    )
    class_type = models.CharField(max_length=100, blank=True, default='')
    level = models.IntegerField(default=1)
    description = models.TextField(blank=True, default='')
    avatar = models.ImageField(upload_to='jdr/characters/', blank=True, null=True)
    stats = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Personnage'
        verbose_name_plural = 'Personnages'

    def __str__(self) -> str:
        return f'{self.name} ({self.player.username})'


class Notification(models.Model):
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('alert', 'Alerte'),
        ('intersession', 'Inter-session'),
        ('lore', 'Lore'),
        ('message', 'Message'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='jdr_notifications',
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    is_read = models.BooleanField(default=False)
    link = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'

    def __str__(self) -> str:
        return f'{self.title} → {self.recipient.username}'


# ─── Economy ─────────────────────────────────────────────────────────────────

class City(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['name']
        verbose_name = 'Ville'
        verbose_name_plural = 'Villes'

    def __str__(self) -> str:
        return self.name


class Resource(models.Model):
    CRAFT_TYPE_CHOICES = [
        ('Alchimie', 'Alchimie'),
        ('Couture', 'Couture'),
        ('Cuisine', 'Cuisine'),
        ('Forge', 'Forge'),
        ('Ingénierie', 'Ingénierie'),
        ('Joaillerie', 'Joaillerie'),
        ('Menuiserie', 'Menuiserie'),
        ('Tannerie', 'Tannerie'),
        ('Enchantement', 'Enchantement'),
    ]

    AVAILABILITY_CHOICES = [
        ('Abondant', 'Abondant'),
        ('Commun', 'Commun'),
        ('Moyen', 'Moyen'),
        ('Rare', 'Rare'),
        ('Légendaire', 'Légendaire'),
    ]

    name = models.CharField(max_length=200)
    craft_type = models.CharField(max_length=50, choices=CRAFT_TYPE_CHOICES)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=50)
    availability = models.CharField(max_length=20, choices=AVAILABILITY_CHOICES, default='Commun')

    class Meta:
        ordering = ['name']
        verbose_name = 'Ressource'
        verbose_name_plural = 'Ressources'

    def __str__(self) -> str:
        return f'{self.name} ({self.craft_type})'


class CityExport(models.Model):
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='exports')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='exports')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    availability = models.CharField(max_length=20, choices=Resource.AVAILABILITY_CHOICES, default='Commun')

    class Meta:
        unique_together = ('city', 'resource')
        verbose_name = 'Export de ville'
        verbose_name_plural = 'Exports de ville'

    def __str__(self) -> str:
        return f'{self.city.name} exporte {self.resource.name}'


class CityImport(models.Model):
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='imports')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='imports')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    origin_city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='exports_to')

    class Meta:
        unique_together = ('city', 'resource', 'origin_city')
        verbose_name = 'Import de ville'
        verbose_name_plural = 'Imports de ville'

    def __str__(self) -> str:
        return f'{self.city.name} importe {self.resource.name} depuis {self.origin_city.name}'


class MarketPrice(models.Model):
    city_export = models.ForeignKey(CityExport, on_delete=models.CASCADE, related_name='market_prices')
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='market_prices')
    session_number = models.IntegerField()
    current_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('city_export', 'campaign', 'session_number')
        ordering = ['-session_number']
        verbose_name = 'Prix du marché'
        verbose_name_plural = 'Prix du marché'

    def __str__(self) -> str:
        return f'{self.city_export} @ session {self.session_number}: {self.current_price} po'


# ─── Merchant ────────────────────────────────────────────────────────────────

class MerchantOrder(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('in_transit', 'En transit'),
        ('delivered', 'Livré'),
        ('sold', 'Vendu'),
        ('cancelled', 'Annulé'),
    ]

    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='merchant_orders')
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='merchant_orders')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='orders')
    quantity = models.IntegerField()
    buy_city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='orders_bought')
    buy_price_unit = models.DecimalField(max_digits=10, decimal_places=2)
    sell_city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='orders_sold', null=True, blank=True)
    sell_price_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    transit_sessions = models.IntegerField(default=1)
    sessions_remaining = models.IntegerField(default=1)
    created_at_session = models.IntegerField()
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Commande marchande'
        verbose_name_plural = 'Commandes marchandes'

    def __str__(self) -> str:
        return f'{self.character.name}: {self.quantity}× {self.resource.name} ({self.status})'


class MerchantInventory(models.Model):
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='merchant_inventory')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='inventories')
    quantity = models.IntegerField(default=0)
    average_buy_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ('character', 'resource')
        verbose_name = 'Inventaire marchand'
        verbose_name_plural = 'Inventaires marchands'

    def __str__(self) -> str:
        return f'{self.character.name}: {self.quantity}× {self.resource.name}'
