import { useState, useRef, useCallback } from 'react';

export interface ParentChallenge {
  emoji: string;
  word: string;
}

export const PARENT_CHALLENGES: ParentChallenge[] = [
  { emoji: '🐱', word: 'cat' },
  { emoji: '🦆', word: 'duck' },
  { emoji: '🐕', word: 'dog' },
  { emoji: '🐫', word: 'camel' },
];

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
  const [isVisible, setIsVisible] = useState(false);
  const [challenge, setChallenge] = useState<ParentChallenge>({ emoji: '🐱', word: 'cat' });
  const [inputValue, setInputValue] = useState('');
  const callbackRef = useRef<(() => void) | null>(null);

  const showChallenge = useCallback((callback: () => void) => {
    const randomChallenge = PARENT_CHALLENGES[Math.floor(Math.random() * PARENT_CHALLENGES.length)];
    setChallenge(randomChallenge);
    setInputValue('');
    callbackRef.current = callback;
    setIsVisible(true);
  }, []);

  const isInputValid = inputValue.toLowerCase().trim() === challenge.word.toLowerCase();

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

