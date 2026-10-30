import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="route-loading">Checking admin session…</div>;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  return <Outlet />;
}
