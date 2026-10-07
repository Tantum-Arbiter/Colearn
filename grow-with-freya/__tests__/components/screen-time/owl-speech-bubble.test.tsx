/**
 * The owl's line writes itself out rather than fading in as a block -- a
 * quick game-dialogue reveal. It has to stay quick (a page most children
 * tap straight through), and it must never hide the real words from
 * anything reading the tree while it builds up to them.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

import { OwlSpeechBubble, typewriterDurationMs, TYPEWRITER_TICK_MS } from '@/components/screen-time/owl-speech-bubble';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

const mockReducedMotion = jest.fn(() => false);
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

const BODY = 'Let’s take a quick tour to help you get the most out of storytime.';

function findByTestId(tree: ReturnType<typeof render>, testID: string): any[] {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

function visibleBody(tree: ReturnType<typeof render>): string {
  const node = findByTestId(tree, 'bubble-body')[0];
  return typeof node.props.children === 'string' ? node.props.children : '';
}

function json(tree: ReturnType<typeof render>) {
  return JSON.stringify(tree.toJSON());
}

/** The write-out's own duration lands on a tick boundary that does not
 *  always coincide with the exact millisecond the line finishes on, so the
 *  last letter can trail by up to one tick -- imperceptible to a person,
 *  but worth a tick of slack here rather than an exact-millisecond test. */
function finishDuration(length: number): number {
  return typewriterDurationMs(length) + TYPEWRITER_TICK_MS;
}

function renderBubble(props: Partial<React.ComponentProps<typeof OwlSpeechBubble>> = {}) {
  return render(
    <OwlSpeechBubble
      idPrefix="bubble"
      body={BODY}
      page={0}
      pageCount={1}
      nextLabel="Next"
      closeLabel="Close"
      onNext={jest.fn()}
      onClose={jest.fn()}
      maxWidth={280}
      {...props}
    />
  );
}

describe('OwlSpeechBubble', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('writes the line out rather than showing it whole from the first frame', () => {
    const tree = renderBubble();

    expect(visibleBody(tree)).toBe('');

    act(() => {
      jest.advanceTimersByTime(finishDuration(BODY.length));
    });

    expect(visibleBody(tree)).toBe(BODY);
  });

  it('keeps the full line available to the tree the whole time, mid-write included', () => {
    const tree = renderBubble();

    // Nothing has been revealed to the eye yet, but the real words are
    // already there for a screen reader (or anything else reading the
    // tree) to find.
    expect(visibleBody(tree)).toBe('');
    expect(json(tree)).toContain(BODY);

    act(() => {
      jest.advanceTimersByTime(TYPEWRITER_TICK_MS * 2);
    });

    expect(visibleBody(tree).length).toBeGreaterThan(0);
    expect(visibleBody(tree).length).toBeLessThan(BODY.length);
    expect(json(tree)).toContain(BODY);
  });

  it('grows monotonically -- every tick shows at least as much as the last', () => {
    const tree = renderBubble();
    let lastLength = 0;
    const ticks = Math.ceil(typewriterDurationMs(BODY.length) / TYPEWRITER_TICK_MS) + 2;

    for (let i = 0; i < ticks; i += 1) {
      act(() => {
        jest.advanceTimersByTime(TYPEWRITER_TICK_MS);
      });
      const length = visibleBody(tree).length;
      expect(length).toBeGreaterThanOrEqual(lastLength);
      lastLength = length;
    }

    expect(lastLength).toBe(BODY.length);
  });

  it('skips straight to the full line under reduced motion -- nothing to build up to', () => {
    mockReducedMotion.mockReturnValue(true);
    const tree = renderBubble();

    expect(visibleBody(tree)).toBe(BODY);
  });

  it('writes the new page out fresh when the body changes', () => {
    const tree = renderBubble({ page: 0, body: 'First page.' });

    act(() => {
      jest.advanceTimersByTime(finishDuration('First page.'.length));
    });
    expect(visibleBody(tree)).toBe('First page.');

    tree.rerender(
      <OwlSpeechBubble
        idPrefix="bubble"
        body="Second page, a little longer than the first."
        page={1}
        pageCount={2}
        nextLabel="Next"
        closeLabel="Close"
        onNext={jest.fn()}
        onClose={jest.fn()}
        maxWidth={280}
      />
    );

    // The moment the new page lands, it starts from nothing again rather
    // than snapping straight to the old bubble's full-length text.
    expect(visibleBody(tree)).toBe('');

    act(() => {
      jest.advanceTimersByTime(finishDuration('Second page, a little longer than the first.'.length));
    });
    expect(visibleBody(tree)).toBe('Second page, a little longer than the first.');
  });

  it('caps the write-out so a long line never reads as sluggish', () => {
    const long = 'A '.repeat(120).trim();
    const tree = renderBubble({ body: long });

    act(() => {
      jest.advanceTimersByTime(finishDuration(long.length));
    });

    expect(visibleBody(tree)).toBe(long);
  });
});

/**
 * An owl bubble's way out can be the word Skip, in the reader's own language,
 * where the cross used to be. Every owl in the app uses the word; the cross is
 * only the default for a bubble that does not ask.
 */
describe('the way out of the bubble', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function closeTexts(tree: ReturnType<typeof render>): string[] {
    const control = findByTestId(tree, 'bubble-close')[0];

    return control
      .findAll((node: any) => typeof node.props.children === 'string')
      .map((node: any) => node.props.children as string);
  }

  it('keeps the cross by default', () => {
    const tree = renderBubble();

    expect(closeTexts(tree)).toContain('×');
  });

  it('shows the word instead of the cross when asked to', () => {
    const tree = renderBubble({ closeLabel: 'Überspringen', closeAsWord: true });

    expect(closeTexts(tree)).toContain('Überspringen');
    expect(closeTexts(tree)).not.toContain('×');
    expect(findByTestId(tree, 'bubble-close')[0].props.accessibilityLabel).toBe('Überspringen');
  });

  it('keeps the title clear of the word, however long the word is in this language', () => {
    const tree = renderBubble({ title: 'Progress', closeLabel: 'Überspringen', closeAsWord: true });
    const control = findByTestId(tree, 'bubble-close').find((node: any) => node.props.onLayout);

    act(() => {
      control.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 96, height: 26 } } });
    });

    const title = findByTestId(tree, 'bubble-title')[0];
    const flat = [title.props.style].flat(3).reduce((merged: any, part: any) => ({ ...merged, ...part }), {});
    expect(flat.paddingRight).toBe(96 + 8);
  });
});
