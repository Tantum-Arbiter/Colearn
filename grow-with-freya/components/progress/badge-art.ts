import type { BadgeRecommendation } from './progress-model';

export const ART = {
  sun: require('@/assets/images/ui-elements/home-sun.webp'),
  sunLaughing: require('@/assets/images/ui-elements/home-sun-laughing.webp'),
  moon: require('@/assets/images/ui-elements/home-moon.webp'),
  moonLaughing: require('@/assets/images/ui-elements/home-moon-laughing.webp'),
  cloudLeft: require('@/assets/images/ui-elements/night-cloud-left.webp'),
  cloudRight: require('@/assets/images/ui-elements/night-cloud-right.webp'),
  bearHappy: require('@/assets/images/emotions/bear-happy.webp'),
  bearExcited: require('@/assets/images/emotions/bear-excited.webp'),
  bearProud: require('@/assets/images/emotions/bear-proud.webp'),
  bearSurprised: require('@/assets/images/emotions/bear-surprised.webp'),
  animalLoving: require('@/assets/images/emotions/animal-loving.webp'),
  animalHappy: require('@/assets/images/emotions/animal-happy.webp'),
  animalExcited: require('@/assets/images/emotions/animal-excited.webp'),
  animalProud: require('@/assets/images/emotions/animal-proud.webp'),
  animalSurprised: require('@/assets/images/emotions/animal-surprised.webp'),
} as const;

export type BadgeArtKey = keyof typeof ART;

export const RECOMMEND = {
  together: { labelKey: 'progress.recommendations.together', tag: null },
  discover: { labelKey: 'progress.recommendations.discover', tag: null },
  calming: { labelKey: 'progress.recommendations.calming', tag: 'calming' },
  kindness: { labelKey: 'progress.recommendations.kindness', tag: 'friendship' },
  bedtime: { labelKey: 'progress.recommendations.bedtime', tag: 'bedtime' },
  adventure: { labelKey: 'progress.recommendations.adventure', tag: 'adventure' },
} as const satisfies Record<string, BadgeRecommendation>;
