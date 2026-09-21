/**
 * The owl guide's layer: pages sit under the shared journey bar, so a guide
 * drawn inside its page is covered by the bar. With the layer mounted above the
 * bar, a guide draws there instead; without it, it draws where it stands.
 */

import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { OwlGuideLayer, OwlGuideLayerProvider, OwlGuidePage, guidePages, useGuideOnTop } from '@/components/owl-guide/owl-guide-layer';
import { JOURNEY_BAR_LAYER_Z } from '@/components/child-ui/journey-bar-slot';

function Guide({ content }: { content: ReactNode }) {
  return <>{useGuideOnTop(content)}</>;
}

function App({ guides }: { guides: ReactNode[] }) {
  return (
    <OwlGuideLayerProvider>
      <View testID="page">
        {guides.map((content, index) => (
          <Guide key={index} content={content} />
        ))}
      </View>
      <View testID="bar" />
      <OwlGuideLayer />
    </OwlGuideLayerProvider>
  );
}

type Rendered = ReturnType<typeof render>;

function textNode(rendered: Rendered, text: string): any {
  return rendered.UNSAFE_root.findAll((node: any) => node.props.children === text)[0] ?? null;
}

function byTestId(rendered: Rendered, testID: string): any {
  return rendered.UNSAFE_root.findAll((node: any) => node.props.testID === testID)[0] ?? null;
}

function isInside(node: any, testID: string): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (current.props.testID === testID) return true;
  }
  return false;
}

describe('the owl guide layer', () => {
  it('should draw a guide where it stands when the app has no layer for it', () => {
    const underTest = render(
      <View testID="page">
        <Guide content={<Text>owl</Text>} />
      </View>
    );

    expect(isInside(textNode(underTest, 'owl'), 'page')).toBe(true);
  });

  it('should draw a guide in the layer, not in its page', () => {
    const underTest = render(<App guides={[<Text key="owl">owl</Text>]} />);

    const owl = textNode(underTest, 'owl');
    expect(isInside(owl, 'owl-guide-layer')).toBe(true);
    expect(isInside(owl, 'page')).toBe(false);
  });

  it('should sit above the journey bar', () => {
    const underTest = render(<App guides={[<Text key="owl">owl</Text>]} />);

    const layer = StyleSheet.flatten(byTestId(underTest, 'owl-guide-layer').props.style);
    expect(layer.zIndex).toBeGreaterThan(JOURNEY_BAR_LAYER_Z);
    expect(byTestId(underTest, 'owl-guide-layer').props.pointerEvents).toBe('box-none');
  });

  it('should follow the guide as it changes', () => {
    const underTest = render(<App guides={[<Text key="owl">first step</Text>]} />);

    underTest.rerender(<App guides={[<Text key="owl">second step</Text>]} />);

    expect(textNode(underTest, 'first step')).toBeNull();
    expect(isInside(textNode(underTest, 'second step'), 'owl-guide-layer')).toBe(true);
  });

  it('should empty the layer when the guide has nothing to show', () => {
    const underTest = render(<App guides={[<Text key="owl">owl</Text>]} />);

    underTest.rerender(<App guides={[null]} />);

    expect(textNode(underTest, 'owl')).toBeNull();
    expect(byTestId(underTest, 'owl-guide-layer')).toBeNull();
  });

  it('should take a guide down with its page', () => {
    const underTest = render(<App guides={[<Text key="owl">owl</Text>]} />);

    underTest.rerender(<App guides={[]} />);

    expect(textNode(underTest, 'owl')).toBeNull();
  });

  it('should keep two guides apart', () => {
    const underTest = render(<App guides={[<Text key="a">tour one</Text>, <Text key="b">tour two</Text>]} />);

    underTest.rerender(<App guides={[<Text key="a">tour one</Text>, null]} />);

    expect(textNode(underTest, 'tour one')).not.toBeNull();
    expect(textNode(underTest, 'tour two')).toBeNull();
  });
  /**
   * Pages are mounted ahead of being shown so they open without a stall. A
   * guide in one of those draws nothing: in its page it was off screen, but
   * the layer is on screen whatever page is showing.
   */
  it('should not draw a guide from a page that is not on screen', () => {
    const underTest = render(
      <OwlGuideLayerProvider>
        <OwlGuidePage current={false}>
          <Guide content={<Text>owl</Text>} />
        </OwlGuidePage>
        <OwlGuideLayer />
      </OwlGuideLayerProvider>
    );

    expect(textNode(underTest, 'owl')).toBeNull();
    expect(byTestId(underTest, 'owl-guide-layer')).toBeNull();
  });

  it('should draw it once its page comes on screen, and take it down when the page leaves', () => {
    const app = (current: boolean) => (
      <OwlGuideLayerProvider>
        <OwlGuidePage current={current}>
          <Guide content={<Text>owl</Text>} />
        </OwlGuidePage>
        <OwlGuideLayer />
      </OwlGuideLayerProvider>
    );
    const underTest = render(app(false));

    underTest.rerender(app(true));
    const shownInLayer = isInside(textNode(underTest, 'owl'), 'owl-guide-layer');
    underTest.rerender(app(false));

    expect(shownInLayer).toBe(true);
    expect(textNode(underTest, 'owl')).toBeNull();
  });
});

describe('guidePages', () => {
  it('should mark only the page on screen as shown', () => {
    const pages = { main: <Text>main</Text>, stories: <Text>stories</Text> };

    const underTest = guidePages(pages, 'stories');

    expect((underTest.main as React.ReactElement<{ current: boolean }>).props.current).toBe(false);
    expect((underTest.stories as React.ReactElement<{ current: boolean }>).props.current).toBe(true);
  });

  it('should leave a page with nothing to draw as nothing', () => {
    const underTest = guidePages({ main: <Text>main</Text>, game: null }, 'main');

    expect(underTest.game).toBeNull();
  });
});
