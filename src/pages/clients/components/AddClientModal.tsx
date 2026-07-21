import { useState } from "react";

interface NewClientData {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  industry: string;
  source: string;
  website: string;
  notes: string;
  status: string;
  lifetime_revenue: number;
  outstanding_balance: number;
  last_contacted_at: string;
}

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewClientData) => Promise<unknown>;
}

const emptyForm: NewClientData = {
  name: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  industry: "",
  source: "",
  website: "",
  notes: "",
  status: "lead",
  lifetime_revenue: 0,
  outstanding_balance: 0,
  last_contacted_at: new Date().toISOString(),
};

export default function AddClientModal({ isOpen, onClose, onSave }: AddClientModalProps) {
  const [form, setForm] = useState<NewClientData>({ ...emptyForm });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        ...form,
        last_contacted_at: new Date().toISOString(),
      });
      setForm({ ...emptyForm });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setForm({ ...emptyForm });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-background-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h3 className="font-heading font-semibold text-lg text-foreground-900">Add New Client</h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-background-100 flex items-center justify-center cursor-pointer">
            <i className="ri-close-line text-foreground-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Full name"
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Company</label>
              <input
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="Company name"
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Email *</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="client@example.com"
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Address</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Street address, city, country"
              className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Industry</label>
              <input
                name="industry"
                value={form.industry}
                onChange={handleChange}
                placeholder="e.g. Tech"
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Source</label>
              <input
                name="source"
                value={form.source}
                onChange={handleChange}
                placeholder="e.g. Referral"
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent cursor-pointer"
              >
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Website</label>
            <input
              name="website"
              value={form.website}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
              placeholder="example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              placeholder="Any additional details about this client..."
              className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSaving && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isSaving ? "Adding..." : "Add Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
