import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from jdr.models import City, CityExport, CityImport, Resource


class Command(BaseCommand):
    help = 'Seed economy data (cities, resources, exports, imports) from a JSON fixture file.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='jdr/fixtures/economy.json',
            help='Path to the economy JSON fixture file (relative to backend/)',
        )

    def handle(self, *args, **options):
        fixture_path = Path(options['file'])
        if not fixture_path.is_absolute():
            fixture_path = Path(__file__).resolve().parents[3] / fixture_path

        if not fixture_path.exists():
            raise CommandError(f'Fixture file not found: {fixture_path}')

        with open(fixture_path, encoding='utf-8') as f:
            data = json.load(f)

        # 1. Cities
        cities_data = data.get('cities', [])
        city_map: dict[str, City] = {}
        for c in cities_data:
            city, _ = City.objects.update_or_create(
                name=c['name'],
                defaults={'description': c.get('description', '')},
            )
            city_map[city.name] = city
        self.stdout.write(f'  {len(city_map)} villes chargées.')

        # 2. Resources
        resources_data = data.get('resources', [])
        resource_map: dict[str, Resource] = {}
        for r in resources_data:
            resource, _ = Resource.objects.update_or_create(
                name=r['name'],
                craft_type=r['craft_type'],
                defaults={
                    'base_price': r['base_price'],
                    'unit': r['unit'],
                    'availability': r.get('availability', 'Commun'),
                },
            )
            resource_map[resource.name] = resource
        self.stdout.write(f'  {len(resource_map)} ressources chargées.')

        # 3. Exports
        exports_data = data.get('exports', [])
        export_count = 0
        for e in exports_data:
            city = city_map.get(e['city'])
            resource = resource_map.get(e['resource'])
            if not city or not resource:
                self.stderr.write(
                    f'  SKIP export: city={e["city"]}, resource={e["resource"]} — introuvable'
                )
                continue
            CityExport.objects.update_or_create(
                city=city,
                resource=resource,
                defaults={
                    'price': e['price'],
                    'availability': e.get('availability', resource.availability),
                },
            )
            export_count += 1
        self.stdout.write(f'  {export_count} exports chargés.')

        # 4. Imports
        imports_data = data.get('imports', [])
        import_count = 0
        for i in imports_data:
            city = city_map.get(i['city'])
            resource = resource_map.get(i['resource'])
            origin = city_map.get(i.get('origin_city', ''))
            if not city or not resource:
                self.stderr.write(
                    f'  SKIP import: city={i["city"]}, resource={i["resource"]} — introuvable'
                )
                continue
            if not origin:
                # Try to find origin from exports
                export = CityExport.objects.filter(resource=resource).first()
                origin = export.city if export else city
            CityImport.objects.update_or_create(
                city=city,
                resource=resource,
                origin_city=origin,
                defaults={'price': i['price']},
            )
            import_count += 1
        self.stdout.write(f'  {import_count} imports chargés.')

        self.stdout.write(self.style.SUCCESS('Seed economy terminé avec succès !'))
