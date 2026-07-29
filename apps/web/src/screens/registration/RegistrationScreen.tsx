import React, { useState } from 'react';
import {
  verifyEmployeeId,
  registerEmployee,
  VerifiedEmployeeData,
  RegistrationResponse,
} from '../../api/employee.api';
import { UidCard } from '../../components/uid-card/UidCard';

interface RegistrationScreenProps {
  authToken: string;
}

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ authToken }) => {
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verifiedData, setVerifiedData] = useState<VerifiedEmployeeData | null>(null);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResponse | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeIdInput.trim()) return;

    setVerifying(true);
    setError(null);
    setVerifiedData(null);
    setRegistrationResult(null);

    try {
      const res = await verifyEmployeeId(employeeIdInput.trim(), authToken);
      if (res.status === 'VERIFIED' && res.verifiedData) {
        setVerifiedData(res.verifiedData);
      } else {
        setError('Employee ID verification failed. ID not found in Labour Dept database.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleRegister = async () => {
    if (!employeeIdInput.trim() || registering) return;

    setRegistering(true);
    setError(null);

    try {
      const res = await registerEmployee(employeeIdInput.trim(), authToken);
      setRegistrationResult(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setRegistering(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
          First-Time Employee Registration
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Verify Labour Department ID and issue permanent Hospital UID card.
        </p>

        {/* Form Input */}
        <form onSubmit={handleVerify} className="flex gap-3">
          <div className="relative flex-grow">
            <input
              type="text"
              value={employeeIdInput}
              onChange={(e) => setEmployeeIdInput(e.target.value)}
              placeholder="Enter Employee ID (e.g. EMP-1001)"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-esic-primary focus:border-transparent transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={verifying || !employeeIdInput.trim()}
            className="px-5 py-2.5 bg-esic-primary hover:bg-esic-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
          >
            {verifying ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                Verifying...
              </span>
            ) : (
              'Verify ID'
            )}
          </button>
        </form>

        {/* Error Banner */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start">
            <svg
              className="w-5 h-5 mr-2 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Verification Preview Card */}
      {verifiedData && !registrationResult && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Verified Employee Information</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              Verified Source
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-400 block">Name</span>
              <span className="font-semibold text-gray-900">{verifiedData.name}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Employee ID</span>
              <span className="font-mono font-medium text-gray-700">{verifiedData.employeeId}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Department</span>
              <span className="text-gray-700">{verifiedData.department}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Post / Designation</span>
              <span className="text-gray-700">{verifiedData.postTitle}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Grade / Pay Level</span>
              <span className="text-gray-700">{verifiedData.gradePayLevel}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Employment Type</span>
              <span className="font-semibold text-esic-secondary">
                {verifiedData.employmentTypeCode}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleRegister}
              disabled={registering}
              className="px-6 py-2.5 bg-esic-secondary hover:bg-emerald-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors disabled:opacity-50"
            >
              {registering ? 'Registering & Issuing UID...' : 'Register & Issue Hospital UID'}
            </button>
          </div>
        </div>
      )}

      {/* Registration Result & UID Card View */}
      {registrationResult && (
        <div className="space-y-6">
          {registrationResult.status === 'MANUAL_VERIFICATION_PENDING' ? (
            <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  ></path>
                </svg>
                <h3 className="font-bold text-lg">Pending Manual Verification Escalated</h3>
              </div>
              <p className="text-sm text-amber-800">{registrationResult.reason}</p>
              <div className="text-xs font-mono bg-white/50 p-2 rounded border border-amber-300 mt-2">
                Ticket Reference Case ID: {registrationResult.caseId}
              </div>
            </div>
          ) : (
            registrationResult.hospitalUid &&
            registrationResult.employee &&
            registrationResult.qrDataUrl && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-sm flex items-center justify-between">
                  <span>
                    ✅ Employee successfully registered! Hospital UID issued:{' '}
                    <strong>{registrationResult.hospitalUid.uidCode}</strong>
                  </span>
                </div>

                <UidCard
                  uidCode={registrationResult.hospitalUid.uidCode}
                  qrDataUrl={registrationResult.qrDataUrl}
                  issuedAt={registrationResult.hospitalUid.issuedAt || new Date().toISOString()}
                  employee={{
                    employeeId: registrationResult.employee.employeeId,
                    name: registrationResult.employee.name,
                    department: registrationResult.employee.department,
                    postTitle: registrationResult.employee.post.title,
                    gradePayLevel: registrationResult.employee.grade.payLevel,
                    employmentTypeCode: registrationResult.employee.employmentType.code,
                  }}
                  onPrint={handlePrint}
                />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
