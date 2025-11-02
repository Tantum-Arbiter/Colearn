import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import NotificationService from '@/services/notification-service';
import { reminderService } from '@/services/reminder-service';

interface NotificationDebugScreenProps {
  onBack: () => void;
}

export function NotificationDebugScreen({ onBack }: NotificationDebugScreenProps) {
  const insets = useSafeAreaInsets();
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearDebugInfo = () => {
    setDebugInfo([]);
  };

  // Test notification permissions
  const testPermissions = async () => {
    setIsLoading(true);
    addDebugInfo('🔍 Testing notification permissions...');
    
    try {
      // Check if running on device
      if (!Device.isDevice) {
        addDebugInfo('❌ Not running on physical device - notifications won\'t work');
        setIsLoading(false);
        return;
      }
      
      addDebugInfo('✅ Running on physical device');
      
      // Get current permissions
      const { status: currentStatus } = await Notifications.getPermissionsAsync();
      addDebugInfo(`📋 Current permission status: ${currentStatus}`);
      
      // Request permissions if needed
      if (currentStatus !== 'granted') {
        addDebugInfo('🔔 Requesting notification permissions...');
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        addDebugInfo(`📋 New permission status: ${newStatus}`);
      }
      
      // Test with notification service
      const notificationService = NotificationService.getInstance();
      const permissionStatus = await notificationService.getPermissionStatus();
      addDebugInfo(`🔧 NotificationService status: granted=${permissionStatus.granted}, canAskAgain=${permissionStatus.canAskAgain}`);
      
    } catch (error) {
      addDebugInfo(`❌ Permission test failed: ${error}`);
    }
    
    setIsLoading(false);
  };

  // Test immediate notification
  const testImmediateNotification = async () => {
    setIsLoading(true);
    addDebugInfo('🚀 Testing immediate notification...');
    
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification 🧪',
          body: 'This is a test notification from Grow with Freya debug tool',
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
      
      addDebugInfo(`✅ Immediate notification scheduled with ID: ${notificationId}`);
    } catch (error) {
      addDebugInfo(`❌ Immediate notification failed: ${error}`);
    }
    
    setIsLoading(false);
  };

  // Test scheduled notification (5 seconds from now)
  const testScheduledNotification = async () => {
    setIsLoading(true);
    addDebugInfo('⏰ Testing scheduled notification (5 seconds)...');
    
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Scheduled Test 📅',
          body: 'This scheduled notification should appear in 5 seconds',
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
        },
      });
      
      addDebugInfo(`✅ Scheduled notification set with ID: ${notificationId}`);
    } catch (error) {
      addDebugInfo(`❌ Scheduled notification failed: ${error}`);
    }
    
    setIsLoading(false);
  };

  // List all scheduled notifications
  const listScheduledNotifications = async () => {
    setIsLoading(true);
    addDebugInfo('📋 Listing all scheduled notifications...');
    
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      addDebugInfo(`📊 Found ${notifications.length} scheduled notifications:`);
      
      if (notifications.length === 0) {
        addDebugInfo('   (No scheduled notifications found)');
      } else {
        notifications.forEach((notification, index) => {
          const { content, trigger } = notification;
          addDebugInfo(`   ${index + 1}. "${content.title}" - ${content.body}`);
          if (trigger && 'type' in trigger) {
            addDebugInfo(`      Trigger: ${trigger.type}`);
            if ('weekday' in trigger && 'hour' in trigger && 'minute' in trigger) {
              addDebugInfo(`      Time: Weekday ${trigger.weekday}, ${trigger.hour}:${trigger.minute?.toString().padStart(2, '0')}`);
            }
          }
        });
      }
    } catch (error) {
      addDebugInfo(`❌ Failed to list notifications: ${error}`);
    }
    
    setIsLoading(false);
  };

  // Test custom reminders
  const testCustomReminders = async () => {
    setIsLoading(true);
    addDebugInfo('🎯 Testing custom reminders system...');
    
    try {
      const reminders = await reminderService.getAllReminders();
      
      addDebugInfo(`📊 Found ${reminders.length} custom reminders:`);
      
      if (reminders.length === 0) {
        addDebugInfo('   (No custom reminders found)');
      } else {
        reminders.forEach((reminder, index) => {
          const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][reminder.dayOfWeek] || 'Unknown';
          const [hours, minutes] = reminder.time.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          const timeFormatted = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
          const status = reminder.isActive ? '✅ Active' : '❌ Inactive';
          
          addDebugInfo(`   ${index + 1}. "${reminder.title}" - ${dayName} at ${timeFormatted} ${status}`);
          addDebugInfo(`      Message: "${reminder.message}"`);
          addDebugInfo(`      Notification ID: ${reminder.notificationId || 'None'}`);
          addDebugInfo(`      Advance ID: ${reminder.advanceNotificationId || 'None'}`);
        });
      }
      
      // Test creating a reminder for tomorrow at current time + 2 minutes
      const now = new Date();
      const testTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const tomorrowDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tomorrow.getDay()] || 'Unknown';
      addDebugInfo(`🧪 Creating test reminder for ${tomorrowDayName} at ${testTime.getHours()}:${testTime.getMinutes().toString().padStart(2, '0')}...`);
      
      const testReminder = await reminderService.createReminder(
        'Debug Test Reminder',
        'This is a test reminder created by the debug tool',
        tomorrow.getDay(),
        `${testTime.getHours()}:${testTime.getMinutes().toString().padStart(2, '0')}`
      );
      
      addDebugInfo(`✅ Test reminder created with ID: ${testReminder.id}`);
      addDebugInfo(`   Notification ID: ${testReminder.notificationId}`);
      addDebugInfo(`   Advance Notification ID: ${testReminder.advanceNotificationId}`);
      
    } catch (error) {
      addDebugInfo(`❌ Custom reminders test failed: ${error}`);
    }
    
    setIsLoading(false);
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    setIsLoading(true);
    addDebugInfo('🧹 Clearing all scheduled notifications...');
    
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      addDebugInfo('✅ All scheduled notifications cleared');
    } catch (error) {
      addDebugInfo(`❌ Failed to clear notifications: ${error}`);
    }
    
    setIsLoading(false);
  };

  return (
    <LinearGradient
      colors={['#4ECDC4', '#3B82F6', '#1E3A8A']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.title}>Notification Debug</Text>
        <Pressable onPress={clearDebugInfo} style={styles.clearButton}>
          <Ionicons name="refresh" size={24} color="white" />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Test Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable 
            style={[styles.testButton, isLoading && styles.disabledButton]} 
            onPress={testPermissions}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Permissions</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.testButton, isLoading && styles.disabledButton]} 
            onPress={testImmediateNotification}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Immediate</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.testButton, isLoading && styles.disabledButton]} 
            onPress={testScheduledNotification}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Scheduled (5s)</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.testButton, isLoading && styles.disabledButton]} 
            onPress={listScheduledNotifications}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>List Scheduled</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.testButton, isLoading && styles.disabledButton]} 
            onPress={testCustomReminders}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Custom Reminders</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.testButton, styles.dangerButton, isLoading && styles.disabledButton]} 
            onPress={clearAllNotifications}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Clear All Notifications</Text>
          </Pressable>
        </View>

        {/* Debug Output */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Output:</Text>
          {debugInfo.length === 0 ? (
            <Text style={styles.debugText}>No debug information yet. Run a test to see output.</Text>
          ) : (
            debugInfo.map((info, index) => (
              <Text key={index} style={styles.debugText}>{info}</Text>
            ))
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  clearButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  debugTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  debugText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});
