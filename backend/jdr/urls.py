from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CampaignViewSet,
    CharacterViewSet,
    CityViewSet,
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
)

router = DefaultRouter()
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'characters', CharacterViewSet, basename='character')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'economy/cities', CityViewSet, basename='city')
router.register(r'economy/resources', ResourceViewSet, basename='resource')

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
    # Router
    path('', include(router.urls)),
]
