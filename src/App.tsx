import { useEffect } from "react";
import { BrowserRouter, Navigate, useRoutes, type RouteObject } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import AppShell from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import PipelinePage from "@/pages/PipelinePage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import NotFoundPage from "@/pages/NotFoundPage";

const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/pipeline", element: <PipelinePage /> },
      { path: "/analytics", element: <AnalyticsPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];

function AppRoutes() {
  return useRoutes(routes);
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter basename={__BASE_PATH__}>
      <AppRoutes />
    </BrowserRouter>
  );
}
