export const DescProjetLSF = () => (
  <>
    <p>
      Projet majeur encadré en cycle ingénieur (Majeure IA, 4e année) :{' '}
      <strong>reconnaissance du Langage des Signes Français (LSF)</strong> en contexte
      d'urgence hospitalière.
    </p>

    <p>
      L'objectif est de concevoir un prototype capable de reconnaître des signes LSF en temps réel
      via caméra, pour faciliter la communication entre patients sourds ou malentendants et le
      personnel soignant — sans recours à un interprète humain disponible 24h/24.
    </p>

    <h4>Contraintes stratégiques</h4>
    <ul>
      <li>Technologies <strong>open-source exclusivement</strong>, déploiement autonome (hors ligne possible)</li>
      <li>Conformité <strong>RGPD / HDS</strong> — aucune donnée patient hors infrastructure</li>
      <li>Pas de SaaS ni d'API payante</li>
    </ul>

    <h4>Deux axes au choix des équipes</h4>
    <ul>
      <li>
        <strong>Axe A — Application fonctionnelle :</strong> prototype Web ou mobile de
        reconnaissance LSF en temps réel, vocabulaire d'urgence médicale (douleur, localisation,
        symptômes), affichage texte (et audio idéalement), démonstration en direct à la soutenance
      </li>
      <li>
        <strong>Axe B — Étude comparative :</strong> revue critique des architectures (MediaPipe,
        LSTM, CNN, Transformers), protocole d'évaluation rigoureux, recommandations argumentées
        pour un déploiement hospitalier
      </li>
    </ul>

    <h4>Technologies mobilisées</h4>
    <ul>
      <li>Computer Vision temps réel (MediaPipe, OpenCV)</li>
      <li>Classification de séquences (LSTM, CNN, Transformers)</li>
      <li>Python, frameworks Web/mobile pour l'interface</li>
    </ul>
  </>
)
