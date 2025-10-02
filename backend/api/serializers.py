from rest_framework import serializers
from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    tags = serializers.ListField(
        child=serializers.CharField(),
        source='tags_list',
        read_only=True,
    )

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'category', 'tags', 'short_description', 'description',
            'link_github', 'link_demo', 'created_at'
        ]


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    message = serializers.CharField(max_length=4000)
    honeypot = serializers.CharField(required=False, allow_blank=True)
