import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { LoadingState } from "./components/ui";
import { useAuth } from "./context/AuthContext";
import { AdminPage } from "./pages/AdminPage";
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from "./pages/AuthPages";
import { EditSubmissionPage } from "./pages/EditSubmissionPage";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { ModerationPage } from "./pages/ModerationPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ResourcePage } from "./pages/ResourcePage";
import { SavedPage } from "./pages/SavedPage";
import { SubmissionsPage } from "./pages/SubmissionsPage";
import { SubmitPage } from "./pages/SubmitPage";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="full-screen-loading"><LoadingState label="Opening study bank" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <AppShell><Outlet /></AppShell>;
}

function RoleRoute({ roles }: { roles: Array<"moderator" | "admin"> }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role as "moderator" | "admin")) return <Navigate to="/" replace />;
  return <Outlet />;
}

function NotFoundPage() {
  return (
    <div className="page not-found-page">
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <a className="button button-primary button-md" href="/">Return home</a>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register/:token" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      <Route element={<ProtectedLayout />}>
        <Route index element={<HomePage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="resources/:resourceId" element={<ResourcePage />} />
        <Route path="submit" element={<SubmitPage />} />
        <Route path="saved" element={<SavedPage />} />
        <Route path="submissions" element={<SubmissionsPage />} />
        <Route path="submissions/:resourceId/edit" element={<EditSubmissionPage />} />
        <Route path="profile" element={<ProfilePage />} />

        <Route element={<RoleRoute roles={["moderator", "admin"]} />}>
          <Route path="moderation" element={<ModerationPage />} />
        </Route>
        <Route element={<RoleRoute roles={["admin"]} />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
