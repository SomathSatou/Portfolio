---
description: Se connecter en SSH au serveur de production automia.org
---

## Connexion SSH au serveur automia.org

// turbo
1. Se connecter en SSH :
```bash
ssh automia
```

> Le host `automia` doit être configuré dans `~/.ssh/config`. S'il ne l'est pas, utiliser :
> ```bash
> ssh <user>@automia.org
> ```

## Actions courantes sur le serveur

2. Lancer un déploiement manuel :
```bash
cd /var/www/Portfolio && bash deploy.sh
```

3. Vérifier les logs du service :
```bash
journalctl -u portfolio -f
```

4. Redémarrer les services :
```bash
systemctl restart portfolio
systemctl reload nginx
```

5. Voir les logs de déploiement :
```bash
tail -f /var/log/portfolio-deploy.log
```

6. Activer le venv Python (si besoin de commandes Django manuelles) :
```bash
source /var/www/Portfolio/backend/.venv/bin/activate
cd /var/www/Portfolio/backend
python manage.py <commande>
```
