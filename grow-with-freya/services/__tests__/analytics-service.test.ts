import { AnalyticsService, bucketDuration, DurationBucket } from '../analytics-service';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.0.0', extra: { gatewayUrl: 'http://test-gateway' } },
}));

jest.mock('@/utils/logger', () => ({
  Logger: { create: () => ({ debug: jest.fn(), error: jest.fn(), warn: jest.fn() }) },
}));

jest.mock('../secure-storage', () => ({
  SecureStorage: {
    getAccessToken: jest.fn().mockResolvedValue('test-token'),
  },
}));

// Note: DeviceInfoService is NOT imported by analytics-service (privacy: no persistent device IDs)

global.fetch = jest.fn().mockResolvedValue({ ok: true });

describe('bucketDuration', () => {
  const cases: [number, DurationBucket][] = [
    [0, '<1min'],
    [30, '<1min'],
    [59, '<1min'],
    [60, '1-3min'],
    [120, '1-3min'],
    [179, '1-3min'],
    [180, '3-5min'],
    [299, '3-5min'],
    [300, '5-10min'],
    [599, '5-10min'],
    [600, '10-20min'],
    [1199, '10-20min'],
    [1200, '20min+'],
    [9999, '20min+'],
  ];

  it.each(cases)('buckets %d seconds as %s', (seconds, expected) => {
    expect(bucketDuration(seconds)).toBe(expected);
  });
});

