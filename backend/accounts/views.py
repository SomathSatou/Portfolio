"""Vues d'authentification unifiées pour JDR et IRL RPG.

Un seul endpoint `/api/auth/login/` gère les deux apps.
Le token JWT produit est identique — les apps utilisent le même
`django.contrib.auth.User`. Les contrôles d'accès spécifiques
(ex. `can_access_muscu`) sont faits dans leurs apps respectives.
"""
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import MeSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
    """Inscription d'un nouveau compte (commun JDR + IRL RPG).

    POST /api/auth/register/
    Body : { username, email, password, password_confirm }
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'detail': 'Inscription réussie.', 'user_id': user.id},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """Connexion par email + mot de passe, retourne une paire de tokens JWT.

    POST /api/auth/login/
    Body : { email, password }
    Réponse : { access, refresh }

    Note : ne vérifie pas les permissions applicatives (muscu, jdr) —
    chaque app peut compléter ce contrôle dans sa propre LoginView si nécessaire.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')

        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Identifiants invalides.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = authenticate(request, username=user_obj.username, password=password)
        if user is None:
            return Response(
                {'detail': 'Identifiants invalides.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class MeView(generics.RetrieveAPIView):
    """Retourne le profil complet de l'utilisateur authentifié.

    GET /api/auth/me/
    Inclut : username, email, is_staff, role JDR, can_access_muscu, avatar, is_banned.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user
