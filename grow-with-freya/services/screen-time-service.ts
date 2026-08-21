import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import i18n from 'i18next';
import { Logger } from '@/utils/logger';

const log = Logger.create('ScreenTime');

// WHO/AAP Guidelines for screen time
export const SCREEN_TIME_LIMITS = {
  // 18-24 months: Watch high-quality programming with a parent/caregiver
  MONTHS_18_24: 15 * 60, // 15 minutes in seconds
  // 2-6 years: Limit to 1 hour per day of high-quality programming
  YEARS_2_6: 60 * 60, // 60 minutes in seconds
  // 6+ years: Establish consistent limits (2 hours recommended)
  YEARS_6_PLUS: 120 * 60, // 120 minutes in seconds
} as const;

export interface ScreenTimeSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number; // in seconds
  activity: 'story' | 'emotions' | 'music';
  date: string; // YYYY-MM-DD format
}

export interface HeatmapData {
  day: number; // 0 = Sunday, 1 = Monday, etc.
  hour: number; // 0-23
  usage: number; // seconds of usage in this hour
  intensity: number; // 0-1 normalized intensity for color mapping
  isOverRecommended: boolean; // true if usage exceeds age-appropriate recommendations
}

export interface DailyTotal {
  date: string; // YYYY-MM-DD
  seconds: number;
}

export interface ScreenTimeStats {
  todayUsage: number; // seconds
  weeklyUsage: ScreenTimeSession[];
  dailyAverages: Record<string, number>; // day of week -> average seconds
  recommendedSchedule: ScheduleRecommendation[];
  heatmapData: HeatmapData[]; // hourly usage heatmap for the week
}

export interface ScheduleRecommendation {
  time: string; // HH:MM format
  activity: 'story' | 'emotions' | 'music';
  duration: number; // recommended duration in minutes
  dayOfWeek?: number; // 0-6, Sunday = 0
}

export interface ScreenTimeWarning {
  type: 'approaching_limit' | 'limit_reached' | 'daily_complete';
  remainingTime: number; // seconds
  message: string;
}

