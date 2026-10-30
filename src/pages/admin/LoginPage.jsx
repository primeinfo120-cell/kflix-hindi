import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { auth, firebaseReady } from "../../firebase";
import { useAuth } from "../../auth/useAuth";
import "../../styles/admin.css";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) return <div className="route-loading">Checking admin session…</div>;
  if (user) return <Navigate to="/admin" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!firebaseReady || !auth) {
      setError("Firebase is not configured. Add your Firebase web app values to .env.local.");
      return;
    }
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const target = location.state?.from?.pathname || "/admin";
      navigate(target, { replace: true });
    } catch (cause) {
      setError(cause.code === "auth/invalid-credential" || cause.code === "auth/wrong-password"
        ? "Email or password is incorrect."
        : cause.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <a className="admin-brand" href="/">KFLIX <span>STUDIO</span></a>
        <span className="eyebrow">SECURE ADMIN ACCESS</span>
        <h1>Welcome back</h1>
        <p>Sign in with an authorized Firebase account to manage your content.</p>
        <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="button button-primary login-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <a className="back-public" href="/">← Back to Kflix Hindi</a>
      </form>
    </main>
  );
}
