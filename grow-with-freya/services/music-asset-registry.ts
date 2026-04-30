/**
 * LocalMusicAssetRegistry
 *
 * Registry for locally bundled music assets: instruments and note samples.
 * All music assets are local on-device — CMS metadata only references stable asset IDs.
 *
 * Supported instruments: flute, recorder, ocarina, trumpet, clarinet, saxophone
 *
 * Asset directory structure:
 *   assets/music/instruments/{instrumentId}.png       — instrument image
 *   assets/music/notes/{instrumentFamily}/{note}.wav  — individual note samples
 *
 * Success melodies are played back note-by-note using the instrument's own samples
 * after a music challenge is completed — no pre-recorded song files needed.
 *
 * Stories configure which instrument to use via:
 *   - CMS metadata: page.musicChallenge.instrumentId (e.g., "flute")
 *   - Local bundled stories: same field in data/bundled-stories.ts page definitions
 *
 * See MUSIC_FEATURE.md for full documentation.
 */

import { Logger } from '@/utils/logger';

const log = Logger.create('MusicAssetRegistry');

// Note names that can be part of a sequence
export type NoteName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

// Instrument family (the physical instrument type)
export type InstrumentFamily = 'flute' | 'recorder' | 'ocarina' | 'trumpet' | 'clarinet' | 'saxophone';

// Instrument definition with visual + audio assets
export interface InstrumentDefinition {
  id: string; // Stable ID referenced by CMS/stories (e.g., "flute", "trumpet")
  family: InstrumentFamily; // Instrument family — maps to note sample folder
  displayName: string; // Child-friendly display name
  description: string; // Short description for tooltips / accessibility
  image: number; // require() result for local instrument image
  notes: Record<string, number>; // noteName -> require() result for note audio sample
  noteLayout: NoteLayoutItem[]; // Visual layout for on-screen note buttons
  noteCount: number; // Number of playable notes (for UI layout decisions)
}

// Visual layout for a single note button
export interface NoteLayoutItem {
  note: string;
  label: string; // Display label (emoji/icon for children, not music notation)
  color: string; // Button background color
  icon?: string; // Optional icon identifier for themed rendering
}



// ============================================================================
// INSTRUMENT REGISTRY
//
// Each instrument has a unique child-friendly theme with colored icon buttons.
// Audio/image require() calls are commented out until real asset files are added.
// To activate an instrument: add the asset files, then uncomment the require() lines.
//
// Asset placement:
//   Image:  assets/music/instruments/{id}.png
//   Notes:  assets/music/notes/{family}/C.mp3, D.mp3, etc.
// ============================================================================

