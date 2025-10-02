import React from 'react';

// Jest mock for importing SVG files as React components
export default function SvgMock(props: any) {
  const { width, height, opacity } = props || {};
  return `MockSvg-${width ?? 'auto'}x${height ?? 'auto'}-${opacity ?? 1}`;
}

