import React, { useEffect, useState } from 'react';
import {
  fetchDepartments,
  fetchOpdQueue,
  callOpdToken,
  closeOpdVisit,
  Department,
  OPDVisitRecord,
} from '../../api/opd.api';

interface OpdQueueScreenProps {
  authToken: string;
}

export const OpdQueueScreen: React.FC<OpdQueueScreenProps> = ({ authToken }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [queue, setQueue] = useState<OPDVisitRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Initial load of departments
  useEffect(() => {
    const loadDepts = async () => {
      try {
        const depts = await fetchDepartments(authToken);
        setDepartments(depts);
        if (depts.length > 0) {
          setSelectedDeptId(depts[0].id);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    loadDepts();
  }, [authToken]);

  // Load and auto-poll queue for selected department
  const loadQueue = async () => {
    if (!selectedDeptId) return;
    try {
      const q = await fetchOpdQueue(selectedDeptId, authToken);
      setQueue(q);
    } catch {
      // Ignore polling transient errors
    }
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 3000); // 3-second live queue refresh
    return () => clearInterval(interval);
  }, [selectedDeptId, authToken]);

  const currentCalledToken = queue.find((o) => o.calledAt && !o.closedAt);
  const nextWaitingTokens = queue.filter((o) => !o.calledAt && !o.closedAt);

  const handleCallNext = async () => {
    if (nextWaitingTokens.length === 0) return;
    const nextItem = nextWaitingTokens[0];
    setActionMessage(null);
    try {
      const updated = await callOpdToken(nextItem.id, authToken);
      setActionMessage(`📢 Called Token ${updated.tokenNumber} for consultation!`);
      await loadQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  };

  const handleCloseVisit = async (id: string, tokenNum: string) => {
    setActionMessage(null);
    try {
      await closeOpdVisit(id, authToken);
      setActionMessage(`✅ Completed and Closed Consultation for Token ${tokenNum}`);
      await loadQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  };

  const currentDeptObj = departments.find((d) => d.id === selectedDeptId);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header & Department Selector */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
            Doctor OPD Consultation Queue
          </h2>
          <p className="text-sm text-gray-500">
            Real-time daily queue monitor & token caller for attending doctors.
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <label className="text-xs font-semibold text-gray-500 block mb-1">
            Select Specialty Department:
          </label>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-esic-primary"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-semibold animate-pulse">
          {actionMessage}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Hero Called Token Banner */}
      <div className="bg-gradient-to-r from-esic-primary to-esic-primary-dark rounded-2xl p-8 text-white shadow-lg space-y-4">
        <div className="flex justify-between items-center border-b border-white/20 pb-4">
          <span className="text-xs uppercase tracking-widest text-blue-200 font-bold">
            Active Calling Station — {currentDeptObj?.name || 'OPD'}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-400/20 text-green-300 border border-green-400/30">
            <span className="w-2 h-2 mr-2 bg-green-400 rounded-full animate-ping"></span>
            Live Queue Syncing
          </span>
        </div>

        {currentCalledToken ? (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 py-2">
            <div>
              <span className="text-sm text-blue-100 font-medium">Currently Consulting</span>
              <h3 className="text-5xl font-black font-mono tracking-wider text-yellow-300 my-1">
                {currentCalledToken.tokenNumber}
              </h3>
              <p className="text-sm font-semibold text-white">
                Patient: {currentCalledToken.visit?.employee?.name || 'Walk-in Patient'} (
                {currentCalledToken.visit?.employee?.employeeId})
              </p>
            </div>

            <button
              onClick={() =>
                handleCloseVisit(currentCalledToken.id, currentCalledToken.tokenNumber)
              }
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              <span>Finish Consultation & Close</span>
            </button>
          </div>
        ) : (
          <div className="py-6 text-center space-y-3">
            <p className="text-2xl font-bold text-blue-100">
              No Patient Currently In Consultation Room
            </p>
            <p className="text-xs text-blue-200">
              {nextWaitingTokens.length} patient(s) waiting in queue for {currentDeptObj?.name}.
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-white/20 flex justify-end">
          <button
            onClick={handleCallNext}
            disabled={nextWaitingTokens.length === 0}
            className="px-8 py-3 bg-esic-secondary hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-lg transition-all disabled:opacity-40 disabled:hover:bg-esic-secondary"
          >
            📢 Call Next Patient ({nextWaitingTokens.length} Waiting)
          </button>
        </div>
      </div>

      {/* Waiting Tokens Queue List */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-bold text-gray-800 text-lg border-b pb-2 flex justify-between items-center">
          <span>Upcoming Queue ({nextWaitingTokens.length} Tokens)</span>
          <span className="text-xs text-gray-400 font-normal">Updated Live</span>
        </h3>

        {loading ? (
          <p className="text-sm text-gray-500 py-4 text-center">Loading queue...</p>
        ) : nextWaitingTokens.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-3xl block mb-2">🎉</span>
            <p className="text-sm font-semibold text-gray-600">
              No patients waiting in queue for {currentDeptObj?.name}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nextWaitingTokens.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 bg-gray-50 hover:bg-blue-50/50 rounded-xl border border-gray-200 transition-all flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-mono font-bold text-lg text-esic-primary">
                      {item.tokenNumber}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    {item.visit?.employee?.name || 'Registered Patient'}
                  </p>
                </div>

                <button
                  onClick={handleCallNext}
                  className="px-3 py-1.5 bg-esic-primary hover:bg-esic-primary-dark text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Call Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
