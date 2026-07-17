import { Link } from "react-router-dom";

interface ClientHeaderProps {
  clientId: string;
  name: string;
  company: string;
  status: "active" | "inactive" | "lead";
  onEditClick: () => void;
}

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: "Active", bg: "#10B98115", color: "#10B981" },
  inactive: { label: "Inactive", bg: "#F59E0B15", color: "#F59E0B" },
  lead: { label: "Lead", bg: "#64748B15", color: "#64748B" },
};

export default function ClientHeader({ clientId, name, company, status, onEditClick }: ClientHeaderProps) {
  const s = statusConfig[status] || statusConfig.lead;

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <Link
          to="/clients"
          className="text-sm text-secondary-500 hover:text-secondary-600 font-medium mb-2 inline-flex items-center gap-1 whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-arrow-left-line" />
          </span>
          Back to clients
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <h2 className="font-heading font-semibold text-headline-md text-foreground-950">
            {name}
          </h2>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
            style={{ backgroundColor: s.bg, color: s.color }}
          >
            {s.label}
          </span>
        </div>
        <p className="text-body-md text-foreground-500 mt-1">{company}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onEditClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-background-200 bg-white text-sm font-medium text-foreground-700 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-edit-line" />
          </span>
          Edit
        </button>
        <Link
          to={`/projects?client_id=${clientId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary-500 text-white text-sm font-medium hover:bg-secondary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line" />
          </span>
          New Project
        </Link>
        <Link
          to={`/invoices?client_id=${clientId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-file-add-line" />
          </span>
          New Invoice
        </Link>
      </div>
    </div>
  );
}