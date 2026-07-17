import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useProposals } from "@/hooks/useProposals";
import { proposalTemplates } from "@/constants/proposalTemplates";
import TemplateCard from "@/pages/proposals/components/TemplateCard";

const categories = ["All", "Design", "Web", "Marketing", "Business", "General"];

export default function ProposalNewPage() {
  const navigate = useNavigate();
  const { createProposal } = useProposals();
  const [category, setCategory] = useState("All");
  const [creating, setCreating] = useState(false);

  const templates = useMemo(() => {
    if (category === "All") return proposalTemplates;
    return proposalTemplates.filter((t) => t.category === category);
  }, [category]);

  const handleSelect = async (_templateId: string) => {
    if (creating) return;
    setCreating(true);

    const template = proposalTemplates.find((t) => t.id === _templateId);
    const sections = template?.sections.map((s) => ({
      type: s.type,
      label: s.label,
      content: "",
    })) || undefined;

    const proposal = await createProposal({
      title: "Untitled Proposal",
      client_id: "",
      sections,
    });

    if (proposal) {
      navigate(`/proposals/${proposal.id}`);
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/proposals"
          className="text-sm text-secondary-500 hover:text-secondary-600 font-medium mb-2 inline-flex items-center gap-1"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-arrow-left-line" />
          </span>
          All proposals
        </Link>
        <h2 className="font-heading font-semibold text-headline-md text-foreground-950 mt-1">
          New Proposal
        </h2>
        <p className="text-body-md text-foreground-500 mt-1">
          Choose a template to get started
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 w-fit overflow-x-auto max-w-full">
        {categories.map((cat) => {
          const isActive = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-white text-foreground-900 shadow-ambient"
                  : "text-foreground-500 hover:text-foreground-700"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Template grid */}
      {creating ? (
        <div className="text-center py-16">
          <span className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3 animate-pulse">
            <i className="ri-loader-4-line text-xl text-foreground-400 animate-spin" />
          </span>
          <p className="text-sm text-foreground-500">Creating proposal...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tmpl) => (
            <TemplateCard
              key={tmpl.id}
              name={tmpl.name}
              description={tmpl.description}
              category={tmpl.category}
              icon={tmpl.icon}
              color={tmpl.color}
              previewImage={tmpl.previewImage}
              onClick={() => handleSelect(tmpl.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}