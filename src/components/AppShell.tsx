import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

const navItems = [{ label: "Dashboard", path: "/dashboard", icon: "ri-dashboard-line" }];

export default function AppShell() {
  const { user, isInitialized, logout } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-foreground-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const displayName = user.full_name || user.email;

  return (
    <div className="min-h-screen bg-background-50 md:pl-sidebar">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-sidebar bg-primary-500 text-white flex-col z-50">
        <Link to="/dashboard" className="h-topbar flex items-center gap-3 px-6 border-b border-white/10">
          <span className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg">
            <i className="ri-sparkling-2-line text-lg" />
          </span>
          <span className="font-heading font-bold text-lg tracking-tight">CreatorFlow</span>
        </Link>

        <nav aria-label="Main" className="flex-1 py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                    )
                  }
                >
                  <i className={cn(item.icon, "text-base")} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-4 space-y-3">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" data-testid="current-user-name">{displayName}</p>
            {user.full_name && <p className="text-xs text-white/60 truncate">{user.email}</p>}
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 cursor-pointer"
          >
            <i className="ri-logout-box-r-line" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 bg-primary-500 text-white">
        <div className="flex items-center justify-between px-4 h-14">
          <span className="font-heading font-bold">CreatorFlow</span>
          <button type="button" onClick={logout} className="text-sm text-white/90 cursor-pointer">
            Sign out
          </button>
        </div>
        <nav aria-label="Main" className="flex px-2 pb-2 gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex-1 text-center rounded-md py-1.5 text-sm font-medium",
                  isActive ? "bg-white/15" : "text-white/70"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="p-4 md:p-6 lg:p-8 max-w-[1440px] mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
