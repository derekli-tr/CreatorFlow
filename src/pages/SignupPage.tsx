import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import AuthLayout from "@/components/AuthLayout";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";

export default function SignupPage() {
  const { user, signup } = useAuthStore();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError("Please enter your name.");
    if (!email.trim()) return setError("Please enter your email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setSubmitting(true);
    const result = await signup(email.trim(), password, fullName.trim());
    setSubmitting(false);

    if (!result.success) setError(result.error ?? "Sign up failed");
    else if (result.needsConfirmation) setConfirmationSent(true);
    else navigate("/dashboard", { replace: true });
  };

  const footer = (
    <>
      Already have an account?{" "}
      <Link to="/login" className="font-medium text-secondary-600 hover:underline">
        Sign in
      </Link>
    </>
  );

  if (confirmationSent) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a confirmation link to ${email}.`} footer={footer}>
        <p role="status" className="text-sm text-foreground-700">
          Confirm your email, then sign in to start tracking deals.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Free for creators. Takes 30 seconds." footer={footer}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="fullName" className={labelClass}>Name</label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="Jamie Creator"
          />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="At least 6 characters"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-status-deleted">{error}</p>
        )}

        <button type="submit" disabled={submitting} className={`${primaryButtonClass} w-full`}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
