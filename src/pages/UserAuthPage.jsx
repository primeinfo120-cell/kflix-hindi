
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { auth, firebaseReady } from "../firebase";
import { useAuth } from "../auth/useAuth";
import "../styles/admin.css";

export default function UserAuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const isSignup = location.pathname === "/signup";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return <div className="route-loading">Checking session…</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!firebaseReady || !auth) {
      setError("Firebase is not configured. Check your .env.local settings.");
      return;
    }

    if (isSignup && displayName.trim().length > 60) {
      setError("Your name must be 60 characters or fewer.");
      return;
    }

    setBusy(true);

    try {
      if (isSignup) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );

        await updateProfile(credential.user, {
          displayName: displayName.trim(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      const target = location.state?.from?.pathname || "/";
      navigate(target, { replace: true });
    } catch (cause) {
      const messages = {
        "auth/email-already-in-use": "This email already has an account. Please sign in.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Choose a stronger password with at least 6 characters.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
      };

      setError(messages[cause.code] || cause.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <Link className="admin-brand" to="/">
          KFLIX <span>HINDI</span>
        </Link>

        <span className="eyebrow">
          {isSignup ? "JOIN KFLIX HINDI" : "WELCOME BACK"}
        </span>

        <h1>{isSignup ? "Create your account" : "Sign in"}</h1>

        <p>
          {isSignup
            ? "Create an account to rate dramas and share your reviews."
            : "Sign in to rate dramas and share your reviews."}
        </p>

        {isSignup && (
          <label>
            Display name
            <input
              type="text"
              autoComplete="name"
              maxLength={60}
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <button
          className="button button-primary login-submit"
          type="submit"
          disabled={busy}
        >
          {busy
            ? "Please wait…"
            : isSignup
              ? "Create account"
              : "Sign in"}
        </button>

        <p>
          {isSignup ? "Already have an account? " : "New to Kflix Hindi? "}
          <Link to={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Sign in" : "Create an account"}
          </Link>
        </p>

        <Link className="back-public" to="/">
          ← Back to Kflix Hindi
        </Link>
      </form>
    </main>
  );
}
