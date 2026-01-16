import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

/**
 * Hook to get the translated back button text.
 * iOS shows arrow with text, Android shows just text to avoid alignment issues.
 */
export function useBackButtonText(): string {
  const { t } = useTranslation();
  
  return Platform.select({
    ios: t('common.backArrow'),
    default: t('common.back'),
  }) || t('common.back');
}

