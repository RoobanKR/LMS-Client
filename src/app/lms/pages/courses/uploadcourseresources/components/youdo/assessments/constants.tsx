// constants.tsx
export const D = {
  orange: '#F27757',
  orangeLight: 'rgba(242,119,87,0.08)',
  orangeMed: 'rgba(242,119,87,0.15)',
  orangeGlow: 'rgba(242,119,87,0.25)',
  orangeDark: '#E0623F',
  bg: '#ffffff',
  surface: '#fafafa',
  surface2: '#f4f4f6',
  border: '#ecedf1',
  border2: '#e2e3e8',
  textMain: '#1a1a2e',
  textSub: '#6b6b7e',
  textMuted: '#9b9bae',
  textHint: '#bcbccc',
  emerald: '#10b981',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  amber: '#f59e0b',
  red: '#ef4444',
};

export const injectFonts = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    injected = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap';
    document.head.appendChild(link);
  };
})();

export const isApproximatelyEqual = (a: number, b: number, tolerance = 0.01) => Math.abs(a - b) < tolerance;
export const formatDecimal = (v: number) => v % 1 === 0 ? v.toString() : v.toFixed(2);

export const getEntityType = (nt: string) => {
  const m: Record<string, any> = { module: 'modules', submodule: 'submodules', topic: 'topics', subtopic: 'subtopics' };
  return m[nt?.toLowerCase()] || 'topics';
};

export const generateCalendarDays = (year: number, month: number) => {
  const dim = new Date(year, month, 0).getDate();
  const fd = new Date(year, month - 1, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < fd; i++) days.push(null);
  for (let i = 1; i <= dim; i++) days.push(i);
  return days;
};

export const moduleLanguages: Record<string, { name: string; icon: string }[]> = {
  'Core Programming': [
    { name: 'C', icon: '/active-images/c.png' }, { name: 'C++', icon: '/active-images/cpp.png' },
    { name: 'Java', icon: '/active-images/java.png' }, { name: 'Python', icon: '/active-images/python.png' },
    { name: 'C#', icon: '/active-images/csharp.png' },
  ],
  'Frontend': [
    { name: 'HTML', icon: '/active-images/html.png' }, { name: 'CSS', icon: '/active-images/css.png' },
    { name: 'JavaScript', icon: '/active-images/javascript.png' }, { name: 'Bootstrap', icon: '/active-images/bootstrap.png' },
    { name: 'TypeScript', icon: '/active-images/typescript.png' }, { name: 'React', icon: '/active-images/react.png' },
  ],
  'Database': [
    { name: 'SQL', icon: '/active-images/sql.png' }, { name: 'MongoDB', icon: '/active-images/mongodb.png' }
  ],
};

export const mcqScoringOptions = [
  { value: 'equalDistribution', label: 'Equal Distribution' },
  { value: 'questionSpecific', label: 'Question Specific' }
];

export const configOptions = [
  { label: 'General Configuration', value: 'general' },
  { label: 'Level Based Configuration', value: 'levelBased' },
  { label: 'Selection Level Configuration', value: 'selectionLevel' },
];

export const questionFlowOptions = [
  { value: 'freeFlow', label: 'Free Flow', description: 'Users can attempt questions in any order', icon: 'Shuffle' },
  { value: 'controlled', label: 'Controlled Flow', description: 'Users must follow specific sequence', icon: 'Lock' },
];

export const levelScoringOptions = [
  { value: 'level_specific', label: 'Level-specific marks' },
  { value: 'question_specific', label: 'Question-specific marks' },
];