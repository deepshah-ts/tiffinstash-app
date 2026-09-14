import { Platform } from 'react-native';
import { reminderRequests } from '../../lib/core.cjs';
// Loaded on demand. No push token or user identifier is sent to any server.
const PREFIX = 'ts-meal-reminder-';
export async function reminderIsEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const N = await import('expo-notifications');
  const [pending, permission] = await Promise.all([N.getAllScheduledNotificationsAsync(), N.getPermissionsAsync()]);
  return permission.granted && pending.some(p => p.identifier.startsWith(PREFIX));
}
export async function disableReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const N = await import('expo-notifications');
  const pending = await N.getAllScheduledNotificationsAsync();
  await Promise.all(pending.filter(p => p.identifier.startsWith(PREFIX)).map(p => N.cancelScheduledNotificationAsync(p.identifier)));
}
export async function enableReminders(hour: number, minute: number): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Local notifications are available in the iPhone and Android app, not this browser preview.');
  const N = await import('expo-notifications');
  if (Platform.OS === 'android') await N.setNotificationChannelAsync('meal-reminders', {name:'Personal meal reminders', importance:N.AndroidImportance.DEFAULT});
  let permission = await N.getPermissionsAsync();
  if (!permission.granted) permission = await N.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notifications are not allowed. Enable them in your phone settings to use this optional reminder.');
  await disableReminders();
  try {
    for (const item of reminderRequests(hour, minute)) {
      await N.scheduleNotificationAsync({
        identifier:item.identifier,
        content:item.content,
        trigger:{type:N.SchedulableTriggerInputTypes.WEEKLY, ...item.trigger, channelId:'meal-reminders'}
      });
    }
  } catch (error) { await disableReminders(); throw error; }
}
