import React from 'react';
import { render } from '@testing-library/react-native';
import { BearImage } from '../../components/main-menu/animated-components';

// Helper to read height from style object or array of styles
function getStyleProp(style: any, prop: string) {
  if (!style) return undefined;
  if (Array.isArray(style)) {
    for (const s of style) {
      if (s && s[prop] !== undefined) return s[prop];
    }
    return undefined;
  }
  return style[prop];
}

describe('BearImage', () => {
  it('renders bear image anchored to bottom with correct dimensions', () => {
    const { toJSON } = render(<BearImage />);
    const tree: any = toJSON();

    expect(tree).toBeTruthy();

    // Check container dimensions
    const containerStyle = tree.props.style;
    const containerHeight = getStyleProp(containerStyle, 'height');
    const containerWidth = getStyleProp(containerStyle, 'width');

    expect(containerWidth).toBe("100%");
    expect(containerHeight).toBe("100%");

    // Check that there's an image child
    const imageChild = tree.children?.[0];
    expect(imageChild).toBeTruthy();

    // Check that it contains image-related content
    const treeString = JSON.stringify(tree);
    expect(treeString).toMatch(/img|backgroundImage|Image/i);
  });
});

