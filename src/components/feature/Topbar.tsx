import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useNotifications } from "@/hooks/useNotifications";

interface TopbarProps {
  onMenuToggle: () => void;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/clients": "Clients",
  "/projects": "Projects",
  "/proposals": "Proposals",
  "/invoices": "Invoices",
  "/calendar": "Calendar",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const location = useLocation();
  const { logout } = useAuthStore();
  const { notifications } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentPath = location.pathname;
  const pageTitle =
    pageTitles[currentPath] ||
    (currentPath.startsWith("/clients/")
      ? "Client Profile"
      : currentPath.startsWith("/projects/")
        ? "Project Detail"
        : currentPath.startsWith("/proposals/")
          ? "Proposal"
          : currentPath.startsWith("/invoices/")
            ? "Invoice"
            : "FreelanceFlow");

  const unreadCount = notifications.filter((n) => !n.read_status).length;

  return (
    <header className="fixed top-0 right-0 left-0 md:left-sidebar h-topbar bg-white border-b border-background-200 z-topbar flex items-center justify-between px-4 md:px-6">
      {/* Left: Mobile menu + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background-100 cursor-pointer"
        >
          <i className="ri-menu-line text-lg text-foreground-700" />
        </button>
        <h1 className="font-heading font-semibold text-headline-sm text-foreground-950">
          {pageTitle}
        </h1>
      </div>

      {/* Right: Search, Notifications, User */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Search */}
        <div className="hidden sm:flex items-center gap-2 bg-background-50 border border-background-200 rounded-lg px-3 py-2 w-56 lg:w-72">
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-search-line text-sm text-foreground-400" />
          </span>
          <input
            type="text"
            placeholder="Search clients, projects..."
            className="bg-transparent text-sm text-foreground-700 placeholder:text-foreground-400 outline-none w-full"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background-100 cursor-pointer"
          >
            <i className="ri-notification-3-line text-lg text-foreground-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-status-deleted text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-background-200 shadow-elevated py-2 z-modal">
              <div className="px-4 py-2 border-b border-background-100">
                <p className="text-sm font-semibold text-foreground-900">
                  Notifications
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-foreground-400">No notifications yet</p>
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "px-4 py-3 hover:bg-background-50 cursor-pointer border-b border-background-50 last:border-0",
                        !notif.read_status && "bg-background-50/50"
                      )}
                    >
                      <p className="text-sm font-medium text-foreground-800">
                        {notif.title}
                      </p>
                      <p className="text-xs text-foreground-500 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-foreground-400 mt-1">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-background-100">
                <Link
                  to="/dashboard"
                  onClick={() => setShowNotifications(false)}
                  className="text-sm text-secondary-500 hover:text-secondary-600 font-medium"
                >
                  View all
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center hover:bg-primary-200 cursor-pointer"
          >
            <i className="ri-user-line text-primary-600" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-background-200 shadow-elevated py-1 z-modal">
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground-700 hover:bg-background-50"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-settings-3-line text-sm" />
                </span>
                Settings
              </Link>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-status-deleted hover:bg-background-50 w-full text-left cursor-pointer"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-logout-box-line text-sm" />
                </span>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}