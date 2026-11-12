import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type LayoutRectangle } from 'react-native';
import { Image } from 'expo-image';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CircleActionButton } from '@/components/child-ui/circle-action-button';
import { GoldButton } from '@/components/child-ui/gold-button';
import { OwlGuide, useGuideLift } from '@/components/owl-guide';
import {
  CIRCLE_BUTTON_DIAMETER_PHONE,
  CIRCLE_BUTTON_DIAMETER_TABLET,
  SPACE_3,
  contentMargin,
  journeyHeaderTop,
} from '@/components/child-ui/tokens';
import { HeroSunContainer } from '@/components/home/hero-sun-container';
import { heroMotionMode } from '@/constants/home-sky';
import type { TimeOfDay } from '@/constants/home-scene';
import { islandMapFor } from '@/constants/island-map';
import { CHECKPOINT_LABEL_CLEARANCE } from '@/constants/island-trail';
import { ISLAND_NIGHT, ISLAND_SKY, islandLayout } from '@/constants/island-scene';
import { chromeOpacity, islandScale, sunRise } from '@/constants/island-voyage';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { useIslandVoyage } from '@/contexts/island-voyage-context';
import { useIslandClocks } from '@/hooks/use-island-clocks';
import { useLearningPlan, type PlanStepView } from '@/hooks/use-learning-plan';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTimeOfDay } from '@/hooks/use-time-of-day';
import type { PlanLaunch } from '@/types/learning-plan';
import { BillowingCloud, DriftingCloud } from './island-clouds';
import { IslandWaterfalls } from './island-falls';
import { IslandGulls } from './island-gulls';
import { IslandLights } from './island-lights';
import { IslandStars } from './island-stars';
import { SwayingTree } from './island-trees';
import { IslandWater } from './island-water';
import { MoonlitImage } from './moonlit-image';
import { PlanCheckpoint } from './plan-checkpoint';
import { PLAN_CARD, PlanPanel, planCardTop, type PlanCardRect } from './plan-panel';
import { PlanTrail } from './plan-trail';
import { RoadmapScene } from './roadmap-scene';
import { ROADMAP, type ScreenRect } from '@/constants/roadmap';
import { motionDuration } from '@/constants/child-ui-motion';

export interface IslandSceneProps {
  isActive?: boolean;
  timeOfDay?: TimeOfDay;
  onStartActivity?: (launch: PlanLaunch) => void;
  onPreviewActivity?: (launch: PlanLaunch, from: PlanCardRect) => void;
  testID?: string;
}

