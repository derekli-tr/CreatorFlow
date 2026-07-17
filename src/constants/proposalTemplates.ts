export interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  sections: ProposalSectionTemplate[];
  color: string;
  previewImage: string;
}

export interface ProposalSectionTemplate {
  type: "cover" | "summary" | "scope" | "timeline" | "pricing" | "terms";
  label: string;
  placeholder: string;
}

export const proposalTemplates: ProposalTemplate[] = [
  {
    id: "tmpl-001",
    name: "Branding & Identity",
    description: "Perfect for visual identity, rebranding, and brand strategy proposals. Includes logo design, guidelines, and collateral sections.",
    category: "Design",
    icon: "ri-palette-line",
    color: "#3B82F6",
    previewImage: "https://readdy.ai/api/search-image?query=Modern%20minimalist%20brand%20identity%20design%20proposal%20document%20with%20color%20palette%20swatches%20and%20typography%20samples%20on%20a%20clean%20white%20desk%2C%20professional%20creative%20agency%20aesthetic%2C%20soft%20natural%20lighting%20from%20side%20window%2C%20editorial%20photography%20style%20with%20shallow%20depth%20of%20field&width=600&height=400&seq=proposal-tmpl-branding&orientation=landscape",
    sections: [
      { type: "cover", label: "Cover Page", placeholder: "Project title, client name, date, and your brand intro" },
      { type: "summary", label: "Executive Summary", placeholder: "Brief overview of the project goals, your approach, and expected outcomes" },
      { type: "scope", label: "Scope of Work", placeholder: "Detailed breakdown of deliverables: logo concepts, brand guidelines, collateral, etc." },
      { type: "timeline", label: "Timeline", placeholder: "Project phases with milestones and estimated completion dates" },
      { type: "pricing", label: "Investment", placeholder: "Pricing breakdown with line items and payment schedule" },
      { type: "terms", label: "Terms & Conditions", placeholder: "Payment terms, revision policy, intellectual property rights, and cancellation" },
    ],
  },
  {
    id: "tmpl-002",
    name: "Web Design & Development",
    description: "For website projects — landing pages, full site builds, and web apps. Covers design, development, QA, and launch.",
    category: "Web",
    icon: "ri-globe-line",
    color: "#10B981",
    previewImage: "https://readdy.ai/api/search-image?query=Modern%20web%20design%20proposal%20document%20with%20laptop%20showing%20clean%20website%20mockup%2C%20wireframe%20sketches%20and%20color%20swatches%20scattered%20on%20white%20desk%2C%20bright%20natural%20light%2C%20professional%20tech%20aesthetic%2C%20minimal%20composition&width=600&height=400&seq=proposal-tmpl-webdev&orientation=landscape",
    sections: [
      { type: "cover", label: "Cover Page", placeholder: "Project title, client company, date, and your agency intro" },
      { type: "summary", label: "Executive Summary", placeholder: "Project overview: what you'll build and the business impact it will deliver" },
      { type: "scope", label: "Scope of Work", placeholder: "Pages, features, integrations, CMS setup, responsive design, SEO basics" },
      { type: "timeline", label: "Timeline", placeholder: "Discovery → Wireframes → Design → Development → QA → Launch, with dates" },
      { type: "pricing", label: "Investment", placeholder: "Line items for design, development, hosting setup, and ongoing maintenance" },
      { type: "terms", label: "Terms & Conditions", placeholder: "Payment milestones, revision rounds, post-launch support, hosting terms" },
    ],
  },
  {
    id: "tmpl-003",
    name: "UI/UX Design Sprint",
    description: "For product design engagements — user research, wireframes, prototyping, and usability testing.",
    category: "Design",
    icon: "ri-smartphone-line",
    color: "#8B5CF6",
    previewImage: "https://readdy.ai/api/search-image?query=UX%20design%20proposal%20document%20with%20mobile%20app%20wireframes%2C%20user%20flow%20diagrams%2C%20and%20sticky%20notes%20on%20whiteboard%20background%2C%20creative%20workshop%20aesthetic%2C%20warm%20natural%20lighting%2C%20design%20thinking%20vibe&width=600&height=400&seq=proposal-tmpl-ux&orientation=landscape",
    sections: [
      { type: "cover", label: "Cover Page", placeholder: "Product name, client, date, design partner intro" },
      { type: "summary", label: "Executive Summary", placeholder: "Design challenge, user problems to solve, and your research-driven approach" },
      { type: "scope", label: "Scope of Work", placeholder: "User research, personas, journey maps, wireframes, prototypes, usability testing" },
      { type: "timeline", label: "Timeline", placeholder: "Research → Ideation → Prototyping → Testing → Handoff, typically 4-6 weeks" },
      { type: "pricing", label: "Investment", placeholder: "Discovery phase + design sprint pricing, optional development handoff" },
      { type: "terms", label: "Terms & Conditions", placeholder: "Sprint cadence, stakeholder involvement expectations, deliverables format" },
    ],
  },
  {
    id: "tmpl-004",
    name: "Content & Marketing",
    description: "For content strategy, copywriting, social media, and marketing campaign proposals.",
    category: "Marketing",
    icon: "ri-megaphone-line",
    color: "#F59E0B",
    previewImage: "https://readdy.ai/api/search-image?query=Marketing%20proposal%20document%20with%20content%20calendar%20printouts%2C%20social%20media%20mockups%2C%20and%20analytics%20charts%20on%20a%20bright%20white%20desk%2C%20creative%20marketing%20agency%20aesthetic%2C%20colorful%20post-it%20notes%2C%20natural%20light&width=600&height=400&seq=proposal-tmpl-content&orientation=landscape",
    sections: [
      { type: "cover", label: "Cover Page", placeholder: "Campaign name, client, date, your agency intro" },
      { type: "summary", label: "Executive Summary", placeholder: "Campaign objectives, target audience, key messages, and KPIs" },
      { type: "scope", label: "Scope of Work", placeholder: "Content types (blog, social, email), volume, platforms, editorial calendar" },
      { type: "timeline", label: "Timeline", placeholder: "Content production cadence, campaign phases, review cycles" },
      { type: "pricing", label: "Investment", placeholder: "Per-piece or retainer pricing, ad spend management if applicable" },
      { type: "terms", label: "Terms & Conditions", placeholder: "Approval process, usage rights, performance reporting frequency" },
    ],
  },
  {
    id: "tmpl-005",
    name: "Retainer Partnership",
    description: "Ongoing retainer agreement for design, development, or consulting. Flexible hours, priority support.",
    category: "Business",
    icon: "ri-briefcase-line",
    color: "#EC4899",
    previewImage: "https://readdy.ai/api/search-image?query=Professional%20business%20partnership%20proposal%20document%20on%20elegant%20wooden%20desk%20with%20fountain%20pen%2C%20clean%20minimal%20layout%2C%20warm%20ambient%20lighting%20from%20desk%20lamp%2C%20premium%20corporate%20aesthetic%2C%20soft%20shadows&width=600&height=400&seq=proposal-tmpl-retainer&orientation=landscape",
    sections: [
      { type: "cover", label: "Cover Page", placeholder: "Partnership name, client, effective date, your company intro" },
      { type: "summary", label: "Executive Summary", placeholder: "Retainer overview: monthly commitment, services included, and value proposition" },
      { type: "scope", label: "Scope of Work", placeholder: "Services covered, monthly hours, priority response times, excluded services" },
      { type: "timeline", label: "Timeline", placeholder: "Contract term (e.g., 6 or 12 months), renewal terms, notice period" },
      { type: "pricing", label: "Investment", placeholder: "Monthly retainer fee, overage rates, any setup fee" },
      { type: "terms", label: "Terms & Conditions", placeholder: "Rollover policy, termination, confidentiality, IP ownership" },
    ],
  },
  {
    id: "tmpl-006",
    name: "Blank Canvas",
    description: "Start from scratch. Build your proposal exactly how you want it — full creative freedom.",
    category: "General",
    icon: "ri-file-add-line",
    color: "#64748B",
    previewImage: "https://readdy.ai/api/search-image?query=Clean%20blank%20white%20paper%20document%20with%20elegant%20minimal%20layout%20on%20light%20wooden%20surface%2C%20simple%20pen%20beside%20it%2C%20bright%20natural%20daylight%2C%20minimalist%20office%20aesthetic%2C%20fresh%20start%20concept&width=600&height=400&seq=proposal-tmpl-blank&orientation=landscape",
    sections: [
      { type: "cover", label: "Cover Page", placeholder: "Start typing to build your proposal from scratch" },
      { type: "summary", label: "Executive Summary", placeholder: "Add your own content here" },
      { type: "scope", label: "Scope of Work", placeholder: "Add your own content here" },
      { type: "pricing", label: "Investment", placeholder: "Add your own content here" },
      { type: "terms", label: "Terms & Conditions", placeholder: "Add your own content here" },
    ],
  },
];