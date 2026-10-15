import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import SubjectsPage from "./pages/SubjectsPage";
import ProtectedRoute from "./components/common/ProtectedRoute";
import StudyReminderRunner from "./components/common/StudyReminderRunner";
import { useAuth } from "./contexts/AuthContext";
import SchedulePage from "./pages/SchedulePage";
import FocusPage from "./pages/FocusPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotesPage from "./pages/NotesPage";
import SettingsPage from "./pages/SettingsPage";

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading">Loading BrainScribe...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <>
      <StudyReminderRunner />

      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
