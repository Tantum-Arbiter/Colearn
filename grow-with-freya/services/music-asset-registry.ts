/**
 * LocalMusicAssetRegistry
 *
 * Registry for locally bundled music assets: instruments, note samples, and success songs.
 * All music assets are local on-device — CMS metadata only references stable asset IDs.
 *
 * Supported instruments: flute, recorder, ocarina, trumpet, clarinet, saxophone
 *
 * Asset directory structure:
 *   assets/music/instruments/{instrumentId}.png       — instrument image
 *   assets/music/notes/{instrumentFamily}/{note}.mp3  — individual note samples
 *   assets/music/songs/{songId}.mp3                   — success/celebration songs
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

// Song definition
export interface SongDefinition {
  id: string;
  displayName: string;
  audio: number; // require() result for local audio
  duration?: number; // Duration in seconds (optional, used for completion timer)
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

// ============================================================================
// SONG REGISTRY
//
// Songs are celebration tracks played after a challenge is completed.
// To add a song: place the MP3 in assets/music/songs/ and add an entry here.
// ============================================================================

const SONGS: Record<string, SongDefinition> = {
  // Uncomment and add require() when asset files exist:
  // gary_rock_lift_theme_v1: {
  //   id: 'gary_rock_lift_theme_v1',
  //   displayName: 'Gary Lifts the Rock',
  //   audio: require('@/assets/music/songs/gary_rock_lift_theme_v1.mp3'),
  //   duration: 15,
  // },
  // Flute versions (default — base ID used when no instrument match found)
  wombat_lullaby_v1: {
    id: 'wombat_lullaby_v1',
    displayName: 'Wombat Lullaby',
    audio: require('@/assets/music/songs/wombat_lullaby_flute_v1.wav'),
    duration: 10,
  },
  // Flute explicit match (for getInstrumentSong('wombat_lullaby_v1', 'flute'))
  wombat_lullaby_flute_v1: {
    id: 'wombat_lullaby_flute_v1',
    displayName: 'Wombat Lullaby (Flute)',
    audio: require('@/assets/music/songs/wombat_lullaby_flute_v1.wav'),
    duration: 10,
  },
  wombat_burrow_v1: {
    id: 'wombat_burrow_v1',
    displayName: 'Wombat Burrow Song',
    audio: require('@/assets/music/songs/wombat_burrow_flute_v1.wav'),
    duration: 14,
  },
  wombat_burrow_flute_v1: {
    id: 'wombat_burrow_flute_v1',
    displayName: 'Wombat Burrow Song (Flute)',
    audio: require('@/assets/music/songs/wombat_burrow_flute_v1.wav'),
    duration: 14,
  },
  // Recorder versions
  wombat_lullaby_recorder_v1: {
    id: 'wombat_lullaby_recorder_v1',
    displayName: 'Wombat Lullaby (Recorder)',
    audio: require('@/assets/music/songs/wombat_lullaby_recorder_v1.wav'),
    duration: 10,
  },
  wombat_burrow_recorder_v1: {
    id: 'wombat_burrow_recorder_v1',
    displayName: 'Wombat Burrow Song (Recorder)',
    audio: require('@/assets/music/songs/wombat_burrow_recorder_v1.wav'),
    duration: 14,
  },
  // Ocarina versions
  wombat_lullaby_ocarina_v1: {
    id: 'wombat_lullaby_ocarina_v1',
    displayName: 'Wombat Lullaby (Ocarina)',
    audio: require('@/assets/music/songs/wombat_lullaby_ocarina_v1.wav'),
    duration: 10,
  },
  wombat_burrow_ocarina_v1: {
    id: 'wombat_burrow_ocarina_v1',
    displayName: 'Wombat Burrow Song (Ocarina)',
    audio: require('@/assets/music/songs/wombat_burrow_ocarina_v1.wav'),
    duration: 14,
  },
  // Trumpet versions
  wombat_lullaby_trumpet_v1: {
    id: 'wombat_lullaby_trumpet_v1',
    displayName: 'Wombat Lullaby (Trumpet)',
    audio: require('@/assets/music/songs/wombat_lullaby_trumpet_v1.wav'),
    duration: 10,
  },
  wombat_burrow_trumpet_v1: {
    id: 'wombat_burrow_trumpet_v1',
    displayName: 'Wombat Burrow Song (Trumpet)',
    audio: require('@/assets/music/songs/wombat_burrow_trumpet_v1.wav'),
    duration: 14,
  },
  // Clarinet versions
  wombat_lullaby_clarinet_v1: {
    id: 'wombat_lullaby_clarinet_v1',
    displayName: 'Wombat Lullaby (Clarinet)',
    audio: require('@/assets/music/songs/wombat_lullaby_clarinet_v1.wav'),
    duration: 10,
  },
  wombat_burrow_clarinet_v1: {
    id: 'wombat_burrow_clarinet_v1',
    displayName: 'Wombat Burrow Song (Clarinet)',
    audio: require('@/assets/music/songs/wombat_burrow_clarinet_v1.wav'),
    duration: 14,
  },
  // Saxophone versions
  wombat_lullaby_saxophone_v1: {
    id: 'wombat_lullaby_saxophone_v1',
    displayName: 'Wombat Lullaby (Saxophone)',
    audio: require('@/assets/music/songs/wombat_lullaby_saxophone_v1.wav'),
    duration: 10,
  },
  wombat_burrow_saxophone_v1: {
    id: 'wombat_burrow_saxophone_v1',
    displayName: 'Wombat Burrow Song (Saxophone)',
    audio: require('@/assets/music/songs/wombat_burrow_saxophone_v1.wav'),
    duration: 14,
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
 * Get a song definition by ID.
 * Returns undefined if the song is not registered.
 */
