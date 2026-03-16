"""
One-shot script to convert 'Calculs - Feuille 4.csv' into economy.json fixture.
Usage: python manage.py convert_csv_to_fixture --csv "../../Calculs - Feuille 4.csv"
"""
import csv
import json
import re
from pathlib import Path

from django.core.management.base import BaseCommand


def parse_price(raw: str) -> float:
    """Parse price strings like '3', '0,5', '2,5', '6,25'."""
    if not raw:
        return 0.0
    cleaned = raw.strip().replace('"', '').replace(',', '.')
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


class Command(BaseCommand):
    help = 'Convert the economy CSV into economy.json fixture for seed_economy.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv',
            type=str,
            default='../../Calculs - Feuille 4.csv',
            help='Path to the CSV file (relative to backend/)',
        )
        parser.add_argument(
            '--output',
            type=str,
            default='jdr/fixtures/economy.json',
            help='Output JSON path (relative to backend/)',
        )

    def handle(self, *args, **options):
        csv_path = Path(options['csv'])
        if not csv_path.is_absolute():
            csv_path = Path(__file__).resolve().parents[3] / csv_path

        output_path = Path(options['output'])
        if not output_path.is_absolute():
            output_path = Path(__file__).resolve().parents[3] / output_path

        if not csv_path.exists():
            self.stderr.write(f'CSV not found: {csv_path}')
            return

        with open(csv_path, encoding='utf-8') as f:
            reader = list(csv.reader(f))

        cities: dict[str, dict] = {}
        resources: dict[str, dict] = {}
        exports: list[dict] = []
        imports: list[dict] = []

        section = None  # 'resources', 'exports', 'imports'

        for row_num, row in enumerate(reader, 1):
            if not row or all(c.strip() == '' for c in row):
                continue

            # Detect section headers
            joined = ','.join(row).lower()
            if '## ressources' in joined:
                section = 'resources'
                continue
            elif '## exports' in joined:
                section = 'exports'
                continue
            elif '## imports' in joined:
                section = 'imports'
                continue

            # Skip header rows
            col0 = row[0].strip() if len(row) > 0 else ''
            col1 = row[1].strip() if len(row) > 1 else ''

            if col1 in ('Nom', 'Produit', '## Ressources et Matériaux', ''):
                if col0 == '' and col1 == '':
                    continue
                if col1 in ('Nom', 'Produit'):
                    continue

            # ─── Section: Ressources ───
            if section == 'resources' and col0 == 'Ressources':
                name = col1
                craft_type = row[2].strip() if len(row) > 2 else ''
                price_raw = row[3].strip() if len(row) > 3 else '0'
                unit = row[4].strip() if len(row) > 4 else 'unité'
                city_name = row[5].strip() if len(row) > 5 else ''
                availability = row[6].strip() if len(row) > 6 else 'Commun'
                export_city = row[7].strip() if len(row) > 7 else ''

                price = parse_price(price_raw)

                # Collect city
                if city_name and city_name != '#N/A':
                    cities.setdefault(city_name, {'name': city_name, 'description': ''})

                # Collect resource (use first occurrence as base, skip exact dupes)
                res_key = f'{name}|{craft_type}'
                if res_key not in resources:
                    resources[res_key] = {
                        'name': name,
                        'craft_type': craft_type,
                        'base_price': price,
                        'unit': unit,
                        'availability': availability,
                    }

            # ─── Section: Exports (Achat) ───
            elif section == 'exports' and col0 == 'Achat':
                name = col1
                craft_type = row[2].strip() if len(row) > 2 else ''
                price_raw = row[3].strip() if len(row) > 3 else '0'
                unit = row[4].strip() if len(row) > 4 else 'unité'
                city_name = row[5].strip() if len(row) > 5 else ''
                availability = row[6].strip() if len(row) > 6 else 'Commun'

                price = parse_price(price_raw)

                if city_name:
                    cities.setdefault(city_name, {'name': city_name, 'description': ''})

                # Find or create the resource
                res_key = f'{name}|{craft_type}'
                if res_key not in resources:
                    # Try matching by name only
                    found = False
                    for k, v in resources.items():
                        if k.startswith(f'{name}|'):
                            res_key = k
                            found = True
                            break
                    if not found:
                        resources[res_key] = {
                            'name': name,
                            'craft_type': craft_type,
                            'base_price': price,
                            'unit': unit,
                            'availability': availability,
                        }

                exports.append({
                    'city': city_name,
                    'resource': name,
                    'price': price,
                    'availability': availability,
                })

            # ─── Section: Imports (Ventes) ───
            elif section == 'imports' and col0 == 'Ventes':
                name = col1
                craft_type = row[2].strip() if len(row) > 2 else ''
                price_raw = row[3].strip() if len(row) > 3 else '0'
                unit = row[4].strip() if len(row) > 4 else 'unité'
                sell_city = row[5].strip() if len(row) > 5 else ''
                origin_city = row[6].strip() if len(row) > 6 else ''

                price = parse_price(price_raw)

                if sell_city:
                    cities.setdefault(sell_city, {'name': sell_city, 'description': ''})
                if origin_city:
                    cities.setdefault(origin_city, {'name': origin_city, 'description': ''})

                # Ensure resource exists
                res_key = f'{name}|{craft_type}'
                if res_key not in resources:
                    found = False
                    for k, v in resources.items():
                        if k.startswith(f'{name}|'):
                            found = True
                            break
                    if not found:
                        resources[res_key] = {
                            'name': name,
                            'craft_type': craft_type,
                            'base_price': price,
                            'unit': unit,
                            'availability': 'Commun',
                        }

                imports.append({
                    'city': sell_city,
                    'resource': name,
                    'price': price,
                    'origin_city': origin_city,
                })

        # Deduplicate exports (same city+resource → keep first/highest price)
        seen_exports: dict[str, dict] = {}
        for e in exports:
            key = f"{e['city']}|{e['resource']}"
            if key not in seen_exports:
                seen_exports[key] = e

        # Deduplicate imports (same city+resource+origin → keep first/highest price)
        seen_imports: dict[str, dict] = {}
        for i in imports:
            key = f"{i['city']}|{i['resource']}|{i['origin_city']}"
            if key not in seen_imports:
                seen_imports[key] = i

        # Build output
        output = {
            'cities': sorted(list(cities.values()), key=lambda c: c['name']),
            'resources': sorted(list(resources.values()), key=lambda r: r['name']),
            'exports': list(seen_exports.values()),
            'imports': list(seen_imports.values()),
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        self.stdout.write(self.style.SUCCESS(
            f'Conversion terminée !\n'
            f'  Villes : {len(output["cities"])}\n'
            f'  Ressources : {len(output["resources"])}\n'
            f'  Exports : {len(output["exports"])}\n'
            f'  Imports : {len(output["imports"])}\n'
            f'  Fichier : {output_path}'
        ))
