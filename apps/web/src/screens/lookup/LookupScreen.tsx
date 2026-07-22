import React, { useState, useEffect } from 'react';
import {
  lookupPatientByUid,
  createVisit,
  PatientLookupResponse,
  CreateVisitResponse,
} from '../../api/patient-lookup.api';
import { fetchDepartments, createOpdVisit, Department, OPDVisitRecord } from '../../api/opd.api';

interface LookupScreenProps {
  authToken: string;
}

export const LookupScreen: React.FC<LookupScreenProps> = ({ authToken }) => {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<PatientLookupResponse | null>(null);

  // Department state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  // Visit creation state
  const [visitType, setVisitType] = useState<'OPD' | 'IPD'>('OPD');
  const [creatingVisit, setCreatingVisit] = useState(false);
  const [openVisitWarning, setOpenVisitWarning] = useState<CreateVisitResponse | null>(null);
  const [issuedOpdToken, setIssuedOpdToken] = useState<OPDVisitRecord | null>(null);
  const [visitCreatedSuccess, setVisitCreatedSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (authToken) {
      fetchDepartments(authToken)
        .then((depts) => {
          setDepartments(depts);
          if (depts.length > 0) setSelectedDeptId(depts[0].id);
        })
        .catch(() => {});
    }
  }, [authToken]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setLoading(true);
    setError(null);
    setPatientData(null);
    setOpenVisitWarning(null);
    setVisitCreatedSuccess(null);
    setIssuedOpdToken(null);

    try {
      const result = await lookupPatientByUid(searchInput.trim(), authToken);
      setPatientData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVisit = async (ignoreWarning = false) => {
    if (!patientData || creatingVisit) return;

    setCreatingVisit(true);
    setError(null);
    setVisitCreatedSuccess(null);
    setIssuedOpdToken(null);

    try {
      const res = await createVisit(
        {
          employeeId: patientData.employee.id,
          type: visitType,
          ignoreOpenVisitWarning: ignoreWarning,
        },
        authToken,
      );

      if (res.status === 'OPEN_VISIT_WARNING' && !ignoreWarning) {
        setOpenVisitWarning(res);
      } else if (res.status === 'CREATED' && res.visit) {
        setOpenVisitWarning(null);

        // If visit is OPD, automatically generate daily token ticket
        if (visitType === 'OPD' && selectedDeptId) {
          const opdRes = await createOpdVisit(
            { visitId: res.visit.id, departmentId: selectedDeptId },
            authToken,
          );
          setIssuedOpdToken(opdRes.opdVisit);
          setVisitCreatedSuccess(
            `New OPD Visit created! Queue Token issued: ${opdRes.tokenNumber}`,
          );
        } else {
          setVisitCreatedSuccess(
            `New ${res.visit.type} Visit created successfully (Visit ID: ${res.visit.id})`,
          );
        }

        // Refresh patient lookup
        const updated = await lookupPatientByUid(patientData.employee.uid, authToken);
        setPatientData(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setCreatingVisit(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Search Header Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
          Repeat Visit & Patient Lookup
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Scan QR code or enter Hospital UID / Employee ID to load longitudinal medical history.
        </p>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Scan QR or Enter UID / Employee ID (e.g. ESIC-2026-000001 or EMP-1001)"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-esic-primary focus:border-transparent transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchInput.trim()}
            className="px-6 py-2.5 bg-esic-primary hover:bg-esic-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
          >
            {loading ? 'Searching...' : '🔍 Search Lookup'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Patient Profile & Medical History View */}
      {patientData && (
        <div className="space-y-6">
          {/* Patient Demographic Banner */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs font-mono font-bold text-esic-primary uppercase tracking-wider">
                  Hospital UID: {patientData.employee.uid}
                </span>
                <h3 className="text-2xl font-bold text-gray-900">{patientData.employee.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-esic-secondary/10 text-esic-secondary font-semibold text-xs rounded-full">
                  Category {patientData.employee.eligibilityCategory}
                </span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 font-semibold text-xs rounded-full">
                  {patientData.employee.employmentType}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-400 block">Employee ID</span>
                <span className="font-mono font-medium text-gray-800">
                  {patientData.employee.employeeId}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Department</span>
                <span className="font-medium text-gray-800">{patientData.employee.department}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Post</span>
                <span className="font-medium text-gray-800">{patientData.employee.post}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Grade</span>
                <span className="font-medium text-gray-800">{patientData.employee.grade}</span>
              </div>
            </div>
          </div>

          {/* Active / Open Visit Warning Banner */}
          {patientData.openVisit && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 text-sm flex items-start space-x-3">
              <span className="text-xl">⚠️</span>
              <div>
                <strong className="font-semibold block">Active Open Visit In Progress</strong>
                <span>
                  This patient currently has an unclosed {patientData.openVisit.type} visit opened
                  on {patientData.openVisit.date}.
                </span>
              </div>
            </div>
          )}

          {/* Create New Visit Action Panel */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h4 className="font-bold text-gray-800 text-lg border-b pb-2">
              Start New Visit & Issue Token
            </h4>

            {visitCreatedSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm font-semibold">
                ✅ {visitCreatedSuccess}
              </div>
            )}

            {/* Issued OPD Token Ticket Printable Modal/Card */}
            {issuedOpdToken && (
              <div className="p-6 bg-gradient-to-r from-esic-primary/5 to-blue-50 border-2 border-esic-primary/30 rounded-xl space-y-4 text-center print:p-0">
                <span className="text-xs uppercase tracking-widest font-bold text-esic-primary block">
                  ESIC Hospital OPD Queue Ticket
                </span>
                <h2 className="text-4xl font-black font-mono text-esic-primary tracking-wider">
                  {issuedOpdToken.tokenNumber}
                </h2>
                <p className="text-sm font-medium text-gray-700">
                  Patient: <strong>{patientData.employee.name}</strong> ({patientData.employee.uid})
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-esic-primary text-white text-xs font-bold rounded-lg shadow hover:bg-esic-primary-dark transition-colors"
                  >
                    🖨️ Print OPD Token Ticket
                  </button>
                  <button
                    onClick={() => setIssuedOpdToken(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
                  >
                    Dismiss Ticket
                  </button>
                </div>
              </div>
            )}

            {/* Open Visit Warning Confirmation Dialog */}
            {openVisitWarning && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 space-y-3">
                <p className="text-sm font-semibold">{openVisitWarning.message}</p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleCreateVisit(true)}
                    disabled={creatingVisit}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Proceed & Create Second Visit
                  </button>
                  <button
                    onClick={() => setOpenVisitWarning(null)}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">
                    Select Visit Type:
                  </label>
                  <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setVisitType('OPD')}
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                        visitType === 'OPD'
                          ? 'bg-esic-primary text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Out Service (OPD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitType('IPD')}
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                        visitType === 'IPD'
                          ? 'bg-esic-primary text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      In Service (IPD)
                    </button>
                  </div>
                </div>

                {visitType === 'OPD' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">
                      Select OPD Department:
                    </label>
                    <select
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleCreateVisit(false)}
                disabled={creatingVisit}
                className="w-full sm:w-auto px-6 py-2.5 bg-esic-secondary hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {creatingVisit ? 'Creating Visit...' : `Create ${visitType} Visit`}
              </button>
            </div>
          </div>

          {/* Longitudinal History Timeline */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h4 className="font-bold text-gray-800 text-lg border-b pb-2">
              Longitudinal Medical History
            </h4>

            {patientData.historySummary.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No prior visit records found for this employee.
              </p>
            ) : (
              <div className="space-y-3">
                {patientData.historySummary.map((h, idx) => (
                  <div
                    key={h.visitId || idx}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-gray-900">{h.type} Visit</span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            h.status === 'OPEN'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {h.status}
                        </span>
                      </div>
                      {h.diagnosis && <p className="text-xs text-gray-600">{h.diagnosis}</p>}
                    </div>
                    <span className="text-xs font-mono text-gray-400">{h.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
