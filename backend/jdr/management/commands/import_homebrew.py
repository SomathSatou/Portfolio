"""
Import Homebrew JSON character files into the JDR database.

Usage:
    python manage.py import_homebrew --source "path/to/folder" --player tomsa
    python manage.py import_homebrew --source "path/to/folder" --player tomsa --campaign 1
    python manage.py import_homebrew --source "path/to/folder" --player tomsa --dry-run
"""
import json
import re
import uuid
from decimal import Decimal
from pathlib import Path

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from jdr.models import (
    Campaign, Character, CharacterItem, CharacterSpell, CharacterStat,
    Item, Spell, Stat,
)

# ─── Constants ────────────────────────────────────────────────────────────────

RARITY_COLOR_MAP = {
    '#626262': 'commun',
    '#27ae60': 'peu_commun',
    '#2980b9': 'rare',
    '#8e44ad': 'très_rare',
    '#e67e22': 'légendaire',
    '#b60e16': 'artéfact',
}

ITEM_TYPE_MAP = {
    'weapon': 'Arme',
    'armor': 'Armure',
    'magic': 'Objet magique',
    'other': 'Divers',
    'mount': 'Monture',
}

STAT_TEMPLATE_ORDER = [
    'Intuition', 'Intelligence', 'Charisme', 'Adresse',
    'Force', 'Chance', 'Constitution',
]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def strip_html(html: str) -> str:
    """Remove HTML tags, keeping text content."""
    if not html:
        return ''
    text = re.sub(r'<br\s*/?>', '\n', html)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def parse_price(raw) -> Decimal:
    """Parse price from Homebrew JSON (string or number)."""
    if raw is None:
        return Decimal('0')
    try:
        return Decimal(str(raw))
    except Exception:
        return Decimal('0')


def parse_mana_cost(characteristic: dict) -> int:
    """Extract mana cost from spell characteristic.energyCost."""
    energy_costs = characteristic.get('energyCost', [])
    total = 0
    for ec in energy_costs:
        try:
            total += int(ec.get('cost', 0))
        except (ValueError, TypeError):
            pass
    return total


def extract_item_properties(item_data: dict) -> dict:
    """Build properties dict from Homebrew item characteristic + extra fields."""
    props = {}
    char = item_data.get('characteristic', {})
    if char:
        if 'damage' in char:
            props['damage'] = char['damage']
        if 'range' in char:
            props['range'] = char['range']
        if 'armorpoint' in char:
            props['armor_point'] = char['armorpoint']
        if 'charges' in char:
            props['charges'] = char['charges']
    if item_data.get('icon'):
        props['icon'] = item_data['icon']
    return props


