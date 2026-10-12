
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  BrainCircuit,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
  Plus,
  Search,
  SlidersHorizontal,
  FileText,
  Link as LinkIcon,
  Pencil,
  Trash2,
  ExternalLink,
  Pin,
  BookMarked,
  StickyNote,
  CircleHelp,
} from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { logoutUser } from "../services/authService";
import { useTheme } from "../contexts/ThemeContext";

type NoteCategory =
  | "Lecture Notes"
  | "Revision"
  | "Important Questions"
  | "Resources";

type StudyNote = {
  id: string;
  title: string;
  content: string;
  subject: string;
  category: NoteCategory;
  resourceUrl: string;
  pinned: boolean;
  updatedAt: string;
};

const navigation = [
  { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { label: "My Subjects", icon: BookOpen, path: "/subjects" },
  { label: "Study Schedule", icon: CalendarDays, path: "/schedule" },
  { label: "Focus Sessions", icon: Clock3, path: "/focus" },
  { label: "Analytics", icon: ChartNoAxesCombined, path: "/analytics" },
  { label: "Notes & Resources", icon: NotebookPen, path: "/notes" },
];

const subjects = [
  "Data Structures",
  "Database Systems",
  "Computer Networks",
  "Operating Systems",
  "Mathematics",
  "General",
];

const categories: NoteCategory[] = [
  "Lecture Notes",
  "Revision",
  "Important Questions",
  "Resources",
];

const categoryIcons = {
  "Lecture Notes": FileText,
  Revision: BookMarked,
  "Important Questions": CircleHelp,
  Resources: LinkIcon,
};

const emptyForm = {
  title: "",
  content: "",
  subject: "Data Structures",
  category: "Lecture Notes" as NoteCategory,
  resourceUrl: "",
  pinned: false,
};

export default function NotesPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [subjectFilter, setSubjectFilter] = useState("All subjects");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const userName =
    user?.displayName?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "Student";

  // Subscribe to the signed-in user's notes.
  useEffect(() => {
    if (!user?.uid) {
      setNotes([]);
      setLoadingNotes(false);
      return;
    }

    setLoadingNotes(true);
    setActionError("");

    const notesRef = collection(db, "users", user.uid, "notes");

    const unsubscribe = onSnapshot(
      notesRef,
      (snapshot) => {
        const savedNotes: StudyNote[] = snapshot.docs.map((noteDoc) => {
          const data = noteDoc.data();

          const category = categories.includes(data.category)
            ? (data.category as NoteCategory)
            : "Lecture Notes";

          return {
            id: noteDoc.id,
            title: typeof data.title === "string" ? data.title : "",
            content: typeof data.content === "string" ? data.content : "",
            subject:
              typeof data.subject === "string" ? data.subject : "General",
            category,
            resourceUrl:
              typeof data.resourceUrl === "string" ? data.resourceUrl : "",
            pinned: data.pinned === true,
            updatedAt:
              typeof data.updatedAt === "string"
                ? data.updatedAt
                : new Date().toISOString(),
          };
        });

console.log("[Notes] Snapshot status:", {
  fromCache: snapshot.metadata.fromCache,
  hasPendingWrites: snapshot.metadata.hasPendingWrites,
  noteCount: snapshot.size,
});

        setNotes(savedNotes);
        setLoadingNotes(false);
      },
      (error) => {
        console.error("Failed to load notes:", error);
        setActionError(
          "Couldn't load your notes. Check your connection and Firestore rules.",
        );
        setLoadingNotes(false);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...notes]
      .filter((note) => {
        const matchesQuery =
          !query ||
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.subject.toLowerCase().includes(query);

        const matchesCategory =
          categoryFilter === "All categories" ||
          note.category === categoryFilter;

        const matchesSubject =
          subjectFilter === "All subjects" ||
          note.subject === subjectFilter;

        return matchesQuery && matchesCategory && matchesSubject;
      })
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime(),
      );
  }, [notes, searchQuery, categoryFilter, subjectFilter]);

  const pinnedCount = notes.filter((note) => note.pinned).length;
  const resourceCount = notes.filter(
    (note) => note.resourceUrl.trim(),
  ).length;

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(note: StudyNote) {
    setEditingId(note.id);
    setForm({
      title: note.title,
      content: note.content,
      subject: note.subject,
      category: note.category,
      resourceUrl: note.resourceUrl,
      pinned: note.pinned,
    });
    setFormError("");
    setModalOpen(true);
  }


function saveNote(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!user?.uid) {
    setFormError("Please sign in to save your notes.");
    return;
  }

  const title = form.title.trim();
  const content = form.content.trim();
  const resourceUrl = form.resourceUrl.trim();

  if (!title) {
    setFormError("Please enter a title for your note.");
    return;
  }

  if (!content) {
    setFormError("Please add some note content before saving.");
    return;
  }

  if (resourceUrl) {
    try {
      const url = new URL(resourceUrl);

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        setFormError("Resource links must start with http:// or https://.");
        return;
      }
    } catch {
      setFormError("Please enter a valid resource URL.");
      return;
    }
  }

  if (saving) return;

  setSaving(true);
  setFormError("");
  setActionError("");

  const startedAt = performance.now();

  const noteData = {
    title,
    content,
    subject: form.subject,
    category: form.category,
    resourceUrl,
    pinned: form.pinned,
    updatedAt: new Date().toISOString(),
  };

  console.info("[Notes] Save started");

  const writePromise = editingId
    ? updateDoc(
        doc(db, "users", user.uid, "notes", editingId),
        noteData,
      )
    : addDoc(
        collection(db, "users", user.uid, "notes"),
        noteData,
      );

  // Close the modal immediately for a responsive UI.
  setModalOpen(false);
  setEditingId(null);
  setForm(emptyForm);

  void writePromise
    .then(() => {
      console.info(
        `[Notes] Firestore confirmed save in ${(
          performance.now() - startedAt
        ).toFixed(0)} ms`,
      );
    })
    .catch((error: unknown) => {
      console.error("[Notes] Save failed:", error);

      setActionError(
        "Your note could not be saved to the server. Please check your connection and try again.",
      );
    })
    .finally(() => {
      setSaving(false);
    });
}


  async function togglePinned(id: string) {
    if (!user?.uid) return;

    const note = notes.find((item) => item.id === id);
    if (!note) return;

    setActionError("");

    try {
      await updateDoc(doc(db, "users", user.uid, "notes", id), {
        pinned: !note.pinned,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to update pinned status:", error);
      setActionError(
        "Couldn't update the pinned status. Please try again.",
      );
    }
  }

  async function confirmDelete() {
    if (!deleteId || !user?.uid || deleting) return;

    setDeleting(true);
    setActionError("");

    try {
      await deleteDoc(doc(db, "users", user.uid, "notes", deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Failed to delete note:", error);
      setActionError("Couldn't delete this note. Please try again.");
    } finally {
      setDeleting(false);
    }
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

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "recently";

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <main className="dashboard-shell notes-shell">
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
              key={path}
              className={`sidebar-link ${path === "/notes" ? "active" : ""}`}
              onClick={() => {
                setSidebarOpen(false);
                if (path !== "/notes") navigate(path);
              }}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {path === "/notes" && <span className="nav-active-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="sidebar-tip-icon">
              <BrainCircuit size={18} />
            </span>
            <p>Capture an idea today. Make revision easier tomorrow.</p>
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
              disabled={loggingOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <section className="dashboard-main notes-main">
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
                WORKSPACE <ChevronRight size={13} /> NOTES & RESOURCES
              </span>
              <h2>Notes & Resources</h2>
            </div>
          </div>

          <div className="topbar-actions">
            <span className="notes-topbar-label">
              <span />
              Your knowledge library
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

        <div className="dashboard-content notes-content">
          <section className="notes-welcome">
            <div>
              <span className="notes-eyebrow">
                <span /> YOUR SECOND BRAIN
              </span>
              <h1>Keep your ideas close.</h1>
              <p>
                Collect your class notes, revision points, and useful learning
                resources in one place.
              </p>
            </div>
            <button
              className="notes-primary-button"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              Create a note
            </button>
          </section>

          <section className="notes-stat-grid" aria-label="Notes overview">
            <article className="notes-stat-card">
              <span className="notes-stat-icon notes-stat-blue">
                <StickyNote size={20} />
              </span>
              <div>
                <span>Total notes</span>
                <strong>{notes.length.toString().padStart(2, "0")}</strong>
                <small>Across your study subjects</small>
              </div>
            </article>
            <article className="notes-stat-card">
              <span className="notes-stat-icon notes-stat-purple">
                <Pin size={20} />
              </span>
              <div>
                <span>Pinned notes</span>
                <strong>{pinnedCount.toString().padStart(2, "0")}</strong>
                <small>Quick access to key ideas</small>
              </div>
            </article>
            <article className="notes-stat-card">
              <span className="notes-stat-icon notes-stat-green">
                <LinkIcon size={20} />
              </span>
              <div>
                <span>Saved resources</span>
                <strong>{resourceCount.toString().padStart(2, "0")}</strong>
                <small>Notes with a resource link</small>
              </div>
            </article>
          </section>

          <section className="notes-library">
            <div className="notes-library-heading">
              <div>
                <span className="notes-eyebrow">YOUR LIBRARY</span>
                <h2>All your notes</h2>
                <p>Search, filter, and pick up where you left off.</p>
              </div>
              <span className="notes-result-count">
                {filteredNotes.length}{" "}
                {filteredNotes.length === 1 ? "note" : "notes"}
              </span>
            </div>

            <div className="notes-toolbar">
              <label className="notes-search">
                <Search size={18} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search titles, content, or subjects..."
                  aria-label="Search notes"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery("")}
                  >
                    <X size={16} />
                  </button>
                )}
              </label>

              <div className="notes-filter">
                <SlidersHorizontal size={16} />
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  aria-label="Filter by category"
                >
                  <option>All categories</option>
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="notes-filter">
                <BookOpen size={16} />
                <select
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  aria-label="Filter by subject"
                >
                  <option>All subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>

            {actionError && (
              <p className="notes-form-error" role="alert">
                {actionError}
              </p>
            )}

            {loadingNotes ? (
              <div className="notes-empty-state" role="status">
                <span>
                  <NotebookPen size={25} />
                </span>
                <h3>Loading your notes</h3>
                <p>Your knowledge library is on its way.</p>
              </div>
            ) : filteredNotes.length > 0 ? (
              <div className="notes-grid">
                {filteredNotes.map((note) => {
                  const CategoryIcon = categoryIcons[note.category];

                  return (
                    <article className="notes-card" key={note.id}>
                      <div className="notes-card-top">
                        <span
                          className={`notes-category notes-category-${categories.indexOf(note.category)}`}
                        >
                          <CategoryIcon size={14} />
                          {note.category}
                        </span>
                        <button
                          className={`notes-pin-button ${note.pinned ? "is-pinned" : ""}`}
                          onClick={() => togglePinned(note.id)}
                          aria-label={note.pinned ? "Unpin note" : "Pin note"}
                          title={note.pinned ? "Unpin note" : "Pin note"}
                        >
                          <Pin size={16} />
                        </button>
                      </div>

                      <div className="notes-card-body">
                        <span className="notes-subject">{note.subject}</span>
                        <h3>{note.title}</h3>
                        <p>{note.content}</p>
                      </div>

                      {note.resourceUrl && (
                        <a
                          className="notes-resource-link"
                          href={note.resourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <LinkIcon size={15} />
                          Open saved resource
                          <ExternalLink size={14} />
                        </a>
                      )}

                      <div className="notes-card-footer">
                        <span>Updated {formatDate(note.updatedAt)}</span>
                        <div>
                          <button
                            onClick={() => openEditModal(note)}
                            aria-label={`Edit ${note.title}`}
                            title="Edit note"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="notes-delete-action"
                            onClick={() => setDeleteId(note.id)}
                            aria-label={`Delete ${note.title}`}
                            title="Delete note"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="notes-empty-state">
                <span>
                  <NotebookPen size={25} />
                </span>
                <h3>No notes found</h3>
                <p>
                  {notes.length === 0
                    ? "Start your library by creating your first study note."
                    : "Try another search or adjust your filters."}
                </p>
                {notes.length === 0 ? (
                  <button
                    className="notes-primary-button"
                    onClick={openCreateModal}
                  >
                    <Plus size={17} /> Create your first note
                  </button>
                ) : (
                  <button
                    className="notes-secondary-button"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("All categories");
                      setSubjectFilter("All subjects");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </section>

          <footer className="dashboard-footer">
            <span>
              BrainScribe <span>·</span> Think smarter. Study better.
            </span>
            <span>
              Save a thought. Strengthen your learning{" "}
              <span className="footer-spark">✳</span>
            </span>
          </footer>
        </div>
      </section>

      {modalOpen && (
        <div
          className="notes-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setModalOpen(false);
            }
          }}
        >
          <section
            className="notes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notes-modal-title"
          >
            <div className="notes-modal-heading">
              <div>
                <span className="notes-eyebrow">
                  {editingId ? "REFINE YOUR KNOWLEDGE" : "CAPTURE AN IDEA"}
                </span>
                <h2 id="notes-modal-title">
                  {editingId ? "Edit note" : "Create a note"}
                </h2>
                <p>Keep the important details somewhere you can find them.</p>
              </div>
              <button
                className="notes-modal-close"
                onClick={() => setModalOpen(false)}
                aria-label="Close dialog"
                disabled={saving}
              >
                <X size={19} />
              </button>
            </div>

            <form className="notes-form" onSubmit={saveNote}>
              <label>
                Note title
                <input
                  autoFocus
                  maxLength={100}
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g. SQL joins — quick revision"
                  required
                />
              </label>

              <div className="notes-form-row">
                <label>
                  Subject
                  <select
                    value={form.subject}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        subject: event.target.value,
                      }))
                    }
                  >
                    {subjects.map((subject) => (
                      <option key={subject}>{subject}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Category
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category: event.target.value as NoteCategory,
                      }))
                    }
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Note content
                <textarea
                  rows={6}
                  maxLength={10000}
                  value={form.content}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  placeholder="Write down concepts, summaries, questions, or revision points..."
                  required
                />
                <span className="notes-character-count">
                  {form.content.length}/10000 characters
                </span>
              </label>

              <label>
                Resource URL <span className="notes-optional">(optional)</span>
                <input
                  type="url"
                  value={form.resourceUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      resourceUrl: event.target.value,
                    }))
                  }
                  placeholder="https://example.com"
                />
              </label>

              <label className="notes-pin-checkbox">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pinned: event.target.checked,
                    }))
                  }
                />
                <span>
                  <Pin size={16} /> Pin this note for quick access
                </span>
              </label>

              {formError && (
                <p className="notes-form-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="notes-modal-actions">
                <button
                  type="button"
                  className="notes-secondary-button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="notes-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create note"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteId && (
        <div
          className="notes-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleting
            ) {
              setDeleteId(null);
            }
          }}
        >
          <section
            className="notes-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="notes-delete-title"
          >
            <span className="notes-delete-icon">
              <Trash2 size={22} />
            </span>
            <h2 id="notes-delete-title">Delete this note?</h2>
            <p>
              This note will be permanently deleted. This action cannot be
              undone.
            </p>
            <div className="notes-modal-actions">
              <button
                className="notes-secondary-button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Keep note
              </button>
              <button
                className="notes-danger-button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete note"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
