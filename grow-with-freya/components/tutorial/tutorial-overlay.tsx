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
  const hasStarted = useRef(false);
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

      // Small delay to let layout settle
      startTimeoutRef.current = setTimeout(() => {
        startTutorial(tutorialId);
        onStart?.();
        log.debug(`Auto-started tutorial: ${tutorialId}`);
      }, 500);
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
    if (!isActive) return;

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
                log.debug('Measured tutorial targets:', Object.keys(measurements));
              }
            });
          } else {
            measureCount++;
            if (measureCount === entries.length && !isCancelled) {
              setTargetMeasurements(measurements);
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

  const stepWithTarget: TutorialStep = {
    ...currentStepData,
    target: targetMeasurements[currentStepData.id],
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
    />
  );
}