const INSTRUMENTS: Record<string, InstrumentDefinition> = {
  flute: {
    id: 'flute',
    family: 'flute',
    displayName: 'Magic Flute',
    description: 'A gentle flute with a light, airy sound',
    image: require('@/assets/music/instruments/flute.png'),
    notes: {
      C: require('@/assets/music/notes/flute/C.wav'),
      D: require('@/assets/music/notes/flute/D.wav'),
      E: require('@/assets/music/notes/flute/E.wav'),
      F: require('@/assets/music/notes/flute/F.wav'),
      G: require('@/assets/music/notes/flute/G.wav'),
      A: require('@/assets/music/notes/flute/A.wav'),
    },
    noteCount: 6,
    noteLayout: [
      { note: 'C', label: '⭐', color: '#4FC3F7', icon: 'star' },
      { note: 'D', label: '🌙', color: '#FFD54F', icon: 'moon' },
      { note: 'E', label: '🍃', color: '#81C784', icon: 'leaf' },
      { note: 'F', label: '🌸', color: '#F48FB1', icon: 'flower' },
      { note: 'G', label: '☀️', color: '#FFB74D', icon: 'sun' },
      { note: 'A', label: '💧', color: '#4DD0E1', icon: 'droplet' },
    ],
  },

  recorder: {
    id: 'recorder',
    family: 'recorder',
    displayName: 'Woodland Recorder',
    description: 'A warm recorder with a soft, woody tone',
    image: require('@/assets/music/instruments/recorder.png'),
    notes: {
      C: require('@/assets/music/notes/recorder/C.wav'),
      D: require('@/assets/music/notes/recorder/D.wav'),
      E: require('@/assets/music/notes/recorder/E.wav'),
      F: require('@/assets/music/notes/recorder/F.wav'),
      G: require('@/assets/music/notes/recorder/G.wav'),
    },
    noteCount: 5,
    noteLayout: [
      { note: 'C', label: '🌲', color: '#66BB6A', icon: 'tree' },
      { note: 'D', label: '🍄', color: '#EF5350', icon: 'mushroom' },
      { note: 'E', label: '🦋', color: '#AB47BC', icon: 'butterfly' },
      { note: 'F', label: '🐦', color: '#42A5F5', icon: 'bird' },
      { note: 'G', label: '🌻', color: '#FFA726', icon: 'sunflower' },
    ],
  },

  ocarina: {
    id: 'ocarina',
    family: 'ocarina',
    displayName: 'Enchanted Ocarina',
    description: 'A mysterious ocarina with a dreamy, magical sound',
    image: require('@/assets/music/instruments/ocarina.png'),
    notes: {
      C: require('@/assets/music/notes/ocarina/C.wav'),
      D: require('@/assets/music/notes/ocarina/D.wav'),
      E: require('@/assets/music/notes/ocarina/E.wav'),
      F: require('@/assets/music/notes/ocarina/F.wav'),
      G: require('@/assets/music/notes/ocarina/G.wav'),
    },
    noteCount: 5,
    noteLayout: [
      { note: 'C', label: '🔮', color: '#7E57C2', icon: 'crystal' },
      { note: 'D', label: '✨', color: '#5C6BC0', icon: 'sparkle' },
      { note: 'E', label: '🌟', color: '#26C6DA', icon: 'glow' },
      { note: 'F', label: '🦉', color: '#8D6E63', icon: 'owl' },
      { note: 'G', label: '🌌', color: '#3F51B5', icon: 'galaxy' },
    ],
  },

  trumpet: {
    id: 'trumpet',
    family: 'trumpet',
    displayName: 'Golden Trumpet',
    description: 'A bright trumpet with a bold, heroic sound',
    image: require('@/assets/music/instruments/trumpet.png'),
    notes: {
      C: require('@/assets/music/notes/trumpet/C.wav'),
      D: require('@/assets/music/notes/trumpet/D.wav'),
      E: require('@/assets/music/notes/trumpet/E.wav'),
      F: require('@/assets/music/notes/trumpet/F.wav'),
    },
    noteCount: 4,
    noteLayout: [
      { note: 'C', label: '🛡️', color: '#FFA000', icon: 'shield' },
      { note: 'D', label: '⚔️', color: '#F4511E', icon: 'sword' },
      { note: 'E', label: '👑', color: '#FFD600', icon: 'crown' },
      { note: 'F', label: '🏰', color: '#6D4C41', icon: 'castle' },
    ],
  },

  clarinet: {
    id: 'clarinet',
    family: 'clarinet',
    displayName: 'Jazzy Clarinet',
    description: 'A smooth clarinet with a rich, jazzy tone',
    image: require('@/assets/music/instruments/clarinet.png'),
    notes: {
      C: require('@/assets/music/notes/clarinet/C.wav'),
      D: require('@/assets/music/notes/clarinet/D.wav'),
      E: require('@/assets/music/notes/clarinet/E.wav'),
      F: require('@/assets/music/notes/clarinet/F.wav'),
      G: require('@/assets/music/notes/clarinet/G.wav'),
    },
    noteCount: 5,
    noteLayout: [
      { note: 'C', label: '🎩', color: '#37474F', icon: 'hat' },
      { note: 'D', label: '🎷', color: '#795548', icon: 'sax' },
      { note: 'E', label: '🌃', color: '#1A237E', icon: 'city' },
      { note: 'F', label: '🎭', color: '#C62828', icon: 'mask' },
      { note: 'G', label: '🎪', color: '#AD1457', icon: 'tent' },
    ],
  },

  saxophone: {
    id: 'saxophone',
    family: 'saxophone',
    displayName: 'Sunshine Saxophone',
    description: 'A funky saxophone with a warm, soulful sound',
    image: require('@/assets/music/instruments/saxophone.png'),
    notes: {
      C: require('@/assets/music/notes/saxophone/C.wav'),
      D: require('@/assets/music/notes/saxophone/D.wav'),
      E: require('@/assets/music/notes/saxophone/E.wav'),
      F: require('@/assets/music/notes/saxophone/F.wav'),
      G: require('@/assets/music/notes/saxophone/G.wav'),
    },
    noteCount: 5,
    noteLayout: [
      { note: 'C', label: '🌈', color: '#EC407A', icon: 'rainbow' },
      { note: 'D', label: '🎸', color: '#FF7043', icon: 'guitar' },
      { note: 'E', label: '🥁', color: '#8E24AA', icon: 'drum' },
      { note: 'F', label: '🎤', color: '#00897B', icon: 'mic' },
      { note: 'G', label: '💃', color: '#FDD835', icon: 'dance' },
    ],
  },
};



