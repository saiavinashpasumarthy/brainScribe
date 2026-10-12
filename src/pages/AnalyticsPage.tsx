import { useMemo, useState } from "react";
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
import { useAuth } from "../contexts/AuthContext";
import { logoutUser } from "../services/authService";
import { useTheme } from "../contexts/ThemeContext";

type Period = "7 days" | "30 days" | "90 days";

const weeklyData = [
  { day: "Mon", hours: 1.8, previous: 1.2 },
  { day: "Tue", hours: 2.5, previous: 1.6 },
  { day: "Wed", hours: 1.6, previous: 2.1 },
  { day: "Thu", hours: 3.2, previous: 1.8 },
  { day: "Fri", hours: 2.2, previous: 1.4 },
  { day: "Sat", hours: 4.1, previous: 2.7 },
  { day: "Sun", hours: 2.8, previous: 2.0 },
];

const monthlyData = [
  { day: "Week 1", hours: 10.5, previous: 8.2 },
  { day: "Week 2", hours: 13.2, previous: 9.5 },
  { day: "Week 3", hours: 11.8, previous: 10.4 },
  { day: "Week 4", hours: 16.2, previous: 12.1 },
];

const quarterlyData = [
  { day: "Aug", hours: 38, previous: 30 },
  { day: "Sep", hours: 46, previous: 35 },
  { day: "Oct", hours: 52, previous: 41 },
];

const subjectData = [
  { name: "Data Structures", hours: 12.5, progress: 76, color: "#4F9CF9" },
  { name: "Database Systems", hours: 8.2, progress: 64, color: "#8B7CFA" },
  { name: "Computer Networks", hours: 6.5, progress: 48, color: "#38CFA5" },
  { name: "Operating Systems", hours: 4.8, progress: 38, color: "#F5B85C" },
  { name: "Mathematics", hours: 3.5, progress: 30, color: "#F27FA5" },
];

