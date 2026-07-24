"""Vues JDR — Enchanteur / Runes."""
from django.utils import timezone

from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Campaign, CampaignEvent, Character, Notification,
    RuneCollection, RuneDrawing, RuneDrawingHistory, RuneFavorite, RuneTemplate,
)
from .serializers import (
    CreateRuneDrawingSerializer, ReviewRuneDrawingSerializer,
    RuneCollectionSerializer, RuneDrawingAnnotationsSerializer,
    RuneDrawingHistorySerializer, RuneDrawingSerializer,
    RuneFavoriteSerializer, RuneTemplateListSerializer, RuneTemplateSerializer,
)
from .permissions import IsMJ


class RuneTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RuneTemplate.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RuneTemplateSerializer
        return RuneTemplateListSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        character_id = self.request.query_params.get('character')
        if character_id:
            ctx['character_id'] = int(character_id)
        return ctx

    def get_queryset(self):
        qs = super().get_queryset()
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            qs = qs.filter(difficulty=difficulty)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class RuneDrawingListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        drawings = RuneDrawing.objects.filter(
            character_id=character_id,
            character__player=request.user,
        ).select_related('template', 'character__player')
        return Response(RuneDrawingSerializer(drawings, many=True).data)

    def post(self, request):
        ser = CreateRuneDrawingSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            character = Character.objects.get(pk=d['character_id'], player=request.user)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            campaign = Campaign.objects.get(pk=d['campaign_id'])
        except Campaign.DoesNotExist:
            return Response({'detail': 'Campagne introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        template = None
        if d.get('template_id'):
            try:
                template = RuneTemplate.objects.get(pk=d['template_id'])
            except RuneTemplate.DoesNotExist:
                return Response({'detail': 'Modèle de rune introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        drawing = RuneDrawing.objects.create(
            character=character,
            campaign=campaign,
            template=template,
            title=d['title'],
            image_data=d['image_data'],
            notes=d.get('notes', ''),
            status='draft',
        )
        return Response(RuneDrawingSerializer(drawing).data, status=status.HTTP_201_CREATED)


class RuneDrawingDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        try:
            drawing = RuneDrawing.objects.get(pk=pk, character__player=request.user)
        except RuneDrawing.DoesNotExist:
            return Response({'detail': 'Dessin introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if drawing.status not in ('draft', 'rejected'):
            return Response(
                {'detail': 'Seuls les brouillons ou dessins rejetés peuvent être modifiés.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        drawing.title = request.data.get('title', drawing.title)
        drawing.notes = request.data.get('notes', drawing.notes)
        if 'image_data' in request.data:
            drawing.image_data = request.data['image_data']
        if drawing.status == 'rejected':
            drawing.status = 'draft'
            drawing.mj_feedback = ''
        drawing.save()
        return Response(RuneDrawingSerializer(drawing).data)

    def delete(self, request, pk):
        try:
            drawing = RuneDrawing.objects.get(pk=pk, character__player=request.user)
        except RuneDrawing.DoesNotExist:
            return Response({'detail': 'Dessin introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if drawing.status not in ('draft', 'rejected'):
            return Response(
                {'detail': 'Seuls les brouillons ou dessins rejetés peuvent être supprimés.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        drawing.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RuneDrawingSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            drawing = RuneDrawing.objects.select_related('character', 'campaign').get(
                pk=pk, character__player=request.user,
            )
        except RuneDrawing.DoesNotExist:
            return Response({'detail': 'Dessin introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if drawing.status not in ('draft', 'rejected'):
            return Response(
                {'detail': 'Ce dessin ne peut pas être soumis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        drawing.status = 'submitted'
        drawing.submitted_at = timezone.now()
        drawing.mj_feedback = ''
        drawing.save(update_fields=['status', 'submitted_at', 'mj_feedback'])

        RuneDrawingHistory.objects.create(
            drawing=drawing,
            status='submitted',
            image_data=drawing.image_data,
            changed_by=request.user,
        )

        Notification.objects.create(
            recipient=drawing.campaign.game_master,
            title='Nouvelle rune soumise',
            message=f'{drawing.character.name} a soumis la rune "{drawing.title}" pour validation.',
            notification_type='info',
        )
        CampaignEvent.objects.create(
            campaign=drawing.campaign,
            event_type='rune_submit',
            actor=request.user,
            actor_name=request.user.username,
            message=f'{drawing.character.name} a soumis la rune « {drawing.title} ».',
            link_hash=f'#/jdr/character/{drawing.character.id}',
        )
        return Response(RuneDrawingSerializer(drawing).data)


class RunePendingView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsMJ]

    def get(self, request):
        campaign_id = request.query_params.get('campaign')
        qs = RuneDrawing.objects.filter(
            status='submitted',
        ).select_related('template', 'character__player', 'campaign')

        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id, campaign__game_master=request.user)
        else:
            qs = qs.filter(campaign__game_master=request.user)

        return Response(RuneDrawingSerializer(qs, many=True).data)


class RuneDrawingReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsMJ]

    def post(self, request, pk):
        try:
            drawing = RuneDrawing.objects.select_related(
                'character', 'campaign', 'template',
            ).get(pk=pk, campaign__game_master=request.user)
        except RuneDrawing.DoesNotExist:
            return Response({'detail': 'Dessin introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if drawing.status != 'submitted':
            return Response(
                {'detail': "Ce dessin n'est pas en attente de validation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ser = ReviewRuneDrawingSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        drawing.status = d['status']
        drawing.mj_feedback = d.get('feedback', '')
        drawing.reviewed_at = timezone.now()
        drawing.save(update_fields=['status', 'mj_feedback', 'reviewed_at'])

        RuneDrawingHistory.objects.create(
            drawing=drawing,
            status=d['status'],
            image_data=drawing.image_data,
            feedback=d.get('feedback', ''),
            changed_by=request.user,
        )

        if d['status'] == 'approved':
            RuneCollection.objects.create(
                character=drawing.character,
                rune_drawing=drawing,
                acquired_at_session=drawing.campaign.current_session_number,
            )

        status_label = 'approuvée ✓' if d['status'] == 'approved' else 'rejetée ✗'
        feedback_text = f'\nCommentaire : {d["feedback"]}' if d.get('feedback') else ''
        Notification.objects.create(
            recipient=drawing.character.player,
            title=f'Rune {status_label}',
            message=f'Votre rune "{drawing.title}" a été {status_label} par le MJ.{feedback_text}',
            notification_type='info',
        )
        CampaignEvent.objects.create(
            campaign=drawing.campaign,
            event_type='rune_review',
            actor=request.user,
            actor_name=request.user.username,
            message=f'Rune « {drawing.title} » de {drawing.character.name} {status_label}.',
            link_hash=f'#/jdr/character/{drawing.character.id}',
        )
        return Response(RuneDrawingSerializer(drawing).data)


class RuneCollectionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        character_id = request.query_params.get('character')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        collection = RuneCollection.objects.filter(
            character_id=character_id,
            character__player=request.user,
        ).select_related('rune_drawing__template')
        return Response(RuneCollectionSerializer(collection, many=True).data)


class RuneFavoriteToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        character_id = request.data.get('character_id')
        if not character_id:
            return Response(
                {'detail': 'Paramètre character_id requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            character = Character.objects.get(pk=character_id, player=request.user)
        except Character.DoesNotExist:
            return Response({'detail': 'Personnage introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            template = RuneTemplate.objects.get(pk=pk)
        except RuneTemplate.DoesNotExist:
            return Response({'detail': 'Modèle introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        fav, created = RuneFavorite.objects.get_or_create(character=character, template=template)
        if not created:
            fav.delete()
            return Response({'is_favorite': False})
        return Response(RuneFavoriteSerializer(fav).data)


class RuneDrawingAnnotationsUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsMJ]

    def patch(self, request, pk):
        try:
            drawing = RuneDrawing.objects.select_related('campaign').get(
                pk=pk, campaign__game_master=request.user,
            )
        except RuneDrawing.DoesNotExist:
            return Response({'detail': 'Dessin introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        ser = RuneDrawingAnnotationsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        drawing.mj_annotations = ser.validated_data['mj_annotations']
        drawing.save(update_fields=['mj_annotations'])
        return Response(RuneDrawingSerializer(drawing).data)


class RuneDrawingHistoryListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            drawing = RuneDrawing.objects.select_related('character', 'campaign').get(pk=pk)
        except RuneDrawing.DoesNotExist:
            return Response({'detail': 'Dessin introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if drawing.character.player != request.user and drawing.campaign.game_master != request.user:
            return Response(
                {'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN,
            )

        history = drawing.history.select_related('changed_by').all()
        return Response(RuneDrawingHistorySerializer(history, many=True).data)
