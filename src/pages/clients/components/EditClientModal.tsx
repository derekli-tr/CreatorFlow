import { useState, useEffect } from "react";

interface ClientData {
  id: string;
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
}

interface EditClientModalProps {
  client: ClientData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<ClientData>) => void;
}

export default function EditClientModal({ client, isOpen, onClose, onSave }: EditClientModalProps) {
  const [form, setForm] = useState<ClientData>(client);

  useEffect(() => {
    setForm(client);
  }, [client, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company,
      address: form.address,
      industry: form.industry,
      source: form.source,
      website: form.website,
      notes: form.notes,
      status: form.status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-background-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h3 className="font-heading font-semibold text-lg text-foreground-900">Edit Client</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-background-100 flex items-center justify-center cursor-pointer">
            <i className="ri-close-line text-foreground-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Company</label>
              <input
                name="company"
                value={form.company}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Address</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Industry</label>
              <input
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Source</label>
              <input
                name="source"
                value={form.source}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="lead">Lead</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Website</label>
            <input
              name="website"
              value={form.website}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
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
              className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}