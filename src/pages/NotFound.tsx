import { useLocation, Link } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background-50 flex flex-col items-center justify-center text-center px-4">
      <h1 className="absolute bottom-0 text-9xl md:text-[12rem] font-black text-background-100 select-none pointer-events-none z-0">
        404
      </h1>
      <div className="relative z-10">
        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <i className="ri-error-warning-line text-3xl text-primary-500" />
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-foreground-950">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-foreground-400 font-mono">
          {location.pathname}
        </p>
        <p className="mt-4 text-body-md text-foreground-500">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 mt-6 btn-primary"
        >
          <i className="ri-arrow-left-line" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}