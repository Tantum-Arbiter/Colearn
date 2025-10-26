import { MusicTrack, MusicPlaylist, MusicCategory, MusicCategoryInfo } from '@/types/music';

/**
 * Sample music tracks for the app
 * Note: Audio files will need to be added to assets/audio/music/ directory
 */

// Helper function to safely require audio files
function requireAudioFile(filename: string): any {
  try {
    // Use require() to load audio files from assets
    switch (filename) {
      case 'binaural-beats/tantrums/alpha-waves-10hz.mp3':
        return require('../assets/audio/music/binaural-beats/tantrums/alpha-waves-10hz.mp3');
      case 'binaural-beats/sleep/transcendent/alpha-phase.mp3':
        return require('../assets/audio/music/binaural-beats/sleep/transcendent/alpha-phase.mp3');
      case 'binaural-beats/sleep/transcendent/theta-phase.mp3':
        return require('../assets/audio/music/binaural-beats/sleep/transcendent/theta-phase.mp3');
      default:
        console.warn(`Audio file not found: ${filename}`);
        return null;
    }
  } catch (error) {
    console.warn(`Audio file not found: ${filename}`, error);
    return null;
  }
}

// Tantrum Calming Music Tracks - Currently using binaural beats for tantrum calming
export const TANTRUM_CALMING_TRACKS: MusicTrack[] = [
  // No traditional nature sounds yet - using binaural beats for tantrum calming functionality
];

// Bedtime Music Tracks - Currently using binaural beats for sleep
export const BEDTIME_TRACKS: MusicTrack[] = [
  // No traditional bedtime tracks yet - using binaural beats for sleep functionality
];

// Binaural Beats Tracks
export const BINAURAL_BEATS_TRACKS: MusicTrack[] = [
  // Tantrum Calming - Single 10Hz track
  {
    id: 'tantrum-alpha-10hz',
    title: 'Tantrum Calming (10Hz)',
    artist: 'Binaural Beats',
    category: 'binaural-beats',
    duration: 900, // 15 minutes
    audioSource: requireAudioFile('binaural-beats/tantrums/alpha-waves-10hz.mp3'),
    description: 'Alpha waves for calming during tantrums. Use with headphones for best effect.',
    isAvailable: true,
    tags: ['alpha', 'tantrum', 'calming', '10hz'],
    ageRange: '3+',
    volume: 0.4,
    subcategory: 'tantrum',
  },

  // Sleep Progression - Two-phase sequence: Alpha → Theta
  // Note: Currently only theta phase is available, alpha phase coming soon
  {
    id: 'sleep-alpha-phase',
    title: 'Transcendent Alpha Phase',
    artist: 'Binaural Beats',
    category: 'binaural-beats',
    duration: 900, // 15 minutes
    audioSource: requireAudioFile('binaural-beats/sleep/transcendent/alpha-phase.mp3'),
    description: 'Alpha waves (15 min loop) to begin sleep relaxation. Part 1 of transcendent sleep progression.',
    isAvailable: true, // Available now!
    tags: ['alpha', 'sleep', 'phase1', 'relaxation', 'transcendent'],
    ageRange: '3+',
    volume: 0.4,
    subcategory: 'sleep',
    sequenceOrder: 1,
    nextTrackId: 'sleep-theta-phase',
  },
  {
    id: 'sleep-theta-phase',
    title: 'Transcendent Theta Phase',
    artist: 'Binaural Beats',
    category: 'binaural-beats',
    duration: 2700, // 45 minutes
    audioSource: requireAudioFile('binaural-beats/sleep/transcendent/theta-phase.mp3'),
    description: 'Theta waves (45 min loop) for deep sleep. Final phase of transcendent sleep progression.',
    isAvailable: true, // Available now
    tags: ['theta', 'sleep', 'phase2', 'deep-sleep', 'transcendent'],
    ageRange: '3+',
    volume: 0.2,
    subcategory: 'sleep',
    sequenceOrder: 2,
    nextTrackId: null, // End of sequence
  },

  // Sleep Sequence - Combined playlist track (currently only theta available)
  {
    id: 'sleep-full-sequence',
    title: 'Transcendent Sleep Sequence',
    artist: 'Binaural Beats',
    category: 'binaural-beats',
    duration: 3600, // Will be 60 minutes total when complete (15min alpha + 45min theta)
    audioSource: null, // This is a virtual track that plays the sequence
    description: 'Complete 60-minute sleep progression: Alpha waves (15min) → Theta waves (45min). Helps transition from relaxation to deep sleep.',
    isAvailable: true, // Full sequence now available
    tags: ['sleep', 'sequence', 'progression', 'transcendent', 'two-phase'],
    ageRange: '3+',
    volume: 0.3,
    subcategory: 'sleep',
    isSequence: true,
    sequenceTracks: ['sleep-alpha-phase', 'sleep-theta-phase'], // Full two-phase sequence: Alpha → Theta
  },
];

