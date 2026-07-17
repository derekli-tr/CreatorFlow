import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: "ri-dashboard-line" },
  { label: "Clients", path: "/clients", icon: "ri-user-3-line" },
  { label: "Projects", path: "/projects", icon: "ri-folder-3-line" },
  { label: "Proposals", path: "/proposals", icon: "ri-file-list-3-line" },
  { label: "Invoices", path: "/invoices", icon: "ri-bill-line" },
  { label: "Calendar", path: "/calendar", icon: "ri-calendar-line" },
  { label: "Analytics", path: "/analytics", icon: "ri-bar-chart-box-line" },
  { label: "Settings", path: "/settings", icon: "ri-settings-3-line" },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[45] md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-primary-500 text-white z-sidebar flex flex-col",
          "transition-transform duration-300 ease-in-out",
          "w-sidebar",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        {/* Logo area */}
        <div className="h-topbar flex items-center px-6 border-b border-white/10 shrink-0">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg">
              <i className="ri-flow-chart text-lg" />
            </div>
            {!collapsed && (
              <span className="font-heading font-bold text-lg tracking-tight">
                FreelanceFlow
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span className="w-5 h-5 flex items-center justify-center shrink-0">
                      <i className={cn(item.icon, "text-base")} />
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom: User profile */}
        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <i className="ri-user-line text-white/80" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.full_name || "Demo User"}
                </p>
                <p className="text-xs text-white/50 truncate">
                  {user?.email || "demo@freelanceflow.dev"}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}