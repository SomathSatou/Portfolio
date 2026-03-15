from django.contrib import admin

from .models import (
    Campaign, CampaignMembership, Character, City, CityExport, CityImport,
    MarketPrice, MerchantInventory, MerchantOrder, Notification, Resource, UserProfile,
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
