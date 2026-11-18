import type { Choice } from '@/components/experience/engines/choose/choose-engine';
import type { SupportedLanguage } from '@/services/i18n';
import type { MissionGesture } from '@/types/game-pack';
import type { PlanAgeRange } from '@/types/learning-plan';
import { sceneMode, type SceneMode } from '@/components/experience/engines/scene/scene-layout';
import { getLocalizedText, type AgeGroup, type AgeGroupText, type ChallengeHotspot, type ChallengeItem, type ChallengeStateAfter, type LearningChallenge } from '@/types/story';

export interface ChoiceView extends Choice {
  successLine?: string;
  stateAfter?: ChallengeStateAfter;
  tips?: string[];
}

export interface SpotView {
  id: string;
  label: string;
  hotspot: ChallengeHotspot;
  successLine?: string;
  stateAfter?: ChallengeStateAfter;
}

export interface ChallengeView {
  title: string;
  setupLine: string;
  instruction: string;
  successLine: string;
  onSkip: string;
  parentPrompt: string;
  hints: string[];
  choices: ChoiceView[];
  spots: SpotView[];
  mode: SceneMode;
  target: string;
  gesture: MissionGesture;
}

function line(text: AgeGroupText, language: SupportedLanguage, ageGroup: AgeGroup): string {
  return getLocalizedText(undefined, '', language, text, ageGroup);
}

export function challengeView(challenge: LearningChallenge, band: PlanAgeRange, language: SupportedLanguage, ageGroup: AgeGroup): ChallengeView {
  const forBand = challenge.byAge[band];
  const wanted = forBand?.items ?? challenge.items.map((item) => item.id);
  const items = wanted.map((id) => challenge.items.find((item) => item.id === id)).filter((item): item is ChallengeItem => item !== undefined);
  const choices = items.flatMap((item) => {
    if (item.image === undefined) return [];
    const choice: ChoiceView = { id: item.id, image: item.image, label: getLocalizedText(item.label, item.id, language) };
    if (item.outcome?.successLine) choice.successLine = line(item.outcome.successLine, language, ageGroup);
    if (item.outcome?.stateAfter) choice.stateAfter = item.outcome.stateAfter;
    if (item.outcome?.tips?.length) choice.tips = item.outcome.tips.map((tip) => line(tip, language, ageGroup));
    return [choice];
  });
  const spots = items.flatMap((item) => {
    if (!item.hotspot) return [];
    const spot: SpotView = { id: item.id, label: getLocalizedText(item.label, item.id, language), hotspot: item.hotspot };
    if (item.outcome?.successLine) spot.successLine = line(item.outcome.successLine, language, ageGroup);
    if (item.outcome?.stateAfter) spot.stateAfter = item.outcome.stateAfter;
    return [spot];
  });

  return {
    title: line(challenge.copy.title, language, ageGroup),
    setupLine: line(challenge.copy.setupLine, language, ageGroup),
    instruction: line(challenge.copy.instruction, language, ageGroup),
    successLine: line(challenge.copy.successLine, language, ageGroup),
    onSkip: line(challenge.copy.onSkip, language, ageGroup),
    parentPrompt: line(challenge.copy.parentPrompt, language, ageGroup),
    hints: challenge.copy.hints.map((hint) => line(hint, language, ageGroup)),
    choices,
    spots,
    mode: sceneMode(challenge.adapter),
    target: items.some((item) => item.id === challenge.target) ? challenge.target : '',
    gesture: forBand?.gesture ?? 'tap',
  };
}
