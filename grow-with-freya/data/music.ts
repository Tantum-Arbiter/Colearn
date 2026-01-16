import { MusicTrack, MusicPlaylist, MusicCategory, MusicCategoryInfo } from '@/types/music';

/**
 * Sample music tracks for the app
 * Note: Audio files will need to be added to assets/audio/music/ directory
 */

// Music tag types for filtering
export type MusicTag = 'calming' | 'bedtime' | 'stories';

export const MUSIC_TAG_INFO: Record<MusicTag, { labelKey: string; emoji: string; color: string }> = {
  calming: { labelKey: 'music.tags.calming', emoji: '🧘', color: '#4ECDC4' },
  bedtime: { labelKey: 'music.tags.bedtime', emoji: '🌙', color: '#96CEB4' },
  stories: { labelKey: 'music.tags.stories', emoji: '📖', color: '#FFB347' },
};

// Helper function to safely require audio files
function requireAudioFile(filename: string): any {
  try {
    // Use require() to load audio files from assets
    switch (filename) {
      // Binaural beats
      case 'binaural-beats/tantrums/alpha-waves-10hz.mp3':
        return require('../assets/audio/music/binaural-beats/tantrums/alpha-waves-10hz.mp3');
      case 'binaural-beats/sleep/transcendent/alpha-phase.mp3':
        return require('../assets/audio/music/binaural-beats/sleep/transcendent/alpha-phase.mp3');
      case 'binaural-beats/sleep/transcendent/theta-phase.mp3':
        return require('../assets/audio/music/binaural-beats/sleep/transcendent/theta-phase.mp3');
      // Audiobooks
      case 'audiobooks/bears_birthday_party-st.mp3':
        return require('../assets/audio/audiobooks/bears_birthday_party-st.mp3');
      case 'audiobooks/damsel-the-elephant.mp3':
        return require('../assets/audio/audiobooks/damsel-the-elephant.mp3');
      case 'audiobooks/jimmy-mouse-and-the-city-slickers.mp3':
        return require('../assets/audio/audiobooks/jimmy-mouse-and-the-city-slickers.mp3');
      case 'audiobooks/new-year-in-the-jungle.mp3':
        return require('../assets/audio/audiobooks/new-year-in-the-jungle.mp3');
      case 'audiobooks/snow-white-shorter.mp3':
        return require('../assets/audio/audiobooks/snow-white-shorter.mp3');
      default:
        console.warn(`Audio file not found: ${filename}`);
        return null;
    }
  } catch (error) {
    console.warn(`Audio file not found: ${filename}`, error);
    return null;
  }
}

// Mock placeholder tracks (no audio - coming soon)
// Duration set to 0 - actual duration is determined at runtime when audio loads
export const MOCK_TRACKS: MusicTrack[] = [
  {
    id: 'mock-happy-song',
    title: 'Happy Song',
    artist: 'Coming Soon',
    category: 'background',
    duration: 0,
    audioSource: null,
    description: 'An upbeat, cheerful song to brighten your day!',
    isAvailable: false,
    tags: ['calming'],
    ageRange: '2+',
    volume: 0.5,
  },
  {
    id: 'mock-exciting-sing-along',
    title: 'Exciting Sing Along',
    artist: 'Coming Soon',
    category: 'background',
    duration: 0,
    audioSource: null,
    description: 'A fun sing-along song for the whole family!',
    isAvailable: false,
    tags: ['calming'],
    ageRange: '2+',
    volume: 0.5,
  },
  {
    id: 'mock-warm-down-time',
    title: 'Warm Down Time',
    artist: 'Coming Soon',
    category: 'bedtime',
    duration: 0,
    audioSource: null,
    description: 'Gentle music to help wind down before sleep.',
    isAvailable: false,
    tags: ['bedtime', 'calming'],
    ageRange: '2+',
    volume: 0.4,
  },
  // Bedtime Stories & Lullabies
  {
    id: 'mock-sleepy-bear-adventure',
    title: 'Sleepy Bear Adventure',
    artist: 'Coming Soon',
    category: 'bedtime',
    duration: 0,
    audioSource: null,
    description: 'A gentle bedtime story about a little bear finding the perfect spot to sleep.',
    isAvailable: false,
    tags: ['stories', 'bedtime'],
    ageRange: '2+',
    volume: 0.5,
  },
  {
    id: 'mock-twinkle-star-lullaby',
    title: 'Twinkle Star Lullaby',
    artist: 'Coming Soon',
    category: 'bedtime',
    duration: 0,
    audioSource: null,
    description: 'A soothing lullaby to help little ones drift off to dreamland.',
    isAvailable: false,
    tags: ['stories', 'bedtime'],
    ageRange: '0+',
    volume: 0.4,
  },
  {
    id: 'mock-moon-goodnight',
    title: 'Goodnight Moon Story',
    artist: 'Coming Soon',
    category: 'bedtime',
    duration: 0,
    audioSource: null,
    description: 'A classic bedtime story about saying goodnight to everything around.',
    isAvailable: false,
    tags: ['stories', 'bedtime'],
    ageRange: '1+',
    volume: 0.5,
  },
  {
    id: 'mock-ocean-waves-lullaby',
    title: 'Ocean Waves Lullaby',
    artist: 'Coming Soon',
    category: 'bedtime',
    duration: 0,
    audioSource: null,
    description: 'Gentle ocean sounds mixed with a soft melody for peaceful sleep.',
    isAvailable: false,
    tags: ['stories', 'bedtime', 'calming'],
    ageRange: '0+',
    volume: 0.3,
  },
];

