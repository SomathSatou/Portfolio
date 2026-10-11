export const DescN8n = () => (
  <>
    <p>
      <strong>n8n</strong> est une plateforme d'<strong>automatisation de
      workflows</strong> open-source que j'utilise en auto-hébergement pour
      orchestrer des tâches récurrentes, notamment des{' '}
      <strong>campagnes de mailing</strong>.
    </p>

    <p>
      L'outil permet de chaîner des nœuds — déclencheurs, transformations,
      appels API, envois d'emails — dans des pipelines visuels : pas de
      développement spécifique pour les cas simples, et du code embarqué pour les
      besoins plus avancés.
    </p>

    <h4>Cas d'usage mis en place</h4>
    <ul>
      <li>
        Workflows de <strong>campagnes mail</strong> s'appuyant sur la stack
        mail auto-hébergée du serveur (Postfix/Dovecot).
      </li>
      <li>
        Automatisation de tâches d'exploitation autour des services hébergés.
      </li>
      <li>Intégrations API entre services.</li>
    </ul>

    <p>
      <strong>
        Ce projet illustre ma pratique de l'automatisation et de l'intégration en
        contexte auto-hébergé : concevoir des pipelines fiables au-dessus
        d'une infrastructure que j'administre moi-même.
      </strong>
    </p>
  </>
);
