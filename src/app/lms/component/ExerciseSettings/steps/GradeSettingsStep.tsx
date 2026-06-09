import React from 'react';
import {
  Award, EyeOff, Hash, Layers, List, Plus, Shield, Terminal, Trash2,
} from 'lucide-react';
import { D, FONT } from '../shared/tokens';
import { GradeRow, InfoTooltip, ONumberInput } from '../shared/UIComponents';

type SectionPart = { id: string; name: string; totalMarks: number | null; passMark: number | null };

interface GradeSettingsStepProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  validationErrors: any;
  setValidationErrors: React.Dispatch<React.SetStateAction<any>>;
  touchedFields: Set<string>;
  markTouched: (field: string) => void;
  levelTotalsFromConfig: { easy?: number; medium?: number; hard?: number } | null | undefined;
}

export const GradeSettingsStep: React.FC<GradeSettingsStepProps> = ({
  formData,
  setFormData,
  validationErrors,
  setValidationErrors,
  touchedFields,
  markTouched,
  levelTotalsFromConfig,
}) => {
  const et = formData.exerciseType;
  const sep = formData.grades.separateMarks;
  const g = formData.grades;
  const ve = validationErrors;
  const tf = touchedFields;
  const diffEnabled = g.difficultyPassEnabled;

  const levelColors = { easy: D.emerald, medium: D.amber, hard: D.red };
  const levelLabels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

  const isCombinedDiff = et === 'Combined';
  const showDifficultyPass = (et === 'Programming' || et === 'Other' || et === 'Combined') && !!levelTotalsFromConfig;

  // Section Based (Part A / Part B / ...) — applies to MCQ, Programming, Other.
  // Combined uses its own separateMarks toggle (MCQ vs Programming sections).
  const sectionBased = !!g.sectionBased;
  const sections: SectionPart[] = Array.isArray(g.sections) ? g.sections : [];

  const newPartId = (idx: number) =>
    (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : `part_${Date.now()}_${idx}`;

  const updateSections = (updater: (curr: SectionPart[]) => SectionPart[]) =>
    setFormData((prev: any) => ({
      ...prev,
      grades: { ...prev.grades, sections: updater(Array.isArray(prev.grades.sections) ? prev.grades.sections : []) },
    }));

  const addPart = () => updateSections(curr => {
    const idx = curr.length;
    return [...curr, { id: newPartId(idx), name: `Part ${String.fromCharCode(65 + idx)}`, totalMarks: null, passMark: null }];
  });

  const removePart = (id: string) => updateSections(curr => curr.filter(p => p.id !== id));

  const updatePart = (id: string, patch: Partial<SectionPart>) =>
    updateSections(curr => curr.map(p => (p.id === id ? { ...p, ...patch } : p)));

  const toggleSectionBased = () =>
    setFormData((prev: any) => {
      const next = !prev.grades.sectionBased;
      const hasSections = Array.isArray(prev.grades.sections) && prev.grades.sections.length > 0;
      return {
        ...prev,
        grades: {
          ...prev.grades,
          sectionBased: next,
          ...(next ? { difficultyPassEnabled: false } : {}),
          ...(next && !hasSections
            ? { sections: [{ id: `part_${Date.now()}_0`, name: 'Part A', totalMarks: null, passMark: null }] }
            : {}),
        },
      };
    });

  const renderSectionBasedToggle = (color: string) => (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: D.border }}>
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: color + '12', color }}>
          <Layers size={13} />
        </div>
        <div>
          <span className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: FONT }}>
            Section Based
          </span>
          <p className="text-[10.5px]" style={{ color: D.textMuted }}>
            Split this exercise into parts (Part A, Part B, …) with their own total and pass mark
          </p>
        </div>
      </div>
      <button type="button"
        onClick={toggleSectionBased}
        className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
        style={{ background: sectionBased ? D.orange : '#e5e7eb' }}>
        <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${sectionBased ? 'translate-x-[17px]' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  const renderSectionBasedEditor = (color: string) => (
    <div className="py-2">
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color}25` }}>
        <div className="grid px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
          style={{
            background: color + '08',
            borderBottom: `1px solid ${color}20`,
            gridTemplateColumns: '100px 1fr 1fr 28px',
            color: D.textMuted,
            gap: '8px',
          }}>
          <span>Part</span>
          <span className="text-center">Total Marks</span>
          <span className="text-center">Mark to Pass</span>
          <span />
        </div>
        {sections.length === 0 ? (
          <div className="px-3 py-2 text-[11px]" style={{ color: D.textMuted }}>
            No parts yet — click "Add Part" below.
          </div>
        ) : (
          sections.map((p, idx) => {
            const exceeded = (p.totalMarks ?? 0) > 0 && (p.passMark ?? 0) > (p.totalMarks ?? 0);
            return (
              <div key={p.id}
                className="grid items-center px-3 py-2"
                style={{
                  gridTemplateColumns: '100px 1fr 1fr 28px',
                  gap: '8px',
                  borderTop: idx > 0 ? `1px solid ${D.border}` : 'none',
                  background: D.bg,
                }}>
                <input type="text"
                  value={p.name}
                  onChange={e => updatePart(p.id, { name: e.target.value })}
                  placeholder={`Part ${String.fromCharCode(65 + idx)}`}
                  className="px-2 py-1.5 text-xs rounded-lg border w-full"
                  style={{ borderColor: D.border, fontFamily: FONT, color: D.textMain, background: D.bg }} />
                <ONumberInput
                  value={p.totalMarks ?? 0}
                  onChange={v => updatePart(p.id, { totalMarks: v || null })}
                  placeholder="0"
                  min={0} />
                <div>
                  <ONumberInput
                    value={p.passMark ?? 0}
                    onChange={v => updatePart(p.id, { passMark: v || null })}
                    placeholder="0"
                    min={0}
                    max={p.totalMarks ?? undefined} />
                  {exceeded && (
                    <p className="mt-0.5 text-[10px]" style={{ color: D.red }}>Cannot exceed {p.totalMarks}</p>
                  )}
                </div>
                <button type="button"
                  onClick={() => removePart(p.id)}
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ background: D.red + '12', color: D.red }}
                  aria-label="Remove part">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>
      <button type="button"
        onClick={addPart}
        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ background: color + '12', color, border: `1px dashed ${color}40` }}>
        <Plus size={12} /> Add Part
      </button>
      <p className="text-[10.5px] mt-2" style={{ color: D.textMuted }}>
        Each part's Mark to Pass is optional and is validated against that part's Total Marks.
      </p>
    </div>
  );

  const renderLevelTable = (titleLabel: string | null) => {
    if (!levelTotalsFromConfig) return null;
    const activeLevels = (['easy', 'medium', 'hard'] as const).filter(
      l => (levelTotalsFromConfig[l] ?? 0) > 0
    );
    if (activeLevels.length === 0) return null;
    return (
      <div className="rounded-xl overflow-hidden mt-2" style={{ border: `1px solid ${D.purple}25` }}>
        {titleLabel && (
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: D.orangeLight, color: D.orange, borderBottom: `1px solid ${D.purple}20` }}>
            {titleLabel}
          </div>
        )}
        <div
          className="grid px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
          style={{
            background: D.purple + '08',
            borderBottom: `1px solid ${D.purple}20`,
            gridTemplateColumns: '80px 1fr 1fr',
            color: D.textMuted,
          }}
        >
          <span>Level</span>
          <span className="text-center">Total Marks</span>
          <span className="text-center">Mark to Pass</span>
        </div>

        {activeLevels.map((level, idx) => {
          const levelTotal = levelTotalsFromConfig[level] ?? 0;
          const passMarkKey = `${level}PassMark` as 'easyPassMark' | 'mediumPassMark' | 'hardPassMark';
          const passMarkValue = g[passMarkKey];
          const errorKey = `${level}PassMark`;
          const hasError = tf.has(errorKey) && !!(ve as any)[errorKey];

          return (
            <div
              key={level}
              className="grid items-center px-3 py-2"
              style={{
                gridTemplateColumns: '80px 1fr 1fr',
                gap: '8px',
                borderTop: idx > 0 ? `1px solid ${D.border}` : 'none',
                background: D.bg,
              }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: levelColors[level] }} />
                <span className="text-xs font-bold capitalize" style={{ color: levelColors[level], fontFamily: FONT }}>
                  {levelLabels[level]}
                </span>
              </div>
              <div className="relative flex justify-center">
                <div
                  className="px-3 py-1.5 rounded-lg border text-sm font-bold text-center w-full"
                  style={{ borderColor: D.border, background: levelColors[level] + '0d', color: levelColors[level], fontFamily: FONT }}
                >
                  {levelTotal}
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: levelColors[level] + 'aa' }}>
                    Auto
                  </span>
                </div>
              </div>
              <div>
                <ONumberInput
                  value={passMarkValue ?? 0}
                  onChange={v => {
                    setFormData((prev: any) => ({ ...prev, grades: { ...prev.grades, [passMarkKey]: v } }));
                    if (v > 0) setValidationErrors((prev: any) => { const e = { ...prev }; delete (e as any)[errorKey]; return e; });
                  }}
                  onBlur={() => markTouched(errorKey)}
                  placeholder="0"
                  max={levelTotal}
                  error={(ve as any)[errorKey]}
                  touched={hasError}
                />
                {levelTotal > 0 && (passMarkValue ?? 0) > levelTotal && (
                  <p className="mt-0.5 text-[10px]" style={{ color: D.red }}>Cannot exceed {levelTotal}</p>
                )}
              </div>
            </div>
          );
        })}

        <div
          className="px-3 py-2 text-[10.5px] font-medium"
          style={{ background: D.purple + '06', borderTop: `1px solid ${D.purple}15`, color: D.textMuted }}
        >
          Students must score at or above the level pass mark to pass that difficulty tier.
        </div>
      </div>
    );
  };

  const renderMcqTable = () => {
    const mcqTotal = formData.totalMarksMCQ || 0;
    const splitTotals = (() => {
      if (mcqTotal <= 0) return { easy: 0, medium: 0, hard: 0 };
      const base = Math.floor(mcqTotal / 3);
      const remainder = mcqTotal - base * 3;
      return { easy: base + remainder, medium: base, hard: base };
    })();

    const rows = [
      { level: 'easy' as const,   label: 'Easy',   color: D.emerald, total: splitTotals.easy,   stateKey: 'mcqEasyPassMark'   as const },
      { level: 'medium' as const, label: 'Medium', color: D.amber,   total: splitTotals.medium, stateKey: 'mcqMediumPassMark' as const },
      { level: 'hard' as const,   label: 'Hard',   color: D.red,     total: splitTotals.hard,   stateKey: 'mcqHardPassMark'   as const },
    ];

    return (
      <div className="rounded-xl overflow-hidden mt-2" style={{ border: `1px solid ${D.blue}25` }}>
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: D.blue + '12', color: D.blue, borderBottom: `1px solid ${D.blue}20` }}>
          MCQ Section
        </div>
        <div
          className="grid px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
          style={{
            background: D.blue + '08',
            borderBottom: `1px solid ${D.blue}20`,
            gridTemplateColumns: '80px 1fr 1fr',
            color: D.textMuted,
          }}
        >
          <span>Level</span>
          <span className="text-center">Total Marks</span>
          <span className="text-center">Mark to Pass</span>
        </div>

        {rows.map((row, idx) => {
          const value = g[row.stateKey];
          return (
            <div
              key={row.level}
              className="grid items-center px-3 py-2"
              style={{
                gridTemplateColumns: '80px 1fr 1fr',
                gap: '8px',
                background: D.bg,
                borderTop: idx === 0 ? 'none' : `1px solid ${D.blue}10`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                <span className="text-xs font-bold" style={{ color: row.color, fontFamily: FONT }}>
                  {row.label}
                </span>
              </div>
              <div className="relative flex justify-center">
                <div
                  className="px-3 py-1.5 rounded-lg border text-sm font-bold text-center w-full"
                  style={{ borderColor: D.border, background: D.blue + '0d', color: D.blue, fontFamily: FONT }}
                >
                  {row.total}
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: D.blue + 'aa' }}>
                    Auto
                  </span>
                </div>
              </div>
              <div>
                <ONumberInput
                  value={value ?? 0}
                  onChange={v =>
                    setFormData((prev: any) => ({
                      ...prev,
                      grades: { ...prev.grades, [row.stateKey]: v },
                    }))
                  }
                  placeholder="0"
                  max={row.total || undefined}
                />
                {row.total > 0 && (value ?? 0) > row.total && (
                  <p className="mt-0.5 text-[10px]" style={{ color: D.red }}>Cannot exceed {row.total}</p>
                )}
              </div>
            </div>
          );
        })}

        <div
          className="px-3 py-2 text-[10.5px] font-medium"
          style={{ background: D.blue + '06', borderTop: `1px solid ${D.blue}15`, color: D.textMuted }}
        >
          Students must score at or above each difficulty's pass mark to pass the MCQ section.
        </div>
      </div>
    );
  };

  const DifficultyPassSection = () => {
    if (!showDifficultyPass || !levelTotalsFromConfig) return null;
    const activeLevels = (['easy', 'medium', 'hard'] as const).filter(
      l => (levelTotalsFromConfig[l] ?? 0) > 0
    );
    if (activeLevels.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t" style={{ borderColor: D.border }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: D.purple + '15', color: D.purple }}>
              <Hash size={11} />
            </div>
            <div>
              <span className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: FONT }}>
                Mark to Pass by Difficulty
              </span>
              <InfoTooltip
                content="Set separate passing marks for each difficulty level. When enabled, the overall Mark to Pass field is hidden."
                side="right"
              />
              <p className="text-[10.5px]" style={{ color: D.textMuted }}>
                {isCombinedDiff
                  ? 'Configure MCQ and Programming pass marks separately — each section stores its own data.'
                  : 'Configure minimum passing marks per difficulty level'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData((prev: any) => ({
                ...prev,
                grades: { ...prev.grades, difficultyPassEnabled: !prev.grades.difficultyPassEnabled },
              }))
            }
            className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
            style={{ background: g.difficultyPassEnabled ? D.purple : '#e5e7eb' }}
          >
            <span
              className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${g.difficultyPassEnabled ? 'translate-x-[17px]' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {g.difficultyPassEnabled && (
          isCombinedDiff ? (
            <div className="space-y-3">
              {renderMcqTable()}
              {renderLevelTable('Programming Section')}
            </div>
          ) : (
            renderLevelTable(null)
          )
        )}

        {g.difficultyPassEnabled && <div className="mt-3 pt-3 border-t" style={{ borderColor: D.border }}>
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="overallMarkToPassEnabled"
              checked={g.overallMarkToPassEnabled ?? false}
              onChange={e => setFormData((prev: any) => ({
                ...prev,
                grades: { ...prev.grades, overallMarkToPassEnabled: e.target.checked, overallMarkToPass: e.target.checked ? prev.grades.overallMarkToPass : null }
              }))}
              className="mt-0.5 w-3.5 h-3.5 rounded cursor-pointer"
              style={{ accentColor: D.orange }}
            />
            <div className="flex-1">
              <label htmlFor="overallMarkToPassEnabled" className="text-xs font-semibold cursor-pointer" style={{ color: D.textMain, fontFamily: FONT }}>
                Mark to Pass <span className="font-normal" style={{ color: D.textMuted }}>(Optional)</span>
              </label>
              <p className="text-[10.5px] mt-0.5" style={{ color: D.textMuted }}>
                When enabled, this single value overrides per-difficulty pass/fail rules.
              </p>
              {(g.overallMarkToPassEnabled) && (
                <div className="mt-2 w-32 animate-in fade-in slide-in-from-top-1 duration-200">
                  <ONumberInput
                    value={g.overallMarkToPass ?? 0}
                    onChange={v => setFormData((prev: any) => ({ ...prev, grades: { ...prev.grades, overallMarkToPass: v || null } }))}
                    placeholder="0"
                    min={0}
                  />
                </div>
              )}
            </div>
          </div>
        </div>}
      </div>
    );
  };

  return (
    <div className="px-4 py-3">
      <div className="mb-3 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: D.orangeLight, color: D.orange }}>
          <Award size={13} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: FONT }}>
          Grade Settings
        </h3>
      </div>
      <p className="text-xs mb-3" style={{ color: D.textMuted }}>
        Configure grading based on the selected exercise type.
      </p>

      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
        <div className="px-3">

          {/* MCQ */}
          {et === 'MCQ' && (<>
            <GradeRow icon={<List size={13} />} color={D.blue} label="Mark"
              info="Auto-calculated from MCQ total marks"
              autoValue={formData.totalMarks || 'Auto'} />
            {!sectionBased && (
              <GradeRow icon={<Award size={13} />} color={D.blue} label="Mark to Pass"
                info="Minimum marks to pass — cannot exceed Mark (optional)"
                fieldKey="mcqGradeToPass" value={g.mcqGradeToPass}
                onChange={v => setFormData((prev: any) => ({ ...prev, grades: { ...prev.grades, mcqGradeToPass: v } }))}
                onBlur={() => markTouched('mcqGradeToPass')}
                error={ve.mcqGradeToPass} errorTouched={tf.has('mcqGradeToPass')} optional />
            )}
            {renderSectionBasedToggle(D.blue)}
            {sectionBased && renderSectionBasedEditor(D.blue)}
          </>)}

          {/* Other */}
          {et === 'Other' && (<>
            <GradeRow icon={<Terminal size={13} />} color={D.orange} label="Mark"
              info="Auto-calculated from total marks"
              autoValue={formData.totalMarks || 'Auto'} />
            {!diffEnabled && !sectionBased && (
              <GradeRow icon={<Award size={13} />} color={D.orange} label="Mark to Pass"
                info="Minimum marks required to pass — cannot exceed Mark (optional)"
                fieldKey="programmingGradeToPass" value={g.programmingGradeToPass}
                onChange={v => setFormData((prev: any) => ({ ...prev, grades: { ...prev.grades, programmingGradeToPass: v } }))}
                onBlur={() => markTouched('programmingGradeToPass')}
                error={ve.programmingGradeToPass} errorTouched={tf.has('programmingGradeToPass')} optional />
            )}
            {renderSectionBasedToggle(D.orange)}
            {sectionBased && renderSectionBasedEditor(D.orange)}
            {!sectionBased && showDifficultyPass && (
              <div className="pb-2"><DifficultyPassSection /></div>
            )}
          </>)}

          {/* Programming */}
          {et === 'Programming' && (<>
            <GradeRow icon={<Terminal size={13} />} color={D.orange} label="Total Marks"
              info="Auto-calculated from Step 1 total marks — read only"
              autoValue={formData.totalMarks || 'Auto'} />
            {!diffEnabled && !sectionBased && (
              <GradeRow icon={<Award size={13} />} color={D.orange} label="Mark to Pass"
                info="Minimum marks required to pass — cannot exceed Mark (optional)"
                fieldKey="programmingGradeToPass" value={g.programmingGradeToPass}
                onChange={v => setFormData((prev: any) => ({ ...prev, grades: { ...prev.grades, programmingGradeToPass: v } }))}
                onBlur={() => markTouched('programmingGradeToPass')}
                error={ve.programmingGradeToPass} errorTouched={tf.has('programmingGradeToPass')} optional />
            )}
            {renderSectionBasedToggle(D.orange)}
            {sectionBased && renderSectionBasedEditor(D.orange)}
            {!sectionBased && showDifficultyPass && (
              <div className="pb-2"><DifficultyPassSection /></div>
            )}
          </>)}

          {/* Combined */}
          {et === 'Combined' && (<>
            <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: D.border }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: D.purple + '12', color: D.purple }}>
                  <Layers size={13} />
                </div>
                <div>
                  <span className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: FONT }}>
                    Separate Marks
                  </span>
                  <p className="text-[10.5px]" style={{ color: D.textMuted }}>
                    Mark each section (MCQ &amp; Programming) independently
                  </p>
                </div>
              </div>
              <button type="button"
                onClick={() => setFormData((prev: any) => {
                  const next = !sep;
                  return {
                    ...prev,
                    grades: {
                      ...prev.grades,
                      separateMarks: next,
                      ...(next ? { difficultyPassEnabled: false } : {}),
                    },
                  };
                })}
                className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                style={{ background: sep ? D.orange : '#e5e7eb' }}>
                <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${sep ? 'translate-x-[17px]' : 'translate-x-0'}`} />
              </button>
            </div>

            {!sep ? (<>
              {(() => {
                const ag = (formData.totalMarksMCQ || 0) + (formData.totalMarksProgramming || 0);
                return (<>
                  <GradeRow icon={<Layers size={13} />} color={D.emerald} label="Mark"
                    info="Auto-calculated: MCQ total + Programming total"
                    autoValue={ag > 0 ? ag : 'Auto'} />
                  {!diffEnabled && (
                    <GradeRow icon={<Award size={13} />} color={D.emerald} label="Mark to Pass"
                      info={`Overall passing marks — cannot exceed Mark${ag > 0 ? ` (${ag})` : ''} (optional)`}
                      fieldKey="combinedGradeToPass" value={g.combinedGradeToPass}
                      onChange={v => setFormData((prev: any) => ({ ...prev, grades: { ...prev.grades, combinedGradeToPass: v } }))}
                      onBlur={() => markTouched('combinedGradeToPass')}
                      error={ve.combinedGradeToPass} errorTouched={tf.has('combinedGradeToPass')} optional />
                  )}
                </>);
              })()}
            </>) : (<>
              <div className="pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: D.blue }}>MCQ Section</div>
              <GradeRow icon={<List size={13} />} color={D.blue} label="MCQ Mark"
                info="Auto-calculated from MCQ Marks in Exercise Details"
                autoValue={formData.totalMarksMCQ || 'Auto'} />
              <GradeRow icon={<Award size={13} />} color={D.blue} label="MCQ Mark to Pass"
                info="Minimum marks to pass the MCQ section (optional)"
                fieldKey="mcqGradeToPass" value={g.mcqGradeToPass}
                onChange={v => setFormData((prev: any) => ({ ...prev, grades: { ...prev.grades, mcqGradeToPass: v } }))}
                onBlur={() => markTouched('mcqGradeToPass')}
                error={ve.mcqGradeToPass} errorTouched={tf.has('mcqGradeToPass')} optional />
              <div className="pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: D.orange }}>Programming Section</div>
              <GradeRow icon={<Terminal size={13} />} color={D.orange} label="Programming Mark"
                info="Auto-calculated from Programming Marks in Exercise Details"
                autoValue={formData.totalMarksProgramming || 'Auto'} />
              <GradeRow icon={<Award size={13} />} color={D.orange} label="Programming Mark to Pass"
                info="Minimum marks to pass the programming section (optional)"
                fieldKey="programmingGradeToPass" value={g.programmingGradeToPass}
                onChange={v => setFormData((prev: any) => ({ ...prev, grades: { ...prev.grades, programmingGradeToPass: v } }))}
                onBlur={() => markTouched('programmingGradeToPass')}
                error={ve.programmingGradeToPass} errorTouched={tf.has('programmingGradeToPass')} optional />
            </>)}

            {!sep && showDifficultyPass && (
              <div className="pb-2"><DifficultyPassSection /></div>
            )}
          </>)}

        </div>
      </div>

      {/* Additional Options */}
      <div className="mt-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Shield size={13} style={{ color: D.purple }} />
          <span className="text-xs font-bold" style={{ color: D.textMain, fontFamily: FONT }}>
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
            <div key={row.key}
              className="flex items-center justify-between px-3 py-2.5 transition-all"
              style={{ background: D.bg, borderTop: idx > 0 ? `1px solid ${D.border}` : 'none' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: row.color + '12', color: row.color }}>
                  {row.icon}
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: FONT }}>
                    {row.label}
                  </div>
                  <div className="text-[10.5px]" style={{ color: D.textMuted }}>{row.sub}</div>
                </div>
              </div>
              <button type="button"
                onClick={() => setFormData((prev: any) => ({
                  ...prev,
                  additionalOptions: { ...prev.additionalOptions, [row.key]: !row.val },
                }))}
                className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                style={{ background: row.val ? D.orange : '#e5e7eb' }}>
                <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${row.val ? 'translate-x-[17px]' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