class ScreenTimeService {
  private static instance: ScreenTimeService;
  private currentSession: ScreenTimeSession | null = null;
  private warningCallbacks: ((warning: ScreenTimeWarning) => void)[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private lastWarningDate: string | null = null; // Track last warning date (YYYY-MM-DD format)

  static getInstance(): ScreenTimeService {
    if (!ScreenTimeService.instance) {
      ScreenTimeService.instance = new ScreenTimeService();
    }
    return ScreenTimeService.instance;
  }

  getDailyLimit(ageInMonths: number): number {
    if (ageInMonths < 24) {
      return SCREEN_TIME_LIMITS.MONTHS_18_24;
    } else if (ageInMonths < 72) {
      return SCREEN_TIME_LIMITS.YEARS_2_6;
    } else {
      return SCREEN_TIME_LIMITS.YEARS_6_PLUS;
    }
  }

  async startSession(activity: 'story' | 'emotions' | 'music', childAgeInMonths: number = 24): Promise<void> {
    if (this.currentSession) {
      await this.endSession();
    }

    const now = Date.now();
    this.currentSession = {
      id: `session_${now}`,
      startTime: now,
      duration: 0,
      activity,
      date: new Date().toISOString().split('T')[0],
    };

    // Start monitoring for warnings with child age
    this.startWarningMonitor(childAgeInMonths);
  }

  async endSession(): Promise<void> {
    if (!this.currentSession) return;

    const now = Date.now();
    this.currentSession.endTime = now;
    this.currentSession.duration = Math.floor((now - this.currentSession.startTime) / 1000);

    // Save session to storage
    await this.saveSession(this.currentSession);
    
    this.currentSession = null;
    this.stopWarningMonitor();
  }

  getCurrentSessionDuration(): number {
    if (!this.currentSession) return 0;
    // Never negative: the device clock can move backwards (NTP correction,
    // manual change, DST), and a negative duration would silently cancel out
    // real usage and suppress limit warnings.
    return Math.max(0, Math.floor((Date.now() - this.currentSession.startTime) / 1000));
  }

  async getTodayUsage(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const allSessions = await this.getAllSessions();

    // Derived from real start/end timestamps rather than the stored date+
    // duration pair, so a record mis-attributed to today (legacy, or one that
    // ran across midnight) contributes only the part that truly falls today.
    const persisted = allSessions.reduce((total, session) => {
      const todaySegment = this.splitSessionByDay(session).find(seg => seg.date === today);
      return total + (todaySegment?.seconds ?? 0);
    }, 0);

    const elapsedToday = this.secondsSinceUtcMidnight();

    // Belt and braces: the live session is checkpointed every 30s, but that is
    // not a guarantee. Nothing about today can exceed the time that has
    // actually passed since midnight, so clamp the whole total, not just the
    // live part.
    return Math.min(persisted + this.getCurrentSessionDuration(), elapsedToday);
  }

  private secondsSinceUtcMidnight(referenceMs: number = Date.now()): number {
    const now = new Date(referenceMs);
    const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.floor((referenceMs - utcMidnight) / 1000);
  }

  /**
   * Total usage per calendar day for the last `days` days (including today),
   * oldest first, with zero entries for days without sessions -- ready for the
   * dashboard's trend chart at any range.
   */
  async getDailyTotals(days: number = 30): Promise<DailyTotal[]> {
    const allSessions = await this.getAllSessions();
    const byDate: Record<string, number> = {};

    allSessions.forEach(session => {
      this.splitSessionByDay(session).forEach(({ date, seconds }) => {
        byDate[date] = (byDate[date] || 0) + seconds;
      });
    });

    const totals: DailyTotal[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      totals.push({ date: key, seconds: byDate[key] || 0 });
    }

    return totals;
  }

  // Derives per-day seconds from a session's actual startTime/endTime rather
  // than trusting its stored date+duration, so a record whose whole span got
  // written under one day (e.g. a legacy record from before checkpointing,
  // or a session that crossed midnight) is redistributed to the days it
  // actually happened on.
  private splitSessionByDay(session: ScreenTimeSession): { date: string; seconds: number }[] {
    const start = session.startTime;
    const end = session.endTime ?? start + session.duration * 1000;
    if (!(end > start)) {
      return [{ date: session.date, seconds: session.duration }];
    }

    const segments: { date: string; seconds: number }[] = [];
    let cursor = start;
    while (cursor < end) {
      const cursorDate = new Date(cursor);
      const nextMidnight = Date.UTC(
        cursorDate.getUTCFullYear(),
        cursorDate.getUTCMonth(),
        cursorDate.getUTCDate() + 1
      );
      const segmentEnd = Math.min(end, nextMidnight);
      segments.push({
        date: cursorDate.toISOString().split('T')[0],
        seconds: Math.floor((segmentEnd - cursor) / 1000),
      });
      cursor = segmentEnd;
    }
    return segments;
  }

  async getScreenTimeStats(childAgeInMonths: number = 24): Promise<ScreenTimeStats> {
    const todayUsage = await this.getTodayUsage();
    const weeklyUsage = await this.getWeeklyUsage();
    const dailyAverages = this.calculateDailyAverages(weeklyUsage);
    const recommendedSchedule = this.generateRecommendedSchedule(dailyAverages);
    const heatmapData = this.generateHeatmapData(weeklyUsage, childAgeInMonths);

    return {
      todayUsage,
      weeklyUsage,
      dailyAverages,
      recommendedSchedule,
      heatmapData,
    };
  }

  async checkForWarnings(childAgeInMonths: number): Promise<ScreenTimeWarning | null> {
    const dailyLimit = this.getDailyLimit(childAgeInMonths);
    const todayUsage = await this.getTodayUsage();
    const remainingTime = dailyLimit - todayUsage;

    // No limits for development/testing - return null
    if (dailyLimit === 0) {
      return null;
    }

    // Check if we already showed a warning today
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    if (this.lastWarningDate === today) {
      return null; // Don't show duplicate warnings on the same day
    }

    // Approaching limit (5 minutes remaining)
    if (remainingTime <= 5 * 60 && remainingTime > 0) {
      this.lastWarningDate = today; // Mark that we showed a warning today
      return {
        type: 'approaching_limit',
        remainingTime,
        message: i18n.t('screenTimeWarning.approachingMessage', { minutes: Math.ceil(remainingTime / 60) }),
      };
    }

    // Limit reached
    if (remainingTime <= 0) {
      this.lastWarningDate = today; // Mark that we showed a warning today
      return {
        type: 'limit_reached',
        remainingTime: 0,
        message: i18n.t('screenTimeWarning.limitReachedMessage'),
      };
    }

    return null;
  }

  onWarning(callback: (warning: ScreenTimeWarning) => void): void {
    this.warningCallbacks.push(callback);
  }

  removeWarningCallback(callback: (warning: ScreenTimeWarning) => void): void {
    this.warningCallbacks = this.warningCallbacks.filter(cb => cb !== callback);
  }

  resetWarningDate(): void {
    this.lastWarningDate = null;
  }

  async resetTodayUsage(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const allSessions = await this.getAllSessions();

      // Filter out today's sessions
      const filteredSessions = allSessions.filter(session => session.date !== today);

      // Save the filtered sessions back to storage
      await AsyncStorage.setItem('screen_time_sessions', JSON.stringify(filteredSessions));

      // Reset current session if active (restart it from now)
      if (this.currentSession) {
        const activity = this.currentSession.activity;
        this.currentSession = null;
        this.stopWarningMonitor();

        // Restart the session from now (this resets the start time)
        const now = Date.now();
        this.currentSession = {
          id: `session_${now}`,
          startTime: now,
          duration: 0,
          activity,
          date: today,
        };
      }

      // Reset warning date for today
      this.resetWarningDate();
    } catch (error) {
      log.error('Failed to reset today\'s usage:', error);
      throw error;
    }
  }

