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
    cities = models.ManyToManyField('City', blank=True, related_name='campaigns')

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
        on_delete=models.SET_NULL,
        related_name='characters',
        null=True,
        blank=True,
    )
    class_type = models.CharField(max_length=100, blank=True, default='')
    level = models.IntegerField(default=1)
    description = models.TextField(blank=True, default='')
    avatar = models.ImageField(upload_to='jdr/characters/', blank=True, null=True)
    stats = models.JSONField(default=dict, blank=True)
    gold = models.IntegerField(default=0)
    silver = models.IntegerField(default=0)
    copper = models.IntegerField(default=0)
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


class CampaignEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('order', 'Commande marchande'),
        ('join', 'Nouveau membre'),
        ('advance', 'Avancement de session'),
        ('rune_submit', 'Soumission de rune'),
        ('rune_review', 'Validation de rune'),
        ('harvest', 'Récolte'),
        ('character_create', 'Création de personnage'),
        ('item_give', 'Attribution d\'objet'),
        ('spell_learn', 'Apprentissage de sort'),
        ('other', 'Autre'),
    ]

    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name='events',
    )
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='campaign_events',
    )
    actor_name = models.CharField(max_length=200, blank=True, default='')
    message = models.TextField()
    link_hash = models.CharField(max_length=300, blank=True, default='', help_text='Hash route pour naviguer vers la page liée')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Événement de campagne'
        verbose_name_plural = 'Événements de campagne'

    def __str__(self) -> str:
        return f'[{self.event_type}] {self.message[:80]}'


# ─── Campaign Content (Spells, Items, Stats) ─────────────────────────────────

class Spell(models.Model):
    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name='spells',
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    level = models.IntegerField(default=1)
    mana_cost = models.IntegerField(default=0)
    damage = models.CharField(max_length=100, blank=True, default='')
    range_distance = models.CharField(max_length=100, blank=True, default='')
    casting_time = models.CharField(max_length=100, blank=True, default='')
    duration = models.CharField(max_length=100, blank=True, default='')
    school = models.CharField(max_length=100, blank=True, default='')
    extra = models.JSONField(default=dict, blank=True, help_text='Champs libres supplémentaires')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['level', 'name']
        unique_together = ('campaign', 'name')
        verbose_name = 'Sort'
        verbose_name_plural = 'Sorts'

    def __str__(self) -> str:
        return f'{self.name} (niv. {self.level}) — {self.campaign.name}'


class Item(models.Model):
    RARITY_CHOICES = [
        ('commun', 'Commun'),
        ('peu_commun', 'Peu commun'),
        ('rare', 'Rare'),
        ('très_rare', 'Très rare'),
        ('légendaire', 'Légendaire'),
        ('artéfact', 'Artéfact'),
    ]

    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name='items',
    )
    resource = models.ForeignKey(
        'Resource', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='items', help_text='Ressource d\'origine (si créé via le comptoir)',
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    rarity = models.CharField(max_length=20, choices=RARITY_CHOICES, default='commun')
    item_type = models.CharField(max_length=100, blank=True, default='', help_text='Arme, armure, potion, etc.')
    weight = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    value = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Valeur en pièces d\'or')
    properties = models.JSONField(default=dict, blank=True, help_text='Propriétés libres (ex: dégâts, bonus)')
    is_magical = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = ('campaign', 'name')
        verbose_name = 'Objet'
        verbose_name_plural = 'Objets'

    def __str__(self) -> str:
        return f'{self.name} ({self.get_rarity_display()}) — {self.campaign.name}'


class Stat(models.Model):
    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name='stats',
    )
    name = models.CharField(max_length=100)
    display_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'name']
        unique_together = ('campaign', 'name')
        verbose_name = 'Statistique'
        verbose_name_plural = 'Statistiques'

    def __str__(self) -> str:
        return f'{self.name} — {self.campaign.name}'


