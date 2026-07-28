"""Vues JDR — Fichiers partagés (bibliothèque de campagne, stockage local Django)."""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Campaign, SharedFile, SharedFolder, SharedFolderAccess
from .serializers import (
    CreateSharedFolderSerializer, SharedFileSerializer, SharedFolderSerializer,
    UpdateSharedFolderSerializer,
)


def _user_can_access_folder(user, folder: SharedFolder) -> bool:
    if folder.campaign.game_master == user:
        return True
    if folder.access_level == 'mj_only':
        return False
    if folder.access_level == 'all_players':
        return folder.campaign.memberships.filter(player=user, is_active=True).exists()
    if folder.access_level == 'specific_players':
        return folder.access_entries.filter(player=user).exists()
    return False


def _user_can_upload_to_folder(user, folder: SharedFolder) -> bool:
    if folder.campaign.game_master == user:
        return True
    access = folder.access_entries.filter(player=user).first()
    return access is not None and access.can_upload


class SharedFolderListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        if not campaign_id:
            return Response(
                {'detail': 'Paramètre campaign requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            campaign = Campaign.objects.get(pk=campaign_id)
        except Campaign.DoesNotExist:
            return Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        is_mj = campaign.game_master == request.user
        is_member = campaign.memberships.filter(player=request.user, is_active=True).exists()
        if not is_mj and not is_member:
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)

        folders = SharedFolder.objects.filter(campaign=campaign).prefetch_related('access_entries')
        accessible = [f for f in folders if _user_can_access_folder(request.user, f)]
        return Response(SharedFolderSerializer(accessible, many=True).data)

    def post(self, request):
        ser = CreateSharedFolderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            campaign = Campaign.objects.get(pk=d['campaign_id'])
        except Campaign.DoesNotExist:
            return Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if campaign.game_master != request.user:
            return Response(
                {'detail': 'Seul le MJ peut créer des dossiers partagés.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        folder = SharedFolder.objects.create(
            campaign=campaign,
            name=d['name'],
            description=d.get('description', ''),
            category=d.get('category', 'other'),
            access_level=d.get('access_level', 'all_players'),
            created_by=request.user,
        )

        player_ids = d.get('player_ids', [])
        if player_ids and d.get('access_level') == 'specific_players':
            from django.contrib.auth.models import User
            players = User.objects.filter(pk__in=player_ids)
            SharedFolderAccess.objects.bulk_create([
                SharedFolderAccess(folder=folder, player=p) for p in players
            ])

        return Response(SharedFolderSerializer(folder).data, status=status.HTTP_201_CREATED)


class SharedFolderDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        try:
            folder = SharedFolder.objects.select_related('campaign').get(pk=pk)
        except SharedFolder.DoesNotExist:
            return Response({'detail': 'Dossier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if folder.campaign.game_master != request.user:
            return Response(
                {'detail': 'Seul le MJ peut modifier les dossiers partagés.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = UpdateSharedFolderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        for field in ('name', 'description', 'category', 'access_level'):
            if field in d:
                setattr(folder, field, d[field])
        folder.save()

        if 'player_ids' in d:
            folder.access_entries.all().delete()
            if d.get('access_level') == 'specific_players' or folder.access_level == 'specific_players':
                from django.contrib.auth.models import User
                players = User.objects.filter(pk__in=d['player_ids'])
                SharedFolderAccess.objects.bulk_create([
                    SharedFolderAccess(folder=folder, player=p) for p in players
                ])

        return Response(SharedFolderSerializer(folder).data)

    def delete(self, request, pk):
        try:
            folder = SharedFolder.objects.select_related('campaign').get(pk=pk)
        except SharedFolder.DoesNotExist:
            return Response({'detail': 'Dossier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if folder.campaign.game_master != request.user:
            return Response(
                {'detail': 'Seul le MJ peut supprimer les dossiers partagés.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        folder.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SharedFolderContentView(APIView):
    """Liste les fichiers d'un dossier partagé (stockage local Django)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            folder = SharedFolder.objects.select_related('campaign').get(pk=pk)
        except SharedFolder.DoesNotExist:
            return Response({'detail': 'Dossier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if not _user_can_access_folder(request.user, folder):
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)

        files = folder.files.select_related('uploaded_by').all()

        return Response({
            'folder_id': folder.id,
            'folder_name': folder.name,
            'files': SharedFileSerializer(files, many=True, context={'request': request}).data,
            'can_upload': _user_can_upload_to_folder(request.user, folder),
        })


class SharedFolderUploadView(APIView):
    """Upload de fichier dans un dossier partagé (stockage local Django)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            folder = SharedFolder.objects.select_related('campaign').get(pk=pk)
        except SharedFolder.DoesNotExist:
            return Response({'detail': 'Dossier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if not _user_can_upload_to_folder(request.user, folder):
            return Response(
                {'detail': "Vous n'avez pas la permission d'uploader dans ce dossier."},
                status=status.HTTP_403_FORBIDDEN,
            )

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {'detail': 'Aucun fichier fourni.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.conf import settings as django_settings
        max_size = django_settings.JDR_SHARED_FILE_MAX_SIZE
        if uploaded_file.size > max_size:
            return Response(
                {'detail': f'Fichier trop volumineux (max {max_size // (1024 * 1024)} Mo).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shared_file = SharedFile.objects.create(
            folder=folder,
            file=uploaded_file,
            original_name=uploaded_file.name,
            content_type=uploaded_file.content_type or 'application/octet-stream',
            size=uploaded_file.size,
            uploaded_by=request.user,
        )

        return Response(
            SharedFileSerializer(shared_file, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class SharedFileDeleteView(APIView):
    """Suppression d'un fichier partagé (MJ ou uploader)."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            shared_file = SharedFile.objects.select_related('folder__campaign').get(pk=pk)
        except SharedFile.DoesNotExist:
            return Response({'detail': 'Fichier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        is_mj = shared_file.folder.campaign.game_master == request.user
        is_uploader = shared_file.uploaded_by == request.user
        if not is_mj and not is_uploader:
            return Response(
                {'detail': "Vous n'avez pas la permission de supprimer ce fichier."},
                status=status.HTTP_403_FORBIDDEN,
            )

        shared_file.file.delete(save=False)
        shared_file.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
