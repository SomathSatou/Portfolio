"""Synchronisation des mots de passe Django → PostfixAdmin/Roundcube.

Ce module permet de synchroniser les mots de passe utilisateurs entre Django
et la base PostfixAdmin utilisée par Roundcube/Dovecot.

Django utilise PBKDF2 par défaut, mais Dovecot/PostfixAdmin attendent
des formats comme {SHA512-CRYPT} ou {SSHA256}.
"""
import hashlib
import os
from typing import Optional

from django.conf import settings
from django.db import connections, DatabaseError


def _generate_sha512_crypt(password: str) -> str:
    """Génère un hash SHA512-CRYPT compatible Dovecot/PostfixAdmin.
    
    Format attendu : {SHA512-CRYPT}$6$rounds=5000$salt$hash
    """
    # Génère un sel aléatoire de 16 caractères
    salt_chars = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    salt = ''.join(salt_chars[ord(os.urandom(1)) % 64] for _ in range(16))
    
    # Génère le hash avec 5000 rounds (standard)
    import crypt
    hashed = crypt.crypt(password, f'$6$rounds=5000${salt}$')
    
    return f'{{SHA512-CRYPT}}{hashed}'


def _generate_ssha256(password: str) -> str:
    """Alternative : Génère un hash SSHA256.
    
    Format attendu : {SSHA256}base64(salt+hash)
    """
    salt = os.urandom(8)
    sha256 = hashlib.sha256(password.encode('utf-8') + salt).digest()
    import base64
    return f'{{SSHA256}}{base64.b64encode(sha256 + salt).decode()}'


def update_postfixadmin_password(email: str, password: str) -> bool:
    """Met à jour le mot de passe dans la base PostfixAdmin.
    
    Args:
        email: Adresse email complète (ex: user@automia.org)
        password: Mot de passe en clair
        
    Returns:
        True si la mise à jour a réussi, False sinon
    """
    # Configuration MySQL PostfixAdmin (à adapter selon ta config)
    PF_DB_CONFIG = getattr(settings, 'POSTFIXADMIN_DB', {
        'HOST': 'localhost',
        'NAME': 'postfixadmin',
        'USER': 'root',  # ou un user dédié
        'PASSWORD': '',  # à configurer
        'PORT': 3306,
    })
    
    try:
        # Hash compatible Dovecot
        password_hash = _generate_sha512_crypt(password)
        
        # Connexion directe à la base PostfixAdmin
        import MySQLdb  # ou pymysql si MySQLdb n'est pas dispo
    except ImportError:
        # Fallback avec Django ORM si possible
        try:
            with connections['postfixadmin'].cursor() as cursor:
                cursor.execute(
                    "UPDATE mailbox SET password = %s, modified = NOW() WHERE username = %s",
                    [password_hash, email]
                )
                return cursor.rowcount > 0
        except (DatabaseError, KeyError):
            # Si la connexion 'postfixadmin' n'existe pas dans Django
            pass
        return False
    
    try:
        conn = MySQLdb.connect(
            host=PF_DB_CONFIG['HOST'],
            user=PF_DB_CONFIG['USER'],
            passwd=PF_DB_CONFIG['PASSWORD'],
            db=PF_DB_CONFIG['NAME'],
            port=PF_DB_CONFIG['PORT'],
        )
        cursor = conn.cursor()
        
        # Met à jour le mot de passe
        cursor.execute(
            "UPDATE mailbox SET password = %s, modified = NOW() WHERE username = %s",
            (password_hash, email)
        )
        
        # Si l'utilisateur n'existe pas, on peut l'insérer
        if cursor.rowcount == 0:
            # Extraire le domaine et le local part
            local_part, domain = email.split('@')
            maildir = f"{domain}/{local_part}/"
            
            cursor.execute(
                """INSERT INTO mailbox 
                   (username, password, name, maildir, domain, active, created, modified)
                   VALUES (%s, %s, %s, %s, %s, 1, NOW(), NOW())""",
                (email, password_hash, local_part, maildir, domain)
            )
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        # Log l'erreur mais ne pas bloquer l'opération Django
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur synchronisation PostfixAdmin: {e}")
        return False


def ensure_mailbox_exists(email: str, name: str = "") -> bool:
    """Vérifie/crée une boîte mail dans PostfixAdmin.
    
    À appeler lors de la création d'un nouvel utilisateur Django.
    """
    try:
        local_part, domain = email.split('@')
        maildir = f"{domain}/{local_part}/"
        
        with connections['postfixadmin'].cursor() as cursor:
            # Vérifie si existe
            cursor.execute("SELECT 1 FROM mailbox WHERE username = %s", [email])
            if cursor.fetchone():
                return True
            
            # Crée la mailbox
            cursor.execute(
                """INSERT INTO mailbox 
                   (username, password, name, maildir, domain, active, created, modified)
                   VALUES (%s, '{SHA512-CRYPT}!', %s, %s, %s, 1, NOW(), NOW())""",
                (email, name or local_part, maildir, domain)
            )
            return True
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur création mailbox: {e}")
        return False
