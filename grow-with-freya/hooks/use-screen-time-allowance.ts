import { useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { useScreenTime } from '@/components/screen-time/screen-time-provider';
import ScreenTimeService from '@/services/screen-time-service';

export interface ScreenTimeAllowance {
  usageSeconds: number;
  limitSeconds: number;
}

export function useScreenTimeAllowance(): ScreenTimeAllowance | null {
  const screenTimeEnabled = useAppStore((state) => state.screenTimeEnabled);
  const childAgeInMonths = useAppStore((state) => state.childAgeInMonths);
  const { todayUsage } = useScreenTime();

  return useMemo(() => {
    if (!screenTimeEnabled) {
      return null;
    }

    return {
      usageSeconds: todayUsage,
      limitSeconds: ScreenTimeService.getInstance().getDailyLimit(childAgeInMonths ?? 24),
    };
  }, [screenTimeEnabled, todayUsage, childAgeInMonths]);
}