// Backward compatibility aliases (old ID → new ID)
// The original implementation used "flute_basic" — now simplified to "flute".
const INSTRUMENT_ALIASES: Record<string, string> = {
  flute_basic: 'flute',
  recorder_basic: 'recorder',
  ocarina_basic: 'ocarina',
  trumpet_basic: 'trumpet',
  clarinet_basic: 'clarinet',
  saxophone_basic: 'saxophone',
};

/**
 * Get an instrument definition by ID.
 * Supports backward-compatible aliases (e.g., "flute_basic" → "flute").
 * Returns undefined if the instrument is not registered.
 */
export function getInstrument(instrumentId: string): InstrumentDefinition | undefined {
  // Try direct lookup first, then alias
  const resolvedId = INSTRUMENTS[instrumentId] ? instrumentId : (INSTRUMENT_ALIASES[instrumentId] ?? instrumentId);
  const instrument = INSTRUMENTS[resolvedId];
  if (!instrument) {
    log.warn(`Instrument not found: ${instrumentId}`);
  }
  return instrument;
}

/**
 * Get all instruments belonging to a specific family.
 */
export function getInstrumentsByFamily(family: InstrumentFamily): InstrumentDefinition[] {
  return Object.values(INSTRUMENTS).filter(i => i.family === family);
}

/**
 * Validate that all assets referenced by a music challenge config exist locally.
 * Returns a list of missing asset IDs (empty = all valid).
 *
 * Note: Only validates instrument and note assets. Success songs are no longer
 * pre-recorded — the app plays back the requiredSequence note-by-note using the
 * instrument's own samples after challenge completion.
 */
export function validateMusicChallengeAssets(
  instrumentId: string,
  requiredSequence: string[],
): string[] {
  const missing: string[] = [];

  const resolvedId = INSTRUMENTS[instrumentId] ? instrumentId : (INSTRUMENT_ALIASES[instrumentId] ?? instrumentId);
  const instrument = INSTRUMENTS[resolvedId];
  if (!instrument) {
    missing.push(`instrument:${instrumentId}`);
  } else {
    // Check that all required notes exist
    for (const note of requiredSequence) {
      if (!(note in instrument.notes) || !instrument.notes[note]) {
        missing.push(`note:${instrumentId}/${note}`);
      }
    }
  }

  if (missing.length > 0) {
    log.error(`Missing music assets: ${missing.join(', ')}`);
  }

  return missing;
}

/**
 * Get all registered instrument IDs.
 */
export function getAvailableInstrumentIds(): string[] {
  return Object.keys(INSTRUMENTS);
}

/**
 * Register a new instrument at runtime (for testing or dynamic loading).
 */
export function registerInstrument(instrument: InstrumentDefinition): void {
  INSTRUMENTS[instrument.id] = instrument;
  log.debug(`Registered instrument: ${instrument.id}`);
}

// ============================================================================
// PRACTICE SONG LIBRARY
//
// Songs for Practise mode — defined as note sequences only (no pre-recorded audio).
// Each song specifies which notes to play; the instrument samples provide the sound.
// Songs are instrument-agnostic: any instrument can play them as long as it has the
// required notes. The UI filters songs by the selected instrument's available notes.
// ============================================================================

export type PracticeSongDifficulty = 'easy' | 'medium' | 'hard';
export type PracticeSongCategory = 'nursery' | 'storybook' | 'forces';

export interface PracticeSong {
  id: string;
  nameKey: string;             // i18n key under music.songs.*
  difficulty: PracticeSongDifficulty;
  category: PracticeSongCategory;
  /** The note sequence to play (e.g. ['C','D','E','D','C']) */
  sequence: string[];
  /** Notes used in this song (derived, but stored for quick filtering) */
  requiredNotes: string[];
  /** Tempo hint in BPM (used for preview playback speed) */
  bpm?: number;
}

