
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
  TrendingUp,
  Target,
  Flame,
  Timer,
  CheckCircle2,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { logoutUser } from "../services/authService";
import { useTheme } from "../contexts/ThemeContext";
import { db } from "../config/firebase";

type Period = "7 days" | "30 days" | "90 days";

type FocusSession = {
  id: string;
  subject?: string;
  duration?: number | string;
  completedAt?: unknown;
  createdAt?: unknown;
  completed?: boolean;
};

type DatedSession = FocusSession & {
  date: Date;
  minutes: number;
  subjectName: string;
};

type ChartPoint = {
  day: string;
  hours: number;
  previous: number;
};

const SUBJECT_COLORS = [
  "#4F9CF9",
  "#8B7CFA",
  "#38CFA5",
  "#F5B85C",
  "#F27FA5",
  "#45C4D8",
  "#A3A9B8",
];

const getDate = (value: unknown): Date | null => {
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
};

const getMinutes = (duration: unknown): number => {
  const value = Number(duration);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatHours = (minutes: number): string => {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);

  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
};

const getRelativeDate = (date: Date): string => {
  const today = startOfDay(new Date()).getTime();
  const sessionDay = startOfDay(date).getTime();
  const difference = Math.round(
    (today - sessionDay) / (24 * 60 * 60 * 1000),
  );

  if (difference === 0) return "Today";
  if (difference === 1) return "Yesterday";
  if (difference > 1) return `${difference} days ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const getPeriodDays = (period: Period): number => {
  if (period === "30 days") return 30;
  if (period === "90 days") return 90;
  return 7;
};

const getSessionDate = (session: FocusSession): Date | null => {
  return (
    getDate(session.completedAt) ??
    getDate(session.createdAt)
  );
};

const getSessionSubject = (session: FocusSession): string => {
  return session.subject?.trim() || "General study";
};

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [period, setPeriod] = useState<Period>("7 days");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessions, setSessions] = useState<DatedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const userId = user?.uid;

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setLoading(false);
      setLoadError("");
      return;
    }

    setLoading(true);
    setLoadError("");

    const unsubscribe = onSnapshot(
      collection(db, "users", userId, "focusSessions"),
      (snapshot) => {
        const records: DatedSession[] = [];

        snapshot.forEach((document) => {
          const data = document.data() as Omit<FocusSession, "id">;
          const session: FocusSession = {
            id: document.id,
            ...data,
          };

          const date = getSessionDate(session);

          // Ignore unfinished sessions and records without a usable date.
          if (!date || session.completed === false) return;

          records.push({
            ...session,
            date,
            minutes: getMinutes(session.duration),
            subjectName: getSessionSubject(session),
          });
        });

        records.sort((a, b) => b.date.getTime() - a.date.getTime());

        setSessions(records);
        setLoading(false);
        setLoadError("");
      },
      (error) => {
        console.error("Failed to load analytics:", error);
        setLoadError("We couldn't load your study analytics. Please try again.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [userId]);

  const days = getPeriodDays(period);

  const { periodSessions, previousSessions, periodTotal, previousTotal } =
    useMemo(() => {
      const today = startOfDay(new Date());
      const currentStart = addDays(today, -(days - 1));
      const previousStart = addDays(currentStart, -days);
      const currentEnd = addDays(today, 1);

      const current = sessions.filter(
        (session) =>
          session.date >= currentStart && session.date < currentEnd,
      );

      const previous = sessions.filter(
        (session) =>
          session.date >= previousStart && session.date < currentStart,
      );

      return {
        periodSessions: current,
        previousSessions: previous,
        periodTotal: current.reduce((sum, session) => sum + session.minutes, 0),
        previousTotal: previous.reduce(
          (sum, session) => sum + session.minutes,
          0,
        ),
      };
    }, [sessions, days]);

  const weeklySessions = useMemo(() => {
    const start = startOfDay(addDays(new Date(), -6));

    return sessions.filter((session) => session.date >= start);
  }, [sessions]);

  const weeklyMinutes = useMemo(
    () => weeklySessions.reduce((sum, session) => sum + session.minutes, 0),
    [weeklySessions],
  );

  const streak = useMemo(() => {
    const activeDays = new Set(
      sessions.map((session) => startOfDay(session.date).getTime()),
    );

    let currentDay = startOfDay(new Date());
    let count = 0;

    // A streak can continue from yesterday if today has no session yet.
    if (!activeDays.has(currentDay.getTime())) {
      currentDay = addDays(currentDay, -1);
    }

    while (activeDays.has(currentDay.getTime())) {
      count += 1;
      currentDay = addDays(currentDay, -1);
    }

    return count;
  }, [sessions]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const today = startOfDay(new Date());
    const currentStart = addDays(today, -(days - 1));
    const previousStart = addDays(currentStart, -days);
    const bucketCount = days === 7 ? 7 : days === 30 ? 5 : 3;
    const bucketSize = days / bucketCount;

    const points: ChartPoint[] = Array.from(
      { length: bucketCount },
      (_, index) => {
        let label: string;

        if (days === 7) {
          label = addDays(currentStart, index).toLocaleDateString(
            undefined,
            { weekday: "short" },
          );
        } else if (days === 30) {
          label = `Week ${index + 1}`;
        } else {
          label = addDays(
            currentStart,
            Math.floor(index * bucketSize),
          ).toLocaleDateString(undefined, { month: "short" });
        }

        return { day: label, hours: 0, previous: 0 };
      },
    );

    sessions.forEach((session) => {
      const elapsed =
        (startOfDay(session.date).getTime() - currentStart.getTime()) /
        (24 * 60 * 60 * 1000);

      if (elapsed >= 0 && elapsed < days) {
        const index = Math.min(
          bucketCount - 1,
          Math.floor(elapsed / bucketSize),
        );
        points[index].hours += session.minutes / 60;
      }

      const previousElapsed =
        (startOfDay(session.date).getTime() - previousStart.getTime()) /
        (24 * 60 * 60 * 1000);

      if (previousElapsed >= 0 && previousElapsed < days) {
        const index = Math.min(
          bucketCount - 1,
          Math.floor(previousElapsed / bucketSize),
        );
        points[index].previous += session.minutes / 60;
      }
    });

    return points.map((point) => ({
      ...point,
      hours: Number(point.hours.toFixed(2)),
      previous: Number(point.previous.toFixed(2)),
    }));
  }, [sessions, days]);

  const dailyData = useMemo<ChartPoint[]>(() => {
    const today = startOfDay(new Date());

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(today, index - 6);
      const nextDay = addDays(date, 1);

      const minutes = sessions
        .filter(
          (session) => session.date >= date && session.date < nextDay,
        )
        .reduce((sum, session) => sum + session.minutes, 0);

      return {
        day: date.toLocaleDateString(undefined, { weekday: "short" }),
        hours: Number((minutes / 60).toFixed(2)),
        previous: 0,
      };
    });
  }, [sessions]);

  const subjectData = useMemo(() => {
    const subjectTotals = new Map<string, number>();

    periodSessions.forEach((session) => {
      subjectTotals.set(
        session.subjectName,
        (subjectTotals.get(session.subjectName) ?? 0) + session.minutes,
      );
    });

    return Array.from(subjectTotals.entries())
      .map(([name, minutes], index) => ({
        name,
        hours: Number((minutes / 60).toFixed(2)),
        color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [periodSessions]);

  const recentActivity = useMemo(
    () => sessions.slice(0, 5),
    [sessions],
  );

  const completedCount = periodSessions.length;

  const comparison = useMemo(() => {
    if (previousTotal === 0) {
      return periodTotal > 0 ? "New activity" : "No change";
    }

    const percentage = Math.round(
      ((periodTotal - previousTotal) / previousTotal) * 100,
    );

    return `${percentage > 0 ? "+" : ""}${percentage}% vs previous`;
  }, [periodTotal, previousTotal]);

  const userName =
    user?.displayName?.trim() ||
    user?.email?.split("@")[0] ||
    "Student";

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const navigation = [
    { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
    { label: "My Subjects", icon: BookOpen, path: "/subjects" },
    { label: "Study Schedule", icon: CalendarDays, path: "/schedule" },
    { label: "Focus Sessions", icon: Clock3, path: "/focus" },
    { label: "Analytics", icon: ChartNoAxesCombined, path: "/analytics" },
    { label: "Notes & Resources", icon: NotebookPen, path: "/notes" },
  ];

  const formatHours = (minutes: number) => formatDuration(minutes);


const goalTargetMinutes = 10 * 60; // Default weekly goal: 10 hours

const goalProgress =
  goalTargetMinutes > 0
    ? Math.min(
        100,
        Math.round((weeklyMinutes / goalTargetMinutes) * 100),
      )
    : 0;

const goalRingLength = 2 * Math.PI * 72;

  return (
    <div className="dashboard-shell analytics-shell">
      {mobileMenuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`dashboard-sidebar ${
          mobileMenuOpen ? "sidebar-open" : ""
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
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <p className="sidebar-section-label">WORKSPACE</p>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              className={`sidebar-link ${
                path === "/analytics" ? "active" : ""
              }`}
              aria-current={path === "/analytics" ? "page" : undefined}
              onClick={() => {
                setMobileMenuOpen(false);
                if (path !== "/analytics") navigate(path);
              }}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {path === "/analytics" && (
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
            className="sidebar-link"
            onClick={() => navigate("/settings")}
          >
            <Settings size={19} strokeWidth={1.8} />
            <span>Settings</span>
          </button>

          <div className="sidebar-profile">
            <div className="profile-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <strong>{userName}</strong>
              <span>Student workspace</span>
            </div>
            <button
              className="logout-button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main analytics-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <div>
              <span className="breadcrumb">
                WORKSPACE <ChevronDown size={13} /> ANALYTICS
              </span>
              <h2>Study Analytics</h2>
            </div>
          </div>

          <div className="topbar-actions">
            <span className="analytics-live-indicator">
              <span />
              Live study insights
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
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>

        <div className="dashboard-content analytics-content">
          <section className="analytics-welcome">
            <div>
              <div className="analytics-eyebrow">
                <ChartNoAxesCombined size={15} />
                YOUR LEARNING, DECODED
              </div>
              <h1>Study Analytics</h1>
              <p>
                See your progress, understand your habits, and make every
                study session count.
              </p>
            </div>

            <label className="analytics-period-select">
              <CalendarDays size={16} />
              <select
                value={period}
                onChange={(event) =>
                  setPeriod(event.target.value as Period)
                }
                aria-label="Analytics time period"
              >
                <option value="7 days">Last 7 days</option>
                <option value="30 days">Last 30 days</option>
                <option value="90 days">Last 90 days</option>
              </select>
              <ChevronDown size={15} />
            </label>
          </section>

          {loadError ? (
            <section className="analytics-panel" role="alert">
              <h2>Unable to load analytics</h2>
              <p>{loadError}</p>
              <button
                className="analytics-text-action"
                onClick={() => window.location.reload()}
              >
                Retry <ArrowUpRight size={15} />
              </button>
            </section>
          ) : (
            <>
              {loading && (
                <div className="analytics-panel" role="status">
                  Loading your study data…
                </div>
              )}

              <section className="analytics-stats-grid">
                <article className="analytics-stat-card">
                  <div className="analytics-stat-top">
                    <span className="analytics-stat-icon blue">
                      <Timer size={19} />
                    </span>
                    <span className="analytics-stat-change neutral">
                      {comparison}
                    </span>
                  </div>
                  <span className="analytics-stat-label">Focus time</span>
                  <div className="analytics-stat-value">
                    {formatHours(periodTotal)}
                  </div>
                  <span className="analytics-stat-foot">
                    Across the selected period
                  </span>
                  <div className="analytics-mini-bars">
                    {dailyData.map((item) => (
                      <span
                        key={item.day}
                        title={`${item.day}: ${formatHours(item.hours * 60)}`}
                        style={{
                          height: `${
                            Math.max(
                              5,
                              (item.hours /
                                Math.max(
                                  1,
                                  ...dailyData.map((entry) => entry.hours),
                                )) *
                                100,
                            )
                          }%`,
                        }}
                      />
                    ))}
                  </div>
                </article>

                <article className="analytics-stat-card">
                  <div className="analytics-stat-top">
                    <span className="analytics-stat-icon purple">
                      <CheckCircle2 size={19} />
                    </span>
                  </div>
                  <span className="analytics-stat-label">
                    Focus sessions recorded
                  </span>
                  <div className="analytics-stat-value">
                    {completedCount}
                  </div>
                  <span className="analytics-stat-foot">
                    In the selected period
                  </span>
                  <div className="analytics-stat-progress">
                    <span
                      style={{
                        width: `${
                          Math.min(100, completedCount * 10)
                        }%`,
                      }}
                    />
                  </div>
                </article>

                <article className="analytics-stat-card">
                  <div className="analytics-stat-top">
                    <span className="analytics-stat-icon green">
                      <Target size={19} />
                    </span>
                  </div>
                  <span className="analytics-stat-label">
                    Subjects studied
                  </span>
                  <div className="analytics-stat-value">
                    {subjectData.length}
                  </div>
                  <span className="analytics-stat-foot">
                    Subjects with recorded focus time
                  </span>
                  <div className="analytics-stat-progress green-progress">
                    <span
                      style={{
                        width: `${Math.min(100, subjectData.length * 20)}%`,
                      }}
                    />
                  </div>
                </article>

                <article className="analytics-stat-card">
                  <div className="analytics-stat-top">
                    <span className="analytics-stat-icon orange">
                      <Flame size={19} />
                    </span>
                    <span className="analytics-stat-change neutral">
                      Current streak
                    </span>
                  </div>
                  <span className="analytics-stat-label">Study streak</span>
                  <div className="analytics-stat-value">
                    {streak} <small>days</small>
                  </div>
                  <span className="analytics-stat-foot">
                    Consecutive days with focus activity
                  </span>
                  <div className="analytics-streak-dots">
                    {Array.from({ length: 7 }, (_, index) => (
                      <span
                        key={index}
                        className={
                          index < Math.min(streak, 7) ? "completed" : ""
                        }
                      />
                    ))}
                  </div>
                </article>
              </section>

              <section className="analytics-primary-grid">
                <article className="analytics-panel analytics-study-chart">
                  <div className="analytics-panel-heading">
                    <div>
                      <h2>Study activity</h2>
                      <p>Your recorded focus hours over time</p>
                    </div>
                    <div className="analytics-chart-legend">
                      <span>
                        <i className="legend-current" /> Selected period
                      </span>
                      <span>
                        <i className="legend-previous" /> Previous period
                      </span>
                    </div>
                  </div>

                  <div className="analytics-chart-summary">
                    <strong>{formatHours(periodTotal)}</strong>
                    <span className="analytics-summary-chip">
                      <TrendingUp size={13} /> Focus time
                    </span>
                  </div>

                  <div className="analytics-area-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 5, left: -18, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="analyticsHoursGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#4F9CF9"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#4F9CF9"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="var(--border)"
                          strokeDasharray="4 6"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="day"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "var(--muted)", fontSize: 11 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "var(--muted)", fontSize: 11 }}
                          tickFormatter={(value) => `${value}h`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--modal-surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            color: "var(--text)",
                            fontSize: 12,
                          }}
                          formatter={(value) => [
                            `${Number(value).toFixed(2)} hours`,
                            "Focus time",
                          ]}
                          labelStyle={{ color: "var(--muted)" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="previous"
                          stroke="#8795A9"
                          strokeDasharray="5 5"
                          strokeWidth={1.5}
                          fill="transparent"
                          name="Previous period"
                        />
                        <Area
                          type="monotone"
                          dataKey="hours"
                          stroke="#4F9CF9"
                          strokeWidth={2.5}
                          fill="url(#analyticsHoursGradient)"
                          activeDot={{ r: 5, strokeWidth: 0 }}
                          name="Focus time"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="analytics-panel analytics-goal-panel">
                  <div className="analytics-panel-heading">
                    <div>
                      <h2>Weekly focus</h2>
                      <p>Your actual focus time this week</p>
                    </div>
                    <span className="analytics-heading-icon">
                      <Target size={18} />
                    </span>
                  </div>

                  <div className="analytics-goal-ring">
                    <svg
                      viewBox="0 0 180 180"
                      role="img"
                      aria-label={`This week: ${formatHours(weeklyMinutes)} of focus time`}
                    >
                      <circle
                        cx="90"
                        cy="90"
                        r="72"
                        className="goal-ring-track"
                      />
                      <circle
                        cx="90"
                        cy="90"
                        r="72"
                        className="goal-ring-progress"
                        strokeDasharray={`${
                          (goalRingLength * goalProgress) / 100
                        } ${goalRingLength}`}
                      />
                    </svg>
                    <div className="analytics-goal-center">
                      <strong>
                        {goalTargetMinutes ? `${goalProgress}%` : formatHours(weeklyMinutes)}
                      </strong>
                      <span>
                        {goalTargetMinutes ? "goal completed" : "this week"}
                      </span>
                    </div>
                  </div>

                  <div className="analytics-goal-numbers">
                    <div>
                      <span className="goal-dot" />
                      <span>Focus time</span>
                      <strong>{formatHours(weeklyMinutes)}</strong>
                    </div>
                    <div>
                      <span className="goal-dot goal-dot-muted" />
                      <span>Weekly target</span>
                      <strong>Not set</strong>
                    </div>
                  </div>

                  <div className="analytics-goal-message">
                    <span className="analytics-goal-message-icon">
                      <TrendingUp size={16} />
                    </span>
                    <p>
                      <strong>
                        {weeklyMinutes > 0
                          ? "Your effort is adding up."
                          : "Your progress starts here."}
                      </strong>
                      {weeklyMinutes > 0
                        ? " Keep logging focus sessions to track your habits."
                        : " Complete a focus session to see your study activity."}
                    </p>
                  </div>
                </article>
              </section>

              <section className="analytics-secondary-grid">
                <article className="analytics-panel analytics-subject-panel">
                  <div className="analytics-panel-heading">
                    <div>
                      <h2>Subject breakdown</h2>
                      <p>Focus time by subject</p>
                    </div>
                    <button
                      className="analytics-text-action"
                      onClick={() => navigate("/subjects")}
                    >
                      View subjects <ArrowUpRight size={15} />
                    </button>
                  </div>

                  {subjectData.length > 0 ? (
                    <div className="analytics-subject-chart-wrap">
                      <div className="analytics-donut">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={subjectData}
                              dataKey="hours"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius="66%"
                              outerRadius="90%"
                              paddingAngle={4}
                              stroke="none"
                            >
                              {subjectData.map((subject) => (
                                <Cell
                                  key={subject.name}
                                  fill={subject.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: "var(--modal-surface)",
                                border: "1px solid var(--border)",
                                borderRadius: 12,
                                color: "var(--text)",
                                fontSize: 12,
                              }}
                              formatter={(value) => [
                                `${Number(value).toFixed(2)} hours`,
                                "Focus time",
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="analytics-donut-center">
                          <strong>{formatHours(periodTotal)}</strong>
                          <span>Total focus</span>
                        </div>
                      </div>

                      <div className="analytics-subject-legend">
                        {subjectData.map((subject) => (
                          <div
                            className="analytics-subject-legend-item"
                            key={subject.name}
                          >
                            <span
                              className="analytics-subject-dot"
                              style={{ background: subject.color }}
                            />
                            <span className="analytics-subject-legend-name">
                              {subject.name}
                            </span>
                            <strong>{formatHours(subject.hours * 60)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="analytics-empty-state">
                      <BookOpen size={25} />
                      <strong>No subject activity yet</strong>
                      <p>
                        Select a subject during a focus session to see your
                        breakdown here.
                      </p>
                    </div>
                  )}
                </article>

                <article className="analytics-panel analytics-daily-panel">
                  <div className="analytics-panel-heading">
                    <div>
                      <h2>Daily consistency</h2>
                      <p>Recorded focus hours each day</p>
                    </div>
                    <span className="analytics-heading-icon">
                      <CalendarDays size={18} />
                    </span>
                  </div>

                  <div className="analytics-bar-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dailyData}
                        margin={{ top: 10, right: 3, left: -22, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="var(--border)"
                          strokeDasharray="4 6"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="day"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "var(--muted)", fontSize: 10 }}
                          dy={8}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "var(--muted)", fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--modal-surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            color: "var(--text)",
                            fontSize: 12,
                          }}
                          formatter={(value) => [
                            `${Number(value).toFixed(2)} hours`,
                            "Focus time",
                          ]}
                        />
                        <Bar
                          dataKey="hours"
                          fill="#4F9CF9"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={27}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="analytics-consistency-note">
                    <span>
                      <Flame size={15} />
                    </span>
                    <p>
                      <strong>
                        {dailyData.some((day) => day.hours > 0)
                          ? `${dailyData.reduce(
                              (best, day) =>
                                day.hours > best.hours ? day : best,
                              dailyData[0],
                            ).day} was your strongest day`
                          : "Your first session is waiting"}
                      </strong>
                      <br />
                      {dailyData.some((day) => day.hours > 0)
                        ? `${Math.max(...dailyData.map((day) => day.hours)).toFixed(2)} focused hours logged`
                        : "Your daily activity will appear here."}
                    </p>
                  </div>
                </article>
              </section>

              <section className="analytics-panel analytics-activity-panel">
                <div className="analytics-panel-heading">
                  <div>
                    <h2>Recent study activity</h2>
                    <p>Your latest recorded focus sessions</p>
                  </div>
                  <button
                    className="analytics-text-action"
                    onClick={() => navigate("/focus")}
                  >
                    Open focus timer <ArrowUpRight size={15} />
                  </button>
                </div>

                {recentActivity.length > 0 ? (
                  <div className="analytics-activity-list">
                    {recentActivity.map((activity, index) => (
                      <div
                        className="analytics-activity-row"
                        key={activity.id}
                      >
                        <span
                          className="analytics-activity-dot"
                          style={{
                            background:
                              SUBJECT_COLORS[index % SUBJECT_COLORS.length],
                          }}
                        />
                        <div className="analytics-activity-name">
                          <strong>{activity.subjectName}</strong>
                          <span>Focus session</span>
                        </div>
                        <span className="analytics-activity-time">
                          {getRelativeDate(activity.date)}
                        </span>
                        <span className="analytics-activity-duration">
                          <Clock3 size={14} />
                          {formatDuration(activity.minutes)}
                        </span>
                        <span className="analytics-activity-status">
                          <CheckCircle2 size={15} />
                          Recorded
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="analytics-empty-state">
                    <Timer size={25} />
                    <strong>No focus sessions recorded yet</strong>
                    <p>
                      Once you complete a focus session, your real activity
                      will show up here.
                    </p>
                    <button
                      className="analytics-text-action"
                      onClick={() => navigate("/focus")}
                    >
                      Start focusing <ArrowUpRight size={15} />
                    </button>
                  </div>
                )}
              </section>
            </>
          )}

          <footer className="analytics-footer">
            <span>BrainScribe Analytics</span>
            <span>Small steps. Strong habits. Better outcomes.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
