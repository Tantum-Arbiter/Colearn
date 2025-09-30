import { DefaultPage } from '@/components/default-page';
import { useAppStore } from '@/store/app-store';

export default function StoriesScreen() {
  const { requestReturnToMainMenu } = useAppStore();

  const handleBackToMenu = () => {
    // Request return to main menu via global state
    requestReturnToMainMenu();
  };

  return (
    <DefaultPage
      icon="stories-icon"
      title="Stories"
      onBack={handleBackToMenu}
    />
  );
}
