from django.db import migrations, models


def mark_campaignless_monsters_global(apps, schema_editor):
    Monster = apps.get_model("jdr", "Monster")
    Monster.objects.filter(campaign__isnull=True).update(is_global=True)


class Migration(migrations.Migration):
    dependencies = [
        ("jdr", "0026_gardenplot_fertilizer_gardenplot_mutation_count_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="monster",
            name="is_global",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(mark_campaignless_monsters_global, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="monster",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(is_global=True, campaign__isnull=True)
                    | models.Q(is_global=False, campaign__isnull=False)
                ),
                name="monster_has_exactly_one_scope",
            ),
        ),
    ]
