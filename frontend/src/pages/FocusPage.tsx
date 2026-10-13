import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Clock3,
  ChartNoAxesCombined,
  NotebookPen,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Play,
  Pause,
  RotateCcw,
  Check,
  Target,
  Coffee,
  Sparkles,
  Flame,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { logoutUser } from "../services/authService";
import { useTheme } from "../contexts/ThemeContext";

type FocusMode = "focus" | "shortBreak" | "longBreak";

type FocusSession = {
  id: string;
  subject: string;
  duration: number;
  completedAt: string;
};

const navigation = [
  { label: "Overview", icon: LayoutDashboard, route: "/dashboard" },
  { label: "My Subjects", icon: BookOpen, route: "/subjects" },
  { label: "Study Schedule", icon: CalendarDays, route: "/schedule" },
  { label: "Focus Sessions", icon: Clock3, route: "/focus" },
  { label: "Analytics", icon: ChartNoAxesCombined, route: "/analytics" },
  { label: "Notes & Resources", icon: NotebookPen, route: "/notes" },
];

const subjectOptions = [
  "Data Structures",
  "Database Systems",
  "Computer Networks",
  "Operating Systems",
  "Mathematics",
];

const modes: Record<
  FocusMode,
  { label: string; minutes: number; description: string }
> = {
  focus: {
    label: "Focus",
    minutes: 25,
    description: "One task. One clear mind. Give it your best.",
  },
  shortBreak: {
    label: "Short break",
    minutes: 5,
    description: "Step away from the screen and recharge.",
  },
  longBreak: {
    label: "Long break",
    minutes: 15,
    description: "You've earned a longer reset. Take it easy.",
  },
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

function formatSessionDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FocusPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [mode, setMode] = useState<FocusMode>("focus");
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState(subjectOptions[0]);
  const [customMinutes, setCustomMinutes] = useState("25");

  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);

  const firstName = useMemo(() => {
    const name = user?.displayName?.trim();
    return name
      ? name.split(/\s+/)[0]
      : user?.email?.split("@")[0] || "Student";
  }, [user]);

  const totalSeconds = durationMinutes * 60;
  const progress =
    totalSeconds > 0
      ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100
      : 0;

  const completedToday = useMemo(() => {
    const today = new Date().toDateString();

    return sessions.filter(
      (session) => new Date(session.completedAt).toDateString() === today,
    ).length;
  }, [sessions]);

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running || remainingSeconds !== 0) return;

    setRunning(false);

    if (mode === "focus") {
      const completedSession: FocusSession = {
        id: `${Date.now()}-${Math.random()}`,
        subject: selectedSubject,
        duration: durationMinutes,
        completedAt: new Date().toISOString(),
      };

      setSessions((current) => [completedSession, ...current]);
      setTotalFocusMinutes((current) => current + durationMinutes);
    }
  }, [
    running,
    remainingSeconds,
    mode,
    selectedSubject,
    durationMinutes,
  ]);

  function selectMode(nextMode: FocusMode) {
    setRunning(false);
    setMode(nextMode);
    setDurationMinutes(modes[nextMode].minutes);
    setRemainingSeconds(modes[nextMode].minutes * 60);
    setCustomMinutes(String(modes[nextMode].minutes));
  }

  function applyCustomDuration() {
    const minutes = Number(customMinutes);

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
      return;
    }

    setRunning(false);
    setMode("focus");
    setDurationMinutes(minutes);
    setRemainingSeconds(minutes * 60);
  }

  function resetTimer() {
    setRunning(false);
    setRemainingSeconds(durationMinutes * 60);
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await logoutUser();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-ambient dashboard-ambient-one" />
      <div className="dashboard-ambient dashboard-ambient-two" />

      {sidebarOpen && (
        <button
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
              key={label}
              className={`sidebar-link ${
                route === "/focus" ? "active" : ""
              }`}
              onClick={() => {
                setSidebarOpen(false);
                navigate(route);
              }}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {route === "/focus" && (
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
            <p>Protect your focus. Your future self will thank you.</p>
            <span className="tip-decoration">✳</span>
          </div>

          <button
            className="sidebar-link"
            onClick={() => navigate("/settings")}
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
              className="mobile-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>

            <div>
              <span className="breadcrumb">
                WORKSPACE <span>›</span> FOCUS SESSIONS
              </span>
              <h2>Focus sessions</h2>
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
              className="dashboard-theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${
                theme === "dark" ? "light" : "dark"
              } mode`}
              title={`Switch to ${
                theme === "dark" ? "light" : "dark"
              } mode`}
            >
              {theme === "dark" ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}
            </button>
          </div>
        </header>

        <div className="dashboard-content focus-content">
          <section className="focus-welcome">
            <div>
              <span className="welcome-kicker">
                <span className="welcome-live-dot" />
                YOUR PERSONAL FOCUS SPACE
              </span>

              <h1>
                Find your <span>flow state.</span>
              </h1>

              <p>
                Small, intentional sessions. Meaningful progress over time.
              </p>
            </div>

            <div className="focus-welcome-decoration">
              <BrainCircuit size={36} strokeWidth={1.3} />
              <span />
            </div>
          </section>

          <section className="focus-stats-grid">
            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon blue">
                  <Target size={19} />
                </span>
                <span className="stat-label">SESSIONS TODAY</span>
              </div>
              <div className="stat-value">{completedToday}</div>
              <p className="stat-caption">
                Completed focus sessions
              </p>
            </article>

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon purple">
                  <Clock3 size={19} />
                </span>
                <span className="stat-label">TOTAL FOCUS TIME</span>
              </div>
              <div className="stat-value">
                {Math.floor(totalFocusMinutes / 60)}
                <span>h</span>{" "}
                {totalFocusMinutes % 60}
                <span>m</span>
              </div>
              <p className="stat-caption">
                From completed focus timers
              </p>
            </article>

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon green">
                  <Flame size={19} />
                </span>
                <span className="stat-label">KEEP IT GOING</span>
              </div>
              <div className="stat-value">
                {completedToday > 0 ? "On" : "Go"}
                <span>{completedToday > 0 ? "!" : "!"}</span>
              </div>
              <p className="stat-caption">
                {completedToday > 0
                  ? "You've made progress today"
                  : "Your next session starts here"}
              </p>
            </article>
          </section>

          <div className="focus-main-grid">
            <section className="dashboard-card focus-timer-card">
              <div className="focus-card-heading">
                <div>
                  <span className="card-eyebrow">TIME WELL SPENT</span>
                  <h3>Focus timer</h3>
                  <p>{modes[mode].description}</p>
                </div>

                <span className="focus-live-badge">
                  <span />
                  {running ? "In session" : "Ready when you are"}
                </span>
              </div>

              <div
                className={`focus-mode-switch ${
                  mode === "focus" ? "focus-mode-active" : ""
                }`}
                role="group"
                aria-label="Timer mode"
              >
                <button
                  className={mode === "focus" ? "selected" : ""}
                  onClick={() => selectMode("focus")}
                >
                  <Target size={15} />
                  Focus
                </button>

                <button
                  className={mode === "shortBreak" ? "selected" : ""}
                  onClick={() => selectMode("shortBreak")}
                >
                  <Coffee size={15} />
                  Short break
                </button>

                <button
                  className={mode === "longBreak" ? "selected" : ""}
                  onClick={() => selectMode("longBreak")}
                >
                  <Sparkles size={15} />
                  Long break
                </button>
              </div>

              <div className="focus-timer-stage">
                <div
                  className={`focus-timer-ring ${
                    running ? "timer-running" : ""
                  }`}
                  style={
                    {
                      "--focus-progress": `${progress}%`,
                    } as React.CSSProperties
                  }
                >
                  <div className="focus-timer-ring-inner">
                    <span className="focus-timer-mode">
                      {modes[mode].label.toUpperCase()}
                    </span>

                    <div
                      className="focus-timer-value"
                      role="timer"
                      aria-label={`${Math.floor(
                        remainingSeconds / 60,
                      )} minutes ${remainingSeconds % 60} seconds remaining`}
                    >
                      {formatDuration(remainingSeconds)}
                    </div>

                    <span className="focus-timer-subtitle">
                      {running ? "Stay in the zone" : "Time for intention"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="focus-timer-controls">
                <button
                  className="focus-reset-button"
                  onClick={resetTimer}
                  aria-label="Reset timer"
                  title="Reset timer"
                >
                  <RotateCcw size={18} />
                </button>

                <button
                  className="focus-start-button"
                  onClick={() => {
                    if (remainingSeconds === 0) {
                      setRemainingSeconds(durationMinutes * 60);
                    }
                    setRunning((current) => !current);
                  }}
                >
                  {running ? (
                    <>
                      <Pause size={18} fill="currentColor" />
                      Pause session
                    </>
                  ) : (
                    <>
                      <Play size={18} fill="currentColor" />
                      {remainingSeconds < durationMinutes * 60
                        ? "Resume focus"
                        : "Start focusing"}
                    </>
                  )}
                </button>

                <span className="focus-control-spacer" />
              </div>

              <div className="focus-subject-picker">
                <label htmlFor="focus-subject">
                  <BookOpen size={16} />
                  Focusing on
                </label>

                <select
                  id="focus-subject"
                  value={selectedSubject}
                  onChange={(event) =>
                    setSelectedSubject(event.target.value)
                  }
                  disabled={running}
                >
                  {subjectOptions.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>

                {running && (
                  <p className="focus-subject-hint">
                    Pause the timer to change your subject.
                  </p>
                )}
              </div>

              <div className="focus-custom-duration">
                <label htmlFor="custom-focus-minutes">
                  Custom focus duration
                </label>

                <div>
                  <input
                    id="custom-focus-minutes"
                    type="number"
                    min={1}
                    max={180}
                    step={1}
                    value={customMinutes}
                    onChange={(event) =>
                      setCustomMinutes(event.target.value)
                    }
                    disabled={running}
                  />

                  <span>minutes</span>

                  <button
                    onClick={applyCustomDuration}
                    disabled={
                      running ||
                      !Number.isInteger(Number(customMinutes)) ||
                      Number(customMinutes) < 1 ||
                      Number(customMinutes) > 180
                    }
                  >
                    Apply
                  </button>
                </div>
              </div>
            </section>

            <aside className="focus-side-column">
              <article className="dashboard-card focus-guide-card">
                <span className="focus-guide-icon">
                  <Sparkles size={21} />
                </span>
                <span className="card-eyebrow">YOUR FOCUS ROUTINE</span>
                <h3>Make each minute count.</h3>
                <p>
                  Try this simple routine to make your sessions more
                  intentional.
                </p>

                <div className="focus-routine-list">
                  <div>
                    <span className="focus-routine-number">01</span>
                    <div>
                      <strong>Set one clear goal</strong>
                      <p>Know exactly what you want to finish.</p>
                    </div>
                  </div>

                  <div>
                    <span className="focus-routine-number">02</span>
                    <div>
                      <strong>Remove distractions</strong>
                      <p>Silence notifications and clear your desk.</p>
                    </div>
                  </div>

                  <div>
                    <span className="focus-routine-number">03</span>
                    <div>
                      <strong>Take a real break</strong>
                      <p>Rest before your next round of focus.</p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="dashboard-card focus-goal-card">
                <div className="focus-goal-top">
                  <span className="focus-goal-icon">
                    <Check size={19} />
                  </span>
                  <span className="card-eyebrow">DAILY MOMENTUM</span>
                </div>

                <h3>{completedToday} of 4 sessions</h3>
                <p>
                  {completedToday >= 4
                    ? "Amazing work. You've reached today's demo goal."
                    : "Keep showing up. Every completed session counts."}
                </p>

                <div className="focus-goal-track">
                  <span
                    style={{
                      width: `${Math.min(
                        (completedToday / 4) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>

                <span className="focus-goal-caption">
                  {Math.max(4 - completedToday, 0)} to reach your demo goal
                </span>
              </article>
            </aside>
          </div>

          <section className="dashboard-card focus-history-card">
            <div className="focus-history-heading">
              <div>
                <span className="card-eyebrow">YOUR RECENT WORK</span>
                <h3>Completed sessions</h3>
                <p>Your finished focus timers appear here.</p>
              </div>

              <span className="focus-history-count">
                {sessions.length} total
              </span>
            </div>

            {sessions.length > 0 ? (
              <div className="focus-history-list">
                {sessions.map((session) => (
                  <article
                    className="focus-history-item"
                    key={session.id}
                  >
                    <span className="focus-history-check">
                      <Check size={17} />
                    </span>

                    <div className="focus-history-copy">
                      <strong>{session.subject}</strong>
                      <span>
                        {formatSessionDate(session.completedAt)}
                      </span>
                    </div>

                    <span className="focus-history-duration">
                      <Clock3 size={14} />
                      {session.duration} min
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="focus-history-empty">
                <span>
                  <Clock3 size={24} />
                </span>
                <h4>Your next achievement starts here.</h4>
                <p>
                  Complete a focus timer to see your first session in
                  this list.
                </p>
              </div>
            )}
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
      </section>
    </main>
  );
}