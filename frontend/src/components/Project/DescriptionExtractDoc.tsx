export const DescriptionExtractDoc = () => (
  <>
    <p>
      De nos jours, l'extraction automatique d'informations contenues dans des documents
      est un enjeu crucial pour de nombreux secteurs, notamment l'industrie, la santé,
      les services financiers ou encore les administrations. J'ai eu l'opportunité
      d'explorer cette thématique en profondeur durant{' '}
      <a
        href="https://theses.hal.science/tel-05004226/document"
        target="_blank"
        rel="noreferrer"
      >
        ma thèse
      </a>, consacrée à la <strong>gestion électronique avancée de documents professionnels</strong>.
    </p>

    <p>
      L’objectif de ce travail était de concevoir et d’implémenter une solution complète
      et générique capable d’extraire automatiquement des informations clés à partir de
      documents professionnels variés : factures, analyses de laboratoire, fiches
      suiveuses, rapports structurés ou semi-structurés. L’un des défis majeurs résidait
      dans la grande hétérogénéité de ces documents, tant sur le plan visuel que sur la
      structuration des données.
    </p>

    <p>
      Pour répondre à ces enjeux, nous avons proposé une approche hybride combinant des
      <strong> méthodes de reconnaissance de motifs dans des graphes</strong> avec des techniques de
      <strong> vision artificielle</strong> appliquées aux documents. Cette stratégie nous a permis
      d’identifier et de modéliser les relations entre zones, blocs ou éléments textuels
      afin d’extraire plus efficacement des structures complexes telles que les tableaux.
    </p>

    <figure>
      <img
        src="/assets/DataExtraction.png"
        alt="Exemple d'extraction"
        className="w-full h-auto rounded-lg shadow-md"
        style={{ maxWidth: 800, margin: '0 auto' }}
      />
      <figcaption>Processus Extract Transform Load (ETL)</figcaption>
    </figure>

    <p>
      L'extraction d’informations repose sur un schéma de traitement de type
      <strong>Extract–Transform–Load (ETL)</strong>. Nous avons adapté ce paradigme aux contraintes
      des documents numérisés ou issus de processus papier, en développant une chaîne de
      traitement complète allant de la détection visuelle des structures à la
      valorisation des contenus extraits.
    </p>

    <p>
      Nos travaux se sont particulièrement concentrés sur la phase de
      <strong>Transform</strong>. À cette étape, nous avons conçu un moteur de règles
      permettant d'étiqueter les informations détectées dans les documents, s’inscrivant
      ainsi dans le domaine de la <strong>Reconnaissance d’Entités Nommées (NER)</strong>.
      Ce moteur permettait de donner du sens aux éléments textuels extraits, de les
      normaliser et de les structurer pour un traitement ultérieur.
    </p>

    <p>
      Une part importante de notre recherche a porté sur l’extraction des
      <strong>tableaux</strong>, qui constituent une forme extrêmement répandue de représentation
      des données dans les documents professionnels. Leur détection et leur reconstruction
      impliquent de combiner habilement des aspects visuels (lignes, contours, formes
      géométriques) et textuels (cohérence sémantique, alignement logique, régularité).
    </p>

    <p>
      Pour améliorer la fiabilité du processus, nous avons développé une approche
      croisée mobilisant deux techniques complémentaires :
    </p>

    <ul>
      <li>
        une analyse visuelle basée sur des bibliothèques de vision artificielle pour
        identifier des structures géométriques (lignes, blocs, zones candidates) ;
      </li>
      <li>
        une analyse linguistique exploité par des méthodes de <strong>Traitement Automatique
        du Langage Naturel (TALN)</strong> afin de détecter des régularités sémantiques,
        reconnaître les en-têtes, et reconstruire la cohérence logique des cellules.
      </li>
    </ul>

    <p>
      Le croisement de ces deux approches — visuelle et sémantique — a permis d'obtenir
      des résultats robustes dans des contextes où les documents sont parfois dégradés,
      numérisés, ou fortement variables d’un fournisseur à l’autre.
    </p>

    <p>
      <strong>
        Ces travaux ont été réalisés dans le cadre d’un projet de recherche collaboratif avec
        l’équipe du LERIA de l’Université d’Angers et l’entreprise KS2, combinant recherche
        académique et besoins industriels concrets.
      </strong>
    </p>
  </>
);
