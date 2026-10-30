import React from 'react';
import type { SvgProps } from 'react-native-svg';
import CN from 'country-flag-icons/1x1/CN.svg';
import DE from 'country-flag-icons/1x1/DE.svg';
import DK from 'country-flag-icons/1x1/DK.svg';
import ES from 'country-flag-icons/1x1/ES.svg';
import FR from 'country-flag-icons/1x1/FR.svg';
import GB from 'country-flag-icons/1x1/GB.svg';
import IT from 'country-flag-icons/1x1/IT.svg';
import JP from 'country-flag-icons/1x1/JP.svg';
import NL from 'country-flag-icons/1x1/NL.svg';
import PL from 'country-flag-icons/1x1/PL.svg';
import PT from 'country-flag-icons/1x1/PT.svg';
import SA from 'country-flag-icons/1x1/SA.svg';
import TR from 'country-flag-icons/1x1/TR.svg';

const FLAGS = {
  en: GB,
  pl: PL,
  es: ES,
  de: DE,
  fr: FR,
  it: IT,
  pt: PT,
  ar: SA,
  tr: TR,
  nl: NL,
  da: DK,
  ja: JP,
  zh: CN,
} as const satisfies Record<string, React.ComponentType<SvgProps>>;

export type FlaggedLanguage = keyof typeof FLAGS;
export const FLAGGED_LANGUAGES = Object.keys(FLAGS) as FlaggedLanguage[];

export function hasFlag(code: string | undefined): code is FlaggedLanguage {
  return code !== undefined && code in FLAGS;
}

export interface FlagArtProps {
  code: FlaggedLanguage;
  size: number;
  testID?: string;
}

export function FlagArt({ code, size, testID = 'flag-art' }: FlagArtProps) {
  const Flag = FLAGS[code];

  return <Flag testID={testID} width={size} height={size} />;
}
