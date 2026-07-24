from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient, APITestCase

from .models import (
    AlchemyPlant, Campaign, Character, CharacterItem, City, CityExport, CityImport,
    GardenPlot, GardenUpgrade, Item, MerchantInventory, MerchantOrder, Monster,
    PlantMutationRecipe, PlotMutationLog, Resource, UserProfile,
)
from .services.merchant_inventory import InsufficientMerchantStockError, receive_delivery, remove_stock


class MonsterModelTests(TestCase):
    def test_monster_is_not_a_character(self):
        user = get_user_model().objects.create_user(username="mj-monster", password="password")
        campaign = Campaign.objects.create(name="Bestiaire", game_master=user)

        monster = Monster.objects.create(campaign=campaign, name="Gobelin", hp=7, max_hp=7)

        self.assertFalse(Character.objects.filter(name=monster.name).exists())
        self.assertEqual(monster.campaign, campaign)
        self.assertEqual(monster.max_hp, 7)


class MerchantInventoryServiceTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="merchant", password="password")
        campaign = Campaign.objects.create(name="Campagne", game_master=user)
        self.character = Character.objects.create(name="Marchand", player=user, campaign=campaign)
        self.resource = Resource.objects.create(
            name="Fer",
            craft_type="Forge",
            base_price=Decimal("10.00"),
            unit="lingot",
        )

    def test_delivery_updates_weighted_average_price(self):
        receive_delivery(
            character=self.character,
            resource=self.resource,
            quantity=2,
            unit_cost=Decimal("10.00"),
        )
        inventory = receive_delivery(
            character=self.character,
            resource=self.resource,
            quantity=1,
            unit_cost=Decimal("16.00"),
        )

        self.assertEqual(inventory.quantity, 3)
        self.assertEqual(inventory.average_buy_price, Decimal("12.00"))

    def test_removing_more_than_available_raises(self):
        receive_delivery(
            character=self.character,
            resource=self.resource,
            quantity=1,
            unit_cost=Decimal("10.00"),
        )

        with self.assertRaises(InsufficientMerchantStockError):
            remove_stock(character=self.character, resource=self.resource, quantity=2)


class MerchantDeliveryApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="mj", password="password")
        UserProfile.objects.create(user=self.user, role="mj")
        self.campaign = Campaign.objects.create(name="Campagne", game_master=self.user)
        self.character = Character.objects.create(
            name="Marchand",
            player=self.user,
            campaign=self.campaign,
        )
        self.resource = Resource.objects.create(
            name="Cuivre",
            craft_type="Forge",
            base_price=Decimal("8.00"),
            unit="lingot",
        )
        MerchantOrder.objects.create(
            character=self.character,
            campaign=self.campaign,
            resource=self.resource,
            quantity=3,
            buy_city=self._create_city(),
            buy_price_unit=Decimal("8.00"),
            status="in_transit",
            transit_sessions=1,
            sessions_remaining=1,
            created_at_session=0,
            total_cost=Decimal("24.00"),
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _create_city(self):
        from .models import City

        return City.objects.create(name="Angers")

    def test_advance_session_delivers_to_merchant_stock_only(self):
        response = self.client.post(f"/api/jdr/campaigns/{self.campaign.id}/advance-session/")

        self.assertEqual(response.status_code, 200)
        inventory = MerchantInventory.objects.get(character=self.character, resource=self.resource)
        self.assertEqual(inventory.quantity, 3)
        self.assertFalse(CharacterItem.objects.filter(character=self.character).exists())

    def test_campaign_inventory_rejects_non_positive_quantity(self):
        item = Item.objects.create(campaign=self.campaign, name="Lingot")

        response = self.client.post(
            f"/api/jdr/campaigns/{self.campaign.id}/inventory/",
            {"item_id": item.id, "quantity": 0},
            format="json",
        )

        self.assertEqual(response.status_code, 400)


class MerchantWalletAndSellTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="merchant-wallet", password="password")
        UserProfile.objects.create(user=self.user, role="joueur")
        self.campaign = Campaign.objects.create(name="Campagne", game_master=self.user)
        self.campaign.memberships.create(player=self.user, is_active=True)
        self.character = Character.objects.create(
            name="Marchand",
            player=self.user,
            campaign=self.campaign,
            class_type="Marchand",
            gold=100,
            silver=0,
            copper=0,
        )
        self.city = City.objects.create(name="Angers")
        self.sell_city = City.objects.create(name="Nantes")
        self.campaign.cities.add(self.city, self.sell_city)
        self.resource = Resource.objects.create(
            name="Cuivre",
            craft_type="Forge",
            base_price=Decimal("10.00"),
            unit="lingot",
            availability="Commun",
        )
        CityExport.objects.create(city=self.city, resource=self.resource, price=Decimal("8.00"), availability="Commun")
        CityImport.objects.create(
            city=self.sell_city,
            resource=self.resource,
            origin_city=self.city,
            price=Decimal("12.00"),
            availability="Rare",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_create_order_debits_wallet(self):
        initial_copper = self.character.gold * 100 + self.character.silver * 10 + self.character.copper

        response = self.client.post("/api/jdr/merchant/orders/", {
            "resource_id": self.resource.id,
            "quantity": 2,
            "buy_city_id": self.city.id,
            "character_id": self.character.id,
            "campaign_id": self.campaign.id,
        }, format="json")

        self.assertEqual(response.status_code, 201)
        self.character.refresh_from_db()
        final_copper = self.character.gold * 100 + self.character.silver * 10 + self.character.copper
        total_cost = Decimal(response.data["total_cost"])
        self.assertEqual(initial_copper - final_copper, int(total_cost * 100))

    def test_create_order_fails_with_insufficient_funds(self):
        self.character.gold = 5
        self.character.save(update_fields=["gold"])

        response = self.client.post("/api/jdr/merchant/orders/", {
            "resource_id": self.resource.id,
            "quantity": 2,
            "buy_city_id": self.city.id,
            "character_id": self.character.id,
            "campaign_id": self.campaign.id,
        }, format="json")

        self.assertEqual(response.status_code, 400)
        self.character.refresh_from_db()
        self.assertEqual(self.character.gold, 5)

    def test_sell_from_inventory_credits_wallet(self):
        initial_copper = self.character.gold * 100 + self.character.silver * 10 + self.character.copper
        receive_delivery(
            character=self.character,
            resource=self.resource,
            quantity=3,
            unit_cost=Decimal("8.00"),
        )

        response = self.client.post("/api/jdr/merchant/inventory/", {
            "character_id": self.character.id,
            "resource_id": self.resource.id,
            "quantity": 2,
            "sell_city_id": self.sell_city.id,
        }, format="json")

        self.assertEqual(response.status_code, 200)
        self.character.refresh_from_db()
        final_copper = self.character.gold * 100 + self.character.silver * 10 + self.character.copper
        revenue = Decimal(response.data["total_revenue"])
        self.assertGreater(revenue, 0)
        self.assertEqual(final_copper - initial_copper, int(revenue * 100))

    def test_partial_sell_of_delivered_order(self):
        order = MerchantOrder.objects.create(
            character=self.character,
            campaign=self.campaign,
            resource=self.resource,
            quantity=10,
            buy_city=self.city,
            buy_price_unit=Decimal("8.00"),
            status="delivered",
            transit_sessions=1,
            sessions_remaining=0,
            created_at_session=0,
            total_cost=Decimal("80.00"),
        )
        receive_delivery(
            character=self.character,
            resource=self.resource,
            quantity=10,
            unit_cost=Decimal("8.00"),
        )

        response = self.client.post(f"/api/jdr/merchant/orders/{order.id}/sell/", {
            "sell_city_id": self.sell_city.id,
            "quantity": 4,
        }, format="json")

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.quantity, 6)
        self.assertEqual(order.status, "delivered")
        self.assertTrue(MerchantOrder.objects.filter(status="sold", quantity=4).exists())


class GardenMutationServiceTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="gardener", password="password")
        self.campaign = Campaign.objects.create(name="Jardin", game_master=self.user)
        self.character = Character.objects.create(
            name="Cultivateur", player=self.user, campaign=self.campaign,
        )
        self.upgrade = GardenUpgrade.objects.create(character=self.character, max_plots=9, grid_columns=3)
        self.herb = AlchemyPlant.objects.create(
            name="Herbe base", category="Herbes", rarity="Commune", growth_time=1, yield_amount=2,
        )
        self.rare_flower = AlchemyPlant.objects.create(
            name="Fleur rare", category="Fleurs", rarity="Rare", growth_time=3, yield_amount=1,
        )
        for i in range(1, 10):
            GardenPlot.objects.create(character=self.character, plot_number=i)

    def _plant_at(self, plot_number: int, plant: AlchemyPlant):
        plot = GardenPlot.objects.get(character=self.character, plot_number=plot_number)
        plot.plant = plant
        plot.status = "growing"
        plot.save()

    def test_pattern_matches_with_int(self):
        from jdr.services.garden_mutations import _pattern_matches

        pattern = [
            [None, 1, None],
            [1, None, 1],
            [None, 1, None],
        ]
        matrix = [
            [2, 1, 2],
            [1, 3, 1],
            [2, 1, 2],
        ]
        self.assertTrue(_pattern_matches(pattern, matrix))

    def test_pattern_does_not_match_with_int(self):
        from jdr.services.garden_mutations import _pattern_matches

        pattern = [
            [None, 1, None],
            [1, None, 1],
            [None, 1, None],
        ]
        matrix = [
            [2, 2, 2],
            [2, 3, 2],
            [2, 2, 2],
        ]
        self.assertFalse(_pattern_matches(pattern, matrix))

    def test_find_matching_recipes(self):
        from jdr.services.garden_mutations import find_matching_recipes

        PlantMutationRecipe.objects.create(
            result_plant=self.rare_flower,
            pattern=[
                [None, None, None],
                [None, None, self.herb.id],
                [None, None, None],
            ],
        )
        center = GardenPlot.objects.get(character=self.character, plot_number=5)
        center.plant = self.herb
        center.status = "growing"
        center.save()
        # Neighbor at east
        east = GardenPlot.objects.get(character=self.character, plot_number=6)
        east.plant = self.herb
        east.save()

        recipes = find_matching_recipes(center)
        self.assertEqual(len(recipes), 1)
        self.assertEqual(recipes[0].result_plant, self.rare_flower)

    def test_resolve_harvest_creates_mutation_log(self):
        from jdr.services.garden_mutations import harvest_plot

        PlantMutationRecipe.objects.create(
            result_plant=self.rare_flower,
            pattern=[
                [None, None, None],
                [None, None, self.herb.id],
                [None, None, None],
            ],
        )
        center = GardenPlot.objects.get(character=self.character, plot_number=5)
        center.plant = self.herb
        center.status = "ready"
        center.is_ready = True
        center.save()
        east = GardenPlot.objects.get(character=self.character, plot_number=6)
        east.plant = self.herb
        east.save()

        result = harvest_plot(center, session=1)
        self.assertIn("result_plant", result)
        self.assertTrue(PlotMutationLog.objects.filter(plot=center).exists())

    def test_harvest_plot_clears_fertilizer(self):
        from jdr.services.garden_mutations import harvest_plot

        center = GardenPlot.objects.get(character=self.character, plot_number=5)
        center.plant = self.herb
        center.status = "ready"
        center.is_ready = True
        center.fertilizer = "compost"
        center.save()

        harvest_plot(center, session=1)
        center.refresh_from_db()
        self.assertEqual(center.fertilizer, "")
        self.assertEqual(center.status, "empty")
