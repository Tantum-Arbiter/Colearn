import type { LearningChallenge, StoryPage } from '@/types/story';

export function challengeAssetPaths(challenge: LearningChallenge | undefined): string[] {
  if (!challenge) return [];
  const paths: (string | number | undefined)[] = [];
  for (const item of challenge.items) {
    paths.push(item.image);
    if (item.outcome?.stateAfter) paths.push(item.outcome.stateAfter.image);
  }
  if (challenge.stateAfter) paths.push(challenge.stateAfter.image);
  return paths.filter((path): path is string => typeof path === 'string' && path !== '');
}

export function pageAssetPaths(page: StoryPage): string[] {
  const paths: string[] = [];
  if (typeof page.backgroundImage === 'string') paths.push(page.backgroundImage);
  if (typeof page.characterImage === 'string') paths.push(page.characterImage);
  for (const element of page.interactiveElements ?? []) {
    if (typeof element.image === 'string') paths.push(element.image);
  }
  return [...paths, ...challengeAssetPaths(page.learningChallenge)];
}

export async function withResolvedChallengeAssets(challenge: LearningChallenge, resolve: (path: string) => Promise<string>): Promise<LearningChallenge> {
  const resolveImage = async (image: string | number) => (typeof image === 'string' ? resolve(image) : image);
  const items = await Promise.all(
    challenge.items.map(async (item) => ({
      ...item,
      ...(item.image === undefined ? {} : { image: await resolveImage(item.image) }),
      outcome: item.outcome?.stateAfter ? { ...item.outcome, stateAfter: { ...item.outcome.stateAfter, image: await resolveImage(item.outcome.stateAfter.image) } } : item.outcome,
    }))
  );
  const stateAfter = challenge.stateAfter ? { ...challenge.stateAfter, image: await resolveImage(challenge.stateAfter.image) } : challenge.stateAfter;
  return { ...challenge, items, stateAfter };
}