export function getSong(songId: string): SongDefinition | undefined {
  const song = SONGS[songId];
  if (!song) {
    log.warn(`Song not found: ${songId}`);
  }
  return song;
}

/**
 * Resolve an instrument-matched song.
 *
 * Given a base song ID (e.g. "wombat_lullaby_v1") and the user's selected instrument
 * (e.g. "trumpet"), tries to find a song registered as "{base}_{instrument}" first
 * (e.g. "wombat_lullaby_trumpet_v1"). Falls back to the base song ID if no
 * instrument-specific version exists.
 *
 * This allows the success song to match the instrument the user picked in the
 * carousel (or changed via the burger menu).
 *
 * Song ID convention:
 *   base:       wombat_lullaby_v1         (flute default, or generic)
 *   matched:    wombat_lullaby_trumpet_v1 (instrument-specific version)
 *
 * The naming pattern splits the base ID at the last "_v" to insert the instrument:
 *   "wombat_lullaby_v1" → "wombat_lullaby" + "v1" → "wombat_lullaby_{instrument}_v1"
 */
export function getInstrumentSong(
  baseSongId: string,
  instrumentId: string | undefined,
): SongDefinition | undefined {
  if (!instrumentId) return getSong(baseSongId);

  // Build instrument-specific ID: split at last "_v" to insert instrument before version
  const versionSplit = baseSongId.lastIndexOf('_v');
  let instrumentSongId: string;
  if (versionSplit > 0) {
    const prefix = baseSongId.substring(0, versionSplit);
    const suffix = baseSongId.substring(versionSplit + 1); // e.g. "v1"
    instrumentSongId = `${prefix}_${instrumentId}_${suffix}`;
  } else {
    instrumentSongId = `${baseSongId}_${instrumentId}`;
  }

  // Try instrument-specific first, fall back to base
  const matched = SONGS[instrumentSongId];
  if (matched) {
    return matched;
  }
  return getSong(baseSongId);
}

/**
 * Validate that all assets referenced by a music challenge config exist locally.
 * Returns a list of missing asset IDs (empty = all valid).
 */
export function validateMusicChallengeAssets(
  instrumentId: string,
  requiredSequence: string[],
  successSongId: string
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

  if (!SONGS[successSongId]) {
    missing.push(`song:${successSongId}`);
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
 * Get all registered song IDs.
 */
export function getAvailableSongIds(): string[] {
  return Object.keys(SONGS);
}

/**
 * Register a new instrument at runtime (for testing or dynamic loading).
 */
export function registerInstrument(instrument: InstrumentDefinition): void {
  INSTRUMENTS[instrument.id] = instrument;
  log.debug(`Registered instrument: ${instrument.id}`);
}

/**
 * Register a new song at runtime (for testing or dynamic loading).
 */
export function registerSong(song: SongDefinition): void {
  SONGS[song.id] = song;
  log.debug(`Registered song: ${song.id}`);
}