// Tantrum Calming Music Tracks - Currently using binaural beats for tantrum calming
export const TANTRUM_CALMING_TRACKS: MusicTrack[] = [
  // No traditional nature sounds yet - using binaural beats for tantrum calming functionality
];

// Bedtime Music Tracks - Currently using binaural beats for sleep
export const BEDTIME_TRACKS: MusicTrack[] = [
  // No traditional bedtime tracks yet - using binaural beats for sleep functionality
];

// Binaural Beats Tracks (with updated tags for filtering)
// Duration set to 0 - actual duration is determined at runtime when audio loads
export const BINAURAL_BEATS_TRACKS: MusicTrack[] = [
  // Tantrum Calming - Single 10Hz track
  {
    id: 'tantrum-alpha-10hz',
    title: 'Tantrum Calming (10Hz)',
    titleKey: 'music.tracks.tantrumAlpha.title',
    artist: 'Binaural Beats',
    artistKey: 'music.tracks.tantrumAlpha.artist',
    category: 'binaural-beats',
    duration: 0,
    audioSource: requireAudioFile('binaural-beats/tantrums/alpha-waves-10hz.mp3'),
    description: 'Alpha waves for calming during tantrums. Use with headphones for best effect.',
    descriptionKey: 'music.tracks.tantrumAlpha.description',
    isAvailable: true,
    tags: ['calming'],
    ageRange: '3+',
    volume: 0.4,
    subcategory: 'tantrum',
  },

  // Sleep Progression - Two-phase sequence: Alpha → Theta
  {
    id: 'sleep-alpha-phase',
    title: 'Getting to Sleep',
    titleKey: 'music.tracks.sleepAlpha.title',
    artist: 'Binaural Beats',
    artistKey: 'music.tracks.sleepAlpha.artist',
    category: 'binaural-beats',
    duration: 0,
    audioSource: requireAudioFile('binaural-beats/sleep/transcendent/alpha-phase.mp3'),
    description: 'Alpha waves to begin sleep relaxation. Loops until stopped.',
    descriptionKey: 'music.tracks.sleepAlpha.description',
    isAvailable: true,
    tags: ['bedtime', 'calming'],
    ageRange: '3+',
    volume: 0.4,
    subcategory: 'sleep',
    sequenceOrder: 1,
    nextTrackId: 'sleep-theta-phase',
  },
  {
    id: 'sleep-theta-phase',
    title: 'Getting into Deep Sleep',
    titleKey: 'music.tracks.sleepTheta.title',
    artist: 'Binaural Beats',
    artistKey: 'music.tracks.sleepTheta.artist',
    category: 'binaural-beats',
    duration: 0,
    audioSource: requireAudioFile('binaural-beats/sleep/transcendent/theta-phase.mp3'),
    description: 'Theta waves for deep sleep. Loops until stopped.',
    descriptionKey: 'music.tracks.sleepTheta.description',
    isAvailable: true,
    tags: ['bedtime'],
    ageRange: '3+',
    volume: 0.2,
    subcategory: 'sleep',
    sequenceOrder: 2,
    nextTrackId: null,
  },

  // Sleep Sequence - Combined playlist track
  {
    id: 'sleep-full-sequence',
    title: 'Full Sleep Sequence',
    titleKey: 'music.tracks.sleepSequence.title',
    artist: 'Binaural Beats',
    artistKey: 'music.tracks.sleepSequence.artist',
    category: 'binaural-beats',
    duration: 0,
    audioSource: null, // Virtual track that plays the sequence
    description: 'Complete sleep progression: Getting to Sleep → Getting into Deep Sleep.',
    descriptionKey: 'music.tracks.sleepSequence.description',
    isAvailable: true,
    tags: ['bedtime'],
    ageRange: '3+',
    volume: 0.3,
    subcategory: 'sleep',
    isSequence: true,
    sequenceTracks: ['sleep-alpha-phase', 'sleep-theta-phase'],
  },
];

