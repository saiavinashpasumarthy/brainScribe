import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Clock3,
  ChartNoAxesCombined,
  NotebookPen,
  Settings,
  LogOut,
  Plus,
  ArrowUpRight,
  Flame,
  Target,
  BrainCircuit,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
  Pencil,
  Trash2,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { logoutUser } from "../services/authService";
import { useTheme } from "../contexts/ThemeContext";
import { db } from "../config/firebase";

type FocusSession = {
  id: string;
  subject: string;
  duration: number;
  completedAt: Date;
};

type StudySession = {
  id: string;
  title: string;
  subject: string;
  duration: number;
  date: Date | null;
  completed: boolean;
};

type SubjectRecord = {
  id: string;
  name: string;
  progress: number;
  topicsCompleted: number;
  totalTopics: number;
  color: string;
};

type ExamRecord = {
  id: string;
  subject: string;
  date: Date;
  color: string;
  examTime: string;
  venue: string;
  notes: string;
};

type ExamForm = {
  subject: string;
  examDate: string;
  examTime: string;
  venue: string;
  notes: string;
};

const emptyExamForm: ExamForm = {
  subject: "",
  examDate: "",
  examTime: "",
  venue: "",
  notes: "",
};

const navigation = [
  { label: "Overview", icon: LayoutDashboard, route: "/dashboard" },
  { label: "My Subjects", icon: BookOpen, route: "/subjects" },
  { label: "Study Schedule", icon: CalendarDays, route: "/schedule" },
  { label: "Focus Sessions", icon: Clock3, route: "/focus" },
  { label: "Analytics", icon: ChartNoAxesCombined, route: "/analytics" },
  { label: "Notes & Resources", icon: NotebookPen, route: "/notes" },
];

const subjectColors = ["#4f9cf9", "#9c8bff", "#50d6b1", "#f6a65b"];

function toDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    return date instanceof Date && !Number.isNaN(date.getTime())
      ? date
      : null;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDuration(data: Record<string, unknown>): number {
  const value = Number(data.durationMinutes ?? data.duration ?? 0);

  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getSubjectName(data: Record<string, unknown>): string {
  const value = data.subject ?? data.subjectName ?? data.name;

  return typeof value === "string" && value.trim()
    ? value.trim()
    : "General Study";
}

function getStudySessionDate(data: Record<string, unknown>): Date | null {
  return toDate(
    data.completedAt ?? data.date ?? data.scheduledAt ?? data.createdAt,
  );
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  return result;
}

function getMonday(date: Date): Date {
  const result = startOfDay(date);
  const day = result.getDay();

  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));

  return result;
}

