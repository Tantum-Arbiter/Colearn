import { useCallback, useRef } from 'react';
import { DefaultPage } from '@/components/default-page';
import { useAppStore } from '@/store/app-store';

export default function StoriesScreen() {
  const { requestReturnToMainMenu } = useAppStore();
  const lastCallRef = useRef<number>(0);

  const handleBackToMenu = useCallback(() => {
    // Debounce rapid back button presses (500ms)
    const now = Date.now();
    if (now - lastCallRef.current < 500) {
      return; // Ignore rapid presses
    }
    lastCallRef.current = now;

    // Request return to main menu via global state
    requestReturnToMainMenu();
  }, [requestReturnToMainMenu]);

  return (
    <DefaultPage
      icon="stories-icon"
      title="Stories"
      onBack={handleBackToMenu}
    />
  );
}
