// GradeSettingsStep.tsx
import React from 'react';
import { Award, List, Terminal, Layers, Shield, EyeOff } from 'lucide-react';
import { D } from './constants';
import { FormDataType, ValidationErrors } from './types';
import { GradeRow } from './UIComponents';
import type { SectionItem } from './ExerciseDetailsStep';

interface GradeSettingsStepProps {
  formData: FormDataType;
  setFormData: React.Dispatch<React.SetStateAction<FormDataType>>;
  validationErrors: ValidationErrors;
  touchedFields: Set<string>;
  markTouched: (field: string) => void;
  D: any;
  GradeRow: any;
  // Section-based extras — when isSectionBased is true and exerciseSections
  // has entries, we render a pass-mark input per section (Part A / B / C …)
  // instead of the global Mark / Mark to Pass row.
  isSectionBased?: boolean;
  exerciseSections?: SectionItem[];
}

export const GradeSettingsStep: React.FC<GradeSettingsStepProps> = ({
  formData,
  setFormData,
  validationErrors,
  touchedFields,
  markTouched,
  D,
  GradeRow,
  isSectionBased = false,
  exerciseSections = [],
}) => {
  const et = formData.exerciseType;
  const sep = formData.grades.separateMarks;
  const g = formData.grades;
  const ve = validationErrors;
  const tf = touchedFields;
  // Master toggle: when off, Total Mark + Mark to Pass fields are hidden and
  // their validation is skipped. Default true to preserve existing behaviour.
  const passMarkEnabled = g.enablePassMark !== false;

  const togglePassMarkEnabled = () => {
    setFormData(prev => ({
      ...prev,
      grades: { ...prev.grades, enablePassMark: !(prev.grades.enablePassMark !== false) },
    }));
  };

  // Per-section pass mark updater. Stored as Record<sectionId, number | null>
  // so an empty input clears it rather than coercing to 0.
  const setSectionPass = (sectionId: string, raw: any) => {
    const v = raw === '' || raw === null || raw === undefined ? null : Number(raw);
    setFormData(prev => ({
      ...prev,
      grades: {
        ...prev.grades,
        sectionPassMarks: {
          ...(prev.grades.sectionPassMarks || {}),
          [sectionId]: Number.isFinite(v as number) ? (v as number) : null,
        },
      },
    }));
  };

  // Aggregate total = sum of every part's totalMarks. Drives both the Total
  // Mark read-out and the upper bound for the Mark to Pass field.
  const aggregatedSectionTotal = exerciseSections.reduce(
    (sum, s) => sum + Number(s.totalMarks || 0),
    0
  );

  const renderSectionBased = () => (
    <>
      {/* 1) Total Mark — always shown, = sum of all part totals */}
      <GradeRow
        icon={<Layers size={13} />}
        color={D.purple}
        label="Total Mark"
        info="Auto-calculated — sum of every part's total marks (Part A + Part B + …)"
        autoValue={aggregatedSectionTotal > 0 ? aggregatedSectionTotal : 'Set part totals first'}
      />

      {/* 2) Mark to Pass — shown only when the toggle (rendered below) is ON */}
      {passMarkEnabled && (
        <GradeRow
          icon={<Award size={13} />}
          color={D.purple}
          label="Mark to Pass"
          info={
            aggregatedSectionTotal > 0
              ? `Minimum marks to pass — must be less than Total Mark (max ${aggregatedSectionTotal - 1}).`
              : 'Minimum marks to pass the exercise.'
          }
          fieldKey="combinedGradeToPass"
          value={g.combinedGradeToPass}
          onChange={(v: any) =>
            setFormData(prev => ({ ...prev, grades: { ...prev.grades, combinedGradeToPass: v } }))
          }
          onBlur={() => markTouched('combinedGradeToPass')}
          error={ve.combinedGradeToPass}
          errorTouched={tf.has('combinedGradeToPass')}
        />
      )}

      {exerciseSections.length === 0 && (
        <div className="px-3 py-2 text-[11px]" style={{ color: D.textMuted }}>
          No sections configured yet. Go back to <strong>Exercise Details</strong> to add sections.
        </div>
      )}
    </>
  );

  return (
    <div className="px-4 py-3">
      <div className="mb-3 flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: D.orangeLight, color: D.orange }}
        >
          <Award size={13} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: 'Inter, sans-serif' }}>
          Mark Settings
        </h3>
      </div>
      <p className="text-xs mb-3" style={{ color: D.textMuted }}>
        Configure grading based on the selected exercise type.
      </p>

      {(() => {
        // Reusable toggle row. Placement differs per mode:
        //   • Non-section: toggle ABOVE the fields (existing behaviour).
        //   • Section-based: toggle BELOW Total Mark + Mark to Pass.
        const ToggleRow = (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ background: D.bg }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: D.orangeLight, color: D.orange }}
                >
                  <Award size={13} />
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: 'Inter, sans-serif' }}>
                    Enable Mark to Pass
                  </div>
                  <div className="text-[10.5px]" style={{ color: D.textMuted }}>
                    {passMarkEnabled
                      ? 'Mark to Pass is required and validated against the Total Mark.'
                      : 'No pass/fail threshold — Mark to Pass field is hidden.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={togglePassMarkEnabled}
                aria-pressed={passMarkEnabled}
                className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                style={{ background: passMarkEnabled ? D.orange : '#e2e3e8' }}
              >
                <span
                  className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${
                    passMarkEnabled ? 'translate-x-[17px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        );

        // ── Section-based: Total Mark (always) → Mark to Pass (when on) → Toggle ──
        if (isSectionBased) {
          return (
            <>
              <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${D.border}` }}>
                <div className="px-3">{renderSectionBased()}</div>
              </div>
              {ToggleRow}
            </>
          );
        }

        // ── Non-section: existing layout — toggle on top, fields below ──
        return (
          <>
            <div className="mb-3">{ToggleRow}</div>
            {passMarkEnabled && (
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
                <div className="px-3">
                  <>
            <>
              {et === 'MCQ' && (
                <>
                  <GradeRow
                    icon={<List size={13} />}
                    color={D.blue}
                    label="Mark"
                    info="Auto-calculated from MCQ total marks"
                    autoValue={formData.totalMarks || 'Auto'}
                  />
                  <GradeRow
                    icon={<Award size={13} />}
                    color={D.blue}
                    label="Mark to Pass"
                    info="Minimum marks to pass — cannot exceed Mark"
                    fieldKey="mcqGradeToPass"
                    value={g.mcqGradeToPass}
                    onChange={(v: any) =>
                      setFormData(prev => ({ ...prev, grades: { ...prev.grades, mcqGradeToPass: v } }))
                    }
                    onBlur={() => markTouched('mcqGradeToPass')}
                    error={ve.mcqGradeToPass}
                    errorTouched={tf.has('mcqGradeToPass')}
                  />
                </>
              )}
              {et === 'Other' && (
                <>
                  <GradeRow
                    icon={<Terminal size={13} />}
                    color={D.orange}
                    label="Mark"
                    info="Auto-calculated from total marks"
                    autoValue={formData.totalMarks || 'Auto'}
                  />
                  <GradeRow
                    icon={<Award size={13} />}
                    color={D.orange}
                    label="Mark to Pass"
                    info="Minimum marks required to pass — cannot exceed Mark"
                    fieldKey="programmingGradeToPass"
                    value={g.programmingGradeToPass}
                    onChange={(v: any) =>
                      setFormData(prev => ({ ...prev, grades: { ...prev.grades, programmingGradeToPass: v } }))
                    }
                    onBlur={() => markTouched('programmingGradeToPass')}
                    error={ve.programmingGradeToPass}
                    errorTouched={tf.has('programmingGradeToPass')}
                  />
                </>
              )}
              {et === 'Programming' && (
                <>
                  <GradeRow
                    icon={<Terminal size={13} />}
                    color={D.orange}
                    label="Mark"
                    info="Total marks for the exercise"
                    fieldKey="programmingGrade"
                    value={g.programmingGrade}
                    onChange={(v: any) =>
                      setFormData(prev => ({ ...prev, grades: { ...prev.grades, programmingGrade: v } }))
                    }
                    onBlur={() => markTouched('programmingGrade')}
                    error={ve.programmingGrade}
                    errorTouched={tf.has('programmingGrade')}
                  />
                  <GradeRow
                    icon={<Award size={13} />}
                    color={D.orange}
                    label="Mark to Pass"
                    info="Minimum marks required to pass — cannot exceed Mark"
                    fieldKey="programmingGradeToPass"
                    value={g.programmingGradeToPass}
                    onChange={(v: any) =>
                      setFormData(prev => ({ ...prev, grades: { ...prev.grades, programmingGradeToPass: v } }))
                    }
                    onBlur={() => markTouched('programmingGradeToPass')}
                    error={ve.programmingGradeToPass}
                    errorTouched={tf.has('programmingGradeToPass')}
                  />
                </>
              )}
              {et === 'Combined' && (
                <>
                  <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: D.border }}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: D.purple + '12', color: D.purple }}
                      >
                        <Layers size={13} />
                      </div>
                      <div>
                        <span className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: 'Inter, sans-serif' }}>
                          Separate Marks
                        </span>
                        <p className="text-[10.5px]" style={{ color: D.textMuted }}>
                          Mark each section (MCQ &amp; Programming) independently
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, grades: { ...prev.grades, separateMarks: !sep } }))}
                      className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                      style={{ background: sep ? D.orange : '#e2e3e8' }}
                    >
                      <span
                        className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${
                          sep ? 'translate-x-[17px]' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  {!sep ? (
                    <>
                      {(() => {
                        const ag = (formData.totalMarksMCQ || 0) + (formData.totalMarksProgramming || 0);
                        return (
                          <>
                            <GradeRow
                              icon={<Layers size={13} />}
                              color={D.emerald}
                              label="Mark"
                              info="Auto-calculated: MCQ total + Programming total"
                              autoValue={ag > 0 ? ag : 'Auto'}
                            />
                            <GradeRow
                              icon={<Award size={13} />}
                              color={D.emerald}
                              label="Mark to Pass"
                              info={`Overall passing marks — cannot exceed Mark${ag > 0 ? ` (${ag})` : ''}`}
                              fieldKey="combinedGradeToPass"
                              value={g.combinedGradeToPass}
                              onChange={(v: any) =>
                                setFormData(prev => ({ ...prev, grades: { ...prev.grades, combinedGradeToPass: v } }))
                              }
                              onBlur={() => markTouched('combinedGradeToPass')}
                              error={ve.combinedGradeToPass}
                              errorTouched={tf.has('combinedGradeToPass')}
                            />
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <div className="pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: D.blue }}>
                        MCQ Section
                      </div>
                      <GradeRow
                        icon={<List size={13} />}
                        color={D.blue}
                        label="MCQ Mark"
                        info="Auto-calculated from MCQ Marks in Exercise Details"
                        autoValue={formData.totalMarksMCQ || 'Auto'}
                      />
                      <GradeRow
                        icon={<Award size={13} />}
                        color={D.blue}
                        label="MCQ Mark to Pass"
                        info={`Minimum marks to pass the MCQ section — cannot exceed MCQ Mark${
                          formData.totalMarksMCQ ? ` (${formData.totalMarksMCQ})` : ''
                        }`}
                        fieldKey="mcqGradeToPass"
                        value={g.mcqGradeToPass}
                        onChange={(v: any) =>
                          setFormData(prev => ({ ...prev, grades: { ...prev.grades, mcqGradeToPass: v } }))
                        }
                        onBlur={() => markTouched('mcqGradeToPass')}
                        error={ve.mcqGradeToPass}
                        errorTouched={tf.has('mcqGradeToPass')}
                      />
                      <div className="pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: D.orange }}>
                        Programming Section
                      </div>
                      <GradeRow
                        icon={<Terminal size={13} />}
                        color={D.orange}
                        label="Programming Mark"
                        info="Auto-calculated from Programming Marks in Exercise Details"
                        autoValue={formData.totalMarksProgramming || 'Auto'}
                      />
                      <GradeRow
                        icon={<Award size={13} />}
                        color={D.orange}
                        label="Programming Mark to Pass"
                        info={`Minimum marks to pass the programming section — cannot exceed Prog. Mark${
                          formData.totalMarksProgramming ? ` (${formData.totalMarksProgramming})` : ''
                        }`}
                        fieldKey="programmingGradeToPass"
                        value={g.programmingGradeToPass}
                        onChange={(v: any) =>
                          setFormData(prev => ({ ...prev, grades: { ...prev.grades, programmingGradeToPass: v } }))
                        }
                        onBlur={() => markTouched('programmingGradeToPass')}
                        error={ve.programmingGradeToPass}
                        errorTouched={tf.has('programmingGradeToPass')}
                      />
                    </>
                  )}
                </>
              )}
            </>
                </>
                </div>
              </div>
            )}
          </>
        );
      })()}

      <div className="mt-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Shield size={13} style={{ color: D.purple }} />
          <span className="text-xs font-bold" style={{ color: D.textMain, fontFamily: 'Inter, sans-serif' }}>
            Additional Options
          </span>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
          {[
            {
              key: 'anonymousSubmissions',
              label: 'Anonymous Submissions',
              sub: "Enable for unbiased grading — graders won't see student names",
              icon: <EyeOff size={14} />,
              color: D.purple,
              val: formData.additionalOptions.anonymousSubmissions,
            },
            {
              key: 'hideGraderIdentity',
              label: 'Hide Grader Identity',
              sub: 'Hide evaluator details from students',
              icon: <Shield size={14} />,
              color: D.blue,
              val: formData.additionalOptions.hideGraderIdentity,
            },
          ].map((row, idx) => (
            <div
              key={row.key}
              className="flex items-center justify-between px-3 py-2.5 transition-all"
              style={{ background: D.bg, borderTop: idx > 0 ? `1px solid ${D.border}` : 'none' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: row.color + '12', color: row.color }}
                >
                  {row.icon}
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: 'Inter, sans-serif' }}>
                    {row.label}
                  </div>
                  <div className="text-[10.5px]" style={{ color: D.textMuted }}>
                    {row.sub}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData(prev => ({
                    ...prev,
                    additionalOptions: { ...prev.additionalOptions, [row.key]: !row.val },
                  }))
                }
                className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                style={{ background: row.val ? D.orange : '#e2e3e8' }}
              >
                <span
                  className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${
                    row.val ? 'translate-x-[17px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
