import { existsSync } from 'fs';
import { join } from 'path';
import { BINAURAL_BEATS_TRACKS, ALL_MUSIC_TRACKS } from '../../data/music';

describe('Audio Files Existence', () => {
  const audioBasePath = join(__dirname, '../../assets/audio/music');

  describe('Binaural Beats Files', () => {
    it('should have tantrum alpha waves file', () => {
      const filePath = join(audioBasePath, 'binaural-beats/tantrums/alpha-waves-10hz.mp3');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have sleep theta phase file', () => {
      const filePath = join(audioBasePath, 'binaural-beats/sleep/transcendent/theta-phase.mp3');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should verify tantrum track configuration', () => {
      const tantrumTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'tantrum-alpha-10hz');
      expect(tantrumTrack).toBeDefined();
      expect(tantrumTrack?.isAvailable).toBe(true);
      expect(tantrumTrack?.subcategory).toBe('tantrum');
      expect(tantrumTrack?.audioSource).toBeDefined();
    });

    it('should verify sleep theta track configuration', () => {
      const thetaTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'sleep-theta-phase');
      expect(thetaTrack).toBeDefined();
      expect(thetaTrack?.isAvailable).toBe(true);
      expect(thetaTrack?.subcategory).toBe('sleep');
      expect(thetaTrack?.sequenceOrder).toBe(2);
      expect(thetaTrack?.audioSource).toBeDefined();
    });

    it('should mark alpha phase as available now', () => {
      const alphaTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'sleep-alpha-phase');

      expect(alphaTrack?.isAvailable).toBe(true);
      expect(alphaTrack?.sequenceOrder).toBe(1);
      expect(alphaTrack?.nextTrackId).toBe('sleep-theta-phase');
    });

    it('should have transcendent sleep sequence configured correctly', () => {
      const sequenceTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'sleep-full-sequence');
      expect(sequenceTrack).toBeDefined();
      expect(sequenceTrack?.isSequence).toBe(true);
      expect(sequenceTrack?.sequenceTracks).toEqual(['sleep-alpha-phase', 'sleep-theta-phase']); // Full two-phase sequence
      expect(sequenceTrack?.isAvailable).toBe(true);
      expect(sequenceTrack?.duration).toBe(96); // ~1:36 (first track length)
    });
  });

  describe('File Structure Validation', () => {
    it('should have binaural-beats directory structure', () => {
      const binauralBeatsPath = join(audioBasePath, 'binaural-beats');
      const tantrumsPath = join(binauralBeatsPath, 'tantrums');
      const sleepPath = join(binauralBeatsPath, 'sleep');
      const transcendentPath = join(sleepPath, 'transcendent');

      expect(existsSync(binauralBeatsPath)).toBe(true);
      expect(existsSync(tantrumsPath)).toBe(true);
      expect(existsSync(sleepPath)).toBe(true);
      expect(existsSync(transcendentPath)).toBe(true);
    });

    it('should validate all available tracks have existing files', () => {
      // Since we now use require() statements, we just need to verify the files exist
      // The require() statements in the music data will fail at build time if files are missing
      const availableTracks = ALL_MUSIC_TRACKS.filter(track =>
        track.isAvailable &&
        track.audioSource &&
        track.category === 'binaural-beats'
      );

      // Verify we have the expected number of available tracks
      expect(availableTracks.length).toBe(3); // tantrum + alpha + theta

      // Verify each track has a non-null audioSource (from require() statements)
      availableTracks.forEach(track => {
        expect(track.audioSource).toBeTruthy();
        expect(track.audioSource).not.toBeNull();
      });
    });
  });

  describe('Future File Placeholders', () => {
    it('should have alpha phase file (now available)', () => {
      const filePath = join(audioBasePath, 'binaural-beats/sleep/transcendent/alpha-phase.mp3');
      expect(existsSync(filePath)).toBe(true);
    });

    it('should not have beta phase file (not part of two-phase design)', () => {
      const filePath = join(audioBasePath, 'binaural-beats/sleep/transcendent/beta-phase.mp3');
      expect(existsSync(filePath)).toBe(false);

      // Verify beta track is not in the configuration
      const betaTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'sleep-beta-phase');
      expect(betaTrack).toBeUndefined();
    });

    it('should have complete two-phase sequence now that alpha is available', () => {
      // Alpha file is now available, so sequence should be complete
      const sequenceTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'sleep-full-sequence');

      // Current state: full two-phase sequence
      expect(sequenceTrack?.sequenceTracks).toEqual(['sleep-alpha-phase', 'sleep-theta-phase']);

      // Verify both phases are available
      const alphaTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'sleep-alpha-phase');
      const thetaTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'sleep-theta-phase');
      expect(alphaTrack?.isAvailable).toBe(true);
      expect(thetaTrack?.isAvailable).toBe(true);
    });
  });

  describe('Track Metadata Validation', () => {
    it('should have correct audio sources from require() statements', () => {
      const tantrumTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'tantrum-alpha-10hz');
      const alphaTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'sleep-alpha-phase');
      const thetaTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'sleep-theta-phase');

      // Verify tracks have audioSource from require() statements (not null)
      expect(tantrumTrack?.audioSource).toBeTruthy();
      expect(alphaTrack?.audioSource).toBeTruthy();
      expect(thetaTrack?.audioSource).toBeTruthy();

      // In test environment, require() may still return objects with uri property
      // The important thing is that they're not null and will work in the actual app
      expect(tantrumTrack?.audioSource).not.toBeNull();
      expect(alphaTrack?.audioSource).not.toBeNull();
      expect(thetaTrack?.audioSource).not.toBeNull();
    });

    it('should have appropriate durations for binaural beats', () => {
      const tantrumTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'tantrum-alpha-10hz');
      const thetaTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'sleep-theta-phase');

      // Tantrum track actual duration (~1:45)
      expect(tantrumTrack?.duration).toBe(105);

      // Theta track actual duration (2:00)
      expect(thetaTrack?.duration).toBe(120);

      // Sleep full sequence duration (~1:36 - first track length, loops until next phase)
      const sequenceTrack = BINAURAL_BEATS_TRACKS.find(track => track.id === 'sleep-full-sequence');
      expect(sequenceTrack?.duration).toBe(96);
    });

    it('should have sleep tracks with appropriate metadata', () => {
      const sleepTracks = BINAURAL_BEATS_TRACKS.filter(track => track.subcategory === 'sleep');

      expect(sleepTracks.length).toBeGreaterThan(0);
      sleepTracks.forEach(track => {
        expect(track.category).toBe('binaural-beats');
        expect(track.subcategory).toBe('sleep');
        expect(track.isAvailable).toBe(true);
      });
    });
  });
});
