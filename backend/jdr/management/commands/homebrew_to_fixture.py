"""
Convert Homebrew JSON character files into a Django fixture file.

Generates a JSON fixture loadable with `python manage.py loaddata` in production,
without needing access to the Homebrew source files on the server.

The fixture references a Campaign and a User (player) by their PK.
- If the campaign already exists in prod, pass its PK with --campaign-pk.
- If creating a new campaign, omit --campaign-pk and provide --campaign-name.
- The player (--player-pk) must already exist in the prod DB.

Usage (dev machine):
    # Campaign already exists in prod (pk=1), player pk=1
    python manage.py homebrew_to_fixture \
        --source "f:\\Lug\\archives\\ImportPortfolio" \
        --player-pk 1 --campaign-pk 1

    # Create a new campaign in the fixture
    python manage.py homebrew_to_fixture \
        --source "f:\\Lug\\archives\\ImportPortfolio" \
        --player-pk 1 --campaign-name "Le Monde de Lug"

    # Include patches from session files
    python manage.py homebrew_to_fixture \
        --source "f:\\Lug\\archives\\ImportPortfolio" \
        --player-pk 1 --campaign-pk 1 \
        --patches jdr/patches/session_2002.json jdr/patches/session_2003.json

    # Dry run
    python manage.py homebrew_to_fixture --source ... --player-pk 1 --campaign-pk 1 --dry-run

Production:
    cd /var/www/Portfolio/backend
    source .venv/bin/activate
    python manage.py loaddata jdr/fixtures/homebrew.json
"""
import json
import re
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import TextIO

from django.core.management.base import BaseCommand, CommandError

NOW = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

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


def parse_price(raw) -> str:
    """Parse price, return as string for Decimal serialisation."""
    if raw is None:
        return '0.00'
    try:
        return str(Decimal(str(raw)).quantize(Decimal('0.01')))
    except Exception:
        return '0.00'


def parse_mana_cost(characteristic: dict) -> int:
    energy_costs = characteristic.get('energyCost', [])
    total = 0
    for ec in energy_costs:
        try:
            total += int(ec.get('cost', 0))
        except (ValueError, TypeError):
            pass
    return total


def _average_dice(dice_str: str) -> float:
    """Rough average damage from a dice string like '2d6+3' or '4d10'."""
    import re
    total = 0.0
    for match in re.finditer(r'(\d+)d(\d+)(?:\+(-?\d+))?', dice_str.lower()):
        count = int(match.group(1))
        sides = int(match.group(2))
        bonus = int(match.group(3)) if match.group(3) else 0
        total += count * (sides + 1) / 2 + bonus
    if total == 0:
        # Fallback: extract any integer as flat damage
        nums = re.findall(r'\d+', dice_str)
        if nums:
            total = sum(int(n) for n in nums) / len(nums)
    return max(1.0, total)


