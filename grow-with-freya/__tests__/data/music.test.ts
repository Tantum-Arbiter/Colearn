import {
  ALL_MUSIC_TRACKS,
  TANTRUM_CALMING_TRACKS,
  BEDTIME_TRACKS,
  BINAURAL_BEATS_TRACKS,
  ALL_PLAYLISTS,
  TANTRUM_CALMING_PLAYLIST,
  BEDTIME_PLAYLIST,
  BINAURAL_BEATS_PLAYLIST,
  MUSIC_CATEGORIES,
  getTracksByCategory,
  getPlaylistByCategory,
  getTrackById,
  getPlaylistById,
  formatDuration,
  getCategoryInfo,
} from '@/data/music';
import { MusicCategory } from '@/types/music';

describe('Music Data', () => {
  describe('Track Collections', () => {
    it('should have tantrum calming tracks (currently empty - using binaural beats)', () => {
      expect(TANTRUM_CALMING_TRACKS).toBeDefined();
      expect(TANTRUM_CALMING_TRACKS.length).toBe(0); // Currently empty - using binaural beats for tantrum calming
    });

    it('should have bedtime tracks (currently empty - using binaural beats)', () => {
      expect(BEDTIME_TRACKS).toBeDefined();
      expect(BEDTIME_TRACKS.length).toBe(0); // Currently empty - using binaural beats for sleep
    });

    it('should have binaural beats tracks', () => {
      expect(BINAURAL_BEATS_TRACKS).toBeDefined();
      expect(BINAURAL_BEATS_TRACKS.length).toBeGreaterThan(0);

      BINAURAL_BEATS_TRACKS.forEach(track => {
        expect(track.category).toBe('binaural-beats');
        expect(track.id).toBeDefined();
        expect(track.title).toBeDefined();
        // Duration can be 0 for tracks where duration is determined at runtime
        expect(track.duration).toBeGreaterThanOrEqual(0);
        expect(track.ageRange).toBeDefined();

        // Check subcategory exists
        expect(track.subcategory).toBeDefined();
        expect(['tantrum', 'sleep']).toContain(track.subcategory);

        // If it's a sequence track, check sequence properties
        if (track.isSequence) {
          expect(track.sequenceTracks).toBeDefined();
          expect(Array.isArray(track.sequenceTracks)).toBe(true);
        }
      });
    });

    it('should combine all tracks correctly', () => {
      expect(ALL_MUSIC_TRACKS).toBeDefined();
      // ALL_MUSIC_TRACKS combines BINAURAL_BEATS_TRACKS and MOCK_TRACKS
      expect(ALL_MUSIC_TRACKS.length).toBeGreaterThan(0);
    });

    it('should have unique track IDs', () => {
      const ids = ALL_MUSIC_TRACKS.map(track => track.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Playlists', () => {
    it('should have tantrum calming playlist', () => {
      expect(TANTRUM_CALMING_PLAYLIST).toBeDefined();
      expect(TANTRUM_CALMING_PLAYLIST.category).toBe('tantrum-calming');
      expect(TANTRUM_CALMING_PLAYLIST.tracks).toEqual(TANTRUM_CALMING_TRACKS);
    });

    it('should have bedtime playlist', () => {
      expect(BEDTIME_PLAYLIST).toBeDefined();
      expect(BEDTIME_PLAYLIST.category).toBe('bedtime');
      expect(BEDTIME_PLAYLIST.tracks).toEqual(BEDTIME_TRACKS);
    });

    it('should have binaural beats playlist', () => {
      expect(BINAURAL_BEATS_PLAYLIST).toBeDefined();
      expect(BINAURAL_BEATS_PLAYLIST.category).toBe('binaural-beats');
      expect(BINAURAL_BEATS_PLAYLIST.tracks).toEqual(BINAURAL_BEATS_TRACKS);
    });

    it('should have all playlists', () => {
      expect(ALL_PLAYLISTS).toBeDefined();
      expect(ALL_PLAYLISTS.length).toBe(3);
      expect(ALL_PLAYLISTS).toContain(TANTRUM_CALMING_PLAYLIST);
      expect(ALL_PLAYLISTS).toContain(BEDTIME_PLAYLIST);
      expect(ALL_PLAYLISTS).toContain(BINAURAL_BEATS_PLAYLIST);
    });
  });

  describe('Music Categories', () => {
    it('should have category information', () => {
      expect(MUSIC_CATEGORIES).toBeDefined();
      expect(MUSIC_CATEGORIES.length).toBe(3);

      const categories = MUSIC_CATEGORIES.map(cat => cat.id);
      expect(categories).toContain('tantrum-calming');
      expect(categories).toContain('bedtime');
      expect(categories).toContain('binaural-beats');
    });

    it('should have complete category info', () => {
      MUSIC_CATEGORIES.forEach(category => {
        expect(category.id).toBeDefined();
        expect(category.title).toBeDefined();
        expect(category.description).toBeDefined();
        expect(category.emoji).toBeDefined();
        expect(category.color).toBeDefined();
        expect(category.gradient).toBeDefined();
        expect(Array.isArray(category.gradient)).toBe(true);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('getTracksByCategory', () => {
      it('should return tantrum calming tracks', () => {
        const tracks = getTracksByCategory('tantrum-calming');
        expect(tracks).toEqual(TANTRUM_CALMING_TRACKS.filter(t => t.isAvailable));
      });

      it('should return bedtime tracks (including audiobooks)', () => {
        const tracks = getTracksByCategory('bedtime');
        // Bedtime category now includes audiobooks which have category: 'bedtime'
        expect(tracks.length).toBeGreaterThan(0);
        expect(tracks.every(t => t.category === 'bedtime' && t.isAvailable)).toBe(true);
      });

      it('should return empty array for invalid category', () => {
        const tracks = getTracksByCategory('invalid' as MusicCategory);
        expect(tracks).toEqual([]);
      });
    });

    describe('getPlaylistByCategory', () => {
      it('should return undefined for tantrum calming playlist (currently unavailable)', () => {
        const playlist = getPlaylistByCategory('tantrum-calming');
        expect(playlist).toBeUndefined(); // Playlist is marked as unavailable
      });

      it('should return undefined for bedtime playlist (currently unavailable)', () => {
        const playlist = getPlaylistByCategory('bedtime');
        expect(playlist).toBeUndefined(); // Playlist is marked as unavailable
      });

      it('should return undefined for invalid category', () => {
        const playlist = getPlaylistByCategory('invalid' as MusicCategory);
        expect(playlist).toBeUndefined();
      });
    });

    describe('getTrackById', () => {
      it('should return track by ID', () => {
        const firstTrack = ALL_MUSIC_TRACKS[0];
        const foundTrack = getTrackById(firstTrack.id);
        expect(foundTrack).toEqual(firstTrack);
      });

      it('should return undefined for invalid ID', () => {
        const track = getTrackById('invalid-id');
        expect(track).toBeUndefined();
      });
    });

    describe('getPlaylistById', () => {
      it('should return playlist by ID', () => {
        const playlist = getPlaylistById(TANTRUM_CALMING_PLAYLIST.id);
        expect(playlist).toEqual(TANTRUM_CALMING_PLAYLIST);
      });

      it('should return undefined for invalid ID', () => {
        const playlist = getPlaylistById('invalid-id');
        expect(playlist).toBeUndefined();
      });
    });

    describe('formatDuration', () => {
      it('should format seconds correctly', () => {
        expect(formatDuration(0)).toBe('0:00');
        expect(formatDuration(30)).toBe('0:30');
        expect(formatDuration(60)).toBe('1:00');
        expect(formatDuration(90)).toBe('1:30');
        expect(formatDuration(3661)).toBe('61:01');
      });
    });

    describe('getCategoryInfo', () => {
      it('should return category info', () => {
        const info = getCategoryInfo('tantrum-calming');
        expect(info).toBeDefined();
        expect(info?.id).toBe('tantrum-calming');
      });

      it('should return undefined for invalid category', () => {
        const info = getCategoryInfo('invalid' as MusicCategory);
        expect(info).toBeUndefined();
      });
    });
  });

  describe('Data Validation', () => {
    it('should have valid track data structure', () => {
      ALL_MUSIC_TRACKS.forEach(track => {
        expect(typeof track.id).toBe('string');
        expect(typeof track.title).toBe('string');
        expect(typeof track.category).toBe('string');
        expect(typeof track.duration).toBe('number');
        expect(typeof track.isAvailable).toBe('boolean');
        // Duration can be 0 for tracks where duration is determined at runtime
        expect(track.duration).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid playlist data structure', () => {
      ALL_PLAYLISTS.forEach(playlist => {
        expect(typeof playlist.id).toBe('string');
        expect(typeof playlist.title).toBe('string');
        expect(typeof playlist.category).toBe('string');
        expect(typeof playlist.isAvailable).toBe('boolean');
        expect(Array.isArray(playlist.tracks)).toBe(true);

        // Only check track count for available playlists
        if (playlist.isAvailable) {
          expect(playlist.tracks.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
