import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "team", label: "Team Members" },
  { id: "email", label: "Email" },
  { id: "preferences", label: "Preferences" },
];

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");

  /* Email test state */
  const [testEmail, setTestEmail] = useState(user?.email || "");
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;
    setTestStatus('sending');
    setTestError(null);

    try {
      const { error } = await supabase.functions.invoke('send-test-email', {
        body: { to_email: testEmail.trim() },
      });

      if (error) {
        setTestStatus('error');
        setTestError(typeof error === 'string' ? error : 'Failed to send test email.');
      } else {
        setTestStatus('success');
      }
    } catch (err: unknown) {
      setTestStatus('error');
      setTestError(err instanceof Error ? err.message : 'Unexpected error.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-headline-md text-foreground-950">
          Settings
        </h2>
        <p className="text-body-md text-foreground-500 mt-1">
          Manage your account and workspace preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-background-100 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "bg-white text-foreground-900 shadow-sm"
                : "text-foreground-500 hover:text-foreground-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-6 max-w-2xl">
          <h3 className="font-heading font-semibold text-lg text-foreground-900 mb-6">
            Profile Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-label-md text-foreground-700 mb-1.5">
                Full name
              </label>
              <input
                type="text"
                defaultValue={user?.full_name || "Alex Rivera"}
                className="w-full px-3 py-2.5 bg-white border border-background-300 rounded-lg text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-400"
              />
            </div>
            <div>
              <label className="block text-label-md text-foreground-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                defaultValue={user?.email || "demo@freelanceflow.dev"}
                className="w-full px-3 py-2.5 bg-white border border-background-300 rounded-lg text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-400"
              />
            </div>
            <div className="pt-4 border-t border-background-100">
              <button className="btn-primary">Save Changes</button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-background-100">
            <h4 className="font-heading font-semibold text-foreground-900 mb-2">
              Danger Zone
            </h4>
            <button
              onClick={logout}
              className="text-sm text-status-deleted hover:bg-status-deleted/5 px-3 py-2 rounded-lg transition-colors"
            >
              <i className="ri-logout-box-line mr-1" />
              Log out of all sessions
            </button>
          </div>
        </div>
      )}

      {/* Team tab */}
      {activeTab === "team" && (
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-6 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-semibold text-lg text-foreground-900">
              Team Members
            </h3>
            <button className="btn-primary">
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-add-line text-sm" />
              </span>
              Invite Member
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-background-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                  <i className="ri-user-line text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground-800">
                    {user?.full_name || "Alex Rivera"}
                  </p>
                  <p className="text-xs text-foreground-400">Owner</p>
                </div>
              </div>
              <span className="text-xs font-medium text-accent-500 bg-accent-50 px-2 py-1 rounded-full">
                Owner
              </span>
            </div>
            <p className="text-sm text-foreground-400 text-center py-4">
              No additional team members yet.
            </p>
          </div>
        </div>
      )}

      {/* Email tab */}
      {activeTab === "email" && (
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-6 max-w-2xl">
          <h3 className="font-heading font-semibold text-lg text-foreground-900 mb-2">
            Email Configuration
          </h3>
          <p className="text-sm text-foreground-500 mb-6">
            Test your Resend email setup to make sure proposal and invoice emails deliver correctly.
          </p>

          {/* Setup checklist */}
          <div className="bg-background-50 rounded-lg p-4 mb-6 space-y-3">
            <h4 className="text-sm font-semibold text-foreground-800 mb-2">Setup Checklist</h4>
            <div className="flex items-center gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-status-accepted/15 text-status-accepted flex items-center justify-center shrink-0">
                <i className="ri-check-line text-xs" />
              </span>
              <span className="text-foreground-600">Get a Resend API key from{" "}
                <a href="https://resend.com/api-keys" target="_blank" rel="nofollow noopener" className="text-secondary-500 hover:text-secondary-600 underline">resend.com/api-keys</a>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-status-accepted/15 text-status-accepted flex items-center justify-center shrink-0">
                <i className="ri-check-line text-xs" />
              </span>
              <span className="text-foreground-600">Verify a sending domain at{" "}
                <a href="https://resend.com/domains" target="_blank" rel="nofollow noopener" className="text-secondary-500 hover:text-secondary-600 underline">resend.com/domains</a>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-status-accepted/15 text-status-accepted flex items-center justify-center shrink-0">
                <i className="ri-check-line text-xs" />
              </span>
              <span className="text-foreground-600">Add <code className="bg-background-200 px-1.5 py-0.5 rounded text-xs font-mono">RESEND_API_KEY</code> and <code className="bg-background-200 px-1.5 py-0.5 rounded text-xs font-mono">RESEND_FROM_DOMAIN</code> in your Supabase Dashboard &rarr; Edge Functions &rarr; Secrets</span>
            </div>
          </div>

          {/* Test email form */}
          <div className="space-y-4">
            <div>
              <label className="block text-label-md text-foreground-700 mb-1.5">
                Send test to
              </label>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={testStatus === 'sending'}
                  className="flex-1 px-3 py-2.5 bg-white border border-background-300 rounded-lg text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSendTest}
                  disabled={testStatus === 'sending' || !testEmail.trim()}
                  className="px-5 py-2.5 rounded-lg bg-secondary-500 hover:bg-secondary-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className={testStatus === 'sending' ? "ri-loader-4-line animate-spin" : "ri-send-plane-line"} />
                  </span>
                  {testStatus === 'sending' ? "Sending..." : "Send Test Email"}
                </button>
              </div>
            </div>

            {/* Status feedback */}
            {testStatus !== 'idle' && (
              <div className={`rounded-lg p-4 text-sm flex items-start gap-3 ${
                testStatus === 'sending' ? 'bg-background-50 text-foreground-600' :
                testStatus === 'success' ? 'bg-status-accepted/8 text-status-accepted border border-status-accepted/20' :
                'bg-status-deleted/8 text-status-deleted border border-status-deleted/20'
              }`}>
                <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  {testStatus === 'sending' && <i className="ri-loader-4-line animate-spin" />}
                  {testStatus === 'success' && <i className="ri-check-double-line text-lg" />}
                  {testStatus === 'error' && <i className="ri-error-warning-line text-lg" />}
                </span>
                <div>
                  {testStatus === 'sending' && (
                    <p>Sending test email to <strong>{testEmail}</strong>...</p>
                  )}
                  {testStatus === 'success' && (
                    <div>
                      <p className="font-medium">Test email sent successfully!</p>
                      <p className="text-status-accepted/70 mt-1">
                        Check <strong>{testEmail}</strong> for the confirmation. Your Resend configuration is working properly.
                      </p>
                      <button
                        onClick={() => setTestStatus('idle')}
                        className="text-xs underline hover:no-underline mt-2 cursor-pointer text-inherit opacity-70"
                      >
                        Send another
                      </button>
                    </div>
                  )}
                  {testStatus === 'error' && (
                    <div>
                      <p className="font-medium">{testError || "Failed to send test email."}</p>
                      <p className="text-status-deleted/70 mt-1">
                        Double-check that <code className="bg-status-deleted/10 px-1.5 py-0.5 rounded text-xs font-mono">RESEND_API_KEY</code> and <code className="bg-status-deleted/10 px-1.5 py-0.5 rounded text-xs font-mono">RESEND_FROM_DOMAIN</code> are set in your Supabase Dashboard.
                      </p>
                      <button
                        onClick={() => {
                          setTestStatus('idle');
                          setTestError(null);
                        }}
                        className="text-xs underline hover:no-underline mt-2 cursor-pointer text-inherit opacity-70"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preferences tab */}
      {activeTab === "preferences" && (
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-6 max-w-2xl">
          <h3 className="font-heading font-semibold text-lg text-foreground-900 mb-6">
            Workspace Preferences
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-background-100">
              <div>
                <p className="text-sm font-medium text-foreground-800">Email notifications</p>
                <p className="text-xs text-foreground-400">Receive updates about proposals and invoices</p>
              </div>
              <div className="w-11 h-6 bg-secondary-500 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-background-100">
              <div>
                <p className="text-sm font-medium text-foreground-800">Deadline reminders</p>
                <p className="text-xs text-foreground-400">Get reminded before project deadlines</p>
              </div>
              <div className="w-11 h-6 bg-secondary-500 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-foreground-800">Compact view</p>
                <p className="text-xs text-foreground-400">Use tighter spacing in lists and tables</p>
              </div>
              <div className="w-11 h-6 bg-background-300 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}