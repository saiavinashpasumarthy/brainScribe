
import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  Clock3,
  Moon,
  Palette,
  Settings2,
  Sun,
  Target,
  UserRound,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme, type Theme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";

interface StudyPreferences {
  dailyGoalHours: number;
  weeklyGoalHours: number;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

const DEFAULT_PREFERENCES: StudyPreferences = {
  dailyGoalHours: 3,
  weeklyGoalHours: 21,
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

function loadPreferences(): StudyPreferences {
  try {
    const saved = localStorage.getItem("brainscribe-study-preferences");

    if (saved) {
      return {
        ...DEFAULT_PREFERENCES,
        ...JSON.parse(saved),
      };
    }
  } catch {
    // Fall back to the default preferences if saved data is invalid.
  }

  return DEFAULT_PREFERENCES;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [preferences, setPreferences] =
    useState<StudyPreferences>(loadPreferences);
  const [saved, setSaved] = useState(false);
const navigate = useNavigate();
  useEffect(() => {
    localStorage.setItem(
      "brainscribe-study-preferences",
      JSON.stringify(preferences),
    );
  }, [preferences]);

  const updatePreference = (
    key: keyof StudyPreferences,
    value: number,
  ) => {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
    setSaved(false);
  };

  const chooseTheme = (nextTheme: Theme) => {
    if (theme !== nextTheme) {
      toggleTheme();
    }
  };

  const resetPreferences = () => {
    setPreferences({ ...DEFAULT_PREFERENCES });
    setSaved(false);
  };

  const savePreferences = () => {
    localStorage.setItem(
      "brainscribe-study-preferences",
      JSON.stringify(preferences),
    );
    setSaved(true);
  };

  const displayName = user?.displayName?.trim() || "BrainScribe Student";
  const email = user?.email || "No email available";
  const avatar = user?.photoURL;
const [imageFailed, setImageFailed] = useState(false);
  return (
    <main className="settings-page">
      <header className="settings-header">
        <div>
          <div className="settings-eyebrow">
            <Settings2 size={15} />
            PERSONAL WORKSPACE
          </div>
          <h1>Settings</h1>
          <p>
            Make BrainScribe work the way you study.
          </p>
        </div>

        <button
  type="button"
  className="settings-back-button"
  onClick={() => navigate("/dashboard")}
>
  ← Back to Dashboard
</button>
      </header>

      <div className="settings-layout">
        <aside className="settings-intro-card">
          <div className="settings-profile">

<div className="settings-avatar">
  {avatar && !imageFailed ? (
    <img
      src={avatar}
      alt=""
      onError={() => setImageFailed(true)}
    />
  ) : (
    <span className="settings-avatar-initial">
      {displayName.trim().charAt(0).toUpperCase() || "B"}
    </span>
  )}
</div>


            <div className="settings-profile-info">
              <h2>{displayName}</h2>
              <p>{email}</p>
            </div>
          </div>

          <div className="settings-divider" />

          <p className="settings-side-label">YOUR WORKSPACE</p>

          <a className="settings-side-link active" href="#appearance">
            <Palette size={17} />
            Appearance
          </a>
          <a className="settings-side-link" href="#account">
            <UserRound size={17} />
            Account
          </a>
          <a className="settings-side-link" href="#study-preferences">
            <BookOpen size={17} />
            Study preferences
          </a>

          <div className="settings-tip">
            <Target size={19} />
            <div>
              <strong>Small steps add up.</strong>
              <p>Set realistic goals and build a consistent routine.</p>
            </div>
          </div>
        </aside>

        <div className="settings-content">
          <section className="settings-card" id="appearance">
            <div className="settings-section-heading">
              <div className="settings-section-icon">
                <Palette size={20} />
              </div>
              <div>
                <h2>Appearance</h2>
                <p>Choose how BrainScribe looks on your device.</p>
              </div>
            </div>

            <div className="settings-option-row">
              <div className="settings-option-copy">
                <h3>Interface theme</h3>
                <p>Your choice is saved automatically.</p>
              </div>

              <div className="settings-theme-options">
                <button
                  type="button"
                  className={`settings-theme-choice ${
                    theme === "dark" ? "selected" : ""
                  }`}
                  onClick={() => chooseTheme("dark")}
                  aria-pressed={theme === "dark"}
                >
                  <Moon size={18} />
                  <span>Dark</span>
                  {theme === "dark" && <Check size={15} />}
                </button>

                <button
                  type="button"
                  className={`settings-theme-choice ${
                    theme === "light" ? "selected" : ""
                  }`}
                  onClick={() => chooseTheme("light")}
                  aria-pressed={theme === "light"}
                >
                  <Sun size={18} />
                  <span>Light</span>
                  {theme === "light" && <Check size={15} />}
                </button>
              </div>
            </div>
          </section>

          <section className="settings-card" id="account">
            <div className="settings-section-heading">
              <div className="settings-section-icon">
                <UserRound size={20} />
              </div>
              <div>
                <h2>Account</h2>
                <p>Information associated with your signed-in account.</p>
              </div>
            </div>

            <div className="settings-account-grid">
              <div className="settings-field">
                <label htmlFor="settings-display-name">Display name</label>
                <input
                  id="settings-display-name"
                  type="text"
                  value={displayName}
                  readOnly
                />
              </div>

              <div className="settings-field">
                <label htmlFor="settings-email">Email address</label>
                <input
                  id="settings-email"
                  type="email"
                  value={email}
                  readOnly
                />
              </div>
            </div>

            <p className="settings-helper">
              These details come from your authenticated account. Account
              editing can be added separately without changing your login
              setup.
            </p>
          </section>

          <section className="settings-card" id="study-preferences">
            <div className="settings-section-heading">
              <div className="settings-section-icon">
                <BookOpen size={20} />
              </div>
              <div>
                <h2>Study preferences</h2>
                <p>Set study targets and customize your focus sessions.</p>
              </div>
            </div>

            <div className="settings-preference-grid">
              <PreferenceField
                label="Daily study goal"
                description="Hours you aim to study each day."
                value={preferences.dailyGoalHours}
                min={1}
                max={16}
                suffix="hours"
                onChange={(value) =>
                  updatePreference("dailyGoalHours", value)
                }
              />

              <PreferenceField
                label="Weekly study goal"
                description="Your target study hours per week."
                value={preferences.weeklyGoalHours}
                min={1}
                max={112}
                suffix="hours"
                onChange={(value) =>
                  updatePreference("weeklyGoalHours", value)
                }
              />

              <PreferenceField
                label="Focus duration"
                description="Length of each focused study session."
                value={preferences.focusMinutes}
                min={5}
                max={180}
                suffix="min"
                onChange={(value) =>
                  updatePreference("focusMinutes", value)
                }
              />

              <PreferenceField
                label="Short break"
                description="Rest time between focus sessions."
                value={preferences.shortBreakMinutes}
                min={1}
                max={30}
                suffix="min"
                onChange={(value) =>
                  updatePreference("shortBreakMinutes", value)
                }
              />

              <PreferenceField
                label="Long break"
                description="A longer rest after several sessions."
                value={preferences.longBreakMinutes}
                min={5}
                max={60}
                suffix="min"
                onChange={(value) =>
                  updatePreference("longBreakMinutes", value)
                }
              />
            </div>

            <div className="settings-actions">
              <button
                type="button"
                className="settings-reset-button"
                onClick={resetPreferences}
              >
                Reset defaults
              </button>

              <button
                type="button"
                className="settings-save-button"
                onClick={savePreferences}
              >
                {saved ? <Check size={17} /> : <Clock3 size={17} />}
                {saved ? "Preferences saved" : "Save preferences"}
              </button>
            </div>

            <p className="settings-helper">
              Preferences are saved in this browser. They are not yet synced
              across devices or automatically applied to your existing
              analytics and focus timer.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function PreferenceField({
  label,
  description,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="settings-preference-field">
      <label>{label}</label>
      <p>{description}</p>

      <div className="settings-number-control">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          aria-label={label}
          onChange={(event) => {
            const nextValue = Number(event.target.value);

            if (event.target.value === "") {
              return;
            }

            onChange(Math.min(max, Math.max(min, nextValue)));
          }}
        />
        <span>{suffix}</span>
      </div>
    </div>
  );
}
