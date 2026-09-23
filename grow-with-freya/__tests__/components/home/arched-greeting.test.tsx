/**
 * The greeting, set on an arc: the words the data model chose, in the theme's
 * colours, with a soft glow behind the title, and read out whole.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { ArchedGreeting } from '@/components/home/arched-greeting';
import { archedGreetingLayout, textAdvance } from '@/constants/arched-greeting';

type Node = { props: Record<string, any>; parent: Node | null };

function svgTexts(view: ReturnType<typeof render>, text: string): Record<string, any>[] {
  return view.UNSAFE_root
    .findAll((node: any) => node.props.testID === 'svg-TextPath' && node.props.children === text)
    .map((node: any) => {
      let parent: Node | null = node.parent;
      while (parent && parent.props.fill === undefined) {
        parent = parent.parent;
      }

      return parent?.props ?? {};
    });
}

const PROPS = {
  title: 'Welcome back, Liam!',
  subtitle: '2 days of stories in a row. Wonderful!',
  width: 402,
  titleSize: 34,
  subtitleSize: 18,
  titleColor: '#FFFFFF',
  subtitleColor: '#A9B9DA',
  glowColor: 'rgba(140,150,255,0.55)',
};

describe('ArchedGreeting', () => {
  it('should set the title and subtitle each on its own arc, in the theme\'s colours and sizes', () => {
    const view = render(<ArchedGreeting {...PROPS} />);

    const title = svgTexts(view, PROPS.title).find((props) => props.fill === PROPS.titleColor);
    const subtitle = svgTexts(view, PROPS.subtitle)[0];
    expect(title?.fontSize).toBe(34);
    expect(title?.fontWeight).toBe('800');
    expect(title?.textAnchor).toBe('middle');
    expect(subtitle.fill).toBe(PROPS.subtitleColor);
    expect(subtitle.fontSize).toBe(18);
  });

  it('should glow behind the title, and only the title', () => {
    const view = render(<ArchedGreeting {...PROPS} />);

    const glow = svgTexts(view, PROPS.title).filter((props) => props.fill === PROPS.glowColor);
    expect(glow).toHaveLength(1);
    expect(glow[0].filter).toMatch(/^url\(#.*glow\)$/);
    expect(svgTexts(view, PROPS.subtitle).filter((props) => props.filter)).toHaveLength(0);
  });

  it('should centre each line on its arc', () => {
    const view = render(<ArchedGreeting {...PROPS} />);

    const paths = view.UNSAFE_root.findAll((node: any) => node.props.testID === 'svg-TextPath');
    expect(paths.length).toBe(3);
    paths.forEach((node: any) => {
      expect(node.props.startOffset).toBe('50%');
      expect(node.props.href).toMatch(/^#/);
    });
  });

  it('should take exactly the height its words need on their arcs, centred on the screen', () => {
    const view = render(<ArchedGreeting {...PROPS} />);

    const block = view.UNSAFE_queryAllByProps({ testID: 'home-welcome' })[0];
    const style = StyleSheet.flatten(block.props.style);
    expect(style.width).toBe(402);
    expect(style.height).toBe(
      archedGreetingLayout(402, 34, 18, 1, {
        title: [textAdvance(PROPS.title, 34, 'heavy')],
        subtitle: textAdvance(PROPS.subtitle, 18, 'medium'),
      }).height
    );
    expect(style.alignSelf).toBe('center');
  });

  it('should read out as one heading, since the words drawn on the arc are invisible to a screen reader', () => {
    const view = render(<ArchedGreeting {...PROPS} />);

    const block = view.UNSAFE_queryAllByProps({ testID: 'home-welcome' })[0];
    expect(block.props.accessible).toBe(true);
    expect(block.props.accessibilityRole).toBe('header');
    expect(block.props.accessibilityLabel).toBe(`${PROPS.title} ${PROPS.subtitle}`);
  });
});

describe('ArchedGreeting with a long greeting', () => {
  it('should set words with nowhere to break smaller so they stay on the arc', () => {
    const long = 'Willkommen-zurück-Maximiliane-Alexandra!';
    const view = render(<ArchedGreeting {...PROPS} title={long} />);

    const title = svgTexts(view, long).find((props) => props.fill === PROPS.titleColor);
    expect(title?.fontSize).toBeLessThan(34);
  });
});

/**
 * The greeting that lost its W: too long for one arc at full size, so the
 * name comes down to an arc of its own and every letter is drawn.
 */
describe('ArchedGreeting over two lines', () => {
  const title = 'Welcome back, wdwdsd!';

  it('should set each half of the title on its own arc, glow and all', () => {
    const view = render(<ArchedGreeting {...PROPS} title={title} />);

    for (const line of ['Welcome back,', 'wdwdsd!']) {
      const drawn = svgTexts(view, line);
      expect(drawn.map((props) => props.fill).sort()).toEqual([PROPS.glowColor, PROPS.titleColor].sort());
      expect(drawn.every((props) => props.fontSize === 34)).toBe(true);
    }
    expect(svgTexts(view, title)).toHaveLength(0);
  });

  it('should take the height two lines need', () => {
    const view = render(<ArchedGreeting {...PROPS} title={title} />);

    const block = view.UNSAFE_root.findAll((n: any) => n.props.testID === 'home-welcome')[0];
    expect(StyleSheet.flatten(block.props.style).height).toBe(
      archedGreetingLayout(402, 34, 18, 2, {
        title: ['Welcome back,', 'wdwdsd!'].map((line) => textAdvance(line, 34, 'heavy')),
        subtitle: textAdvance(PROPS.subtitle, 18, 'medium'),
      }).height
    );
  });

  it('should still read out as one heading', () => {
    const view = render(<ArchedGreeting {...PROPS} title={title} />);

    const block = view.UNSAFE_root.findAll((n: any) => n.props.testID === 'home-welcome')[0];
    expect(block.props.accessibilityLabel).toBe(`${title} ${PROPS.subtitle}`);
  });
});
