"""URLs de l'app idleone — auth déléguée à accounts + sauvegardes cloud."""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    IdleOneLoginView,
    IdleOneMeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    ResendVerificationEmailView,
    SaveListView,
    SaveSlotView,
    VerifyEmailView,
)

urlpatterns = [
    # ── Auth (délégation au User partagé) ─────────────────────────────────
    path('auth/register/', RegisterView.as_view(), name='idleone-register'),
    path('auth/verify-email/', VerifyEmailView.as_view(), name='idleone-verify-email'),
    path('auth/resend-verification/', ResendVerificationEmailView.as_view(), name='idleone-resend-verification'),
    path('auth/login/', IdleOneLoginView.as_view(), name='idleone-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='idleone-token-refresh'),
    path('auth/me/', IdleOneMeView.as_view(), name='idleone-me'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='idleone-password-reset'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='idleone-password-reset-confirm'),

    # ── Sauvegardes cloud ─────────────────────────────────────────────────
    path('saves/', SaveListView.as_view(), name='idleone-saves'),
    path('saves/<int:slot>/', SaveSlotView.as_view(), name='idleone-save-slot'),
]
