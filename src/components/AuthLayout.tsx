import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-9 h-9 flex items-center justify-center bg-primary-500 text-white rounded-lg">
            <i className="ri-sparkling-2-line text-lg" />
          </span>
          <span className="font-heading font-bold text-xl tracking-tight text-foreground-950">CreatorFlow</span>
        </div>

        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-6">
          <h1 className="font-heading font-semibold text-headline-sm text-foreground-950">{title}</h1>
          <p className="text-sm text-foreground-500 mt-1 mb-6">{subtitle}</p>
          {children}
        </div>

        <p className="text-center text-sm text-foreground-500 mt-6">{footer}</p>
      </div>
    </div>
  );
}