class CharacterStat(models.Model):
    character = models.ForeignKey(
        Character, on_delete=models.CASCADE, related_name='character_stats',
    )
    stat = models.ForeignKey(
        Stat, on_delete=models.CASCADE, related_name='character_values',
    )
    value = models.IntegerField(default=0)

    class Meta:
        unique_together = ('character', 'stat')
        ordering = ['stat__display_order', 'stat__name']
        verbose_name = 'Statistique de personnage'
        verbose_name_plural = 'Statistiques de personnage'

    def __str__(self) -> str:
        return f'{self.character.name} — {self.stat.name}: {self.value}'


class CharacterSpell(models.Model):
    character = models.ForeignKey(
        Character, on_delete=models.CASCADE, related_name='character_spells',
    )
    spell = models.ForeignKey(
        Spell, on_delete=models.CASCADE, related_name='character_entries',
    )
    notes = models.TextField(blank=True, default='')
    acquired_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('character', 'spell')
        verbose_name = 'Sort de personnage'
        verbose_name_plural = 'Sorts de personnage'

    def __str__(self) -> str:
        return f'{self.character.name} — {self.spell.name}'


class CharacterItem(models.Model):
    character = models.ForeignKey(
        Character, on_delete=models.CASCADE, related_name='character_items',
    )
    item = models.ForeignKey(
        Item, on_delete=models.CASCADE, related_name='character_entries',
    )
    quantity = models.IntegerField(default=1)
    is_equipped = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')
    acquired_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('character', 'item')
        verbose_name = 'Objet de personnage'
        verbose_name_plural = 'Objets de personnage'

    def __str__(self) -> str:
        return f'{self.character.name} — {self.item.name} (×{self.quantity})'


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


# ─── Garden / Alchemy ──────────────────────────────────────────────────────

class AlchemyPlant(models.Model):
    CATEGORY_CHOICES = [
        ('Herbes', 'Herbes'),
        ('Fleurs', 'Fleurs'),
        ('Racines', 'Racines'),
        ('Champignons', 'Champignons'),
        ('Algues', 'Algues'),
        ('Résines', 'Résines'),
        ('Mousses', 'Mousses'),
        ('Cristaux', 'Cristaux'),
    ]

    RARITY_CHOICES = [
        ('Commune', 'Commune'),
        ('Peu commune', 'Peu commune'),
        ('Rare', 'Rare'),
        ('Très rare', 'Très rare'),
        ('Légendaire', 'Légendaire'),
    ]

    name = models.CharField(max_length=200, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    rarity = models.CharField(max_length=20, choices=RARITY_CHOICES)
    growth_time = models.IntegerField(help_text='Nombre d\'inter-sessions pour pousser')
    yield_amount = models.IntegerField(default=1, help_text='Unités récoltées par plant')
    special_conditions = models.TextField(blank=True, default='')
    description = models.TextField(blank=True, default='')
    sell_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    origin_city = models.ForeignKey(
        City, on_delete=models.SET_NULL, null=True, blank=True, related_name='alchemy_plants',
    )
    icon = models.CharField(max_length=10, default='🌿')

    class Meta:
        ordering = ['name']
        verbose_name = 'Plante alchimique'
        verbose_name_plural = 'Plantes alchimiques'

    def __str__(self) -> str:
        return f'{self.icon} {self.name} ({self.get_rarity_display()})'


class PlantUsage(models.Model):
    plant = models.ForeignKey(AlchemyPlant, on_delete=models.CASCADE, related_name='usages')
    recipe_name = models.CharField(max_length=200)
    quantity_needed = models.IntegerField(default=1)

    class Meta:
        ordering = ['recipe_name']
        verbose_name = 'Utilisation de plante'
        verbose_name_plural = 'Utilisations de plantes'

    def __str__(self) -> str:
        return f'{self.plant.name} → {self.recipe_name} (×{self.quantity_needed})'


class GardenPlot(models.Model):
    STATUS_CHOICES = [
        ('empty', 'Vide'),
        ('growing', 'En culture'),
        ('ready', 'Prête'),
        ('withered', 'Flétrie'),
    ]

    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='garden_plots')
    plot_number = models.IntegerField()
    plant = models.ForeignKey(
        AlchemyPlant, on_delete=models.SET_NULL, null=True, blank=True, related_name='plots',
    )
    planted_at_session = models.IntegerField(null=True, blank=True)
    sessions_grown = models.IntegerField(default=0)
    is_ready = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='empty')

    class Meta:
        unique_together = ('character', 'plot_number')
        ordering = ['plot_number']
        verbose_name = 'Parcelle de jardin'
        verbose_name_plural = 'Parcelles de jardin'

    def __str__(self) -> str:
        plant_info = self.plant.name if self.plant else 'vide'
        return f'{self.character.name} - Parcelle {self.plot_number} ({plant_info})'


