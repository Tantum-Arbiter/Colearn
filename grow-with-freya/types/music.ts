import { ImageSourcePropType } from 'react-native';

/**
 * Music category types for organizing tracks
 */
export type MusicCategory = 'tantrum-calming' | 'bedtime' | 'background' | 'binaural-beats';

/**
 * Playback state for music player
 */
export type PlaybackState = 'playing' | 'paused' | 'stopped' | 'loading' | 'error';

/**
 * Repeat mode for music player
 */
export type RepeatMode = 'none' | 'one' | 'all';

/**
 * Individual music track interface
 */
export interface MusicTrack {
  id: string;
  title: string;
  titleKey?: string; // i18n translation key for title (e.g., 'music.tracks.tantrumAlpha.title')
  artist?: string;
  artistKey?: string; // i18n translation key for artist (e.g., 'music.tracks.tantrumAlpha.artist')
  category: MusicCategory;
  duration: number; // in seconds
  audioSource: any; // require() path or URI
  coverImage?: ImageSourcePropType;
  description?: string;
  descriptionKey?: string; // i18n translation key for description
  isAvailable: boolean;
  tags?: string[]; // Additional tags for filtering
  ageRange?: string;
  volume?: number; // Default volume (0-1)
  subcategory?: string; // For organizing within categories (e.g., 'tantrum', 'sleep')
  sequenceOrder?: number; // Order in a sequence (1, 2, 3...)
  nextTrackId?: string | null; // ID of next track in sequence
  isSequence?: boolean; // True if this is a virtual sequence track
  sequenceTracks?: string[]; // Array of track IDs for sequence tracks
}

/**
 * Music playlist interface
 */
export interface MusicPlaylist {
  id: string;
  title: string;
  description?: string;
  category: MusicCategory;
  tracks: MusicTrack[];
  coverImage?: ImageSourcePropType;
  isAvailable: boolean;
}

/**
 * Music player state interface
 */
export interface MusicPlayerState {
  currentTrack: MusicTrack | null;
  currentPlaylist: MusicPlaylist | null;
  playbackState: PlaybackState;
  currentTime: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0-1
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  currentTrackIndex: number;
  isLoading: boolean;
  error: string | null;
  repeatCount: number; // Track how many times current track has played
}

/**
 * Music player controls interface
 */
export interface MusicPlayerControls {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleMute: () => Promise<void>;
  setRepeatMode: (mode: RepeatMode) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  loadTrack: (track: MusicTrack) => Promise<void>;
  loadPlaylist: (playlist: MusicPlaylist, startIndex?: number) => Promise<void>;
}

/**
 * Music service interface
 */
export interface MusicService {
  // State
  getState: () => MusicPlayerState;
  
  // Playback controls
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  
  // Volume controls
  setVolume: (volume: number) => Promise<void>;
  toggleMute: () => Promise<void>;
  
  // Playlist controls
  setRepeatMode: (mode: RepeatMode) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  
  // Track/playlist loading
  loadTrack: (track: MusicTrack) => Promise<void>;
  loadPlaylist: (playlist: MusicPlaylist, startIndex?: number) => Promise<void>;
  
  // Lifecycle
  initialize: () => Promise<void>;
  cleanup: () => Promise<void>;
  
  // Event listeners
  onStateChange: (callback: (state: MusicPlayerState) => void) => void;
  removeStateChangeListener: (callback: (state: MusicPlayerState) => void) => void;
}

/**
 * Music category display information
 */
export interface MusicCategoryInfo {
  id: MusicCategory;
  title: string;
  description: string;
  emoji: string;
  color: string;
  gradient: string[];
}
