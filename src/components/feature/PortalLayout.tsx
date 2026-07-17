import { Link, Outlet, useLocation } from "react-router-dom";

export default function PortalLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/portal";

  const handleOpenAgent = () => {
    const btn = document.querySelector('#vapi-widget-floating-button') as HTMLElement | null;
    if (btn) btn.click();
  };

  return (
    <div className="min-h-screen bg-background-50 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-background-200/60">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/portal" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-secondary-500 flex items-center justify-center">
              <i className="ri-briefcase-line text-white text-sm" />
            </div>
            <span className="font-heading font-semibold text-lg text-foreground-950 tracking-tight">
              FreelanceFlow
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {!isHome && (
              <span className="text-xs text-foreground-400 bg-background-100 px-3 py-1.5 rounded-full hidden sm:inline-block">
                Client Portal
              </span>
            )}
            <button
              onClick={handleOpenAgent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-500/10 text-secondary-600 hover:bg-secondary-500/20 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-question-line" />
              </span>
              <span className="hidden sm:inline">Need help?</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-background-200/60 bg-white/50">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-foreground-400">
            Powered by FreelanceFlow &mdash; the all-in-one freelancer toolkit
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleOpenAgent}
              className="text-xs text-foreground-400 hover:text-secondary-500 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span className="w-3 h-3 flex items-center justify-center">
                <i className="ri-customer-service-2-line" />
              </span>
              AI Assistant
            </button>
            <p className="text-xs text-foreground-400">
              &copy; {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}