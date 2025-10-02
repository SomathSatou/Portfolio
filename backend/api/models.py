from django.db import models

class Project(models.Model):
    CATEGORY_CHOICES = [
        ("doc", "Traitement documentaire"),
        ("game", "Jeux"),
        ("web", "Web"),
        ("research", "Recherche"),
        ("automation", "Automatisation"),
        ("training", "Formation"),
        ("security", "Sécurité"),
    ]

    title = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    # Comma-separated list of tags (e.g. "Python,Django,React")
    tags = models.CharField(max_length=300, blank=True, default="")
    short_description = models.CharField(max_length=500, blank=True, default="")
    description = models.TextField(blank=True, default="")
    link_github = models.URLField(blank=True)
    link_demo = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title

    @property
    def tags_list(self) -> list[str]:
        if not self.tags:
            return []
        return [t.strip() for t in self.tags.split(',') if t.strip()]
