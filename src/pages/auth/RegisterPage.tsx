import { useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/authService";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords don't match yet.");
      return;
    }

    setLoading(true);

    try {
      await registerUser(name, email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof FirebaseError) {
        const messages: Record<string, string> = {
          "auth/email-already-in-use": "An account already exists with this email.",
          "auth/invalid-email": "Please enter a valid email address.",
          "auth/weak-password": "Choose a stronger password.",
          "auth/operation-not-allowed": "Email registration isn't enabled in Firebase.",
          "auth/network-request-failed": "Network error. Check your connection.",
        };

        setError(messages[err.code] ?? "Unable to create your account. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <header className="mobile-brand">
        <BrandMark />
        <span>BrainScribe</span>
      </header>

      <section className="auth-window">
        <aside className="auth-visual">
          <div className="visual-grid" />
          <div className="visual-top">
            <BrandMark />
            <span className="brand-name">BrainScribe</span>
            <span className="brand-pill">YOUR AI STUDY PARTNER</span>
          </div>

          <div className="visual-content">
            <div className="orbital-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit orbit-three" />
              <div className="brain-orb"><div className="brain-core">B</div></div>
              <span className="orbit-dot dot-one" />
              <span className="orbit-dot dot-two" />
              <span className="orbit-dot dot-three" />
              <span className="orbit-dot dot-four" />
              <div className="floating-chip chip-focus">
                <span className="chip-icon">◷</span>
                <span><strong>One clear goal</strong><small>Then the next one</small></span>
              </div>
              <div className="floating-chip chip-ai">
                <span className="chip-spark">✳</span>
                <span><strong>Your own rhythm</strong><small>Your own progress</small></span>
              </div>
            </div>

            <p className="eyebrow"><span className="status-dot" /> SMALL STEPS. BIG MOMENTUM.</p>
            <h2>Build habits.<br /><span>Become unstoppable.</span></h2>
            <p className="visual-description">
              A more thoughtful way to prepare, stay focused, and make
              every hour of learning count.
            </p>

            <div className="visual-features">
              <span><i>✓</i> A plan that fits your life</span>
              <span><i>✓</i> Focused, distraction-free sessions</span>
              <span><i>✓</i> Progress you can be proud of</span>
            </div>
          </div>

          <div className="visual-footer">
            <span>YOUR POTENTIAL, WITH A PLAN</span>
            <span className="footer-decoration">✳ &nbsp; START SOMEWHERE</span>
          </div>
        </aside>

        <section className="auth-panel register-panel">
          <div className="auth-panel-top">
            <span className="secure-label"><span className="secure-dot" /> YOUR NEXT CHAPTER</span>
            <span className="panel-step">02 <span>/ 02</span></span>
          </div>

          <div className="auth-form-wrap">
            <div className="welcome-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2.8 20v-1.5a6.2 6.2 0 0 1 12.4 0V20M18 8v6M15 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>

            <p className="form-kicker">A FRESH START, BUILT AROUND YOU</p>
            <h1>Make it <span>yours.</span></h1>
            <p className="form-description">
              Set yourself up for more focused days and smarter study sessions.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="field-group">
                <label htmlFor="register-name">Full name</label>
                <div className="input-shell">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5 20v-1.5a7 7 0 0 1 14 0V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input
                    id="register-name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your Name"
                    required
                    minLength={2}
                  />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="register-email">Email address</label>
                <div className="input-shell">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="m5 7 7 5.5L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="your Email Address"
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="register-password">Password</label>
                <div className="input-shell">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="4.5" y="10" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="confirm-password">Confirm password</label>
                <div className="input-shell">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Enter your password again"
                    required
                  />
                </div>
              </div>

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button className="auth-submit" type="submit" disabled={loading}>
                <span>{loading ? "Creating your account..." : "Create my account"}</span>
                {!loading && <span className="submit-arrow">↗</span>}
                {loading && <span className="button-spinner" />}
              </button>

              <p className="terms-note">
                By continuing, you're creating an account to manage your own study journey.
              </p>
            </form>

            <p className="auth-switch register-switch">
              Already have an account? <Link to="/login">Sign in <span>↗</span></Link>
            </p>
          </div>

          <footer className="auth-panel-footer">
            <span>© {new Date().getFullYear()} BrainScribe</span>
            <span><span className="footer-lock">◇</span> Your next chapter starts here.</span>
          </footer>
        </section>
      </section>
    </main>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none">
        <path d="M18 5 30 12v12L18 31 6 24V12L18 5Z" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M18 11v14M11.5 14.5l13 7M24.5 14.5l-13 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="18" cy="18" r="3" fill="currentColor"/>
      </svg>
    </span>
  );
}