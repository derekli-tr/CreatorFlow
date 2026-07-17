import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useInvoices } from "@/hooks/useInvoices";
import { useCommunicationLogs } from "@/hooks/useCommunicationLogs";
import ClientHeader from "@/pages/clients/components/ClientHeader";
import ClientKPICards from "@/pages/clients/components/ClientKPICards";
import ClientInfoCard from "@/pages/clients/components/ClientInfoCard";
import CommunicationTimeline from "@/pages/clients/components/CommunicationTimeline";
import ClientProjectsTable from "@/pages/clients/components/ClientProjectsTable";
import ClientInvoicesTable from "@/pages/clients/components/ClientInvoicesTable";
import EditClientModal from "@/pages/clients/components/EditClientModal";
import AddCommunicationModal from "@/pages/clients/components/AddCommunicationModal";

type TabKey = "overview" | "projects" | "invoices" | "communications";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { clients, isLoading: clientsLoading, error: clientsError, getClient, updateClient } = useClients();
  const { projects } = useProjects();
  const { invoices } = useInvoices();
  const { logsByClient, fetchLogs, addLog, isLoading: logsLoading } = useCommunicationLogs();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addLogModalOpen, setAddLogModalOpen] = useState(false);
  const [logsReady, setLogsReady] = useState(false);

  /* Derive the client from the hook's data (reactive to updates) */
  const clientData = useMemo(() => (id ? getClient(id) : null), [id, clients, getClient]);

  /* Fetch logs when client is ready */
  useEffect(() => {
    if (!id || !clientData) return;
    setLogsReady(false);
    fetchLogs(id).then(() => setLogsReady(true));
  }, [id, clientData, fetchLogs]);

  const localLogs = useMemo(() => (id ? logsByClient[id] || [] : []), [id, logsByClient]);

  const clientProjects = useMemo(
    () => (clientData ? projects.filter((p) => p.client_id === clientData.id) : []),
    [clientData, projects]
  );
  const clientInvoices = useMemo(
    () => (clientData ? invoices.filter((inv) => inv.client_id === clientData.id) : []),
    [clientData, invoices]
  );

  /* Loading state */
  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-secondary-300 border-t-secondary-500 rounded-full animate-spin" />
          <p className="text-sm text-foreground-500">Loading client...</p>
        </div>
      </div>
    );
  }

  /* Error state */
  if (clientsError) {
    return (
      <div className="text-center py-20">
        <p className="text-foreground-500 font-medium">Failed to load client</p>
        <p className="text-sm text-foreground-400 mt-1">{clientsError}</p>
        <Link to="/clients" className="text-secondary-500 hover:text-secondary-600 text-sm mt-3 inline-block">
          Back to clients
        </Link>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="text-center py-20">
        <p className="text-foreground-500">Client not found</p>
        <Link to="/clients" className="text-secondary-500 hover:text-secondary-600 text-sm mt-2 inline-block">
          Back to clients
        </Link>
      </div>
    );
  }

  const activeProjectCount = clientProjects.filter((p) => p.status === "in_progress").length;
  const unpaidInvoiceCount = clientInvoices.filter(
    (inv) => inv.status !== "paid" && inv.status !== "voided" && inv.status !== "draft"
  ).length;

  const handleEditSave = (updated: Record<string, unknown>) => {
    updateClient(clientData.id, updated as Partial<typeof clientData>);
  };

  const handleAddLog = (log: { type: string; content: string }) => {
    addLog(clientData.id, log);
  };

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "projects", label: "Projects", count: clientProjects.length },
    { key: "invoices", label: "Invoices", count: clientInvoices.length },
    { key: "communications", label: "Communications", count: localLogs.length },
  ];

  const isLogsLoading = logsLoading || !logsReady;

  return (
    <div className="space-y-6">
      <ClientHeader
        clientId={clientData.id}
        name={clientData.name}
        company={clientData.company}
        status={clientData.status as "active" | "inactive" | "lead"}
        onEditClick={() => setEditModalOpen(true)}
      />

      <ClientKPICards
        lifetimeRevenue={clientData.lifetime_revenue}
        outstandingBalance={clientData.outstanding_balance}
        projectCount={clientProjects.length}
        activeProjectCount={activeProjectCount}
        invoiceCount={clientInvoices.length}
        unpaidInvoiceCount={unpaidInvoiceCount}
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-background-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-white text-foreground-900 shadow-sm"
                : "text-foreground-500 hover:text-foreground-700"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs text-foreground-400">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ClientInfoCard
              email={clientData.email}
              phone={clientData.phone}
              address={clientData.address}
              industry={clientData.industry}
              source={clientData.source}
              website={clientData.website}
              notes={clientData.notes}
              lastContactedAt={clientData.last_contacted_at}
              createdAt={clientData.created_at}
            />
          </div>
          <div className="lg:col-span-2 space-y-6">
            {isLogsLoading ? (
              <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5 flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-secondary-300 border-t-secondary-500 rounded-full animate-spin" />
              </div>
            ) : (
              <CommunicationTimeline
                logs={localLogs.slice(0, 5)}
                onAddLog={() => setAddLogModalOpen(true)}
              />
            )}
            {clientProjects.length > 0 && (
              <ClientProjectsTable projects={clientProjects.slice(0, 3)} />
            )}
            {clientInvoices.length > 0 && (
              <ClientInvoicesTable invoices={clientInvoices.slice(0, 3)} />
            )}
          </div>
        </div>
      )}

      {activeTab === "projects" && (
        <ClientProjectsTable projects={clientProjects} />
      )}

      {activeTab === "invoices" && (
        <ClientInvoicesTable invoices={clientInvoices} />
      )}

      {activeTab === "communications" && (
        isLogsLoading ? (
          <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5 flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-secondary-300 border-t-secondary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <CommunicationTimeline
            logs={localLogs}
            onAddLog={() => setAddLogModalOpen(true)}
          />
        )
      )}

      <EditClientModal
        client={{ ...clientData }}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleEditSave}
      />

      <AddCommunicationModal
        isOpen={addLogModalOpen}
        onClose={() => setAddLogModalOpen(false)}
        onAdd={handleAddLog}
      />
    </div>
  );
}