export type AdventureCategory = 'at-home' | 'outdoors' | 'creative';

export interface RealWorldAdventure {
  category: AdventureCategory;
  descriptionKey: string;
}
