import { useState } from "react";
import type { Proposal, ProposalSection } from "@/types/proposals";

const sectionIcons: Record<string, string> = {
  cover: "ri-file-text-line",
  summary: "ri-lightbulb-line",
  scope: "ri-stack-line",
  timeline: "ri-calendar-schedule-line",
  pricing: "ri-money-dollar-circle-line",
  terms: "ri-shield-check-line",
};

interface ProposalEditorProps {
  proposal: Proposal;
  onUpdate: (updated: Proposal) => void;
  onTogglePreview: () => void;
}

export default function ProposalEditor({ proposal, onUpdate, onTogglePreview }: ProposalEditorProps) {
  const [activeSection, setActiveSection] = useState<string>("cover");

  const handleSectionChange = (type: string, content: string) => {
    const updatedSections = proposal.sections.map((s) =>
      s.type === type ? { ...s, content } : s
    );
    onUpdate({ ...proposal, sections: updatedSections });
  };

  const handleCoverChange = (field: string, value: string) => {
    onUpdate({
      ...proposal,
      coverData: { ...proposal.coverData, [field]: value },
    });
  };

  const handleTitleChange = (title: string) => {
    onUpdate({ ...proposal, title });
  };

  const active = proposal.sections.find((s) => s.type === activeSection);

  return (
    <div className="flex gap-6">
      {/* Section sidebar */}
      <div className="w-52 shrink-0">
        <div className="bg-white rounded-xl border border-background-200 p-3 sticky top-24">
          <p className="text-xs font-semibold text-foreground-500 uppercase tracking-wider px-2 mb-2">
            Sections
          </p>
          <nav className="space-y-0.5">
            {proposal.sections.map((section) => {
              const isActive = activeSection === section.type;
              const icon = sectionIcons[section.type] || "ri-file-line";
              return (
                <button
                  key={section.type}
                  onClick={() => setActiveSection(section.type)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-secondary-50 text-foreground-900"
                      : "text-foreground-500 hover:bg-background-50 hover:text-foreground-700"
                  }`}
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className={icon} />
                  </span>
                  {section.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 pt-3 border-t border-background-100">
            {/* AI assist button (placeholder) */}
            <button
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap bg-accent-50 text-accent-700 hover:bg-accent-100"
              title="AI-powered content suggestions coming soon"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-magic-line" />
              </span>
              AI Assist
              <span className="ml-auto text-[10px] bg-accent-200 text-accent-800 px-1.5 py-0.5 rounded font-semibold">
                SOON
              </span>
            </button>

            <button
              onClick={onTogglePreview}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium text-foreground-500 hover:bg-background-50 hover:text-foreground-700 transition-colors cursor-pointer mt-1 whitespace-nowrap"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-eye-line" />
              </span>
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 min-w-0">
        {activeSection === "cover" ? (
          <div className="bg-white rounded-xl border border-background-200 p-6 space-y-5">
            <h3 className="font-heading font-semibold text-lg text-foreground-900 mb-1">Cover Page</h3>

            <div>
              <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Proposal Title</label>
              <input
                value={proposal.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
                placeholder="Proposal title"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Client Name</label>
                <input
                  value={proposal.coverData.clientName}
                  onChange={(e) => handleCoverChange("clientName", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
                  placeholder="Client name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Client Company</label>
                <input
                  value={proposal.coverData.clientCompany}
                  onChange={(e) => handleCoverChange("clientCompany", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
                  placeholder="Client company"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Prepared By</label>
                <input
                  value={proposal.coverData.preparedBy}
                  onChange={(e) => handleCoverChange("preparedBy", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Prepared Company</label>
                <input
                  value={proposal.coverData.preparedCompany}
                  onChange={(e) => handleCoverChange("preparedCompany", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
                  placeholder="Your company"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Date</label>
                <input
                  type="date"
                  value={proposal.coverData.date}
                  onChange={(e) => handleCoverChange("date", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Valid Until</label>
                <input
                  type="date"
                  value={proposal.coverData.validUntil}
                  onChange={(e) => handleCoverChange("validUntil", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent cursor-pointer"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-background-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg text-foreground-900">
                {active?.label || "Section"}
              </h3>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-accent-600 hover:bg-accent-50 transition-colors cursor-pointer whitespace-nowrap"
                title="AI content suggestions coming soon"
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <i className="ri-magic-line" />
                </span>
                Suggest content
              </button>
            </div>

            <textarea
              value={active?.content || ""}
              onChange={(e) => handleSectionChange(activeSection, e.target.value)}
              rows={18}
              className="w-full px-4 py-3 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent resize-y leading-relaxed font-mono text-[13px]"
              placeholder="Write your content here. Use markdown-style formatting:

## Section headings
1. Numbered list items
- Bullet points

Separate paragraphs with blank lines..."
            />
          </div>
        )}

        {/* AI integration banner */}
        <div className="mt-4 bg-accent-50 rounded-xl border border-accent-200 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-200 flex items-center justify-center shrink-0">
            <i className="ri-magic-line text-accent-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-accent-800">AI-Powered Proposal Assistant</p>
            <p className="text-xs text-accent-600 mt-0.5 leading-relaxed">
              Soon you'll be able to generate entire proposal sections, suggest scope items, optimize pricing, and auto-fill timelines — all from a brief project description. Stay tuned.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}