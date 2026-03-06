import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/hooks/use-session';
import { useSubscription } from '@/hooks/use-subscription';
import { TIERS } from '@/constants/tiers';
import { getLeads, leadNeedsFollowUp, type Lead } from '@/lib/leads';
import {
  registerForPushNotifications,
  savePushToken,
  removePushToken,
  cancelAllScheduled,
  scheduleFollowUpReminders,
  scheduleWeeklySummary,
} from '@/lib/notifications';

const NOTIF_PREF_KEY = 'notifications_enabled';

export type NotificationContextType = {
  notificationsEnabled: boolean;
  toggleNotifications: () => Promise<void>;
  pushToken: string | null;
};

export const NotificationContext = createContext<NotificationContextType>({
  notificationsEnabled: true,
  toggleNotifications: async () => {},
  pushToken: null,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { tier } = useSubscription();
  const router = useRouter();
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    SecureStore.getItemAsync(NOTIF_PREF_KEY).then((val) => {
      if (val === 'false') setEnabled(false);
    });
  }, []);

  const registerToken = useCallback(async () => {
    if (!user || !enabled || Platform.OS === 'web') return;
    try {
      const token = await registerForPushNotifications();
      if (token) {
        setPushToken(token);
        await savePushToken(user.id, token);
      }
    } catch {
      // Permission denied or not a device
    }
  }, [user, enabled]);

  useEffect(() => {
    registerToken();
  }, [registerToken]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'new_lead' && data?.leadId) {
          router.push(`/(app)/lead-detail?id=${data.leadId}`);
        } else if (data?.type === 'follow_up' && data?.leadId) {
          router.push(`/(app)/lead-detail?id=${data.leadId}`);
        } else if (data?.type === 'weekly_summary') {
          router.push('/(app)/(tabs)');
        }
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);

  const scheduleLocalNotifications = useCallback(async () => {
    if (!user || !enabled || Platform.OS === 'web') return;

    await cancelAllScheduled();

    try {
      const leads = await getLeads(user.id);

      const tierLimits = TIERS[tier];
      if (tierLimits.hasFollowUpReminders) {
        const needsFollowUp = leads.filter(leadNeedsFollowUp);
        if (needsFollowUp.length > 0) {
          await scheduleFollowUpReminders(needsFollowUp, t);
        }
      }

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentLeads = leads.filter(
        (l) => new Date(l.created_at) >= weekAgo,
      );
      const bookings = recentLeads.filter(
        (l) => l.status === 'booked' || l.status === 'closed',
      ).length;
      const revenue = recentLeads.reduce(
        (sum, l) => sum + (l.revenue ?? 0),
        0,
      );

      await scheduleWeeklySummary(
        { leads: recentLeads.length, bookings, revenue },
        t,
      );
    } catch {
      // Silently fail
    }
  }, [user, enabled, tier, t]);

  useEffect(() => {
    scheduleLocalNotifications();
  }, [scheduleLocalNotifications]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        scheduleLocalNotifications();
      }
    });
    return () => subscription.remove();
  }, [scheduleLocalNotifications]);

  const toggleNotifications = useCallback(async () => {
    const newValue = !enabled;
    setEnabled(newValue);
    await SecureStore.setItemAsync(NOTIF_PREF_KEY, String(newValue));

    if (!newValue) {
      await cancelAllScheduled();
      if (pushToken && user) {
        await removePushToken(user.id, pushToken);
      }
    } else {
      await registerToken();
      await scheduleLocalNotifications();
    }
  }, [enabled, pushToken, user, registerToken, scheduleLocalNotifications]);

  return (
    <NotificationContext.Provider
      value={{ notificationsEnabled: enabled, toggleNotifications, pushToken }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
