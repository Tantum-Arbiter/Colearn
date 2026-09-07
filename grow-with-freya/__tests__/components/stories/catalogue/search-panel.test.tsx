/**
 * Tests for the search panel.
 *
 * The panel shows one of three things under the field: the searches the child
 * made before, the books that answer what they are typing now, or the fact
 * that nothing does. Which one is on screen is the whole behaviour.
 */

import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { SearchPanel } from '@/components/stories/catalogue/search-panel';
import type { CatalogueStory } from '@/components/stories/catalogue/catalogue-story';
import type { LocalizedText } from '@/types/story';

function story(id: string, title: LocalizedText, description?: LocalizedText): CatalogueStory {
  return {
    id,
    title,
    description,
    coverArtwork: undefined,
    category: 'bedtime',
    theme: [],
    progress: null,
    locked: false,
    audioAvailable: false,
    interactive: false,
    learningGame: false,
    music: false,
    free: true,
    shareToUnlock: false,
    source: { kind: 'remote', entry: { storyId: id } as never },
  } as CatalogueStory;
}

const SHELF = [
  story('wombat', { en: 'Snuggle Little Wombat' }, { en: 'A sleepy burrow.' }),
  story('moon', { en: 'The Moon Is Sleepy' }),
];

// A Pressable carries its testID on more than one node, so these assert that
// something is on screen or is not, the way the other child-ui tests do,
// rather than counting the nodes it happens to render as.
function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

function shown(tree: ReturnType<typeof render>, testID: string): boolean {
  return byTestId(tree, testID).length > 0;
}

function renderPanel(props: Partial<React.ComponentProps<typeof SearchPanel>> = {}) {
  return render(
    <SearchPanel
      stories={SHELF}
      query=""
      onQueryChange={jest.fn()}
      recentSearches={[]}
      onClearRecent={jest.fn()}
      onSearchSettled={jest.fn()}
      language="en"
      renderCard={(entry) => <Text key={entry.id} testID={`card-${entry.id}`}>{entry.id}</Text>}
      {...props}
    />
  );
}

describe('SearchPanel', () => {
  describe('before anything is typed', () => {
    it('offers back what was searched before, under a heading of its own', () => {
      const tree = renderPanel({ recentSearches: ['wombat', 'moon'] });

      expect(shown(tree, 'search-panel-recent')).toBe(true);
      expect(shown(tree, 'search-panel-recent-wombat')).toBe(true);
      expect(shown(tree, 'search-panel-recent-moon')).toBe(true);
    });

    it('shows no history at all on a first visit', () => {
      const tree = renderPanel({ recentSearches: [] });

      expect(shown(tree, 'search-panel-recent')).toBe(false);
    });

    it('says nothing about results, having been asked nothing', () => {
      const tree = renderPanel({ recentSearches: ['wombat'] });

      expect(shown(tree, 'search-panel-empty')).toBe(false);
      expect(shown(tree, 'search-panel-results')).toBe(false);
    });

    it('runs a remembered search again when it is tapped', () => {
      const onQueryChange = jest.fn();
      const onSearchSettled = jest.fn();
      const tree = renderPanel({ recentSearches: ['wombat'], onQueryChange, onSearchSettled });

      fireEvent.press(byTestId(tree, 'search-panel-recent-wombat')[0]);

      expect(onQueryChange).toHaveBeenCalledWith('wombat');
      expect(onSearchSettled).toHaveBeenCalledWith('wombat');
    });
  });

  describe('as the child types', () => {
    it('answers with the books that match', () => {
      const tree = renderPanel({ query: 'wombat' });

      expect(shown(tree, 'search-panel-results')).toBe(true);
      expect(shown(tree, 'card-wombat')).toBe(true);
      expect(shown(tree, 'card-moon')).toBe(false);
    });

    it('matches a description, not only a title', () => {
      const tree = renderPanel({ query: 'burrow' });

      expect(shown(tree, 'card-wombat')).toBe(true);
    });

    it('says so when nothing on the device or in the catalogue matches', () => {
      const tree = renderPanel({ query: 'dinosaur' });

      expect(shown(tree, 'search-panel-empty')).toBe(true);
      expect(shown(tree, 'search-panel-results')).toBe(false);
    });

    it('puts the history away, so results are the only answer on screen', () => {
      const tree = renderPanel({ query: 'wombat', recentSearches: ['moon'] });

      expect(shown(tree, 'search-panel-recent')).toBe(false);
    });

    it('holds off until enough has been typed to mean something', () => {
      const tree = renderPanel({ query: 'w', recentSearches: ['moon'] });

      expect(shown(tree, 'search-panel-results')).toBe(false);
      expect(shown(tree, 'search-panel-empty')).toBe(false);
      expect(shown(tree, 'search-panel-recent')).toBe(true);
    });

    it('reports every keystroke, so the answer keeps up', () => {
      const onQueryChange = jest.fn();
      const tree = renderPanel({ onQueryChange });

      fireEvent.changeText(byTestId(tree, 'search-panel-input')[0], 'wom');

      expect(onQueryChange).toHaveBeenCalledWith('wom');
    });

    it('keeps a search only once it has been submitted', () => {
      const onSearchSettled = jest.fn();
      const tree = renderPanel({ query: 'wombat', onSearchSettled });

      expect(onSearchSettled).not.toHaveBeenCalled();

      fireEvent(byTestId(tree, 'search-panel-input')[0], 'submitEditing');

      expect(onSearchSettled).toHaveBeenCalledWith('wombat');
    });
  });

  describe('clearing', () => {
    it('offers to empty the field only once there is something in it', () => {
      expect(shown(renderPanel({ query: '' }), 'search-panel-clear')).toBe(false);
      expect(shown(renderPanel({ query: 'wo' }), 'search-panel-clear')).toBe(true);
    });

    it('empties the field when asked', () => {
      const onQueryChange = jest.fn();
      const tree = renderPanel({ query: 'wombat', onQueryChange });

      fireEvent.press(byTestId(tree, 'search-panel-clear')[0]);

      expect(onQueryChange).toHaveBeenCalledWith('');
    });

    it('forgets the history when asked', () => {
      const onClearRecent = jest.fn();
      const tree = renderPanel({ recentSearches: ['wombat'], onClearRecent });

      fireEvent.press(byTestId(tree, 'search-panel-recent-heading-action')[0]);

      expect(onClearRecent).toHaveBeenCalled();
    });
  });
});
