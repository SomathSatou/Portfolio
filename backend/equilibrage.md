# Équilibrage JDR — Analyse et Courbe de Difficulté

> Fichier généré automatiquement depuis les données Homebrew.
> Date de génération : 1777475001.181895

## 1. Données brutes des Personnages Joueurs (PJ)

| Niveau | Nom | HP | MP | DPR (arme/sort) | Stats clés |
|--------|-----|----|----|-------------------|------------|
| 8 | Ellmor Tadelle | 112 | 62 | 75.5 (1d150/-) | F8 C8 |
| 8 | K. | 90 | 63 | 63.0 (1d20/6d20) | F3 C10 |
| 8 | Paul Tron né SOFA | 157 | 47 | 182.0 (28d12/5d15) | F13 C11 |
| 8 | Prozengan Tchar | 150 | 55 | 134.0 (10d25+4d5/Dégât d'arme/2) | F16 C14 |
| 8 | Soria Stellan | 55 | 150 | 267.5 (-/45d10+20) | F3 C5 |

**Moyennes PJ :**
- HP moyen : **112.8**
- DPR moyen : **144.4**

## 2. Données brutes des Monstres existants

| Niveau | Nom | HP | MP | DPR | Menace suggérée |
|--------|-----|----|----|-----|-----------------|
| 1 | Clause III | 1250 | - | 0.0 | Faible |
| 3 | Glouton Doré | 45 | - | 10.5 | Faible |
| 5 | Banquier Maudit | 55 | - | 10.5 | Faible |
| 6 | Collecteur d'Âmes | 70 | - | 3.5 | Faible |
| 8 | Golem de Pièces | 120 | - | 4.0 | Faible |
| 25 | Grizpou Dieu de l'Avarice | 500 | - | 2.0 | Faible |

## 3. Métriques de combat

### Définitions

- **DPR** (Damage Per Round) : dégâts moyens infligés par une entité en un round.
- **Survivability** : nombre de rounds qu'une entité survit face au DPR adverse.
- **Rounds to Kill** : rounds nécessaires pour tuer l'adversaire.

### Tableau des monstres analysés

| Monstre | Niveau | HP | DPR | Survivabilité (vs PJ) | Rounds PJ→Monstre | Rounds Monstre→PJ | Score CR |
|---------|--------|----|-----|------------------------|--------------------|-------------------|----------|
| Clause III | 1 | 1250 | 0.0 | 8.7 | 8.7 | - | 0 |
| Glouton Doré | 3 | 45 | 10.5 | 0.3 | 0.3 | 4.3 | 0.22 |
| Banquier Maudit | 5 | 55 | 10.5 | 0.4 | 0.4 | 5.2 | 0.36 |
| Collecteur d'Âmes | 6 | 70 | 3.5 | 0.5 | 0.5 | 20.0 | 0.15 |
| Golem de Pièces | 8 | 120 | 4.0 | 0.8 | 0.8 | 30.0 | 0.22 |
| Grizpou Dieu de l'Avarice | 25 | 500 | 2.0 | 3.5 | 3.5 | 250.0 | 0.35 |

## 4. Courbe de difficulté progressive

### Formules de génération

```
HP_monstre(niveau)    = base_hp    × (1.2 ^ niveau)
DPR_monstre(niveau)   = base_dpr   × (1.15 ^ niveau)
```

- **base_hp**  = 15  (un monstre niveau 1 a ~18 PV)
- **base_dpr** = 4   (un monstre niveau 1 inflige ~4.6 DPR)

Ces bases sont calibrées pour qu'un monstre **Modéré** dure ~3–4 rounds face à un PJ de même niveau.

### 5 paliers de menace

| Palier | Ratio HP vs PJ | Ratio DPR vs PJ | Niveau PJ recommandé | Description |
|--------|----------------|-----------------|----------------------|-------------|
| **Faible** | ×0.5 | ×1.0 | Variable | Gobelins, rats géants, miliciens |
| **Modéré** | ×1.0 | ×1.5 | Variable | Veterans, créatures élémentaires |
| **Dangereux** | ×2.0 | ×3.0 | Variable | Golems, chevaliers maudits, mages |
| **Légendaire** | ×4.0 | ×6.0 | Variable | Dragons jeunes, seigneurs démons |
| **Boss** | ×8.0 | ×10.0 | Variable | Dieux mineurs, titans, archimages |

### Exemples chiffrés par niveau (Menace = Modérée)

| Niveau | HP (×1.0) | DPR (×1.0) | HP Faible | HP Boss | DPR Faible | DPR Boss |
|--------|-----------|------------|-----------|---------|------------|----------|
| 1 | 18 | 4.6 | 9 | 144 | 2.3 | 36.8 |
| 3 | 26 | 6.1 | 13 | 207 | 3.0 | 48.7 |
| 5 | 37 | 8.0 | 19 | 299 | 4.0 | 64.4 |
| 7 | 54 | 10.6 | 27 | 430 | 5.3 | 85.1 |
| 9 | 77 | 14.1 | 39 | 619 | 7.0 | 112.6 |
| 11 | 111 | 18.6 | 56 | 892 | 9.3 | 148.9 |
| 13 | 160 | 24.6 | 80 | 1284 | 12.3 | 196.9 |
| 15 | 231 | 32.5 | 116 | 1849 | 16.3 | 260.4 |
| 17 | 333 | 43.0 | 166 | 2662 | 21.5 | 344.4 |
| 19 | 479 | 56.9 | 240 | 3834 | 28.5 | 455.4 |

## 5. Recommandations de rééquilibrage

### Monstres existants à ajuster

- **Clause III** (niv 1) : HP 1250 (attendu ~18), DPR 0.0 (attendu ~4.6) → **Faible**
- **Glouton Doré** (niv 3) : HP 45 (attendu ~26), DPR 10.5 (attendu ~6.1) → **Faible**
- **Collecteur d'Âmes** (niv 6) : HP 70 (attendu ~45), DPR 3.5 (attendu ~9.3) → **Faible**
- **Golem de Pièces** (niv 8) : HP 120 (attendu ~64), DPR 4.0 (attendu ~12.2) → **Faible**
- **Grizpou Dieu de l'Avarice** (niv 25) : HP 500 (attendu ~1431), DPR 2.0 (attendu ~131.7) → **Faible**

### Variations de design

- **Tank** : HP ×1.5, DPR ×0.7, haute Constitution.
- **Assassin** : HP ×0.6, DPR ×1.3, haute Adresse / Chance.
- **Caster** : HP ×0.5, DPR ×1.2 via sorts, haute Intelligence.
- **Horde** : HP ×0.3, DPR ×0.5, nombreux (3–5 vs 1 PJ).

## 6. Récapitulatif des formules

```python
base_hp  = 15
base_dpr = 4

def monster_hp(level, threat_multiplier=1.0):
    return base_hp * (1.2 ** level) * threat_multiplier

def monster_dpr(level, threat_multiplier=1.0):
    return base_dpr * (1.15 ** level) * threat_multiplier
```

> *Note : les multiplicateurs de menace sont : Faible 0.5, Modéré 1.0, Dangereux 2.0, Légendaire 4.0, Boss 8.0.*
