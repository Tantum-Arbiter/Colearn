import { useCallback, useEffect, useState } from 'react';

import { shouldPromptTrialEnd, trialPromptKey, type TrialStatus } from '@/constants/trial-end';
import { getTrialStatus } from '@/services/subscription-service';
import { useAppStore } from '@/store/app-store';

function useTrialStatus(): TrialStatus | null {
  const subscriptionTier = useAppStore((state) => state.subscriptionTier);
  const devOverride = useAppStore((state) => state._devSubscriptionOverride);
  const [status, setStatus] = useState<TrialStatus | null>(null);

  useEffect(() => {
    let alive = true;

    getTrialStatus()
      .then((next) => {
        if (alive) setStatus(next);
      })
      .catch(() => {
        // getTrialStatus already swallows and logs; this guards a rejected
        // mock or a future signature change from unhandling here.
      });

    return () => {
      alive = false;
    };
  }, [subscriptionTier, devOverride]);

  return status;
}

export interface TrialEndPrompt {
  visible: boolean;
  status: TrialStatus | null;
  dismiss: () => void;
}

/**
 * Whether the end-of-trial upgrade offer is owed to this parent right now.
 *
 * The clock is the only thing that opens that screen -- the trial screen
 * itself is read-only -- so this is the single place the question is asked.
 * Asked again whenever the tier moves, so buying Premium from the screen
 * closes it rather than leaving it standing over a subscription that no
 * longer needs upgrading.
 */
export function useTrialEndPrompt(): TrialEndPrompt {
  const seenFor = useAppStore((state) => state.trialEndPromptSeenFor);
  const markSeen = useAppStore((state) => state.setTrialEndPromptSeenFor);
  const status = useTrialStatus();

  const dismiss = useCallback(() => {
    const key = trialPromptKey(status);
    if (key) markSeen(key);
  }, [status, markSeen]);

  return { visible: shouldPromptTrialEnd(status, seenFor), status, dismiss };
}
