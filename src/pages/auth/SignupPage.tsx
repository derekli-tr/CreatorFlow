import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/authStore";

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuthStore();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setError("");
    const result = await signup(data.email, data.password, data.fullName);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error || "Something went wrong. Please try again.");
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
            Create your account
          </h2>
          <p className="text-body-md text-foreground-500 mb-6">
            Start managing your freelance business
          </p>

          {error && (
            <div className="mb-4 p-3 bg-status-deleted/10 border border-status-deleted/20 rounded-lg text-sm text-status-deleted">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-label-md text-foreground-700 mb-1.5">
                Full name
              </label>
              <input
                {...register("fullName")}
                type="text"
                className="w-full px-3 py-2.5 bg-white border border-background-300 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:border-transparent transition-shadow"
                placeholder="Alex Rivera"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-status-deleted">
                  {errors.fullName.message}
                </p>
              )}
            </div>

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
                placeholder="Min. 8 characters"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-status-deleted">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-label-md text-foreground-700 mb-1.5">
                Confirm password
              </label>
              <input
                {...register("confirmPassword")}
                type="password"
                className="w-full px-3 py-2.5 bg-white border border-background-300 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:border-transparent transition-shadow"
                placeholder="Repeat your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-status-deleted">
                  {errors.confirmPassword.message}
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
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-foreground-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-secondary-500 hover:text-secondary-600 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}