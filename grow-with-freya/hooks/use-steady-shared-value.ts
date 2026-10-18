import { useState } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

export function useSteadySharedValue(initial: number): SharedValue<number> {
  const made = useSharedValue(initial);
  const [first] = useState(made);

  return first;
}
