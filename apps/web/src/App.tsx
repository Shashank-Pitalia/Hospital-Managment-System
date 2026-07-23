import { useEffect, useState } from 'react';
import { RegistrationScreen } from './screens/registration/RegistrationScreen';
import { LookupScreen } from './screens/lookup/LookupScreen';
import { OpdQueueScreen } from './screens/opd/OpdQueueScreen';
import { DoctorConsoleScreen } from './screens/doctor/DoctorConsoleScreen';
import { FacilityRulesScreen } from './screens/admin/FacilityRulesScreen';
import { AdmissionDeskScreen } from './screens/admission/AdmissionDeskScreen';
import { WardStaffScreen } from './screens/admission/WardStaffScreen';

interface HealthResponse {
  status: string;
  uptime?: number;
  timestamp?: string;
  version?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<
    | 'lookup'
    | 'doctor-console'
    | 'opd-queue'
    | 'registration'
    | 'status'
    | 'facility-rules'
    | 'admission-desk'
    | 'ward-staff'
  >('doctor-console');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication token state (mock/demo session)
  const [token, setToken] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState<boolean>(false);

  // Auto-login default session for demo testing
  const loginAs = async (identifier: string, pass: string, roleName: string) => {
    setLoggingIn(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pass }),
      });
      if (!res.ok) {
        throw new Error('Login failed. Ensure API server is running.');
      }
      const data = await res.json();
      setToken(data.accessToken);
      setUserRole(roleName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(msg);
    } finally {
      setLoggingIn(false);
    }
  };

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setHealth(data);
      } catch {
        setError('Failed to fetch health check. Ensure API server is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    loginAs('doctor@esic.gov.in', 'DoctorPass123!', 'Doctor');
  }, []);

  useEffect(() => {
    if (activeTab === 'facility-rules' && userRole !== 'SuperAdmin' && userRole !== 'Administrator') {
      setActiveTab('doctor-console');
    }
    if (
      activeTab === 'admission-desk' &&
      userRole !== 'AdmissionDesk' &&
      userRole !== 'SuperAdmin' &&
      userRole !== 'Administrator'
    ) {
      setActiveTab('doctor-console');
    }
    if (
      activeTab === 'ward-staff' &&
      userRole !== 'Nurse' &&
      userRole !== 'Doctor' &&
      userRole !== 'SuperAdmin' &&
      userRole !== 'Administrator'
    ) {
      setActiveTab('doctor-console');
    }
  }, [userRole, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans text-gray-900">
      {/* Navigation Header */}
      <header className="bg-esic-primary text-white shadow-md print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xl">
              ⚕️
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ESIC Hospital Management System</h1>
              <p className="text-xs text-blue-100 font-medium">
                Digital Healthcare Workflow Platform
              </p>
            </div>
          </div>

          {/* User Session / Quick Login Controls */}
          <div className="flex items-center space-x-3 text-xs">
            {token ? (
              <div className="flex items-center space-x-2">
                <div className="bg-white/10 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  <span>
                    Role: <strong>{userRole}</strong>
                  </span>
                </div>
                <button
                  onClick={() => loginAs('doctor@esic.gov.in', 'DoctorPass123!', 'Doctor')}
                  disabled={loggingIn}
                  className={`px-3 py-1.5 rounded-lg text-white font-medium transition-colors ${
                    userRole === 'Doctor' ? 'bg-white/30 border border-white' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Doctor
                </button>
                <button
                  onClick={() => loginAs('nurse@esic.gov.in', 'NursePass123!', 'Nurse')}
                  disabled={loggingIn}
                  className={`px-3 py-1.5 rounded-lg text-white font-medium transition-colors ${
                    userRole === 'Nurse' ? 'bg-white/30 border border-white' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Nurse
                </button>
                <button
                  onClick={() => loginAs('admission@esic.gov.in', 'AdmissionPass123!', 'AdmissionDesk')}
                  disabled={loggingIn}
                  className={`px-3 py-1.5 rounded-lg text-white font-medium transition-colors ${
                    userRole === 'AdmissionDesk' ? 'bg-white/30 border border-white' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Desk
                </button>
                <button
                  onClick={() => loginAs('superadmin@esic.gov.in', 'SuperAdminSecret123!', 'SuperAdmin')}
                  disabled={loggingIn}
                  className={`px-3 py-1.5 rounded-lg text-white font-medium transition-colors ${
                    userRole === 'SuperAdmin' ? 'bg-white/30 border border-white' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  SuperAdmin
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loginAs('doctor@esic.gov.in', 'DoctorPass123!', 'Doctor')}
                  disabled={loggingIn}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium transition-colors"
                >
                  Login as Doctor
                </button>
                <button
                  onClick={() => loginAs('superadmin@esic.gov.in', 'SuperAdminSecret123!', 'SuperAdmin')}
                  disabled={loggingIn}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium transition-colors"
                >
                  Login as SuperAdmin
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-esic-primary-dark px-6">
          <div className="max-w-6xl mx-auto flex space-x-2 text-sm font-medium">
            <button
              onClick={() => setActiveTab('doctor-console')}
              className={`px-4 py-2.5 border-b-2 transition-colors ${
                activeTab === 'doctor-console'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-blue-200 hover:text-white'
              }`}
            >
              🩺 Doctor Consultation Console
            </button>
            <button
              onClick={() => setActiveTab('opd-queue')}
              className={`px-4 py-2.5 border-b-2 transition-colors ${
                activeTab === 'opd-queue'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-blue-200 hover:text-white'
              }`}
            >
              📋 OPD Queue Display
            </button>
            <button
              onClick={() => setActiveTab('lookup')}
              className={`px-4 py-2.5 border-b-2 transition-colors ${
                activeTab === 'lookup'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-blue-200 hover:text-white'
              }`}
            >
              🔍 Patient Lookup & Repeat Visit
            </button>
            <button
              onClick={() => setActiveTab('registration')}
              className={`px-4 py-2.5 border-b-2 transition-colors ${
                activeTab === 'registration'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-blue-200 hover:text-white'
              }`}
            >
              📋 Registration & UID
            </button>
             <button
              onClick={() => setActiveTab('status')}
              className={`px-4 py-2.5 border-b-2 transition-colors ${
                activeTab === 'status'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-blue-200 hover:text-white'
              }`}
            >
              ⚡ System Status
            </button>
            {(userRole === 'SuperAdmin' || userRole === 'Administrator') && (
              <button
                onClick={() => setActiveTab('facility-rules')}
                className={`px-4 py-2.5 border-b-2 transition-colors ${
                  activeTab === 'facility-rules'
                    ? 'border-white text-white font-semibold'
                    : 'border-transparent text-blue-200 hover:text-white'
                }`}
              >
                ⚙️ Facility Rules
              </button>
            )}
            {(userRole === 'AdmissionDesk' || userRole === 'SuperAdmin' || userRole === 'Administrator') && (
              <button
                onClick={() => setActiveTab('admission-desk')}
                className={`px-4 py-2.5 border-b-2 transition-colors ${
                  activeTab === 'admission-desk'
                    ? 'border-white text-white font-semibold'
                    : 'border-transparent text-blue-200 hover:text-white'
                }`}
              >
                🏨 Admission Desk
              </button>
            )}
            {(userRole === 'Nurse' || userRole === 'Doctor' || userRole === 'SuperAdmin' || userRole === 'Administrator') && (
              <button
                onClick={() => setActiveTab('ward-staff')}
                className={`px-4 py-2.5 border-b-2 transition-colors ${
                  activeTab === 'ward-staff'
                    ? 'border-white text-white font-semibold'
                    : 'border-transparent text-blue-200 hover:text-white'
                }`}
              >
                🏥 Ward Console
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow py-8 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        {authError && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm flex items-center justify-between">
            <span>⚠️ {authError}</span>
            <button
              onClick={() => loginAs('doctor@esic.gov.in', 'DoctorPass123!', 'Doctor')}
              className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-semibold"
            >
              Retry Login
            </button>
          </div>
        )}

        {activeTab === 'doctor-console' && <DoctorConsoleScreen authToken={token} />}

        {activeTab === 'lookup' && <LookupScreen authToken={token} />}

        {activeTab === 'opd-queue' && <OpdQueueScreen authToken={token} />}

        {activeTab === 'registration' && <RegistrationScreen authToken={token} />}

        {activeTab === 'facility-rules' && <FacilityRulesScreen authToken={token} />}

        {activeTab === 'admission-desk' && <AdmissionDeskScreen authToken={token} />}

        {activeTab === 'ward-staff' && <WardStaffScreen authToken={token} userRole={userRole} />}

        {activeTab === 'status' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-3">
              API Health Check Probe
            </h2>

            <div className="flex justify-center items-center p-6 bg-gray-50 rounded-xl border border-gray-200">
              {loading ? (
                <div className="flex items-center space-x-3 text-gray-500">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Probing http://localhost:3000/api/health...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center space-y-2 text-red-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span className="font-medium text-center">{error}</span>
                </div>
              ) : (
                <div className="w-full text-left space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-500">API Server Status</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <span className="w-2 h-2 mr-1.5 bg-green-500 rounded-full"></span>
                      {health?.status || 'Online'}
                    </span>
                  </div>
                  {health?.version && (
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                      <span className="text-gray-500">Version</span>
                      <span className="font-mono text-sm text-gray-700">{health.version}</span>
                    </div>
                  )}
                  {health?.uptime && (
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                      <span className="text-gray-500">Uptime</span>
                      <span className="font-mono text-sm text-gray-700">
                        {Math.floor(health.uptime)}s
                      </span>
                    </div>
                  )}
                  {health?.timestamp && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Last Probe</span>
                      <span className="font-mono text-sm text-gray-700">
                        {new Date(health.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-2 text-xs pt-4 border-t border-gray-100 text-center">
              <div className="bg-gray-100 p-2 rounded border border-gray-200">
                <span className="font-semibold block">Phase 1</span>
                <span className="text-[10px] text-gray-600">RBAC</span>
              </div>
              <div className="bg-gray-100 p-2 rounded border border-gray-200">
                <span className="font-semibold block">Phase 2</span>
                <span className="text-[10px] text-gray-600">UID/QR</span>
              </div>
              <div className="bg-gray-100 p-2 rounded border border-gray-200">
                <span className="font-semibold block">Phase 3</span>
                <span className="text-[10px] text-gray-600">Visits</span>
              </div>
              <div className="bg-gray-100 p-2 rounded border border-gray-200">
                <span className="font-semibold block">Phase 4</span>
                <span className="text-[10px] text-gray-600">OPD</span>
              </div>
              <div className="bg-green-100 p-2 rounded border border-green-300 text-green-900 font-bold">
                <span className="block">Phase 5</span>
                <span className="text-[10px]">Doctor Rx</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-gray-500 text-xs border-t border-gray-200 bg-white print:hidden">
        <p>ESIC Hospital Management System — Phase 5 Live Environment</p>
      </footer>
    </div>
  );
}

export default App;
