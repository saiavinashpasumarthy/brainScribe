import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
} from "firebase/firestore";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  History,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";

type PlanSession = {
  title?: string;
  subject?: string;
  date?: string;
  startTime?: string;
  duration?: number;
  priority?: string;
  notes?: string;
  completed?: boolean;
};

type StudyPlanHistoryItem = {
  id: string;
  title?: string;
  mode?: "daily" | "weekly" | "syllabus";
  startDate?: string;
  endDate?: string;
  subjects?: string[];
  sessionCount?: number;
  sessions?: PlanSession[];
  warning?: string;
  provider?: string;
  createdAt?: {
    toDate?: () => Date;
  };
};

function formatDate(value?: string) {
  if (!value) return "Not specified";

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function formatCreatedAt(timestamp?: StudyPlanHistoryItem["createdAt"]) {
  if (!timestamp?.toDate) return "Recently saved";

  return timestamp.toDate().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StudyPlanHistory() {
  const { user } = useAuth();

  const [plans, setPlans] = useState<StudyPlanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setPlans([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const historyRef = collection(
      db,
      "users",
      user.uid,
      "studyPlanHistory",
    );

    const unsubscribe = onSnapshot(
      query(historyRef),
      (snapshot) => {
        const savedPlans = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as StudyPlanHistoryItem[];

        savedPlans.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.().getTime() ?? 0;
          const dateB = b.createdAt?.toDate?.().getTime() ?? 0;

          return dateB - dateA;
        });

        setPlans(savedPlans);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load study plan history:", err);
        setError("Couldn't load your history. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  const handleDelete = async (planId: string) => {
    if (!user?.uid) return;

    const confirmed = window.confirm(
      "Delete this saved study plan from your history? Your scheduled sessions will remain unchanged.",
    );

    if (!confirmed) return;

    setDeletingPlan(planId);
    setError("");

    try {
      await deleteDoc(
        doc(db, "users", user.uid, "studyPlanHistory", planId),
      );

      if (expandedPlan === planId) {
        setExpandedPlan(null);
      }
    } catch (err) {
      console.error("Failed to delete study plan history:", err);
      setError("Couldn't delete this plan. Please try again.");
    } finally {
      setDeletingPlan(null);
    }
  };

  return (
    <section className="study-history">
      <div className="study-history-heading">
        <div className="study-history-icon">
          <History size={21} />
        </div>

        <div>
          <h3>Study Plan History</h3>
          <p>
            Revisit your previously generated daily, weekly, and
            syllabus-based plans.
          </p>
        </div>

        {!loading && (
          <span className="study-history-count">
            {plans.length} {plans.length === 1 ? "plan" : "plans"}
          </span>
        )}
      </div>

      {error && (
        <div className="study-history-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="study-history-state" role="status">
          <LoaderCircle className="study-history-spinner" size={23} />
          <span>Loading your saved plans...</span>
        </div>
      ) : plans.length === 0 ? (
        <div className="study-history-empty">
          <BookOpen size={30} />
          <h4>No saved plans yet</h4>
          <p>
            Once you generate and save a study plan from your schedule,
            it will appear here.
          </p>
        </div>
      ) : (
        <div className="study-history-list">
          {plans.map((plan) => {
            const isExpanded = expandedPlan === plan.id;
            
const today = new Date();
today.setHours(0, 0, 0, 0);

const sessions = (plan.sessions ?? []).filter((session) => {
  if (!session.date || session.completed !== true) {
    return false;
  }

  const sessionDate = new Date(`${session.date}T00:00:00`);

  return (
    !Number.isNaN(sessionDate.getTime()) &&
    sessionDate < today
  );
});


            return (
              <article className="study-history-card" key={plan.id}>
                <div className="study-history-card-top">
                  <div className="study-history-plan-icon">
                    <CalendarDays size={19} />
                  </div>

                  <div className="study-history-plan-info">
                    <h4>
                      {plan.title || "Study Plan"}
                    </h4>

                    <p className="study-history-created">
                      Saved {formatCreatedAt(plan.createdAt)}
                    </p>
                  </div>

                  <span className="study-history-mode">
                    {plan.mode || "custom"}
                  </span>
                </div>

                <div className="study-history-meta">
                  <span>
                    <CalendarDays size={14} />
                    {formatDate(plan.startDate)}
                    {plan.endDate &&
                      plan.endDate !== plan.startDate &&
                      ` – ${formatDate(plan.endDate)}`}
                  </span>

                  <span>
                    <Clock3 size={14} />
                    {plan.sessionCount ?? sessions.length} sessions
                  </span>
                </div>

                {plan.subjects && plan.subjects.length > 0 && (
                  <div className="study-history-subjects">
                    {plan.subjects.map((subject) => (
                      <span key={subject}>{subject}</span>
                    ))}
                  </div>
                )}

                {plan.warning && (
                  <p className="study-history-warning">
                    {plan.warning}
                  </p>
                )}

                <div className="study-history-actions">
                  <button
                    type="button"
                    className="study-history-view"
                    onClick={() =>
                      setExpandedPlan(isExpanded ? null : plan.id)
                    }
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <>
                        Hide sessions <ChevronUp size={16} />
                      </>
                    ) : (
                      <>
                        View sessions <ChevronDown size={16} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="study-history-delete"
                    onClick={() => void handleDelete(plan.id)}
                    disabled={deletingPlan === plan.id}
                  >
                    {deletingPlan === plan.id ? (
                      <LoaderCircle
                        size={15}
                        className="study-history-spinner"
                      />
                    ) : (
                      <Trash2 size={15} />
                    )}
                    Delete
                  </button>
                </div>

                {isExpanded && (
                  <div className="study-history-sessions">
                    {sessions.length === 0 ? (
                      <p className="study-history-no-sessions">
                        Complete Sessions to watch history.
                      </p>
                    ) : (
                      sessions.map((session, index) => (
                        <div
                          className="study-history-session"
                          key={`${plan.id}-${index}`}
                        >
                          <div className="study-history-session-main">
                            <strong>
                              {session.title || "Study session"}
                            </strong>
                            <span>
                              {session.subject || "General"}
                            </span>
                          </div>

                          <div className="study-history-session-details">
                            <span>{formatDate(session.date)}</span>
                            {session.startTime && (
                              <span>{session.startTime}</span>
                            )}
                            {session.duration != null && (
                              <span>{session.duration} min</span>
                            )}
                          </div>

                          {session.notes && (
                            <p className="study-history-session-notes">
                              {session.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
