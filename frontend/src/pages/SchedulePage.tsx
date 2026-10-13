import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type SelectHTMLAttributes,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  CalendarDays,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  Check,
  Circle,
  Pencil,
  Trash2,
  X,
  BookOpen,
  LayoutDashboard,
  Timer,
  ChartNoAxesCombined,
  FileText,
  LogOut,
  Menu,
  RefreshCw,
  AlertCircle,
  Flag,
  Upload,
  FileUp,
  CalendarClock,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import * as mammoth from "mammoth";
import { db, auth } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";

type Priority = "High" | "Medium" | "Low";
type ViewMode = "day" | "week";

type StudySession = {
  id: string;
  title: string;
  subject: string;
  date: string;
  startTime: string;
  duration: number;
  priority: Priority;
  completed: boolean;
  notes: string;
};

type SessionForm = Omit<StudySession, "id" | "completed">;

type GeneratedStudySession = Omit<StudySession, "id" | "completed">;


type GenerateStudyPlanResponse = {
  success: true;
  subjects?: string[];
  sessions: GeneratedStudySession[];
  provider?: "gemini" | "groq";
  warning?: string;
};


type GenerateStudyPlanRequest = {
  mode: "weekly" | "daily" | "syllabus";
  startDate: string;
  deadline?: string;
  syllabusText?: string;
};

const API_BASE_URL = (
  ((import.meta as any).env?.VITE_API_URL || "http://localhost:5000")
).replace(/\/+$/, "");



const SUBJECT_COLORS: Record<string, string> = {
  "Data Structures": "#4F9CF9",
  "Database Systems": "#A78BFA",
  "Computer Networks": "#34D399",
  "Operating Systems": "#F59E0B",
  Mathematics: "#F472B6",
};

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Subjects", path: "/subjects", icon: BookOpen },
  { label: "Schedule", path: "/schedule", icon: CalendarDays },
  { label: "Focus Mode", path: "/focus", icon: Timer },
  { label: "Analytics", path: "/analytics", icon: ChartNoAxesCombined },
  { label: "Notes", path: "/notes", icon: FileText },
];

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function dateOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toDateKey(date);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getWeekStart(dateKey: string) {
  const date = parseDate(dateKey);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return date;
}

function formatDate(
  dateKey: string,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!dateKey) return "";
  return parseDate(dateKey).toLocaleDateString(
    "en-US",
    options ?? { month: "short", day: "numeric", year: "numeric" },
  );
}

function formatTime(time: string) {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitialForm(): SessionForm {
  return {
    title: "",
    subject: "",
    date: dateOffset(0),
    startTime: "09:00",
    duration: 45,
    priority: "Medium",
    notes: "",
  };
}

const cardStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 18,
};

const primaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 16px",
  borderRadius: 12,
  border: "none",
  background: "#4F9CF9",
  color: "#fff",
  fontWeight: 650,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 13px",
  borderRadius: 11,
  border: "1px solid var(--border)",
  background: "var(--input-surface)",
  color: "var(--text)",
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--input-surface)",
  color: "var(--text)",
  font: "inherit",
  outlineOffset: 2,
};


const selectStyle: CSSProperties = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  padding: "12px 42px 12px 14px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--input-surface)",
  color: "var(--text)",
  fontSize: 13,
  fontWeight: 550,
  cursor: "pointer",
  transition:
    "border-color 180ms ease, box-shadow 180ms ease, background 180ms ease",
};

const selectOptionStyle: CSSProperties = {
  backgroundColor: "#182433",
  color: "#F1F5F9",
};

function StyledSelect({
  style,
  children,
  onFocus,
  onBlur,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <select
        {...props}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={{
          ...selectStyle,
          ...style,
          borderColor: focused ? "#4F9CF9" : "var(--border)",
          boxShadow: focused
            ? "0 0 0 3px rgba(79, 156, 249, 0.16)"
            : "none",
        }}
      >
        {children}
      </select>

      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: 14,
          top: "50%",
          transform: "translateY(-50%)",
          display: "grid",
          placeItems: "center",
          color: focused ? "#4F9CF9" : "var(--muted)",
          pointerEvents: "none",
          transition: "color 180ms ease",
        }}
      >
        <ChevronRight
          size={16}
          style={{ transform: "rotate(90deg)" }}
        />
      </span>
    </div>
  );
}


