from django.contrib import admin

from .models import (
    AlchemyPlant, Campaign, CampaignMembership, Character, City, CityExport, CityImport,
    GardenPlot, GardenUpgrade, HarvestLog, MarketPrice, MerchantInventory, MerchantOrder,
    Notification, PlantUsage, Resource, RuneCollection, RuneDrawing, RuneTemplate, UserProfile,
)

admin.site.register(UserProfile)
admin.site.register(Campaign)
admin.site.register(CampaignMembership)
admin.site.register(Character)
admin.site.register(Notification)


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'craft_type', 'base_price', 'unit', 'availability')
    list_filter = ('craft_type', 'availability')
    search_fields = ('name',)


@admin.register(CityExport)
class CityExportAdmin(admin.ModelAdmin):
    list_display = ('city', 'resource', 'price', 'availability')
    list_filter = ('city', 'availability')


@admin.register(CityImport)
class CityImportAdmin(admin.ModelAdmin):
    list_display = ('city', 'resource', 'price', 'origin_city')
    list_filter = ('city',)


@admin.register(MarketPrice)
class MarketPriceAdmin(admin.ModelAdmin):
    list_display = ('city_export', 'campaign', 'session_number', 'current_price')
    list_filter = ('campaign', 'session_number')


@admin.register(MerchantOrder)
class MerchantOrderAdmin(admin.ModelAdmin):
    list_display = ('character', 'resource', 'quantity', 'buy_city', 'sell_city', 'status', 'profit')
    list_filter = ('status', 'campaign')


@admin.register(MerchantInventory)
class MerchantInventoryAdmin(admin.ModelAdmin):
    list_display = ('character', 'resource', 'quantity', 'average_buy_price')


# ─── Garden / Alchemy ──────────────────────────────────────────────────────

class PlantUsageInline(admin.TabularInline):
    model = PlantUsage
    extra = 1


@admin.register(AlchemyPlant)
class AlchemyPlantAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'category', 'rarity', 'growth_time', 'yield_amount', 'sell_price')
    list_filter = ('category', 'rarity')
    search_fields = ('name',)
    inlines = [PlantUsageInline]


@admin.register(GardenPlot)
class GardenPlotAdmin(admin.ModelAdmin):
    list_display = ('character', 'plot_number', 'plant', 'status', 'sessions_grown')
    list_filter = ('status',)


@admin.register(GardenUpgrade)
class GardenUpgradeAdmin(admin.ModelAdmin):
    list_display = ('character', 'max_plots', 'fertilizer_bonus')


@admin.register(HarvestLog)
class HarvestLogAdmin(admin.ModelAdmin):
    list_display = ('character', 'plant', 'quantity', 'harvested_at_session', 'sold', 'sell_price_total')
    list_filter = ('sold',)


# ─── Enchanteur / Runes ──────────────────────────────────────────────────────

@admin.register(RuneTemplate)
class RuneTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'difficulty', 'category', 'mana_cost')
    list_filter = ('difficulty', 'category')
    search_fields = ('name',)


@admin.register(RuneDrawing)
class RuneDrawingAdmin(admin.ModelAdmin):
    list_display = ('title', 'character', 'template', 'status', 'submitted_at', 'reviewed_at')
    list_filter = ('status', 'campaign')
    search_fields = ('title',)


@admin.register(RuneCollection)
class RuneCollectionAdmin(admin.ModelAdmin):
    list_display = ('rune_drawing', 'character', 'acquired_at_session', 'uses_remaining')
