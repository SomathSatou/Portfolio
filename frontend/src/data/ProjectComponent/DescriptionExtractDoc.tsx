export const DescriptionExtractDoc = () => (
<>
    <p>
    De nos jours, l'extraction d'informations documentaires est un domaine clé utilisé dans de nombreux secteurs,
    notamment dans l'industrie et les services financiers. j'ai eu l'occasion de travailler sur cette problématique 
    durant
    {' '}
    <a
    href="https://theses.hal.science/tel-05004226/document"
    target="_blank"
    rel="noreferrer"
    >
    ma thèse
    </a>.
    </p>

    <p>
    L'objectif de ce projet était d'implémenter une solution complète pour l'extraction automatique des informations 
    clés des documents, nottament des factures, des analyse de laboratoire et des fiches suiveuse.
    </p>

    <p>
    En s'appuyant sur des techniques de reconaissance de motifs dans des graphes enrichie avec des technique de 
    reconaissance visuel dans les document nous sommes parvenus a extraire éfficacement des tableaux des documents traités.
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
    Nous avons explorer un concept récurent dans l'extraction des informations dans les documents un processus Extract 
    Transform Load (ETL), que nous avons décomposer en plusieurs étapes s'accordant avec notre besoin d'extraire des 
    informations des documents et le traitement de documents qui ne sont pas forcément nativement des documents numériques.
    </p>

    <p>
    Nos travaux se sont principalement concentré sur la partie Transform, ainsi nous avons implémenter un moteur a base de 
    règle pour étiqueter les informations extraites des documents, cela nous positionne dans le domaine appelé Named Entity 
    Recognition (NER).    
    </p>

    <p>
    Une des entité sur laquel nous avons beaucoup travaillé sont les tableaux, en effet nous avons observer que c'est une façons
    de modélisé les données récurrente dans beaucoup de document. 
    </p>

    <p><strong>
    Cette solution a été développée dans le cadre d'un projet de recherche collaboratif avec l'équipe du LERIA de l'université 
    d'Angers et l'entreprise KS2.    
    </strong></p>

</>
);