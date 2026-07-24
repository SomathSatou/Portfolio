import random
from decimal import Decimal
from typing import Any

from django.db import transaction

from jdr.models import (
    AlchemyPlant,
    DiscoveredRecipe,
    GardenPlot,
    GardenUpgrade,
    HarvestLog,
    Notification,
    PlantMutationRecipe,
    PlotMutationLog,
)

RARITY_BASE_PROBABILITY: dict[str, float] = {
    'Commune': 0.05,
    'Peu commune': 0.01,
    'Rare': 0.001,
    'Très rare': 0.0001,
    'Légendaire': 0.00001,
}

FERTILIZER_BONUS: dict[str, float] = {
    'compost': 0.005,
    'azote': 0.01,
    'cendre_magique': 0.015,
    'rosée': 0.02,
    'sang_bête': 0.025,
}

SOIL_BONUS: dict[str, float] = {
    'humus': 0.01,
    'cendres': 0.015,
    'fertile': 0.02,
}

ADJACENCY_SAME_CATEGORY_BONUS = 0.005


def _plot_coordinates(plot: GardenPlot) -> tuple[int, int]:
    """Calcule les coordonnees (colonne, ligne) d'une parcelle dans la grille."""
    try:
        upgrade = plot.character.garden_upgrade
    except GardenUpgrade.DoesNotExist:
        upgrade = GardenUpgrade.objects.create(character=plot.character)
    columns = max(upgrade.grid_columns, 1)
    index = plot.plot_number - 1
    return index % columns, index // columns


