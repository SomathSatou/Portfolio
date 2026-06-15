export const DescriptionExtractDoc = () => (
  <>
    <p>
      De nos jours, l&apos;extraction automatique d&apos;informations contenues dans des documents
      est un enjeu crucial pour de nombreux secteurs, notamment l&apos;industrie, la sant&eacute;,
      les services financiers ou encore les administrations. J&apos;ai explor&eacute; cette th&eacute;matique
      en profondeur dans le cadre de{' '}
      <a
        href="https://theses.hal.science/tel-05004226"
        target="_blank"
        rel="noreferrer"
      >
        ma th&egrave;se de doctorat
      </a>{' '}
      intitul&eacute;e{' '}
      <strong>&laquo;&nbsp;Gestion &eacute;lectronique avanc&eacute;e de documents professionnels&nbsp;&raquo;</strong>{' '}
      (HAL&nbsp;: tel-05004226 &mdash; DOI&nbsp;:{' '}
      <a
        href="https://dx.doi.org/10.70675/29f3d988z23e0z4f24z9c76z0d23bd67bc1a"
        target="_blank"
        rel="noreferrer"
      >
        10.70675/29f3d988z23e0z4f24z9c76z0d23bd67bc1a
      </a>
      ), r&eacute;alis&eacute;e au sein du{' '}
      <strong>LERIA</strong> (Laboratoire d&apos;&Eacute;tudes et de Recherche en Informatique d&apos;Angers),
      en partenariat avec un acteur industriel du secteur de la gestion documentaire.
    </p>

    <p>
      L&apos;objectif central &eacute;tait de concevoir une solution g&eacute;n&eacute;rique capable d&apos;extraire
      automatiquement des informations cl&eacute;s &agrave; partir de documents professionnels vari&eacute;s :
      factures, analyses de laboratoire, fiches suiveuses, rapports structur&eacute;s ou
      semi-structur&eacute;s. Le d&eacute;fi principal r&eacute;sidait dans la grande h&eacute;t&eacute;rog&eacute;n&eacute;it&eacute; de ces
      documents, tant sur le plan visuel que sur celui de la structuration des donn&eacute;es.
    </p>

    <h4>Approche : mod&eacute;lisation par graphes</h4>
    <p>
      La contribution centrale de cette th&egrave;se repose sur la{' '}
      <strong>mod&eacute;lisation des documents professionnels sous forme de graphes</strong>.
      Chaque document est repr&eacute;sent&eacute; comme un graphe dont les n&oelig;uds correspondent aux
      blocs ou zones textuelles, et les ar&ecirc;tes aux relations spatiales et s&eacute;mantiques
      entre eux.
    </p>
    <p>
      La d&eacute;tection de tableaux est formalis&eacute;e comme un probl&egrave;me de{' '}
      <strong>reconnaissance de sous-graphes isomorphes</strong> : identifier dans le graphe
      du document les sous-structures correspondant &agrave; des motifs tabulaires. Cette approche
      permet d&apos;automatiser la d&eacute;tection{' '}
      <strong>sans pr&eacute;traitement complexe ni apprentissage co&ucirc;teux</strong>, ce qui la rend
      robuste aux variations entre fournisseurs et types de documents.
    </p>

    <figure>
      <img
        src="/assets/DataExtraction.png"
        alt="Exemple d'extraction"
        className="w-full h-auto rounded-lg shadow-md"
        style={{ maxWidth: 800, margin: '0 auto' }}
      />
      <figcaption>Processus Extract&ndash;Transform&ndash;Load (ETL) appliqu&eacute; aux documents professionnels</figcaption>
    </figure>

    <h4>Pipeline ETL documentaire</h4>
    <p>
      L&apos;extraction d&apos;informations s&apos;appuie sur un paradigme{' '}
      <strong>Extract&ndash;Transform&ndash;Load (ETL)</strong> adapt&eacute; aux documents num&eacute;ris&eacute;s :
    </p>
    <ul>
      <li>
        <strong>Extract :</strong> d&eacute;tection visuelle des structures g&eacute;om&eacute;triques (lignes,
        blocs, zones candidates) par des m&eacute;thodes de vision artificielle.
      </li>
      <li>
        <strong>Transform :</strong> &eacute;tiquetage automatique des &eacute;l&eacute;ments d&eacute;tect&eacute;s via un
        moteur de r&egrave;gles relevant de la{' '}
        <strong>Reconnaissance d&apos;Entit&eacute;s Nomm&eacute;es (NER)</strong> &mdash; normalisation,
        mise en coh&eacute;rence s&eacute;mantique, reconstruction logique des cellules de tableaux.
      </li>
      <li>
        <strong>Load :</strong> valorisation et structuration des contenus extraits pour
        int&eacute;gration dans les syst&egrave;mes d&apos;information.
      </li>
    </ul>

    <h4>R&eacute;sultats</h4>
    <p>
      Les exp&eacute;rimentations montrent que la mod&eacute;lisation par graphes coupl&eacute;e &agrave; la
      reconnaissance de sous-graphes isomorphes{' '}
      <strong>am&eacute;liore significativement l&apos;extraction et l&apos;analyse des donn&eacute;es tabulaires</strong>,
      y compris sur des documents r&eacute;els de qualit&eacute; variable. L&apos;approche se distingue par
      sa capacit&eacute; &agrave; fonctionner <strong>sans apprentissage supervis&eacute; co&ucirc;teux</strong>, ouvrant
      ainsi des perspectives concr&egrave;tes pour des d&eacute;ploiements industriels &agrave; grande &eacute;chelle.
    </p>

    <p>
      <strong>
        Ces travaux, men&eacute;s en collaboration entre le LERIA et un partenaire industriel,
        illustrent ma capacit&eacute; &agrave; conduire une recherche appliqu&eacute;e de bout en bout &mdash; de la
        formalisation th&eacute;orique &agrave; l&apos;&eacute;valuation exp&eacute;rimentale sur donn&eacute;es r&eacute;elles &mdash; &agrave;
        l&apos;intersection de la vision par ordinateur, du traitement de documents et de
        l&apos;intelligence artificielle.
      </strong>
    </p>
  </>
);