def extract_item_properties(item_data: dict) -> dict:
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
    help = (
        'Convert Homebrew JSON character files into a Django fixture file '
        'loadable with `python manage.py loaddata`.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--source', type=str,
            default=r'f:\Lug\archives\ImportPortfolio',
            help='Folder containing *-Homebrew.json files',
        )
        parser.add_argument(
            '--player-pk', type=int, required=True,
            help='PK of the Django User in the prod DB.',
        )
        parser.add_argument(
            '--campaign-pk', type=int, default=None,
            help='PK of an existing Campaign in prod. If omitted, a new campaign is created.',
        )
        parser.add_argument(
            '--campaign-name', type=str, default='',
            help='Campaign name (used only when creating a new campaign).',
        )
        parser.add_argument(
            '--campaign-desc', type=str, default='',
            help='Campaign description (used only when creating a new campaign).',
        )
        parser.add_argument(
            '--patches', type=str, nargs='*', default=[],
            help='Patch JSON files to apply after Homebrew import.',
        )
        parser.add_argument(
            '--monsters-source', type=str, default=r'F:\Lug\CharacterSheet\monstre',
            help='Folder containing *-Homebrew.json monster files',
        )
        parser.add_argument(
            '--output', type=str, default='jdr/fixtures/homebrew.json',
            help='Output fixture file path (relative to backend/).',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Preview what would be generated without writing the file.',
        )

    def handle(self, *args, **options):
        source = Path(options['source'])
        dry_run = options['dry_run']

        if not source.is_dir():
            raise CommandError(f'Source folder not found: {source}')

        json_files = sorted(source.glob('*-Homebrew.json'))
        if not json_files:
            raise CommandError(f'No *-Homebrew.json files found in {source}')

        campaign_pk = options['campaign_pk']
        create_campaign = campaign_pk is None
        if create_campaign and not options['campaign_name']:
            raise CommandError(
                'Provide --campaign-name when creating a new campaign '
                '(or --campaign-pk to reference an existing one).'
            )

        self.stdout.write(f'Found {len(json_files)} Homebrew JSON files.')
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — fixture will not be written.'))

        # ── Build fixture objects ─────────────────────────────────────────
        builder = FixtureBuilder(
            player_pk=options['player_pk'],
            campaign_pk=campaign_pk,
            campaign_name=options['campaign_name'],
            campaign_desc=options['campaign_desc'],
            create_campaign=create_campaign,
            stdout=self.stdout,
        )

        for jf in json_files:
            self.stdout.write(f'\n{"="*60}')
            self.stdout.write(f'Processing: {jf.name}')
            builder.process_file(jf)

        # ── Monster files ─────────────────────────────────────────────────
        monsters_source = Path(options['monsters_source'])
        if monsters_source.is_dir():
            monster_files = sorted(monsters_source.glob('*-Homebrew.json'))
            self.stdout.write(f'\nFound {len(monster_files)} monster files.')
            for jf in monster_files:
                self.stdout.write(f'\n{"="*60}')
                self.stdout.write(f'Processing monster: {jf.name}')
                builder.process_monster_file(jf)
        else:
            self.stdout.write(self.style.WARNING(f'Monster source not found: {monsters_source}'))

        # ── Apply patches ─────────────────────────────────────────────────
        for patch_path_str in options['patches']:
            patch_path = Path(patch_path_str)
            if not patch_path.is_absolute():
                cwd_path = Path.cwd() / patch_path
                backend_path = Path(__file__).resolve().parents[3] / patch_path
                patch_path = cwd_path if cwd_path.exists() else backend_path
            if not patch_path.exists():
                self.stdout.write(self.style.WARNING(f'Patch file not found: {patch_path}'))
                continue
            self.stdout.write(f'\n{"="*60}')
            self.stdout.write(f'Applying patch: {patch_path.name}')
            builder.apply_patch(patch_path)

        fixture = builder.to_fixture()
        self.stdout.write(f'\n{"─"*60}')
        self.stdout.write(f'Fixture entries: {len(fixture)}')

        # ── Write file ────────────────────────────────────────────────────
        if not dry_run:
            out_path = Path(options['output'])
            if not out_path.is_absolute():
                out_path = Path(__file__).resolve().parents[3] / out_path
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(fixture, f, ensure_ascii=False, indent=2)
            self.stdout.write(self.style.SUCCESS(f'\nFixture written to {out_path}'))
            self.stdout.write(self.style.SUCCESS(
                'Load in production with:\n'
                '  cd /var/www/Portfolio/backend\n'
                '  source .venv/bin/activate\n'
                '  python manage.py loaddata jdr/fixtures/homebrew.json'
            ))
        else:
            self.stdout.write(self.style.WARNING('DRY RUN — nothing written.'))


