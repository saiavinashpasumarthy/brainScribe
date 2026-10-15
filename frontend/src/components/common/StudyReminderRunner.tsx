import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { startStudyReminderEngine } from "../../services/studyReminderEngine";

export default function StudyReminderRunner() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user?.uid) {
      return;
    }

    const stopReminderEngine = startStudyReminderEngine({
      uid: user.uid,
      onError: (error) => {
        console.error("[BrainScribe] Study reminders:", error);
      },
      onReminder: (notification) => {
        console.info(
          "[BrainScribe] Reminder created:",
          notification.title,
        );
      },
    });

    return stopReminderEngine;
  }, [user?.uid, loading]);

  return null;
}
