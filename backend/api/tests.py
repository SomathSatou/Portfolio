from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from .models import Project
from .serializers import ProjectSerializer, ContactSerializer


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

class ProjectModelTest(TestCase):

    def setUp(self):
        self.project = Project.objects.create(
            title="Test Project",
            category="web",
            tags="Python, Django, React",
            short_description="A short desc",
            description="A longer description",
            link_github="https://github.com/example/repo",
            link_demo="https://example.com",
        )

    def test_str_returns_title(self):
        self.assertEqual(str(self.project), "Test Project")

    def test_tags_list_with_values(self):
        result = self.project.tags_list
        self.assertEqual(result, ["Python", "Django", "React"])

    def test_tags_list_empty(self):
        self.project.tags = ""
        self.project.save()
        self.assertEqual(self.project.tags_list, [])

    def test_tags_list_strips_whitespace(self):
        self.project.tags = "  Alpha ,  Beta  , Gamma"
        self.project.save()
        self.assertEqual(self.project.tags_list, ["Alpha", "Beta", "Gamma"])

    def test_tags_list_single_tag(self):
        self.project.tags = "Django"
        self.project.save()
        self.assertEqual(self.project.tags_list, ["Django"])

    def test_tags_list_with_empty_parts(self):
        self.project.tags = "Python,,Django"
        self.project.save()
        self.assertEqual(self.project.tags_list, ["Python", "Django"])

    def test_category_choices_valid(self):
        valid_categories = ["doc", "game", "web", "research", "automation", "training", "security"]
        for cat in valid_categories:
            p = Project(title=f"P {cat}", category=cat)
            p.full_clean()  # should not raise

    def test_default_ordering_is_by_created_at_desc(self):
        import time
        time.sleep(0.01)
        p2 = Project.objects.create(title="Second", category="web")
        projects = list(Project.objects.all())
        self.assertEqual(projects[0], p2)

    def test_blank_optional_fields(self):
        p = Project.objects.create(title="Minimal", category="doc")
        self.assertEqual(p.tags, "")
        self.assertEqual(p.short_description, "")
        self.assertEqual(p.description, "")
        self.assertEqual(p.link_github, "")
        self.assertEqual(p.link_demo, "")

    def test_tags_list_only_commas(self):
        self.project.tags = ",,,"
        self.project.save()
        self.assertEqual(self.project.tags_list, [])


# ---------------------------------------------------------------------------
# Serializer tests
# ---------------------------------------------------------------------------

class ProjectSerializerTest(TestCase):

    def setUp(self):
        self.project = Project.objects.create(
            title="Serializer Project",
            category="game",
            tags="Python,React",
            short_description="Short",
            description="Full description",
            link_github="https://github.com/x",
            link_demo="https://demo.x",
        )

    def test_serializer_fields(self):
        serializer = ProjectSerializer(self.project)
        data = serializer.data
        expected_fields = {"id", "title", "category", "tags", "short_description",
                           "description", "link_github", "link_demo", "created_at"}
        self.assertEqual(set(data.keys()), expected_fields)

    def test_tags_serialized_as_list(self):
        serializer = ProjectSerializer(self.project)
        self.assertIsInstance(serializer.data["tags"], list)
        self.assertEqual(serializer.data["tags"], ["Python", "React"])

    def test_tags_empty_serialized_as_empty_list(self):
        self.project.tags = ""
        self.project.save()
        serializer = ProjectSerializer(self.project)
        self.assertEqual(serializer.data["tags"], [])

    def test_title_and_category_in_data(self):
        serializer = ProjectSerializer(self.project)
        self.assertEqual(serializer.data["title"], "Serializer Project")
        self.assertEqual(serializer.data["category"], "game")


