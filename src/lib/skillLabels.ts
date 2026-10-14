// Display names for programming skills / languages.
//
// Skills are stored as lowercase ids ("java", "js", "cpp", "mongodb") — that
// is what Course Structure saves and what every runner keys on — so anything
// that SHOWS one runs it through `skillLabel` to get the name people write:
// "Java", "JavaScript", "C++", "MongoDB". Already-proper names pass through
// unchanged ("C++" stays "C++"), so it is safe on either form.

const LABELS: Record<string, string> = {
  java: 'Java',
  python: 'Python', python3: 'Python', py: 'Python',
  javascript: 'JavaScript', js: 'JavaScript', node: 'JavaScript', nodejs: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript',
  c: 'C',
  cpp: 'C++', 'c++': 'C++', cplusplus: 'C++',
  csharp: 'C#', 'c#': 'C#', cs: 'C#',
  go: 'Go', golang: 'Go',
  kotlin: 'Kotlin', swift: 'Swift', rust: 'Rust', ruby: 'Ruby', php: 'PHP',
  scala: 'Scala', dart: 'Dart', r: 'R', bash: 'Bash',
  html: 'HTML', css: 'CSS', bootstrap: 'Bootstrap', tailwind: 'Tailwind CSS',
  react: 'React', next: 'Next.js', nextjs: 'Next.js', 'next.js': 'Next.js',
  angular: 'Angular', vue: 'Vue',
  sql: 'SQL', mysql: 'MySQL', plsql: 'PL/SQL', postgresql: 'PostgreSQL', postgres: 'PostgreSQL',
  mongodb: 'MongoDB', mongo: 'MongoDB', oracle: 'Oracle',
};

/** "java" → "Java", "js" → "JavaScript", "cpp" → "C++"; unknown ids get a capital first letter. */
export function skillLabel(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const known = LABELS[raw.toLowerCase()];
  if (known) return known;
  // A name someone already cased ("Spring Boot") is kept as written.
  return /[A-Z]/.test(raw) ? raw : raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** A list of skills as one readable line: "Java, Python". */
export const skillList = (values: unknown[] | null | undefined): string =>
  (values ?? []).map(skillLabel).filter(Boolean).join(', ');
