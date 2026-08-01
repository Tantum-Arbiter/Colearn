import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { STORY_PLACES, getStoryPlace } from '@/constants/story-places';
import { STORY_GARDEN_SCALE } from '@/constants/story-garden-motion';
import { GardenGreeting } from '@/components/stories/story-garden/garden-greeting';
import { ContinueReadingBook } from '@/components/stories/story-garden/continue-reading-book';
import { StoryShelf } from '@/components/stories/story-garden/story-shelf';
import { FocusedBook } from '@/components/stories/story-garden/focused-book';
import { BookOpeningBridge } from '@/components/stories/story-garden/book-opening-bridge';
import { BookClosing } from '@/components/stories/story-garden/book-closing';
import { PageEdgeNavigation } from '@/components/stories/reader/page-edge-navigation';
import type { Story } from '@/types/story';

i18n.use(initReactI18next).init({
  lng: 'en', fallbackLng: 'en', interpolation: { escapeValue: false },
  resources: { en: { translation: { storyGarden: {
    title: 'Stories', invitation: 'Which story shall we share?',
    greeting: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening',
      morningNamed: 'Good morning, {{name}}', afternoonNamed: 'Good afternoon, {{name}}',
      eveningNamed: 'Good evening, {{name}}' },
    places: { sunnyMeadow: 'Sunny Meadow', woodlandPath: 'Woodland Path',
      cosyCorner: 'Cosy Corner', moonlitStories: 'Moonlit Stories' },
    continueReading: 'Continue reading', parentCorner: 'Parent corner',
    empty: 'No stories here yet. New ones arrive soon.',
    readTogether: 'Read Together', listen: 'Listen', listenTo: 'Listen to {{name}}',
    recordAVoice: 'Record a Voice', putBack: 'Put Back', putItBack: 'Put It Back',
    readAgain: 'Read Again', closeBook: 'Close Book',
    turnTheScreen: 'Turn the screen together', turnTheScreenShort: 'Turn the screen',
    readThisWay: 'Read this way', nextPage: 'Next page', previousPage: 'Previous page',
  } } } },
});

const cover = require('../assets/stories/snuggle-little-wombat/cover/cover-large.webp');
const page1 = require('../assets/stories/snuggle-little-wombat/page-1/background.webp');

function mk(id: string, title: string, category: string): Story {
  return { id, title, description: 'A gentle story about taking turns.',
    category, isAvailable: true, coverImage: cover } as Story;
}
const MOON = mk('moon', 'Moonlight Lullaby', 'bedtime');
const SHELF = [MOON, mk('dragon', 'Dragon Friend', 'fantasy'), mk('stars', 'Counting Stars', 'bedtime')];

