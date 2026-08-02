from rest_framework.permissions import BasePermission


def is_full_access(user) -> bool:
    """Un super-utilisateur ou membre du staff Django a accès à toutes les pages JDR."""
    return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))


class IsMJ(BasePermission):
    """Autorise uniquement les utilisateurs avec le rôle MJ (ou admin Django)."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if is_full_access(request.user):
            return True
        profile = getattr(request.user, 'jdr_profile', None)
        return profile is not None and profile.role == 'mj'


class IsOwner(BasePermission):
    """Autorise uniquement le propriétaire de l'objet (ou admin Django)."""

    def has_object_permission(self, request, view, obj):
        if is_full_access(request.user):
            return True
        if hasattr(obj, 'player'):
            return obj.player == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'recipient'):
            return obj.recipient == request.user
        return False


class IsCampaignMember(BasePermission):
    """Autorise les membres d'une campagne (joueurs + MJ), ou un admin Django."""

    def has_object_permission(self, request, view, obj):
        if is_full_access(request.user):
            return True
        campaign = obj if hasattr(obj, 'game_master') else getattr(obj, 'campaign', None)
        if campaign is None:
            return False
        if campaign.game_master == request.user:
            return True
        return campaign.memberships.filter(player=request.user, is_active=True).exists()
