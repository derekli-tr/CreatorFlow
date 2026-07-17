interface TemplateCardProps {
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  previewImage: string;
  onClick: () => void;
}

export default function TemplateCard({
  name,
  description,
  category,
  icon,
  color,
  previewImage,
  onClick,
}: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-background-200 overflow-hidden hover:shadow-ambient transition-all hover:-translate-y-0.5 text-left cursor-pointer group w-full"
    >
      <div className="aspect-[3/2] overflow-hidden relative">
        <img
          src={previewImage}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: color + "15" }}
          >
            <i className={`${icon} text-sm`} style={{ color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground-900">{name}</p>
            <p className="text-[11px] text-foreground-400 font-medium uppercase tracking-wider">{category}</p>
          </div>
        </div>
        <p className="text-xs text-foreground-500 leading-relaxed line-clamp-2">{description}</p>
      </div>
    </button>
  );
}