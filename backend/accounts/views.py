"""Vues d'authentification unifiées pour JDR et IRL RPG.

Un seul endpoint `/api/auth/login/` gère les deux apps.
Le token JWT produit est identique — les apps utilisent le même
`django.contrib.auth.User`. Les contrôles d'accès spécifiques
(ex. `can_access_muscu`) sont faits dans leurs apps respectives.
"""
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    MeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
)


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


_token_generator = PasswordResetTokenGenerator()


class PasswordResetRequestView(APIView):
    """Envoie un email avec le lien de réinitialisation de mot de passe.

    POST /api/auth/password-reset/
    Body : { email }
    Toujours 200 pour ne pas révéler l'existence d'un compte.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Si cet email existe, un lien vous a été envoyé.'})

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = _token_generator.make_token(user)

        frontend_origin = request.headers.get('Origin', 'https://automia.org')
        reset_url_jdr = f'{frontend_origin}/#/jdr/reset-password?uid={uid}&token={token}'
        reset_url_muscu = f'{frontend_origin}/#/irlrpg/reset-password?uid={uid}&token={token}'

        app_header = request.headers.get('X-App', '')
        if app_header == 'muscu':
            reset_url = reset_url_muscu
            app_name = 'IRL RPG'
        else:
            reset_url = reset_url_jdr
            app_name = 'JDR'

        send_mail(
            subject=f'[{app_name}] Réinitialisation de votre mot de passe',
            message=(
                f'Bonjour {user.username},\n\n'
                f'Vous avez demandé la réinitialisation de votre mot de passe {app_name}.\n\n'
                f'Cliquez sur le lien suivant (valable 1h) :\n{reset_url}\n\n'
                'Si vous n\'avez pas fait cette demande, ignorez cet email.\n\n'
                '— L\'équipe automia.org'
            ),
            from_email=None,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response({'detail': 'Si cet email existe, un lien vous a été envoyé.'})


class PasswordResetConfirmView(APIView):
    """Valide le token et met à jour le mot de passe.

    POST /api/auth/password-reset/confirm/
    Body : { uid, token, new_password, new_password_confirm }
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            user_pk = force_str(urlsafe_base64_decode(data['uid']))
            user = User.objects.get(pk=user_pk)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {'detail': 'Lien invalide ou expiré.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not _token_generator.check_token(user, data['token']):
            return Response(
                {'detail': 'Lien invalide ou expiré.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Mot de passe mis à jour avec succès.'})
