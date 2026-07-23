import React, { useState, useEffect } from 'react';
import {
  fetchAdmissions,
  resolveAdmissionEligibility,
  fetchEligibleBeds,
  allocateBed,
  AdmissionRecord,
  BedRecord,
} from '../../api/admission.api';

interface AdmissionDeskScreenProps {
  authToken: string;
}

export const AdmissionDeskScreen: React.FC<AdmissionDeskScreenProps> = ({ authToken }) => {
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Allocation Dialog State
  const [selectedAdmission, setSelectedAdmission] = useState<AdmissionRecord | null>(null);
  const [availableBeds, setAvailableBeds] = useState<BedRecord[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState('');
  const [assignedDoctorId, setAssignedDoctorId] = useState('00000000-0000-0000-0000-000000000888');
  const [assignedNurseId, setAssignedNurseId] = useState('00000000-0000-0000-0000-000000000777');
  const [submittingAllocation, setSubmittingAllocation] = useState(false);

  const loadAdmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdmissions(authToken);
      setAdmissions(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      loadAdmissions();
    }
  }, [authToken]);

  const handleResolve = async (id: string) => {
    setError(null);
    try {
      await resolveAdmissionEligibility(id, authToken);
      await loadAdmissions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  };

  const handleOpenAllocation = async (admission: AdmissionRecord) => {
    setSelectedAdmission(admission);
    setLoadingBeds(true);
    setSelectedBedId('');
    try {
      const beds = await fetchEligibleBeds(admission.id, authToken);
      setAvailableBeds(beds);
      if (beds.length > 0) {
        setSelectedBedId(beds[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoadingBeds(false);
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission || !selectedBedId) return;

    setSubmittingAllocation(true);
    setError(null);
    try {
      await allocateBed(
        selectedAdmission.id,
        {
          bedId: selectedBedId,
          assignedDoctorId,
          assignedNurseId,
        },
        authToken,
      );
      setSelectedAdmission(null);
      await loadAdmissions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSubmittingAllocation(false);
    }
  };

  const pendingAdmissions = admissions.filter(
    (a) => a.status === 'REQUESTED' || a.status === 'ELIGIBILITY_CHECKED' || a.status === 'AWAITING_BED'
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            IPD Admission & Bed Allocation Desk
          </h2>
          <p className="text-sm text-gray-500">
            Verify facility eligibility categories and allocate available ward beds to patients.
          </p>
        </div>
        <button
          onClick={loadAdmissions}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700 bg-white shadow-sm transition-all"
        >
          🔄 Refresh Queue
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start">
          <svg className="w-5 h-5 mr-2 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <svg className="animate-spin h-8 w-8 text-esic-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800">Pending Allocation Requests ({pendingAdmissions.length})</h3>

          {pendingAdmissions.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-500 shadow-sm">
              <span className="text-4xl block mb-2">🛏️</span>
              No pending admission requests at this time.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingAdmissions.map((adm) => (
                <div
                  key={adm.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:border-gray-200 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          {adm.status}
                        </span>
                        <h4 className="font-bold text-lg text-gray-900 mt-1">
                          {adm.visit.employee.name}
                        </h4>
                        <span className="text-xs text-gray-500 block font-mono">
                          ID: {adm.visit.employee.employeeId} | Dept: {adm.visit.employee.department}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        Requested: {new Date(adm.requestedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="py-2 border-t border-gray-50 my-2 text-xs grid grid-cols-2 gap-2 text-gray-600">
                      <div>
                        <span className="text-gray-400 block">Post Match</span>
                        <span className="font-medium">{adm.visit.employee.post.title}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Grade Pay Level</span>
                        <span className="font-medium">{adm.visit.employee.grade.payLevel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <div>
                      {adm.status !== 'REQUESTED' && (
                        <div className="text-xs font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                          Resolved Category: <strong>{adm.eligibleCategory}</strong>
                        </div>
                      )}
                    </div>

                    <div className="space-x-2">
                      {adm.status === 'REQUESTED' ? (
                        <button
                          onClick={() => handleResolve(adm.id)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                        >
                          ⚙️ Resolve Category
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenAllocation(adm)}
                          className="px-4 py-2 bg-esic-primary hover:bg-esic-primary-dark text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                        >
                          🛏️ Allocate Bed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Allocation Modal Dialog */}
      {selectedAdmission && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-100 overflow-hidden transform scale-100 transition-transform">
            <div className="bg-esic-primary text-white px-6 py-4">
              <h3 className="font-bold text-lg">Allocate Bed & Care Team</h3>
              <p className="text-xs text-blue-100">
                Patient: {selectedAdmission.visit.employee.name} (Resolved Category: {selectedAdmission.eligibleCategory})
              </p>
            </div>

            <form onSubmit={handleAllocate} className="p-6 space-y-4">
              {loadingBeds ? (
                <div className="flex justify-center items-center py-6">
                  <svg className="animate-spin h-6 w-6 text-esic-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <>
                  {/* Bed selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Available Beds (Matching Category {selectedAdmission.eligibleCategory})
                    </label>
                    {availableBeds.length === 0 ? (
                      <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 font-medium">
                        ⚠️ No beds available in Ward Category {selectedAdmission.eligibleCategory}.
                      </div>
                    ) : (
                      <select
                        value={selectedBedId}
                        onChange={(e) => setSelectedBedId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-esic-primary focus:border-transparent transition-all"
                      >
                        {availableBeds.map((bed) => (
                          <option key={bed.id} value={bed.id}>
                            Bed {bed.bedNumber} — Room: {bed.room.roomNumber} ({bed.room.type} room) in {bed.room.ward.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Assigned Doctor */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Assigned Attending Doctor
                    </label>
                    <select
                      value={assignedDoctorId}
                      onChange={(e) => setAssignedDoctorId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-esic-primary focus:border-transparent transition-all"
                    >
                      <option value="00000000-0000-0000-0000-000000000888">Dr. Alok Verma (ID: doc-1)</option>
                      <option value="00000000-0000-0000-0000-000000000889">Dr. Shalini Kapoor (ID: doc-2)</option>
                    </select>
                  </div>

                  {/* Assigned Nurse */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Assigned Care Nurse
                    </label>
                    <select
                      value={assignedNurseId}
                      onChange={(e) => setAssignedNurseId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-esic-primary focus:border-transparent transition-all"
                    >
                      <option value="00000000-0000-0000-0000-000000000777">Nurse Emily Smith (ID: nrs-1)</option>
                      <option value="00000000-0000-0000-0000-000000000778">Nurse Joseph Brown (ID: nrs-2)</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setSelectedAdmission(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAllocation || !selectedBedId}
                      className="px-5 py-2 bg-esic-secondary hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                    >
                      {submittingAllocation ? 'Allocating...' : 'Confirm Allocation'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
