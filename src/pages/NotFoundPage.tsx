import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background-50 flex flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="font-heading font-bold text-headline-lg text-foreground-950">Page not found</h1>
      <p className="text-foreground-500">That page doesn't exist.</p>
      <Link to="/dashboard" className="text-secondary-600 font-medium hover:underline">
        Go to dashboard
      </Link>
    </div>
  );
}
