#!/usr/bin/env python3
"""Analyse d'équilibrage JDR — génère equilibrage.md depuis les fichiers Homebrew."""

import json
import math
import re
from pathlib import Path
from statistics import mean, median


def _avg_dice(dice_str: str) -> float:
    """Moyenne approximative d'une chaîne de dés, ex: '2d6+3', '4d10'."""
    total = 0.0
    count_matches = 0
    for match in re.finditer(r'(\d+)d(\d+)(?:\+(-?\d+))?', str(dice_str).lower()):
        count = int(match.group(1))
        sides = int(match.group(2))
        bonus = int(match.group(3)) if match.group(3) else 0
        total += count * (sides + 1) / 2 + bonus
        count_matches += 1
    if total == 0:
        nums = re.findall(r'\d+', str(dice_str))
        if nums:
            total = sum(int(n) for n in nums) / len(nums)
    return max(1.0, total)


def parse_character(path: Path) -> dict:
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    co = data.get('characterObj', {})

    gauges = co.get('gauges', {})
    hp = max(0, int(gauges.get('gauge0_0', {}).get('value', 0) or 0))
    max_hp = max(0, int(gauges.get('gauge0_0', {}).get('base', hp) or hp))
    mp = max(0, int(gauges.get('gauge0_1', {}).get('value', 0) or 0))
    max_mp = max(0, int(gauges.get('gauge0_1', {}).get('base', mp) or mp))

    level_data = co.get('level', {})
    level = level_data.get('value', 1) if isinstance(level_data, dict) else 1

    asbonus = co.get('asbonus', {}).get('asbonus1', {})
    stats = {}
    stat_names = ['Intuition', 'Intelligence', 'Charisme', 'Adresse', 'Force', 'Chance', 'Constitution']
    for i, stat_name in enumerate(stat_names):
        bonus_key = f'asbonus{i}'
        stats[stat_name] = int(asbonus.get(bonus_key, {}).get('base', 0))

    # DPR estimation
    weapon_dmg = ''
    for item in co.get('inventory', {}).get('items', {}).values():
        if item.get('type') == 'weapon' and item.get('worn', False):
            dmg = item.get('characteristic', {}).get('damage', '')
            if dmg:
                weapon_dmg = str(dmg)
                break

    spell_dmg = ''
    best_spell_len = 0
    for spell in co.get('spellBook', {}).get('spells', {}).values():
        effect = str(spell.get('effect', ''))
        if effect and ('d' in effect or '+' in effect):
            if len(effect) > best_spell_len:
                best_spell_len = len(effect)
                spell_dmg = effect

    dpr_weapon = _avg_dice(weapon_dmg) if weapon_dmg else 0
    dpr_spell = _avg_dice(spell_dmg) if spell_dmg else 0
    dpr = max(dpr_weapon, dpr_spell) if (dpr_weapon or dpr_spell) else 0

    passives = [sk.get('name', '') for sk in co.get('passiveSkills', {}).values() if isinstance(sk, dict)]

    return {
        'name': co.get('nameCharacter', path.stem.split('-')[0].strip()),
        'level': level,
        'hp': hp,
        'max_hp': max_hp,
        'mp': mp,
        'max_mp': max_mp,
        'stats': stats,
        'dpr': dpr,
        'weapon_dmg': weapon_dmg,
        'spell_dmg': spell_dmg,
        'passives': passives,
        'path': str(path),
        'type': 'monster' if 'monstre' in str(path).lower() else 'pc',
    }


