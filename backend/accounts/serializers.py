"""Serializers partagés pour l'authentification unifiée JDR + IRL RPG.

Le serializer `MeSerializer` retourne les champs communs à toutes les apps,
plus des champs optionnels spécifiques (`role` JDR, `can_access_muscu` IRL RPG)
présents seulement si le profil correspondant existe.
"""
from django.contrib.auth.models import User
from rest_framework import serializers


class RegisterSerializer(serializers.Serializer):
    """Inscription d'un nouvel utilisateur (commun JDR + IRL RPG).

    Crée un User Django standard ; les profils spécifiques (UserProfile,
    MuscuProfile) sont créés à la demande par leurs apps respectives.
    """

    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Cet email est déjà utilisé.')
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError(
                {'password_confirm': 'Les mots de passe ne correspondent pas.'}
            )
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )


class MeSerializer(serializers.ModelSerializer):
    """Sérialise l'utilisateur courant avec tous ses profils applicatifs.

    Champs optionnels :
    - `role` : rôle JDR ('joueur' | 'mj'), présent si le profil JDR existe.
    - `can_access_muscu` : accès IRL RPG, présent si le profil muscu existe.
    - `avatar` : URL d'avatar JDR ou IRL RPG selon le profil disponible.
    - `is_banned` : statut de bannissement IRL RPG.
    """

    is_staff = serializers.BooleanField(read_only=True)
    role = serializers.SerializerMethodField()
    can_access_muscu = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    is_banned = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'role', 'can_access_muscu', 'avatar', 'is_banned']
        read_only_fields = ['id', 'username', 'email']

    def get_role(self, obj) -> str:
        profile = getattr(obj, 'jdr_profile', None)
        return profile.role if profile else 'joueur'

    def get_can_access_muscu(self, obj) -> bool:
        if obj.is_staff:
            return True
        profile = getattr(obj, 'muscu_profile', None)
        return profile.can_access_muscu if profile else False

    def get_avatar(self, obj) -> str | None:
        """Retourne l'URL d'avatar IRL RPG en priorité, puis JDR."""
        request = self.context.get('request')

        muscu_profile = getattr(obj, 'muscu_profile', None)
        if muscu_profile and muscu_profile.avatar:
            url = muscu_profile.avatar.url
            return request.build_absolute_uri(url) if request else url

        jdr_profile = getattr(obj, 'jdr_profile', None)
        if jdr_profile and jdr_profile.avatar:
            url = jdr_profile.avatar.url
            return request.build_absolute_uri(url) if request else url

        return None

    def get_is_banned(self, obj) -> bool:
        profile = getattr(obj, 'muscu_profile', None)
        return profile.is_banned if profile else False


class PasswordResetRequestSerializer(serializers.Serializer):
    """Demande de réinitialisation de mot de passe par email."""

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Confirmation de réinitialisation avec token + nouveau mot de passe."""

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError(
                {'new_password_confirm': 'Les mots de passe ne correspondent pas.'}
            )
        return data
