from rest_framework.permissions import BasePermission


class IsMJ(BasePermission):
    """Autorise uniquement les utilisateurs avec le rôle MJ."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        profile = getattr(request.user, 'jdr_profile', None)
        return profile is not None and profile.role == 'mj'


class IsOwner(BasePermission):
    """Autorise uniquement le propriétaire de l'objet."""

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'player'):
            return obj.player == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'recipient'):
            return obj.recipient == request.user
        return False


class IsCampaignMember(BasePermission):
    """Autorise les membres d'une campagne (joueurs + MJ)."""

    def has_object_permission(self, request, view, obj):
        campaign = obj if hasattr(obj, 'game_master') else getattr(obj, 'campaign', None)
        if campaign is None:
            return False
        if campaign.game_master == request.user:
            return True
        return campaign.memberships.filter(player=request.user, is_active=True).exists()
