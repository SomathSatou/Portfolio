"""Vues d'authentification JDR — délégation vers l'app accounts.

Ce module ré-exporte les vues génériques de accounts et fournit
des surcharges JDR-spécifiques (création automatique du UserProfile).
"""
from django.contrib.auth.models import User

from accounts.serializers import MeSerializer as AccountsMeSerializer
from accounts.views import LoginView as _BaseLoginView
from accounts.views import RegisterView  # noqa: F401 — ré-exporté pour urls.py
from rest_framework import generics, permissions

from .models import UserProfile


class JdrLoginView(_BaseLoginView):
    """Login JDR : délègue à accounts.LoginView puis s'assure que UserProfile existe."""

    def post(self, request):
        response = super().post(request)
        if response.status_code == 200:
            email = request.data.get('email', '').strip()
            try:
                user = User.objects.get(email=email)
                UserProfile.objects.get_or_create(user=user)
            except User.DoesNotExist:
                pass
        return response


class JdrMeView(generics.RetrieveUpdateAPIView):
    """Profil utilisateur JDR — garantit l'existence du UserProfile JDR."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AccountsMeSerializer

    def get_object(self):
        UserProfile.objects.get_or_create(user=self.request.user)
        return self.request.user
