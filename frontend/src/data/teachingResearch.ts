import type { ReactNode } from 'react'
import type { Category, Project, Session } from './projects'

import { DescICTAI2024 } from '../components/Project/DescICTAI2024'
import { DescOverview } from '../components/Project/DescOverview'
import { DescComputerVision } from '../components/Project/DescComputerVision'
import { DescGenAI } from '../components/Project/DescGenAI'
import { DescProjetLSF } from '../components/Project/DescProjetLSF'
import { DescProjetOCR } from '../components/Project/DescProjetOCR'

function toSlug(label: string) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const P = (title: string, category: string, extra: Partial<Project> = {}): Project => ({
  slug: extra.slug ?? toSlug(title),
  title,
  description: (extra.description ?? 'Description à venir.') as ReactNode,
  category,
  tags: extra.tags,
  github: extra.github ?? 'https://github.com/SomathSatou',
  image: extra.image,
})

export const teachingResearchProjects: Project[] = [
  // Recherche
  P('ICTAI 2024', 'Recherche', {
    tags: ['IEEE', 'Conférence', 'Extraction de tableaux', 'Vision par ordinateur', 'Graphes'],
    description: DescICTAI2024(),
  }),
  P('Overview', 'Recherche', {
    tags: ['IEEE Access', "État de l'art", 'Extraction de données', 'Factures', 'Survey'],
    description: DescOverview(),
  }),

  // Formation
  P('Vercel', 'Formation'),
  P('Supabase', 'Formation'),
  P('OpenRouter', 'Formation'),

  P('Computer Vision', 'Enseignement', {
    tags: ['CNN', 'Transformers', 'OCR', 'ViT', 'PyTorch', 'OpenCV', '18h'],
    description: DescComputerVision(),
    sessions: [
      {
        id: 'intro-cnn',
        title: 'Séances 1–2 : Introduction à la Computer Vision',
        duration: '3h',
        description:
          'Représentation d’images (RGB, tenseurs), rappels CNN (convolutions, pooling, activation), manipulation OpenCV.',
      },
      {
        id: 'architectures-avancees',
        title: 'Séances 3–4 : Architectures CNN avancées',
        duration: '3h',
        description:
          'VGG, ResNet, MobileNet, transfert d’apprentissage, augmentation de données (TP noté).',
      },
      {
        id: 'ocr',
        title: 'Séances 5–6 : OCR',
        duration: '3h',
        description:
          'Détection (EAST, CRAFT) et reconnaissance de texte (CRNN), métriques CER/WER.',
      },
      {
        id: 'vision-transformers',
        title: 'Séances 7–8 : Vision Transformers',
        duration: '3h',
        description: 'ViT, TrOCR, comparaison CRNN vs TrOCR (TP comparatif).',
      },
      {
        id: 'mini-projet',
        title: 'Séances 9–10 : Mini-projet',
        duration: '3h',
        description:
          'Pipeline complet au choix : OCR calligraphique, suivi d’objets, classification spécialisée.',
      },
      {
        id: 'presentations',
        title: 'Séances 11–12 : Présentations et ouverture',
        duration: '3h',
        description:
          'Présentations orales, feedback collectif, ouverture GenAI et agents multimodaux.',
      },
    ] satisfies Session[],
  }),
  P('Generative AI', 'Enseignement', {
    tags: ['LLM', 'GAN', 'Diffusion', 'Fine-tuning', 'LoRA', 'Hugging Face', '12h'],
    description: DescGenAI(),
    sessions: [
      {
        id: 'generation-texte',
        title: 'Séances 1–2 : Architectures de génération de texte',
        duration: '3h',
        description:
          'Embeddings, tokenisation (BPE, WordPiece), Transformers (encodeur/décodeur, attention multi-têtes), familles LLM/SLM (GPT, LLaMA, Mistral, Phi, Gemma), métriques BLEU/ROUGE/Perplexité.',
      },
      {
        id: 'adaptation-texte',
        title: 'Séances 3–4 : Adaptation de modèles texte',
        duration: '3h',
        description:
          'Panorama open-source (LLaMA 3, Mistral, Qwen…), prompt engineering (zero-shot, few-shot, chain-of-thought), fine-tuning supervisé, LoRA / QLoRA / PEFT.',
      },
      {
        id: 'generation-images',
        title: 'Séances 5–6 : Architectures de génération d’images',
        duration: '3h',
        description:
          'VAE, GAN (principe adversarial, espaces latents), DCGAN / StyleGAN / CycleGAN / Pix2Pix, métriques FID et IS.',
      },
      {
        id: 'diffusion',
        title: 'Séances 7–8 : Modèles de diffusion et fine-tuning',
        duration: '3h',
        description:
          'DDPM/DDIM, Latent Diffusion, Stable Diffusion, DreamBooth / LoRA diffusion, ControlNet, ouverture multimodale (CLIP, LLaVA).',
      },
    ] satisfies Session[],
  }),

  // Projets encadrés (Projet Majeur IA)
  P('Reconnaissance LSF', 'Enseignement', {
    slug: 'reconnaissance-lsf',
    tags: ['Computer Vision', 'LSF', 'MediaPipe', 'Temps réel', 'Médical', 'Projet encadré'],
    description: DescProjetLSF(),
  }),
  P('OCR Écriture Manuscrite', 'Enseignement', {
    slug: 'ocr-ecriture-manuscrite',
    tags: ['OCR', 'TrOCR', 'Tesseract', 'Hugging Face', 'NLP', 'Projet encadré'],
    description: DescProjetOCR(),
  }),
]

export const teachingResearchCategories: Category[] = [
  {
    name: 'Recherche',
    projectSlugs: teachingResearchProjects
      .filter((p) => p.category === 'Recherche')
      .map((p) => p.slug),
  },
  {
    name: 'Formation',
    projectSlugs: teachingResearchProjects
      .filter((p) => p.category === 'Formation')
      .map((p) => p.slug),
  },
  {
    name: 'Enseignement',
    projectSlugs: teachingResearchProjects
      .filter((p) => p.category === 'Enseignement')
      .map((p) => p.slug),
  }
]
