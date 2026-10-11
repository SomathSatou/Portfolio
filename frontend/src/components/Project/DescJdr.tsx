export const DescJdr = () => (
  <>
    <p>
      <strong>Le Monde de Lug</strong> est une application web complète de{' '}
      <strong>gestion de campagnes de jeu de rôle</strong>, hébergée sur ce site
      et utilisée en conditions réelles avec mon groupe de joueurs.
    </p>

    <p>
      Elle couvre l'ensemble de la vie d'une campagne : création et gestion des
      personnages (fiches, compétences, sorts, inventaires), suivi des campagnes
      (villes, événements, bestiaire) et sessions de jeu en temps réel.
    </p>

    <h4>Fonctionnalités clés</h4>
    <ul>
      <li>
        <strong>Sessions en temps réel</strong> via websockets (Django Channels /
        Daphne) : chat, jets de dés, suivi de combat, notes de session.
      </li>
      <li>
        <strong>Économie de campagne</strong> : marchands, stocks dynamiques,
        portefeuilles et transactions.
      </li>
      <li>
        <strong>Jardin alchimique</strong> : grille de cultures avec croissance et
        récoltes.
      </li>
      <li>
        <strong>Système de runes</strong>, équipements et gestion des ressources.
      </li>
      <li>
        <strong>Rôles et permissions</strong> : maître du jeu, joueurs, accès
        staff.
      </li>
    </ul>

    <p>
      Côté technique : backend <strong>Django/DRF</strong> avec services métier
      transactionnels et migrations dédiées, frontend{' '}
      <strong>React/TypeScript</strong> avec sa propre thématique visuelle — le
      tout dans le même dépôt que ce portfolio.
    </p>

    <p>
      <strong>
        Ce projet illustre ma capacité à concevoir et faire évoluer une
        application full-stack vivante, avec de vrais utilisateurs, du temps réel
        et une modélisation métier riche.
      </strong>
    </p>
  </>
);
