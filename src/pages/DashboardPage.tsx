import { useAuthStore } from "@/stores/authStore";
import PageHeader from "@/components/PageHeader";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.full_name.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader title={firstName ? `Welcome back, ${firstName}` : "Dashboard"} />
      <div className="bg-white rounded-xl border border-dashed border-background-300 p-10 text-center">
        <i className="ri-sparkling-2-line text-4xl text-foreground-300" aria-hidden />
        <h2 className="font-heading font-semibold text-foreground-900 mt-2">Nothing here yet</h2>
      </div>
    </div>
  );
}