function useScene(): string {
  const [scene, setScene] = useState<string>(() =>
    (typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '') || 'garden');
  useEffect(() => {
    const onHash = () => setScene(window.location.hash.replace('#', '') || 'garden');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return scene;
}

function Garden() {
  const { width } = useWindowDimensions();
  return (
    <LinearGradient colors={['#4ECDC4', '#3B82F6', '#1E3A8A']} style={StyleSheet.absoluteFill}>
      <ScrollView contentContainerStyle={{ paddingTop: 54, paddingBottom: 40 }}>
        <GardenGreeting nickname="Freya" now={new Date(2026, 6, 28, 19, 0, 0)} />
        <ContinueReadingBook story={MOON} width={Math.round(width * STORY_GARDEN_SCALE.focusedCoverWidthRatio)}
          pageIndex={3} totalPages={9} language="en" onPress={() => undefined} />
        {STORY_PLACES.map((place) => (
          <StoryShelf key={place.id} place={place} stories={SHELF} containerWidth={width}
            bookWidth={Math.round(width * STORY_GARDEN_SCALE.shelfCoverWidthRatio)}
            bookmarkedStoryId="moon" language="en" onSelectBook={() => undefined} />
        ))}
        <Text style={styles.parent}>Parent corner</Text>
      </ScrollView>
    </LinearGradient>
  );
}

function CropCompare() {
  const { width } = useWindowDimensions();
  const w = Math.round(width * 0.52);
  return (
    <LinearGradient colors={['#4ECDC4', '#3B82F6', '#1E3A8A']} style={StyleSheet.absoluteFill}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 46 }}>
        <Text style={styles.cmpH}>Portrait 3:4, centre-cropped (as built)</Text>
        <View style={[styles.cmpBook, { width: w, height: w / (3 / 4) }]}>
          <Image source={cover} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        </View>
        <Text style={styles.cmpH}>Landscape 4:3, uncropped</Text>
        <View style={[styles.cmpBook, { width: Math.round(width * 0.72), height: Math.round(width * 0.72 * 0.75) }]}>
          <Image source={cover} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        </View>
        <Text style={styles.cmpH}>Portrait 3:4, contain (letterboxed)</Text>
        <View style={[styles.cmpBook, { width: w, height: w / (3 / 4), backgroundColor: 'rgba(0,0,0,.25)' }]}>
          <Image source={cover} style={{ width: '100%', height: '100%' }} contentFit="contain" />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function Reader() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={page1} style={StyleSheet.absoluteFill} contentFit="cover" />
      <PageEdgeNavigation canGoNext canGoPrevious edgesEnabled
        onNext={() => undefined} onPrevious={() => undefined} />
      <View style={styles.narr}>
        <Text style={styles.narrT}>The gate heard two taps, and waited. Freya waited too.</Text>
      </View>
    </View>
  );
}

export function HarnessApp() {
  const scene = useScene();
  const { width } = useWindowDimensions();

  if (scene === 'garden') return <Garden />;
  if (scene === 'crop') return <CropCompare />;
  if (scene === 'reader') return <Reader />;

  if (scene === 'shelf') {
    return (
      <LinearGradient colors={['#4ECDC4', '#3B82F6', '#1E3A8A']} style={StyleSheet.absoluteFill}>
        <View style={{ marginTop: 240 }}>
          <StoryShelf place={getStoryPlace('moonlit-stories')} stories={SHELF} containerWidth={width}
            bookWidth={Math.round(width * STORY_GARDEN_SCALE.shelfCoverWidthRatio)}
            bookmarkedStoryId="moon" language="en" onSelectBook={() => undefined} />
        </View>
      </LinearGradient>
    );
  }

  if (scene === 'focused' || scene === 'focused-voice') {
    return (
      <LinearGradient colors={['#4ECDC4', '#3B82F6', '#1E3A8A']} style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#101B3D', opacity: STORY_GARDEN_SCALE.environmentDim }]} />
        <FocusedBook story={MOON} language="en" reduceMotion
          onChoose={() => undefined} onRecordVoice={() => undefined} onPutBack={() => undefined} />
      </LinearGradient>
    );
  }

  if (scene === 'preopen' || scene === 'escape') {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#101B3D' }]}>
        <BookOpeningBridge story={MOON} phase={scene === 'escape' ? 'bridging' : 'preOpen'}
          showRotationEscape={scene === 'escape'} isLandscape={false} reduceMotion
          onTurnTheScreen={() => undefined} onReadThisWay={() => undefined} />
      </View>
    );
  }

  if (scene === 'closing') {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#101B3D' }]}>
        <BookClosing story={MOON} reduceMotion
          onReadAgain={() => undefined} onPutItBack={() => undefined} />
      </View>
    );
  }

  return <View style={StyleSheet.absoluteFill} />;
}

const styles = StyleSheet.create({
  parent: { color: '#fff', opacity: 0.6, fontSize: 15, textAlign: 'center', marginTop: 12 },
  narr: { position: 'absolute', bottom: 16, alignSelf: 'center', width: '62%',
    backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 12, padding: 10 },
  narrT: { fontSize: 13, color: '#26324f', textAlign: 'center' },
  cmpH: { color: '#fff', fontSize: 13, marginTop: 14, marginBottom: 6 },
  cmpBook: { borderRadius: 12, overflow: 'hidden' },
});
