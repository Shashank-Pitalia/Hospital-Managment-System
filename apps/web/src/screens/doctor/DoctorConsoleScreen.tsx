import React, { useState, useEffect } from 'react';
import {
  createPrescription,
  signPrescription,
  PrescriptionItemPayload,
  PrescriptionRecord,
} from '../../api/prescription.api';
import { evaluateBenefitRule } from '../../api/benefit.api';

interface DoctorConsoleScreenProps {
  authToken: string;
}

export const DoctorConsoleScreen: React.FC<DoctorConsoleScreenProps> = ({ authToken }) => {
  const [visitIdInput, setVisitIdInput] = useState('v-1001');
  const [employmentType, setEmploymentType] = useState<'PERMANENT' | 'CONTRACTUAL'>('PERMANENT');
  const [benefitOutcome, setBenefitOutcome] = useState<'FREE' | 'COVERED' | 'PAID'>('COVERED');

  const [symptoms, setSymptoms] = useState('Fever, dry cough, body pain for 3 days');
  const [examinationNotes, setExaminationNotes] = useState('Temp: 101°F, BP: 120/80, Chest clear');
  const [diagnosisText, setDiagnosisText] = useState('Acute Upper Respiratory Tract Infection');
  const [followUpFlag, setFollowUpFlag] = useState(true);
  const [admissionRecommended, setAdmissionRecommended] = useState(false);

  // Dynamic Prescription Items
  const [items, setItems] = useState<PrescriptionItemPayload[]>([
    {
      medicineName: 'Paracetamol 500mg',
      dose: '1 Tablet',
      frequency: '1-0-1 (Twice Daily)',
      duration: '5 Days',
    },
    {
      medicineName: 'Azithromycin 500mg',
      dose: '1 Tablet',
      frequency: '1-0-0 (Once Daily)',
      duration: '3 Days',
    },
  ]);

  // Lab Tests
  const [labTests, setLabTests] = useState<string[]>([
    'Complete Blood Count (CBC)',
    'Serum Creatinine',
  ]);
  const [newLabTest, setNewLabTest] = useState('');

  const [activePrescription, setActivePrescription] = useState<PrescriptionRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Evaluate single Benefit Rule engine whenever employmentType changes (Phase 6 spec §7)
  useEffect(() => {
    evaluateBenefitRule(employmentType, undefined, authToken)
      .then((res) => setBenefitOutcome(res.outcome))
      .catch(() => {
        setBenefitOutcome(employmentType === 'CONTRACTUAL' ? 'PAID' : 'COVERED');
      });
  }, [employmentType, authToken]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { medicineName: '', dose: '1 Tablet', frequency: '1-0-1', duration: '5 Days' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItemPayload, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleAddLabTest = () => {
    if (!newLabTest.trim()) return;
    setLabTests([...labTests, newLabTest.trim()]);
    setNewLabTest('');
  };

  const handleRemoveLabTest = (index: number) => {
    setLabTests(labTests.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const res = await createPrescription(
        {
          visitId: visitIdInput,
          symptoms,
          examinationNotes,
          diagnosisText,
          followUpFlag,
          admissionRecommended,
          items,
          labTests,
        },
        authToken,
      );

      setActivePrescription(res.prescription);
      setSuccessMessage('Prescription draft saved successfully in DRAFT state!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save draft prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignPrescription = async () => {
    if (!activePrescription) {
      setError('Please save the prescription draft first before signing.');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const signed = await signPrescription(activePrescription.id, authToken);
      setActivePrescription(signed);
      setSuccessMessage(
        '🔐 Prescription signed and permanently locked! Admission stub generated if requested.',
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign prescription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
            Doctor Consultation & Digital Prescription Console
          </h2>
          <p className="text-sm text-gray-500">
            Record clinical examination, evaluate benefit coverage, build digital prescriptions,
            order lab tests, and sign off.
          </p>
        </div>

        {/* Status Badge */}
        <div>
          {activePrescription?.status === 'SIGNED' ? (
            <span className="px-4 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300 flex items-center space-x-1.5 shadow-sm">
              <span>🔐</span>
              <span>SIGNED & LOCKED (IMMUTABLE)</span>
            </span>
          ) : activePrescription?.status === 'DRAFT' ? (
            <span className="px-4 py-2 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-300 flex items-center space-x-1.5 shadow-sm">
              <span>📝</span>
              <span>DRAFT (EDITABLE)</span>
            </span>
          ) : (
            <span className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-full border border-gray-300 flex items-center space-x-1.5">
              <span>🆕</span>
              <span>NEW CONSULTATION</span>
            </span>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          ✅ {successMessage}
        </div>
      )}

      <form onSubmit={handleSaveDraft} className="space-y-6">
        {/* Visit & Employee Context */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800 text-lg border-b pb-2 flex justify-between items-center">
            <span>1. Consultation Visit Context</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                benefitOutcome === 'PAID'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              Benefit Outcome:{' '}
              {benefitOutcome === 'PAID' ? '💳 PAID (OUT OF POCKET)' : '🏥 COVERED (ESIC)'}
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Active Visit ID:
              </label>
              <input
                type="text"
                value={visitIdInput}
                onChange={(e) => setVisitIdInput(e.target.value)}
                placeholder="Enter Active Visit ID (e.g. v-1001)"
                disabled={activePrescription?.status === 'SIGNED'}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-esic-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Employment Type (Benefit Rule Engine):
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as 'PERMANENT' | 'CONTRACTUAL')}
                disabled={activePrescription?.status === 'SIGNED'}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-esic-primary"
              >
                <option value="PERMANENT">PERMANENT (Covered by ESIC)</option>
                <option value="CONTRACTUAL">CONTRACTUAL (Default: Paid)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Attending Doctor:
              </label>
              <input
                type="text"
                disabled
                value="Dr. S. Sharma (MD Internal Medicine)"
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Clinical Examination & Diagnosis Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800 text-lg border-b pb-2">
            2. Clinical Diagnosis & Examination
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Patient Symptoms & History:
              </label>
              <textarea
                rows={2}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                disabled={activePrescription?.status === 'SIGNED'}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-esic-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Physical Examination Notes:
              </label>
              <textarea
                rows={2}
                value={examinationNotes}
                onChange={(e) => setExaminationNotes(e.target.value)}
                disabled={activePrescription?.status === 'SIGNED'}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-esic-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Primary Diagnosis Text <span className="text-red-500">*</span>:
              </label>
              <input
                type="text"
                required
                value={diagnosisText}
                onChange={(e) => setDiagnosisText(e.target.value)}
                disabled={activePrescription?.status === 'SIGNED'}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-esic-primary"
              />
            </div>
          </div>
        </div>

        {/* Digital Prescription Items Builder */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-bold text-gray-800 text-lg">3. Digital Rx Medicine Items</h3>
            {activePrescription?.status !== 'SIGNED' && (
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-esic-primary text-white text-xs font-semibold rounded-lg hover:bg-esic-primary-dark transition-colors"
              >
                + Add Medicine Row
              </button>
            )}
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-5 gap-3 items-center"
              >
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block uppercase">
                    Medicine Name
                  </label>
                  <input
                    type="text"
                    value={item.medicineName}
                    onChange={(e) => handleItemChange(index, 'medicineName', e.target.value)}
                    disabled={activePrescription?.status === 'SIGNED'}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block uppercase">
                    Dose
                  </label>
                  <input
                    type="text"
                    value={item.dose}
                    onChange={(e) => handleItemChange(index, 'dose', e.target.value)}
                    disabled={activePrescription?.status === 'SIGNED'}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block uppercase">
                    Frequency
                  </label>
                  <input
                    type="text"
                    value={item.frequency}
                    onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                    disabled={activePrescription?.status === 'SIGNED'}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block uppercase">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={item.duration}
                    onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                    disabled={activePrescription?.status === 'SIGNED'}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium"
                  />
                </div>
                <div className="flex items-center justify-between space-x-2 pt-3 sm:pt-0">
                  <span
                    className={`px-2 py-1 text-[10px] font-bold rounded border ${
                      benefitOutcome === 'PAID'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {benefitOutcome === 'PAID' ? '💳 PAID' : '🏥 FREE/COVERED'}
                  </span>
                  {activePrescription?.status !== 'SIGNED' && items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-500 hover:text-red-700 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diagnostic Lab Orders */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800 text-lg border-b pb-2">
            4. Diagnostic Lab Orders
          </h3>

          <div className="space-y-3">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter lab test name (e.g. Chest X-Ray, LFT)"
                value={newLabTest}
                onChange={(e) => setNewLabTest(e.target.value)}
                disabled={activePrescription?.status === 'SIGNED'}
                className="flex-grow px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-esic-primary"
              />
              {activePrescription?.status !== 'SIGNED' && (
                <button
                  type="button"
                  onClick={handleAddLabTest}
                  className="px-4 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-900 transition-colors"
                >
                  + Order Test
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {labTests.map((test, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-2"
                >
                  <span>🧪 {test}</span>
                  {activePrescription?.status !== 'SIGNED' && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLabTest(idx)}
                      className="text-blue-500 hover:text-blue-800 font-bold ml-1"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Disposition & Recommendations */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800 text-lg border-b pb-2">
            5. Follow-Up & Admission Disposition
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 p-3 border rounded-xl bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={followUpFlag}
                onChange={(e) => setFollowUpFlag(e.target.checked)}
                disabled={activePrescription?.status === 'SIGNED'}
                className="w-4 h-4 text-esic-primary focus:ring-esic-primary rounded"
              />
              <span className="text-sm font-semibold text-gray-700">
                📅 Follow-Up Recommended (in 5 days)
              </span>
            </label>

            <label className="flex items-center space-x-3 p-3 border rounded-xl bg-red-50 border-red-200 cursor-pointer">
              <input
                type="checkbox"
                checked={admissionRecommended}
                onChange={(e) => setAdmissionRecommended(e.target.checked)}
                disabled={activePrescription?.status === 'SIGNED'}
                className="w-4 h-4 text-red-600 focus:ring-red-500 rounded"
              />
              <span className="text-sm font-bold text-red-800">
                🏥 Recommend In-Patient Admission (IPD)
              </span>
            </label>
          </div>
        </div>

        {/* Action Controls */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {activePrescription?.status !== 'SIGNED' && (
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-gray-800 text-white font-semibold text-sm rounded-xl hover:bg-gray-900 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : '📝 Save Draft Prescription'}
            </button>
          )}

          <button
            type="button"
            onClick={handleSignPrescription}
            disabled={submitting || activePrescription?.status === 'SIGNED'}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>🔐</span>
            <span>
              {activePrescription?.status === 'SIGNED'
                ? 'Prescription Signed & Locked'
                : 'Sign & Lock Prescription (Doctor Role)'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
