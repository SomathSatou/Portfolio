from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AlchemyPlantViewSet,
    CampaignViewSet,
    CharacterItemDetailView,
    CharacterItemsView,
    CharacterSpellRemoveView,
    CharacterSpellsView,
    CharacterStatsView,
    CharacterViewSet,
    ItemDetailView,
    ItemListCreateView,
    SpellDetailView,
    SpellListCreateView,
    StatDetailView,
    StatListCreateView,
    CityViewSet,
    GardenHistoryView,
    GardenInventoryView,
    GardenPlotClearView,
    GardenPlotHarvestView,
    GardenPlotPlantView,
    GardenPlotsView,
    GardenSellView,
    GardenStatsView,
    LoginView,
    MarketView,
    MeView,
    MerchantInventoryView,
    MerchantOrderSellView,
    MerchantOrderView,
    MerchantStatsView,
    NextcloudEmbedUrlView,
    NotificationViewSet,
    RegisterView,
    ResourceViewSet,
    RuneCollectionView,
    RuneDrawingDetailView,
    RuneDrawingListCreateView,
    RuneDrawingReviewView,
    RuneDrawingSubmitView,
    RunePendingView,
    RuneTemplateViewSet,
    SharedFolderContentView,
    SharedFolderDetailView,
    SharedFolderListCreateView,
    SharedFolderUploadView,
)

router = DefaultRouter()
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'characters', CharacterViewSet, basename='character')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'economy/cities', CityViewSet, basename='city')
router.register(r'economy/resources', ResourceViewSet, basename='resource')
router.register(r'garden/plants', AlchemyPlantViewSet, basename='alchemy-plant')
router.register(r'runes/templates', RuneTemplateViewSet, basename='rune-template')

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='jdr-register'),
    path('auth/login/', LoginView.as_view(), name='jdr-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='jdr-token-refresh'),
    path('auth/me/', MeView.as_view(), name='jdr-me'),
    # Campaign Content (Spells, Items, Stats)
    path('spells/', SpellListCreateView.as_view(), name='spells'),
    path('spells/<int:pk>/', SpellDetailView.as_view(), name='spell-detail'),
    path('items/', ItemListCreateView.as_view(), name='items'),
    path('items/<int:pk>/', ItemDetailView.as_view(), name='item-detail'),
    path('stats/', StatListCreateView.as_view(), name='stats'),
    path('stats/<int:pk>/', StatDetailView.as_view(), name='stat-detail'),
    path('character-stats/', CharacterStatsView.as_view(), name='character-stats'),
    path('character-spells/', CharacterSpellsView.as_view(), name='character-spells'),
    path('character-spells/<int:pk>/', CharacterSpellRemoveView.as_view(), name='character-spell-remove'),
    path('character-items/', CharacterItemsView.as_view(), name='character-items'),
    path('character-items/<int:pk>/', CharacterItemDetailView.as_view(), name='character-item-detail'),
    # Economy
    path('economy/market/', MarketView.as_view(), name='market'),
    # Merchant
    path('merchant/inventory/', MerchantInventoryView.as_view(), name='merchant-inventory'),
    path('merchant/orders/', MerchantOrderView.as_view(), name='merchant-orders'),
    path('merchant/orders/<int:pk>/sell/', MerchantOrderSellView.as_view(), name='merchant-order-sell'),
    path('merchant/stats/', MerchantStatsView.as_view(), name='merchant-stats'),
    # Garden
    path('garden/plots/', GardenPlotsView.as_view(), name='garden-plots'),
    path('garden/plots/<int:pk>/plant/', GardenPlotPlantView.as_view(), name='garden-plot-plant'),
    path('garden/plots/<int:pk>/harvest/', GardenPlotHarvestView.as_view(), name='garden-plot-harvest'),
    path('garden/plots/<int:pk>/clear/', GardenPlotClearView.as_view(), name='garden-plot-clear'),
    path('garden/inventory/', GardenInventoryView.as_view(), name='garden-inventory'),
    path('garden/sell/', GardenSellView.as_view(), name='garden-sell'),
    path('garden/stats/', GardenStatsView.as_view(), name='garden-stats'),
    path('garden/history/', GardenHistoryView.as_view(), name='garden-history'),
    # Runes
    path('runes/drawings/', RuneDrawingListCreateView.as_view(), name='rune-drawings'),
    path('runes/drawings/<int:pk>/', RuneDrawingDetailView.as_view(), name='rune-drawing-detail'),
    path('runes/drawings/<int:pk>/submit/', RuneDrawingSubmitView.as_view(), name='rune-drawing-submit'),
    path('runes/drawings/<int:pk>/review/', RuneDrawingReviewView.as_view(), name='rune-drawing-review'),
    path('runes/pending/', RunePendingView.as_view(), name='rune-pending'),
    path('runes/collection/', RuneCollectionView.as_view(), name='rune-collection'),
    # Files / Nextcloud
    path('files/folders/', SharedFolderListCreateView.as_view(), name='shared-folders'),
    path('files/folders/<int:pk>/', SharedFolderDetailView.as_view(), name='shared-folder-detail'),
    path('files/folders/<int:pk>/content/', SharedFolderContentView.as_view(), name='shared-folder-content'),
    path('files/folders/<int:pk>/upload/', SharedFolderUploadView.as_view(), name='shared-folder-upload'),
    path('files/embed-url/', NextcloudEmbedUrlView.as_view(), name='nextcloud-embed-url'),
    # Router
    path('', include(router.urls)),
]