class GardenUpgrade(models.Model):
    character = models.OneToOneField(
        Character, on_delete=models.CASCADE, related_name='garden_upgrade',
    )
    max_plots = models.IntegerField(default=4)
    fertilizer_bonus = models.FloatField(default=0, help_text='Réduction du temps de culture en %')
    special_soils = models.JSONField(default=list, blank=True, help_text='Sols spéciaux débloqués')

    class Meta:
        verbose_name = 'Amélioration de jardin'
        verbose_name_plural = 'Améliorations de jardin'

    def __str__(self) -> str:
        return f'{self.character.name} - {self.max_plots} parcelles'


class HarvestLog(models.Model):
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='harvest_logs')
    plant = models.ForeignKey(AlchemyPlant, on_delete=models.CASCADE, related_name='harvest_logs')
    quantity = models.IntegerField()
    harvested_at_session = models.IntegerField()
    sold = models.BooleanField(default=False)
    sell_price_total = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ['-harvested_at_session']
        verbose_name = 'Récolte'
        verbose_name_plural = 'Récoltes'

    def __str__(self) -> str:
        return f'{self.character.name}: {self.quantity}× {self.plant.name} (session {self.harvested_at_session})'


# ─── Enchanteur / Runes ──────────────────────────────────────────────────────

class RuneTemplate(models.Model):
    DIFFICULTY_CHOICES = [
        ('apprenti', 'Apprenti'),
        ('adepte', 'Adepte'),
        ('maître', 'Maître'),
        ('archimage', 'Archimage'),
    ]

    CATEGORY_CHOICES = [
        ('protection', 'Protection'),
        ('attaque', 'Attaque'),
        ('soin', 'Soin'),
        ('utilité', 'Utilité'),
        ('invocation', 'Invocation'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(help_text='Effet magique de la rune')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    reference_image = models.ImageField(upload_to='jdr/runes/templates/', blank=True, null=True)
    mana_cost = models.IntegerField(default=0)
    effect_description = models.TextField(blank=True, default='')
    required_materials = models.JSONField(
        default=dict, blank=True,
        help_text='Matériaux nécessaires, ex: {"Encre magique": 1, "Parchemin rare": 1}',
    )

    class Meta:
        ordering = ['difficulty', 'name']
        verbose_name = 'Modèle de rune'
        verbose_name_plural = 'Modèles de runes'

    def __str__(self) -> str:
        return f'{self.name} ({self.get_difficulty_display()}) — {self.get_category_display()}'


class RuneDrawing(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('submitted', 'Soumis'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
    ]

    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='rune_drawings')
    template = models.ForeignKey(
        RuneTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='drawings',
    )
    image_data = models.TextField(help_text='Base64 du canvas PNG')
    title = models.CharField(max_length=200)
    notes = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    mj_feedback = models.TextField(blank=True, default='')
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='rune_drawings')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Dessin de rune'
        verbose_name_plural = 'Dessins de runes'

    def __str__(self) -> str:
        return f'{self.title} — {self.character.name} ({self.get_status_display()})'


class RuneCollection(models.Model):
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='rune_collection')
    rune_drawing = models.ForeignKey(
        RuneDrawing, on_delete=models.CASCADE, related_name='collection_entries',
    )
    acquired_at_session = models.IntegerField()
    uses_remaining = models.IntegerField(
        null=True, blank=True, help_text='None = utilisations illimitées',
    )

    class Meta:
        ordering = ['-acquired_at_session']
        verbose_name = 'Rune en collection'
        verbose_name_plural = 'Runes en collection'

    def __str__(self) -> str:
        uses = self.uses_remaining if self.uses_remaining is not None else '∞'
        return f'{self.rune_drawing.title} — {self.character.name} ({uses} utilisations)'


