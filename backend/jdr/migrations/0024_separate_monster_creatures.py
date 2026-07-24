import django.db.models.deletion
from django.db import migrations, models


def migrate_monsters_forward(apps, schema_editor):
    LegacyMonster = apps.get_model("jdr", "LegacyMonster")
    TmpMonster = apps.get_model("jdr", "TmpMonster")

    for legacy_monster in LegacyMonster.objects.select_related("character_ptr").iterator():
        monster = TmpMonster.objects.create(
            campaign_id=legacy_monster.campaign_id,
            name=legacy_monster.name,
            description=legacy_monster.description,
            hp=legacy_monster.hp,
            max_hp=legacy_monster.max_hp,
            armor_class=legacy_monster.armor_class,
            attack=legacy_monster.attack,
            damage=legacy_monster.damage,
            special_abilities=legacy_monster.special_abilities,
            challenge_rating=legacy_monster.challenge_rating,
            monster_type=legacy_monster.monster_type,
            image=legacy_monster.image,
            stats=legacy_monster.stats,
        )
        TmpMonster.objects.filter(pk=monster.pk).update(created_at=legacy_monster.created_at)

    LegacyMonster.objects.all().delete()


def migrate_monsters_backward(apps, schema_editor):
    Character = apps.get_model("jdr", "Character")
    LegacyMonster = apps.get_model("jdr", "LegacyMonster")
    Monster = apps.get_model("jdr", "Monster")

    for monster in Monster.objects.all().iterator():
        character = Character.objects.create(
            name=monster.name,
            campaign_id=monster.campaign_id,
            description=monster.description,
            hp=monster.hp,
            max_hp=monster.max_hp,
        )
        Character.objects.filter(pk=character.pk).update(created_at=monster.created_at)
        LegacyMonster.objects.create(
            character_ptr_id=character.pk,
            armor_class=monster.armor_class,
            attack=monster.attack,
            damage=monster.damage,
            special_abilities=monster.special_abilities,
            challenge_rating=monster.challenge_rating,
            monster_type=monster.monster_type,
            image=monster.image,
            stats=monster.stats,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("jdr", "0023_inventory_trade_integrity"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="Monster",
            new_name="LegacyMonster",
        ),
        migrations.CreateModel(
            name="TmpMonster",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True, default="")),
                ("hp", models.IntegerField(default=0)),
                ("max_hp", models.IntegerField(default=10)),
                ("armor_class", models.IntegerField(default=10, help_text="Classe d'armure")),
                ("attack", models.CharField(blank=True, default="", help_text="Attaque principale (ex: 1d20+5)", max_length=200)),
                ("damage", models.CharField(blank=True, default="", help_text="Dégâts (ex: 2d6+3)", max_length=200)),
                ("special_abilities", models.TextField(blank=True, default="", help_text="Capacités spéciales")),
                ("challenge_rating", models.CharField(blank=True, default="", help_text="Niveau de défi", max_length=20)),
                ("monster_type", models.CharField(blank=True, default="", help_text="Type (bête, mort-vivant, dragon…)", max_length=100)),
                ("image", models.ImageField(blank=True, null=True, upload_to="jdr/monsters/")),
                ("stats", models.JSONField(blank=True, default=dict, help_text="Stats campagne: {stat_id: value}")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("campaign", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="monsters", to="jdr.campaign")),
            ],
            options={
                "verbose_name": "Monstre",
                "verbose_name_plural": "Monstres",
                "ordering": ["name"],
            },
        ),
        migrations.RunPython(migrate_monsters_forward, migrate_monsters_backward),
        migrations.DeleteModel(
            name="LegacyMonster",
        ),
        migrations.RenameModel(
            old_name="TmpMonster",
            new_name="Monster",
        ),
    ]