class FixtureBuilder:
    """
    Accumulates Django fixture entries with auto-incrementing PKs.

    Maintains dedup registries so that shared objects (spells, items, stats)
    are only emitted once even when referenced by multiple characters.
    """

    def __init__(self, player_pk: int, campaign_pk: int | None,
                 campaign_name: str, campaign_desc: str,
                 create_campaign: bool, stdout: TextIO):
        self.stdout = stdout
        self.player_pk = player_pk
        self.campaign_name = campaign_name
        self.campaign_desc = campaign_desc
        self.create_campaign = create_campaign

        # PK counters — high start values to avoid collisions with existing data
        # Campaign PK is either provided or auto-assigned
        self._pk = {
            'campaign': (campaign_pk or 1000) + 1,
            'character': 1000,
            'spell': 1000,
            'item': 1000,
            'stat': 1000,
            'passive_skill': 1000,
            'character_spell': 1000,
            'character_item': 1000,
            'character_stat': 1000,
            'character_passive_skill': 1000,
        }

        # Dedup registries: name → pk
        self._spells: dict[str, int] = {}
        self._items: dict[str, int] = {}
        self._stats: dict[str, int] = {}
        self._passive_skills: dict[str, int] = {}

        # Character name → pk (for patch resolution)
        self._characters: dict[str, int] = {}

        # Dedup character links: (char_pk, entity_pk) sets
        self._char_spells: set[tuple[int, int]] = set()
        self._char_items: set[tuple[int, int]] = set()
        self._char_stats: set[tuple[int, int]] = set()
        self._char_passive_skills: set[tuple[int, int]] = set()

        # Accumulated fixture entries
        self._entries: list[dict] = []

        # Campaign PK
        if campaign_pk is not None:
            self.campaign_pk = campaign_pk
        else:
            self.campaign_pk = self._next_pk('campaign')

    def _next_pk(self, model: str) -> int:
        pk = self._pk[model]
        self._pk[model] += 1
        return pk

    def _add(self, model: str, pk: int, fields: dict):
        self._entries.append({
            'model': f'jdr.{model}',
            'pk': pk,
            'fields': fields,
        })

    def to_fixture(self) -> list[dict]:
        """Return the complete fixture as a list, with campaign first if new."""
        result = []
        if self.create_campaign:
            result.append({
                'model': 'jdr.campaign',
                'pk': self.campaign_pk,
                'fields': {
                    'name': self.campaign_name,
                    'description': self.campaign_desc,
                    'game_master': self.player_pk,
                    'is_active': True,
                    'current_session_number': 0,
                    'session_active': False,
                    'created_at': NOW,
                },
            })
        return result + self._entries

    # ─── Per-file processing ──────────────────────────────────────────────

    def process_file(self, path: Path):
        with open(path, encoding='utf-8') as f:
            data = json.load(f)

        co = data.get('characterObj', {})
        template = co.get('template', data.get('template', {}))

        # ── Character info ────────────────────────────────────────────────
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

        # ── Gauges (HP / MP) ──────────────────────────────────────────────
        gauges = co.get('gauges', {})
        hp = max(0, int(gauges.get('gauge0_0', {}).get('value', 0) or 0))
        max_hp = max(0, int(gauges.get('gauge0_0', {}).get('base', hp) or hp))
        mp = max(0, int(gauges.get('gauge0_1', {}).get('value', 0) or 0))
        max_mp = max(0, int(gauges.get('gauge0_1', {}).get('base', mp) or mp))

        self.stdout.write(
            f'  Character: {name} (lvl {level}, {class_type or "?"}) '
            f'— {gold}g {silver}s {copper}c  HP={hp}/{max_hp} MP={mp}/{max_mp}'
        )

        char_pk = self._next_pk('character')
        self._characters[name] = char_pk
        self._add('character', char_pk, {
            'name': name,
            'player': self.player_pk,
            'campaign': self.campaign_pk,
            'class_type': class_type,
            'level': level,
            'description': description,
            'gold': gold,
            'silver': silver,
            'copper': copper,
            'hp': hp,
            'max_hp': max_hp,
            'mp': mp,
            'max_mp': max_mp,
            'created_at': NOW,
        })

        # ── Items ─────────────────────────────────────────────────────────
        items_data = co.get('inventory', {}).get('items', {})
        self._process_items(items_data, char_pk)

        # ── Spells ────────────────────────────────────────────────────────
        spells_data = co.get('spellBook', {}).get('spells', {})
        self._process_spells(spells_data, char_pk)

        # ── Passive Skills ────────────────────────────────────────────────
        passive_data = co.get('passiveSkills', {})
        self._process_passive_skills(passive_data, char_pk)

        # ── Stats ─────────────────────────────────────────────────────────
        self._process_stats(co, template, char_pk)

    def process_monster_file(self, path: Path):
        """Process a monster Homebrew JSON file into Character + Monster fixture entries."""
        with open(path, encoding='utf-8') as f:
            data = json.load(f)

        co = data.get('characterObj', {})
        template = co.get('template', data.get('template', {}))

        # ── Character info ────────────────────────────────────────────────
        name = co.get('nameCharacter', path.stem.split('-')[0].strip())
        level_data = co.get('level', {})
        level = level_data.get('value', 1) if isinstance(level_data, dict) else 1

        info = co.get('info', {})
        monster_type = info.get('info10', {}).get('value', '')
        alignment = info.get('info11', {}).get('value', '')

        biography = strip_html(co.get('biography', ''))
        description_parts = []
        if monster_type:
            description_parts.append(f'Type : {monster_type}')
        if alignment:
            description_parts.append(f'Alignement : {alignment}')
        if biography:
            description_parts.append(biography)
        description = '\n\n'.join(description_parts)

        # ── Gauges ────────────────────────────────────────────────────────
        gauges = co.get('gauges', {})
        hp = max(0, int(gauges.get('gauge0_0', {}).get('value', 0) or 0))
        max_hp = max(0, int(gauges.get('gauge0_0', {}).get('base', hp) or hp))
        mp = max(0, int(gauges.get('gauge0_1', {}).get('value', 0) or 0))
        max_mp = max(0, int(gauges.get('gauge0_1', {}).get('base', mp) or mp))

        # ── Stats ─────────────────────────────────────────────────────────
        asbonus = co.get('asbonus', {}).get('asbonus1', {})
        stats_json = {}
        for i, stat_name in enumerate(STAT_TEMPLATE_ORDER):
            bonus_key = f'asbonus{i}'
            stat_entry = asbonus.get(bonus_key, {})
            stats_json[stat_name] = int(stat_entry.get('base', 0))

        # ── Armor class ───────────────────────────────────────────────────
        armor_class = 10 + (stats_json.get('Constitution', 0) // 2)
        # Check for equipped armor with armor_point
        items_data = co.get('inventory', {}).get('items', {})
        for item_id, item in items_data.items():
            if item.get('type') == 'armor' and item.get('worn', False):
                ap = item.get('characteristic', {}).get('armorpoint', 0)
                try:
                    armor_class = max(armor_class, 10 + int(ap))
                except (ValueError, TypeError):
                    pass

        # ── Attack / Damage ─────────────────────────────────────────────
        # Prefer weapon damage, else strongest spell effect
        attack_dice = '1d20'
        damage_str = ''
        weapon_found = False
        for item_id, item in items_data.items():
            if item.get('type') == 'weapon' and item.get('worn', False):
                dmg = item.get('characteristic', {}).get('damage', '')
                if dmg:
                    damage_str = str(dmg)
                    weapon_found = True
                    break
        if not weapon_found:
            spells_data = co.get('spellBook', {}).get('spells', {})
            best_dmg = ''
            for spell_id, spell in spells_data.items():
                effect = str(spell.get('effect', ''))
                if effect and ('d' in effect or '+' in effect):
                    # Keep the one with highest dice count roughly
                    if len(effect) > len(best_dmg):
                        best_dmg = effect
            damage_str = best_dmg

        attack = f'{attack_dice}+{stats_json.get("Force", 0) // 2}' if stats_json.get('Force', 0) > 0 else attack_dice
        if not damage_str:
            damage_str = '1d4'

        # ── Special abilities ────────────────────────────────────────────
        passive_data = co.get('passiveSkills', {})
        special_parts = []
        for sk_id, sk in passive_data.items():
            if isinstance(sk, dict) and sk.get('name'):
                special_parts.append(f"{sk['name']}: {strip_html(sk.get('desc', ''))}")
        special_abilities = '\n'.join(special_parts)

        # ── Challenge rating (simple heuristic) ────────────────────────────
        # Based on HP pool and damage output relative to a level-1 PC (HP ~20, DPR ~5)
        pc_hp = 20 + (level - 1) * 8
        pc_dpr = 5 + (level - 1) * 2
        rounds_to_kill_pc = max(1, pc_hp / max(1, _average_dice(damage_str)))
        rounds_pc_to_kill = max(1, hp / max(1, pc_dpr))
        cr_score = (rounds_pc_to_kill / rounds_to_kill_pc) * level
        if cr_score < 0.5:
            challenge_rating = 'Faible'
        elif cr_score < 1.5:
            challenge_rating = 'Modéré'
        elif cr_score < 3:
            challenge_rating = 'Dangereux'
        elif cr_score < 6:
            challenge_rating = 'Légendaire'
        else:
            challenge_rating = 'Boss'

        self.stdout.write(
            f'  Monster: {name} (lvl {level}, {monster_type or "?"}) '
            f'HP={hp}/{max_hp} MP={mp}/{max_mp} AC={armor_class} CR={challenge_rating}'
        )

        char_pk = self._next_pk('character')
        self._characters[name] = char_pk
        self._add('character', char_pk, {
            'name': name,
            'player': None,
            'campaign': self.campaign_pk,
            'class_type': monster_type,
            'level': level,
            'description': description,
            'gold': 0,
            'silver': 0,
            'copper': 0,
            'hp': hp,
            'max_hp': max_hp,
            'mp': mp,
            'max_mp': max_mp,
            'created_at': NOW,
        })

        # Monster entry (same PK as Character for multi-table inheritance)
        self._add('monster', char_pk, {
            'armor_class': armor_class,
            'attack': attack,
            'damage': damage_str,
            'special_abilities': special_abilities,
            'challenge_rating': challenge_rating,
            'monster_type': monster_type,
            'stats': stats_json,
        })

        # ── Items, Spells, Passives, Stats ────────────────────────────────
        self._process_items(items_data, char_pk)
        spells_data = co.get('spellBook', {}).get('spells', {})
        self._process_spells(spells_data, char_pk)
        self._process_passive_skills(passive_data, char_pk)
        self._process_stats(co, template, char_pk)

    # ─── Items ────────────────────────────────────────────────────────────

    def _process_items(self, items_data: dict, char_pk: int):
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
            weight = parse_price(item.get('weight', 0))
            is_magical = item_type_raw == 'magic'
            properties = extract_item_properties(item)
            quantity = int(item.get('quantity', 1))
            is_equipped = bool(item.get('worn', False))

            # Dedup: only create item once per campaign
            if item_name not in self._items:
                item_pk = self._next_pk('item')
                self._items[item_name] = item_pk
                self._add('item', item_pk, {
                    'campaign': self.campaign_pk,
                    'name': item_name,
                    'description': description,
                    'rarity': rarity,
                    'item_type': item_type,
                    'weight': weight,
                    'value': price,
                    'properties': properties,
                    'is_magical': is_magical,
                    'created_at': NOW,
                })
            else:
                item_pk = self._items[item_name]

            # Character ↔ Item link (dedup)
            link_key = (char_pk, item_pk)
            if link_key not in self._char_items:
                self._char_items.add(link_key)
                ci_pk = self._next_pk('character_item')
                self._add('characteritem', ci_pk, {
                    'character': char_pk,
                    'item': item_pk,
                    'quantity': quantity,
                    'is_equipped': is_equipped,
                    'notes': '',
                    'acquired_at': NOW,
                })

            self.stdout.write(
                f'    Item: {item_name} ({rarity}) ×{quantity}'
            )
            count += 1

        self.stdout.write(f'    → {count} items')

    # ─── Spells ───────────────────────────────────────────────────────────

    def _process_spells(self, spells_data: dict, char_pk: int):
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

            extra = {}
            for k, v in char_data.items():
                if k not in ('range', 'castingTime', 'tag', 'energyCost'):
                    extra[k] = v

            if spell_name not in self._spells:
                spell_pk = self._next_pk('spell')
                self._spells[spell_name] = spell_pk
                self._add('spell', spell_pk, {
                    'campaign': self.campaign_pk,
                    'name': spell_name,
                    'description': description,
                    'level': 1,
                    'mana_cost': mana_cost,
                    'damage': damage,
                    'range_distance': range_distance,
                    'casting_time': casting_time,
                    'duration': '',
                    'school': school,
                    'extra': extra,
                    'created_at': NOW,
                })
            else:
                spell_pk = self._spells[spell_name]

            link_key = (char_pk, spell_pk)
            if link_key not in self._char_spells:
                self._char_spells.add(link_key)
                cs_pk = self._next_pk('character_spell')
                self._add('characterspell', cs_pk, {
                    'character': char_pk,
                    'spell': spell_pk,
                    'notes': '',
                    'acquired_at': NOW,
                })

            self.stdout.write(
                f'    Spell: {spell_name} (mana={mana_cost})'
            )
            count += 1

        self.stdout.write(f'    → {count} spells')

    # ─── Passive Skills ──────────────────────────────────────────────────

    def _process_passive_skills(self, passive_data: dict, char_pk: int):
        count = 0
        # Support nested structure: passiveSkills -> passiveSkills1 -> {id: {...}}
        entries = passive_data
        # If first value is another dict of passives, unwrap one level
        if entries:
            first_val = next(iter(entries.values()))
            if isinstance(first_val, dict) and not first_val.get('name') and any(isinstance(v, dict) for v in first_val.values()):
                entries = {}
                for container in passive_data.values():
                    if isinstance(container, dict):
                        entries.update(container)

        for sk_id, sk in entries.items():
            if not isinstance(sk, dict):
                continue
            sk_name = sk.get('name', '').strip()
            if not sk_name:
                continue

            sk_desc = strip_html(sk.get('desc', ''))

            if sk_name not in self._passive_skills:
                ps_pk = self._next_pk('passive_skill')
                self._passive_skills[sk_name] = ps_pk
                self._add('passiveskill', ps_pk, {
                    'campaign': self.campaign_pk,
                    'name': sk_name,
                    'description': sk_desc,
                    'extra': {},
                    'created_at': NOW,
                })
            else:
                ps_pk = self._passive_skills[sk_name]

            link_key = (char_pk, ps_pk)
            if link_key not in self._char_passive_skills:
                self._char_passive_skills.add(link_key)
                cps_pk = self._next_pk('character_passive_skill')
                self._add('characterpassiveskill', cps_pk, {
                    'character': char_pk,
                    'passive_skill': ps_pk,
                    'notes': '',
                    'acquired_at': NOW,
                })

            self.stdout.write(f'    PassiveSkill: {sk_name}')
            count += 1

        self.stdout.write(f'    → {count} passive skills')

    # ─── Stats ────────────────────────────────────────────────────────────

    def _process_stats(self, co: dict, template: dict, char_pk: int):
        asbonus_template = template.get('asbonus1', {})
        stat_names = [s.get('labelName', '') for s in asbonus_template.get('as', [])]
        if not stat_names:
            stat_names = STAT_TEMPLATE_ORDER

        asbonus = co.get('asbonus', {}).get('asbonus1', {})

        count = 0
        for i, stat_name in enumerate(stat_names):
            if not stat_name:
                continue

            bonus_key = f'asbonus{i}'
            stat_entry = asbonus.get(bonus_key, {})
            value = int(stat_entry.get('base', 0))

            if stat_name not in self._stats:
                stat_pk = self._next_pk('stat')
                self._stats[stat_name] = stat_pk
                self._add('stat', stat_pk, {
                    'campaign': self.campaign_pk,
                    'name': stat_name,
                    'display_order': i,
                })
            else:
                stat_pk = self._stats[stat_name]

            link_key = (char_pk, stat_pk)
            if link_key not in self._char_stats:
                self._char_stats.add(link_key)
                cstat_pk = self._next_pk('character_stat')
                self._add('characterstat', cstat_pk, {
                    'character': char_pk,
                    'stat': stat_pk,
                    'value': value,
                })

            self.stdout.write(f'    Stat: {stat_name} = {value}')
            count += 1

        self.stdout.write(f'    → {count} stats')

    # ─── Patch support ────────────────────────────────────────────────────

    def apply_patch(self, patch_path: Path):
        """Apply a declarative patch file, adding entries to the fixture."""
        with open(patch_path, encoding='utf-8') as f:
            patch_data = json.load(f)

        session = patch_data.get('session', '?')
        desc = patch_data.get('description', '')
        self.stdout.write(f'  Patch session {session}: {desc}')

        for patch in patch_data.get('patches', []):
            target_name = patch.get('target', '')
            char_pk = self._characters.get(target_name)
            if char_pk is None:
                self.stdout.write(f'  ⚠ Character "{target_name}" not found, skipping patch.')
                continue

            self.stdout.write(f'  Target: {target_name} (pk={char_pk})')

            for action in patch.get('actions', []):
                action_type = action.get('type', '')
                handler = getattr(self, f'_patch_{action_type}', None)
                if handler:
                    handler(char_pk, action)
                else:
                    self.stdout.write(f'    ⚠ Unknown patch action: {action_type}')

    def _patch_add_spell(self, char_pk: int, action: dict):
        spell_def = action.get('spell', {})
        spell_name = spell_def.get('name', '').strip()
        if not spell_name:
            return

        description = strip_html(spell_def.get('description', ''))
        char_data = spell_def.get('characteristic', {})
        mana_cost = parse_mana_cost(char_data)
        range_distance = str(char_data.get('range', ''))
        casting_time = str(char_data.get('castingTime', ''))
        school = str(char_data.get('tag', ''))
        damage = str(spell_def.get('effect', ''))

        extra = {}
        for k, v in char_data.items():
            if k not in ('range', 'castingTime', 'tag', 'energyCost'):
                extra[k] = v

        if spell_name not in self._spells:
            spell_pk = self._next_pk('spell')
            self._spells[spell_name] = spell_pk
            self._add('spell', spell_pk, {
                'campaign': self.campaign_pk,
                'name': spell_name,
                'description': description,
                'level': 1,
                'mana_cost': mana_cost,
                'damage': damage,
                'range_distance': range_distance,
                'casting_time': casting_time,
                'duration': '',
                'school': school,
                'extra': extra,
                'created_at': NOW,
            })
        else:
            spell_pk = self._spells[spell_name]

        link_key = (char_pk, spell_pk)
        if link_key in self._char_spells:
            self.stdout.write(f'    = Spell: {spell_name} (already linked)')
            return
        self._char_spells.add(link_key)
        cs_pk = self._next_pk('character_spell')
        self._add('characterspell', cs_pk, {
            'character': char_pk,
            'spell': spell_pk,
            'notes': '',
            'acquired_at': NOW,
        })
        self.stdout.write(f'    + Spell: {spell_name}')

    def _patch_add_item(self, char_pk: int, action: dict):
        item_def = action.get('item', {})
        item_name = item_def.get('name', '').strip()
        if not item_name:
            return

        rarity_color = item_def.get('rarity', '#626262')
        rarity = RARITY_COLOR_MAP.get(rarity_color, 'commun')
        item_type_raw = item_def.get('type', 'other')
        item_type = ITEM_TYPE_MAP.get(item_type_raw, item_type_raw.capitalize())
        description = strip_html(item_def.get('description', ''))
        price = parse_price(item_def.get('price', 0))
        weight = parse_price(item_def.get('weight', 0))
        is_magical = item_type_raw == 'magic'
        properties = item_def.get('characteristic', {})
        quantity = int(item_def.get('quantity', 1))
        is_equipped = bool(item_def.get('worn', False))

        if item_name not in self._items:
            item_pk = self._next_pk('item')
            self._items[item_name] = item_pk
            self._add('item', item_pk, {
                'campaign': self.campaign_pk,
                'name': item_name,
                'description': description,
                'rarity': rarity,
                'item_type': item_type,
                'weight': weight,
                'value': price,
                'properties': properties,
                'is_magical': is_magical,
                'created_at': NOW,
            })
        else:
            item_pk = self._items[item_name]

        link_key = (char_pk, item_pk)
        if link_key in self._char_items:
            self.stdout.write(f'    = Item: {item_name} (already linked)')
            return
        self._char_items.add(link_key)
        ci_pk = self._next_pk('character_item')
        self._add('characteritem', ci_pk, {
            'character': char_pk,
            'item': item_pk,
            'quantity': quantity,
            'is_equipped': is_equipped,
            'notes': '',
            'acquired_at': NOW,
        })
        self.stdout.write(f'    + Item: {item_name}')

    def _patch_add_skill(self, char_pk: int, action: dict):
        skill_def = action.get('skill', {})
        sk_name = skill_def.get('name', '').strip()
        if not sk_name:
            return

        sk_desc = strip_html(skill_def.get('desc', ''))

        if sk_name not in self._passive_skills:
            ps_pk = self._next_pk('passive_skill')
            self._passive_skills[sk_name] = ps_pk
            self._add('passiveskill', ps_pk, {
                'campaign': self.campaign_pk,
                'name': sk_name,
                'description': sk_desc,
                'extra': {},
                'created_at': NOW,
            })
        else:
            ps_pk = self._passive_skills[sk_name]

        link_key = (char_pk, ps_pk)
        if link_key in self._char_passive_skills:
            self.stdout.write(f'    = PassiveSkill: {sk_name} (already linked)')
            return
        self._char_passive_skills.add(link_key)
        cps_pk = self._next_pk('character_passive_skill')
        self._add('characterpassiveskill', cps_pk, {
            'character': char_pk,
            'passive_skill': ps_pk,
            'notes': '',
            'acquired_at': NOW,
        })
        self.stdout.write(f'    + PassiveSkill: {sk_name}')

    def _patch_update_currency(self, char_pk: int, action: dict):
        gold_delta = action.get('gold', 0)
        silver_delta = action.get('silver', 0)
        copper_delta = action.get('copper', 0)

        # Find and update the character entry in the accumulated fixture
        for entry in self._entries:
            if entry['model'] == 'jdr.character' and entry['pk'] == char_pk:
                entry['fields']['gold'] = entry['fields'].get('gold', 0) + gold_delta
                entry['fields']['silver'] = entry['fields'].get('silver', 0) + silver_delta
                entry['fields']['copper'] = entry['fields'].get('copper', 0) + copper_delta
                self.stdout.write(
                    f'    $ Currency: {gold_delta:+d}g {silver_delta:+d}s {copper_delta:+d}c '
                    f'→ {entry["fields"]["gold"]}g {entry["fields"]["silver"]}s {entry["fields"]["copper"]}c'
                )
                return
        self.stdout.write(f'    ⚠ Character pk={char_pk} not found for currency update')

    def _patch_set_field(self, char_pk: int, action: dict):
        field = action.get('field', '')
        value = action.get('value')

        field_map = {
            'level.value': 'level',
            'nameCharacter': 'name',
            'biography': 'description',
        }
        db_field = field_map.get(field, field)

        allowed_fields = {'name', 'level', 'class_type', 'description', 'gold', 'silver', 'copper', 'hp', 'max_hp', 'mp', 'max_mp'}
        if db_field not in allowed_fields:
            self.stdout.write(f'    ⚠ Field "{db_field}" not allowed, skipping.')
            return

        for entry in self._entries:
            if entry['model'] == 'jdr.character' and entry['pk'] == char_pk:
                old = entry['fields'].get(db_field)
                entry['fields'][db_field] = value
                self.stdout.write(f'    ✎ {db_field}: {old} → {value}')
                return
        self.stdout.write(f'    ⚠ Character pk={char_pk} not found for set_field')