  async resetAllUsage(): Promise<void> {
    try {
      await AsyncStorage.removeItem('screen_time_sessions');

      // Reset current session if active (restart it from now)
      if (this.currentSession) {
        const activity = this.currentSession.activity;
        this.currentSession = null;
        this.stopWarningMonitor();

        const now = Date.now();
        this.currentSession = {
          id: `session_${now}`,
          startTime: now,
          duration: 0,
          activity,
          date: new Date(now).toISOString().split('T')[0],
        };
      }

      this.resetWarningDate();
    } catch (error) {
      log.error('Failed to reset all screen time usage:', error);
      throw error;
    }
  }

  async checkAndResetDailyData(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastResetDate = await AsyncStorage.getItem('last_daily_reset_date');

      if (lastResetDate !== today) {
        // It's a new day, reset daily-specific data
        this.lastWarningDate = null; // Reset warning tracking for new day
        await AsyncStorage.setItem('last_daily_reset_date', today);
      }
    } catch (error) {
      log.error('Failed to check/reset daily data:', error);
    }
  }

  private async saveSession(session: ScreenTimeSession): Promise<void> {
    try {
      const existingSessions = await this.getAllSessions();
      const updatedSessions = [...existingSessions, session];
      await AsyncStorage.setItem('screen_time_sessions', JSON.stringify(updatedSessions));
    } catch (error) {
      log.error('Failed to save screen time session:', error);
    }
  }

  private async getAllSessions(): Promise<ScreenTimeSession[]> {
    try {
      const sessionsJson = await AsyncStorage.getItem('screen_time_sessions');
      return sessionsJson ? JSON.parse(sessionsJson) : [];
    } catch (error) {
      log.error('Failed to load screen time sessions:', error);
      return [];
    }
  }

  private async getWeeklyUsage(): Promise<ScreenTimeSession[]> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const allSessions = await this.getAllSessions();
    
    return allSessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= weekAgo && sessionDate <= now;
    });
  }

  private calculateDailyAverages(sessions: ScreenTimeSession[]): Record<string, number> {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyTotals: Record<string, number[]> = {};

    sessions.forEach(session => {
      const date = new Date(session.date);
      const dayName = dayNames[date.getDay()];
      
      if (!dailyTotals[dayName]) {
        dailyTotals[dayName] = [];
      }
      dailyTotals[dayName].push(session.duration);
    });

    const averages: Record<string, number> = {};
    Object.keys(dailyTotals).forEach(day => {
      const total = dailyTotals[day].reduce((sum, duration) => sum + duration, 0);
      averages[day] = Math.floor(total / dailyTotals[day].length);
    });

    return averages;
  }

  private generateRecommendedSchedule(dailyAverages: Record<string, number>): ScheduleRecommendation[] {
    // Generate a simple recommended schedule based on usage patterns
    const recommendations: ScheduleRecommendation[] = [
      {
        time: '09:00',
        activity: 'story',
        duration: 10,
      },
      {
        time: '15:00',
        activity: 'emotions',
        duration: 5,
      },
      {
        time: '19:00',
        activity: 'story',
        duration: 10,
      },
    ];

    return recommendations;
  }

  private generateHeatmapData(sessions: ScreenTimeSession[], childAgeInMonths: number = 24): HeatmapData[] {
    // Create a simple 7-day grid (daily usage only)
    const dailyUsage: Record<number, number> = {};

    // Initialize with zeros for each day of the week
    for (let day = 0; day < 7; day++) {
      dailyUsage[day] = 0;
    }

    // Process each session to calculate daily totals
    sessions.forEach(session => {
      if (!session.endTime || !session.startTime) return;

      const startDate = new Date(session.startTime);
      const endDate = new Date(session.endTime);
      const dayOfWeek = startDate.getDay(); // 0 = Sunday

      // Calculate session duration in seconds
      const sessionDuration = (endDate.getTime() - startDate.getTime()) / 1000;
      dailyUsage[dayOfWeek] = (dailyUsage[dayOfWeek] || 0) + sessionDuration;
    });

    // Get age-appropriate daily limit
    const dailyLimit = this.getDailyLimit(childAgeInMonths);

    // Find max usage for intensity calculation
    const maxUsage = Math.max(...Object.values(dailyUsage), 1); // Avoid division by zero

    // Create heatmap data for each day (using hour = 0 for simplicity)
    const heatmapArray: HeatmapData[] = [];
    for (let day = 0; day < 7; day++) {
      const usage = dailyUsage[day] || 0;
      const intensity = usage / maxUsage; // Normalize to 0-1

      // Check if daily usage exceeds recommended limit
      const isOverRecommended = dailyLimit > 0 && usage > dailyLimit;

      heatmapArray.push({
        day,
        hour: 0, // Not used for daily view, but kept for interface compatibility
        usage,
        intensity,
        isOverRecommended,
      });
    }

    return heatmapArray;
  }

  // Flushes the elapsed time of the currently open session to storage and
  // rolls its anchor forward to now, so a session left running for hours
  // (background transition missed, or genuinely long foreground use) never
  // dumps its whole duration onto the single calendar day it started on.
  private async checkpointSession(): Promise<void> {
    if (!this.currentSession) return;

    const now = Date.now();
    const elapsed = Math.floor((now - this.currentSession.startTime) / 1000);
    if (elapsed <= 0) return;

    await this.saveSession({
      ...this.currentSession,
      id: `${this.currentSession.id}_cp${now}`,
      endTime: now,
      duration: elapsed,
    });

    this.currentSession.startTime = now;
    this.currentSession.date = new Date(now).toISOString().split('T')[0];
  }

  private startWarningMonitor(childAgeInMonths: number = 24): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check every 30 seconds
    this.checkInterval = setInterval(async () => {
      await this.checkpointSession();

      const warning = await this.checkForWarnings(childAgeInMonths);
      if (warning) {
        this.warningCallbacks.forEach(callback => callback(warning));
      }
    }, 30000);
  }

  private stopWarningMonitor(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export default ScreenTimeService;
