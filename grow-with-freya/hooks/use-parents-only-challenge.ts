import { useState, useRef, useCallback, useMemo } from 'react';
import { Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';

export interface ParentChallenge {
  type: 'emoji' | 'math';
  /** Painted portrait of the animal, shown inside the starry orb. */
  art?: number;
  word?: string; // The key used for translation lookup (e.g., 'cat', 'duck')
  // Math challenge properties
  num1?: number;
  num2?: number;
  operation?: '+' | '-';
  answer?: number;
}

// Animal challenges with English word keys
export const EMOJI_CHALLENGES: ParentChallenge[] = [
  { type: 'emoji', art: require('@/assets/images/parents-only/cat.webp'), word: 'cat' },
  { type: 'emoji', art: require('@/assets/images/parents-only/duck.webp'), word: 'duck' },
  { type: 'emoji', art: require('@/assets/images/parents-only/dog.webp'), word: 'dog' },
  { type: 'emoji', art: require('@/assets/images/parents-only/camel.webp'), word: 'camel' },
];

// Math challenges - randomly generated (simple addition & subtraction only)
export function generateMathChallenge(): ParentChallenge {
  const operations: ('+' | '-')[] = ['+', '-'];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  let num1: number, num2: number, answer: number;

  if (operation === '+') {
    num1 = Math.floor(Math.random() * 8) + 2; // 2-9
    num2 = Math.floor(Math.random() * 8) + 1; // 1-8
    answer = num1 + num2;
  } else {
    num1 = Math.floor(Math.random() * 10) + 5; // 5-14
    num2 = Math.floor(Math.random() * (num1 - 1)) + 1; // 1 to num1-1 (always positive result)
    answer = num1 - num2;
  }

  return { type: 'math', num1, num2, operation, answer };
}

export interface UseParentsOnlyChallengeReturn {
  isVisible: boolean;
  challenge: ParentChallenge;
  inputValue: string;
  setInputValue: (value: string) => void;
  showChallenge: (callback: () => void) => void;
  handleSubmit: () => void;
  handleClose: () => void;
  isInputValid: boolean;
}

export const KEYBOARD_GONE_WAIT_MS = 450;

export function afterKeyboardGone(open: () => void): void {
  if (!Keyboard.isVisible()) {
    open();
    return;
  }
  let opened = false;
  let settle: ReturnType<typeof setTimeout> | null = null;
  const finish = () => {
    if (opened) return;
    opened = true;
    willHide.remove();
    didHide.remove();
    clearTimeout(fallback);
    if (settle) clearTimeout(settle);
    open();
  };
  const willHide = Keyboard.addListener('keyboardWillHide', (event) => {
    if (settle) clearTimeout(settle);
    settle = setTimeout(finish, event?.duration ?? 0);
  });
  const didHide = Keyboard.addListener('keyboardDidHide', finish);
  const fallback = setTimeout(finish, KEYBOARD_GONE_WAIT_MS);
  Keyboard.dismiss();
}

export function useParentsOnlyChallenge(): UseParentsOnlyChallengeReturn {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [challenge, setChallenge] = useState<ParentChallenge>(EMOJI_CHALLENGES[0]);
  const [inputValue, setInputValue] = useState('');
  const [lastChallengeType, setLastChallengeType] = useState<'emoji' | 'math'>('emoji');
  const callbackRef = useRef<(() => void) | null>(null);

  const showChallenge = useCallback((callback: () => void) => {
    // Alternate between emoji and math challenges
    let newChallenge: ParentChallenge;

    if (lastChallengeType === 'emoji') {
      // Show math challenge next
      newChallenge = generateMathChallenge();
      setLastChallengeType('math');
    } else {
      // Show emoji challenge next
      newChallenge = EMOJI_CHALLENGES[Math.floor(Math.random() * EMOJI_CHALLENGES.length)];
      setLastChallengeType('emoji');
    }

    setChallenge(newChallenge);
    setInputValue('');
    callbackRef.current = callback;
    setIsVisible(true);
  }, [lastChallengeType]);

  // Validate input based on challenge type
  const isInputValid = useMemo(() => {
    if (challenge.type === 'emoji' && challenge.word) {
      const translatedWord = t(`parentsOnly.animals.${challenge.word}`, { defaultValue: challenge.word });
      return inputValue.toLowerCase().trim() === translatedWord.toLowerCase();
    } else if (challenge.type === 'math' && challenge.answer !== undefined) {
      const userAnswer = parseInt(inputValue.trim(), 10);
      return !isNaN(userAnswer) && userAnswer === challenge.answer;
    }
    return false;
  }, [challenge, inputValue, t]);

  const handleSubmit = useCallback(() => {
    if (isInputValid) {
      setIsVisible(false);
      setInputValue('');
      const open = callbackRef.current;
      callbackRef.current = null;
      if (open) afterKeyboardGone(open);
    }
  }, [isInputValid]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setInputValue('');
    callbackRef.current = null;
  }, []);

  return {
    isVisible,
    challenge,
    inputValue,
    setInputValue,
    showChallenge,
    handleSubmit,
    handleClose,
    isInputValid,
  };
}