def build_neighbor_matrix(plot: GardenPlot) -> list[list[Any]]:
    """Construit la matrice 3x3 des plantes autour d'une parcelle.

    Chaque case contient l'ID de la plante ou None si vide/hors grille.
    La case centrale [1][1] correspond a la parcelle recoltee.
    """
    character = plot.character
    try:
        upgrade = character.garden_upgrade
    except GardenUpgrade.DoesNotExist:
        upgrade = GardenUpgrade.objects.create(character=character)
    columns = max(upgrade.grid_columns, 1)

    plots = GardenPlot.objects.filter(character=character)
    plot_map: dict[tuple[int, int], GardenPlot] = {}
    for p in plots:
        idx = p.plot_number - 1
        plot_map[(idx % columns, idx // columns)] = p

    center_x, center_y = _plot_coordinates(plot)
    matrix: list[list[Any]] = [[None for _ in range(3)] for _ in range(3)]

    for dy in range(-1, 2):
        for dx in range(-1, 2):
            grid_x = center_x + dx
            grid_y = center_y + dy
            target = plot_map.get((grid_x, grid_y))
            matrix[dy + 1][dx + 1] = target.plant_id if target and target.plant_id else None

    matrix[1][1] = plot.plant_id
    return matrix


def _pattern_matches(pattern: list[list[Any]], matrix: list[list[Any]]) -> bool:
    """Verifie si un pattern 3x3 correspond a la matrice extraite."""
    if len(pattern) != 3:
        return False
    for row in range(3):
        if len(pattern[row]) != 3:
            return False
        for col in range(3):
            expected = pattern[row][col]
            actual = matrix[row][col]
            if expected is None:
                continue
            if isinstance(expected, int):
                if actual != expected:
                    return False
            elif isinstance(expected, str) and expected.startswith('category:'):
                category = expected.split(':', 1)[1]
                if actual is None:
                    return False
                try:
                    plant = AlchemyPlant.objects.get(pk=actual)
                except AlchemyPlant.DoesNotExist:
                    return False
                if plant.category != category:
                    return False
            else:
                if actual != expected:
                    return False
    return True


def _recipe_specificity_score(recipe: PlantMutationRecipe) -> int:
    """Score de specificite d'une recette : nombre de cases contraintes."""
    pattern = recipe.pattern or []
    score = 0
    for row in pattern:
        if isinstance(row, list):
            for cell in row:
                if cell is not None:
                    score += 1
    return score


def find_matching_recipes(plot: GardenPlot) -> list[PlantMutationRecipe]:
    """Trouve toutes les recettes correspondant au voisinage d'une parcelle."""
    matrix = build_neighbor_matrix(plot)
    recipes: list[PlantMutationRecipe] = []

    for recipe in PlantMutationRecipe.objects.select_related('result_plant').all():
        if recipe.required_soil and plot.soil_type != recipe.required_soil:
            continue
        if recipe.required_fertilizer and plot.fertilizer != recipe.required_fertilizer:
            continue
        if _pattern_matches(recipe.pattern or [], matrix):
            recipes.append(recipe)

    recipes.sort(key=_recipe_specificity_score, reverse=True)
    return recipes


def _count_adjacent_same_category(plot: GardenPlot, matrix: list[list[Any]]) -> int:
    """Compte les voisins orthogonaux de la meme categorie que la plante cible."""
    plant = plot.plant
    if not plant:
        return 0
    target_category = plant.category
    count = 0
    adjacent_positions = [(0, 1), (1, 0), (1, 2), (2, 1)]
    for row, col in adjacent_positions:
        plant_id = matrix[row][col]
        if plant_id is None:
            continue
        try:
            neighbor = AlchemyPlant.objects.get(pk=plant_id)
        except AlchemyPlant.DoesNotExist:
            continue
        if neighbor.category == target_category:
            count += 1
    return count


def compute_mutation_probability(recipe: PlantMutationRecipe, plot: GardenPlot) -> float:
    """Calcule la probabilite finale de mutation pour une recette donnee."""
    result_plant = recipe.result_plant
    base = RARITY_BASE_PROBABILITY.get(result_plant.rarity, 0.0001)

    bonus = 0.0
    if plot.fertilizer and plot.fertilizer in FERTILIZER_BONUS:
        bonus += FERTILIZER_BONUS[plot.fertilizer]
    if plot.soil_type in SOIL_BONUS:
        bonus += SOIL_BONUS[plot.soil_type]

    matrix = build_neighbor_matrix(plot)
    same_category_count = _count_adjacent_same_category(plot, matrix)
    bonus += same_category_count * ADJACENCY_SAME_CATEGORY_BONUS

    return min(base + bonus, 0.5)


@transaction.atomic
def resolve_harvest(plot: GardenPlot, session: int) -> dict[str, Any]:
    """Determine le resultat d'une recolte avec eventuelle mutation.

    Retourne un dict avec les cles :
      - harvested_plant : AlchemyPlant initialement plantee
      - result_plant : AlchemyPlant obtenue (peut etre egale a harvested_plant)
      - mutated : bool
      - new_recipe : bool
      - recipe : PlantMutationRecipe ou None
      - roll : float
      - success : bool
      - quantity : int
    """
    if not plot.plant:
        raise ValueError("La parcelle ne contient aucune plante.")

    harvested_plant = plot.plant
    result_plant = harvested_plant
    mutated = False
    new_recipe = False
    matched_recipe: PlantMutationRecipe | None = None
    roll = 1.0
    success = False

    recipes = find_matching_recipes(plot)

    if recipes:
        matched_recipe = recipes[0]
        roll = random.random()
        probability = compute_mutation_probability(matched_recipe, plot)
        success = roll < probability

        if success:
            result_plant = matched_recipe.result_plant
            mutated = True

        discovered, created = DiscoveredRecipe.objects.get_or_create(
            character=plot.character,
            recipe=matched_recipe,
            defaults={'times_triggered': 0},
        )
        discovered.times_triggered += 1
        discovered.save(update_fields=['times_triggered'])
        new_recipe = created

        PlotMutationLog.objects.create(
            plot=plot,
            harvested_plant=harvested_plant,
            result_plant=result_plant if mutated else None,
            recipe_used=matched_recipe,
            roll_value=roll,
            success=success,
            session=session,
        )

    quantity = result_plant.yield_amount

    if mutated:
        Notification.objects.create(
            recipient=plot.character.player,
            title='Mutation botanique !',
            message=f'Une mutation a produit {result_plant.icon} {result_plant.name} ({result_plant.rarity}).',
            notification_type='success',
        )
        if new_recipe:
            hint = matched_recipe.discovery_hint if matched_recipe else ''
            Notification.objects.create(
                recipient=plot.character.player,
                title='Nouvelle recette decouverte !',
                message=f'Vous avez decouvert la recette de {result_plant.icon} {result_plant.name}. {hint}',
                notification_type='info',
            )

    return {
        'harvested_plant': harvested_plant,
        'result_plant': result_plant,
        'mutated': mutated,
        'new_recipe': new_recipe,
        'recipe': matched_recipe,
        'roll': roll,
        'success': success,
        'quantity': quantity,
    }


@transaction.atomic
def harvest_plot(plot: GardenPlot, session: int) -> dict[str, Any]:
    """Effectue la recolte complete d'une parcelle et retourne le resultat."""
    if not plot.plant:
        raise ValueError("La parcelle ne contient aucune plante.")

    harvest_result = resolve_harvest(plot, session)
    result_plant = harvest_result['result_plant']
    quantity = harvest_result['quantity']

    HarvestLog.objects.create(
        character=plot.character,
        plant=result_plant,
        quantity=quantity,
        harvested_at_session=session,
    )

    plot.plant = None
    plot.planted_at_session = None
    plot.sessions_grown = 0
    plot.is_ready = False
    plot.status = 'empty'
    plot.fertilizer = ''
    plot.mutation_count += 1 if harvest_result['mutated'] else 0
    plot.save(update_fields=[
        'plant', 'planted_at_session', 'sessions_grown', 'is_ready',
        'status', 'fertilizer', 'mutation_count',
    ])

    return harvest_result