function isSameDay(first: Date, second: Date): boolean {
  return first.toDateString() === second.toDateString();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);

  // Exam management state
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examForm, setExamForm] = useState<ExamForm>(emptyExamForm);
  const [examSaving, setExamSaving] = useState(false);
  const [examFormError, setExamFormError] = useState("");
  const [examToDelete, setExamToDelete] = useState<ExamRecord | null>(null);
  const [examDeleting, setExamDeleting] = useState(false);
  const [examDeleteError, setExamDeleteError] = useState("");

  const firstName = useMemo(() => {
    const name = user?.displayName?.trim();

    if (name) return name.split(/\s+/)[0];

    return user?.email?.split("@")[0] || "Student";
  }, [user]);

  // Subscribe to the signed-in user's dashboard data.
  useEffect(() => {
    if (!user?.uid) {
      setFocusSessions([]);
      setStudySessions([]);
      setSubjects([]);
      setExams([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setDataError(false);

    let completedInitialLoads = 0;
    const unsubscribers: Array<() => void> = [];

    const markLoaded = () => {
      completedInitialLoads += 1;

      if (completedInitialLoads >= 4) {
        setDataLoading(false);
      }
    };

    const handleError = (label: string, error: Error) => {
      console.error(`Failed to load dashboard ${label}:`, error);
      setDataError(true);
      markLoaded();
    };

    unsubscribers.push(
      onSnapshot(
        collection(db, "users", user.uid, "focusSessions"),
        (snapshot) => {
          const records: FocusSession[] = snapshot.docs.flatMap((document) => {
            const data = document.data();
            const completedAt = toDate(data.completedAt);

            if (!completedAt) return [];

            return [
              {
                id: document.id,
                subject: getSubjectName(data),
                duration: getDuration(data),
                completedAt,
              },
            ];
          });

          records.sort(
            (a, b) => b.completedAt.getTime() - a.completedAt.getTime(),
          );

          setFocusSessions(records);
          markLoaded();
        },
        (error) => handleError("focus sessions", error),
      ),
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, "users", user.uid, "studySessions"),
        (snapshot) => {
          const records: StudySession[] = snapshot.docs.map((document) => {
            const data = document.data();
            const rawTitle = data.title;

            return {
              id: document.id,
              title:
                typeof rawTitle === "string" && rawTitle.trim()
                  ? rawTitle.trim()
                  : getSubjectName(data),
              subject: getSubjectName(data),
              duration: getDuration(data),
              date: getStudySessionDate(data),
              completed: data.completed === true,
            };
          });

          setStudySessions(records);
          markLoaded();
        },
        (error) => handleError("study schedule", error),
      ),
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, "users", user.uid, "subjects"),
        (snapshot) => {
          const records: SubjectRecord[] = snapshot.docs.map(
            (document, index) => {
              const data = document.data();
              const rawName = data.name ?? data.title;
              const name =
                typeof rawName === "string" && rawName.trim()
                  ? rawName.trim()
                  : "Untitled subject";

              const rawCompleted = Number(
                data.topicsCompleted ?? data.completedTopics ?? 0,
              );
              const rawTotal = Number(data.totalTopics ?? data.topicCount ?? 0);

              const topicsCompleted =
                Number.isFinite(rawCompleted) && rawCompleted > 0
                  ? rawCompleted
                  : 0;

              const totalTopics =
                Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : 0;

              const suppliedProgress = Number(data.progress ?? 0);

              const progress =
                totalTopics > 0
                  ? Math.round(
                      Math.min(100, (topicsCompleted / totalTopics) * 100),
                    )
                  : Number.isFinite(suppliedProgress)
                    ? Math.max(
                        0,
                        Math.min(100, Math.round(suppliedProgress)),
                      )
                    : 0;

              return {
                id: document.id,
                name,
                progress,
                topicsCompleted,
                totalTopics,
                color: subjectColors[index % subjectColors.length],
              };
            },
          );

          setSubjects(records);
          markLoaded();
        },
        (error) => handleError("subjects", error),
      ),
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, "users", user.uid, "exams"),
        (snapshot) => {
          const records: ExamRecord[] = snapshot.docs.flatMap(
            (document, index) => {
              const data = document.data();
              const date = toDate(
                data.examDate ?? data.date ?? data.scheduledAt,
              );

              if (!date || date.getTime() < startOfDay(new Date()).getTime()) {
                return [];
              }

              return [
                {
                  id: document.id,
                  subject: getSubjectName(data),
                  date,
                  color: subjectColors[index % subjectColors.length],
                  examTime:
                    typeof data.examTime === "string" ? data.examTime : "",
                  venue: typeof data.venue === "string" ? data.venue : "",
                  notes: typeof data.notes === "string" ? data.notes : "",
                },
              ];
            },
          );

          records.sort((a, b) => a.date.getTime() - b.date.getTime());

          setExams(records);
          markLoaded();
        },
        (error) => handleError("exams", error),
      ),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user?.uid]);

  const weekData = useMemo(() => {
    const monday = getMonday(new Date());

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);

      const hours =
        focusSessions
          .filter((session) => isSameDay(session.completedAt, day))
          .reduce((total, session) => total + session.duration, 0) / 60;

      return {
        day: day.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase(),
        hours,
      };
    });
  }, [focusSessions]);

  const totalFocusMinutes = useMemo(
    () =>
      focusSessions.reduce((total, session) => total + session.duration, 0),
    [focusSessions],
  );

  const weeklyMinutes = useMemo(
    () => weekData.reduce((total, day) => total + day.hours * 60, 0),
    [weekData],
  );

  const completedToday = useMemo(
    () =>
      focusSessions.filter((session) =>
        isSameDay(session.completedAt, new Date()),
      ).length,
    [focusSessions],
  );

  const overallProgress = useMemo(() => {
    if (subjects.length === 0) return 0;

    return Math.round(
      subjects.reduce((total, subject) => total + subject.progress, 0) /
        subjects.length,
    );
  }, [subjects]);

  const streakDays = useMemo(() => {
    const activeDays = new Set(
      focusSessions.map((session) =>
        startOfDay(session.completedAt).getTime(),
      ),
    );

    let streak = 0;
    const today = startOfDay(new Date());

    // A streak can continue from today or yesterday.
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let cursor = activeDays.has(today.getTime()) ? today : yesterday;

    if (!activeDays.has(cursor.getTime())) return 0;

    while (activeDays.has(cursor.getTime())) {
      streak += 1;
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }, [focusSessions]);

  const upcomingExams = useMemo(() => {
    const today = startOfDay(new Date());

    return exams.slice(0, 3).map((exam) => {
      const examDay = startOfDay(exam.date);

      const days = Math.max(
        0,
        Math.ceil((examDay.getTime() - today.getTime()) / 86400000),
      );

      return { ...exam, days };
    });
  }, [exams]);

  function openAddExam() {
    setEditingExamId(null);
    setExamForm(emptyExamForm);
    setExamFormError("");
    setExamModalOpen(true);
  }

  function openEditExam(exam: ExamRecord) {
    setEditingExamId(exam.id);

    setExamForm({
      subject: exam.subject,
      examDate: toDateInputValue(exam.date),
      examTime: exam.examTime,
      venue: exam.venue,
      notes: exam.notes,
    });

    setExamFormError("");
    setExamModalOpen(true);
  }

  function closeExamModal() {
    if (examSaving) return;

    setExamModalOpen(false);
    setEditingExamId(null);
    setExamForm(emptyExamForm);
    setExamFormError("");
  }

  async function handleSaveExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.uid || examSaving) return;

    const subject = examForm.subject.trim();

    if (!subject || !examForm.examDate) {
      setExamFormError("Enter an exam name and date.");
      return;
    }

    const [year, month, day] = examForm.examDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      setExamFormError("Enter a valid exam date.");
      return;
    }

    setExamSaving(true);
    setExamFormError("");

    try {
      const examsRef = collection(db, "users", user.uid, "exams");

      const payload = {
        subject,
        examDate: Timestamp.fromDate(date),
        examTime: examForm.examTime,
        venue: examForm.venue.trim(),
        notes: examForm.notes.trim(),
        updatedAt: Timestamp.now(),
      };

      if (editingExamId) {
        await updateDoc(
          doc(db, "users", user.uid, "exams", editingExamId),
          payload,
        );
      } else {
        await addDoc(examsRef, {
          ...payload,
          createdAt: Timestamp.now(),
        });
      }

      setExamModalOpen(false);
      setEditingExamId(null);
      setExamForm(emptyExamForm);
      setExamFormError("");
    } catch (error) {
      console.error("Failed to save exam:", error);
      setExamFormError("Couldn't save the exam. Please try again.");
    } finally {
      setExamSaving(false);
    }
  }

  function requestDeleteExam(exam: ExamRecord) {
    setExamToDelete(exam);
    setExamDeleteError("");
  }

  async function handleDeleteExam() {
    if (!user?.uid || !examToDelete || examDeleting) return;

    setExamDeleting(true);
    setExamDeleteError("");

    try {
      await deleteDoc(
        doc(db, "users", user.uid, "exams", examToDelete.id),
      );

      setExamToDelete(null);
    } catch (error) {
      console.error("Failed to delete exam:", error);
      setExamDeleteError("Couldn't delete this exam. Please try again.");
    } finally {
      setExamDeleting(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logoutUser();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
    }
  }

  const chartMaximum = Math.max(4, ...weekData.map((day) => day.hours));

  return (
    <main className="dashboard-shell">
      <div className="dashboard-ambient dashboard-ambient-one" />
      <div className="dashboard-ambient dashboard-ambient-two" />

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`dashboard-sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="dashboard-brand">
          <span className="dashboard-brand-icon">
            <BrainCircuit size={23} />
          </span>

          <span>
            Brain<span>Scribe</span>
          </span>

          <button
            type="button"
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <p className="sidebar-section-label">WORKSPACE</p>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon, route }) => (
            <button
              type="button"
              key={label}
              className={`sidebar-link ${
                route === "/dashboard" ? "active" : ""
              }`}
              aria-current={route === "/dashboard" ? "page" : undefined}
              onClick={() => {
                setSidebarOpen(false);
                navigate(route);
              }}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {route === "/dashboard" && (
                <span className="nav-active-indicator" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="sidebar-tip-icon">
              <BrainCircuit size={18} />
            </span>
            <p>Little progress each day adds up to big results.</p>
            <span className="tip-decoration">✳</span>
          </div>

          <button
            type="button"
            className="sidebar-link"
            onClick={() => {
              setSidebarOpen(false);
              navigate("/settings");
            }}
          >
            <Settings size={19} strokeWidth={1.8} />
            <span>Settings</span>
          </button>

          <div className="sidebar-profile">
            <div className="profile-avatar">
              {firstName.charAt(0).toUpperCase()}
            </div>

            <div className="profile-info">
              <strong>{firstName}</strong>
              <span>Student workspace</span>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
            >
              <Menu size={21} />
            </button>

            <div>
              <span className="breadcrumb">
                WORKSPACE <ChevronRight size={13} /> OVERVIEW
              </span>
              <h2>Your dashboard</h2>
            </div>
          </div>

          <div className="topbar-actions">
            <span className="topbar-date">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>

            <button
              type="button"
              className="dashboard-theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${
                theme === "dark" ? "light" : "dark"
              } mode`}
              title={`Switch to ${
                theme === "dark" ? "light" : "dark"
              } mode`}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="dashboard-welcome">
            <div>
              <span className="welcome-kicker">
                <span className="welcome-live-dot" /> YOUR LEARNING SPACE
              </span>
              <h1>
                Hey, {firstName}<span className="wave">✳</span>
              </h1>
              <p>Every focused session moves you closer to your goals.</p>
            </div>

            <button
              type="button"
              className="primary-dashboard-button"
              onClick={() => navigate("/subjects")}
            >
              <Plus size={18} /> Add a subject
            </button>
          </section>

          {dataError && (
            <p role="alert" className="chart-disclaimer">
              Some dashboard data could not be loaded. Check your Firestore
              permissions and collection paths.
            </p>
          )}

          <section className="dashboard-stat-grid" aria-label="Study overview">
            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon blue">
                  <Clock3 size={19} />
                </span>
                <span className="stat-label">STUDY TIME</span>
              </div>
              <div className="stat-value">
                {(weeklyMinutes / 60).toFixed(1)} <span>hrs</span>
              </div>
              <p className="stat-caption">
                {dataLoading
                  ? "Loading your activity…"
                  : "Completed focus time this week"}
              </p>
              <div className="stat-bottom-line">
                <span
                  style={{
                    width: `${Math.min((weeklyMinutes / 1200) * 100, 100)}%`,
                  }}
                />
              </div>
            </article>

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon purple">
                  <BookOpen size={19} />
                </span>
                <span className="stat-label">ACTIVE SUBJECTS</span>
              </div>
              <div className="stat-value">
                {String(subjects.length).padStart(2, "0")}
              </div>
              <p className="stat-caption">Subjects in your workspace</p>
              <div className="stat-mini-tags">
                {subjects.length > 0 ? (
                  subjects.slice(0, 3).map((subject) => (
                    <span key={subject.id}>
                      {subject.name
                        .split(/\s+/)
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 4)
                        .toUpperCase()}
                    </span>
                  ))
                ) : (
                  <span>None yet</span>
                )}
              </div>
            </article>

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon green">
                  <Target size={19} />
                </span>
                <span className="stat-label">TOPIC PROGRESS</span>
              </div>
              <div className="stat-value">
                {overallProgress}<span>%</span>
              </div>
              <p className="stat-caption">Average progress across subjects</p>
              <div className="stat-bottom-line">
                <span style={{ width: `${overallProgress}%` }} />
              </div>
            </article>

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon orange">
                  <Flame size={19} />
                </span>
                <span className="stat-label">STUDY STREAK</span>
              </div>
              <div className="stat-value">
                {String(streakDays).padStart(2, "0")} <span>days</span>
              </div>
              <p className="stat-caption">
                Consecutive days with completed focus sessions
              </p>
              <div
                className="streak-dots"
                aria-label={`${streakDays} day streak`}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <span
                    key={day}
                    className={
                      day <= Math.min(streakDays, 7) ? "streak-complete" : ""
                    }
                  />
                ))}
              </div>
            </article>
          </section>

          <section className="dashboard-grid-main">
            <article className="dashboard-card activity-card">
              <div className="card-heading">
                <div>
                  <span className="card-eyebrow">YOUR CONSISTENCY</span>
                  <h3>Study activity</h3>
                  <p>Hours studied across the week</p>
                </div>
                <span className="chart-badge">WEEKLY VIEW</span>
              </div>

              <div className="activity-summary">
                <strong>
                  {(weeklyMinutes / 60).toFixed(1)} <span>hours</span>
                </strong>
                <span className="activity-note">
                  <span />{" "}
                  {dataLoading ? "Loading activity" : "Tracked focus sessions"}
                </span>
              </div>

              <div className="study-chart">
                <div className="chart-guides">
                  {[4, 3, 2, 1, 0].map((tick) => (
                    <div className="chart-guide" key={tick}>
                      <span>{tick}h</span>
                      <i />
                    </div>
                  ))}
                </div>

                <div className="chart-bars">
                  {weekData.map((item, index) => (
                    <div className="chart-column" key={item.day}>
                      <div className="chart-bar-space">
                        <div
                          className={`chart-bar ${
                            index === new Date().getDay() % 7
                              ? "chart-bar-highlight"
                              : ""
                          }`}
                          style={{
                            height: `${
                              item.hours === 0
                                ? 0
                                : Math.max(
                                    3,
                                    (item.hours / chartMaximum) * 100,
                                  )
                            }%`,
                          }}
                          title={`${item.hours.toFixed(1)} hours`}
                        >
                          <span className="bar-tooltip">
                            {item.hours.toFixed(1)}h
                          </span>
                        </div>
                      </div>
                      <span className="chart-day">{item.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {focusSessions.length === 0 && (
                <p className="chart-disclaimer">
                  Your activity will appear here after you complete a focus
                  session.
                </p>
              )}
            </article>

            <article className="dashboard-card focus-card">
              <div className="card-heading">
                <div>
                  <span className="card-eyebrow">MAKE IT COUNT</span>
                  <h3>Time to focus</h3>
                  <p>Give one task your full attention.</p>
                </div>
                <span className="focus-card-icon">
                  <Clock3 size={20} />
                </span>
              </div>

              <div className="focus-visual">
                <div className="focus-ring focus-ring-outer" />
                <div className="focus-ring focus-ring-inner" />
                <div className="focus-center">
                  <BrainCircuit size={29} />
                  <strong>25:00</strong>
                  <span>MINUTES</span>
                </div>
                <span className="focus-orbit-dot" />
              </div>

              <div className="focus-card-bottom">
                <p>
                  {completedToday > 0
                    ? `${completedToday} focus session${
                        completedToday === 1 ? "" : "s"
                      } completed today.`
                    : "One session. One clear goal."}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/focus")}
                  className="focus-start-button"
                >
                  Start a session <ArrowUpRight size={17} />
                </button>
              </div>
            </article>
          </section>

          <section className="dashboard-grid-bottom">
            <article className="dashboard-card subjects-card">
              <div className="card-heading compact-heading">
                <div>
                  <span className="card-eyebrow">KEEP MOVING FORWARD</span>
                  <h3>Your subjects</h3>
                </div>
                <button
                  type="button"
                  className="text-action"
                  onClick={() => navigate("/subjects")}
                >
                  View all <ArrowUpRight size={15} />
                </button>
              </div>

              <div className="subject-list">
                {subjects.length > 0 ? (
                  subjects.slice(0, 4).map((subject) => (
                    <div className="subject-row" key={subject.id}>
                      <div
                        className="subject-symbol"
                        style={{
                          color: subject.color,
                          background: `${subject.color}16`,
                        }}
                      >
                        <BookOpen size={18} />
                      </div>
                      <div className="subject-main">
                        <div className="subject-title-row">
                          <strong>{subject.name}</strong>
                          <span>{subject.progress}%</span>
                        </div>
                        <div className="subject-progress">
                          <span
                            style={{
                              width: `${subject.progress}%`,
                              background: subject.color,
                            }}
                          />
                        </div>
                        <span className="subject-detail">
                          {subject.totalTopics > 0
                            ? `${subject.topicsCompleted} of ${subject.totalTopics} topics`
                            : "Topic progress not set"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="focus-history-empty">
                    <span>
                      <BookOpen size={24} />
                    </span>
                    <h4>No subjects yet</h4>
                    <p>
                      Add a subject to start tracking your learning progress.
                    </p>
                    <button
                      type="button"
                      className="text-action"
                      onClick={() => navigate("/subjects")}
                    >
                      Add a subject <ArrowUpRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            </article>

            <article className="dashboard-card exams-card">
              <div className="card-heading compact-heading">
                <div>
                  <span className="card-eyebrow">PLAN AHEAD</span>
                  <h3>Upcoming exams</h3>
                </div>

                <button
                  type="button"
                  className="text-action"
                  onClick={openAddExam}
                >
                  <Plus size={15} /> Add exam
                </button>
              </div>

              <div className="exam-list">
                {upcomingExams.length > 0 ? (
                  upcomingExams.map((exam) => (
                    <div className="exam-row" key={exam.id}>
                      <div className="exam-date-box">
                        <span>{exam.date.getDate()}</span>
                        <strong>
                          {exam.date.toLocaleDateString("en-IN", {
                            month: "short",
                          })}
                        </strong>
                      </div>

                      <div className="exam-main">
                        <strong>{exam.subject}</strong>
                        <span>
                          <i style={{ background: exam.color }} />
                          {exam.days === 0
                            ? "Today"
                            : `${exam.days} day${
                                exam.days === 1 ? "" : "s"
                              } away`}
                        </span>

                        {exam.examTime && <small>{exam.examTime}</small>}
                        {exam.venue && <small>{exam.venue}</small>}
                      </div>

                      <div className="exam-actions">
                        <button
                          type="button"
                          aria-label={`Edit ${exam.subject}`}
                          title="Edit exam"
                          onClick={() => openEditExam(exam)}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="exam-delete-action"
                          aria-label={`Delete ${exam.subject}`}
                          title="Delete exam"
                          onClick={() => requestDeleteExam(exam)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="focus-history-empty">
                    <span>
                      <CalendarDays size={24} />
                    </span>
                    <h4>No upcoming exams</h4>
                    <p>Exam dates you add will appear here.</p>
                    <button
                      type="button"
                      className="text-action"
                      onClick={openAddExam}
                    >
                      <Plus size={15} /> Add your first exam
                    </button>
                  </div>
                )}
              </div>
            </article>
          </section>

          <footer className="dashboard-footer">
            <span>
              BrainScribe <span>·</span> Think smarter. Study better.
            </span>
            <span>
              One focused step at a time{" "}
              <span className="footer-spark">✳</span>
            </span>
          </footer>
        </div>

        {/* Add / edit exam modal */}
        {examModalOpen && (
          <div
            className="exam-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !examSaving) {
                closeExamModal();
              }
            }}
          >
            <section
              className="exam-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="exam-modal-title"
            >
              <header className="exam-modal-heading">
                <div>
                  <span className="card-eyebrow">YOUR TIMETABLE</span>
                  <h2 id="exam-modal-title">
                    {editingExamId ? "Edit exam" : "Add an exam"}
                  </h2>
                  <p>Keep your important exam details in one place.</p>
                </div>

                <button
                  type="button"
                  className="exam-modal-close"
                  aria-label="Close dialog"
                  disabled={examSaving}
                  onClick={closeExamModal}
                >
                  <X size={19} />
                </button>
              </header>

              <form className="exam-form" onSubmit={handleSaveExam}>
                <label>
                  Subject / exam name *
                  <input
                    required
                    maxLength={100}
                    value={examForm.subject}
                    onChange={(event) =>
                      setExamForm({
                        ...examForm,
                        subject: event.target.value,
                      })
                    }
                    placeholder="e.g. Database Management Systems"
                  />
                </label>

                <label>
                  Exam date *
                  <input
                    type="date"
                    required
                    value={examForm.examDate}
                    onChange={(event) =>
                      setExamForm({
                        ...examForm,
                        examDate: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Exam time
                  <input
                    type="time"
                    value={examForm.examTime}
                    onChange={(event) =>
                      setExamForm({
                        ...examForm,
                        examTime: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Venue / room
                  <input
                    maxLength={150}
                    value={examForm.venue}
                    onChange={(event) =>
                      setExamForm({
                        ...examForm,
                        venue: event.target.value,
                      })
                    }
                    placeholder="e.g. Block A, Room 204"
                  />
                </label>

                <label>
                  Notes
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={examForm.notes}
                    onChange={(event) =>
                      setExamForm({
                        ...examForm,
                        notes: event.target.value,
                      })
                    }
                    placeholder="Optional revision reminders"
                  />
                </label>

                {examFormError && (
                  <p className="exam-form-error" role="alert">
                    {examFormError}
                  </p>
                )}

                <footer className="exam-form-actions">
                  <button
                    type="button"
                    className="exam-cancel-button"
                    disabled={examSaving}
                    onClick={closeExamModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-dashboard-button"
                    disabled={examSaving}
                  >
                    {examSaving
                      ? "Saving..."
                      : editingExamId
                        ? "Save changes"
                        : "Add exam"}
                  </button>
                </footer>
              </form>
            </section>
          </div>
        )}

        {/* Delete confirmation modal */}
        {examToDelete && (
          <div
            className="exam-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !examDeleting) {
                setExamToDelete(null);
                setExamDeleteError("");
              }
            }}
          >
            <section
              className="exam-modal exam-delete-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-exam-title"
              aria-describedby="delete-exam-description"
            >
              <header className="exam-modal-heading">
                <div>
                  <span className="card-eyebrow">CONFIRM ACTION</span>
                  <h2 id="delete-exam-title">Delete this exam?</h2>
                  <p id="delete-exam-description">
                    You’re about to remove{" "}
                    <strong>{examToDelete.subject}</strong> from your timetable.
                    This action cannot be undone.
                  </p>
                </div>

                <button
                  type="button"
                  className="exam-modal-close"
                  aria-label="Close confirmation"
                  disabled={examDeleting}
                  onClick={() => {
                    setExamToDelete(null);
                    setExamDeleteError("");
                  }}
                >
                  <X size={19} />
                </button>
              </header>

              {examDeleteError && (
                <p className="exam-form-error" role="alert">
                  {examDeleteError}
                </p>
              )}

              <footer className="exam-form-actions">
                <button
                  type="button"
                  className="exam-cancel-button"
                  disabled={examDeleting}
                  onClick={() => {
                    setExamToDelete(null);
                    setExamDeleteError("");
                  }}
                >
                  Keep exam
                </button>

                <button
                  type="button"
                  className="exam-confirm-delete-button"
                  disabled={examDeleting}
                  onClick={() => void handleDeleteExam()}
                >
                  <Trash2 size={15} />
                  {examDeleting ? "Deleting..." : "Delete exam"}
                </button>
              </footer>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}