const initialActivity = [
  { title: "Data Structures", detail: "Focus session", time: "Today", duration: 50, color: "#4F9CF9" },
  { title: "Database Systems", detail: "Study session", time: "Yesterday", duration: 45, color: "#8B7CFA" },
  { title: "Computer Networks", detail: "Focus session", time: "Yesterday", duration: 25, color: "#38CFA5" },
  { title: "Operating Systems", detail: "Study session", time: "2 days ago", duration: 60, color: "#F5B85C" },
];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [period, setPeriod] = useState<Period>("7 days");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const chartData = useMemo(() => {
    if (period === "30 days") return monthlyData;
    if (period === "90 days") return quarterlyData;
    return weeklyData;
  }, [period]);

  const periodTotal = useMemo(
    () => chartData.reduce((sum, item) => sum + item.hours, 0),
    [chartData],
  );

  const userName =
    user?.displayName?.trim() ||
    user?.email?.split("@")[0] ||
    "Student";

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  const navigation = [
    { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
    { label: "My Subjects", icon: BookOpen, path: "/subjects" },
    { label: "Study Schedule", icon: CalendarDays, path: "/schedule" },
    { label: "Focus Sessions", icon: Clock3, path: "/focus" },
    { label: "Analytics", icon: ChartNoAxesCombined, path: "/analytics" },
    { label: "Notes & Resources", icon: NotebookPen, path: "/notes" },
  ];

  const formatHours = (hours: number) =>
    `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;

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
        onClick={() => {
          setMobileMenuOpen(false);
          if (path !== "/analytics") {
            navigate(path);
          }
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
      Study insights
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

          <section className="analytics-stats-grid">
            <article className="analytics-stat-card">
              <div className="analytics-stat-top">
                <span className="analytics-stat-icon blue">
                  <Timer size={19} />
                </span>
                <span className="analytics-stat-change positive">
                  <TrendingUp size={14} /> 12.8%
                </span>
              </div>
              <span className="analytics-stat-label">Study time</span>
              <div className="analytics-stat-value">
                {formatHours(periodTotal)}
              </div>
              <span className="analytics-stat-foot">Across selected period</span>
              <div className="analytics-mini-bars">
                {[38, 57, 44, 72, 52, 88, 66].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </article>

            <article className="analytics-stat-card">
              <div className="analytics-stat-top">
                <span className="analytics-stat-icon purple">
                  <CheckCircle2 size={19} />
                </span>
                <span className="analytics-stat-change positive">
                  <TrendingUp size={14} /> 8.4%
                </span>
              </div>
              <span className="analytics-stat-label">Sessions completed</span>
              <div className="analytics-stat-value">
                {period === "7 days" ? "18" : period === "30 days" ? "72" : "216"}
              </div>
              <span className="analytics-stat-foot">Keep the momentum going</span>
              <div className="analytics-stat-progress">
                <span style={{ width: "76%" }} />
              </div>
            </article>

            <article className="analytics-stat-card">
              <div className="analytics-stat-top">
                <span className="analytics-stat-icon green">
                  <Target size={19} />
                </span>
                <span className="analytics-stat-change positive">
                  <TrendingUp size={14} /> 6.2%
                </span>
              </div>
              <span className="analytics-stat-label">Goal completion</span>
              <div className="analytics-stat-value">76%</div>
              <span className="analytics-stat-foot">Of your study targets</span>
              <div className="analytics-stat-progress green-progress">
                <span style={{ width: "76%" }} />
              </div>
            </article>

            <article className="analytics-stat-card">
              <div className="analytics-stat-top">
                <span className="analytics-stat-icon orange">
                  <Flame size={19} />
                </span>
                <span className="analytics-stat-change neutral">
                  <ArrowUpRight size={14} /> Personal best
                </span>
              </div>
              <span className="analytics-stat-label">Study streak</span>
              <div className="analytics-stat-value">
                7 <small>days</small>
              </div>
              <span className="analytics-stat-foot">One day at a time</span>
              <div className="analytics-streak-dots">
                {Array.from({ length: 7 }, (_, index) => (
                  <span key={index} className="completed" />
                ))}
              </div>
            </article>
          </section>

          <section className="analytics-primary-grid">
            <article className="analytics-panel analytics-study-chart">
              <div className="analytics-panel-heading">
                <div>
                  <h2>Study activity</h2>
                  <p>Your focused hours over time</p>
                </div>
                <div className="analytics-chart-legend">
                  <span><i className="legend-current" /> This period</span>
                  <span><i className="legend-previous" /> Previous</span>
                </div>
              </div>

              <div className="analytics-chart-summary">
                <strong>{formatHours(periodTotal)}</strong>
                <span className="analytics-summary-chip">
                  <TrendingUp size={13} /> Study hours
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
                      formatter={(value) => [`${value} hours`, "Study time"]}
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
                      name="Study time"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="analytics-panel analytics-goal-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h2>Weekly goal</h2>
                  <p>Progress toward your target</p>
                </div>
                <span className="analytics-heading-icon">
                  <Target size={18} />
                </span>
              </div>

              <div className="analytics-goal-ring">
                <svg viewBox="0 0 180 180" role="img" aria-label="76 percent of weekly study goal completed">
                  <circle cx="90" cy="90" r="72" className="goal-ring-track" />
                  <circle
                    cx="90"
                    cy="90"
                    r="72"
                    className="goal-ring-progress"
                    strokeDasharray={`${2 * Math.PI * 72 * 0.76} ${2 * Math.PI * 72}`}
                  />
                </svg>
                <div className="analytics-goal-center">
                  <strong>76%</strong>
                  <span>completed</span>
                </div>
              </div>

              <div className="analytics-goal-numbers">
                <div>
                  <span className="goal-dot" />
                  <span>Completed</span>
                  <strong>19h</strong>
                </div>
                <div>
                  <span className="goal-dot goal-dot-muted" />
                  <span>Remaining</span>
                  <strong>6h</strong>
                </div>
              </div>

              <div className="analytics-goal-message">
                <span className="analytics-goal-message-icon">
                  <TrendingUp size={16} />
                </span>
                <p>
                  <strong>You're building momentum.</strong>
                  A little more consistency will get you to your goal.
                </p>
              </div>
            </article>
          </section>

          <section className="analytics-secondary-grid">
            <article className="analytics-panel analytics-subject-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h2>Subject breakdown</h2>
                  <p>Where your study time goes</p>
                </div>
                <button
                  className="analytics-text-action"
                  onClick={() => navigate("/subjects")}
                >
                  View subjects <ArrowUpRight size={15} />
                </button>
              </div>

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
                          <Cell key={subject.name} fill={subject.color} />
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
                        formatter={(value) => [`${value} hours`, "Study time"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="analytics-donut-center">
                    <strong>35.5h</strong>
                    <span>Total study</span>
                  </div>
                </div>

                <div className="analytics-subject-legend">
                  {subjectData.map((subject) => (
                    <div className="analytics-subject-legend-item" key={subject.name}>
                      <span
                        className="analytics-subject-dot"
                        style={{ background: subject.color }}
                      />
                      <span className="analytics-subject-legend-name">
                        {subject.name}
                      </span>
                      <strong>{subject.hours}h</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="analytics-panel analytics-daily-panel">
              <div className="analytics-panel-heading">
                <div>
                  <h2>Daily consistency</h2>
                  <p>Hours studied each day</p>
                </div>
                <span className="analytics-heading-icon">
                  <CalendarDays size={18} />
                </span>
              </div>

              <div className="analytics-bar-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyData}
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
                      formatter={(value) => [`${value} hours`, "Study time"]}
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
                <span><Flame size={15} /></span>
                <p>
                  <strong>Saturday was your strongest day</strong>
                  <br />4.1 focused hours logged
                </p>
              </div>
            </article>
          </section>

          <section className="analytics-panel analytics-activity-panel">
            <div className="analytics-panel-heading">
              <div>
                <h2>Recent study activity</h2>
                <p>A snapshot of your recent learning sessions</p>
              </div>
              <button
                className="analytics-text-action"
                onClick={() => navigate("/schedule")}
              >
                Open schedule <ArrowUpRight size={15} />
              </button>
            </div>

            <div className="analytics-activity-list">
              {initialActivity.map((activity, index) => (
                <div className="analytics-activity-row" key={`${activity.title}-${index}`}>
                  <span
                    className="analytics-activity-dot"
                    style={{ background: activity.color }}
                  />
                  <div className="analytics-activity-name">
                    <strong>{activity.title}</strong>
                    <span>{activity.detail}</span>
                  </div>
                  <span className="analytics-activity-time">{activity.time}</span>
                  <span className="analytics-activity-duration">
                    <Clock3 size={14} />
                    {activity.duration} min
                  </span>
                  <span className="analytics-activity-status">
                    <CheckCircle2 size={15} />
                    Completed
                  </span>
                </div>
              ))}
            </div>
          </section>

          <footer className="analytics-footer">
            <span>BrainScribe Analytics</span>
            <span>Small steps. Strong habits. Better outcomes.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
