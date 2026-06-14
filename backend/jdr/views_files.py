"""Vues JDR — Nextcloud / Fichiers partagés."""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Campaign, SharedFolder, SharedFolderAccess
from .serializers import (
    CreateSharedFolderSerializer, SharedFolderSerializer,
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


def _nextcloud_webdav_url(path: str) -> str:
    from django.conf import settings as django_settings
    base = django_settings.NEXTCLOUD_URL.rstrip('/')
    user = django_settings.NEXTCLOUD_ADMIN_USER
    return f'{base}/remote.php/dav/files/{user}/{path.lstrip("/")}'


def _nextcloud_auth():
    from django.conf import settings as django_settings
    return (django_settings.NEXTCLOUD_ADMIN_USER, django_settings.NEXTCLOUD_ADMIN_PASSWORD)


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

        safe_campaign = campaign.name.replace(' ', '_').replace('/', '_')
        safe_name = d['name'].replace(' ', '_').replace('/', '_')
        nc_path = f'jdr/{safe_campaign}/{d["category"]}/{safe_name}'

        import requests as http_requests
        auth = _nextcloud_auth()
        if auth[0] and auth[1]:
            try:
                parts = nc_path.split('/')
                for i in range(1, len(parts) + 1):
                    partial = '/'.join(parts[:i])
                    http_requests.request(
                        'MKCOL',
                        _nextcloud_webdav_url(partial),
                        auth=auth,
                        timeout=10,
                    )
            except http_requests.RequestException:
                pass

        folder = SharedFolder.objects.create(
            campaign=campaign,
            nextcloud_path=nc_path,
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
    """Proxy vers Nextcloud WebDAV — liste le contenu d'un dossier."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            folder = SharedFolder.objects.select_related('campaign').get(pk=pk)
        except SharedFolder.DoesNotExist:
            return Response({'detail': 'Dossier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if not _user_can_access_folder(request.user, folder):
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)

        import requests as http_requests
        auth = _nextcloud_auth()
        if not auth[0] or not auth[1]:
            return Response(
                {'detail': 'Nextcloud non configuré.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        webdav_url = _nextcloud_webdav_url(folder.nextcloud_path)
        propfind_body = '''<?xml version="1.0" encoding="UTF-8"?>
        <d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
          <d:prop>
            <d:displayname/>
            <d:getcontenttype/>
            <d:getcontentlength/>
            <d:getlastmodified/>
            <d:resourcetype/>
          </d:prop>
        </d:propfind>'''

        try:
            resp = http_requests.request(
                'PROPFIND',
                webdav_url,
                auth=auth,
                headers={'Content-Type': 'application/xml', 'Depth': '1'},
                data=propfind_body,
                timeout=15,
            )
        except http_requests.RequestException as e:
            return Response(
                {'detail': f'Erreur de connexion à Nextcloud: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if resp.status_code not in (200, 207):
            return Response(
                {'detail': f'Nextcloud a répondu avec le code {resp.status_code}.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        import xml.etree.ElementTree as ET
        try:
            root = ET.fromstring(resp.text)
        except ET.ParseError:
            return Response(
                {'detail': 'Réponse Nextcloud invalide.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        ns = {'d': 'DAV:'}
        files = []
        for response_el in root.findall('d:response', ns):
            href = response_el.findtext('d:href', '', ns)
            propstat = response_el.find('d:propstat', ns)
            if propstat is None:
                continue
            prop = propstat.find('d:prop', ns)
            if prop is None:
                continue

            display_name = prop.findtext('d:displayname', '', ns)
            content_type = prop.findtext('d:getcontenttype', '', ns)
            content_length = prop.findtext('d:getcontentlength', '0', ns)
            last_modified = prop.findtext('d:getlastmodified', '', ns)
            resource_type = prop.find('d:resourcetype', ns)
            is_dir = resource_type is not None and resource_type.find('d:collection', ns) is not None

            if href.rstrip('/').endswith(folder.nextcloud_path.rstrip('/')):
                continue

            files.append({
                'name': display_name or href.split('/')[-1] or href.split('/')[-2],
                'href': href,
                'content_type': content_type,
                'size': int(content_length) if content_length else 0,
                'last_modified': last_modified,
                'is_directory': is_dir,
            })

        return Response({
            'folder_id': folder.id,
            'folder_name': folder.name,
            'nextcloud_path': folder.nextcloud_path,
            'files': files,
            'can_upload': _user_can_upload_to_folder(request.user, folder),
        })


class SharedFolderUploadView(APIView):
    """Upload de fichier vers Nextcloud via WebDAV PUT."""
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

        import requests as http_requests
        auth = _nextcloud_auth()
        if not auth[0] or not auth[1]:
            return Response(
                {'detail': 'Nextcloud non configuré.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        file_path = f'{folder.nextcloud_path}/{uploaded_file.name}'
        webdav_url = _nextcloud_webdav_url(file_path)

        try:
            resp = http_requests.put(
                webdav_url,
                auth=auth,
                data=uploaded_file.read(),
                headers={'Content-Type': uploaded_file.content_type or 'application/octet-stream'},
                timeout=60,
            )
        except http_requests.RequestException as e:
            return Response(
                {'detail': f"Erreur d'upload vers Nextcloud: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if resp.status_code not in (200, 201, 204):
            return Response(
                {'detail': f'Nextcloud a répondu avec le code {resp.status_code}.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({
            'detail': f'Fichier "{uploaded_file.name}" uploadé avec succès.',
            'file_name': uploaded_file.name,
            'file_path': file_path,
        }, status=status.HTTP_201_CREATED)


class NextcloudEmbedUrlView(APIView):
    """Retourne l'URL Nextcloud à intégrer en iframe."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.conf import settings as django_settings
        nc_url = django_settings.NEXTCLOUD_URL.rstrip('/')

        folder_id = request.query_params.get('folder')
        if folder_id:
            try:
                folder = SharedFolder.objects.select_related('campaign').get(pk=folder_id)
            except SharedFolder.DoesNotExist:
                return Response({'detail': 'Dossier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

            if not _user_can_access_folder(request.user, folder):
                return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)

            embed_url = f'{nc_url}/apps/files/?dir=/{folder.nextcloud_path}'
        else:
            embed_url = f'{nc_url}/apps/files/'

        return Response({'embed_url': embed_url, 'nextcloud_url': nc_url})
