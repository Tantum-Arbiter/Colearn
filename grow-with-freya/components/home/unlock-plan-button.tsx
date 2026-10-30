import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { GoldButton } from '@/components/child-ui/gold-button';
import { UNLOCK_PLAN } from '@/constants/unlock-plan';
import { useTrialEligibility } from '@/hooks/use-trial-eligibility';

export interface UnlockPlanButtonProps {
  onPress: () => void;
  testID?: string;
}

export const UnlockPlanButton = memo(function UnlockPlanButton({
  onPress,
  testID = 'unlock-plan-button',
}: UnlockPlanButtonProps) {
  const { t } = useTranslation();
  const trialAvailable = useTrialEligibility();
  const label = t(trialAvailable ? 'subscription.startFreeTrial' : 'subscription.unlockPlan');

  return (
    <GoldButton
      testID={testID}
      label={label}
      accessibilityLabel={label}
      icon="lock-closed"
      iconPosition="trailing"
      onPress={onPress}
      hitSlop={8}
      height={UNLOCK_PLAN.height}
      fontSize={UNLOCK_PLAN.fontSize}
      iconSize={UNLOCK_PLAN.iconSize}
    />
  );
});