export const IslandScene = memo(function IslandScene({
  isActive = true,
  timeOfDay,
  onStartActivity,
  onPreviewActivity,
  testID = 'island-scene',
}: IslandSceneProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isTablet } = useAccessibility();
  const { phase, arrival, islandReady, comeBack } = useIslandVoyage();
  const arriving = phase === 'crossing' || phase === 'arriving';
  const { isMuted, toggleMute } = useGlobalSound();
  const clockTimeOfDay = useTimeOfDay();
  const reduceMotion = useReducedMotion();
  const settled = useSettledAfterTransition(isActive && !arriving);
  const [loaded, setLoaded] = useState(false);
  const clocks = useIslandClocks(settled && !reduceMotion);
  const map = islandMapFor(isTablet);
  const plan = useLearningPlan(isActive, map.trail);

  const time = timeOfDay ?? clockTimeOfDay;
  const night = time === 'night';
  const layout = useMemo(() => islandLayout({ width, height, topInset: insets.top }, map.art), [width, height, insets.top, map]);
  const riseFrom = layout.riseFrom;

  useEffect(() => {
    if (!loaded || phase !== 'crossing') return undefined;
    let drawn = 0;
    const drawing = requestAnimationFrame(() => {
      drawn = requestAnimationFrame(() => islandReady());
    });
    return () => {
      cancelAnimationFrame(drawing);
      cancelAnimationFrame(drawn);
    };
  }, [loaded, phase, islandReady]);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleSound = useCallback(() => {
    void toggleMute();
  }, [toggleMute]);
  const margin = contentMargin(isTablet);
  const buttonSize = isTablet ? CIRCLE_BUTTON_DIAMETER_TABLET : CIRCLE_BUTTON_DIAMETER_PHONE;
  const chromeTop = journeyHeaderTop(insets.top, isTablet);
  const [mapStep, setMapStep] = useState<PlanStepView | null>(null);
  const [shownStep, setShownStep] = useState<PlanStepView | null>(null);
  if (mapStep && mapStep !== shownStep) setShownStep(mapStep);
  const mapOpen = mapStep !== null;
  const mapLeaving = !mapOpen && shownStep !== null;
  if (!isActive && mapOpen) setMapStep(null);
  const mapFade = useSharedValue(0);
  const titleFade = useSharedValue(0);
  useEffect(() => {
    if (mapOpen) {
      mapFade.value = withTiming(1, { duration: motionDuration(ROADMAP.fade.mapIn, reduceMotion) });
      titleFade.value = withDelay(
        motionDuration(ROADMAP.fade.titleDelay, reduceMotion),
        withTiming(1, { duration: motionDuration(ROADMAP.fade.titleIn, reduceMotion) })
      );
    } else if (mapLeaving) {
      const out = motionDuration(ROADMAP.fade.out, reduceMotion);
      titleFade.value = withTiming(0, { duration: out });
      mapFade.value = withTiming(0, { duration: out }, (finished) => {
        if (finished) runOnJS(setShownStep)(null);
      });
    }
  }, [mapOpen, mapLeaving, reduceMotion, mapFade, titleFade]);
  const mapFadeStyle = useAnimatedStyle(() => ({ opacity: mapFade.value }));
  const titleFadeStyle = useAnimatedStyle(() => ({ opacity: titleFade.value }));
  const [backRect, setBackRect] = useState<LayoutRectangle | null>(null);
  const [againRect, setAgainRect] = useState<LayoutRectangle | null>(null);
  const handleBackLayout = useCallback((event: LayoutChangeEvent) => setBackRect(event.nativeEvent.layout), []);
  const handleAgainLayout = useCallback((event: LayoutChangeEvent) => setAgainRect(event.nativeEvent.layout), []);
  const mapControls = useMemo<ScreenRect[]>(() => {
    const placed = (rect: LayoutRectangle): ScreenRect => ({
      left: margin + Math.round(rect.x),
      top: chromeTop + Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
    return [
      backRect ? placed(backRect) : { left: margin, top: chromeTop, width: buttonSize * ROADMAP.homePillSpan, height: buttonSize },
      ...(againRect ? [placed(againRect)] : []),
      { left: width - margin - buttonSize, top: chromeTop, width: buttonSize, height: buttonSize },
    ];
  }, [backRect, againRect, margin, chromeTop, buttonSize, width]);
  const againSize = isTablet ? ROADMAP.playAgain.tablet : ROADMAP.playAgain.phone;
  const lastStep = plan.steps[plan.steps.length - 1];
  const litLegs = plan.doneCount + (plan.current?.state === 'open' ? 1 : 0);
  const { start } = plan;
  const launchStep = useCallback(
    (view: PlanStepView) => {
      const launch = start(view);
      if (launch) onStartActivity?.(launch);
    },
    [onStartActivity, start]
  );
  const handleStart = useCallback(
    (view: PlanStepView) => {
      if (view.state === 'done' && view.step.id === lastStep?.step.id) {
        setMapStep(view);
        return;
      }
      launchStep(view);
    },
    [launchStep, lastStep]
  );
  const handleCloseMap = useCallback(() => setMapStep(null), []);
  const handlePlayAgain = useCallback(
    (view: PlanStepView) => {
      setMapStep(null);
      launchStep(view);
    },
    [launchStep]
  );

  useEffect(() => {
    if (!mapOpen) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setMapStep(null);
      return true;
    });
    return () => subscription.remove();
  }, [mapOpen]);
  const handlePreview = useCallback(
    (view: PlanStepView, from: PlanCardRect) => {
      const launch = start(view);
      if (launch) onPreviewActivity?.(launch, from);
    },
    [onPreviewActivity, start]
  );
  const [cardHeight, setCardHeight] = useState<number>(isTablet ? PLAN_CARD.tabletHeight : PLAN_CARD.phoneHeight);
  const labelFloor = planCardTop(height, insets.bottom, cardHeight) - CHECKPOINT_LABEL_CLEARANCE;

  const planLift = useGuideLift();
  const checkpointRef = useRef<View>(null);
  const cardRef = useRef<View>(null);
  const homeRef = useRef<View>(null);
  const todayId = plan.current?.state === 'open' ? plan.current.step.id : undefined;
  const todayOpen = todayId !== undefined;
  const tourTargets = useMemo(
    () => ({
      ...(todayOpen ? { island_checkpoint: checkpointRef } : {}),
      island_plan_card: cardRef,
      island_home: homeRef,
    }),
    [todayOpen]
  );

  const hiddenUnderMap = {
    importantForAccessibility: mapOpen ? ('no-hide-descendants' as const) : ('auto' as const),
    accessibilityElementsHidden: mapOpen,
  };

  const stage = useAnimatedStyle(() => ({ transform: [{ scale: islandScale(arrival.value) }] }));
  const rise = useAnimatedStyle(() => ({ transform: [{ translateY: sunRise(arrival.value, riseFrom) }] }));
  const chrome = useAnimatedStyle(() => ({ opacity: chromeOpacity(arrival.value) }));

  return (
    <View testID={testID} style={[styles.root, { backgroundColor: night ? ISLAND_NIGHT.tint : ISLAND_SKY }]}>
      <Animated.View testID="island-stage" style={[styles.fill, stage]} {...hiddenUnderMap}>
        <Image
          testID="island-picture"
          source={map.art.picture}
          style={[styles.layer, layout.picture]}
          contentFit="fill"
          transition={0}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('island.scene')}
          onLoad={handleLoad}
        />

        <IslandWater art={map.art} layout={layout} ripple={clocks.ripple} />
        <IslandWaterfalls art={map.art} layout={layout} clock={clocks.fall} />
        {map.art.lowTrees.map((tree, index) => (
          <SwayingTree key={tree.id} tree={tree} layout={layout} wind={clocks.wind} index={index} />
        ))}
        {map.art.farClouds.map((cloud) => (
          <DriftingCloud key={cloud.id} cloud={cloud} layout={layout} tide={clocks.tide} />
        ))}
        {map.art.billows.map((billow, index) => (
          <BillowingCloud key={billow.id} billow={billow} layout={layout} tide={clocks.tide} index={index} />
        ))}

        {night ? (
          <View
            testID="island-night"
            pointerEvents="none"
            style={[styles.layer, layout.picture, { backgroundColor: ISLAND_NIGHT.tint, opacity: ISLAND_NIGHT.strength }]}
          />
        ) : null}
        {night ? <IslandStars art={map.art} layout={layout} lamp={clocks.lamp} /> : null}

        <View
          testID="island-sun-clip"
          pointerEvents="box-none"
          style={[styles.clip, { width, height: layout.clipHeight }]}
        >
          <Animated.View testID="island-sun-rise" pointerEvents="box-none" style={[styles.fill, rise]}>
            <HeroSunContainer
              sun={layout.sun}
              timeOfDay={time}
              mode={heroMotionMode(settled, reduceMotion)}
              animated={isActive}
            />
          </Animated.View>
        </View>

        {map.art.nearClouds.map((cloud) => (
          <DriftingCloud key={cloud.id} cloud={cloud} layout={layout} tide={clocks.tide} night={night} />
        ))}
        <MoonlitImage testID="island-horizon" source={map.art.horizon} frame={layout.band} night={night} />
        {map.art.horizonTrees.map((tree, index) => (
          <SwayingTree
            key={tree.id}
            tree={tree}
            layout={layout}
            wind={clocks.wind}
            index={map.art.lowTrees.length + index}
            night={night}
          />
        ))}
        {night ? (
          <IslandLights art={map.art} layout={layout} lamp={clocks.lamp} />
        ) : (
          <IslandGulls courses={map.gulls} layout={layout} sky={clocks.sky} beat={clocks.beat} />
        )}

        <PlanTrail map={map} layout={layout} litLegs={litLegs} />
        {plan.steps.map((view) => (
          <PlanCheckpoint
            key={view.step.id}
            view={view}
            layout={layout}
            screenWidth={width}
            screenHeight={height}
            onPress={handleStart}
            pulse={clocks.wind}
            labelFloor={labelFloor}
            markerRef={view.step.id === todayId ? checkpointRef : undefined}
          />
        ))}
      </Animated.View>

      <Animated.View
        testID="island-plan-panel"
        pointerEvents="box-none"
        style={[styles.fill, chrome, planLift.style]}
        {...hiddenUnderMap}
      >
        <PlanPanel
          current={plan.current}
          total={plan.steps.length}
          doneCount={plan.doneCount}
          bottomInset={insets.bottom}
          screenWidth={width}
          screenHeight={height}
          onStart={handleStart}
          onPreview={onPreviewActivity ? handlePreview : undefined}
          onHeight={setCardHeight}
          cardRef={cardRef}
        />
      </Animated.View>

      <Animated.View
        testID="island-chrome"
        style={[
          styles.chrome,
          {
            top: chromeTop,
            left: margin,
            right: margin,
            height: buttonSize,
          },
          chrome,
        ]}
        {...hiddenUnderMap}
      >
        <View ref={homeRef} collapsable={false}>
          <CircleActionButton
            type="home"
            testID="island-home-button"
            label={t('common.home')}
            onPress={comeBack}
            accessibilityLabel={t('common.home')}
          />
        </View>
        <CircleActionButton
          type="audio"
          testID="island-sound-button"
          muted={isMuted}
          onPress={handleSound}
          accessibilityLabel={t('catalogue.sound')}
        />
      </Animated.View>

      {shownStep ? (
        <Animated.View
          testID="island-roadmap"
          style={[styles.fill, mapFadeStyle]}
          pointerEvents={mapOpen ? 'auto' : 'none'}
          accessibilityViewIsModal={mapOpen}
        >
          <RoadmapScene controls={mapControls} titleStyle={titleFadeStyle} />
          <View testID="roadmap-chrome" style={[styles.chrome, { top: chromeTop, left: margin, right: margin, height: buttonSize }]}>
            <View style={styles.mapLead}>
              <View onLayout={handleBackLayout}>
                <CircleActionButton
                  type="back"
                  testID="roadmap-back-button"
                  label={t('common.back')}
                  onPress={handleCloseMap}
                  accessibilityLabel={t('common.back')}
                />
              </View>
              <View onLayout={handleAgainLayout}>
                <GoldButton
                  testID="roadmap-play-again"
                  label={t('roadmap.playAgain')}
                  icon="refresh"
                  onPress={() => handlePlayAgain(shownStep)}
                  height={buttonSize}
                  balanced={false}
                  fontSize={againSize.fontSize}
                  iconSize={againSize.iconSize}
                  paddingHorizontal={againSize.padding}
                />
              </View>
            </View>
            <CircleActionButton
              type="audio"
              testID="roadmap-sound-button"
              muted={isMuted}
              onPress={handleSound}
              accessibilityLabel={t('catalogue.sound')}
            />
          </View>
        </Animated.View>
      ) : null}

      <OwlGuide id="island_tour" active={settled && !mapOpen} targets={tourTargets} scroller={planLift.scroller} />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  layer: {
    position: 'absolute',
  },
  clip: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  chrome: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_3,
  },
});
