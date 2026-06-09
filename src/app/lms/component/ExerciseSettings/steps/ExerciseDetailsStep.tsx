import React from 'react';
import { AlertCircle, FileText, Lock } from 'lucide-react';
import { D, FONT } from '../shared/tokens';
import { InfoTooltip, OInput, ONumberInput } from '../shared/UIComponents';
import TipTapEditor from '../../tiptopEditor';

// Static catalogue used to render the configured-languages chips. Kept
// step-local so this file is self-contained; the parent has the same data.
const moduleLanguages: Record<string, { name: string; icon: string }[]> = {
  'Core Programming': [
    { name: 'C',      icon: '/active-images/c.png' },
    { name: 'C++',    icon: '/active-images/cpp.png' },
    { name: 'Java',   icon: '/active-images/java.png' },
    { name: 'Python', icon: '/active-images/python.png' },
    { name: 'C#',     icon: '/active-images/csharp.png' },
  ],
  Frontend: [
    { name: 'HTML',       icon: '/active-images/html.png' },
    { name: 'CSS',        icon: '/active-images/css.png' },
    { name: 'JavaScript', icon: '/active-images/javascript.png' },
    { name: 'Bootstrap',  icon: '/active-images/bootstrap.png' },
    { name: 'TypeScript', icon: '/active-images/typescript.png' },
    { name: 'React',      icon: '/active-images/react.png' },
  ],
  Database: [
    { name: 'SQL',     icon: '/active-images/sql.png' },
    { name: 'MongoDB', icon: '/active-images/mongodb.png' },
  ],
};

interface ExerciseDetailsStepProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  validationErrors: any;
  setValidationErrors: React.Dispatch<React.SetStateAction<any>>;
  touchedFields: Set<string>;
  markTouched: (field: string) => void;
  handleSelectExerciseType: (type: 'MCQ' | 'Programming' | 'Combined' | 'Other') => void;
  configuredLanguages?: { coreProgram?: string[]; frontend?: string[]; database?: string[] };
  isLockedForEdit: boolean;
  steps: Array<{ id: number; title: string }>;
  savedSteps: Set<string>;
}

