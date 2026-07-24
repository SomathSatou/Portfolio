from decimal import Decimal

from django.db import transaction

from jdr.models import Character, MerchantInventory, Resource


class InsufficientMerchantStockError(ValueError):
    pass


@transaction.atomic
def receive_delivery(
    *,
    character: Character,
    resource: Resource,
    quantity: int,
    unit_cost: Decimal,
) -> MerchantInventory:
    if quantity <= 0:
        raise ValueError("La quantité livrée doit être positive.")
    inventory, _ = MerchantInventory.objects.select_for_update().get_or_create(
        character=character,
        resource=resource,
        defaults={"quantity": 0, "average_buy_price": Decimal("0")},
    )
    existing_value = inventory.average_buy_price * inventory.quantity
    delivered_value = unit_cost * quantity
    inventory.quantity += quantity
    inventory.average_buy_price = (existing_value + delivered_value) / inventory.quantity
    inventory.save(update_fields=["quantity", "average_buy_price"])
    return inventory


@transaction.atomic
def remove_stock(
    *,
    character: Character,
    resource: Resource,
    quantity: int,
) -> MerchantInventory:
    if quantity <= 0:
        raise ValueError("La quantité retirée doit être positive.")
    try:
        inventory = MerchantInventory.objects.select_for_update().get(
            character=character,
            resource=resource,
        )
    except MerchantInventory.DoesNotExist as error:
        raise InsufficientMerchantStockError("Vous ne possédez pas cette ressource.") from error
    if inventory.quantity < quantity:
        raise InsufficientMerchantStockError(
            f"Stock insuffisant ({inventory.quantity} disponible(s))."
        )
    inventory.quantity -= quantity
    inventory.save(update_fields=["quantity"])
    return inventory
