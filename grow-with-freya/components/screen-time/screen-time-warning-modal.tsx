import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { ScreenTimeWarning } from '../../services/screen-time-service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ScreenTimeWarningModalProps {
  visible: boolean;
  warning: ScreenTimeWarning | null;
  onDismiss: () => void;
}

export function ScreenTimeWarningModal({
  visible,
  warning,
  onDismiss,
}: ScreenTimeWarningModalProps) {
  if (!warning) return null;

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  const formatRemainingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) return `${remainingSeconds} seconds`;
    if (remainingSeconds === 0) return `${minutes} minutes`;
    return `${minutes} minutes and ${remainingSeconds} seconds`;
  };

  const getModalIcon = () => {
    switch (warning.type) {
      case 'approaching_limit':
        return '⏰';
      case 'limit_reached':
        return '🛑';
      case 'daily_complete':
        return '✅';
      default:
        return '⏰';
    }
  };

  const getModalTitle = () => {
    switch (warning.type) {
      case 'approaching_limit':
        return 'Screen Time Warning';
      case 'limit_reached':
        return 'Daily Limit Reached';
      case 'daily_complete':
        return 'Great Job Today!';
      default:
        return 'Screen Time Notice';
    }
  };

  const getModalColor = () => {
    switch (warning.type) {
      case 'approaching_limit':
        return '#F59E0B'; // Amber
      case 'limit_reached':
        return '#EF4444'; // Red
      case 'daily_complete':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray
    }
  };



  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <BlurView intensity={20} style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1E3A8A', '#3B82F6']}
            style={styles.modal}
          >
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: getModalColor() }]}>
              <Text style={styles.icon}>{getModalIcon()}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{getModalTitle()}</Text>

            {/* Message */}
            <Text style={styles.message}>{warning.message}</Text>

            {/* Remaining Time (if applicable) */}
            {warning.remainingTime > 0 && (
              <View style={styles.timeContainer}>
                <Text style={styles.timeLabel}>Time remaining:</Text>
                <Text style={styles.timeValue}>
                  {formatRemainingTime(warning.remainingTime)}
                </Text>
              </View>
            )}

            {/* WHO/AAP Guidelines Note */}
            <View style={styles.guidelinesContainer}>
              <Text style={styles.guidelinesText}>
                📋 Following WHO & AAP recommendations for healthy screen time
              </Text>
            </View>

            {/* Action Button */}
            <View style={styles.buttonContainer}>
              <Pressable
                style={[styles.button, styles.closeButton]}
                onPress={handleDismiss}
              >
                <Text style={styles.closeButtonText}>Close Notification</Text>
              </Pressable>
            </View>

            {/* Educational Message */}
            <View style={styles.educationalContainer}>
              <Text style={styles.educationalText}>
                💡 Try other activities: reading books, playing outside, or creative play!
              </Text>
            </View>
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
  },
  modal: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  timeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  timeLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  timeValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  guidelinesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  guidelinesText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#F59E0B',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#10B981',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#EF4444',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dismissButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  educationalContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(76, 205, 196, 0.2)',
    borderRadius: 12,
    padding: 12,
  },
  educationalText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
