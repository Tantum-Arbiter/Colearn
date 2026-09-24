import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/app-store';
import { needsSignIn as needsSignInFrom } from '@/store/session';
import { ApiClient } from '@/services/api-client';
import { reminderService } from '@/services/reminder-service';
import { ChildSyncService } from '@/services/child-sync-service';
import { forgetAccount as forgetSubscriptionAccount } from '@/services/subscription-service';
import { Logger } from '@/utils/logger';

const log = Logger.create('Session');

export interface SessionActions {
  /** A guest, or a signed-in family whose session the app could not refresh. */
  needsSignIn: boolean;
  /** Leaves guest mode for the login page; the layout switches to it. */
  login: () => void;
  /** Asks first, then clears the profile and returns to the login page. */
  logout: () => void;
}

export function useSessionActions(): SessionActions {
  const { t } = useTranslation();
  const needsSignIn = useAppStore((state) => needsSignInFrom(state));
  const setShowLoginAfterOnboarding = useAppStore((state) => state.setShowLoginAfterOnboarding);
  const setLoginComplete = useAppStore((state) => state.setLoginComplete);
  const clearUserProfile = useAppStore((state) => state.clearUserProfile);

  const login = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLoginAfterOnboarding(true);
  }, [setShowLoginAfterOnboarding]);

  const logout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t('alerts.logout.title'), t('alerts.logout.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: () => {
          try {
            clearUserProfile();
            setLoginComplete(false);
            setShowLoginAfterOnboarding(true);
            ApiClient.logout().catch((error) => {
              log.error('Background logout error:', error);
            });
            reminderService.clearAllReminders().catch((error) => {
              log.error('Background reminder clear error:', error);
            });
            ChildSyncService.forgetAccount().catch((error) => {
              log.error('Background child sync reset error:', error);
            });
            forgetSubscriptionAccount();
          } catch (error) {
            log.error('Logout error:', error);
            Alert.alert(t('common.error'), t('alerts.logout.error'));
          }
        },
      },
    ]);
  }, [t, clearUserProfile, setLoginComplete, setShowLoginAfterOnboarding]);

  return { needsSignIn, login, logout };
}
