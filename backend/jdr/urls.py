from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AlchemyPlantViewSet,
    CampaignViewSet,
    CharacterViewSet,
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
    # Router
    path('', include(router.urls)),
]
