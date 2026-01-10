import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, InteractionManager } from 'react-native';
import { SpotlightOverlay, TutorialStep, SpotlightTarget } from './spotlight-overlay';
import { getTutorialSteps } from './tutorial-content';
import { useTutorial, TutorialId } from '@/contexts/tutorial-context';
import { Logger } from '@/utils/logger';

const log = Logger.create('TutorialOverlay');

interface TutorialOverlayProps {
  tutorialId: TutorialId;
  /**
   * Map of step IDs to refs of elements to spotlight
   * Example: { 'stories_button': storiesButtonRef }
   */
  targetRefs?: Record<string, React.RefObject<View | null>>;
  /**
   * Called when tutorial starts
   */
  onStart?: () => void;
  /**
   * Called when tutorial completes or is skipped
   */
  onEnd?: () => void;
}

/**
 * TutorialOverlay - Wrapper component that manages a specific tutorial
 * 
 * Usage:
 * ```tsx
 * <TutorialOverlay 
 *   tutorialId="main_menu_tour"
 *   targetRefs={{
 *     'stories_button': storiesButtonRef,
 *     'emotions_button': emotionsButtonRef,
 *   }}
 * />
 * ```
 */
export function TutorialOverlay({ 
  tutorialId, 
  targetRefs = {},
  onStart,
  onEnd,
}: TutorialOverlayProps) {
  const { 
    activeTutorial, 
    currentStep, 
    nextStep, 
    previousStep, 
    skipTutorial, 
    completeTutorial,
    startTutorial,
    shouldShowTutorial,
    isLoaded,
  } = useTutorial();

  const [targetMeasurements, setTargetMeasurements] = useState<Record<string, SpotlightTarget>>({});
  const [isMeasurementReady, setIsMeasurementReady] = useState(false);
  const [hasShownOverlay, setHasShownOverlay] = useState(false);
  const hasStarted = useRef(false);
  const hasInitialMeasurement = useRef(false);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get steps for this tutorial - memoized to prevent recalculation
  const steps = useMemo(() => getTutorialSteps(tutorialId), [tutorialId]);
  const isActive = activeTutorial === tutorialId;

  // Auto-start tutorial if should show - runs only once per mount
  useEffect(() => {
    // Skip if already started or if another tutorial is active
    if (hasStarted.current || activeTutorial !== null) {
      return;
    }

    // Clear any existing timeout
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }

    if (isLoaded && shouldShowTutorial(tutorialId)) {
      // Set flag immediately to prevent multiple starts
      hasStarted.current = true;

      // 1 second delay to let layout and initial animations settle
      startTimeoutRef.current = setTimeout(() => {
        startTutorial(tutorialId);
        onStart?.();
        log.debug(`Auto-started tutorial: ${tutorialId}`);
      }, 1000);
    }

    return () => {
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
    };
  }, [isLoaded, tutorialId, shouldShowTutorial, startTutorial, onStart, activeTutorial]);



  // Measure target elements when tutorial becomes active or step changes
  // Uses InteractionManager to wait for animations to complete
  useEffect(() => {
    if (!isActive) {
      setIsMeasurementReady(false);
      hasInitialMeasurement.current = false;
      return;
    }

    let isCancelled = false;

    // Wait for any ongoing interactions/animations to complete
    const handle = InteractionManager.runAfterInteractions(() => {
      if (isCancelled) return;

      const measureTargets = () => {
        const measurements: Record<string, SpotlightTarget> = {};
        const entries = Object.entries(targetRefs);
        let measureCount = 0;

        if (entries.length === 0) {
          setTargetMeasurements({});
          if (!hasInitialMeasurement.current) {
            hasInitialMeasurement.current = true;
            setIsMeasurementReady(true);
          }
          return;
        }

        entries.forEach(([stepId, ref]) => {
          if (ref.current && 'measureInWindow' in ref.current) {
            // measureInWindow is more reliable and doesn't require findNodeHandle
            (ref.current as View).measureInWindow((x, y, width, height) => {
              if (!isCancelled && width > 0 && height > 0) {
                measurements[stepId] = { x, y, width, height };
                log.debug(`Measured ${stepId}: x=${x}, y=${y}, w=${width}, h=${height}`);
              }
              measureCount++;
              if (measureCount === entries.length && !isCancelled) {
                setTargetMeasurements(measurements);
                // Only set measurement ready on first measurement, not step changes
                if (!hasInitialMeasurement.current) {
                  hasInitialMeasurement.current = true;
                  setIsMeasurementReady(true);
                }
                log.debug('Measured tutorial targets:', Object.keys(measurements));
              }
            });
          } else {
            measureCount++;
            if (measureCount === entries.length && !isCancelled) {
              setTargetMeasurements(measurements);
              if (!hasInitialMeasurement.current) {
                hasInitialMeasurement.current = true;
                setIsMeasurementReady(true);
              }
            }
          }
        });
      };

      // Small delay for layout to stabilize
      setTimeout(measureTargets, 100);
    });

    return () => {
      isCancelled = true;
      handle.cancel();
    };
  }, [isActive, targetRefs, currentStep]); // Re-measure on step change

  const handleComplete = useCallback(() => {
    completeTutorial();
    onEnd?.();
  }, [completeTutorial, onEnd]);

  const handleSkip = useCallback(() => {
    skipTutorial();
    onEnd?.();
  }, [skipTutorial, onEnd]);

  if (!isActive || steps.length === 0) {
    return null;
  }

  // Get current step with target measurement
  const currentStepData = steps[currentStep];
  if (!currentStepData) {
    return null;
  }

  const currentTarget = targetMeasurements[currentStepData.id];

  // Check if this step has a targetRef but measurement isn't available yet
  const stepHasTargetRef = currentStepData.id in targetRefs;
  const isReady = isMeasurementReady && (!stepHasTargetRef || currentTarget);

  // Don't render until we have all measurements ready
  // This prevents the overlay from mounting, animating, then repositioning
  if (!isReady) {
    return null;
  }

  // Mark that we've shown the overlay (for skipping animation on remounts)
  if (!hasShownOverlay) {
    // Use setTimeout to avoid state update during render
    setTimeout(() => setHasShownOverlay(true), 0);
  }

  const stepWithTarget: TutorialStep = {
    ...currentStepData,
    target: currentTarget,
  };

  return (
    <SpotlightOverlay
      visible={true}
      step={stepWithTarget}
      currentStepIndex={currentStep}
      totalSteps={steps.length}
      onNext={nextStep}
      onPrevious={previousStep}
      onSkip={handleSkip}
      onComplete={handleComplete}
      skipAnimation={hasShownOverlay}
    />
  );
}

