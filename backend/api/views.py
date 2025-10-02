from django.conf import settings
from django.core.mail import EmailMessage
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Project
from .serializers import ProjectSerializer, ContactSerializer


class ProjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer


class ContactAPIView(APIView):
    throttle_scope = 'contact'

    def post(self, request, *args, **kwargs):
        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Honeypot: if filled, drop silently
        if data.get('honeypot'):
            return Response({"status": "ok"})

        subject = f"Portfolio contact: {data['name']} <{data['email']}>"
        body = data['message']
        recipient = getattr(settings, 'CONTACT_RECIPIENT', None)
        if not recipient:
            return Response({"detail": "Contact recipient not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        email = EmailMessage(
            subject=subject,
            body=body,
            to=[recipient],
        )
        # Ensure replies go to the sender's email without spoofing From
        email.reply_to = [data['email']]
        email.send(fail_silently=False)
        return Response({"status": "sent"}, status=status.HTTP_200_OK)
