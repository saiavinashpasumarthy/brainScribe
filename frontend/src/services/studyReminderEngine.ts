import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "../config/firebase";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  showBrowserNotification,
  type NotificationPreferences,
  type NotificationType,
} from "./notificationService";

type StudySession = {
  id: string;
  title?: string;
  subject?: string;
  date: string;
  startTime: string;
  duration: number;
  completed: boolean;
};

type ReminderNotification = {
  type: NotificationType;
  title: string;
  message: string;
  sessionId: string;
  scheduledFor: string | null;
};

type StartReminderEngineOptions = {
  uid: string;
  onError?: (error: Error) => void;
  onReminder?: (notification: ReminderNotification) => void;
};

const CHECK_INTERVAL_MS = 15_000;
const SEEN_STORAGE_PREFIX = "brainscribe-reminders-v2";

let activeCleanup: (() => void) | null = null;

function localDateTimeToUtc(
  dateKey: string,
  timeKey: string,
  timezone: string,
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeKey)) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = timeKey.split(":").map(Number);

  const targetUtc = Date.UTC(year, month - 1, day, hour, minute);

  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    let guess = targetUtc;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const parts = formatter.formatToParts(new Date(guess));
      const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
      );

      const representedUtc = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
        Number(values.second),
      );

      const difference = targetUtc - representedUtc;

      if (difference === 0) {
        const result = new Date(guess);
        const check = formatter.formatToParts(result);
        const checkValues = Object.fromEntries(
          check.map((part) => [part.type, part.value]),
        );

        if (
          Number(checkValues.year) === year &&
          Number(checkValues.month) === month &&
          Number(checkValues.day) === day &&
          Number(checkValues.hour) === hour &&
          Number(checkValues.minute) === minute
        ) {
          return result;
        }

        return null;
      }

      guess += difference;
    }

    return null;
  } catch {
    return null;
  }
}

function getSessionStart(
  session: StudySession,
  timezone: string,
): Date | null {
  return localDateTimeToUtc(
    session.date,
    session.startTime,
    timezone,
  );
}

function readSeenIds(uid: string): Set<string> {
  try {
    const stored = window.localStorage.getItem(
      `${SEEN_STORAGE_PREFIX}:${uid}`,
    );

    const parsed: unknown = stored ? JSON.parse(stored) : [];

    if (!Array.isArray(parsed)) return new Set();

    return new Set(
      parsed.filter(
        (value): value is string => typeof value === "string",
      ),
    );
  } catch {
    return new Set();
  }
}

function rememberId(
  uid: string,
  seenIds: Set<string>,
  notificationId: string,
): void {
  seenIds.add(notificationId);

  while (seenIds.size > 500) {
    const oldest = seenIds.values().next().value;
    if (oldest === undefined) break;
    seenIds.delete(oldest);
  }

  try {
    window.localStorage.setItem(
      `${SEEN_STORAGE_PREFIX}:${uid}`,
      JSON.stringify([...seenIds]),
    );
  } catch {
    // Firestore remains the persistent record of notifications.
  }
}

function createNotificationId(
  type: NotificationType,
  session: StudySession,
  reminderMinutesBefore: number,
): string {
  const sessionKey = [
    session.id,
    session.date,
    session.startTime,
  ].join("_");

  // Firestore document IDs cannot contain "/".
  const safeSessionKey = sessionKey.replace(/\//g, "_");

  return type === "upcoming"
    ? `${type}_${safeSessionKey}_${reminderMinutesBefore}`
    : `${type}_${safeSessionKey}`;
}

async function persistNotification(
  uid: string,
  notificationId: string,
  notification: ReminderNotification,
): Promise<boolean> {
  const notificationRef = doc(
    db,
    "users",
    uid,
    "notifications",
    notificationId,
  );

  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(notificationRef);

    if (existing.exists()) {
      return false;
    }

    transaction.set(notificationRef, {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      sessionId: notification.sessionId,
      scheduledFor: notification.scheduledFor,
      read: false,
      createdAt: serverTimestamp(),
    });

    return true;
  });
}

function createReminder(
  uid: string,
  seenIds: Set<string>,
  reminderId: string,
  notification: ReminderNotification,
  preferences: NotificationPreferences,
  onReminder?: (notification: ReminderNotification) => void,
  onError?: (error: Error) => void,
): void {
  if (seenIds.has(reminderId)) return;

  // Prevent duplicate writes while the transaction is pending.
  rememberId(uid, seenIds, reminderId);

  void persistNotification(uid, reminderId, notification)
    .then((wasCreated) => {
      if (!wasCreated) return;

      if (
        preferences.browserEnabled &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        showBrowserNotification(
          notification.title,
          notification.message,
        );
      }

      onReminder?.(notification);
    })
    .catch((error: unknown) => {
      // Allow a later retry if Firestore rejected the write.
      seenIds.delete(reminderId);

      try {
        window.localStorage.setItem(
          `${SEEN_STORAGE_PREFIX}:${uid}`,
          JSON.stringify([...seenIds]),
        );
      } catch {
        // Ignore storage failures.
      }

      console.error(
        "[StudyReminders] Failed to save notification:",
        error,
      );

      onError?.(
        error instanceof Error
          ? error
          : new Error("Failed to save a study reminder."),
      );
    });
}