# ─── Nextcloud / Files ──────────────────────────────────────────────────────

class SharedFolder(models.Model):
    ACCESS_LEVEL_CHOICES = [
        ('all_players', 'Tous les joueurs'),
        ('mj_only', 'MJ uniquement'),
        ('specific_players', 'Joueurs spécifiques'),
    ]

    CATEGORY_CHOICES = [
        ('lore', 'Lore & Histoire'),
        ('maps', 'Cartes'),
        ('illustrations', 'Illustrations'),
        ('music', 'Musiques & Ambiances'),
        ('rules', 'Règles & Références'),
        ('notes', 'Notes de session'),
        ('other', 'Autre'),
    ]

    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name='shared_folders',
    )
    nextcloud_path = models.CharField(max_length=500, help_text='Chemin du dossier dans Nextcloud')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    access_level = models.CharField(max_length=20, choices=ACCESS_LEVEL_CHOICES, default='all_players')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_shared_folders',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['category', 'name']
        verbose_name = 'Dossier partagé'
        verbose_name_plural = 'Dossiers partagés'

    def __str__(self) -> str:
        return f'{self.name} ({self.campaign.name})'


class SharedFolderAccess(models.Model):
    folder = models.ForeignKey(
        SharedFolder, on_delete=models.CASCADE, related_name='access_entries',
    )
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shared_folder_access',
    )
    can_edit = models.BooleanField(default=False)
    can_upload = models.BooleanField(default=False)

    class Meta:
        unique_together = ('folder', 'player')
        verbose_name = 'Accès dossier partagé'
        verbose_name_plural = 'Accès dossiers partagés'

    def __str__(self) -> str:
        perms = []
        if self.can_edit:
            perms.append('édition')
        if self.can_upload:
            perms.append('upload')
        perm_str = ', '.join(perms) if perms else 'lecture'
        return f'{self.player.username} → {self.folder.name} ({perm_str})'


# ─── Session (Notes + Chat) ─────────────────────────────────────────────────

class SessionNote(models.Model):
    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name='session_notes',
    )
    content = models.TextField(blank=True, default='')
    is_private = models.BooleanField(
        default=False, help_text='Si True, visible uniquement par le MJ',
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('campaign', 'is_private')
        ordering = ['-updated_at']
        verbose_name = 'Note de session'
        verbose_name_plural = 'Notes de session'

    def __str__(self) -> str:
        kind = 'privée' if self.is_private else 'partagée'
        return f'Note {kind} — {self.campaign.name}'


class ChatMessage(models.Model):
    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name='chat_messages',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='jdr_chat_messages',
    )
    content = models.TextField()
    is_dice_roll = models.BooleanField(default=False)
    dice_result = models.JSONField(
        null=True, blank=True,
        help_text='Ex: {"command": "2d20", "rolls": [14, 7], "total": 21}',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Message de chat'
        verbose_name_plural = 'Messages de chat'

    def __str__(self) -> str:
        prefix = '🎲 ' if self.is_dice_roll else ''
        return f'{prefix}{self.author.username}: {self.content[:80]}'
