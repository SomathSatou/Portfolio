import json

from django.core.management.base import BaseCommand
from django.db.models import Count, F
from django.db.models.functions import Lower

from jdr.models import (
    CharacterItem,
    Item,
    MerchantInventory,
    MerchantOrder,
    Monster,
    Resource,
    RuneDrawing,
)


class Command(BaseCommand):
    help = "Audite les incohérences de données JDR sans écrire en base."

    def add_arguments(self, parser):
        parser.add_argument("--json", action="store_true", dest="as_json")

    def handle(self, *args, **options):
        duplicate_resources = list(
            Resource.objects.annotate(normalized_name=Lower("name"))
            .values("normalized_name")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .order_by("normalized_name")
        )
        duplicate_resource_items = list(
            Item.objects.filter(resource__isnull=False)
            .values("campaign_id", "resource_id")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .order_by("campaign_id", "resource_id")
        )
        mirrored_stock = list(
            MerchantInventory.objects.filter(quantity__gt=0)
            .filter(
                character__character_items__item__resource_id=F("resource_id"),
                character__character_items__quantity__gt=0,
            )
            .values(
                "id",
                "character_id",
                "resource_id",
                "quantity",
                "character__character_items__id",
                "character__character_items__quantity",
                "character__character_items__item_id",
            )
            .order_by("character_id", "resource_id")
        )
        invalid_orders = list(
            MerchantOrder.objects.exclude(campaign_id=F("character__campaign_id"))
            .values("id", "campaign_id", "character_id", "character__campaign_id")
            .order_by("id")
        )
        invalid_runes = list(
            RuneDrawing.objects.exclude(campaign_id=F("character__campaign_id"))
            .values("id", "campaign_id", "character_id", "character__campaign_id")
            .order_by("id")
        )
        monsters_without_scope = list(
            Monster.objects.filter(campaign__isnull=True, is_global=False)
            .values("id", "name")
            .order_by("id")
        )
        invalid_quantities = {
            "character_items": list(
                CharacterItem.objects.filter(quantity__lt=0).values("id", "character_id", "item_id", "quantity")
            ),
            "merchant_inventory": list(
                MerchantInventory.objects.filter(quantity__lt=0).values("id", "character_id", "resource_id", "quantity")
            ),
        }
        report = {
            "duplicate_resources": duplicate_resources,
            "duplicate_resource_items": duplicate_resource_items,
            "mirrored_merchant_character_stock": mirrored_stock,
            "campaign_mismatches": {
                "merchant_orders": invalid_orders,
                "rune_drawings": invalid_runes,
            },
            "monsters_without_scope": monsters_without_scope,
            "negative_quantities": invalid_quantities,
        }
        if options["as_json"]:
            self.stdout.write(json.dumps(report, ensure_ascii=False, indent=2, default=str))
            return
        for section, entries in report.items():
            if isinstance(entries, dict):
                count = sum(len(value) for value in entries.values())
            else:
                count = len(entries)
            self.stdout.write(f"{section}: {count}")