export const ExerciseDetailsStep: React.FC<ExerciseDetailsStepProps> = ({
  formData,
  setFormData,
  validationErrors,
  setValidationErrors,
  touchedFields,
  markTouched,
  handleSelectExerciseType,
  configuredLanguages,
  isLockedForEdit,
  steps,
  savedSteps,
}) => {
  const isCombined = formData.exerciseType === 'Combined';
  const combinedTotal = formData.totalMarksMCQ + formData.totalMarksProgramming;

  const exerciseTypeOptions = [
    { value: 'MCQ',         label: 'MCQ — Multiple Choice Questions (auto-graded)' },
    { value: 'Programming', label: 'Programming — Code challenges with test cases' },
    { value: 'Combined',    label: 'Combined — MCQ + Programming (hybrid)' },
    { value: 'Other',       label: 'Other — Custom exercise with module & language config' },
  ];

  // Build the chip list for the Skill Set row
  const buildConfiguredLangList = () => {
    if (!configuredLanguages) return [];
    const allIconEntries = [
      ...moduleLanguages['Core Programming'],
      ...moduleLanguages['Frontend'],
      ...moduleLanguages['Database'],
    ];
    const langAliases: Record<string, string> = {
      js: 'JavaScript', ts: 'TypeScript', css: 'CSS', html: 'HTML',
      react: 'React', bootstrap: 'Bootstrap', sql: 'SQL',
      mongodb: 'MongoDB', c: 'C', 'c++': 'C++', java: 'Java',
      python: 'Python', 'c#': 'C#',
    };
    const findIcon = (name: string) => {
      const searchName = langAliases[name.toLowerCase()] || name;
      return allIconEntries.find(l => l.name.toLowerCase() === searchName.toLowerCase())?.icon || '';
    };
    const result: { name: string; icon: string; category: string }[] = [];
    for (const [category, key] of [['Core Programming', 'coreProgram'], ['Frontend', 'frontend'], ['Database', 'database']] as [string, string][]) {
      const names: string[] = (configuredLanguages as any)[key] || [];
      for (const name of names) result.push({ name, icon: findIcon(name), category });
    }
    return result;
  };

  const allLangs = buildConfiguredLangList();

  const labelCell = (label: string, required?: boolean, info?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: D.textMain, fontFamily: FONT, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {required && <span style={{ fontSize: 11, fontWeight: 600, color: D.orange, flexShrink: 0 }}>*</span>}
      {info && <InfoTooltip content={info} />}
    </div>
  );

  const fieldLabel = (label: string, required?: boolean, info?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: D.textMain, fontFamily: FONT }}>{label}</span>
      {required && <span style={{ fontSize: 11, fontWeight: 600, color: D.orange }}>*</span>}
      {info && <InfoTooltip content={info} />}
    </div>
  );

  const tdL: React.CSSProperties = {
    width: 148, paddingRight: 14, paddingBottom: 12, verticalAlign: 'top', paddingTop: 9,
  };
  const tdR: React.CSSProperties = {
    paddingBottom: 12, verticalAlign: 'top', paddingTop: 6,
  };

  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`;

  return (
    <div className="px-4 py-3">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: D.orangeLight, color: D.orange }}>
            <FileText size={13} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: FONT }}>
            Exercise Details
          </h3>
        </div>
        {isLockedForEdit && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold"
            style={{ background: D.amber + '15', color: D.amber, border: `1px solid ${D.amber}30` }}>
            <Lock size={10} /> Locked for Edit
          </span>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: 148 }} />
          <col />
        </colgroup>
        <tbody>

          {/* ── Exercise ID + Name ── */}
          <tr>
            <td colSpan={2} style={{ paddingBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  {fieldLabel('Exercise ID', false, 'Auto-generated unique identifier for this exercise')}
                  <OInput value={formData.exerciseId} onChange={() => { }} readOnly />
                </div>
                <div>
                  {fieldLabel('Exercise Name', true, 'The name displayed to students in their dashboard')}
                  <OInput
                    value={formData.exerciseName}
                    onChange={v => {
                      setFormData((prev: any) => ({ ...prev, exerciseName: v }));
                      if (v.trim()) setValidationErrors((prev: any) => { const e = { ...prev }; delete e.exerciseName; return e; });
                    }}
                    onBlur={() => markTouched('exerciseName')}
                    placeholder="e.g. Advanced Algorithms"
                    error={validationErrors.exerciseName}
                    touched={touchedFields.has('exerciseName')}
                  />
                </div>
              </div>
            </td>
          </tr>

          {/* divider */}
          <tr>
            <td colSpan={2} style={{ paddingBottom: 10 }}>
              <div style={{ height: 0.5, background: D.border }} />
            </td>
          </tr>

          {/* ── Exercise Type ── */}
          <tr>
            <td style={tdL}>{labelCell('Exercise Type', true, 'MCQ for multiple-choice, Programming for code challenges, or Combined for both')}</td>
            <td style={tdR}>
              <select
                value={formData.exerciseType || ''}
                onChange={e => {
                  const v = e.target.value as any;
                  handleSelectExerciseType(v);
                  if (v) setValidationErrors((prev: any) => { const n = { ...prev }; delete n.exerciseType; return n; });
                }}
                onBlur={() => markTouched('exerciseType')}
                disabled={isLockedForEdit}
                style={{
                  width: '100%', maxWidth: 340,
                  padding: '7px 28px 7px 10px', borderRadius: 8,
                  border: `0.5px solid ${validationErrors.exerciseType && touchedFields.has('exerciseType') ? D.red : D.border}`,
                  background: isLockedForEdit ? D.surface : D.bg,
                  color: formData.exerciseType ? (isLockedForEdit ? D.textMuted : D.textMain) : D.textMuted,
                  fontSize: 12, fontWeight: 600, fontFamily: FONT,
                  outline: 'none', cursor: isLockedForEdit ? 'not-allowed' : 'pointer',
                  appearance: 'none' as any,
                  backgroundImage: chevronBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                }}
              >
                <option value="" disabled>Select exercise type…</option>
                {exerciseTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {isLockedForEdit && (
                <p style={{ marginTop: 4, fontSize: 10, color: D.textMuted }}>
                  Exercise type cannot be changed after creation
                </p>
              )}
              {validationErrors.exerciseType && touchedFields.has('exerciseType') && (
                <p style={{ marginTop: 4, fontSize: 10, color: D.red, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <AlertCircle size={10} /> {validationErrors.exerciseType}
                </p>
              )}
            </td>
          </tr>

          {/* ── Assessment Type ── */}
          <tr>
            <td style={tdL}>{labelCell('Graded Type', true, 'Graded exercises require marks configuration; Non-Graded tracks completion only')}</td>
            <td style={tdR}>
              {(() => {
                const allStepsSaved = steps.length > 0 && steps.every(s => savedSteps.has(s.title));
                const gradedLocked = allStepsSaved;
                return (
                  <>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                      padding: 3, borderRadius: 8,
                      background: gradedLocked ? D.surface : D.surface,
                      border: `0.5px solid ${D.border}`,
                      opacity: gradedLocked ? 0.7 : 1,
                      cursor: gradedLocked ? 'not-allowed' : 'auto',
                    }}>
                      {(['Graded', 'Non-Graded'] as const).map(opt => {
                        const active = opt === 'Graded' ? formData.isGraded !== false : formData.isGraded === false;
                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={gradedLocked}
                            onClick={() => {
                              if (gradedLocked) return;
                              const graded = opt === 'Graded';
                              setFormData((prev: any) => ({
                                ...prev,
                                isGraded: graded,
                                ...(graded ? {} : { totalMarks: 0, totalMarksMCQ: 0, totalMarksProgramming: 0 }),
                              }));
                            }}
                            style={{
                              padding: '5px 14px', borderRadius: 6, border: 'none',
                              fontSize: 11, fontWeight: 500,
                              cursor: gradedLocked ? 'not-allowed' : 'pointer',
                              fontFamily: FONT,
                              transition: 'background 0.15s, color 0.15s',
                              background: active ? D.orange : 'transparent',
                              color: active ? '#fff' : D.textMuted,
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {gradedLocked && (
                      <p style={{ marginTop: 4, fontSize: 10, color: D.textMuted }}>
                        Graded type cannot be changed after the exercise has been fully completed
                      </p>
                    )}
                  </>
                );
              })()}
            </td>
          </tr>

          {/* ── Skill Set ── */}
          <tr>
            <td style={tdL}>{labelCell('Skill Set', false, 'Skill set configured for this topic')}</td>
            <td style={tdR}>
              {allLangs.length === 0 ? (
                <span style={{ fontSize: 12, color: D.textMuted }}>No languages configured</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allLangs.map(lang => (
                    <span key={lang.name}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 6,
                        border: `1px solid ${D.orange}`,
                        background: D.orangeLight, color: D.orange,
                        fontSize: 11, fontWeight: 600,
                      }}>
                      {lang.icon && (
                        <img src={lang.icon} alt={lang.name}
                          style={{ width: 14, height: 14, objectFit: 'contain' }}
                          onError={e => { (e.target as any).style.display = 'none'; }} />
                      )}
                      {lang.name}
                    </span>
                  ))}
                </div>
              )}
            </td>
          </tr>

          {/* divider */}
          <tr>
            <td colSpan={2} style={{ paddingBottom: 10 }}>
              <div style={{ height: 0.5, background: D.border }} />
            </td>
          </tr>

          {/* ── Description ── */}
          <tr>
            <td style={tdL}>{labelCell('Description', false, 'A brief overview shown to students before they start')}</td>
            <td style={tdR}>
              <TipTapEditor
                value={formData.description}
                onChange={(v: string) => setFormData((prev: any) => ({ ...prev, description: v }))}
                placeholder="Enter a brief description..."
                minHeight="150px"
                maxHeight="300px"
                showToolbar
                editable
              />
            </td>
          </tr>

          {/* ── Difficulty + Duration + Total Marks ── */}
          <tr>
            <td colSpan={2} style={{ paddingBottom: 12 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1.5fr',
                gap: 20,
                alignItems: 'flex-start',
              }}>

                {/* Difficulty Level */}
                <div>
                  {fieldLabel('Difficulty Level', true, 'Sets the challenge level — affects filtering and student guidance')}
                  <select
                    value={formData.exerciseLevel || ''}
                    onChange={e => {
                      setFormData((prev: any) => ({ ...prev, exerciseLevel: e.target.value as any }));
                      if (e.target.value) setValidationErrors((prev: any) => { const n = { ...prev }; delete n.exerciseLevel; return n; });
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 28px 7px 10px',
                      borderRadius: 8,
                      border: `0.5px solid ${validationErrors.exerciseLevel && touchedFields.has('exerciseLevel') ? D.red : D.border}`,
                      background: D.bg,
                      color: formData.exerciseLevel ? D.textMain : D.textMuted,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: FONT,
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none' as any,
                      backgroundImage: chevronBg,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 10px center',
                    }}
                  >
                    <option value="" disabled hidden>Select difficulty…</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="expert">Expert</option>
                  </select>
                  {validationErrors.exerciseLevel && touchedFields.has('exerciseLevel') && (
                    <p style={{ marginTop: 4, fontSize: 10, color: D.red, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <AlertCircle size={10} /> {validationErrors.exerciseLevel}
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div>
                  {fieldLabel('Duration', true, 'Total time allowed in minutes')}
                  <ONumberInput
                    value={formData.totalDuration}
                    onChange={v => {
                      setFormData((prev: any) => ({ ...prev, totalDuration: v }));
                      if (v > 0) setValidationErrors((prev: any) => { const e = { ...prev }; delete e.totalDuration; return e; });
                    }}
                    onBlur={() => markTouched('totalDuration')}
                    placeholder="60"
                    error={validationErrors.totalDuration}
                    touched={touchedFields.has('totalDuration')}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Total Marks - hidden when Non-Graded */}
                {formData.isGraded !== false && (
                  <div>
                    {fieldLabel(
                      isCombined ? 'Marks (MCQ + Prog.)' : 'Total Marks',
                      true,
                      isCombined ? 'Allocate marks between MCQ and Programming sections' : 'Maximum marks a student can score',
                    )}

                    {!isCombined ? (
                      <ONumberInput
                        value={formData.totalMarks}
                        onChange={v => {
                          setFormData((prev: any) => ({ ...prev, totalMarks: v }));
                          if (v > 0) setValidationErrors((prev: any) => { const e = { ...prev }; delete e.totalMarks; return e; });
                        }}
                        onBlur={() => markTouched('totalMarks')}
                        placeholder="Enter Total Marks"
                        error={validationErrors.totalMarks}
                        touched={touchedFields.has('totalMarks')}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <ONumberInput
                            value={formData.totalMarksMCQ}
                            onChange={v => {
                              setFormData((prev: any) => ({ ...prev, totalMarksMCQ: v, totalMarks: v + prev.totalMarksProgramming }));
                              if (v > 0) setValidationErrors((prev: any) => { const e = { ...prev }; delete e.totalMarksMCQ; return e; });
                            }}
                            onBlur={() => markTouched('totalMarksMCQ')}
                            placeholder="MCQ"
                            error={validationErrors.totalMarksMCQ}
                            touched={touchedFields.has('totalMarksMCQ')}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <ONumberInput
                            value={formData.totalMarksProgramming}
                            onChange={v => {
                              setFormData((prev: any) => ({ ...prev, totalMarksProgramming: v, totalMarks: prev.totalMarksMCQ + v }));
                              if (v > 0) setValidationErrors((prev: any) => { const e = { ...prev }; delete e.totalMarksProgramming; return e; });
                            }}
                            onBlur={() => markTouched('totalMarksProgramming')}
                            placeholder="Prog."
                            error={validationErrors.totalMarksProgramming}
                            touched={touchedFields.has('totalMarksProgramming')}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '7px 12px', borderRadius: 8,
                          background: D.orangeLight, border: `0.5px solid ${D.orange}40`,
                          fontSize: 11, fontWeight: 500, color: D.orange,
                          whiteSpace: 'nowrap',
                        }}>
                          {combinedTotal} marks
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </td>
          </tr>

        </tbody>
      </table>
    </div>
  );
};
