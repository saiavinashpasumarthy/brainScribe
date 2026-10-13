
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { logoutUser } from "../services/authService";
import { useTheme } from "../contexts/ThemeContext";
import { useState } from "react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "My Subjects", icon: BookOpen },
  { label: "Study Schedule", icon: CalendarDays },
  { label: "Focus Sessions", icon: Clock3 },
  { label: "Analytics", icon: ChartNoAxesCombined },
  { label: "Notes & Resources", icon: NotebookPen },
];

const weekData = [
  { day: "MON", hours: 1.5 },
  { day: "TUE", hours: 2.4 },
  { day: "WED", hours: 1.1 },
  { day: "THU", hours: 3.2 },
  { day: "FRI", hours: 2.0 },
  { day: "SAT", hours: 3.7 },
  { day: "SUN", hours: 0.8 },
];

const subjects = [
  { name: "Data Structures", detail: "8 of 12 topics", progress: 68, color: "#4f9cf9" },
  { name: "Database Systems", detail: "6 of 10 topics", progress: 54, color: "#9c8bff" },
  { name: "Computer Networks", detail: "4 of 9 topics", progress: 42, color: "#50d6b1" },
];

const upcomingExams = [
  { subject: "Database Systems", date: "Oct 18", days: 6, color: "#9c8bff" },
  { subject: "Data Structures", date: "Oct 23", days: 11, color: "#4f9cf9" },
  { subject: "Computer Networks", date: "Oct 29", days: 17, color: "#50d6b1" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const firstName = useMemo(() => {
    const name = user?.displayName?.trim();
    if (name) return name.split(/\s+/)[0];
    return user?.email?.split("@")[0] || "Student";
  }, [user]);

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

      <aside className={`dashboard-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dashboard-brand">
          <span className="dashboard-brand-icon">
            <BrainCircuit size={23} />
          </span>
          <span>Brain<span>Scribe</span></span>
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
          {navigation.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              className={`sidebar-link ${active ? "active" : ""}`}
              onClick={() => {
                setSidebarOpen(false);
                if (!active) {
                  const routes: Record<string, string> = {
                    "My Subjects": "/subjects",
                    "Study Schedule": "/schedule",
                    "Focus Sessions": "/focus",
                    Analytics: "/analytics",
                    "Notes & Resources": "/notes",
                  };
                  navigate(routes[label]);
                }
              }}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {active && <span className="nav-active-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="sidebar-tip-icon"><BrainCircuit size={18} /></span>
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
              <span className="breadcrumb">WORKSPACE <ChevronRight size={13} /> OVERVIEW</span>
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
              className="dashboard-theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
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
              <h1>Hey, {firstName}<span className="wave">✳</span></h1>
              <p>Every focused session moves you closer to your goals.</p>
            </div>
            <button
              className="primary-dashboard-button"
              onClick={() => navigate("/subjects")}
            >
              <Plus size={18} /> Add a subject
            </button>
          </section>

          <section className="dashboard-stat-grid" aria-label="Study overview">
            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon blue"><Clock3 size={19} /></span>
                <span className="stat-label">STUDY TIME</span>
              </div>
              <div className="stat-value">13.7 <span>hrs</span></div>
              <p className="stat-caption">Across the displayed week</p>
              <div className="stat-bottom-line"><span style={{ width: "69%" }} /></div>
            </article>

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon purple"><BookOpen size={19} /></span>
                <span className="stat-label">ACTIVE SUBJECTS</span>
              </div>
              <div className="stat-value">03</div>
              <p className="stat-caption">Subjects in your workspace</p>
              <div className="stat-mini-tags"><span>DSA</span><span>DBMS</span><span>CN</span></div>
            </article>

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon green"><Target size={19} /></span>
                <span className="stat-label">TOPIC PROGRESS</span>
              </div>
              <div className="stat-value">54<span>%</span></div>
              <p className="stat-caption">Illustrative overall progress</p>
              <div className="stat-bottom-line"><span style={{ width: "54%" }} /></div>
            </article>

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon orange"><Flame size={19} /></span>
                <span className="stat-label">STUDY STREAK</span>
              </div>
              <div className="stat-value">05 <span>days</span></div>
              <p className="stat-caption">Example streak · connect activity to track</p>
              <div className="streak-dots" aria-label="Example five-day streak">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <span key={day} className={day <= 5 ? "streak-complete" : ""} />
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
                <strong>13.7 <span>hours</span></strong>
                <span className="activity-note"><span /> Sample chart data</span>
              </div>

              <div className="study-chart">
                <div className="chart-guides">
                  {[4, 3, 2, 1, 0].map((tick) => (
                    <div className="chart-guide" key={tick}>
                      <span>{tick}h</span><i />
                    </div>
                  ))}
                </div>
                <div className="chart-bars">
                  {weekData.map((item, index) => (
                    <div className="chart-column" key={item.day}>
                      <div className="chart-bar-space">
                        <div
                          className={`chart-bar ${index === 5 ? "chart-bar-highlight" : ""}`}
                          style={{ height: `${(item.hours / 4) * 100}%` }}
                          title={`${item.hours} hours`}
                        >
                          <span className="bar-tooltip">{item.hours}h</span>
                        </div>
                      </div>
                      <span className="chart-day">{item.day}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="chart-disclaimer">Demo values for layout preview; real tracking isn't connected yet.</p>
            </article>

            <article className="dashboard-card focus-card">
              <div className="card-heading">
                <div>
                  <span className="card-eyebrow">MAKE IT COUNT</span>
                  <h3>Time to focus</h3>
                  <p>Give one task your full attention.</p>
                </div>
                <span className="focus-card-icon"><Clock3 size={20} /></span>
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
                <p>One session. One clear goal.</p>
                <button onClick={() => navigate("/focus")} className="focus-start-button">
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
                <button className="text-action" onClick={() => navigate("/subjects")}>
                  View all <ArrowUpRight size={15} />
                </button>
              </div>

              <div className="subject-list">
                {subjects.map((subject) => (
                  <div className="subject-row" key={subject.name}>
                    <div className="subject-symbol" style={{ color: subject.color, background: `${subject.color}16` }}>
                      <BookOpen size={18} />
                    </div>
                    <div className="subject-main">
                      <div className="subject-title-row">
                        <strong>{subject.name}</strong>
                        <span>{subject.progress}%</span>
                      </div>
                      <div className="subject-progress">
                        <span style={{ width: `${subject.progress}%`, background: subject.color }} />
                      </div>
                      <span className="subject-detail">{subject.detail} <span>· demo data</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-card exams-card">
              <div className="card-heading compact-heading">
                <div>
                  <span className="card-eyebrow">PLAN AHEAD</span>
                  <h3>Upcoming exams</h3>
                </div>
                <button className="text-action" onClick={() => navigate("/exams")}>
                  View all <ArrowUpRight size={15} />
                </button>
              </div>

              <div className="exam-list">
                {upcomingExams.map((exam) => (
                  <div className="exam-row" key={exam.subject}>
                    <div className="exam-date-box">
                      <span>{exam.date.split(" ")[0]}</span>
                      <strong>{exam.date.split(" ")[1]}</strong>
                    </div>
                    <div className="exam-main">
                      <strong>{exam.subject}</strong>
                      <span><i style={{ background: exam.color }} /> {exam.days} days away · demo</span>
                    </div>
                    <ChevronRight size={17} className="exam-chevron" />
                  </div>
                ))}
              </div>
            </article>
          </section>

          <footer className="dashboard-footer">
            <span>BrainScribe <span>·</span> Think smarter. Study better.</span>
            <span>One focused step at a time <span className="footer-spark">✳</span></span>
          </footer>
        </div>
      </section>
    </main>
  );
}
