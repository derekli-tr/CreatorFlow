import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import AppShell from "@/components/feature/AppShell";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import DashboardPage from "@/pages/dashboard/page";
import ClientsPage from "@/pages/clients/page";
import ClientDetailPage from "@/pages/clients/ClientDetailPage";
import ProjectsPage from "@/pages/projects/page";
import ProjectDetailPage from "@/pages/projects/ProjectDetailPage";
import ProposalsPage from "@/pages/proposals/page";
import ProposalsDetailPage from "@/pages/proposals/ProposalsDetailPage";
import ProposalNewPage from "@/pages/proposals/ProposalNewPage";
import InvoicesPage from "@/pages/invoices/page";
import InvoiceDetailPage from "@/pages/invoices/InvoiceDetailPage";
import CalendarPage from "@/pages/calendar/page";
import AnalyticsPage from "@/pages/analytics/page";
import SettingsPage from "@/pages/settings/page";
import NotFound from "@/pages/NotFound";
import PortalLayout from "@/components/feature/PortalLayout";
import PortalProposalPage from "@/pages/portal/PortalProposalPage";
import PortalInvoicesPage from "@/pages/portal/PortalInvoicesPage";
import PortalProjectPage from "@/pages/portal/PortalProjectPage";

const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  {
    element: <PortalLayout />,
    children: [
      { path: "/portal/proposals/:id", element: <PortalProposalPage /> },
      { path: "/portal/invoices", element: <PortalInvoicesPage /> },
      { path: "/portal/projects/:id", element: <PortalProjectPage /> },
    ],
  },
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/clients", element: <ClientsPage /> },
      { path: "/clients/:id", element: <ClientDetailPage /> },
      { path: "/projects", element: <ProjectsPage /> },
      { path: "/projects/:id", element: <ProjectDetailPage /> },
      { path: "/proposals", element: <ProposalsPage /> },
      { path: "/proposals/new", element: <ProposalNewPage /> },
      { path: "/proposals/:id", element: <ProposalsDetailPage /> },
      { path: "/invoices", element: <InvoicesPage /> },
      { path: "/invoices/:id", element: <InvoiceDetailPage /> },
      { path: "/calendar", element: <CalendarPage /> },
      { path: "/analytics", element: <AnalyticsPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
  { path: "*", element: <NotFound /> },
];

export default routes;