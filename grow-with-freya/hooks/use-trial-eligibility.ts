import { useEffect, useState } from 'react';

import { isTrialAvailable } from '@/services/subscription-service';

/**
 * Whether to offer the free trial or the plans.
 *
 * Starts true so the trial is offered while the store is still being asked,
 * and stays true if the question cannot be answered -- see `isTrialAvailable`
 * for why the uncertain paths all lean that way.
 */
export function useTrialEligibility(): boolean {
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let alive = true;

    isTrialAvailable()
      .then((eligible) => {
        if (alive) setAvailable(eligible);
      })
      .catch(() => {
        // isTrialAvailable already swallows and logs; this guards a rejected
        // mock or a future signature change from unhandling here.
      });

    return () => {
      alive = false;
    };
  }, []);

  return available;
}
