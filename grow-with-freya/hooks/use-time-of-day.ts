import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { resolveTimeOfDay, type TimeOfDay } from '@/constants/home-scene';

const CHECK_INTERVAL_MS = 60_000;

export function useTimeOfDay(): TimeOfDay {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => resolveTimeOfDay(new Date()));

  useEffect(() => {
    const settle = () => {
      setTimeOfDay((current) => {
        const next = resolveTimeOfDay(new Date());

        return next === current ? current : next;
      });
    };

    const interval = setInterval(settle, CHECK_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        settle();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return timeOfDay;
}
