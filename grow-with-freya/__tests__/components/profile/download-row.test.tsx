/**
 * One downloaded book on the Profile page's shelf. The row is two controls,
 * not one: the book itself opens to be read, and a separate trash asks for it
 * to be removed -- a child sweeping down the list must never delete by
 * mis-tapping the thing they meant to open.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DownloadRow } from '@/components/profile/download-row';
import type { Story } from '@/types/story';

const story = (overrides: Partial<Story> = {}): Story => ({
  id: 'moon-bear',
  title: 'Moon Bear',
  localizedTitle: { en: 'Moon Bear', fr: 'Ours de Lune' },
  category: 'bedtime',
  isAvailable: true,
  duration: 7,
  pages: [{} as never, {} as never, {} as never],
  ...overrides,
});

function control(tree: ReturnType<typeof render>, testID: string) {
  const node = tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID)[0];
  expect(node).toBeTruthy();
  return node;
}

function textsIn(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root
    .findAll((n: any) => typeof n.props.children === 'string')
    .map((n: any) => n.props.children);
}

describe('DownloadRow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('titles the row in the reading language', () => {
    const underTest = render(
      <DownloadRow story={story()} language="fr" onOpen={jest.fn()} onDelete={jest.fn()} />,
    );

    expect(textsIn(underTest)).toContain('Ours de Lune');
  });

  it('falls back to the English title when the language has no translation', () => {
    const underTest = render(
      <DownloadRow story={story()} language="ja" onOpen={jest.fn()} onDelete={jest.fn()} />,
    );

    expect(textsIn(underTest)).toContain('Moon Bear');
  });

  it('opens the book when the row itself is tapped', () => {
    const onOpen = jest.fn();
    const underTest = render(
      <DownloadRow story={story()} language="en" onOpen={onOpen} onDelete={jest.fn()} />,
    );

    fireEvent.press(control(underTest, 'download-row-moon-bear'));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0]).toEqual(story());
  });

  it('asks for removal through its own control, not the row', () => {
    const onOpen = jest.fn();
    const onDelete = jest.fn();
    const underTest = render(
      <DownloadRow story={story()} language="en" onOpen={onOpen} onDelete={onDelete} />,
    );

    fireEvent.press(control(underTest, 'download-row-delete-moon-bear'));

    expect(onDelete).toHaveBeenCalledWith(story());
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('names both controls for a screen reader', () => {
    const underTest = render(
      <DownloadRow story={story()} language="en" onOpen={jest.fn()} onDelete={jest.fn()} />,
    );

    expect(control(underTest, 'download-row-moon-bear').props.accessibilityLabel).toBe('Moon Bear');
    expect(control(underTest, 'download-row-delete-moon-bear').props.accessibilityLabel)
      .toBe('storyPreview.removeFromDevice');
  });

  it('says how long the book is and how many pages it runs to', () => {
    const underTest = render(
      <DownloadRow story={story()} language="en" onOpen={jest.fn()} onDelete={jest.fn()} />,
    );

    expect(textsIn(underTest)).toContain('profile.downloadMeta (minutes:7, pages:3)');
  });

  /** A catalogue entry can arrive with neither, and an empty dot is noise. */
  it('draws no meta line at all when the book carries no duration or pages', () => {
    const underTest = render(
      <DownloadRow
        story={story({ duration: undefined, pages: undefined })}
        language="en"
        onOpen={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(
      underTest.UNSAFE_root.findAll((n: any) => n.props.testID === 'download-row-meta-moon-bear'),
    ).toHaveLength(0);
  });

  it('leaves an unreadable book unopenable rather than opening to nothing', () => {
    const onOpen = jest.fn();
    const underTest = render(
      <DownloadRow
        story={story({ isAvailable: false })}
        language="en"
        onOpen={onOpen}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(control(underTest, 'download-row-moon-bear'));

    expect(onOpen).not.toHaveBeenCalled();
  });

  it('still lets an unreadable book be removed', () => {
    const onDelete = jest.fn();
    const underTest = render(
      <DownloadRow
        story={story({ isAvailable: false })}
        language="en"
        onOpen={jest.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.press(control(underTest, 'download-row-delete-moon-bear'));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
