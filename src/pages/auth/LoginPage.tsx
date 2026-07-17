import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/authStore";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError("");
    const result = await login(data.email, data.password);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error || "Invalid email or password. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 flex items-center justify-center bg-primary-500 rounded-xl">
            <i className="ri-flow-chart text-white text-xl" />
          </div>
          <span className="font-heading font-bold text-2xl text-foreground-950 tracking-tight">
            FreelanceFlow
          </span>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-6 md:p-8">
          <h2 className="font-heading font-semibold text-headline-sm text-foreground-950 mb-1">
            Welcome back
          </h2>
          <p className="text-body-md text-foreground-500 mb-6">
            Sign in to your freelance workspace
          </p>

          {error && (
            <div className="mb-4 p-3 bg-status-deleted/10 border border-status-deleted/20 rounded-lg text-sm text-status-deleted">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-label-md text-foreground-700 mb-1.5">
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                className="w-full px-3 py-2.5 bg-white border border-background-300 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:border-transparent transition-shadow"
                placeholder="you@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-status-deleted">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-label-md text-foreground-700 mb-1.5">
                Password
              </label>
              <input
                {...register("password")}
                type="password"
                className="w-full px-3 py-2.5 bg-white border border-background-300 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:border-transparent transition-shadow"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-status-deleted">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm py-2.5 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-loader-4-line animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-foreground-500">
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="text-secondary-500 hover:text-secondary-600 font-medium"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}