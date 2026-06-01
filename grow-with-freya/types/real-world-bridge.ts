/**
 * Real World Bridge — Types
 *
 * Defines the data model for the post-game "Real World Adventure" storytelling
 * experience. After completing a learning game, a narrated overlay presents 3
 * real-world activities that extend the digital learning into physical play.
 *
 * This is a generic interface applied to ALL game types (spelling, numbers,
 * feelings) — the component looks up bridge data by activityId.
 */

// Re-use the DevelopmentalSkill taxonomy from PHASE-4-PROD-READINESS.md §11.4
// so scaffolding guides and bridge adventures share the same skill vocabulary.

/** Fixed taxonomy of developmental skills — consistent across all guides */
export type DevelopmentalSkill =
  // Literacy & language
  | 'letter-recognition'
  | 'phonics-awareness'
  | 'vocabulary'
  | 'reading-comprehension'
  | 'spelling'
  | 'storytelling'
  // Numeracy
  | 'counting'
  | 'number-recognition'
  | 'addition-subtraction'
  | 'patterns'
  | 'sorting-categorisation'
  | 'spatial-awareness'
  // Social & emotional
  | 'emotional-literacy'
  | 'empathy'
  | 'self-regulation'
  | 'turn-taking'
  | 'patience'
  // Motor & sensory
  | 'fine-motor'
  | 'rhythm-timing'
  | 'listening'
  | 'hand-eye-coordination'
  // Creative
  | 'creative-expression'
  | 'imagination'
  | 'problem-solving'
  // Values
  | 'environmental-awareness'
  | 'kindness';

/** Human-readable labels for developmental skills (i18n key prefix: bridge.skill.*) */
export const SKILL_LABELS: Record<DevelopmentalSkill, string> = {
  'letter-recognition': 'Letter Recognition',
  'phonics-awareness': 'Phonics Awareness',
  'vocabulary': 'Vocabulary',
  'reading-comprehension': 'Reading Comprehension',
  'spelling': 'Spelling',
  'storytelling': 'Storytelling',
  'counting': 'Counting',
  'number-recognition': 'Number Recognition',
  'addition-subtraction': 'Addition & Subtraction',
  'patterns': 'Patterns',
  'sorting-categorisation': 'Sorting & Categorisation',
  'spatial-awareness': 'Spatial Awareness',
  'emotional-literacy': 'Emotional Literacy',
  'empathy': 'Empathy',
  'self-regulation': 'Self-Regulation',
  'turn-taking': 'Turn-Taking',
  'patience': 'Patience',
  'fine-motor': 'Fine Motor Skills',
  'rhythm-timing': 'Rhythm & Timing',
  'listening': 'Listening',
  'hand-eye-coordination': 'Hand-Eye Coordination',
  'creative-expression': 'Creative Expression',
  'imagination': 'Imagination',
  'problem-solving': 'Problem Solving',
  'environmental-awareness': 'Environmental Awareness',
  'kindness': 'Kindness',
};

/** Adventure category — where the real-world activity takes place */
export type AdventureCategory = 'at-home' | 'outdoors' | 'creative';

/** Ionicons icon name for each adventure category */
export const ADVENTURE_CATEGORY_ICONS: Record<AdventureCategory, string> = {
  'at-home': 'home-outline',
  'outdoors': 'leaf-outline',
  'creative': 'color-palette-outline',
};

/** i18n key for each adventure category label */
export const ADVENTURE_CATEGORY_KEYS: Record<AdventureCategory, string> = {
  'at-home': 'bridge.atHome',
  'outdoors': 'bridge.outdoors',
  'creative': 'bridge.creative',
};

/** A single real-world activity suggestion */
export interface RealWorldAdventure {
  /** Where this activity takes place */
  category: AdventureCategory;
  /** i18n key for the activity description */
  descriptionKey: string;
  /** Developmental skills this activity reinforces */
  skills: DevelopmentalSkill[];
}

/** Game section — determines gradient theming, character, and tone */
export type GameSection = 'spelling' | 'numbers' | 'feelings';

/** Bridge content for a single game activity */
export interface RealWorldBridgeData {
  /** Activity ID this bridge belongs to (must match learning-screen.tsx activity ID) */
  activityId: string;
  /** Game section for theming */
  section: GameSection;
  /** i18n key for Wombat's narration text — the "story moment" */
  narrationKey: string;
  /** Exactly 3 adventure suggestions — one per category */
  adventures: [RealWorldAdventure, RealWorldAdventure, RealWorldAdventure];
  /** i18n key for closing encouragement line */
  closingKey: string;
}

/** Props for the generic overlay component */
export interface RealWorldBridgeOverlayProps {
  visible: boolean;
  /** Activity ID to look up bridge data */
  activityId: string;
  /** Game section for theming */
  gameSection: GameSection;
  /** Called when the user dismisses the overlay */
  onDismiss: () => void;
}
