interface ClientInfoCardProps {
  email: string;
  phone: string;
  address: string;
  industry: string;
  source: string;
  website: string;
  notes: string;
  lastContactedAt: string;
  createdAt: string;
}

export default function ClientInfoCard({
  email,
  phone,
  address,
  industry,
  source,
  website,
  notes,
  lastContactedAt,
  createdAt,
}: ClientInfoCardProps) {
  return (
    <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
      <h3 className="font-heading font-semibold text-lg text-foreground-900 mb-4">
        Contact Details
      </h3>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-background-100 flex items-center justify-center shrink-0">
            <i className="ri-mail-line text-foreground-500" />
          </span>
          <a href={`mailto:${email}`} className="text-sm text-foreground-700 hover:text-secondary-500 transition-colors truncate">
            {email}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-background-100 flex items-center justify-center shrink-0">
            <i className="ri-phone-line text-foreground-500" />
          </span>
          <a href={`tel:${phone}`} className="text-sm text-foreground-700 hover:text-secondary-500 transition-colors">
            {phone}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-background-100 flex items-center justify-center shrink-0">
            <i className="ri-map-pin-line text-foreground-500" />
          </span>
          <span className="text-sm text-foreground-600">{address}</span>
        </div>
        {website && (
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-background-100 flex items-center justify-center shrink-0">
              <i className="ri-global-line text-foreground-500" />
            </span>
            <a
              href={`https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground-700 hover:text-secondary-500 transition-colors"
            >
              {website}
            </a>
          </div>
        )}
      </div>

      <hr className="my-4 border-background-200" />

      <h3 className="font-heading font-semibold text-lg text-foreground-900 mb-3">
        Business Profile
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground-500">Industry</span>
          <span className="text-sm font-medium text-foreground-800">{industry}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground-500">Source</span>
          <span className="text-sm font-medium text-foreground-800">{source}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground-500">Client since</span>
          <span className="text-sm font-medium text-foreground-800">
            {new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground-500">Last contacted</span>
          <span className="text-sm font-medium text-foreground-800">
            {new Date(lastContactedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>

      {notes && (
        <>
          <hr className="my-4 border-background-200" />
          <h3 className="font-heading font-semibold text-lg text-foreground-900 mb-3">
            Notes
          </h3>
          <p className="text-sm text-foreground-600 leading-relaxed whitespace-pre-line">{notes}</p>
        </>
      )}
    </div>
  );
}