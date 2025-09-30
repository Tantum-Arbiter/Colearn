import { router } from 'expo-router';
import { DefaultPage } from '@/components/default-page';

export default function StoriesScreen() {
  const handleBackToMenu = () => {
    // Navigate back to main menu
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback: navigate to root
      router.replace('/');
    }
  };

  return (
    <DefaultPage
      icon="stories-icon"
      title="Stories"
      onBack={handleBackToMenu}
    />
  );
}