const PRACTICE_SONGS: PracticeSong[] = [
  // =====================================================================
  // NURSERY RHYMES — IP-free / public domain melodies
  // =====================================================================

  // ---- Easy nursery rhymes ----
  {
    id: 'hot_cross_buns',
    nameKey: 'music.songs.hotCrossBuns',
    difficulty: 'easy',
    category: 'nursery',
    sequence: ['E', 'D', 'C', 'E', 'D', 'C', 'C', 'C', 'D', 'D', 'E', 'D', 'C'],
    requiredNotes: ['C', 'D', 'E'],
    bpm: 100,
  },
  {
    id: 'rain_rain',
    nameKey: 'music.songs.rainRain',
    difficulty: 'easy',
    category: 'nursery',
    sequence: ['E', 'E', 'C', 'E', 'E', 'C', 'E', 'F', 'E', 'D', 'C', 'D', 'E'],
    requiredNotes: ['C', 'D', 'E', 'F'],
    bpm: 95,
  },
  {
    id: 'au_clair_lune',
    nameKey: 'music.songs.auClairLune',
    difficulty: 'easy',
    category: 'nursery',
    sequence: ['C', 'C', 'C', 'D', 'E', 'D', 'C', 'E', 'D', 'D', 'C'],
    requiredNotes: ['C', 'D', 'E'],
    bpm: 90,
  },
  {
    id: 'mary_lamb',
    nameKey: 'music.songs.maryLamb',
    difficulty: 'easy',
    category: 'nursery',
    sequence: ['E', 'D', 'C', 'D', 'E', 'E', 'E', 'D', 'D', 'D', 'E', 'G', 'G'],
    requiredNotes: ['C', 'D', 'E', 'G'],
    bpm: 110,
  },
  {
    id: 'itsy_bitsy_spider',
    nameKey: 'music.songs.itsyBitsySpider',
    difficulty: 'easy',
    category: 'nursery',
    sequence: ['G', 'C', 'C', 'C', 'D', 'E', 'E', 'D', 'C', 'D', 'E', 'C'],
    requiredNotes: ['C', 'D', 'E', 'G'],
    bpm: 100,
  },
  {
    id: 'row_row_boat',
    nameKey: 'music.songs.rowRowBoat',
    difficulty: 'easy',
    category: 'nursery',
    sequence: ['C', 'C', 'C', 'D', 'E', 'E', 'D', 'E', 'F', 'G'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 85,
  },

  // ---- Medium nursery rhymes ----
  {
    id: 'twinkle_star',
    nameKey: 'music.songs.twinkleStar',
    difficulty: 'medium',
    category: 'nursery',
    sequence: ['C', 'C', 'G', 'G', 'A', 'A', 'G', 'F', 'F', 'E', 'E', 'D', 'D', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G', 'A'],
    bpm: 100,
  },
  {
    id: 'ode_to_joy',
    nameKey: 'music.songs.odeToJoy',
    difficulty: 'medium',
    category: 'nursery',
    sequence: ['E', 'E', 'F', 'G', 'G', 'F', 'E', 'D', 'C', 'C', 'D', 'E', 'E', 'D', 'D'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 108,
  },
  {
    id: 'london_bridge',
    nameKey: 'music.songs.londonBridge',
    difficulty: 'medium',
    category: 'nursery',
    sequence: ['G', 'A', 'G', 'F', 'E', 'F', 'G', 'D', 'E', 'F', 'E', 'F', 'G'],
    requiredNotes: ['D', 'E', 'F', 'G', 'A'],
    bpm: 112,
  },
  {
    id: 'three_blind_mice',
    nameKey: 'music.songs.threeBlindMice',
    difficulty: 'medium',
    category: 'nursery',
    sequence: ['E', 'D', 'C', 'E', 'D', 'C', 'G', 'F', 'F', 'E', 'G', 'F', 'F', 'E'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 105,
  },
  {
    id: 'humpty_dumpty',
    nameKey: 'music.songs.humptyDumpty',
    difficulty: 'medium',
    category: 'nursery',
    sequence: ['C', 'E', 'G', 'G', 'E', 'C', 'D', 'E', 'F', 'E', 'D'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 90,
  },
  {
    id: 'jack_and_jill',
    nameKey: 'music.songs.jackAndJill',
    difficulty: 'medium',
    category: 'nursery',
    sequence: ['C', 'D', 'E', 'F', 'G', 'G', 'G', 'G', 'F', 'E', 'F', 'G', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 105,
  },
  {
    id: 'old_macdonald',
    nameKey: 'music.songs.oldMacdonald',
    difficulty: 'medium',
    category: 'nursery',
    sequence: ['C', 'C', 'C', 'G', 'A', 'A', 'G', 'E', 'E', 'D', 'D', 'C'],
    requiredNotes: ['C', 'D', 'E', 'G', 'A'],
    bpm: 110,
  },

  // ---- Hard nursery rhymes ----
  {
    id: 'jingle_bells',
    nameKey: 'music.songs.jingleBells',
    difficulty: 'hard',
    category: 'nursery',
    sequence: ['E', 'E', 'E', 'E', 'E', 'E', 'E', 'G', 'C', 'D', 'E', 'F', 'F', 'F', 'F', 'F', 'E', 'E', 'E', 'E', 'D', 'D', 'E', 'D', 'G'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 120,
  },
  {
    id: 'frere_jacques',
    nameKey: 'music.songs.frereJacques',
    difficulty: 'hard',
    category: 'nursery',
    sequence: ['C', 'D', 'E', 'C', 'C', 'D', 'E', 'C', 'E', 'F', 'G', 'E', 'F', 'G', 'G', 'A', 'G', 'F', 'E', 'C', 'G', 'A', 'G', 'F', 'E', 'C', 'C', 'G', 'C', 'C', 'G', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G', 'A'],
    bpm: 120,
  },
  {
    id: 'happy_birthday',
    nameKey: 'music.songs.happyBirthday',
    difficulty: 'hard',
    category: 'nursery',
    sequence: ['C', 'C', 'D', 'C', 'F', 'E', 'C', 'C', 'D', 'C', 'G', 'F', 'C', 'C', 'A', 'F', 'E', 'D'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G', 'A'],
    bpm: 100,
  },
  {
    id: 'hickory_dickory',
    nameKey: 'music.songs.hickoryDickory',
    difficulty: 'hard',
    category: 'nursery',
    sequence: ['G', 'A', 'G', 'E', 'C', 'G', 'A', 'G', 'E', 'C', 'D', 'E', 'E', 'D', 'C'],
    requiredNotes: ['C', 'D', 'E', 'G', 'A'],
    bpm: 115,
  },

  // =====================================================================
  // STORYBOOK SONGS — Original compositions for storybook instrument play
  // =====================================================================

  // ---- Easy storybook songs ----
  {
    id: 'raindrop_song',
    nameKey: 'music.songs.raindropSong',
    difficulty: 'easy',
    category: 'storybook',
    sequence: ['E', 'E', 'D', 'D', 'C', 'C', 'D', 'E', 'E', 'D', 'D', 'C'],
    requiredNotes: ['C', 'D', 'E'],
    bpm: 110,
  },
  {
    id: 'dreamtime_lullaby',
    nameKey: 'music.songs.dreamtimeLullaby',
    difficulty: 'easy',
    category: 'storybook',
    sequence: ['E', 'D', 'C', 'D', 'E', 'D', 'C', 'E', 'D', 'C'],
    requiredNotes: ['C', 'D', 'E'],
    bpm: 70,
  },
  {
    id: 'ocean_waves',
    nameKey: 'music.songs.oceanWaves',
    difficulty: 'easy',
    category: 'storybook',
    sequence: ['C', 'D', 'E', 'F', 'E', 'D', 'C', 'D', 'E', 'F', 'E', 'D', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F'],
    bpm: 80,
  },

  // ---- Medium storybook songs ----
  {
    id: 'forest_wander',
    nameKey: 'music.songs.forestWander',
    difficulty: 'medium',
    category: 'storybook',
    sequence: ['C', 'E', 'G', 'E', 'C', 'E', 'G', 'E', 'D', 'F', 'D', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 90,
  },
  {
    id: 'starlight_dance',
    nameKey: 'music.songs.starlightDance',
    difficulty: 'medium',
    category: 'storybook',
    sequence: ['G', 'E', 'G', 'E', 'F', 'D', 'F', 'D', 'E', 'C', 'E', 'G', 'F', 'E', 'D', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 100,
  },
  {
    id: 'mountain_echo',
    nameKey: 'music.songs.mountainEcho',
    difficulty: 'medium',
    category: 'storybook',
    sequence: ['C', 'D', 'E', 'F', 'G', 'G', 'F', 'E', 'D', 'C', 'E', 'G', 'E', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 95,
  },
  {
    id: 'butterfly_flight',
    nameKey: 'music.songs.butterflyFlight',
    difficulty: 'medium',
    category: 'storybook',
    sequence: ['E', 'G', 'F', 'E', 'D', 'F', 'E', 'D', 'C', 'E', 'D', 'C', 'D', 'E', 'F', 'G'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 105,
  },
  {
    id: 'moonbeam_waltz',
    nameKey: 'music.songs.moonbeamWaltz',
    difficulty: 'medium',
    category: 'storybook',
    sequence: ['C', 'E', 'G', 'F', 'D', 'F', 'E', 'C', 'E', 'D', 'C', 'D', 'E', 'G', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 85,
  },

  // ---- Hard storybook songs ----
  {
    id: 'sunrise_march',
    nameKey: 'music.songs.sunriseMarch',
    difficulty: 'hard',
    category: 'storybook',
    sequence: ['C', 'C', 'D', 'E', 'E', 'F', 'G', 'G', 'A', 'G', 'F', 'E', 'D', 'C', 'D', 'E', 'F', 'G', 'A'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G', 'A'],
    bpm: 100,
  },
  {
    id: 'river_journey',
    nameKey: 'music.songs.riverJourney',
    difficulty: 'hard',
    category: 'storybook',
    sequence: ['C', 'D', 'E', 'G', 'F', 'E', 'D', 'C', 'D', 'F', 'E', 'G', 'F', 'E', 'D', 'E', 'F', 'G', 'E', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 95,
  },

  // =====================================================================
  // FORCES SONGS — Slow, smooth melodies representing physical forces
  // Used in storybooks to teach push, pull, lift, lower, break, and fix.
  // =====================================================================
  {
    id: 'song_of_push',
    nameKey: 'music.songs.songOfPush',
    difficulty: 'easy',
    category: 'forces',
    sequence: ['C', 'D', 'E', 'F', 'G', 'F', 'E', 'G'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 70,
  },
  {
    id: 'song_of_pull',
    nameKey: 'music.songs.songOfPull',
    difficulty: 'easy',
    category: 'forces',
    sequence: ['G', 'F', 'E', 'D', 'C', 'D', 'E', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 70,
  },
  {
    id: 'song_of_lift',
    nameKey: 'music.songs.songOfLift',
    difficulty: 'easy',
    category: 'forces',
    sequence: ['C', 'E', 'G', 'E', 'C', 'E', 'F', 'G'],
    requiredNotes: ['C', 'E', 'F', 'G'],
    bpm: 70,
  },
  {
    id: 'song_of_lower',
    nameKey: 'music.songs.songOfLower',
    difficulty: 'easy',
    category: 'forces',
    sequence: ['G', 'E', 'C', 'E', 'G', 'F', 'D', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 70,
  },
  {
    id: 'song_of_break',
    nameKey: 'music.songs.songOfBreak',
    difficulty: 'easy',
    category: 'forces',
    sequence: ['G', 'C', 'F', 'D', 'E', 'C', 'G', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F', 'G'],
    bpm: 70,
  },
  {
    id: 'song_of_fix',
    nameKey: 'music.songs.songOfFix',
    difficulty: 'easy',
    category: 'forces',
    sequence: ['C', 'D', 'E', 'F', 'E', 'D', 'E', 'C'],
    requiredNotes: ['C', 'D', 'E', 'F'],
    bpm: 70,
  },
];

/**
 * Get all practice songs that can be played with a given instrument.
 * Filters out songs whose required notes exceed the instrument's available notes.
 */
export function getPracticeSongsForInstrument(instrumentId: string): PracticeSong[] {
  const instrument = getInstrument(instrumentId);
  if (!instrument) return [];
  const availableNotes = new Set(Object.keys(instrument.notes));
  return PRACTICE_SONGS.filter(song =>
    song.requiredNotes.every(note => availableNotes.has(note))
  );
}

/**
 * Get a specific practice song by ID.
 */
export function getPracticeSong(songId: string): PracticeSong | undefined {
  return PRACTICE_SONGS.find(s => s.id === songId);
}

/**
 * Get all practice songs.
 */
export function getAllPracticeSongs(): PracticeSong[] {
  return [...PRACTICE_SONGS];
}