def main():
    pc_dir = Path(r'F:\Lug\CharacterSheet\ImportPortfolio')
    monster_dir = Path(r'F:\Lug\CharacterSheet\monstre')

    pcs = [parse_character(p) for p in pc_dir.glob('*-Homebrew.json')]
    monsters = [parse_character(p) for p in monster_dir.glob('*-Homebrew.json')]

    # Métriques PJ
    pc_levels = [p['level'] for p in pcs]
    pc_hps = [p['max_hp'] for p in pcs]
    pc_dprs = [p['dpr'] for p in pcs if p['dpr'] > 0]

    avg_pc_hp_by_level = {}
    avg_pc_dpr_by_level = {}
    for lvl in sorted(set(pc_levels)):
        lvl_pcs = [p for p in pcs if p['level'] == lvl]
        avg_pc_hp_by_level[lvl] = mean([p['max_hp'] for p in lvl_pcs]) if lvl_pcs else 0
        lvl_dprs = [p['dpr'] for p in lvl_pcs if p['dpr'] > 0]
        avg_pc_dpr_by_level[lvl] = mean(lvl_dprs) if lvl_dprs else 0

    # DPR moyen global PJ
    global_pc_dpr = mean(pc_dprs) if pc_dprs else 5
    global_pc_hp = mean(pc_hps) if pc_hps else 20

    # Métriques monstres
    monster_hps = [m['max_hp'] for m in monsters]
    monster_dprs = [m['dpr'] for m in monsters if m['dpr'] > 0]
    global_monster_dpr = mean(monster_dprs) if monster_dprs else 5
    global_monster_hp = mean(monster_hps) if monster_hps else 30

    # Courbe de difficulté progressive
    # Base niveau 1: PC ~20 HP, DPR ~5
    # Monster: Faible = 0.5x PC, Modéré = 1x, Dangereux = 2x, Légendaire = 4x, Boss = 8x

    tiers = [
        ('Faible', 0.5, 1.0, 'Gobelins, rats géants, miliciens'),
        ('Modéré', 1.0, 1.5, 'Veterans, créatures élémentaires'),
        ('Dangereux', 2.0, 3.0, 'Golems, chevaliers maudits, mages'),
        ('Légendaire', 4.0, 6.0, 'Dragons jeunes, seigneurs démons'),
        ('Boss', 8.0, 10.0, 'Dieux mineurs, titans, archimages'),
    ]

    # Analyse des monstres existants
    existing_analysis = []
    for m in sorted(monsters, key=lambda x: x['level']):
        survivability = m['max_hp'] / max(1, global_pc_dpr)
        rounds_to_kill = m['max_hp'] / max(1, m['dpr']) if m['dpr'] > 0 else float('inf')
        rounds_pc_kill = m['max_hp'] / max(1, global_pc_dpr)
        cr_score = (rounds_pc_kill / max(1, rounds_to_kill)) * m['level'] if rounds_to_kill != float('inf') else 0

        if cr_score < 0.5:
            suggested = 'Faible'
        elif cr_score < 1.5:
            suggested = 'Modéré'
        elif cr_score < 3:
            suggested = 'Dangereux'
        elif cr_score < 6:
            suggested = 'Légendaire'
        else:
            suggested = 'Boss'

        existing_analysis.append({
            'name': m['name'],
            'level': m['level'],
            'hp': m['max_hp'],
            'dpr': m['dpr'],
            'survivability': round(survivability, 1),
            'rounds_to_kill': round(rounds_to_kill, 1) if rounds_to_kill != float('inf') else '-',
            'rounds_pc_kill': round(rounds_pc_kill, 1),
            'cr_score': round(cr_score, 2),
            'suggested_tier': suggested,
        })

    # Génération markdown
    lines = [
        '# Équilibrage JDR — Analyse et Courbe de Difficulté',
        '',
        '> Fichier généré automatiquement depuis les données Homebrew.',
        '> Date de génération : ' + Path(__file__).stat().st_mtime.__str__(),
        '',
        '## 1. Données brutes des Personnages Joueurs (PJ)',
        '',
        '| Niveau | Nom | HP | MP | DPR (arme/sort) | Stats clés |',
        '|--------|-----|----|----|-------------------|------------|',
    ]
    for p in sorted(pcs, key=lambda x: (x['level'], x['name'])):
        stats_str = f"F{p['stats'].get('Force',0)} C{p['stats'].get('Constitution',0)}"
        dpr_str = f"{p['dpr']:.1f} ({p['weapon_dmg'] or '-'}/{p['spell_dmg'] or '-'})"
        lines.append(f"| {p['level']} | {p['name']} | {p['max_hp']} | {p['max_mp']} | {dpr_str} | {stats_str} |")

    lines += [
        '',
        '**Moyennes PJ :**',
        f'- HP moyen : **{global_pc_hp:.1f}**',
        f'- DPR moyen : **{global_pc_dpr:.1f}**',
        '',
        '## 2. Données brutes des Monstres existants',
        '',
        '| Niveau | Nom | HP | MP | DPR | Menace suggérée |',
        '|--------|-----|----|----|-----|-----------------|',
    ]
    for m in existing_analysis:
        lines.append(
            f"| {m['level']} | {m['name']} | {m['hp']} | - | {m['dpr']:.1f} | {m['suggested_tier']} |"
        )

    lines += [
        '',
        '## 3. Métriques de combat',
        '',
        '### Définitions',
        '',
        '- **DPR** (Damage Per Round) : dégâts moyens infligés par une entité en un round.',
        '- **Survivability** : nombre de rounds qu\'une entité survit face au DPR adverse.',
        '- **Rounds to Kill** : rounds nécessaires pour tuer l\'adversaire.',
        '',
        '### Tableau des monstres analysés',
        '',
        '| Monstre | Niveau | HP | DPR | Survivabilité (vs PJ) | Rounds PJ→Monstre | Rounds Monstre→PJ | Score CR |',
        '|---------|--------|----|-----|------------------------|--------------------|-------------------|----------|',
    ]
    for m in existing_analysis:
        lines.append(
            f"| {m['name']} | {m['level']} | {m['hp']} | {m['dpr']:.1f} | "
            f"{m['survivability']} | {m['rounds_pc_kill']} | {m['rounds_to_kill']} | {m['cr_score']} |"
        )

    lines += [
        '',
        '## 4. Courbe de difficulté progressive',
        '',
        '### Formules de génération',
        '',
        '```',
        'HP_monstre(niveau)    = base_hp    × (1.2 ^ niveau)',
        'DPR_monstre(niveau)   = base_dpr   × (1.15 ^ niveau)',
        '```',
        '',
        '- **base_hp**  = 15  (un monstre niveau 1 a ~18 PV)',
        '- **base_dpr** = 4   (un monstre niveau 1 inflige ~4.6 DPR)',
        '',
        'Ces bases sont calibrées pour qu\'un monstre **Modéré** dure ~3–4 rounds face à un PJ de même niveau.',
        '',
        '### 5 paliers de menace',
        '',
        '| Palier | Ratio HP vs PJ | Ratio DPR vs PJ | Niveau PJ recommandé | Description |',
        '|--------|----------------|-----------------|----------------------|-------------|',
    ]

    for tier_name, hp_mult, dpr_mult, desc in tiers:
        lines.append(f"| **{tier_name}** | ×{hp_mult} | ×{dpr_mult} | Variable | {desc} |")

    lines += [
        '',
        '### Exemples chiffrés par niveau (Menace = Modérée)',
        '',
        '| Niveau | HP (×1.0) | DPR (×1.0) | HP Faible | HP Boss | DPR Faible | DPR Boss |',
        '|--------|-----------|------------|-----------|---------|------------|----------|',
    ]
    for lvl in range(1, 21, 2):
        hp_mod = 15 * (1.2 ** lvl)
        dpr_mod = 4 * (1.15 ** lvl)
        hp_weak = hp_mod * 0.5
        hp_boss = hp_mod * 8.0
        dpr_weak = dpr_mod * 0.5
        dpr_boss = dpr_mod * 8.0
        lines.append(
            f"| {lvl} | {hp_mod:.0f} | {dpr_mod:.1f} | "
            f"{hp_weak:.0f} | {hp_boss:.0f} | {dpr_weak:.1f} | {dpr_boss:.1f} |"
        )

    lines += [
        '',
        '## 5. Recommandations de rééquilibrage',
        '',
        '### Monstres existants à ajuster',
        '',
    ]

    for m in existing_analysis:
        expected_hp = 15 * (1.2 ** m['level']) * 1.0
        expected_dpr = 4 * (1.15 ** m['level']) * 1.0
        delta_hp = m['hp'] - expected_hp
        delta_dpr = m['dpr'] - expected_dpr
        if abs(delta_hp) > expected_hp * 0.5 or abs(delta_dpr) > expected_dpr * 0.5:
            lines.append(
                f"- **{m['name']}** (niv {m['level']}) : "
                f"HP {m['hp']} (attendu ~{expected_hp:.0f}), "
                f"DPR {m['dpr']:.1f} (attendu ~{expected_dpr:.1f}) → **{m['suggested_tier']}**"
            )

    lines += [
        '',
        '### Variations de design',
        '',
        '- **Tank** : HP ×1.5, DPR ×0.7, haute Constitution.',
        '- **Assassin** : HP ×0.6, DPR ×1.3, haute Adresse / Chance.',
        '- **Caster** : HP ×0.5, DPR ×1.2 via sorts, haute Intelligence.',
        '- **Horde** : HP ×0.3, DPR ×0.5, nombreux (3–5 vs 1 PJ).',
        '',
        '## 6. Récapitulatif des formules',
        '',
        '```python',
        'base_hp  = 15',
        'base_dpr = 4',
        '',
        'def monster_hp(level, threat_multiplier=1.0):',
        '    return base_hp * (1.2 ** level) * threat_multiplier',
        '',
        'def monster_dpr(level, threat_multiplier=1.0):',
        '    return base_dpr * (1.15 ** level) * threat_multiplier',
        '```',
        '',
        '> *Note : les multiplicateurs de menace sont : Faible 0.5, Modéré 1.0, Dangereux 2.0, Légendaire 4.0, Boss 8.0.*',
        '',
    ]

    output_path = Path(__file__).resolve().parent / 'equilibrage.md'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f'equilibrage.md généré : {output_path}')
    print(f'  PJ analysés : {len(pcs)}')
    print(f'  Monstres analysés : {len(monsters)}')


if __name__ == '__main__':
    main()
