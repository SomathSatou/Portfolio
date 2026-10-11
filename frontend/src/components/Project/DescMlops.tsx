export const DescMlops = () => (
  <>
    <p>
      Cours de <strong>MLOps</strong> dispensé en cycle ingénieur ({' '}
      <strong>IRA4, semestre 8</strong>), <strong>27 heures</strong> réparties en 9
      séances au format 1/3 cours – 2/3 travaux pratiques.
    </p>

    <p>
      Le module forme les étudiants aux enjeux opérationnels du déploiement et de
      la maintenance de modèles de machine learning en production. Il repose sur
      un <strong>projet fil rouge</strong> de régression tabulaire — la prédiction
      de la demande horaire de vélos (<em>Bike Sharing Dataset</em>) — exécutable
      sur CPU / Google Colab sans GPU, ce qui oblige à optimiser les
      entraînements et à raisonner les coûts d'infrastructure.
    </p>

    <h4>Compétences couvertes</h4>
    <ul>
      <li>Structuration de projet ML selon les bonnes pratiques MLOps</li>
      <li>Versionnement des données et des modèles avec <strong>DVC</strong></li>
      <li>Suivi et comparaison d'expérimentations avec <strong>MLflow</strong></li>
      <li>Pipelines reproductibles (scikit-learn, ColumnTransformer)</li>
      <li>Serving du modèle via une API REST (<strong>FastAPI</strong>)</li>
      <li>Conteneurisation et déploiement avec <strong>Docker</strong></li>
      <li>CI/CD et entraînement continu avec <strong>GitHub Actions</strong></li>
      <li>Monitoring de la dérive avec <strong>Evidently</strong>, gouvernance et gestion d'incident</li>
      <li>Estimation des coûts d'infrastructure CPU/GPU</li>
    </ul>

    <p>
      Évaluation : projet fil rouge documenté sur un dépôt GitHub (70 %) et
      soutenance de présentation du pipeline (30 %).
    </p>
  </>
);