// Combine all tracks
export const ALL_MUSIC_TRACKS: MusicTrack[] = [
  ...TANTRUM_CALMING_TRACKS,
  ...BEDTIME_TRACKS,
  ...BINAURAL_BEATS_TRACKS,
];

// Create playlists
export const TANTRUM_CALMING_PLAYLIST: MusicPlaylist = {
  id: 'tantrum-calming-playlist',
  title: 'Tantrum Calming',
  description: 'Soothing sounds to help calm during difficult moments',
  category: 'tantrum-calming',
  tracks: TANTRUM_CALMING_TRACKS,
  isAvailable: false, // No traditional tracks yet - using binaural beats
};

export const BEDTIME_PLAYLIST: MusicPlaylist = {
  id: 'bedtime-playlist',
  title: 'Bedtime Music',
  description: 'Gentle melodies for peaceful sleep',
  category: 'bedtime',
  tracks: BEDTIME_TRACKS,
  isAvailable: false, // No traditional tracks yet - using binaural beats
};

export const BINAURAL_BEATS_PLAYLIST: MusicPlaylist = {
  id: 'binaural-beats-playlist',
  title: 'Binaural Beats',
  description: 'Brainwave entrainment for focus, relaxation, and sleep',
  category: 'binaural-beats',
  tracks: BINAURAL_BEATS_TRACKS,
  isAvailable: true,
};

export const ALL_PLAYLISTS: MusicPlaylist[] = [
  TANTRUM_CALMING_PLAYLIST,
  BEDTIME_PLAYLIST,
  BINAURAL_BEATS_PLAYLIST,
];

// Category information for UI display
export const MUSIC_CATEGORIES: MusicCategoryInfo[] = [
  {
    id: 'tantrum-calming',
    title: 'Tantrum Calming',
    description: 'Soothing sounds to help calm during difficult moments',
    emoji: '🌊',
    color: '#4ECDC4',
    gradient: ['#4ECDC4', '#44A08D'],
  },
  {
    id: 'bedtime',
    title: 'Bedtime Music',
    description: 'Gentle melodies for peaceful sleep',
    emoji: '🌙',
    color: '#96CEB4',
    gradient: ['#96CEB4', '#FFECD2'],
  },
  {
    id: 'binaural-beats',
    title: 'Binaural Beats',
    description: 'Brainwave entrainment for tantrums and sleep progression',
    emoji: '🧠',
    color: '#A8E6CF',
    gradient: ['#A8E6CF', '#88D8C0'],
  },
];

// Helper functions
export function getTracksByCategory(category: MusicCategory): MusicTrack[] {
  return ALL_MUSIC_TRACKS.filter(track => track.category === category && track.isAvailable);
}

export function getPlaylistByCategory(category: MusicCategory): MusicPlaylist | undefined {
  return ALL_PLAYLISTS.find(playlist => playlist.category === category && playlist.isAvailable);
}

export function getTrackById(id: string): MusicTrack | undefined {
  return ALL_MUSIC_TRACKS.find(track => track.id === id);
}

export function getPlaylistById(id: string): MusicPlaylist | undefined {
  return ALL_PLAYLISTS.find(playlist => playlist.id === id);
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function getCategoryInfo(category: MusicCategory): MusicCategoryInfo | undefined {
  return MUSIC_CATEGORIES.find(cat => cat.id === category);
}
