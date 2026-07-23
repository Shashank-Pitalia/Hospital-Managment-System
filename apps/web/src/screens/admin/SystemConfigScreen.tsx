import React, { useEffect, useState } from 'react';
import { fetchBranding, updateBranding } from '../../api/security.api';

interface SystemConfigScreenProps {
  authToken?: string;
  token?: string;
}

export const SystemConfigScreen: React.FC<SystemConfigScreenProps> = ({ authToken, token }) => {
  const activeToken = authToken || token || '';
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [hospitalName, setHospitalName] = useState('');
  const [tagline, setTagline] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#005691');
  const [logoUrl, setLogoUrl] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBranding();
      setHospitalName(data.hospitalName);
      setTagline(data.tagline);
      setPrimaryColor(data.primaryColor);
      setLogoUrl(data.logoUrl);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load system config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await updateBranding({ hospitalName, tagline, primaryColor, logoUrl }, activeToken);
      setSuccessMsg('Branding configuration updated successfully (FR-CFG-01 to FR-CFG-03)!');
      loadData();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to update branding (SuperAdmin required)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>⚙️</span> System Configuration & Security Governance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Super-Admin Module 14 • Branding Customization (FR-CFG-01), Security Posture &
            Governance Runbooks
          </p>
        </div>
        <div>
          <button
            onClick={loadData}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
          >
            Refresh Config
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2">
          <span>✅</span> {successMsg}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold flex items-center gap-2">
          <span>❌</span> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100 text-gray-500">
          Loading system configuration...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hospital Branding Form */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b pb-3 flex items-center justify-between">
              <span>🎨 Hospital Branding & UI Customization</span>
              <span className="text-xs font-semibold text-esic-primary">SuperAdmin Access</span>
            </h2>
            <form onSubmit={handleSaveBranding} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  Hospital Name *
                </label>
                <input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  Tagline / Motto *
                </label>
                <input
                  type="text"
                  required
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Primary Color (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded border p-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Branding Preview */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Header Branding Preview
                </span>
                <div
                  className="p-3 rounded-lg text-white flex items-center justify-between"
                  style={{ backgroundColor: primaryColor }}
                >
                  <div>
                    <div className="font-bold text-sm">{hospitalName || 'ESIC Hospital'}</div>
                    <div className="text-[11px] opacity-90">{tagline}</div>
                  </div>
                  <div className="text-xs bg-white/20 px-2.5 py-1 rounded font-mono">FR-CFG-01</div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-esic-primary hover:bg-esic-primary-dark text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                >
                  {saving ? 'Saving Config...' : '💾 Save Branding Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Security Posture & Governance Panel */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-base font-bold text-gray-900 border-b pb-3">
              🛡️ Security Posture & Compliance Controls
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-900">
                    Security Headers Enforcement (FR-SEC-09)
                  </div>
                  <div className="text-emerald-700 text-[11px] mt-0.5">
                    HSTS, CSP, X-Content-Type-Options: nosniff, X-Frame-Options: DENY
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-600 text-white rounded font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-blue-900">CSRF Token Protection (FR-SEC-08)</div>
                  <div className="text-blue-700 text-[11px] mt-0.5">
                    X-CSRF-Token headers validated on all state-changing routes
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-blue-600 text-white rounded font-bold">
                  ENFORCED
                </span>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-purple-900">
                    MFA & Password Policy (FR-SEC-10, FR-SEC-11)
                  </div>
                  <div className="text-purple-700 text-[11px] mt-0.5">
                    TOTP MFA enabled for SuperAdmin, password lockout after 5 attempts
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-purple-700 text-white rounded font-bold">
                  ENROLLED
                </span>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <div className="font-bold text-gray-800">Governance Documentation & Runbooks</div>
                <div className="space-y-1 text-gray-600">
                  <div>
                    📄 <strong>RBAC Matrix</strong>: Documented role-by-endpoint permission table
                    for 10 roles
                  </div>
                  <div>
                    📄 <strong>Backup Runbook</strong>: Postgres dump & recovery verification
                    commands
                  </div>
                  <div>
                    📄 <strong>Incident Response Plan</strong>: Escalation SLAs (P1 &lt; 15 mins) &
                    CISO matrix
                  </div>
                  <div>
                    📄 <strong>Staging Data Masking</strong>: PII synthetic data transformation
                    script
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