export function startStudyReminderEngine({
  uid,
  onError,
  onReminder,
}: StartReminderEngineOptions): Unsubscribe {
  stopStudyReminderEngine();

  let disposed = false;
  let sessions: StudySession[] = [];
  let preferences: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  };
  let seenIds = readSeenIds(uid);
  let preferencesLoaded = false;

  let intervalId: ReturnType<typeof setInterval> | undefined;
  let unsubscribeSessions: Unsubscribe | undefined;

  const reportError = (error: unknown) => {
    console.error("[StudyReminders]", error);

    onError?.(
      error instanceof Error
        ? error
        : new Error(
            "The study reminder engine encountered an error.",
          ),
    );
  };

  const checkReminders = () => {
    if (disposed || !preferencesLoaded || !preferences.enabled) {
      return;
    }

    const now = Date.now();

    for (const session of sessions) {
      if (
        session.completed ||
        !session.id ||
        !session.date ||
        !session.startTime ||
        !Number.isFinite(session.duration) ||
        session.duration <= 0
      ) {
        continue;
      }

      const start = getSessionStart(
        session,
        preferences.timezone,
      );

      if (!start) continue;

      const startMs = start.getTime();
      const endMs = startMs + session.duration * 60_000;

      const reminderAt =
        startMs -
        preferences.reminderMinutesBefore * 60_000;

      const sessionTitle =
        session.title || session.subject || "Your study session";

      // Upcoming reminders remain eligible until the session starts.
      // The deterministic ID prevents repeat notifications.
      if (now >= reminderAt && now < startMs) {
        const notificationId = createNotificationId(
          "upcoming",
          session,
          preferences.reminderMinutesBefore,
        );

        createReminder(
          uid,
          seenIds,
          notificationId,
          {
            type: "upcoming",
            title: "Study session coming up",
            message: `${sessionTitle} starts in ${preferences.reminderMinutesBefore} minutes.`,
            sessionId: session.id,
            scheduledFor: start.toISOString(),
          },
          preferences,
          onReminder,
          reportError,
        );
      }

      // Notify about incomplete sessions for up to 24 hours
      // after their scheduled end.
      if (
        preferences.missedSessionNotifications &&
        now >= endMs &&
        now - endMs <= 24 * 60 * 60 * 1000
      ) {
        const notificationId = createNotificationId(
          "missed",
          session,
          preferences.reminderMinutesBefore,
        );

        createReminder(
          uid,
          seenIds,
          notificationId,
          {
            type: "missed",
            title: "Study session missed",
            message: `${sessionTitle} has ended without being marked complete.`,
            sessionId: session.id,
            scheduledFor: start.toISOString(),
          },
          preferences,
          onReminder,
          reportError,
        );
      }
    }
  };

  const sessionsCollection = collection(
    db,
    "users",
    uid,
    "studySessions",
  );

  // Subscribe to real session data, including past sessions that
  // may qualify for missed-session notifications.
  unsubscribeSessions = onSnapshot(
    sessionsCollection,
    (snapshot) => {
      sessions = snapshot.docs.map((sessionDoc) => {
        const data = sessionDoc.data();

        return {
          id: sessionDoc.id,
          title:
            typeof data.title === "string"
              ? data.title
              : undefined,
          subject:
            typeof data.subject === "string"
              ? data.subject
              : undefined,
          date:
            typeof data.date === "string"
              ? data.date
              : "",
          startTime:
            typeof data.startTime === "string"
              ? data.startTime
              : "",
          duration:
            typeof data.duration === "number"
              ? data.duration
              : 0,
          completed: data.completed === true,
        };
      });

      checkReminders();
    },
    reportError,
  );

  // Load the user's saved preferences before scheduling reminders.
  void getNotificationPreferences(uid)
    .then((loadedPreferences) => {
      if (disposed) return;

      preferences = loadedPreferences;
      seenIds = readSeenIds(uid);
      preferencesLoaded = true;

      checkReminders();
    })
    .catch(reportError);

  intervalId = setInterval(
    checkReminders,
    CHECK_INTERVAL_MS,
  );

  const cleanup = () => {
    if (disposed) return;

    disposed = true;

    unsubscribeSessions?.();

    if (intervalId !== undefined) {
      clearInterval(intervalId);
    }
  };

  activeCleanup = cleanup;

  return cleanup;
}

export function stopStudyReminderEngine(): void {
  activeCleanup?.();
  activeCleanup = null;
}