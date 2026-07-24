from decimal import Decimal

from jdr.models import Character


COPPER_PER_GOLD = 100
SILVER_PER_GOLD = 10
COPPER_PER_SILVER = 10


class InsufficientFundsError(ValueError):
    pass


def total_copper(character: Character) -> int:
    return (
        character.gold * COPPER_PER_GOLD
        + character.silver * COPPER_PER_SILVER
        + character.copper
    )


def _break_down_copper(total: int) -> tuple[int, int, int]:
    gold = total // COPPER_PER_GOLD
    remainder = total % COPPER_PER_GOLD
    silver = remainder // COPPER_PER_SILVER
    copper = remainder % COPPER_PER_SILVER
    return gold, silver, copper


def add_to_wallet(character: Character, amount_gold: Decimal) -> None:
    if amount_gold < 0:
        raise ValueError("Le montant ajouté doit être positif.")
    total = total_copper(character) + int(amount_gold * COPPER_PER_GOLD)
    character.gold, character.silver, character.copper = _break_down_copper(total)
    character.save(update_fields=["gold", "silver", "copper"])


def subtract_from_wallet(character: Character, amount_gold: Decimal) -> None:
    if amount_gold < 0:
        raise ValueError("Le montant retiré doit être positif.")
    cost = int(amount_gold * COPPER_PER_GOLD)
    total = total_copper(character)
    if cost > total:
        raise InsufficientFundsError(
            f"Fonds insuffisants ({character.gold} po {character.silver} pa {character.copper} pc)."
        )
    character.gold, character.silver, character.copper = _break_down_copper(total - cost)
    character.save(update_fields=["gold", "silver", "copper"])
