import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 className="font-heading font-semibold text-headline-md text-foreground-950">{title}</h1>
        {subtitle && <p className="text-body-sm text-foreground-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
