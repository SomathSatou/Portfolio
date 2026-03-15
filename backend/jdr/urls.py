from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CampaignViewSet,
    CharacterViewSet,
    LoginView,
    MeView,
    NotificationViewSet,
    RegisterView,
)

router = DefaultRouter()
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'characters', CharacterViewSet, basename='character')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='jdr-register'),
    path('auth/login/', LoginView.as_view(), name='jdr-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='jdr-token-refresh'),
    path('auth/me/', MeView.as_view(), name='jdr-me'),
    # Router
    path('', include(router.urls)),
]
