import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import DramaPage from "./pages/DramaPage";
import WatchPage from "./pages/WatchPage"; 
import UserAuthPage from "./pages/UserAuthPage";
import LoginPage from "./pages/admin/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import DramasPage from "./pages/admin/DramasPage";
import EpisodesPage from "./pages/admin/EpisodesPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/drama/:slug" element={<DramaPage />} />
          <Route path="/watch/:episodeId" element={<WatchPage />} />
          <Route path="/login" element={<UserAuthPage />} />
          <Route path="/signup" element={<UserAuthPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="dramas" element={<DramasPage />} />
              <Route path="dramas/new" element={<DramasPage />} />
              <Route path="dramas/:dramaId/edit" element={<DramasPage />} />
              <Route path="episodes" element={<EpisodesPage />} />
              <Route path="episodes/new" element={<EpisodesPage />} />
              <Route path="episodes/:episodeId/edit" element={<EpisodesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
