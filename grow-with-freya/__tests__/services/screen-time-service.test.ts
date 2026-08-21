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

  beforeEach(async () => {
    // ScreenTimeService is a singleton, so an open session or a fake clock
    // left behind by one test would otherwise bleed into the next.
    jest.useRealTimers();
    screenTimeService = ScreenTimeService.getInstance();

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    await screenTimeService.endSession();
    screenTimeService.resetWarningDate();

    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
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

  describe('long-running session checkpointing', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('splits an open session across a day boundary instead of dumping it all on the start day', async () => {
      const underTest = screenTimeService;
      let store: string | null = null;
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async () => store);
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (_key: string, value: string) => {
        store = value;
      });

      jest.useFakeTimers({ now: new Date('2026-08-01T23:50:00.000Z') });

      await underTest.startSession('story');
      // 30 minutes foreground, crossing midnight, with no background/foreground
      // transition in between -the scenario that used to attribute the whole
      // span to a single calendar day.
      await jest.advanceTimersByTimeAsync(30 * 60 * 1000);
      await underTest.endSession();

      const totals = await underTest.getDailyTotals(3);
      const byDate = Object.fromEntries(totals.map(t => [t.date, t.seconds]));

      expect(byDate['2026-08-01']).toBe(10 * 60);
      expect(byDate['2026-08-02']).toBe(20 * 60);
    });

    it('re-derives day totals from startTime/endTime for a legacy record saved before checkpointing existed', async () => {
      const underTest = screenTimeService;

      // Shape of a pre-fix record: real startTime/endTime spanning several
      // days, but duration and date both pinned to the day it started -the
      // exact corruption a long-open session used to write to storage.
      const legacySession = {
        id: 'legacy-1',
        startTime: new Date('2026-08-01T22:00:00.000Z').getTime(),
        endTime: new Date('2026-08-03T02:00:00.000Z').getTime(),
        duration: 28 * 60 * 60,
        activity: 'story' as const,
        date: '2026-08-01',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([legacySession]));

      jest.useFakeTimers({ now: new Date('2026-08-11T12:00:00.000Z') });

      const totals = await underTest.getDailyTotals(30);
      const byDate = Object.fromEntries(totals.map(t => [t.date, t.seconds]));

      expect(byDate['2026-08-01']).toBe(2 * 60 * 60);
      expect(byDate['2026-08-02']).toBe(24 * 60 * 60);
      expect(byDate['2026-08-03']).toBe(2 * 60 * 60);
    });
  });

  describe('today usage ceiling', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('caps today\'s usage at the time actually elapsed since midnight, even if the open session never got checkpointed', async () => {
      const underTest = screenTimeService;
      jest.useFakeTimers({ now: new Date('2026-08-11T08:00:00.000Z') });

      await underTest.startSession('story');

      // Jump the clock forward 51 hours WITHOUT advancing timers, so no
      // checkpoint tick ever fires -the scenario a long-lived dev/foreground
      // session can hit despite the 30s checkpoint interval.
      jest.setSystemTime(new Date('2026-08-13T11:00:00.000Z'));

      const usage = await underTest.getTodayUsage();

      // "today" is 2026-08-13; only 11 hours of it have actually elapsed.
      expect(usage).toBe(11 * 60 * 60);
    });

    it('caps today\'s usage when the inflation comes from persisted records rather than the live session', async () => {
      const underTest = screenTimeService;
      jest.useFakeTimers({ now: new Date('2026-08-13T11:00:00.000Z') });

      // A legacy record whose stored date says today and whose duration is a
      // physically impossible 51h -the shape behind the 51h35m ring. No live
      // session is open, so capping only the live portion cannot help here.
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([
          {
            id: 'legacy-today',
            startTime: new Date('2026-08-11T08:00:00.000Z').getTime(),
            endTime: new Date('2026-08-13T11:00:00.000Z').getTime(),
            duration: 51 * 60 * 60,
            activity: 'story' as const,
            date: '2026-08-13',
          },
        ])
      );

      const usage = await underTest.getTodayUsage();

      expect(usage).toBeLessThanOrEqual(11 * 60 * 60);
    });
  });

  describe('behaviour across sessions', () => {
    let store: string | null;

    beforeEach(() => {
      store = null;
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async () => store);
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (_k: string, v: string) => {
        store = v;
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('accumulates repeated start/stop cycles into one day total', async () => {
      const underTest = screenTimeService;
      jest.useFakeTimers({ now: new Date('2026-08-13T09:00:00.000Z') });

      for (let i = 0; i < 3; i++) {
        await underTest.startSession('story');
        await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
        await underTest.endSession();
        await jest.advanceTimersByTimeAsync(60 * 1000);
      }

      const totals = await underTest.getDailyTotals(1);

      expect(totals[0].date).toBe('2026-08-13');
      expect(totals[0].seconds).toBe(15 * 60);
    });

    // getDailyTotals reads persisted sessions only -never the in-memory
    // session -so it is exactly the view that survives an app restart.
    it('keeps checkpointed time when the app dies mid-session, losing at most one checkpoint interval', async () => {
      const underTest = screenTimeService;
      jest.useFakeTimers({ now: new Date('2026-08-13T09:00:00.000Z') });

      await underTest.startSession('story');
      // 10 minutes of use, checkpointed every 30s along the way, with no
      // endSession() -the app is killed outright.
      await jest.advanceTimersByTimeAsync(10 * 60 * 1000);

      const totals = await underTest.getDailyTotals(1);

      expect(totals[0].seconds).toBeGreaterThanOrEqual(10 * 60 - 30);
      expect(totals[0].seconds).toBeLessThanOrEqual(10 * 60);
    });

    it('carries a session that spans midnight onto both days after a restart', async () => {
      const underTest = screenTimeService;
      jest.useFakeTimers({ now: new Date('2026-08-13T23:40:00.000Z') });

      await underTest.startSession('story');
      await jest.advanceTimersByTimeAsync(40 * 60 * 1000);
      await underTest.endSession();

      const totals = await underTest.getDailyTotals(2);
      const byDate = Object.fromEntries(totals.map(t => [t.date, t.seconds]));

      expect(byDate['2026-08-13']).toBe(20 * 60);
      expect(byDate['2026-08-14']).toBe(20 * 60);
    });

    it('does not report negative usage when the device clock jumps backwards', async () => {
      const underTest = screenTimeService;
      jest.useFakeTimers({ now: new Date('2026-08-13T12:00:00.000Z') });

      await underTest.startSession('story');
      // NTP correction / manual clock change pulling time backwards
      jest.setSystemTime(new Date('2026-08-13T11:00:00.000Z'));

      expect(underTest.getCurrentSessionDuration()).toBe(0);
      // nothing persisted and the live span is discarded, so today reads zero
      // rather than the -3600s the raw subtraction would have produced
      await expect(underTest.getTodayUsage()).resolves.toBe(0);
    });
  });

  describe('resetAllUsage', () => {
    it('clears every persisted session, not just today\'s, so daily totals return to zero', async () => {
      const underTest = screenTimeService;
      let store: string | null = JSON.stringify([
        { id: 'a', startTime: 1, endTime: 2, duration: 300, activity: 'story' as const, date: '2026-07-01' },
        { id: 'b', startTime: 1, endTime: 2, duration: 300, activity: 'story' as const, date: '2026-08-10' },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async () => store);
      (AsyncStorage.removeItem as jest.Mock).mockImplementation(async () => {
        store = null;
      });

      await underTest.resetAllUsage();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('screen_time_sessions');

      const totals = await underTest.getDailyTotals(60);
      expect(totals.every(t => t.seconds === 0)).toBe(true);
    });
  });

  describe('warning system', () => {
    // pinned mid-morning so a session fixture can never straddle UTC midnight
    // and have part of its span fall outside "today"
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-08-13T10:00:00.000Z') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should warn when approaching limit for 18-24 months', async () => {
      // Mock existing usage close to limit (10 minutes used, 5 minutes remaining for 15 min limit)
      const mockSessions = [
        {
          id: 'test-1',
          startTime: Date.now() - 600000, // 10 minutes ago
          endTime: Date.now(), // duration must match the span it covers
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

  describe('warning callbacks', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('notifies registered listeners from the monitor tick', async () => {
      const underTest = screenTimeService;
      const listener = jest.fn();
      underTest.onWarning(listener);
      jest.useFakeTimers({ now: new Date('2026-08-13T10:00:00.000Z') });

      // 15m limit for a 20-month-old, and 14m already banked today
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([
          {
            id: 'banked',
            startTime: new Date('2026-08-13T09:46:00.000Z').getTime(),
            endTime: new Date('2026-08-13T10:00:00.000Z').getTime(),
            duration: 14 * 60,
            activity: 'story' as const,
            date: '2026-08-13',
          },
        ])
      );

      await underTest.startSession('story', 20);
      await jest.advanceTimersByTimeAsync(30_000);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: expect.any(String) })
      );

      underTest.removeWarningCallback(listener);
      const callsAfterRemoval = listener.mock.calls.length;
      underTest.resetWarningDate();
      await jest.advanceTimersByTimeAsync(30_000);

      expect(listener).toHaveBeenCalledTimes(callsAfterRemoval);
    });

    it('only warns once per day', async () => {
      const underTest = screenTimeService;
      jest.useFakeTimers({ now: new Date('2026-08-13T10:00:00.000Z') });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([
          {
            id: 'over',
            startTime: new Date('2026-08-13T09:00:00.000Z').getTime(),
            endTime: new Date('2026-08-13T10:00:00.000Z').getTime(),
            duration: 60 * 60,
            activity: 'story' as const,
            date: '2026-08-13',
          },
        ])
      );

      await expect(underTest.checkForWarnings(20)).resolves.toBeTruthy();
      await expect(underTest.checkForWarnings(20)).resolves.toBeNull();
    });
  });

  describe('session replacement', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('closes the previous session when a new one starts', async () => {
      const underTest = screenTimeService;
      let store: string | null = null;
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async () => store);
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (_k: string, v: string) => {
        store = v;
      });
      jest.useFakeTimers({ now: new Date('2026-08-13T09:00:00.000Z') });

      await underTest.startSession('story');
      jest.setSystemTime(new Date('2026-08-13T09:05:00.000Z'));
      await underTest.startSession('music');

      const persisted = JSON.parse(store ?? '[]');
      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toMatchObject({ activity: 'story', duration: 5 * 60 });
    });
  });

  describe('resetTodayUsage', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('removes only today, leaving earlier days intact', async () => {
      const underTest = screenTimeService;
      jest.useFakeTimers({ now: new Date('2026-08-13T10:00:00.000Z') });
      let store: string | null = JSON.stringify([
        { id: 'old', startTime: 1, endTime: 2, duration: 300, activity: 'story' as const, date: '2026-08-12' },
        { id: 'today', startTime: 1, endTime: 2, duration: 300, activity: 'story' as const, date: '2026-08-13' },
      ]);
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async () => store);
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (_k: string, v: string) => {
        store = v;
      });

      await underTest.resetTodayUsage();

      expect(JSON.parse(store ?? '[]')).toEqual([
        expect.objectContaining({ id: 'old' }),
      ]);
    });

    it('restarts an open session from now, so today reads zero again', async () => {
      const underTest = screenTimeService;
      jest.useFakeTimers({ now: new Date('2026-08-13T09:00:00.000Z') });
      let store: string | null = null;
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async () => store);
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (_k: string, v: string) => {
        store = v;
      });

      await underTest.startSession('story');
      jest.setSystemTime(new Date('2026-08-13T09:20:00.000Z'));

      await underTest.resetTodayUsage();

      expect(underTest.getCurrentSessionDuration()).toBe(0);
      await expect(underTest.getTodayUsage()).resolves.toBe(0);
    });
  });

  describe('checkAndResetDailyData', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('stamps the new day the first time it runs', async () => {
      const underTest = screenTimeService;
      jest.useFakeTimers({ now: new Date('2026-08-13T10:00:00.000Z') });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('2026-08-12');

      await underTest.checkAndResetDailyData();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('last_daily_reset_date', '2026-08-13');
    });

    it('does nothing when it has already run today', async () => {
      const underTest = screenTimeService;
      jest.useFakeTimers({ now: new Date('2026-08-13T10:00:00.000Z') });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('2026-08-13');

      await underTest.checkAndResetDailyData();

      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
        'last_daily_reset_date',
        expect.anything()
      );
    });

    it('swallows storage failures rather than breaking the caller', async () => {
      const underTest = screenTimeService;
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('disk gone'));

      await expect(underTest.checkAndResetDailyData()).resolves.toBeUndefined();
    });
  });

  describe('storage failures', () => {
    it('treats unreadable session data as no sessions', async () => {
      const underTest = screenTimeService;
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{ not json');

      const totals = await underTest.getDailyTotals(3);

      expect(totals.every(t => t.seconds === 0)).toBe(true);
    });

    it('does not throw when a session cannot be written', async () => {
      const underTest = screenTimeService;
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('disk full'));

      await underTest.startSession('story');

      await expect(underTest.endSession()).resolves.toBeUndefined();
    });

    it('rethrows when clearing all usage fails', async () => {
      const underTest = screenTimeService;
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('disk gone'));

      await expect(underTest.resetAllUsage()).rejects.toThrow('disk gone');
    });

    it('rethrows when clearing today fails', async () => {
      const underTest = screenTimeService;
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('disk gone'));

      await expect(underTest.resetTodayUsage()).rejects.toThrow('disk gone');
    });

    it('restarts an open session after clearing all usage', async () => {
      const underTest = screenTimeService;
      jest.useFakeTimers({ now: new Date('2026-08-13T09:00:00.000Z') });
      let store: string | null = null;
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async () => store);
      (AsyncStorage.setItem as jest.Mock).mockImplementation(async (_k: string, v: string) => {
        store = v;
      });
      (AsyncStorage.removeItem as jest.Mock).mockImplementation(async () => {
        store = null;
      });

      await underTest.startSession('music');
      jest.setSystemTime(new Date('2026-08-13T09:30:00.000Z'));

      await underTest.resetAllUsage();

      // the session keeps running, but its clock restarts from the reset
      expect(underTest.getCurrentSessionDuration()).toBe(0);
      jest.setSystemTime(new Date('2026-08-13T09:35:00.000Z'));
      expect(underTest.getCurrentSessionDuration()).toBe(5 * 60);

      jest.useRealTimers();
    });
  });
});