// Audio Books - Bedtime stories narrated for listening
// Audio files located in: assets/audio/audiobooks/
// Duration set to 0 - actual duration is determined at runtime when audio loads
export const AUDIOBOOK_TRACKS: MusicTrack[] = [
  {
    id: 'audiobook-bears-birthday-party',
    title: "Bear's Birthday Party",
    titleKey: 'music.tracks.bearsBirthdayParty.title',
    artist: 'Bedtime Story',
    artistKey: 'music.tracks.bearsBirthdayParty.artist',
    category: 'bedtime',
    duration: 0, // Determined at runtime
    audioSource: requireAudioFile('audiobooks/bears_birthday_party-st.mp3'),
    description: 'A heartwarming tale about a bear celebrating a special birthday.',
    descriptionKey: 'music.tracks.bearsBirthdayParty.description',
    isAvailable: true,
    tags: ['stories', 'bedtime'],
    ageRange: '2-5',
    volume: 0.6,
    subcategory: 'audiobook',
  },
  {
    id: 'audiobook-damsel-the-elephant',
    title: 'Damsel the Elephant',
    titleKey: 'music.tracks.damselElephant.title',
    artist: 'Bedtime Story',
    artistKey: 'music.tracks.damselElephant.artist',
    category: 'bedtime',
    duration: 0, // Determined at runtime
    audioSource: requireAudioFile('audiobooks/damsel-the-elephant.mp3'),
    description: 'Join Damsel the elephant on a gentle adventure.',
    descriptionKey: 'music.tracks.damselElephant.description',
    isAvailable: true,
    tags: ['stories', 'bedtime'],
    ageRange: '2-5',
    volume: 0.6,
    subcategory: 'audiobook',
  },
  {
    id: 'audiobook-jimmy-mouse',
    title: 'Jimmy Mouse and the City Slickers',
    titleKey: 'music.tracks.jimmyMouse.title',
    artist: 'Bedtime Story',
    artistKey: 'music.tracks.jimmyMouse.artist',
    category: 'bedtime',
    duration: 0, // Determined at runtime
    audioSource: requireAudioFile('audiobooks/jimmy-mouse-and-the-city-slickers.mp3'),
    description: 'A little mouse discovers the big city.',
    descriptionKey: 'music.tracks.jimmyMouse.description',
    isAvailable: true,
    tags: ['stories', 'bedtime'],
    ageRange: '2-5',
    volume: 0.6,
    subcategory: 'audiobook',
  },
  {
    id: 'audiobook-new-year-jungle',
    title: 'New Year in the Jungle',
    titleKey: 'music.tracks.newYearJungle.title',
    artist: 'Bedtime Story',
    artistKey: 'music.tracks.newYearJungle.artist',
    category: 'bedtime',
    duration: 0, // Determined at runtime
    audioSource: requireAudioFile('audiobooks/new-year-in-the-jungle.mp3'),
    description: 'The jungle animals celebrate a new year together.',
    descriptionKey: 'music.tracks.newYearJungle.description',
    isAvailable: true,
    tags: ['stories', 'bedtime'],
    ageRange: '2-5',
    volume: 0.6,
    subcategory: 'audiobook',
  },
  {
    id: 'audiobook-snow-white',
    title: 'Snow White',
    titleKey: 'music.tracks.snowWhite.title',
    artist: 'Bedtime Story',
    artistKey: 'music.tracks.snowWhite.artist',
    category: 'bedtime',
    duration: 0, // Determined at runtime
    audioSource: requireAudioFile('audiobooks/snow-white-shorter.mp3'),
    description: 'The classic fairy tale of Snow White, perfect for bedtime.',
    descriptionKey: 'music.tracks.snowWhite.description',
    isAvailable: true,
    tags: ['stories', 'bedtime'],
    ageRange: '3-6',
    volume: 0.6,
    subcategory: 'audiobook',
  },
];

// Combine all tracks (including mock tracks for display)
export const ALL_MUSIC_TRACKS: MusicTrack[] = [
  ...BINAURAL_BEATS_TRACKS,
  ...AUDIOBOOK_TRACKS,
  ...MOCK_TRACKS,
];

// Get tracks filtered by tag
export function getTracksByTag(tag: MusicTag): MusicTrack[] {
  return ALL_MUSIC_TRACKS.filter(track => track.tags?.includes(tag));
}

// Get all available tags from tracks
export function getAllTags(): MusicTag[] {
  return ['calming', 'bedtime', 'stories'];
}

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
    emoji: '',
    color: '#4ECDC4',
    gradient: ['#4ECDC4', '#44A08D'],
  },
  {
    id: 'bedtime',
    title: 'Bedtime Music',
    description: 'Gentle melodies for peaceful sleep',
    emoji: '',
    color: '#96CEB4',
    gradient: ['#96CEB4', '#FFECD2'],
  },
  {
    id: 'binaural-beats',
    title: 'Binaural Beats',
    description: 'Brainwave entrainment for tantrums and sleep progression',
    emoji: '',
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
