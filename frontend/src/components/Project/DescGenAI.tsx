export const DescGenAI = () => (
  <>
    <p>
      Cours de <strong>Generative AI</strong> dispensé en cycle ingénieur (Majeure IA, 4e année),
      représentant <strong>12 heures encadrées</strong> sur 8 séances de 1h30. Prérequis : Computer
      Vision (CNN, Transformers, mécanisme d'attention).
    </p>

    <p>
      Ce cours aborde les deux grands axes de l'IA générative — <strong>génération de texte</strong>{' '}
      et <strong>génération d'images</strong> — en combinant cours théoriques, TP guidés et
      évaluations comparatives (60 % pratique).
    </p>

    <h4>Progression pédagogique</h4>
    <ul>
      <li>
        <strong>Séances 1–2 :</strong> Architectures de génération de texte — embeddings,
        tokenisation (BPE, WordPiece), Transformers (encodeur/décodeur, attention multi-têtes),
        familles LLM/SLM (GPT, LLaMA, Mistral, Phi, Gemma), métriques BLEU/ROUGE/Perplexité
      </li>
      <li>
        <strong>Séances 3–4 :</strong> Adaptation de modèles texte — panorama open-source (LLaMA
        3, Mistral, Qwen…), prompt engineering (zero-shot, few-shot, chain-of-thought), fine-tuning
        supervisé, LoRA / QLoRA / PEFT
      </li>
      <li>
        <strong>Séances 5–6 :</strong> Architectures de génération d'images — VAE, GAN (principe
        adversarial, espaces latents), DCGAN / StyleGAN / CycleGAN / Pix2Pix, métriques FID et IS
      </li>
      <li>
        <strong>Séances 7–8 :</strong> Modèles de diffusion et fine-tuning — DDPM/DDIM, Latent
        Diffusion, Stable Diffusion, DreamBooth / LoRA diffusion, ControlNet, ouverture
        multimodale (CLIP, LLaVA)
      </li>
    </ul>

    <h4>Outils &amp; technologies</h4>
    <ul>
      <li>Python, PyTorch</li>
      <li>Hugging Face (transformers, datasets, accelerate, diffusers)</li>
      <li>Notebooks Jupyter, datasets publics (HuggingFace, Kaggle)</li>
    </ul>

    <h4>Évaluation</h4>
    <p>
      Savoir-être (×0,2) · Compréhension architectures (×0,3) · TP + notebooks + analyses
      comparatives (×0,5)
    </p>
  </>
)
