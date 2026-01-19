import { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface ParentChallenge {
  type: 'emoji' | 'math';
  emoji?: string;
  word?: string; // The key used for translation lookup (e.g., 'cat', 'duck')
  // Math challenge properties
  num1?: number;
  num2?: number;
  operation?: '+' | '-' | '*';
  answer?: number;
}

// Emoji challenges with English word keys
export const EMOJI_CHALLENGES: ParentChallenge[] = [
  { type: 'emoji', emoji: '🐱', word: 'cat' },
  { type: 'emoji', emoji: '🦆', word: 'duck' },
  { type: 'emoji', emoji: '🐕', word: 'dog' },
  { type: 'emoji', emoji: '🐫', word: 'camel' },
];

// Math challenges - randomly generated
export function generateMathChallenge(): ParentChallenge {
  const operations: ('+' | '-' | '*')[] = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  let num1: number, num2: number, answer: number;

  if (operation === '+') {
    num1 = Math.floor(Math.random() * 10) + 1; // 1-10
    num2 = Math.floor(Math.random() * 10) + 1; // 1-10
    answer = num1 + num2;
  } else if (operation === '-') {
    num1 = Math.floor(Math.random() * 15) + 5; // 5-19
    num2 = Math.floor(Math.random() * num1); // 0 to num1-1
    answer = num1 - num2;
  } else {
    // Multiplication - keep numbers small
    num1 = Math.floor(Math.random() * 10) + 1; // 1-10
    num2 = Math.floor(Math.random() * 10) + 1; // 1-10
    answer = num1 * num2;
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

export function useParentsOnlyChallenge(): UseParentsOnlyChallengeReturn {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [challenge, setChallenge] = useState<ParentChallenge>({ type: 'emoji', emoji: '🐱', word: 'cat' });
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
      if (callbackRef.current) {
        callbackRef.current();
        callbackRef.current = null;
      }
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

