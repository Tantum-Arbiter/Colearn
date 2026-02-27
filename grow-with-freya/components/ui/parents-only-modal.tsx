import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import type { ParentChallenge } from '@/hooks/use-parents-only-challenge';

// Get full screen dimensions (ignores keyboard resize on Android)
const getFullScreenHeight = () => {
  const screen = Dimensions.get('screen');
  return screen.height;
};

interface ParentsOnlyModalProps {
  visible: boolean;
  challenge: ParentChallenge;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isInputValid: boolean;
  scaledFontSize?: (size: number) => number;
}

export function ParentsOnlyModal({
  visible,
  challenge,
  inputValue,
  onInputChange,
  onSubmit,
  onClose,
  isInputValid,
  scaledFontSize = (size) => size,
}: ParentsOnlyModalProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { width, height } = useWindowDimensions();
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  // Detect phone in landscape (small height + landscape orientation)
  const isPhoneLandscape = height < 500 && width > height;

  // Smooth keyboard animation using Animated API
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, (event) => {
      const keyboardHeight = event.endCoordinates.height;
      // Move content up - Android needs more offset since we're using fixed screen height
      const offset = Platform.OS === 'ios'
        ? -(keyboardHeight / 2.5)
        : -(keyboardHeight / 2);

      Animated.timing(keyboardOffset, {
        toValue: offset,
        duration: Platform.OS === 'ios' ? event.duration : 250,
        useNativeDriver: true,
      }).start();
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, (event) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? event.duration : 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [keyboardOffset]);

  // Auto-focus the input when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Small delay to ensure modal is fully visible before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // Reset keyboard offset when modal closes
      keyboardOffset.setValue(0);
    }
  }, [visible, keyboardOffset]);

  // On Android, use fixed screen height to prevent overlay from shrinking when keyboard appears
  const fullScreenStyle = Platform.OS === 'android' ? {
    height: getFullScreenHeight(),
    paddingTop: StatusBar.currentHeight || 0,
  } : {};

  // Early return if not visible - using conditional rendering instead of Modal
  // to avoid iOS crash during orientation changes
  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.absoluteContainer, fullScreenStyle]}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.modalOverlay, fullScreenStyle]} pointerEvents="box-none">
        <Animated.View style={[
          styles.content,
          isPhoneLandscape && styles.contentLandscape,
          { transform: [{ translateY: keyboardOffset }] },
        ]}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>

          {isPhoneLandscape ? (
            // Compact horizontal layout for phone landscape
            <View style={styles.landscapeLayout}>
              {challenge.type === 'emoji' ? (
                <>
                  <View style={styles.landscapeLeft}>
                    <Text style={styles.emojiCompact}>{challenge.emoji}</Text>
                  </View>
                  <View style={styles.landscapeRight}>
                    <Text style={[styles.titleCompact, { fontSize: scaledFontSize(16) }]}>
                      {t('parentsOnly.typeAnimalName')}
                    </Text>
                    <View style={styles.inputRow}>
                      <TextInput
                        ref={inputRef}
                        style={[
                          styles.inputCompact,
                          { fontSize: scaledFontSize(16) },
                          isFocused && styles.inputFocused,
                        ]}
                        value={inputValue}
                        onChangeText={onInputChange}
                        placeholder={t('parentsOnly.placeholder')}
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        autoCapitalize="none"
                        autoCorrect={false}
                        onSubmitEditing={onSubmit}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                      />
                      <Pressable
                        style={[styles.confirmButtonCompact, !isInputValid && styles.buttonDisabled]}
                        onPress={onSubmit}
                        disabled={!isInputValid}
                      >
                        <Text style={[styles.confirmButtonText, { fontSize: scaledFontSize(14) }]}>
                          {t('parentsOnly.go')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.landscapeRight}>
                  <Text style={[styles.titleCompact, { fontSize: scaledFontSize(16) }]}>
                    {t('parentsOnly.solveMath')}
                  </Text>
                  <Text style={[styles.mathProblemCompact, { fontSize: scaledFontSize(18) }]}>
                    {challenge.num1} {challenge.operation === '*' ? 'x' : challenge.operation} {challenge.num2} = ?
                  </Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      ref={inputRef}
                      style={[
                        styles.inputCompact,
                        { fontSize: scaledFontSize(16) },
                        isFocused && styles.inputFocused,
                      ]}
                      value={inputValue}
                      onChangeText={onInputChange}
                      placeholder={t('parentsOnly.placeholder')}
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      onSubmitEditing={onSubmit}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                    />
                    <Pressable
                      style={[styles.confirmButtonCompact, !isInputValid && styles.buttonDisabled]}
                      onPress={onSubmit}
                      disabled={!isInputValid}
                    >
                      <Text style={[styles.confirmButtonText, { fontSize: scaledFontSize(14) }]}>
                        {t('parentsOnly.go')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ) : (
            // Standard vertical layout for portrait/tablet
            <>
              <Text style={[styles.title, { fontSize: scaledFontSize(22) }]}>{t('parentsOnly.title')}</Text>
              {challenge.type === 'emoji' ? (
                <>
                  <Text style={styles.emoji}>{challenge.emoji}</Text>
                  <Text style={[styles.subtitle, { fontSize: scaledFontSize(14) }]}>
                    {t('parentsOnly.subtitle')}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.mathProblem, { fontSize: scaledFontSize(32) }]}>
                    {challenge.num1} {challenge.operation === '*' ? 'x' : challenge.operation} {challenge.num2} = ?
                  </Text>
                  <Text style={[styles.subtitle, { fontSize: scaledFontSize(14) }]}>
                    {t('parentsOnly.mathSubtitle')}
                  </Text>
                </>
              )}
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  { fontSize: scaledFontSize(18) },
                  isFocused && styles.inputFocused,
                ]}
                value={inputValue}
                onChangeText={onInputChange}
                placeholder={t('parentsOnly.placeholder')}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={onSubmit}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              <Pressable
                style={[styles.confirmButton, !isInputValid && styles.buttonDisabled]}
                onPress={onSubmit}
                disabled={!isInputValid}
              >
                <Text style={[styles.confirmButtonText, { fontSize: scaledFontSize(16) }]}>
                  {t('parentsOnly.continue')}
                </Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Absolute container to replace Modal - avoids iOS crash during orientation changes
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3000, // Above other modals in story-transition-context
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    backgroundColor: 'rgba(44, 62, 80, 0.85)',
    borderRadius: 20,
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  contentLandscape: {
    flexDirection: 'row',
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 'auto',
    maxWidth: 420,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Portrait/tablet styles
  title: {
    fontSize: 22,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  mathProblem: {
    fontSize: 32,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  inputFocused: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(52, 152, 219, 0.8)',
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(150, 150, 150, 0.5)',
  },
  // Landscape phone compact styles
  landscapeLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
  },
  landscapeLeft: {
    marginRight: 16,
  },
  landscapeRight: {
    flex: 1,
  },
  emojiCompact: {
    fontSize: 44,
  },
  titleCompact: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  mathProblemCompact: {
    fontSize: 18,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputCompact: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  confirmButtonCompact: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(52, 152, 219, 0.8)',
    borderRadius: 10,
  },
});