class Command(BaseCommand):
    help = 'Import Homebrew JSON character files into the JDR database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source', type=str,
            default=r'f:\Lug\archives\ImportPortfolio',
            help='Folder containing *-Homebrew.json files',
        )
        parser.add_argument(
            '--player', type=str, required=True,
            help='Django username to assign characters to',
        )
        parser.add_argument(
            '--campaign', type=int, default=None,
            help='Campaign ID (optional). If set, items/spells/stats are also imported.',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Preview what would be imported without writing to DB.',
        )

    def handle(self, *args, **options):
        source = Path(options['source'])
        dry_run = options['dry_run']

        if not source.is_dir():
            raise CommandError(f'Source folder not found: {source}')

        # Resolve player
        try:
            player = User.objects.get(username=options['player'])
        except User.DoesNotExist:
            raise CommandError(f"User '{options['player']}' not found.")

        # Resolve campaign (optional)
        campaign = None
        if options['campaign']:
            try:
                campaign = Campaign.objects.get(pk=options['campaign'])
            except Campaign.DoesNotExist:
                raise CommandError(f"Campaign with id={options['campaign']} not found.")

        json_files = sorted(source.glob('*-Homebrew.json'))
        if not json_files:
            raise CommandError(f'No *-Homebrew.json files found in {source}')

        self.stdout.write(f'Found {len(json_files)} Homebrew JSON files.')
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no changes will be written.'))

        for jf in json_files:
            self.stdout.write(f'\n{"="*60}')
            self.stdout.write(f'Processing: {jf.name}')
            self._import_file(jf, player, campaign, dry_run)

        self.stdout.write(self.style.SUCCESS('\nImport terminé !'))

    # ─── Per-file import ──────────────────────────────────────────────────

    def _import_file(self, path: Path, player: User, campaign, dry_run: bool):
        with open(path, encoding='utf-8') as f:
            data = json.load(f)

        co = data.get('characterObj', {})
        template = co.get('template', data.get('template', {}))

        # ── Character basic info ──────────────────────────────────────────
        name = co.get('nameCharacter', path.stem.split('-')[0].strip())
        level_data = co.get('level', {})
        level = level_data.get('value', 1) if isinstance(level_data, dict) else 1

        info = co.get('info', {})
        origin = info.get('info10', {}).get('value', '')
        class_type = info.get('info11', {}).get('value', '')

        biography = strip_html(co.get('biography', ''))
        description_parts = []
        if origin:
            description_parts.append(f'Origine : {origin}')
        if biography:
            description_parts.append(biography)

        # Passive skills
        passive_skills = co.get('passiveSkills', {}).get('passiveSkills1', {})
        if passive_skills:
            skills_lines = ['── Compétences passives ──']
            for sk_id, sk in passive_skills.items():
                if not isinstance(sk, dict):
                    continue
                sk_name = sk.get('name', '')
                sk_desc = strip_html(sk.get('desc', ''))
                if sk_name:
                    skills_lines.append(f'\n🎯 {sk_name}')
                    if sk_desc:
                        skills_lines.append(sk_desc)
                    self.stdout.write(f'    Skill: {sk_name}')
            description_parts.append('\n'.join(skills_lines))

        description = '\n\n'.join(description_parts)

        # Currency
        currency = co.get('inventory', {}).get('currency', [])
        gold, silver, copper = 0, 0, 0
        for c in currency:
            unit = c.get('unit', 0)
            val = int(c.get('value', 0))
            if unit == 1:
                gold = val
            elif unit == 0.1:
                silver = val
            elif unit == 0.01:
                copper = val

        self.stdout.write(
            f'  Character: {name} (lvl {level}, {class_type or "?"}) '
            f'— {gold}g {silver}s {copper}c'
        )

        if dry_run:
            character = None
        else:
            character, created = Character.objects.update_or_create(
                name=name, player=player,
                defaults={
                    'level': level,
                    'class_type': class_type,
                    'description': description,
                    'campaign': campaign,
                    'gold': gold,
                    'silver': silver,
                    'copper': copper,
                },
            )
            action = 'created' if created else 'updated'
            self.stdout.write(f'    → Character {action} (id={character.id})')

        # ── Items ─────────────────────────────────────────────────────────
        if campaign:
            items_data = co.get('inventory', {}).get('items', {})
            self._import_items(items_data, campaign, character, dry_run)

            # ── Spells ────────────────────────────────────────────────────
            spells_data = co.get('spellBook', {}).get('spells', {})
            self._import_spells(spells_data, campaign, character, dry_run)

            # ── Stats ─────────────────────────────────────────────────────
            self._import_stats(co, template, campaign, character, dry_run)
        else:
            items_count = len(co.get('inventory', {}).get('items', {}))
            spells_count = len(co.get('spellBook', {}).get('spells', {}))
            if items_count or spells_count:
                self.stdout.write(self.style.WARNING(
                    f'    ⚠ Skipping {items_count} items, {spells_count} spells '
                    f'(no --campaign specified)'
                ))

    # ─── Items ────────────────────────────────────────────────────────────

    def _import_items(self, items_data: dict, campaign, character, dry_run: bool):
        count = 0
        for item_id, item in items_data.items():
            item_name = item.get('name', '').strip()
            if not item_name:
                continue

            rarity_color = item.get('rarity', '#626262')
            rarity = RARITY_COLOR_MAP.get(rarity_color, 'commun')
            item_type_raw = item.get('type', 'other')
            item_type = ITEM_TYPE_MAP.get(item_type_raw, item_type_raw.capitalize())
            description = strip_html(item.get('description', ''))
            price = parse_price(item.get('price', 0))
            weight = Decimal(str(item.get('weight', 0)))
            is_magical = item_type_raw == 'magic'
            properties = extract_item_properties(item)
            quantity = int(item.get('quantity', 1))
            is_equipped = bool(item.get('worn', False))

            self.stdout.write(
                f'    Item: {item_name} ({rarity}, {item_type}) '
                f'×{quantity} — {price} PO'
            )

            if dry_run:
                count += 1
                continue

            db_item, created = Item.objects.update_or_create(
                campaign=campaign, name=item_name,
                defaults={
                    'description': description,
                    'rarity': rarity,
                    'item_type': item_type,
                    'weight': weight,
                    'value': price,
                    'properties': properties,
                    'is_magical': is_magical,
                },
            )

            if character:
                CharacterItem.objects.update_or_create(
                    character=character, item=db_item,
                    defaults={
                        'quantity': quantity,
                        'is_equipped': is_equipped,
                    },
                )
            count += 1

        self.stdout.write(f'    → {count} items processed')

    # ─── Spells ───────────────────────────────────────────────────────────

    def _import_spells(self, spells_data: dict, campaign, character, dry_run: bool):
        count = 0
        for spell_id, spell in spells_data.items():
            spell_name = spell.get('name', '').strip()
            if not spell_name:
                continue

            description = strip_html(spell.get('description', ''))
            char_data = spell.get('characteristic', {})
            mana_cost = parse_mana_cost(char_data)
            range_distance = str(char_data.get('range', ''))
            casting_time = str(char_data.get('castingTime', ''))
            school = str(char_data.get('tag', ''))
            damage = str(spell.get('effect', ''))

            # Build extra from remaining characteristic fields
            extra = {}
            for k, v in char_data.items():
                if k not in ('range', 'castingTime', 'tag', 'energyCost'):
                    extra[k] = v

            self.stdout.write(
                f'    Spell: {spell_name} (mana={mana_cost}, '
                f'range={range_distance}, dmg={damage})'
            )

            if dry_run:
                count += 1
                continue

            db_spell, created = Spell.objects.update_or_create(
                campaign=campaign, name=spell_name,
                defaults={
                    'description': description,
                    'mana_cost': mana_cost,
                    'damage': damage,
                    'range_distance': range_distance,
                    'casting_time': casting_time,
                    'school': school,
                    'extra': extra,
                },
            )

            if character:
                CharacterSpell.objects.get_or_create(
                    character=character, spell=db_spell,
                )
            count += 1

        self.stdout.write(f'    → {count} spells processed')

    # ─── Stats ────────────────────────────────────────────────────────────

    def _import_stats(self, co: dict, template: dict, campaign, character, dry_run: bool):
        # Get stat names from template
        asbonus_template = template.get('asbonus1', {})
        stat_names = [s.get('labelName', '') for s in asbonus_template.get('as', [])]
        if not stat_names:
            stat_names = STAT_TEMPLATE_ORDER

        # Get stat values from characterObj
        asbonus = co.get('asbonus', {}).get('asbonus1', {})

        count = 0
        for i, stat_name in enumerate(stat_names):
            if not stat_name:
                continue

            bonus_key = f'asbonus{i}'
            stat_entry = asbonus.get(bonus_key, {})
            value = int(stat_entry.get('base', 0))

            self.stdout.write(f'    Stat: {stat_name} = {value}')

            if dry_run:
                count += 1
                continue

            db_stat, _ = Stat.objects.get_or_create(
                campaign=campaign, name=stat_name,
                defaults={'display_order': i},
            )

            if character:
                CharacterStat.objects.update_or_create(
                    character=character, stat=db_stat,
                    defaults={'value': value},
                )
            count += 1

        self.stdout.write(f'    → {count} stats processed')
