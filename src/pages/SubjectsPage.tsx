
import { useMemo, useState, type FormEvent, type CSSProperties } from "react";
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
  Plus,
  Search,
  X,
  Sun,
  Moon,
  Menu,
  Pencil,
  Trash2,
  ArrowUpRight,
  ChevronRight,
  Target,
  BookMarked,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { logoutUser } from "../services/authService";
import { useTheme } from "../contexts/ThemeContext";

type Subject = {
  id: string;
  name: string;
  description: string;
  color: string;
  targetDate: string;
  totalTopics: number;
  completedTopics: number;
};

const initialSubjects: Subject[] = [
  {
    id: "subject-1",
    name: "Data Structures",
    description: "Core concepts, algorithms and problem-solving.",
    color: "#4f9cf9",
    targetDate: "",
    totalTopics: 12,
    completedTopics: 8,
  },
  {
    id: "subject-2",
    name: "Database Systems",
    description: "SQL, normalization, transactions and indexing.",
    color: "#a394ff",
    targetDate: "",
    totalTopics: 10,
    completedTopics: 6,
  },
  {
    id: "subject-3",
    name: "Computer Networks",
    description: "Networking fundamentals and protocols.",
    color: "#50d6b1",
    targetDate: "",
    totalTopics: 9,
    completedTopics: 4,
  },
];

const colorOptions = [
  { label: "Electric blue", value: "#4f9cf9" },
  { label: "Violet", value: "#a394ff" },
  { label: "Mint", value: "#50d6b1" },
  { label: "Amber", value: "#ffb86b" },
  { label: "Rose", value: "#ff8297" },
];

const navigation = [
  { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { label: "My Subjects", icon: BookOpen, path: "/subjects" },
  { label: "Study Schedule", icon: CalendarDays, path: "/schedule" },
  { label: "Focus Sessions", icon: Clock3, path: "/focus" },
  { label: "Analytics", icon: ChartNoAxesCombined, path: "/analytics" },
  { label: "Notes & Resources", icon: NotebookPen, path: "/notes" },
];

type SubjectForm = {
  name: string;
  description: string;
  color: string;
  targetDate: string;
  totalTopics: string;
  completedTopics: string;
};

const emptyForm: SubjectForm = {
  name: "",
  description: "",
  color: "#4f9cf9",
  targetDate: "",
  totalTopics: "10",
  completedTopics: "0",
};

export default function SubjectsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SubjectForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const firstName =
    user?.displayName?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "Student";

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSearch =
        subject.name.toLowerCase().includes(search.toLowerCase()) ||
        subject.description.toLowerCase().includes(search.toLowerCase());

      const progress =
        subject.totalTopics > 0
          ? (subject.completedTopics / subject.totalTopics) * 100
          : 0;

      const matchesFilter =
        filter === "all" ||
        (filter === "in-progress" &&
          progress > 0 &&
          progress < 100) ||
        (filter === "not-started" && progress === 0) ||
        (filter === "completed" && progress >= 100);

      return matchesSearch && matchesFilter;
    });
  }, [subjects, search, filter]);

  const totalTopics = subjects.reduce(
    (total, subject) => total + subject.totalTopics,
    0,
  );

  const completedTopics = subjects.reduce(
    (total, subject) => total + subject.completedTopics,
    0,
  );

  const overallProgress =
    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(subject: Subject) {
    setEditingId(subject.id);
    setForm({
      name: subject.name,
      description: subject.description,
      color: subject.color,
      targetDate: subject.targetDate,
      totalTopics: String(subject.totalTopics),
      completedTopics: String(subject.completedTopics),
    });
    setFormError("");
    setModalOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const name = form.name.trim();
    const total = Number(form.totalTopics);
    const completed = Number(form.completedTopics);

    if (!name) {
      setFormError("Enter a subject name.");
      return;
    }

    if (
      !Number.isInteger(total) ||
      total < 1 ||
      !Number.isInteger(completed) ||
      completed < 0 ||
      completed > total
    ) {
      setFormError(
        "Enter a valid topic count. Completed topics cannot exceed total topics.",
      );
      return;
    }

    const duplicate = subjects.some(
      (subject) =>
        subject.name.toLowerCase() === name.toLowerCase() &&
        subject.id !== editingId,
    );

    if (duplicate) {
      setFormError("A subject with this name already exists.");
      return;
    }

    const subjectData: Subject = {
      id: editingId ?? `subject-${Date.now()}`,
      name,
      description: form.description.trim(),
      color: form.color,
      targetDate: form.targetDate,
      totalTopics: total,
      completedTopics: completed,
    };

    if (editingId) {
      setSubjects((current) =>
        current.map((subject) =>
          subject.id === editingId ? subjectData : subject,
        ),
      );
    } else {
      setSubjects((current) => [subjectData, ...current]);
    }

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }
function requestDelete(subject: Subject) {
  setSubjectToDelete(subject);
}

