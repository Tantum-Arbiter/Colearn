/**
 * Utility functions for managing story assets and generating asset paths
 * This helps maintain consistency between local development and CMS integration
 */

export interface StoryAssetPaths {
  cover: {
    thumbnail: string;
    large: string;
  };
  characters: string[];
  props: string[];
  pages: {
    [pageNumber: number]: {
      background: string;
      foreground?: string;
      elements?: string[];
    };
  };
}

/**
 * Generate asset paths for a story based on its ID
 */
export function generateStoryAssetPaths(storyId: string): StoryAssetPaths {
  const basePath = `assets/stories/${storyId}`;
  
  return {
    cover: {
      thumbnail: `${basePath}/cover/thumbnail.webp`,
      large: `${basePath}/cover/cover-large.webp`,
    },
    characters: [
      `${basePath}/characters/main-character.webp`,
      // Add more character paths as needed
    ],
    props: [
      // Props will be added dynamically based on story requirements
    ],
    pages: Array.from({ length: 8 }, (_, i) => i + 1).reduce((acc, pageNum) => {
      acc[pageNum] = {
        background: `${basePath}/page-${pageNum}/background.webp`,
        foreground: `${basePath}/page-${pageNum}/foreground.webp`, // Optional
      };
      return acc;
    }, {} as any),
  };
}

/**
 * Get the cover image path for a story
 */
export function getStoryCoverPath(storyId: string, size: 'thumbnail' | 'large' = 'thumbnail'): string {
  return `assets/stories/${storyId}/cover/${size === 'thumbnail' ? 'thumbnail' : 'cover-large'}.webp`;
}

/**
 * Get the background image path for a specific page
 */
export function getPageBackgroundPath(storyId: string, pageNumber: number): string {
  return `assets/stories/${storyId}/page-${pageNumber}/background.webp`;
}

/**
 * Get character image path
 */
export function getCharacterPath(storyId: string, characterName: string): string {
  return `assets/stories/${storyId}/characters/${characterName}.webp`;
}

/**
 * Get prop image path
 */
export function getPropPath(storyId: string, propName: string): string {
  return `assets/stories/${storyId}/props/${propName}.webp`;
}

/**
 * Validate that all required assets exist for a story
 * This can be used during development to check asset completeness
 */
export function validateStoryAssets(storyId: string, requiredAssets: {
  characters: string[];
  props: string[];
  hasAllPages: boolean;
}): { isValid: boolean; missingAssets: string[] } {
  const missingAssets: string[] = [];
  
  // Check cover images
  const coverPaths = [
    getStoryCoverPath(storyId, 'thumbnail'),
    getStoryCoverPath(storyId, 'large'),
  ];
  
  // Check page backgrounds
  if (requiredAssets.hasAllPages) {
    for (let i = 1; i <= 8; i++) {
      const backgroundPath = getPageBackgroundPath(storyId, i);
      // In a real implementation, you'd check if the file exists
      // For now, we'll assume they should exist
    }
  }
  
  // Check characters
  requiredAssets.characters.forEach(characterName => {
    const characterPath = getCharacterPath(storyId, characterName);
    // Check if character file exists
  });
  
  // Check props
  requiredAssets.props.forEach(propName => {
    const propPath = getPropPath(storyId, propName);
    // Check if prop file exists
  });
  
  return {
    isValid: missingAssets.length === 0,
    missingAssets,
  };
}

/**
 * Generate a complete story data structure with asset paths
 */
export function generateStoryWithAssets(
  storyId: string,
  storyData: {
    title: string;
    category: string;
    description: string;
    pages: Array<{
      pageNumber: number;
      text: string;
      characterName?: string;
      props?: string[];
    }>;
  }
) {
  return {
    id: storyId,
    title: storyData.title,
    category: storyData.category,
    coverImage: getStoryCoverPath(storyId, 'thumbnail'),
    description: storyData.description,
    pages: storyData.pages.map(page => ({
      id: `${storyId}-${page.pageNumber}`,
      pageNumber: page.pageNumber,
      backgroundImage: getPageBackgroundPath(storyId, page.pageNumber),
      characterImage: page.characterName ? getCharacterPath(storyId, page.characterName) : undefined,
      text: page.text,
    })),
    assets: generateStoryAssetPaths(storyId),
  };
}
