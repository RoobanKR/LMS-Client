// Breadcrumb rendered in the Programming form's top bar.
// Extracted 2026-08-30, redesigned 2026-08-30 to give the teacher a clear
// idea of where they are AND what they are doing.
//
// Shape (only rendered when the corresponding hierarchyData field is present):
//
//   Course / Module / Submodule / Topic / Subtopic / Exercise / <Tab · Subcategory> / Questions / <Action · Question label>
//
// Separator is a plain "/" per user request. Each crumb keeps its
// data-tip so hovering shows what level it is (Course / Module / Topic / …).
// The final crumb (the current action) is bold so the teacher's eye lands
// on "what am I doing right now" first — matching the "you are here" idiom.

import React from 'react';

const capFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// Human label for the We_Do / You_Do tab tag. The DB values are the raw
// underscore forms; the breadcrumb should read like a person wrote it.
const humanTab = (t?: string) => {
  if (!t) return '';
  if (t === 'We_Do') return 'We Do';
  if (t === 'You_Do') return 'You Do';
  return t.replace(/_/g, ' ');
};

// Small reusable crumb piece. `tip` becomes a hover-tooltip via [data-tip]
// (styled by `.lms-crumb[data-tip]:hover::before` in `programming/styles.ts`).
const Crumb: React.FC<{
  text: string; tip: string;
  color?: string; weight?: number; maxWidth?: number;
}> = ({ text, tip, color = 'var(--lms-text-sec)', weight = 500, maxWidth }) => (
  <span
    className="lms-crumb"
    // Full name on hover - the crumb itself may be cut short with "…".
    title={`${tip}: ${text}`}
    style={{
      color, fontWeight: weight,
      display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      ...(maxWidth ? { maxWidth } : {}),
    }}
  >
    {text}
  </span>
);

export const QuestionFormBreadcrumb: React.FC<{
  hierarchyData: any; tabType?: string; subcategory?: string; subcategoryLabel?: string;
  exerciseName?: string; actionLabel: string; questionLabel: string;
}> = ({ hierarchyData, subcategoryLabel, exerciseName }) => {
  const Sep = () => <li aria-hidden="true" style={{ flexShrink: 0 }}><span className="lms-breadcrumb-sep">/</span></li>;

  // Build the crumb rail. Order = wide → narrow scope:
  //   Course / Module / Submodule / Topic / Subtopic / <Subcategory> / <Exercise>
  // The final crumb is the Exercise name (aka "assessment name" in You_Do
  // context) and gets the bold-orange "you are here" treatment. The
  // Questions / Add-Question / Question-#N tail was removed 2026-08-30 per
  // user request — where the teacher is (subcategory + exercise) is enough
  // context; what they're doing is obvious from the form on screen.
  const rail: Array<{ text: string; tip: string; maxWidth?: number; color?: string; weight?: number }> = [];
  if (hierarchyData?.courseName)    rail.push({ text: capFirst(hierarchyData.courseName),    tip: 'Course',    maxWidth: 160 });
  if (hierarchyData?.moduleName)    rail.push({ text: capFirst(hierarchyData.moduleName),    tip: 'Module',    maxWidth: 140 });
  if (hierarchyData?.submoduleName) rail.push({ text: capFirst(hierarchyData.submoduleName), tip: 'Submodule', maxWidth: 140 });
  if (hierarchyData?.topicName)     rail.push({ text: capFirst(hierarchyData.topicName),     tip: 'Topic',     maxWidth: 140 });
  if (hierarchyData?.subtopicName)  rail.push({ text: capFirst(hierarchyData.subtopicName),  tip: 'Subtopic',  maxWidth: 140 });
  if (subcategoryLabel)             rail.push({ text: capFirst(subcategoryLabel),            tip: 'Section',   maxWidth: 140 });

  return (
    <nav aria-label="Breadcrumb" style={{ fontFamily: 'var(--lms-font)', minWidth: 0, overflow: 'hidden' }}>
      {/* One line, never a scrollbar: when the rail is wider than the header,
          the crumbs shrink with "…" (the hierarchy first, the exercise name
          last) and hovering one shows its full name. */}
      <ol className="flex items-center flex-nowrap whitespace-nowrap" style={{ minWidth: 0 }}>
        {rail.map((c, i) => (
          <React.Fragment key={i}>
            <li style={{ minWidth: 28, flex: '0 3 auto', overflow: 'hidden' }}>
              <Crumb
                text={c.text}
                tip={c.tip}
                color={c.color}
                weight={c.weight}
                maxWidth={c.maxWidth}
              />
            </li>
            <Sep />
          </React.Fragment>
        ))}
        {/* Final crumb: the exercise / assessment name, bold-orange as
            the "you are here" spotlight. No trailing separator. */}
        {exerciseName && (
          <li style={{ minWidth: 60, flex: '0 1 auto', overflow: 'hidden' }}>
            <span
              className="lms-crumb"
              title={capFirst(exerciseName)}
              style={{
                fontFamily: 'var(--lms-font)', fontSize: 12.5, fontWeight: 700,
                color: 'var(--lms-orange)',
                display: 'block',
                maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {capFirst(exerciseName)}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
};
