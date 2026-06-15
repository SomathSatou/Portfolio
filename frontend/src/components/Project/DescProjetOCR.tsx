export const DescProjetOCR = () => (
  <>
    <p>
      Projet majeur encadré en cycle ingénieur (Majeure IA, 4e année) :{' '}
      <strong>reconnaissance d'écriture manuscrite en français</strong>, sous forme d'application
      Web ou mobile, en privilégiant un déploiement open-source autonome (sans SaaS ni API
      payante).
    </p>

    <p>
      Les équipes ont conçu un pipeline complet de traitement — de la capture d'image à la
      transcription textuelle — en s'appuyant sur des modèles open-source déployés localement ou
      sur un serveur contrôlé.
    </p>

    <h4>Deux axes au choix des équipes</h4>
    <ul>
      <li>
        <strong>Axe A — Application fonctionnelle :</strong> intégration d'un modèle OCR
        (ex. TrOCR), architecture backend/frontend opérationnelle, interface permettant l'envoi
        d'une image et l'affichage du texte transcrit, démonstration en direct
      </li>
      <li>
        <strong>Axe B — Étude comparative :</strong> évaluation rigoureuse de plusieurs approches
        OCR (Tesseract, CRNN, TrOCR, EasyOCR…), protocole de benchmarking, analyse
        des compromis précision / vitesse / déployabilité
      </li>
    </ul>

    <h4>Technologies mobilisées</h4>
    <ul>
      <li>Modèles OCR open-source : TrOCR (Microsoft), Tesseract, CRNN, EasyOCR</li>
      <li>Python, PyTorch, Hugging Face Transformers</li>
      <li>Architecture backend/frontend pour l'application Web ou mobile</li>
    </ul>

    <h4>Valeur pédagogique</h4>
    <p>
      Ce projet offre une expérience complète de déploiement IA — de la recherche de dataset à la
      mise en production — avec une compréhension approfondie de la chaîne de traitement OCR,
      sans boîte noire SaaS.
    </p>
  </>
)
