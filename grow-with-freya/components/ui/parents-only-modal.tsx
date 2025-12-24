import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Fonts } from '@/constants/theme';
import type { ParentChallenge } from '@/hooks/use-parents-only-challenge';

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
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Auto-focus the input when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Small delay to ensure modal is fully visible before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.content}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
          <Text style={[styles.title, { fontSize: scaledFontSize(22) }]}>Parents Only</Text>
          <Text style={styles.emoji}>{challenge.emoji}</Text>
          <Text style={[styles.subtitle, { fontSize: scaledFontSize(14) }]}>
            Type the animal name to continue
          </Text>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { fontSize: scaledFontSize(18) },
              isFocused && styles.inputFocused,
            ]}
            value={inputValue}
            onChangeText={onInputChange}
            placeholder="Type here..."
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
              Continue
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
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
  closeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
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
});

