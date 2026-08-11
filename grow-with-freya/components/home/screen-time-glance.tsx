import React, { memo } from 'react';
import { View, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenTimeContent } from '@/components/screen-time/screen-time-screen';
import { Fonts } from '@/constants/theme';
import { HOME_SCENE_TYPE, type TimeOfDay } from '@/constants/home-scene';

export interface ScreenTimeGlanceProps {
  visible: boolean;
  timeOfDay: TimeOfDay;
  onClose: () => void;
  testID?: string;
}

export const ScreenTimeGlance = memo(function ScreenTimeGlance({
  visible,
  timeOfDay,
  onClose,
  testID = 'screen-time-glance',
}: ScreenTimeGlanceProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      testID={testID}
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: '#080A28' }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable
            testID="screen-time-glance-close"
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            hitSlop={12}
            style={[styles.close, { borderColor: 'rgba(255, 255, 255, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          <ScreenTimeContent />
        </ScrollView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // floats over the scroll content so the dashboard's earth art can rise up
  // behind the title, as in the design
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_SCENE_TYPE.continueTitle,
    fontWeight: '700',
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
