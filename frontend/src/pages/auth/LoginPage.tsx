import { useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../../services/authService";
import ThemeToggle from "../../components/common/ThemeToggle";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const requestedPath = location.state?.from?.pathname;
  const destination =
    requestedPath && !["/login", "/register"].includes(requestedPath)
      ? requestedPath
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser(email, password);
      navigate(destination, { replace: true });
    } catch (err) {
      if (err instanceof FirebaseError) {
        const messages: Record<string, string> = {
          "auth/invalid-credential": "Incorrect email or password.",
          "auth/user-disabled": "This account has been disabled.",
          "auth/invalid-email": "Please enter a valid email address.",
          "auth/too-many-requests": "Too many attempts. Please try again later.",
          "auth/network-request-failed": "Network error. Check your connection.",
        };

        setError(messages[err.code] ?? "Unable to sign in. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell login-page">
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
              <div className="brain-orb">
                <div className="brain-core">B</div>
              </div>
              <span className="orbit-dot dot-one" />
              <span className="orbit-dot dot-two" />
              <span className="orbit-dot dot-three" />
              <span className="orbit-dot dot-four" />
              <div className="floating-chip chip-focus">
                <span className="chip-icon">◷</span>
                <span><strong>Focus mode</strong><small>One task at a time</small></span>
              </div>
              <div className="floating-chip chip-ai">
                <span className="chip-spark">✳</span>
                <span><strong>AI insights</strong><small>Made for your goals</small></span>
              </div>
            </div>

            <p className="eyebrow"><span className="status-dot" /> YOUR NEXT CHAPTER STARTS HERE</p>
            <h2>Make your<br />ambition <span>actionable.</span></h2>
            <p className="visual-description">
              Turn big academic goals into focused sessions, smarter plans,
              and progress you can actually see.
            </p>

            <div className="visual-features">
              <span><i>✓</i> Personalized study plans</span>
              <span><i>✓</i> Progress that keeps you motivated</span>
              <span><i>✓</i> More focus, less overwhelm</span>
            </div>
          </div>

          <div className="visual-footer">
            <span>BUILT FOR YOUR NEXT BREAKTHROUGH</span>
            <span className="footer-decoration">✳ &nbsp; STUDY WITH INTENTION</span>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-top">
            <span className="secure-label"><span className="secure-dot" /> YOUR SPACE TO GROW</span>
            <ThemeToggle/>
            <span className="panel-step">01 <span>/ 02</span></span>
          </div>

          <div className="auth-form-wrap">
            <div className="welcome-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12m0-12.72-2.12 2.12m-8.48 8.48-2.12 2.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>

            <p className="form-kicker">PICK UP WHERE YOU LEFT OFF</p>
            <h1>Welcome <span>back.</span></h1>
            <p className="form-description">
              Your goals haven't gone anywhere. Let's get back to them.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="field-group">
                <label htmlFor="login-email">Email address</label>
                <div className="input-shell">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="m5 7 7 5.5L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    id="login-email"
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
                <div className="label-row">
                  <label htmlFor="login-password">Password</label>
                </div>
                <div className="input-shell">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="4.5" y="10" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="15" r="1" fill="currentColor"/>
                  </svg>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
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

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button className="auth-submit" type="submit" disabled={loading}>
                <span>{loading ? "Signing you in..." : "Sign in to BrainScribe"}</span>
                {!loading && <span className="submit-arrow">↗</span>}
                {loading && <span className="button-spinner" />}
              </button>
            </form>

            <div className="auth-divider"><span>YOUR JOURNEY, CONTINUED</span></div>

            <p className="auth-switch">
              New to BrainScribe? <Link to="/register">Create your account <span>↗</span></Link>
            </p>
          </div>

          <footer className="auth-panel-footer">
            <span>© {new Date().getFullYear()} BrainScribe</span>
            <span><span className="footer-lock">◇</span> A little progress every day.</span>
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