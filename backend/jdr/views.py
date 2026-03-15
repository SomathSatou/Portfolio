from django.db.models import Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Campaign, CampaignMembership, Character, Notification, UserProfile
from .permissions import IsCampaignMember, IsMJ, IsOwner
from .serializers import (
    CampaignMembershipSerializer,
    CampaignSerializer,
    CharacterSerializer,
    MeSerializer,
    NotificationSerializer,
    RegisterSerializer,
)


# ─── Auth ────────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
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


class LoginView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.contrib.auth import authenticate

        email = request.data.get('email', '')
        password = request.data.get('password', '')

        # Django User uses username for auth; look up by email
        from django.contrib.auth.models import User
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

        # Ensure profile exists
        UserProfile.objects.get_or_create(user=user)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class MeView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        UserProfile.objects.get_or_create(user=self.request.user)
        return self.request.user


# ─── Campaigns ───────────────────────────────────────────────────────────────

class CampaignViewSet(viewsets.ModelViewSet):
    serializer_class = CampaignSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Campaign.objects.filter(
            Q(game_master=user) | Q(memberships__player=user, memberships__is_active=True)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(game_master=self.request.user)

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsMJ()]
        return super().get_permissions()

    @action(detail=True, methods=['post'], url_path='advance-session')
    def advance_session(self, request, pk=None):
        campaign = self.get_object()
        if campaign.game_master != request.user:
            return Response(
                {'detail': 'Seul le MJ peut avancer la session.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        campaign.current_session_number += 1
        campaign.save(update_fields=['current_session_number'])

        # Notify all members
        members = campaign.memberships.filter(is_active=True)
        notifications = [
            Notification(
                recipient=m.player,
                title='Nouvelle inter-session',
                message=f'La campagne "{campaign.name}" passe à la session {campaign.current_session_number}.',
                notification_type='intersession',
            )
            for m in members
        ]
        Notification.objects.bulk_create(notifications)

        return Response({
            'current_session_number': campaign.current_session_number,
        })

    @action(detail=True, methods=['post'], url_path='invite')
    def invite(self, request, pk=None):
        campaign = self.get_object()
        if campaign.game_master != request.user:
            return Response(
                {'detail': 'Seul le MJ peut générer un code d\'invitation.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        code = campaign.generate_invite_code()
        return Response({'invite_code': code})

    @action(detail=True, methods=['post'], url_path='join')
    def join(self, request, pk=None):
        campaign = self.get_object()
        code = request.data.get('invite_code', '')
        if campaign.invite_code != code:
            return Response(
                {'detail': 'Code d\'invitation invalide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership, created = CampaignMembership.objects.get_or_create(
            campaign=campaign,
            player=request.user,
            defaults={'is_active': True},
        )
        if not created and not membership.is_active:
            membership.is_active = True
            membership.save(update_fields=['is_active'])

        return Response({'detail': 'Vous avez rejoint la campagne.'})

    @action(detail=True, methods=['get'], url_path='members')
    def members(self, request, pk=None):
        campaign = self.get_object()
        memberships = campaign.memberships.filter(is_active=True).select_related('player')
        serializer = CampaignMembershipSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='characters')
    def campaign_characters(self, request, pk=None):
        campaign = self.get_object()
        characters = Character.objects.filter(campaign=campaign)
        serializer = CharacterSerializer(characters, many=True)
        return Response(serializer.data)


# ─── Characters ──────────────────────────────────────────────────────────────

class CharacterViewSet(viewsets.ModelViewSet):
    serializer_class = CharacterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Character.objects.select_related('campaign', 'player')
        # MJ can see characters in their campaigns
        profile = getattr(user, 'jdr_profile', None)
        if profile and profile.role == 'mj':
            return qs.filter(
                Q(player=user) | Q(campaign__game_master=user)
            ).distinct()
        return qs.filter(player=user)

    def perform_create(self, serializer):
        serializer.save(player=self.request.user)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        # Allow owner or campaign MJ to edit
        if obj.player == request.user:
            return
        if obj.campaign.game_master == request.user:
            return
        self.permission_denied(request)


# ─── Notifications ───────────────────────────────────────────────────────────

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('is_read', '-created_at')

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if notification.recipient != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'detail': 'Notification marquée comme lue.'})

    @action(detail=False, methods=['post'], url_path='read-all')
    def read_all(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'Toutes les notifications marquées comme lues.'})