function confirmDelete() {
  if (!subjectToDelete) return;

  setSubjects((current) =>
    current.filter((subject) => subject.id !== subjectToDelete.id),
  );

  setSubjectToDelete(null);
}

  async function handleLogout() {
    try {
      await logoutUser();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
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
        className={`dashboard-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}
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
          {navigation.map(({ label, icon: Icon, path }) => (
            <button
              key={label}
              className={`sidebar-link ${path === "/subjects" ? "active" : ""}`}
              onClick={() => {
                setSidebarOpen(false);
                navigate(path);
              }}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {path === "/subjects" && (
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
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <strong>{firstName}</strong>
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
                WORKSPACE <ChevronRight size={13} /> SUBJECTS
              </span>
              <h2>My subjects</h2>
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

        <div className="dashboard-content subjects-page-content">
          <section className="dashboard-welcome subjects-welcome">
            <div>
              <span className="welcome-kicker">
                <span className="welcome-live-dot" />
                BUILD YOUR KNOWLEDGE
              </span>
              <h1>Your learning library<span className="wave">✳</span></h1>
              <p>
                Organize your subjects, track topic progress, and keep your
                learning goals in sight.
              </p>
            </div>
            <button
              className="primary-dashboard-button"
              onClick={openAddModal}
            >
              <Plus size={18} /> Add subject
            </button>
          </section>

          <section className="subjects-overview-grid">
            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon blue">
                  <BookOpen size={19} />
                </span>
                <span className="stat-label">TOTAL SUBJECTS</span>
              </div>
              <div className="stat-value">{String(subjects.length).padStart(2, "0")}</div>
              <p className="stat-caption">Subjects in this workspace</p>
            </article>

{subjectToDelete && (
  <div
    className="subject-modal-backdrop"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        setSubjectToDelete(null);
      }
    }}
  >
    <section
      className="subject-modal delete-confirm-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-subject-title"
      aria-describedby="delete-subject-description"
    >
      <div className="delete-warning-icon">
        <Trash2 size={24} />
      </div>

      <span className="card-eyebrow">CONFIRM ACTION</span>

      <h2 id="delete-subject-title">Delete this subject?</h2>

      <p id="delete-subject-description">
        You're about to remove{" "}
        <strong>{subjectToDelete.name}</strong> from your workspace.
        This action cannot be undone in this demo.
      </p>

      <div className="delete-confirm-actions">
        <button
          type="button"
          className="secondary-subject-button"
          onClick={() => setSubjectToDelete(null)}
        >
          Keep subject
        </button>

        <button
          type="button"
          className="delete-confirm-button"
          onClick={confirmDelete}
        >
          <Trash2 size={16} />
          Delete subject
        </button>
      </div>
    </section>
  </div>
)}

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon purple">
                  <BookMarked size={19} />
                </span>
                <span className="stat-label">TOPICS TRACKED</span>
              </div>
              <div className="stat-value">{completedTopics}<span>/{totalTopics}</span></div>
              <p className="stat-caption">Topics marked as completed</p>
            </article>

            <article className="dashboard-stat-card">
              <div className="stat-card-top">
                <span className="stat-icon green">
                  <Target size={19} />
                </span>
                <span className="stat-label">OVERALL PROGRESS</span>
              </div>
              <div className="stat-value">{overallProgress}<span>%</span></div>
              <p className="stat-caption">Across all listed topics</p>
              <div className="stat-bottom-line">
                <span style={{ width: `${overallProgress}%` }} />
              </div>
            </article>
          </section>

          <section className="subjects-toolbar">
            <div className="subjects-search">
              <Search size={18} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search subjects..."
                aria-label="Search subjects"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <label className="subjects-filter">
              <span>Show</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                aria-label="Filter subjects by progress"
              >
                <option value="all">All subjects</option>
                <option value="in-progress">In progress</option>
                <option value="not-started">Not started</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </section>

          <section className="subjects-results-heading">
            <div>
              <h3>Your subjects</h3>
              <p>
                {filteredSubjects.length}{" "}
                {filteredSubjects.length === 1 ? "subject" : "subjects"} found
              </p>
            </div>
            <span className="chart-badge">DEMO DATA</span>
          </section>

          {filteredSubjects.length > 0 ? (
            <section className="subjects-card-grid">
              {filteredSubjects.map((subject) => {
                const progress =
                  subject.totalTopics > 0
                    ? Math.round(
                        (subject.completedTopics / subject.totalTopics) * 100,
                      )
                    : 0;

                return (
                  <article
                    className="dashboard-card subject-detail-card"
                    key={subject.id}
                    style={{ "--subject-accent": subject.color } as React.CSSProperties}
                  >
                    <div className="subject-card-accent" />

                    <div className="subject-detail-top">
                      <div className="subject-symbol subject-large-symbol">
                        <BookOpen size={22} />
                      </div>
                      <div className="subject-card-actions">
                        <button
                          type="button"
                          aria-label={`Edit ${subject.name}`}
                          title="Edit subject"
                          onClick={() => openEditModal(subject)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="subject-delete-action"
                          aria-label={`Delete ${subject.name}`}
                          title="Delete subject"
                          onClick={() => requestDelete(subject)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="subject-detail-copy">
                      <h3>{subject.name}</h3>
                      <p>
                        {subject.description ||
                          "No description added yet. Edit this subject to add one."}
                      </p>
                    </div>

                    <div className="subject-progress-summary">
                      <span>Topic completion</span>
                      <strong>{progress}%</strong>
                    </div>

                    <div
                      className="subject-progress subject-detail-progress"
                      role="progressbar"
                      aria-label={`${subject.name} topic completion`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                    >
                      <span style={{ width: `${progress}%` }} />
                    </div>

                    <div className="subject-card-footer">
                      <span>
                        <BookMarked size={15} />
                        {subject.completedTopics}/{subject.totalTopics} topics
                      </span>
                      {subject.targetDate ? (
                        <span>
                          Target{" "}
                          {new Date(
                            `${subject.targetDate}T00:00:00`,
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      ) : (
                        <span>No target date</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="dashboard-card subjects-empty-state">
              <span className="empty-state-icon">
                <BookOpen size={25} />
              </span>
              <h3>No subjects found</h3>
              <p>
                {search || filter !== "all"
                  ? "Try changing your search or filter."
                  : "Add your first subject to start organizing your learning."}
              </p>
              {search || filter !== "all" ? (
                <button
                  className="secondary-subject-button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <button
                  className="primary-dashboard-button"
                  onClick={openAddModal}
                >
                  <Plus size={17} /> Add your first subject
                </button>
              )}
            </section>
          )}

          <footer className="dashboard-footer">
            <span>BrainScribe <span>·</span> Think smarter. Study better.</span>
            <span>One focused step at a time <span className="footer-spark">✳</span></span>
          </footer>
        </div>
      </section>

      {modalOpen && (
        <div
          className="subject-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section
            className="subject-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="subject-modal-title"
          >
            <div className="subject-modal-heading">
              <div>
                <span className="card-eyebrow">
                  PERSONALIZE YOUR WORKSPACE
                </span>
                <h2 id="subject-modal-title">
                  {editingId ? "Edit subject" : "Add a subject"}
                </h2>
                <p>Set up a subject and track the topics you cover.</p>
              </div>
              <button
                type="button"
                className="subject-modal-close"
                aria-label="Close dialog"
                onClick={() => setModalOpen(false)}
              >
                <X size={19} />
              </button>
            </div>

            <form className="subject-form" onSubmit={handleSubmit}>
              <label>
                Subject name <span>*</span>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Operating Systems"
                  maxLength={70}
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="What will you learn in this subject?"
                  rows={3}
                  maxLength={240}
                />
              </label>

              <div className="subject-form-two-col">
                <label>
                  Total topics <span>*</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    value={form.totalTopics}
                    onChange={(event) =>
                      setForm({ ...form, totalTopics: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Completed topics
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="1"
                    value={form.completedTopics}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        completedTopics: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <label>
                Target date <span className="optional-label">Optional</span>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(event) =>
                    setForm({ ...form, targetDate: event.target.value })
                  }
                />
              </label>

              <fieldset className="subject-color-field">
                <legend>Choose an accent color</legend>
                <div className="subject-color-options">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`subject-color-option ${
                        form.color === option.value ? "selected" : ""
                      }`}
                      style={{ "--swatch": option.value } as React.CSSProperties}
                      onClick={() => setForm({ ...form, color: option.value })}
                      aria-label={option.label}
                      aria-pressed={form.color === option.value}
                      title={option.label}
                    >
                      {form.color === option.value && (
                        <span className="subject-color-check">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </fieldset>

              {formError && (
                <p className="subject-form-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="subject-form-actions">
                <button
                  type="button"
                  className="secondary-subject-button"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-dashboard-button">
                  {editingId ? "Save changes" : "Create subject"}
                  <ArrowUpRight size={17} />
                </button>
              </div>

              <p className="subject-demo-note">
                Demo mode: changes are stored in page state and will reset on
                refresh until Firebase is connected.
              </p>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
