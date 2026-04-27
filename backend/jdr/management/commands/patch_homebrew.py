"""
Reusable patch system for Homebrew JSON files and/or the JDR database.

Reads a declarative JSON patch file and applies actions (add_spell, add_item,
add_skill, update_currency, set_field) to Homebrew JSON files and optionally
to the Django DB.

Usage:
    # Patch JSON files only
    python manage.py patch_homebrew \
        --patches jdr/patches/session_2002.json \
        --source "f:\\Lug\\archives\\ImportPortfolio"

    # Patch JSON files + DB
    python manage.py patch_homebrew \
        --patches jdr/patches/session_2002.json \
        --source "f:\\Lug\\archives\\ImportPortfolio" \
        --db --campaign 1

    # DB only (no JSON modifications)
    python manage.py patch_homebrew \
        --patches jdr/patches/session_2002.json \
        --db --campaign 1

    # Dry run
    python manage.py patch_homebrew \
        --patches jdr/patches/session_2002.json \
        --source "f:\\Lug\\archives\\ImportPortfolio" \
        --db --campaign 1 --dry-run
"""
import json
import re
import uuid
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

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
}


def strip_html(html: str) -> str:
    if not html:
        return ''
    text = re.sub(r'<br\s*/?>', '\n', html)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&nbsp;', ' ', text)
    return text.strip()


