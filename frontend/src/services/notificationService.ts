
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "../config/firebase";

export type NotificationType =
  | "upcoming"
  | "missed"
  | "rescheduled";

export interface StudyNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  sessionId: string;
  read: boolean;
  scheduledFor: string | null;
  createdAt: unknown;
  readAt?: unknown;
}

export interface NotificationPreferences {
  enabled: boolean;
  browserEnabled: boolean;
  reminderMinutesBefore: 5 | 10 | 15 | 30;
  missedSessionNotifications: boolean;
  timezone: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  browserEnabled: false,
  reminderMinutesBefore: 10,
  missedSessionNotifications: true,
  timezone: "Asia/Kolkata",
};

function notificationsCollection(uid: string) {
  return collection(db, "users", uid, "notifications");
}

function preferencesDocument(uid: string) {
  return doc(db, "users", uid, "settings", "notifications");
}

/**
 * Subscribe to the latest notifications for the signed-in user.
 */
export function subscribeToNotifications(
  uid: string,
  callback: (notifications: StudyNotification[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const notificationsQuery = query(
    notificationsCollection(uid),
    orderBy("createdAt", "desc"),
    limit(50),
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const notifications = snapshot.docs.map((notificationDoc) => {
        const data = notificationDoc.data();

        const type: NotificationType =
          data.type === "missed" || data.type === "rescheduled"
            ? data.type
            : "upcoming";

        return {
          id: notificationDoc.id,
          type,
          title:
            typeof data.title === "string" ? data.title : "Study reminder",
          message:
            typeof data.message === "string" ? data.message : "",
          sessionId:
            typeof data.sessionId === "string" ? data.sessionId : "",
          read: data.read === true,
          scheduledFor:
            typeof data.scheduledFor === "string"
              ? data.scheduledFor
              : null,
          createdAt: data.createdAt ?? null,
          readAt: data.readAt ?? null,
        };
      });

      callback(notifications);
    },
    (error) => {
      console.error("[Notifications] Failed to subscribe:", error);
      onError?.(error);
    },
  );
}

/**
 * Load the current user's notification preferences.
 */
export async function getNotificationPreferences(
  uid: string,
): Promise<NotificationPreferences> {
  const snapshot = await getDoc(preferencesDocument(uid));

  if (!snapshot.exists()) {
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        DEFAULT_NOTIFICATION_PREFERENCES.timezone,
    };
  }

  const data = snapshot.data();

  const allowedReminderTimes = [5, 10, 15, 30] as const;
  const reminderMinutesBefore =
    allowedReminderTimes.find(
      (value) => value === data.reminderMinutesBefore,
    ) ?? DEFAULT_NOTIFICATION_PREFERENCES.reminderMinutesBefore;

  return {
    enabled:
      typeof data.enabled === "boolean"
        ? data.enabled
        : DEFAULT_NOTIFICATION_PREFERENCES.enabled,
    browserEnabled:
      typeof data.browserEnabled === "boolean"
        ? data.browserEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.browserEnabled,
    reminderMinutesBefore,
    missedSessionNotifications:
      typeof data.missedSessionNotifications === "boolean"
        ? data.missedSessionNotifications
        : DEFAULT_NOTIFICATION_PREFERENCES.missedSessionNotifications,
    timezone:
      typeof data.timezone === "string" && data.timezone.trim()
        ? data.timezone
        : DEFAULT_NOTIFICATION_PREFERENCES.timezone,
  };
}

/**
 * Save preferences to the signed-in user's Firestore settings.
 */
export async function saveNotificationPreferences(
  uid: string,
  preferences: NotificationPreferences,
): Promise<void> {
  await setDoc(
    preferencesDocument(uid),
    {
      ...preferences,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Mark one notification as read.
 */
export async function markNotificationAsRead(
  uid: string,
  notificationId: string,
): Promise<void> {
  await updateDoc(
    doc(notificationsCollection(uid), notificationId),
    {
      read: true,
      readAt: serverTimestamp(),
    },
  );
}

/**
 * Mark all currently unread notifications as read.
 */
export async function markAllNotificationsAsRead(
  uid: string,
  unreadNotifications: StudyNotification[],
): Promise<void> {
  const unread = unreadNotifications.filter(
    (notification) => !notification.read,
  );

  if (unread.length === 0) return;

  // Firestore batches support at most 500 writes.
  for (let offset = 0; offset < unread.length; offset += 500) {
    const batch = writeBatch(db);
    const chunk = unread.slice(offset, offset + 500);

    for (const notification of chunk) {
      batch.update(doc(notificationsCollection(uid), notification.id), {
        read: true,
        readAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }
}

/**
 * Request browser notification permission from an explicit user action.
 */
export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  return Notification.requestPermission();
}

/**
 * Display a browser notification when the browser supports it
 * and the user has granted permission.
 */
export function showBrowserNotification(
  title: string,
  message: string,
  onClick?: () => void,
): boolean {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return false;
  }

  try {
    const notification = new Notification(title, {
      body: message,
      icon: "/favicon.svg",
      tag: `brainscribe-${title}-${message}`,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    return true;
  } catch (error) {
    console.error(
      "[Notifications] Browser notification failed:",
      error,
    );
    return false;
  }
}
