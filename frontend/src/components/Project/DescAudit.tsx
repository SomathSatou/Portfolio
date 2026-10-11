export const DescAudit = () => (
  <>
    <p>
      J'applique une démarche d'<strong>audit de sécurité</strong> sur
      l'infrastructure auto-hébergée qui fait tourner ce site et les applications
      associées : serveur Linux, Nginx, services mail (Postfix/Dovecot), bases de
      données et applications Django.
    </p>

    <h4>Périmètre de l'audit</h4>
    <ul>
      <li>
        <strong>Scanners automatisés</strong> : Lynis (audit système et
        durcissement), OpenVAS/GVM (vulnérabilités et CVE connues), détection de
        rootkits (Chkrootkit, RKHunter).
      </li>
      <li>
        <strong>Vue « attaquant extérieur »</strong> : cartographie des ports et
        services exposés avec Nmap, audit ciblé du serveur web avec Nikto.
      </li>
      <li>
        <strong>Référentiels et vérifications manuelles</strong> : CIS Benchmarks
        (Linux, Nginx, bases de données), mises à jour système, comptes et clés
        SSH, permissions des fichiers sensibles, analyse des logs.
      </li>
      <li>
        <strong>Transport</strong> : HTTPS généralisé, certificats TLS/SSL et
        configuration des en-têtes de sécurité.
      </li>
    </ul>

    <p>
      <strong>
        Cette pratique régulière illustre ma capacité à sécuriser une
        infrastructure réelle de bout en bout — du système d'exploitation à
        l'application — en m'appuyant sur les référentiels et outils standards du
        domaine.
      </strong>
    </p>
  </>
);