class Command(BaseCommand):
    help = 'Apply declarative patches to Homebrew JSON files and/or the JDR database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--patches', type=str, required=True,
            help='Path to the patches JSON file.',
        )
        parser.add_argument(
            '--source', type=str, default='',
            help='Folder containing *-Homebrew.json files (for JSON patching).',
        )
        parser.add_argument(
            '--db', action='store_true',
            help='Also apply patches to the Django database.',
        )
        parser.add_argument(
            '--campaign', type=int, default=None,
            help='Campaign ID (required when --db is used).',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Preview what would be changed without writing.',
        )

    def handle(self, *args, **options):
        patches_path = Path(options['patches'])
        if not patches_path.is_absolute():
            # Try relative to CWD first, then relative to backend/
            cwd_path = Path.cwd() / patches_path
            backend_path = Path(__file__).resolve().parents[3] / patches_path
            if cwd_path.exists():
                patches_path = cwd_path
            elif backend_path.exists():
                patches_path = backend_path
            else:
                patches_path = cwd_path  # will fail with clear error

        if not patches_path.exists():
            raise CommandError(f'Patches file not found: {patches_path}')

        with open(patches_path, encoding='utf-8') as f:
            patch_data = json.load(f)

        source = Path(options['source']) if options['source'] else None
        use_db = options['db']
        dry_run = options['dry_run']
        campaign = None

        if use_db:
            if not options['campaign']:
                raise CommandError('--campaign is required when using --db.')
            from jdr.models import Campaign as CampaignModel
            try:
                campaign = CampaignModel.objects.get(pk=options['campaign'])
            except CampaignModel.DoesNotExist:
                raise CommandError(f"Campaign id={options['campaign']} not found.")

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no changes will be written.'))

        session = patch_data.get('session', '?')
        desc = patch_data.get('description', '')
        self.stdout.write(f'Applying patches for session {session}: {desc}')

        # Load JSON files if source is provided
        json_files = {}
        if source and source.is_dir():
            for jf in source.glob('*-Homebrew.json'):
                with open(jf, encoding='utf-8') as f:
                    json_files[jf] = json.load(f)

        patches = patch_data.get('patches', [])
        for patch in patches:
            target_name = patch.get('target', '')
            self.stdout.write(f'\n{"="*50}')
            self.stdout.write(f'Target: {target_name}')

            # Find matching JSON file
            json_path = None
            json_data = None
            for jf, jd in json_files.items():
                co = jd.get('characterObj', {})
                if co.get('nameCharacter', '') == target_name:
                    json_path = jf
                    json_data = jd
                    break

            if source and json_data is None:
                self.stdout.write(self.style.WARNING(
                    f'  ⚠ No JSON file found for "{target_name}"'
                ))

            for action in patch.get('actions', []):
                action_type = action.get('type', '')
                self.stdout.write(f'  Action: {action_type}')

                # ── JSON patching ─────────────────────────────────────
                if json_data is not None:
                    handler = getattr(self, f'_json_{action_type}', None)
                    if handler:
                        handler(json_data, action, dry_run)
                    else:
                        self.stdout.write(self.style.WARNING(
                            f'    ⚠ Unknown JSON action: {action_type}'
                        ))

                # ── DB patching ───────────────────────────────────────
                if use_db:
                    handler = getattr(self, f'_db_{action_type}', None)
                    if handler:
                        handler(target_name, action, campaign, dry_run)
                    else:
                        self.stdout.write(self.style.WARNING(
                            f'    ⚠ Unknown DB action: {action_type}'
                        ))

        # Save modified JSON files
        if source and not dry_run:
            for jf, jd in json_files.items():
                with open(jf, 'w', encoding='utf-8') as f:
                    json.dump(jd, f, ensure_ascii=False)
                self.stdout.write(f'\n  Saved: {jf.name}')

        self.stdout.write(self.style.SUCCESS('\nPatches appliqués !'))

    # ═══════════════════════════════════════════════════════════════════════
    # JSON Patchers
    # ═══════════════════════════════════════════════════════════════════════

    def _json_add_spell(self, data: dict, action: dict, dry_run: bool):
        co = data.get('characterObj', {})
        spellbook = co.setdefault('spellBook', {})
        spells = spellbook.setdefault('spells', {})
        spell_def = action.get('spell', {})
        name = spell_def.get('name', '')

        # Check if spell already exists
        for sp in spells.values():
            if sp.get('name') == name:
                self.stdout.write(f'    [JSON] Spell "{name}" already exists, skipping.')
                return

        spell_id = uuid.uuid4().hex[:24]
        new_spell = {
            'id': spell_id,
            'name': name,
            'description': spell_def.get('description', ''),
            'characteristic': spell_def.get('characteristic', {}),
            'effect': spell_def.get('effect', ''),
            'owner': True,
        }
        if spell_def.get('template'):
            new_spell['template'] = spell_def['template']

        self.stdout.write(f'    [JSON] Adding spell: {name}')
        if not dry_run:
            spells[spell_id] = new_spell

    def _json_add_item(self, data: dict, action: dict, dry_run: bool):
        co = data.get('characterObj', {})
        inventory = co.setdefault('inventory', {})
        items = inventory.setdefault('items', {})
        item_def = action.get('item', {})
        name = item_def.get('name', '')

        # Check if item already exists
        for it in items.values():
            if it.get('name') == name:
                self.stdout.write(f'    [JSON] Item "{name}" already exists, skipping.')
                return

        item_id = uuid.uuid4().hex[:24]
        new_item = {
            'id': item_id,
            'name': name,
            'icon': item_def.get('icon', 't-misc1'),
            'type': item_def.get('type', 'other'),
            'weight': item_def.get('weight', 0),
            'price': str(item_def.get('price', '0')),
            'rarity': item_def.get('rarity', '#626262'),
            'description': item_def.get('description', ''),
            'characteristic': item_def.get('characteristic', {}),
            'quantity': item_def.get('quantity', 1),
            'worn': item_def.get('worn', False),
            'owner': True,
        }

        self.stdout.write(f'    [JSON] Adding item: {name}')
        if not dry_run:
            items[item_id] = new_item

    def _json_add_skill(self, data: dict, action: dict, dry_run: bool):
        co = data.get('characterObj', {})
        passive = co.setdefault('passiveSkills', {})
        ps1 = passive.setdefault('passiveSkills1', {})
        skill_def = action.get('skill', {})
        name = skill_def.get('name', '')

        # Check if skill already exists
        for sk in ps1.values():
            if isinstance(sk, dict) and sk.get('name') == name:
                self.stdout.write(f'    [JSON] Skill "{name}" already exists, skipping.')
                return

        skill_id = f'passiveSkillN{uuid.uuid4().hex[:24]}'
        new_skill = {
            'name': name,
            'desc': skill_def.get('desc', ''),
        }

        self.stdout.write(f'    [JSON] Adding skill: {name}')
        if not dry_run:
            ps1[skill_id] = new_skill

    def _json_update_currency(self, data: dict, action: dict, dry_run: bool):
        co = data.get('characterObj', {})
        inventory = co.setdefault('inventory', {})
        currency = inventory.setdefault('currency', [
            {'unit': 1, 'value': 0},
            {'unit': 0.1, 'value': 0},
            {'unit': 0.01, 'value': 0},
        ])

        gold_delta = action.get('gold', 0)
        silver_delta = action.get('silver', 0)
        copper_delta = action.get('copper', 0)

        for c in currency:
            if c.get('unit') == 1:
                old = c.get('value', 0)
                c['value'] = old + gold_delta
                self.stdout.write(f'    [JSON] Gold: {old} → {c["value"]} ({gold_delta:+d})')
            elif c.get('unit') == 0.1:
                old = c.get('value', 0)
                c['value'] = old + silver_delta
                if silver_delta:
                    self.stdout.write(f'    [JSON] Silver: {old} → {c["value"]} ({silver_delta:+d})')
            elif c.get('unit') == 0.01:
                old = c.get('value', 0)
                c['value'] = old + copper_delta
                if copper_delta:
                    self.stdout.write(f'    [JSON] Copper: {old} → {c["value"]} ({copper_delta:+d})')

    def _json_set_field(self, data: dict, action: dict, dry_run: bool):
        co = data.get('characterObj', {})
        field = action.get('field', '')
        value = action.get('value')

        if not field:
            self.stdout.write(self.style.WARNING('    ⚠ set_field: no field specified'))
            return

        # Navigate dotted path (e.g. "level.value")
        parts = field.split('.')
        target = co
        for part in parts[:-1]:
            if isinstance(target, dict):
                target = target.setdefault(part, {})
            else:
                self.stdout.write(self.style.WARNING(
                    f'    ⚠ Cannot navigate to "{field}" in JSON'
                ))
                return

        old_val = target.get(parts[-1])
        self.stdout.write(f'    [JSON] {field}: {old_val} → {value}')
        if not dry_run:
            target[parts[-1]] = value

    # ═══════════════════════════════════════════════════════════════════════
    # DB Patchers
    # ═══════════════════════════════════════════════════════════════════════

    def _db_add_spell(self, target_name: str, action: dict, campaign, dry_run: bool):
        from jdr.models import Character, CharacterSpell, Spell

        spell_def = action.get('spell', {})
        name = spell_def.get('name', '')
        char_data = spell_def.get('characteristic', {})

        # Parse mana cost
        mana_cost = 0
        for ec in char_data.get('energyCost', []):
            try:
                mana_cost += int(ec.get('cost', 0))
            except (ValueError, TypeError):
                pass

        self.stdout.write(f'    [DB] Spell: {name} (mana={mana_cost})')

        if dry_run:
            return

        extra = {}
        for k, v in char_data.items():
            if k not in ('range', 'castingTime', 'tag', 'energyCost'):
                extra[k] = v

        db_spell, _ = Spell.objects.update_or_create(
            campaign=campaign, name=name,
            defaults={
                'description': strip_html(spell_def.get('description', '')),
                'mana_cost': mana_cost,
                'damage': spell_def.get('effect', ''),
                'range_distance': str(char_data.get('range', '')),
                'casting_time': str(char_data.get('castingTime', '')),
                'school': str(char_data.get('tag', '')),
                'extra': extra,
            },
        )

        # Link to character if found
        characters = Character.objects.filter(name=target_name, campaign=campaign)
        if not characters.exists():
            characters = Character.objects.filter(name=target_name)
        for char in characters:
            CharacterSpell.objects.get_or_create(
                character=char, spell=db_spell,
            )
            self.stdout.write(f'    [DB] Linked spell to {char.name}')

    def _db_add_item(self, target_name: str, action: dict, campaign, dry_run: bool):
        from jdr.models import Character, CharacterItem, Item

        item_def = action.get('item', {})
        name = item_def.get('name', '')
        rarity_color = item_def.get('rarity', '#626262')
        rarity = RARITY_COLOR_MAP.get(rarity_color, 'commun')
        item_type_raw = item_def.get('type', 'other')
        item_type = ITEM_TYPE_MAP.get(item_type_raw, item_type_raw.capitalize())

        self.stdout.write(f'    [DB] Item: {name} ({rarity})')

        if dry_run:
            return

        db_item, _ = Item.objects.update_or_create(
            campaign=campaign, name=name,
            defaults={
                'description': strip_html(item_def.get('description', '')),
                'rarity': rarity,
                'item_type': item_type,
                'value': Decimal(str(item_def.get('price', 0))),
                'properties': item_def.get('characteristic', {}),
                'is_magical': item_type_raw == 'magic',
            },
        )

        characters = Character.objects.filter(name=target_name, campaign=campaign)
        if not characters.exists():
            characters = Character.objects.filter(name=target_name)
        for char in characters:
            CharacterItem.objects.update_or_create(
                character=char, item=db_item,
                defaults={
                    'quantity': item_def.get('quantity', 1),
                    'is_equipped': item_def.get('worn', False),
                },
            )
            self.stdout.write(f'    [DB] Linked item to {char.name}')

    def _db_add_skill(self, target_name: str, action: dict, campaign, dry_run: bool):
        from jdr.models import Character, CharacterPassiveSkill, PassiveSkill

        skill_def = action.get('skill', {})
        name = skill_def.get('name', '')
        desc = strip_html(skill_def.get('desc', ''))

        if dry_run:
            self.stdout.write(f'    [DB] PassiveSkill: {name} (dry run)')
            return

        characters = Character.objects.filter(name=target_name, campaign=campaign)
        if not characters.exists():
            characters = Character.objects.filter(name=target_name)

        if campaign:
            db_skill, _ = PassiveSkill.objects.update_or_create(
                campaign=campaign, name=name,
                defaults={'description': desc},
            )
            self.stdout.write(f'    [DB] PassiveSkill: {name}')
            for char in characters:
                _, created = CharacterPassiveSkill.objects.get_or_create(
                    character=char, passive_skill=db_skill,
                )
                if created:
                    self.stdout.write(f'    [DB] Linked passive skill to {char.name}')
                else:
                    self.stdout.write(f'    [DB] Passive skill already on {char.name}')
        else:
            # Fallback: append to description when no campaign
            for char in characters:
                skill_line = f'\n\n🎯 {name}\n{desc}'
                if name not in char.description:
                    char.description += skill_line
                    char.save(update_fields=['description'])
                    self.stdout.write(f'    [DB] Appended skill to {char.name} description (no campaign)')
                else:
                    self.stdout.write(f'    [DB] Skill already in {char.name} description')

    def _db_update_currency(self, target_name: str, action: dict, campaign, dry_run: bool):
        from jdr.models import Character

        gold_delta = action.get('gold', 0)
        silver_delta = action.get('silver', 0)
        copper_delta = action.get('copper', 0)

        self.stdout.write(
            f'    [DB] Currency: gold {gold_delta:+d}, '
            f'silver {silver_delta:+d}, copper {copper_delta:+d}'
        )

        if dry_run:
            return

        characters = Character.objects.filter(name=target_name, campaign=campaign)
        if not characters.exists():
            characters = Character.objects.filter(name=target_name)
        for char in characters:
            char.gold += gold_delta
            char.silver += silver_delta
            char.copper += copper_delta
            char.save(update_fields=['gold', 'silver', 'copper'])
            self.stdout.write(
                f'    [DB] {char.name}: {char.gold}g {char.silver}s {char.copper}c'
            )

    def _db_set_field(self, target_name: str, action: dict, campaign, dry_run: bool):
        from jdr.models import Character

        field = action.get('field', '')
        value = action.get('value')

        # Map JSON dotted paths to Django model fields
        field_map = {
            'level.value': 'level',
            'nameCharacter': 'name',
            'biography': 'description',
        }
        db_field = field_map.get(field, field)

        # Only allow safe fields
        allowed_fields = {'name', 'level', 'class_type', 'description', 'gold', 'silver', 'copper'}
        if db_field not in allowed_fields:
            self.stdout.write(self.style.WARNING(
                f'    ⚠ DB field "{db_field}" not in allowed list, skipping.'
            ))
            return

        self.stdout.write(f'    [DB] set {db_field} = {value}')

        if dry_run:
            return

        characters = Character.objects.filter(name=target_name, campaign=campaign)
        if not characters.exists():
            characters = Character.objects.filter(name=target_name)
        for char in characters:
            setattr(char, db_field, value)
            char.save(update_fields=[db_field])
            self.stdout.write(f'    [DB] Updated {char.name}.{db_field}')