class ContactSerializerTest(TestCase):

    def _valid_data(self, **overrides):
        data = {"name": "Alice", "email": "alice@example.com", "message": "Hello!"}
        data.update(overrides)
        return data

    def test_valid_data(self):
        s = ContactSerializer(data=self._valid_data())
        self.assertTrue(s.is_valid(), s.errors)

    def test_missing_name(self):
        data = self._valid_data()
        del data["name"]
        s = ContactSerializer(data=data)
        self.assertFalse(s.is_valid())
        self.assertIn("name", s.errors)

    def test_missing_email(self):
        data = self._valid_data()
        del data["email"]
        s = ContactSerializer(data=data)
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)

    def test_invalid_email(self):
        s = ContactSerializer(data=self._valid_data(email="not-an-email"))
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)

    def test_missing_message(self):
        data = self._valid_data()
        del data["message"]
        s = ContactSerializer(data=data)
        self.assertFalse(s.is_valid())
        self.assertIn("message", s.errors)

    def test_honeypot_optional(self):
        s = ContactSerializer(data=self._valid_data())
        self.assertTrue(s.is_valid())
        self.assertNotIn("honeypot", s.validated_data)

    def test_honeypot_blank_allowed(self):
        s = ContactSerializer(data=self._valid_data(honeypot=""))
        self.assertTrue(s.is_valid(), s.errors)

    def test_honeypot_filled(self):
        s = ContactSerializer(data=self._valid_data(honeypot="spam"))
        self.assertTrue(s.is_valid())
        self.assertEqual(s.validated_data.get("honeypot"), "spam")

    def test_name_max_length(self):
        s = ContactSerializer(data=self._valid_data(name="x" * 201))
        self.assertFalse(s.is_valid())
        self.assertIn("name", s.errors)

    def test_message_max_length(self):
        s = ContactSerializer(data=self._valid_data(message="x" * 4001))
        self.assertFalse(s.is_valid())
        self.assertIn("message", s.errors)


# ---------------------------------------------------------------------------
# ProjectViewSet tests
# ---------------------------------------------------------------------------

class ProjectViewSetTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.p1 = Project.objects.create(title="P1", category="web", tags="React")
        self.p2 = Project.objects.create(title="P2", category="game")

    def test_list_projects(self):
        url = reverse("project-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [p["title"] for p in response.data]
        self.assertIn("P1", titles)
        self.assertIn("P2", titles)

    def test_retrieve_project(self):
        url = reverse("project-detail", args=[self.p1.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "P1")

    def test_retrieve_nonexistent_project(self):
        url = reverse("project-detail", args=[9999])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_returns_tags_as_list(self):
        url = reverse("project-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        p1_data = next(p for p in response.data if p["title"] == "P1")
        self.assertIsInstance(p1_data["tags"], list)
        self.assertIn("React", p1_data["tags"])

    def test_create_not_allowed(self):
        url = reverse("project-list")
        response = self.client.post(url, {"title": "New", "category": "web"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_update_not_allowed(self):
        url = reverse("project-detail", args=[self.p1.pk])
        response = self.client.put(url, {"title": "Updated", "category": "web"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_not_allowed(self):
        url = reverse("project-detail", args=[self.p1.pk])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


# ---------------------------------------------------------------------------
# ContactAPIView tests
# ---------------------------------------------------------------------------

@override_settings(
    CONTACT_RECIPIENT="test@example.com",
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class ContactAPIViewTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("contact")

    def _post(self, data):
        return self.client.post(self.url, data, format="json")

    def test_valid_contact_returns_200(self):
        response = self._post({"name": "Bob", "email": "bob@example.com", "message": "Hi"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "sent")

    def test_email_sent_on_valid_contact(self):
        from django.core import mail
        self._post({"name": "Bob", "email": "bob@example.com", "message": "Hi"})
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("bob@example.com", mail.outbox[0].subject)

    def test_email_subject_contains_name(self):
        from django.core import mail
        self._post({"name": "Alice", "email": "alice@example.com", "message": "Test"})
        self.assertIn("Alice", mail.outbox[0].subject)

    def test_email_reply_to_is_sender(self):
        from django.core import mail
        self._post({"name": "Alice", "email": "alice@example.com", "message": "Test"})
        self.assertIn("alice@example.com", mail.outbox[0].reply_to)

    def test_honeypot_filled_returns_ok_silently(self):
        from django.core import mail
        response = self._post({
            "name": "Spammer", "email": "spam@example.com",
            "message": "Buy now!", "honeypot": "filled"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(len(mail.outbox), 0)

    def test_honeypot_empty_sends_email(self):
        from django.core import mail
        response = self._post({
            "name": "Real", "email": "real@example.com",
            "message": "Hello", "honeypot": ""
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

    def test_missing_name_returns_400(self):
        response = self._post({"email": "bob@example.com", "message": "Hi"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_email_returns_400(self):
        response = self._post({"name": "Bob", "message": "Hi"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_email_returns_400(self):
        response = self._post({"name": "Bob", "email": "not-valid", "message": "Hi"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_message_returns_400(self):
        response = self._post({"name": "Bob", "email": "bob@example.com"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_not_allowed(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    @override_settings(CONTACT_RECIPIENT=None)
    def test_no_recipient_returns_500(self):
        response = self._post({"name": "Bob", "email": "bob@example.com", "message": "Hi"})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    @override_settings(CONTACT_RECIPIENT="")
    def test_empty_recipient_returns_500(self):
        response = self._post({"name": "Bob", "email": "bob@example.com", "message": "Hi"})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
