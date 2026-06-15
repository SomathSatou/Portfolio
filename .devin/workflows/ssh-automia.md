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

## Test des services mail (Roundcube/Postfix)

7. Tester la connectivité SMTP :
```bash
telnet mail.automia.org 587
# ou
telnet localhost 25
```

8. Vérifier les logs mail :
```bash
# Logs Postfix
journalctl -u postfix -f
tail -f /var/log/mail.log

# Logs Dovecot (IMAP/POP3)
journalctl -u dovecot -f
```

9. Vérifier la configuration DNS (DKIM, SPF, DMARC) :
```bash
dig TXT automia.org
dig TXT _dmarc.automia.org
dig TXT mail._domainkey.automia.org
```

10. Tester l'envoi d'email depuis Django (shell Python) :
```bash
source /var/www/Portfolio/backend/.venv/bin/activate
cd /var/www/Portfolio/backend
python manage.py shell
```
Puis dans le shell Python :
```python
from django.core.mail import send_mail
send_mail(
    'Test automia.org',
    'Ceci est un test depuis Django.',
    'noreply@automia.org',
    ['ton-email@example.com'],
    fail_silently=False,
)
```
