import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';
import type { Lead } from './leads';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F766E',
    });
  }

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return tokenData.data;
}

export async function savePushToken(
  userId: string,
  token: string,
): Promise<void> {
  await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform: Platform.OS },
    { onConflict: 'user_id,token' },
  );
}

export async function removePushToken(
  userId: string,
  token: string,
): Promise<void> {
  await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);
}

export async function cancelAllScheduled(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleFollowUpReminders(
  leads: Lead[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): Promise<void> {
  for (const lead of leads) {
    const displayName = lead.name ?? '—';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notifications.followUpTitle'),
        body: t('notifications.followUpBody', { name: displayName }),
        data: { type: 'follow_up', leadId: lead.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
        repeats: false,
      },
    });
  }
}

function getSecondsUntilNextSunday10am(): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  let daysUntilSunday = 7 - dayOfWeek;
  if (daysUntilSunday === 7) daysUntilSunday = 0;
  if (daysUntilSunday === 0 && now.getHours() >= 10) daysUntilSunday = 7;

  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(10, 0, 0, 0);

  return Math.max(60, Math.floor((nextSunday.getTime() - now.getTime()) / 1000));
}

export async function scheduleWeeklySummary(
  stats: { leads: number; bookings: number; revenue: number },
  t: (key: string, opts?: Record<string, unknown>) => string,
): Promise<void> {
  const seconds = getSecondsUntilNextSunday10am();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notifications.weeklySummaryTitle'),
      body: t('notifications.weeklySummaryBody', {
        leads: stats.leads,
        bookings: stats.bookings,
        revenue: stats.revenue,
      }),
      data: { type: 'weekly_summary' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  });
}