async function requestStudyPlan(
  request: GenerateStudyPlanRequest,
): Promise<GenerateStudyPlanResponse> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Please sign in again before generating a study plan.");
  }

  const token = await currentUser.getIdToken();

  const response = await fetch(`${API_BASE_URL}/api/ai/study-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : `Study plan request failed (${response.status}).`;

    throw new Error(message);
  }

  if (
    typeof result !== "object" ||
    result === null ||
    !("success" in result) ||
    result.success !== true ||
    !("sessions" in result) ||
    !Array.isArray(result.sessions)
  ) {
    console.error("[BrainScribe] Unexpected API response:", result);

    throw new Error(
      "The backend response is missing success or a sessions array.",
    );
  }

  const isValidDate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  };

  const isValidTime = (value: string): boolean =>
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

  const isValidSession = (session: unknown): boolean => {
    if (
      typeof session !== "object" ||
      session === null ||
      Array.isArray(session)
    ) {
      return false;
    }

    const item = session as Record<string, unknown>;

    return (
      typeof item.title === "string" &&
      item.title.trim().length > 0 &&
      typeof item.subject === "string" &&
      item.subject.trim().length > 0 &&
      typeof item.date === "string" &&
      isValidDate(item.date) &&
      typeof item.startTime === "string" &&
      isValidTime(item.startTime) &&
      typeof item.duration === "number" &&
      Number.isFinite(item.duration) &&
      item.duration >= 5 &&
      item.duration <= 480 &&
      typeof item.priority === "string" &&
      ["High", "Medium", "Low"].includes(item.priority) &&
      typeof item.notes === "string"
    );
  };

  const invalidSessions = result.sessions
    .map((session, index) => ({ session, index }))
    .filter(({ session }) => !isValidSession(session));

  if (invalidSessions.length > 0) {
    console.error(
      "[BrainScribe] Invalid session details:",
      invalidSessions,
    );

    throw new Error(
      `${invalidSessions.length} of ${result.sessions.length} generated sessions have invalid fields. Check the browser console for details.`,
    );
  }

  const data = result as {
    success: true;
    subjects?: unknown;
    sessions: GeneratedStudySession[];
    provider?: unknown;
    warning?: unknown;
  };

  return {
    success: true,
    subjects: Array.isArray(data.subjects)
      ? data.subjects.filter(
          (subject): subject is string => typeof subject === "string",
        )
      : undefined,
    sessions: data.sessions,
    provider:
      data.provider === "gemini" || data.provider === "groq"
        ? data.provider
        : undefined,
    warning: typeof data.warning === "string" ? data.warning : "",
  };
}


async function extractSyllabusText(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!file.size) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Please select a file smaller than 10 MB.");
  }

  let text = "";

  if (extension === "txt") {
    text = await file.text();
  } else if (extension === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
  } else if (extension === "pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
    }).promise;

    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      pages.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .filter(Boolean)
          .join(" "),
      );
    }

    text = pages.join("\n\n");
  } else {
    throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT file.");
  }

  text = text.replace(/\s+/g, " ").trim();

  if (!text) {
    throw new Error("No readable text was found. Scanned PDFs require OCR.");
  }

  if (text.length > 60_000) {
    throw new Error(
      "The document contains too much text. Split the syllabus into smaller documents.",
    );
  }

  if (text.length < 30) {
    throw new Error("The document contains too little readable text to analyze.");
  }

  return text;
}

export default function SchedulePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [savingSession, setSavingSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [view, setView] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(dateOffset(0));
  const [subjectFilter, setSubjectFilter] = useState("All subjects");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SessionForm>(getInitialForm);
  const [formError, setFormError] = useState("");
  const [sessionToDelete, setSessionToDelete] =
    useState<StudySession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] =
    useState<GeneratedStudySession[] | null>(null);
  const [aiProvider, setAiProvider] =
    useState<"gemini" | "groq" | null>(null);
  const [aiError, setAiError] = useState("");

  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [syllabusDeadline, setSyllabusDeadline] = useState("");
  const [syllabusError, setSyllabusError] = useState("");
  const [syllabusWarning, setSyllabusWarning] = useState("");

  const firstName =
    user?.displayName?.trim().split(/\s+/)[0] || "Student";

  useEffect(() => {
    if (!user?.uid) {
      setSessions([]);
      setLoadingSessions(false);
      return;
    }

    setLoadingSessions(true);
    setScheduleError("");

    const sessionsRef = collection(db, "users", user.uid, "studySessions");

    const unsubscribe = onSnapshot(
      sessionsRef,
      (snapshot) => {
        const loadedSessions: StudySession[] = snapshot.docs.map(
          (sessionDoc) => {
            const data = sessionDoc.data();

            const priority: Priority =
              data.priority === "High" ||
              data.priority === "Medium" ||
              data.priority === "Low"
                ? data.priority
                : "Medium";

            return {
              id: sessionDoc.id,
              title: typeof data.title === "string" ? data.title : "",
              subject:
                typeof data.subject === "string" ? data.subject : "",
              date: typeof data.date === "string" ? data.date : "",
              startTime:
                typeof data.startTime === "string" ? data.startTime : "09:00",
              duration:
                typeof data.duration === "number" ? data.duration : 45,
              priority,
              completed: data.completed === true,
              notes: typeof data.notes === "string" ? data.notes : "",
            };
          },
        );

        loadedSessions.sort((a, b) =>
          `${a.date}T${a.startTime}`.localeCompare(
            `${b.date}T${b.startTime}`,
          ),
        );

        setSessions(loadedSessions);
        setLoadingSessions(false);
      },
      (error) => {
        console.error("[Schedule] Failed to load sessions:", error);
        setScheduleError(
          "Couldn't load your study sessions. Check your connection and Firestore rules.",
        );
        setLoadingSessions(false);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  const weekDates = useMemo(() => {
    const start = getWeekStart(selectedDate);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return toDateKey(date);
    });
  }, [selectedDate]);


  const availableSubjects = useMemo(
    () =>
      Array.from(
        new Set(
          sessions
            .map((session) => session.subject.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [sessions],
  );
  const visibleSessions = useMemo(
    () =>
      sessions
        .filter((session) => {
          const matchesDate =
            view === "day"
              ? session.date === selectedDate
              : weekDates.includes(session.date);

          const matchesSubject =
            subjectFilter === "All subjects" ||
            session.subject === subjectFilter;

          const query = searchQuery.trim().toLowerCase();

          const matchesSearch =
            !query ||
            session.title.toLowerCase().includes(query) ||
            session.subject.toLowerCase().includes(query) ||
            session.notes.toLowerCase().includes(query);

          return matchesDate && matchesSubject && matchesSearch;
        })
        .sort((a, b) =>
          `${a.date}T${a.startTime}`.localeCompare(
            `${b.date}T${b.startTime}`,
          ),
        ),
    [sessions, view, selectedDate, weekDates, subjectFilter, searchQuery],
  );

  const completedCount = visibleSessions.filter(
    (session) => session.completed,
  ).length;

  const totalMinutes = visibleSessions.reduce(
    (total, session) => total + session.duration,
    0,
  );

  const completedMinutes = visibleSessions
    .filter((session) => session.completed)
    .reduce((total, session) => total + session.duration, 0);

  function changeWeek(direction: number) {
    const date = parseDate(selectedDate);
    date.setDate(date.getDate() + direction * (view === "day" ? 1 : 7));
    setSelectedDate(toDateKey(date));
  }



  function openEditModal(session: StudySession) {
    setEditingId(session.id);
    setForm({
      title: session.title,
      subject: session.subject,
      date: session.date,
      startTime: session.startTime,
      duration: session.duration,
      priority: session.priority,
      notes: session.notes,
    });
    setFormError("");
    setModalOpen(true);
  }

  const handleGenerateStudyPlan = async (mode: "weekly" | "daily") => {
    if (!auth.currentUser?.uid) {
      setAiError("Please sign in again before generating a study plan.");
      return;
    }

    setGeneratingPlan(true);
    setAiError("");
    setGeneratedPlan(null);
    setAiProvider(null);
    setSyllabusWarning("");

    try {
      const startDate =
        mode === "weekly"
          ? toDateKey(getWeekStart(selectedDate))
          : dateOffset(0);

      const result = await requestStudyPlan({ mode, startDate });

      if (result.sessions.length === 0) {
        setAiError("The AI did not generate any sessions. Please try again.");
        return;
      }

      setGeneratedPlan(result.sessions);
      setAiProvider(result.provider ?? null);
      setSyllabusWarning(result.warning ?? "");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      setAiError(`Couldn't generate your study plan: ${message}`);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleGenerateSyllabusPlan = async () => {
    if (!auth.currentUser?.uid) {
      setAiError("Please sign in again before generating a study plan.");
      return;
    }

    if (!syllabusFile) {
      setSyllabusError("Please upload your syllabus document first.");
      return;
    }

    if (!syllabusDeadline) {
      setSyllabusError("Please select your completion deadline.");
      return;
    }

    if (syllabusDeadline < dateOffset(0)) {
      setSyllabusError("The deadline cannot be in the past.");
      return;
    }

    setGeneratingPlan(true);
    setAiError("");
    setSyllabusError("");
    setSyllabusWarning("");
    setGeneratedPlan(null);
    setAiProvider(null);

    try {
      const syllabusText = await extractSyllabusText(syllabusFile);

      const result = await requestStudyPlan({
        mode: "syllabus",
        startDate: dateOffset(0),
        deadline: syllabusDeadline,
        syllabusText,
      });

      if (result.sessions.length === 0) {
        setAiError(
          "The AI did not generate any sessions. Try another syllabus document.",
        );
        return;
      }

      setGeneratedPlan(result.sessions);
      setAiProvider(result.provider ?? null);
      setSyllabusWarning(result.warning ?? "");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      setAiError(`Couldn't generate your syllabus plan: ${message}`);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleSaveGeneratedPlan = async () => {
    const uid = auth.currentUser?.uid;

    if (!uid || !generatedPlan?.length) return;

    setSavingPlan(true);
    setAiError("");

    try {
      const sessionsRef = collection(db, "users", uid, "studySessions");
      const batch = writeBatch(db);

      generatedPlan.forEach((session) => {
        const sessionRef = doc(sessionsRef);
        batch.set(sessionRef, { ...session, completed: false });
      });

      await batch.commit();

      setGeneratedPlan(null);
      setAiProvider(null);
      setSyllabusWarning("");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      setAiError(`Couldn't save the study plan: ${message}`);
    } finally {
      setSavingPlan(false);
    }
  };

async function saveSession(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!user?.uid || !editingId || savingSession) return;

  setFormError("");

  if (!form.title.trim()) {
    setFormError("Give your study session a title.");
    return;
  }

  if (!form.date || !form.startTime) {
    setFormError("Choose a date and start time.");
    return;
  }
  if (!form.subject.trim()) {
    setFormError("Enter a subject for this study session.");
    return;
  }
  if (
    !Number.isFinite(form.duration) ||
    form.duration < 5 ||
    form.duration > 480
  ) {
    setFormError("Duration must be between 5 and 480 minutes.");
    return;
  }

  const sessionData = {
    title: form.title.trim(),
    subject: form.subject.trim(),
    date: form.date,
    startTime: form.startTime,
    duration: form.duration,
    priority: form.priority,
    notes: form.notes.trim(),
  };

  setSavingSession(true);
  setScheduleError("");

  try {
    await updateDoc(
      doc(db, "users", user.uid, "studySessions", editingId),
      sessionData,
    );

    setSelectedDate(form.date);
    setView("week");
    setModalOpen(false);
    setEditingId(null);
  } catch (error) {
    console.error("[Schedule] Failed to update session:", error);
    setFormError("Couldn't update the session. Please try again.");
  } finally {
    setSavingSession(false);
  }
}

  async function toggleComplete(sessionId: string) {
    if (!user?.uid) return;

    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;

    setScheduleError("");

    try {
      await updateDoc(
        doc(db, "users", user.uid, "studySessions", sessionId),
        { completed: !session.completed },
      );
    } catch (error) {
      console.error("[Schedule] Failed to update completion:", error);
      setScheduleError("Couldn't update the session. Please try again.");
    }
  }

  async function confirmDelete() {
    if (!sessionToDelete || !user?.uid || deletingSession) return;

    setDeletingSession(true);
    setScheduleError("");

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "studySessions",
          sessionToDelete.id,
        ),
      );

      setSessionToDelete(null);
    } catch (error) {
      console.error("[Schedule] Failed to delete session:", error);
      setScheduleError("Couldn't delete the session. Please try again.");
    } finally {
      setDeletingSession(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  function shiftToToday() {
    setSelectedDate(dateOffset(0));
  }

  const sectionTitle =
    view === "day"
      ? formatDate(selectedDate, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      : `${formatDate(weekDates[0], { month: "short", day: "numeric" })} – ${formatDate(
          weekDates[6],
          { month: "short", day: "numeric", year: "numeric" },
        )}`;

  const fieldLabel: CSSProperties = {
    display: "block",
    color: "var(--muted)",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 7,
  };

  return (
    <div className="dashboard-shell">
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`dashboard-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-brand">
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "linear-gradient(135deg, #4F9CF9, #7C83FF)",
              color: "#fff",
            }}
          >
            <BookOpen size={20} />
          </span>
          <span>BrainScribe</span>
          <button
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <p className="sidebar-section-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
            <button
              key={path}
              type="button"
              className={`sidebar-link ${path === "/schedule" ? "active" : ""}`}
              onClick={() => {
                navigate(path);
                setSidebarOpen(false);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {path === "/schedule" && <span className="nav-active-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <CalendarCheck size={19} />
            <div>
              <strong>Stay consistent</strong>
              <p>Small sessions add up to big progress.</p>
            </div>
          </div>

          <div className="sidebar-profile">
            <span className="profile-avatar">
              {(user?.displayName || user?.email || "S").charAt(0).toUpperCase()}
            </span>
            <span className="profile-info">
              <strong>{firstName}</strong>
              <span>{user?.email || "Student account"}</span>
            </span>
            <button
              className="logout-button"
              type="button"
              title="Log out"
              aria-label="Log out"
              onClick={handleLogout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 4px" }}>
                Workspace / Planner
              </p>
              <h1 style={{ fontSize: 22, fontWeight: 750, margin: 0 }}>
                Study Schedule
              </h1>
            </div>
          </div>

          <div className="topbar-actions">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                color: loadingSessions ? "var(--muted)" : "#34D399",
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              {loadingSessions ? (
                <RefreshCw size={14} />
              ) : (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#34D399",
                  }}
                />
              )}
              {loadingSessions ? "Syncing..." : "Firestore synced"}
            </span>
          </div>
        </header>

        <div
          style={{
            padding: "26px 28px 40px",
            maxWidth: 1250,
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <section
            style={{
              ...cardStyle,
              padding: 24,
              marginBottom: 20,
              background:
                "linear-gradient(120deg, var(--surface), color-mix(in srgb, #4F9CF9 8%, var(--surface)))",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div>
                <p
                  style={{
                    color: "#4F9CF9",
                    fontWeight: 700,
                    fontSize: 12,
                    margin: "0 0 8px",
                    letterSpacing: 1.1,
                  }}
                >
                  YOUR LEARNING PLAN
                </p>
                <h2 style={{ margin: "0 0 8px", fontSize: 25, fontWeight: 750 }}>
                  Make time for what matters.
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: "var(--muted)",
                    lineHeight: 1.6,
                    maxWidth: 560,
                  }}
                >
                  Organize your study sessions, track your progress, and keep your learning momentum going.
                </p>
              </div>

              <button type="button" style={secondaryButtonStyle} onClick={shiftToToday}>
                <CalendarDays size={17} />
                Today
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                gap: 12,
                marginTop: 24,
              }}
            >
              {[
                { label: "Planned sessions", value: visibleSessions.length, icon: CalendarDays },
                { label: "Completed", value: completedCount, icon: Check },
                {
                  label: "Planned time",
                  value: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
                  icon: Clock3,
                },
                {
                  label: "Time completed",
                  value: `${Math.floor(completedMinutes / 60)}h ${completedMinutes % 60}m`,
                  icon: CalendarCheck,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  style={{
                    background: "var(--input-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: 15,
                  }}
                >
                  <Icon size={18} color="#4F9CF9" />
                  <p style={{ margin: "12px 0 4px", color: "var(--muted)", fontSize: 12 }}>
                    {label}
                  </p>
                  <strong style={{ fontSize: 22, fontWeight: 750 }}>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section style={{ ...cardStyle, padding: 20, marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  aria-label="Previous period"
                  style={{ ...secondaryButtonStyle, padding: 9 }}
                  onClick={() => changeWeek(-1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Next period"
                  style={{ ...secondaryButtonStyle, padding: 9 }}
                  onClick={() => changeWeek(1)}
                >
                  <ChevronRight size={18} />
                </button>
                <h3 style={{ fontSize: 16, margin: "0 0 0 4px" }}>{sectionTitle}</h3>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["day", "week"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    style={{
                      ...secondaryButtonStyle,
                      background: view === mode ? "#4F9CF9" : "var(--input-surface)",
                      color: view === mode ? "#fff" : "var(--text)",
                      borderColor: view === mode ? "#4F9CF9" : "var(--border)",
                    }}
                    onClick={() => setView(mode)}
                  >
                    {mode === "day" ? "Day" : "Week"}
                  </button>
                ))}
              </div>
            </div>

            {view === "week" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {weekDates.map((date) => {
                  const dateObject = parseDate(date);
                  const isSelected = date === selectedDate;
                  const isToday = date === dateOffset(0);
                  const count = sessions.filter((session) => session.date === date).length;

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        setView("day");
                      }}
                      style={{
                        minWidth: 0,
                        padding: "12px 3px",
                        borderRadius: 12,
                        border: `1px solid ${isSelected ? "#4F9CF9" : "var(--border)"}`,
                        background: isSelected
                          ? "color-mix(in srgb, #4F9CF9 14%, var(--surface))"
                          : "var(--input-surface)",
                        color: "var(--text)",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "var(--muted)",
                          fontSize: 11,
                          marginBottom: 8,
                        }}
                      >
                        {dateObject.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <strong
                        style={{
                          display: "block",
                          fontSize: 17,
                          color: isSelected ? "#4F9CF9" : "var(--text)",
                        }}
                      >
                        {dateObject.getDate()}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          height: 5,
                          width: 5,
                          borderRadius: "50%",
                          background: count ? "#4F9CF9" : "transparent",
                          margin: "7px auto 0",
                        }}
                      />
                      {isToday && (
                        <span style={{ display: "block", fontSize: 9, color: "#4F9CF9", marginTop: 3 }}>
                          TODAY
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <label>
                <span style={fieldLabel}>Search sessions</span>
                <span style={{ position: "relative", display: "block" }}>
                  <Search
                    size={17}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--muted)",
                    }}
                  />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search title, subject, notes..."
                    style={{ ...inputStyle, paddingLeft: 38 }}
                  />
                </span>
              </label>

              <label>
                <span style={fieldLabel}>Filter by subject</span>
                <StyledSelect
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                >
                  <option value="All subjects" style={selectOptionStyle}>
                    All subjects
                  </option>

                  {availableSubjects.map((subject) => (
                    <option
                      key={subject}
                      value={subject}
                      style={selectOptionStyle}
                    >
                      {subject}
                    </option>
                  ))}
                </StyledSelect>

              </label>
            </div>

            {scheduleError && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  gap: 9,
                  alignItems: "center",
                  color: "#F87171",
                  background: "color-mix(in srgb, #EF4444 9%, var(--surface))",
                  border: "1px solid color-mix(in srgb, #EF4444 30%, var(--border))",
                  padding: 13,
                  borderRadius: 11,
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                <AlertCircle size={18} />
                {scheduleError}
              </div>
            )}

            <section className="ai-planner">
              <div className="ai-planner__header">
                <div>
                  <p className="ai-planner__eyebrow">AI-POWERED PLANNING</p>
                  <h3 className="ai-planner__title">Plan smarter with AI</h3>
                  <p className="ai-planner__description">
                    Generate daily or weekly plans, or upload your syllabus to build a deadline-based study schedule.
                  </p>
                </div>

                <div className="ai-planner-actions">
                  <button
                    type="button"
                    className="ai-planner-btn ai-planner-btn--primary"
                    onClick={() => void handleGenerateStudyPlan("weekly")}
                    disabled={generatingPlan || savingPlan}
                  >
                    {generatingPlan ? (
                      <>
                        <RefreshCw size={16} className="ai-planner-spinner" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <CalendarDays size={16} />
                        Generate weekly plan
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="ai-planner-btn"
                    onClick={() => void handleGenerateStudyPlan("daily")}
                    disabled={generatingPlan || savingPlan}
                  >
                    <Clock3 size={16} />
                    Generate today's plan
                  </button>
                </div>
              </div>

              <div
                style={{
                  marginTop: 20,
                  padding: 20,
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "linear-gradient(135deg, color-mix(in srgb, #4F9CF9 7%, var(--surface)), var(--surface))",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: 13,
                      background: "color-mix(in srgb, #4F9CF9 15%, var(--surface))",
                      color: "#4F9CF9",
                    }}
                  >
                    <FileUp size={22} />
                  </span>
                  <div>
                    <h4 style={{ margin: "2px 0 6px", fontSize: 16 }}>
                      Build a plan from your syllabus
                    </h4>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
                      Upload one document containing one or multiple subjects. AI will analyze its topics and distribute study sessions before your deadline.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                    gap: 16,
                    marginTop: 20,
                  }}
                >
                  <label style={{ minWidth: 0 }}>
                    <span style={fieldLabel}>Syllabus document</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      disabled={generatingPlan || savingPlan}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setSyllabusFile(file);
                        setSyllabusError("");
                        setAiError("");
                        setSyllabusWarning("");
                        setGeneratedPlan(null);
                        setAiProvider(null);
                      }}
                      style={{ ...inputStyle, padding: 9, fontSize: 12 }}
                    />
                    {syllabusFile && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 8,
                          color: "#4F9CF9",
                          fontSize: 12,
                          overflowWrap: "anywhere",
                        }}
                      >
                        <FileText size={15} />
                        {syllabusFile.name}
                      </span>
                    )}
                    <span style={{ display: "block", color: "var(--muted)", fontSize: 11, marginTop: 6 }}>
                      PDF, DOCX or TXT · Maximum 10 MB
                    </span>
                  </label>

                  <label>
                    <span style={fieldLabel}>Finish the syllabus by</span>
                    <span style={{ position: "relative", display: "block" }}>
                      <CalendarClock
                        size={17}
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--muted)",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        type="date"
                        value={syllabusDeadline}
                        min={dateOffset(0)}
                        disabled={generatingPlan || savingPlan}
                        onChange={(event) => {
                          setSyllabusDeadline(event.target.value);
                          setSyllabusError("");
                          setAiError("");
                          setSyllabusWarning("");
                          setGeneratedPlan(null);
                          setAiProvider(null);
                        }}
                        style={{ ...inputStyle, paddingLeft: 39 }}
                      />
                    </span>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: 11, marginTop: 6 }}>
                      Choose your target completion date.
                    </span>
                  </label>
                </div>

                {syllabusError && (
                  <div
                    role="alert"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#F87171",
                      fontSize: 13,
                      marginTop: 14,
                    }}
                  >
                    <AlertCircle size={16} />
                    {syllabusError}
                  </div>
                )}

                <button
                  type="button"
                  className="ai-planner-btn ai-planner-btn--primary"
                  onClick={() => void handleGenerateSyllabusPlan()}
                  disabled={generatingPlan || savingPlan}
                  style={{ marginTop: 18 }}
                >
                  {generatingPlan ? (
                    <>
                      <RefreshCw size={16} className="ai-planner-spinner" />
                      Analyzing syllabus and building plan...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Analyze syllabus and generate plan
                    </>
                  )}
                </button>
              </div>

              {aiError && (
                <div className="ai-planner-error" role="alert">
                  <AlertCircle size={17} />
                  <span>{aiError}</span>
                </div>
              )}

              {generatedPlan && (
                <div className="ai-plan-preview">
                  <div className="ai-plan-preview__header">
                    <div>
                      <h4>Review your study plan</h4>
                      <p>
                        
Generated with{" "}
{aiProvider === "groq"
  ? "Groq"
  : aiProvider === "gemini"
    ? "Gemini"
    : "AI provider"}.
Nothing is saved until you approve it.
                      </p>

                      {syllabusWarning && (
                        <div
                          role="status"
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 9,
                            marginTop: 12,
                            padding: 12,
                            borderRadius: 10,
                            background: "color-mix(in srgb, #F59E0B 10%, var(--surface))",
                            border: "1px solid color-mix(in srgb, #F59E0B 30%, var(--border))",
                            color: "var(--text)",
                            fontSize: 13,
                            lineHeight: 1.6,
                          }}
                        >
                          <AlertCircle size={17} color="#F59E0B" style={{ flexShrink: 0 }} />
                          <span>{syllabusWarning}</span>
                        </div>
                      )}
                    </div>
                    <span className="ai-plan-count">{generatedPlan.length} sessions</span>
                  </div>

                  <div className="ai-plan-list">
                    {generatedPlan.map((session, index) => (
                      <article
                        className="ai-plan-session"
                        key={`${session.date}-${session.startTime}-${session.subject}-${index}`}
                      >
                        <div className="ai-plan-session__top">
                          <div>
                            <h5>{session.title}</h5>
                            <span className="ai-plan-session__subject">{session.subject}</span>
                          </div>
                          <span className={`ai-plan-priority ai-plan-priority--${session.priority.toLowerCase()}`}>
                            {session.priority}
                          </span>
                        </div>

                        <div className="ai-plan-session__meta">
                          <span>
                            <CalendarDays size={14} />
                            {formatDate(session.date, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span>
                            <Clock3 size={14} />
                            {formatTime(session.startTime)}
                          </span>
                          <span>{session.duration} min</span>
                        </div>

                        {session.notes && (
                          <p className="ai-plan-session__notes">{session.notes}</p>
                        )}
                      </article>
                    ))}
                  </div>

                  <div className="ai-plan-preview__actions">
                    <button
                      type="button"
                      className="ai-planner-btn ai-planner-btn--primary"
                      onClick={() => void handleSaveGeneratedPlan()}
                      disabled={savingPlan || generatingPlan}
                    >
                      {savingPlan ? (
                        <>
                          <RefreshCw size={16} className="ai-planner-spinner" />
                          Saving plan...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Approve and save plan
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="ai-planner-btn ai-planner-btn--secondary"
                      onClick={() => {
                        setGeneratedPlan(null);
                        setAiProvider(null);
                        setAiError("");
                        setSyllabusWarning("");
                      }}
                      disabled={savingPlan}
                    >
                      <X size={16} />
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </section>

            {loadingSessions ? (
              <div style={{ textAlign: "center", padding: "54px 15px", color: "var(--muted)" }} role="status">
                <RefreshCw size={25} style={{ marginBottom: 10 }} />
                <h3 style={{ color: "var(--text)", margin: "0 0 7px", fontSize: 16 }}>
                  Loading your study schedule
                </h3>
                <p style={{ margin: 0, fontSize: 13 }}>Syncing your sessions with your account.</p>
              </div>
            ) : visibleSessions.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {visibleSessions.map((session) => (
                  <article
                    key={session.id}
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "stretch",
                      padding: 16,
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      background: "var(--input-surface)",
                      opacity: session.completed ? 0.75 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        flexShrink: 0,
                        borderRadius: 8,
                        background: SUBJECT_COLORS[session.subject] || "#4F9CF9",
                      }}
                    />

                    <button
                      type="button"
                      title={session.completed ? "Mark as incomplete" : "Mark as completed"}
                      aria-label={session.completed ? "Mark as incomplete" : "Mark as completed"}
                      onClick={() => void toggleComplete(session.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: session.completed ? "#34D399" : "var(--muted)",
                        cursor: "pointer",
                        alignSelf: "flex-start",
                        padding: 2,
                      }}
                    >
                      {session.completed ? <Check size={21} /> : <Circle size={21} />}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <h4
                            style={{
                              fontSize: 15,
                              margin: "0 0 7px",
                              fontWeight: 700,
                              color: "var(--text)",
                              textDecoration: session.completed ? "line-through" : "none",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {session.title}
                          </h4>
                          <span
                            style={{
                              display: "inline-block",
                              color: SUBJECT_COLORS[session.subject] || "#4F9CF9",
                              fontSize: 12,
                              fontWeight: 650,
                              marginBottom: 9,
                            }}
                          >
                            {session.subject}
                          </span>
                        </div>

                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            borderRadius: 7,
                            padding: "5px 8px",
                            fontSize: 11,
                            fontWeight: 650,
                            color:
                              session.priority === "High"
                                ? "#F87171"
                                : session.priority === "Medium"
                                  ? "#FBBF24"
                                  : "#34D399",
                            background:
                              session.priority === "High"
                                ? "color-mix(in srgb, #EF4444 12%, var(--surface))"
                                : session.priority === "Medium"
                                  ? "color-mix(in srgb, #F59E0B 12%, var(--surface))"
                                  : "color-mix(in srgb, #10B981 12%, var(--surface))",
                          }}
                        >
                          <Flag size={12} />
                          {session.priority}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          flexWrap: "wrap",
                          color: "var(--muted)",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Clock3 size={14} />
                          {formatTime(session.startTime)} · {session.duration} min
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <CalendarDays size={14} />
                          {formatDate(session.date, { month: "short", day: "numeric" })}
                        </span>
                      </div>

                      {session.notes && (
                        <p
                          style={{
                            color: "var(--muted)",
                            fontSize: 13,
                            lineHeight: 1.5,
                            margin: "10px 0 0",
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {session.notes}
                        </p>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 5, alignSelf: "flex-start" }}>
                      <button
                        type="button"
                        title="Edit session"
                        aria-label="Edit session"
                        onClick={() => openEditModal(session)}
                        style={{
                          ...secondaryButtonStyle,
                          padding: 8,
                          border: "none",
                          background: "transparent",
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        title="Delete session"
                        aria-label="Delete session"
                        onClick={() => setSessionToDelete(session)}
                        style={{
                          ...secondaryButtonStyle,
                          padding: 8,
                          border: "none",
                          background: "transparent",
                          color: "#F87171",
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "48px 16px" }}>
                <span
                  style={{
                    width: 58,
                    height: 58,
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 16px",
                    borderRadius: 18,
                    background: "color-mix(in srgb, #4F9CF9 12%, var(--surface))",
                    color: "#4F9CF9",
                  }}
                >
                  <CalendarDays size={27} />
                </span>
                <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>{searchQuery || subjectFilter !== "All subjects"
  ? "No sessions match your current search or filters. Try adjusting them."
  : "Generate an AI study plan above to organize your upcoming learning sessions."}</h3>
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: 13,
                    margin: "0 auto 18px",
                    maxWidth: 360,
                    lineHeight: 1.6,
                  }}
                >
                  {searchQuery || subjectFilter !== "All subjects"
                    ? "No sessions match your current search or filters. Try adjusting them."
                    : "Add a study session to plan your next learning milestone."}
                </p>

              </div>
            )}
          </section>
        </div>
      </main>

      {modalOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingSession) {
              setModalOpen(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 16,
            background: "rgba(5, 10, 20, 0.68)",
            backdropFilter: "blur(8px)",
            overflowY: "auto",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-modal-title"
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
              background: "var(--modal-surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 24,
              boxSizing: "border-box",
              boxShadow: "0 25px 90px rgba(0,0,0,.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 22,
              }}
            >
              <div>
                <h2 id="session-modal-title" style={{ margin: "0 0 7px", fontSize: 21 }}>
                  Edit study session
                </h2>
                <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
                  Update the details of your session.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                disabled={savingSession}
                onClick={() => setModalOpen(false)}
                style={{ ...secondaryButtonStyle, padding: 7 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveSession} style={{ display: "grid", gap: 16 }}>
              <label>
                <span style={fieldLabel}>Session title *</span>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="e.g. Revise linked lists"
                  maxLength={120}
                  required
                  style={inputStyle}
                />
              </label>

<label>
  <span style={fieldLabel}>Subject *</span>

  <input
    type="text"
    value={form.subject}
    onChange={(event) =>
      setForm({ ...form, subject: event.target.value })
    }
    placeholder="Enter subject name"
    required
    style={inputStyle}
  />
</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 12,
                }}
              >
                <label>
                  <span style={fieldLabel}>Date *</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    required
                    style={inputStyle}
                  />
                </label>
                <label>
                  <span style={fieldLabel}>Start time *</span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                    required
                    style={inputStyle}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 12,
                }}
              >
                <label>
                  <span style={fieldLabel}>Duration (minutes) *</span>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={form.duration}
                    onChange={(event) => setForm({ ...form, duration: Number(event.target.value) })}
                    required
                    style={inputStyle}
                  />
                </label>
                <label>
                  <span style={fieldLabel}>Priority</span>

<StyledSelect
  value={form.priority}
  onChange={(event) =>
    setForm({
      ...form,
      priority: event.target.value as Priority,
    })
  }
>
  <option value="High" style={selectOptionStyle}>
    High
  </option>
  <option value="Medium" style={selectOptionStyle}>
    Medium
  </option>
  <option value="Low" style={selectOptionStyle}>
    Low
  </option>
</StyledSelect>

                </label>
              </div>

              <label>
                <span style={fieldLabel}>Notes (optional)</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  placeholder="Topics to cover, tasks, or reminders..."
                  rows={3}
                  maxLength={2000}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}
                />
              </label>

              {formError && (
                <p role="alert" style={{ color: "#F87171", fontSize: 13, margin: 0 }}>
                  {formError}
                </p>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  disabled={savingSession}
                  style={secondaryButtonStyle}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSession}
                  style={{ ...primaryButtonStyle, opacity: savingSession ? 0.7 : 1 }}
                >
                  {savingSession ? (
                    <>
                      <RefreshCw size={16} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      save changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {sessionToDelete && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingSession) {
              setSessionToDelete(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            display: "grid",
            placeItems: "center",
            padding: 16,
            background: "rgba(5, 10, 20, 0.68)",
            backdropFilter: "blur(8px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-session-title"
            style={{
              width: "100%",
              maxWidth: 420,
              padding: 24,
              borderRadius: 18,
              background: "var(--modal-surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 46,
                height: 46,
                borderRadius: 14,
                background: "color-mix(in srgb, #EF4444 13%, var(--surface))",
                color: "#F87171",
                marginBottom: 16,
              }}
            >
              <Trash2 size={22} />
            </span>

            <h2 id="delete-session-title" style={{ fontSize: 19, margin: "0 0 9px" }}>
              Delete this session?
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, margin: "0 0 22px" }}>
              “{sessionToDelete.title}” will be permanently removed from your schedule.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                disabled={deletingSession}
                style={secondaryButtonStyle}
                onClick={() => setSessionToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingSession}
                style={{
                  ...primaryButtonStyle,
                  background: "#DC4444",
                  opacity: deletingSession ? 0.7 : 1,
                }}
                onClick={() => void confirmDelete()}
              >
                {deletingSession ? "Deleting..." : "Delete session"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}