describe('AnalyticsService', () => {
  beforeEach(() => {
    AnalyticsService._resetForTesting();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('consent gating', () => {
    it('discards events when consent not given', () => {
      AnalyticsService.initialize('en', false);
      AnalyticsService.track('test_event', { key: 'value' });

      expect(AnalyticsService._getBuffer()).toHaveLength(0);
    });

    it('buffers events when consent is given', () => {
      AnalyticsService.initialize('en', true);
      AnalyticsService.track('test_event', { key: 'value' });

      expect(AnalyticsService._getBuffer()).toHaveLength(2); // session_started + test_event
    });

    it('starts accepting events after setConsent(true)', () => {
      AnalyticsService.initialize('en', false);
      AnalyticsService.track('ignored', {});
      expect(AnalyticsService._getBuffer()).toHaveLength(0);

      AnalyticsService.setConsent(true);
      AnalyticsService.track('accepted', {});
      expect(AnalyticsService._getBuffer()).toHaveLength(1);
    });
  });

  describe('session ID', () => {
    it('generates a valid UUID v4 format', () => {
      const sessionId = AnalyticsService._getSessionId();
      expect(sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    it('generates a new session ID on reset', () => {
      const id1 = AnalyticsService._getSessionId();
      AnalyticsService._resetForTesting();
      const id2 = AnalyticsService._getSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('buffering', () => {
    it('buffers multiple events', () => {
      AnalyticsService.initialize('en', true);
      AnalyticsService.trackStoryOpened('story-1', 'adventure', 'read');
      AnalyticsService.trackStoryCompleted('story-1', 120, 5);
      AnalyticsService.trackDownloadStarted('story-2');

      // session_started + 3 tracked events
      expect(AnalyticsService._getBuffer()).toHaveLength(4);
    });

    it('includes correct event structure', () => {
      AnalyticsService.initialize('en', true);
      AnalyticsService.trackStoryOpened('story-1', 'bedtime', 'narrate');

      const buffer = AnalyticsService._getBuffer();
      const storyEvent = buffer.find(e => e.event === 'story_opened');
      expect(storyEvent).toEqual({
        event: 'story_opened',
        properties: { storyId: 'story-1', category: 'bedtime', storyType: 'narrate' },
      });
    });

    it('uses duration bucketing for story_completed', () => {
      AnalyticsService.initialize('en', true);
      AnalyticsService.trackStoryCompleted('story-1', 250, 8);

      const buffer = AnalyticsService._getBuffer();
      const event = buffer.find(e => e.event === 'story_completed');
      expect(event?.properties.durationBucket).toBe('3-5min');
      expect(event?.properties.pagesViewed).toBe('8');
    });
  });

  describe('flush', () => {
    it('clears buffer after flush', async () => {
      AnalyticsService.initialize('en', true);
      AnalyticsService.trackStoryOpened('s1', 'cat', 'read');
      expect(AnalyticsService._getBuffer().length).toBeGreaterThan(0);

      await AnalyticsService.flush();
      expect(AnalyticsService._getBuffer()).toHaveLength(0);
    });

    it('sends correct batch payload via POST', async () => {
      AnalyticsService.initialize('en', true);
      AnalyticsService.trackDownloadStarted('story-42');

      await AnalyticsService.flush();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('http://test-gateway/api/analytics/events');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(typeof body.platform).toBe('string');
      expect(body.appVersion).toBe('1.0.0');
      expect(body.locale).toBe('en');
      expect(body.sessionId).toMatch(/^[0-9a-f]{8}-/);
      expect(body.events).toHaveLength(2); // session_started + download_started
    });

    it('does not send if buffer is empty', async () => {
      AnalyticsService.initialize('en', true);
      // Clear the session_started event
      AnalyticsService._getBuffer().length = 0;

      await AnalyticsService.flush();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does not send if consent not given', async () => {
      AnalyticsService.initialize('en', false);
      // Force an event into buffer despite no consent (testing the flush guard)
      (AnalyticsService as any).buffer = [{ event: 'test', properties: {} }];

      await AnalyticsService.flush();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('silently handles fetch errors (fire-and-forget)', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      AnalyticsService.initialize('en', true);
      AnalyticsService.trackAppError('crash');

      // Should not throw
      await expect(AnalyticsService.flush()).resolves.toBeUndefined();
      expect(AnalyticsService._getBuffer()).toHaveLength(0);
    });
  });

  describe('typed tracking methods', () => {
    beforeEach(() => {
      AnalyticsService.initialize('en', true);
      // Clear the session_started event for cleaner assertions
      AnalyticsService._getBuffer().length = 0;
    });

    it('trackMusicChallengeCompleted', () => {
      AnalyticsService.trackMusicChallengeCompleted('story-1', 'flute');
      const buf = AnalyticsService._getBuffer();
      expect(buf).toHaveLength(1);
      expect(buf[0]).toEqual({
        event: 'music_challenge_completed',
        properties: { storyId: 'story-1', instrumentId: 'flute' },
      });
    });

    it('trackPractiseSession with duration bucketing', () => {
      AnalyticsService.trackPractiseSession('recorder', 2, 400);
      const buf = AnalyticsService._getBuffer();
      expect(buf[0].properties.durationBucket).toBe('5-10min');
      expect(buf[0].properties.songIndex).toBe('2');
    });

    it('trackShareToUnlock', () => {
      AnalyticsService.trackShareToUnlock('share-story');
      expect(AnalyticsService._getBuffer()[0].event).toBe('share_to_unlock');
    });

    it('trackOnboardingCompleted', () => {
      AnalyticsService.trackOnboardingCompleted();
      expect(AnalyticsService._getBuffer()[0].event).toBe('onboarding_completed');
    });
  });

  describe('privacy compliance', () => {
    it('does NOT send X-Device-ID or other persistent identifiers', async () => {
      AnalyticsService.initialize('en', true);
      AnalyticsService.trackStoryOpened('s1', 'cat', 'read');

      await AnalyticsService.flush();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      const headers = options.headers;

      // Must NOT contain any persistent device identifiers
      expect(headers['X-Device-ID']).toBeUndefined();
      expect(headers['X-Device-Id']).toBeUndefined();
      expect(headers['X-Session-ID']).toBeUndefined();
      expect(headers['X-Device-Type']).toBeUndefined();
      expect(headers['X-Device-Brand']).toBeUndefined();
      expect(headers['X-Device-Manufacturer']).toBeUndefined();
      expect(headers['X-OS-Version']).toBeUndefined();

      // Should only have Content-Type and Authorization
      expect(Object.keys(headers)).toEqual(['Content-Type', 'Authorization']);
    });

    it('batch payload contains no userId, email, or PII fields', async () => {
      AnalyticsService.initialize('en', true);
      AnalyticsService.trackStoryCompleted('s1', 300, 10);

      await AnalyticsService.flush();

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      // Top-level batch must not contain user-identifying fields
      expect(body.userId).toBeUndefined();
      expect(body.email).toBeUndefined();
      expect(body.deviceId).toBeUndefined();
      expect(body.ipAddress).toBeUndefined();
      expect(body.childId).toBeUndefined();
      expect(body.nickname).toBeUndefined();

      // Only allowed top-level keys
      expect(Object.keys(body).sort()).toEqual(
        ['appVersion', 'events', 'locale', 'platform', 'sessionId'].sort()
      );

      // Events must not contain PII
      for (const event of body.events) {
        expect(event.properties.userId).toBeUndefined();
        expect(event.properties.email).toBeUndefined();
        expect(event.properties.deviceId).toBeUndefined();
        expect(event.properties.childName).toBeUndefined();
      }
    });

    it('sessionId is a non-persistent UUID (changes on reset)', () => {
      const id1 = AnalyticsService._getSessionId();
      AnalyticsService._resetForTesting();
      const id2 = AnalyticsService._getSessionId();

      expect(id1).not.toBe(id2);
      // Both should be valid UUID v4
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(id1).toMatch(uuidRegex);
      expect(id2).toMatch(uuidRegex);
    });

    it('durations are bucketed, not exact values', async () => {
      AnalyticsService.initialize('en', true);
      AnalyticsService.trackStoryCompleted('s1', 247, 5); // Exact: 247s

      await AnalyticsService.flush();

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);
      const completedEvent = body.events.find((e: any) => e.event === 'story_completed');

      // Must be a bucket, not the exact value
      expect(completedEvent.properties.durationBucket).toBe('3-5min');
      expect(completedEvent.properties.durationSeconds).toBeUndefined();
      expect(completedEvent.properties.duration).toBeUndefined();
    });
  });
});
