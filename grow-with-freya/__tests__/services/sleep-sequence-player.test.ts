import { SleepSequencePlayer } from '@/services/sleep-sequence-player';
import { MusicTrack } from '@/types/music';

// Mock the music player service
jest.mock('@/services/music-player', () => ({
  MusicPlayerService: {
    getInstance: jest.fn(() => ({
      loadTrack: jest.fn().mockResolvedValue(undefined),
      play: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      clearTrack: jest.fn().mockResolvedValue(undefined),
      getState: jest.fn(() => ({
        currentTime: 0,
        duration: 900,
        playbackState: 'playing',
      })),
    })),
  },
}));

describe('SleepSequencePlayer', () => {
  let sleepPlayer: SleepSequencePlayer;
  
  const mockTracks: MusicTrack[] = [
    {
      id: 'alpha-phase',
      title: 'Alpha Phase',
      category: 'binaural-beats',
      duration: 900, // 15 minutes
      audioSource: null,
      isAvailable: true,
      subcategory: 'sleep',
      sequenceOrder: 1,
    },
    {
      id: 'beta-phase',
      title: 'Beta Phase',
      category: 'binaural-beats',
      duration: 1200, // 20 minutes
      audioSource: null,
      isAvailable: true,
      subcategory: 'sleep',
      sequenceOrder: 2,
    },
    {
      id: 'theta-phase',
      title: 'Theta Phase',
      category: 'binaural-beats',
      duration: 2700, // 45 minutes
      audioSource: null,
      isAvailable: true,
      subcategory: 'sleep',
      sequenceOrder: 3,
    },
  ];

  beforeEach(() => {
    sleepPlayer = SleepSequencePlayer.getInstance();
    jest.clearAllMocks();
    // Clear any existing timers
    jest.clearAllTimers();
    // Use fake timers only in local development
    if (process.env.CI !== 'true') {
      jest.useFakeTimers();
    }
  });

  afterEach(() => {
    sleepPlayer.cleanup();
    if (process.env.CI !== 'true') {
      jest.useRealTimers();
    }
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SleepSequencePlayer.getInstance();
      const instance2 = SleepSequencePlayer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Sleep Sequence Management', () => {
    it('should start a sleep sequence', async () => {
      const onPhaseChange = jest.fn();
      const onSequenceComplete = jest.fn();

      await sleepPlayer.startSleepSequence(mockTracks, onPhaseChange, onSequenceComplete);

      const status = sleepPlayer.getSequenceStatus();
      expect(status.isActive).toBe(true);
      expect(status.currentPhase).toBe(1);
      expect(status.totalPhases).toBe(3);
      expect(status.currentTrack?.id).toBe('alpha-phase');
    });

    it('should call phase change callback on start', async () => {
      const onPhaseChange = jest.fn();
      const onSequenceComplete = jest.fn();

      await sleepPlayer.startSleepSequence(mockTracks, onPhaseChange, onSequenceComplete);

      // Should have been called once for the initial phase
      expect(onPhaseChange).toHaveBeenCalledTimes(1);
      expect(onPhaseChange).toHaveBeenCalledWith(mockTracks[0], 1);
    });

    it('should track sequence progress', async () => {
      await sleepPlayer.startSleepSequence(mockTracks);

      const status = sleepPlayer.getSequenceStatus();
      expect(status.isActive).toBe(true);
      expect(status.currentPhase).toBe(1);
      expect(status.totalPhases).toBe(3);
      expect(status.currentTrack).toEqual(mockTracks[0]);
    });

    it('should stop sequence manually', async () => {
      await sleepPlayer.startSleepSequence(mockTracks);
      
      let status = sleepPlayer.getSequenceStatus();
      expect(status.isActive).toBe(true);

      await sleepPlayer.stopSequence();
      
      status = sleepPlayer.getSequenceStatus();
      expect(status.isActive).toBe(false);
    });

    it('should pause and resume sequence', async () => {
      await sleepPlayer.startSleepSequence(mockTracks);
      
      await sleepPlayer.pauseSequence();
      await sleepPlayer.resumeSequence();
      
      const status = sleepPlayer.getSequenceStatus();
      expect(status.isActive).toBe(true);
    });

    it('should skip to next phase', async () => {
      await sleepPlayer.startSleepSequence(mockTracks);
      
      let status = sleepPlayer.getSequenceStatus();
      expect(status.currentPhase).toBe(1);

      await sleepPlayer.skipToNextPhase();
      
      status = sleepPlayer.getSequenceStatus();
      expect(status.currentPhase).toBe(2);
    });

    it('should skip to previous phase', async () => {
      await sleepPlayer.startSleepSequence(mockTracks);
      
      // Move to second phase first
      await sleepPlayer.skipToNextPhase();
      
      let status = sleepPlayer.getSequenceStatus();
      expect(status.currentPhase).toBe(2);

      await sleepPlayer.skipToPreviousPhase();
      
      status = sleepPlayer.getSequenceStatus();
      expect(status.currentPhase).toBe(1);
    });
  });

  describe('Status Tracking', () => {
    it('should provide accurate sequence status', async () => {
      await sleepPlayer.startSleepSequence(mockTracks);

      const status = sleepPlayer.getSequenceStatus();

      expect(status).toEqual({
        isActive: true,
        currentPhase: 1,
        totalPhases: 3,
        currentTrack: mockTracks[0],
        remainingTimeInPhase: expect.any(Number),
        remainingTimeTotal: expect.any(Number),
        timeUntilThetaPhase: expect.any(Number),
        isInThetaPhase: false,
      });
    });

    it('should return inactive status when no sequence', () => {
      const status = sleepPlayer.getSequenceStatus();

      expect(status.isActive).toBe(false);
      expect(status.currentPhase).toBe(0);
      expect(status.totalPhases).toBe(0);
      expect(status.currentTrack).toBeNull();
      expect(status.remainingTimeInPhase).toBe(0);
      expect(status.remainingTimeTotal).toBe(0);
      expect(status.timeUntilThetaPhase).toBe(0);
      expect(status.isInThetaPhase).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty sequence gracefully', async () => {
      await expect(sleepPlayer.startSleepSequence([])).resolves.not.toThrow();
      
      const status = sleepPlayer.getSequenceStatus();
      expect(status.isActive).toBe(false);
    });

    it('should cleanup properly', () => {
      sleepPlayer.cleanup();
      
      const status = sleepPlayer.getSequenceStatus();
      expect(status.isActive).toBe(false);
      expect(status.totalPhases).toBe(0);
    });
  });
});
