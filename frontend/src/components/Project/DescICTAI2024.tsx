export const DescICTAI2024 = () => (
  <>
    <p>
      J'ai eu l'honneur de présenter mes travaux de recherche à la conférence internationale{' '}
      <a
        href="https://ictai.computer.org/2024/"
        target="_blank"
        rel="noreferrer"
      >
        <strong>ICTAI 2024</strong>
      </a>{' '}
      (IEEE International Conference on Tools with Artificial Intelligence) qui s'est tenue à{' '}
      <strong>Atlanta, États-Unis</strong>. Cette conférence de référence rassemble des chercheurs
      et praticiens du monde entier autour des avancées en intelligence artificielle.
    </p>

    <p>
      L'article présenté, intitulé{' '}
      <a
        href="https://arxiv.org/abs/2210.04716"
        target="_blank"
        rel="noreferrer"
      >
        <strong>« A Two-Stage Approach for Table Extraction in Invoices »</strong>
      </a>
      , a été co-rédigé avec <strong>Frédéric Lardeux</strong> et{' '}
      <strong>Frédéric Saubion</strong> du LERIA (Université d'Angers).
    </p>

    <p>
      Cette recherche porte sur l'<strong>extraction automatique de tableaux</strong> dans les
      factures, un enjeu majeur pour l'automatisation du traitement documentaire en entreprise.
      Les tableaux constituent une forme très répandue de représentation des données dans les
      documents administratifs, mais leur détection reste un défi technique en raison de leur
      grande variabilité structurelle.
    </p>

    <p>
      Notre approche repose sur une méthodologie en <strong>deux étapes</strong> :
    </p>

    <ul>
      <li>
        <strong>Estimation de la structure des tableaux</strong> par traitement d'image,
        permettant d'identifier les zones candidates et leurs contours géométriques.
      </li>
      <li>
        <strong>Représentation par graphe</strong> du document, exploitée pour identifier
        précisément les tableaux complexes et leurs relations internes (cellules, lignes,
        colonnes).
      </li>
    </ul>

    <p>
      Cette combinaison de <strong>vision artificielle</strong> et de{' '}
      <strong>méthodes basées graphe</strong> permet d'obtenir des résultats robustes sur des
      documents réels, souvent hétérogènes et de qualité variable. L'évaluation expérimentale
      a été réalisée sur un cas d'application industriel concret.
    </p>

    <p>
      <strong>
        Cette publication témoigne de mon expertise en recherche appliquée à l'intersection
        de la vision par ordinateur, du traitement de documents et de l'intelligence artificielle,
        ainsi que de ma capacité à contribuer à la communauté scientifique internationale.
      </strong>
    </p>
  </>
);