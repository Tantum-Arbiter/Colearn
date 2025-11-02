import ScreenTimeService, { SCREEN_TIME_LIMITS } from '../../services/screen-time-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('ScreenTimeService', () => {
  let screenTimeService: ScreenTimeService;

  beforeEach(() => {
    screenTimeService = ScreenTimeService.getInstance();
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('getDailyLimit', () => {
    it('should return 15 minutes for children 18-24 months', () => {
      expect(screenTimeService.getDailyLimit(18)).toBe(SCREEN_TIME_LIMITS.MONTHS_18_24);
      expect(screenTimeService.getDailyLimit(23)).toBe(SCREEN_TIME_LIMITS.MONTHS_18_24);
    });

    it('should return 60 minutes for children 2-6 years', () => {
      expect(screenTimeService.getDailyLimit(24)).toBe(SCREEN_TIME_LIMITS.YEARS_2_6);
      expect(screenTimeService.getDailyLimit(36)).toBe(SCREEN_TIME_LIMITS.YEARS_2_6);
      expect(screenTimeService.getDailyLimit(71)).toBe(SCREEN_TIME_LIMITS.YEARS_2_6);
    });

    it('should return 120 minutes for children 6+ years', () => {
      expect(screenTimeService.getDailyLimit(72)).toBe(SCREEN_TIME_LIMITS.YEARS_6_PLUS);
      expect(screenTimeService.getDailyLimit(84)).toBe(SCREEN_TIME_LIMITS.YEARS_6_PLUS);
    });
  });

  describe('session management', () => {
    it('should start a session successfully', async () => {
      await screenTimeService.startSession('story');
      
      const duration = screenTimeService.getCurrentSessionDuration();
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should end a session and save it', async () => {
      await screenTimeService.startSession('story');
      
      // Wait a bit to ensure some duration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await screenTimeService.endSession();
      
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(screenTimeService.getCurrentSessionDuration()).toBe(0);
    });

    it('should handle multiple sessions correctly', async () => {
      // Start first session
      await screenTimeService.startSession('story');
      await new Promise(resolve => setTimeout(resolve, 50));
      await screenTimeService.endSession();

      // Start second session
      await screenTimeService.startSession('emotions');
      await new Promise(resolve => setTimeout(resolve, 50));
      await screenTimeService.endSession();

      // Should have called setItem twice (once for each session)
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('warning system', () => {
    it('should warn when approaching limit for 18-24 months', async () => {
      // Mock existing usage close to limit (10 minutes used, 5 minutes remaining for 15 min limit)
      const mockSessions = [
        {
          id: 'test-1',
          startTime: Date.now() - 600000, // 10 minutes ago
          endTime: Date.now() - 300000, // 5 minutes ago
          duration: 600, // 10 minutes in seconds (close to 15 min limit)
          activity: 'story' as const,
          date: new Date().toISOString().split('T')[0],
        }
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSessions));

      // Reset warning date to allow warning to be shown
      screenTimeService.resetWarningDate();

      const warning = await screenTimeService.checkForWarnings(20); // 18-24 months, 15 min limit

      expect(warning).toBeTruthy();
      expect(warning?.type).toBe('approaching_limit');
    });



    it('should warn when limit is reached', async () => {
      // Mock existing usage at limit
      const mockSessions = [
        {
          id: 'test-1',
          startTime: Date.now() - 900000, // 15 minutes ago
          endTime: Date.now(),
          duration: 900, // 15 minutes in seconds
          activity: 'story' as const,
          date: new Date().toISOString().split('T')[0],
        }
      ];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSessions));

      // Reset warning date to allow warning to be shown
      screenTimeService.resetWarningDate();

      const warning = await screenTimeService.checkForWarnings(20); // 18-24 months, 15 min limit
      
      expect(warning).toBeTruthy();
      expect(warning?.type).toBe('limit_reached');
    });
  });

  describe('statistics', () => {
    it('should calculate today usage correctly', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockSessions = [
        {
          id: 'test-1',
          startTime: Date.now() - 600000,
          endTime: Date.now() - 300000,
          duration: 300, // 5 minutes
          activity: 'story' as const,
          date: today,
        },
        {
          id: 'test-2',
          startTime: Date.now() - 300000,
          endTime: Date.now(),
          duration: 300, // 5 minutes
          activity: 'emotions' as const,
          date: today,
        }
      ];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSessions));
      
      const usage = await screenTimeService.getTodayUsage();
      expect(usage).toBe(600); // 10 minutes total
    });

    it('should generate screen time stats', async () => {
      const mockSessions = [
        {
          id: 'test-1',
          startTime: Date.now() - 86400000, // Yesterday
          endTime: Date.now() - 86400000 + 300000,
          duration: 300,
          activity: 'story' as const,
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        }
      ];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSessions));
      
      const stats = await screenTimeService.getScreenTimeStats();
      
      expect(stats).toHaveProperty('todayUsage');
      expect(stats).toHaveProperty('weeklyUsage');
      expect(stats).toHaveProperty('dailyAverages');
      expect(stats).toHaveProperty('recommendedSchedule');
      expect(Array.isArray(stats.weeklyUsage)).toBe(true);
      expect(Array.isArray(stats.recommendedSchedule)).toBe(true);
    });
  });
});
