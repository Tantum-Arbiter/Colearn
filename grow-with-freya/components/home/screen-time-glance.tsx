import React, { memo } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenTimeContent } from '@/components/screen-time/screen-time-screen';
import { Fonts } from '@/constants/theme';
import { HOME_SCENE_TYPE, HOME_THEMES, type TimeOfDay } from '@/constants/home-scene';

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
  const theme = HOME_THEMES[timeOfDay];

  return (
    <Modal
      testID={testID}
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: theme.skyTop }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.title, { color: theme.title }]}>{t('account.screenTime')}</Text>

          <Pressable
            testID="screen-time-glance-close"
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            hitSlop={12}
            style={[styles.close, { borderColor: theme.chromeEdge, backgroundColor: theme.chromeFill }]}
          >
            <Ionicons name="close" size={22} color={theme.chromeInk} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
