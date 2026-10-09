// ─────────────────────────────────────────────────────────────────────────────
// Test-case literal → STDIN normaliser.
//
// Assessment papers write test-case inputs the way LeetCode does — a list of
// named argument literals on one line:
//
//     nums = [90,80,70,60,50], k = 2
//
// But every runner in this app feeds `testCase.input` to the program as raw
// STDIN (RunTestCasesModal → runOne → Piston, the student code-editor, the
// multi-file editor, and the server judge). So that literal has to be rewritten
// as the values a program would actually read — one value per line, arrays
// flattened to a space-separated row:
//
//     90 80 70 60 50
//     2
//
// Rules:
//   • `nums = [1,7,3]`                        → "1 7 3"
//   • `ranges = [[1,2],[3,4]], left = 2`      → "1 2\n3 4\n2"   (one row per line)
//   • `s = "ab#c", t = "ad#c"`                → "ab#c\nad#c"    (quotes stripped)
//   • anything that isn't a recognisable assignment list is returned untouched,
//     so a document that already writes raw stdin keeps working.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Value literals ──────────────────────────────────────────────────────────

type LiteralNode =
  | { kind: 'scalar'; value: string }
  | { kind: 'list'; items: LiteralNode[] };

/** "(none)" / "(empty)" — how papers write an empty list. */
const EMPTY_NOTE = /^\(\s*(?:none|empty|null|nil)\s*\)$/i;

const isSpace = (c: string | undefined) => !!c && /\s/.test(c);

const skipWs = (src: string, i: number): number => {
  while (i < src.length && isSpace(src[i])) i++;
  return i;
};

const CLOSERS: Record<string, string> = { '[': ']', '(': ')', '{': '}' };

/**
 * Parse one value literal starting at `i` — a bracketed list, a quoted string,
 * or a bare token. Returns null when the text isn't a well-formed literal (the
 * caller then leaves the original text alone).
 */
function parseLiteral(src: string, i: number): { node: LiteralNode; next: number } | null {
  i = skipWs(src, i);
  if (i >= src.length) return null;
  const ch = src[i];

  const close = CLOSERS[ch];
  if (close) {
    const items: LiteralNode[] = [];
    i = skipWs(src, i + 1);
    if (src[i] === close) return { node: { kind: 'list', items }, next: i + 1 };
    while (i < src.length) {
      const parsed = parseLiteral(src, i);
      if (!parsed) return null;
      items.push(parsed.node);
      i = skipWs(src, parsed.next);
      if (src[i] === ',') { i = skipWs(src, i + 1); continue; }
      if (src[i] === close) return { node: { kind: 'list', items }, next: i + 1 };
      return null; // junk between items → not a literal
    }
    return null; // unterminated
  }

  if (ch === '"' || ch === "'") {
    let out = '';
    i++;
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') {
        const n = src[i + 1];
        out += n === 'n' ? '\n' : n === 't' ? '\t' : n === 'r' ? '\r' : (n ?? '');
        i += 2;
        continue;
      }
      if (c === ch) return { node: { kind: 'scalar', value: out }, next: i + 1 };
      out += c;
      i++;
    }
    return null; // unterminated
  }

  // Bare token — number, boolean, identifier… runs until a structural delimiter.
  const start = i;
  while (i < src.length && !/[,\])}]/.test(src[i])) i++;
  const value = src.slice(start, i).trim();
  if (!value) return null;
  return { node: { kind: 'scalar', value }, next: i };
}

/**
 * One literal → the stdin lines a program would read for it. A flat list is a
 * single space-separated row; a nested list keeps one row per inner list, which
 * is how a 2-D array is normally fed to a solution.
 */
function literalToLines(node: LiteralNode): string[] {
  if (node.kind === 'scalar') return [node.value];
  if (node.items.every(it => it.kind === 'scalar')) {
    return [node.items.map(it => (it as { value: string }).value).join(' ')];
  }
  return node.items.flatMap(literalToLines);
}

/** Format a single value literal as the stdin text for it. */
export function formatValueForStdin(raw: string): string {
  const v = (raw ?? '').trim().replace(/,+$/, '').trim();
  if (!v || EMPTY_NOTE.test(v)) return '';
  const parsed = parseLiteral(v, 0);
  // Only rewrite when the literal accounts for the WHOLE value — a partial
  // match means this is prose (or already-shaped stdin) and stays verbatim.
  if (parsed && skipWs(v, parsed.next) >= v.length) return literalToLines(parsed.node).join('\n');
  return v;
}

// ─── Argument lists ──────────────────────────────────────────────────────────

export interface StdinAssignment { name: string; value: string }

/**
 * Split `nums = [1,2], k = 2` into its named arguments. Commas inside brackets
 * or quotes don't split, and `==` / `<=` / `>=` / `!=` are not assignments.
 * Returns null when the text isn't an argument list at all.
 */
export function splitAssignments(src: string): StdinAssignment[] | null {
  const marks: { name: string; nameStart: number; eq: number }[] = [];
  let depth = 0;
  let quote: string | null = null;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '[' || ch === '(' || ch === '{') { depth++; continue; }
    if (ch === ']' || ch === ')' || ch === '}') { depth = Math.max(0, depth - 1); continue; }
    if (depth > 0 || ch !== '=') continue;
    // Comparison / compound operators are not assignments.
    if (src[i + 1] === '=' || '=!<>+-*/%'.includes(src[i - 1] ?? '')) continue;

    let j = i - 1;
    while (j >= 0 && /[ \t]/.test(src[j])) j--;
    const nameEnd = j + 1;
    while (j >= 0 && /[A-Za-z0-9_$]/.test(src[j])) j--;
    let nameStart = j + 1;
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(src.slice(nameStart, nameEnd))) continue;

    // The name must open a new argument: start of text, or just past a
    // top-level comma / newline / semicolon. Anything else is prose — except a
    // short multi-word name ("listA prefix = [4,1]"), up to three words.
    const opensArgument = (start: number): boolean => {
      let k = start - 1;
      while (k >= 0 && /[ \t]/.test(src[k])) k--;
      return k < 0 || ',;\n'.includes(src[k]);
    };
    let ok = opensArgument(nameStart);
    for (let extra = 0; !ok && extra < 2; extra++) {
      const p = nameStart - 1;
      if (p < 0 || src[p] !== ' ') break;
      let q = p - 1;
      while (q >= 0 && /[A-Za-z0-9_$]/.test(src[q])) q--;
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(src.slice(q + 1, p))) break;
      nameStart = q + 1;
      ok = opensArgument(nameStart);
    }
    if (!ok) continue;

    marks.push({ name: src.slice(nameStart, nameEnd), nameStart, eq: i });
  }

  if (!marks.length) return null;
  // Text ahead of the first argument means this is a sentence that happens to
  // contain an "=", not an argument list.
  if (src.slice(0, marks[0].nameStart).trim()) return null;

  return marks.map((m, idx) => ({
    name: m.name,
    value: src.slice(m.eq + 1, idx + 1 < marks.length ? marks[idx + 1].nameStart : src.length),
  }));
}

/**
 * Test-case INPUT literal → stdin. Each named argument becomes its own line
 * (arrays flattened); non-assignment text is returned as written.
 */
export function normalizeStdinInput(raw: string): string {
  const text = (raw ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return '';
  const args = splitAssignments(text);
  if (!args) return text;
  return args.map(a => formatValueForStdin(a.value)).join('\n');
}

/**
 * Test-case OUTPUT literal → the exact text the program is expected to print.
 * Arrays/strings are unwrapped the same way, and Python's `True`/`False` is
 * lowered to the literal every supported runtime actually prints — papers mix
 * the two casings and an unlowered `False` can never match.
 */
export function normalizeStdinOutput(raw: string): string {
  const text = (raw ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return '';
  // "(empty)" / "empty" / "(nothing)" — the program prints nothing.
  if (/^\(?\s*(?:empty|nothing|none|no output)\s*\)?\.?$/i.test(text)) return '';
  const args = splitAssignments(text);
  const value = args
    ? args.map(a => formatValueForStdin(a.value)).join('\n')
    : formatValueSequence(text) ?? formatValueForStdin(text);
  return /^(true|false)$/i.test(value) ? value.toLowerCase() : value;
}

/**
 * "[1,2] [5,5] [8,10]" — several literals side by side (intervals printed one
 * per line). Returns null unless the WHOLE text is two or more literals.
 */
function formatValueSequence(text: string): string | null {
  const lines: string[] = [];
  let i = 0;
  let count = 0;
  while ((i = skipWs(text, i)) < text.length) {
    if (!CLOSERS[text[i]]) return null;
    const parsed = parseLiteral(text, i);
    if (!parsed) return null;
    lines.push(...literalToLines(parsed.node));
    count++;
    i = parsed.next;
    if (text[skipWs(text, i)] === ',') i = skipWs(text, i) + 1;
  }
  return count >= 2 ? lines.join('\n') : null;
}

// ─── Input Format–guided layout ──────────────────────────────────────────────
//
// A paper's sample reads like LeetCode — `nums = [1,3,5,6], target = 5` — but
// its Input Format says what the program actually reads:
//
//     Line 1: integer n (size of the array). Line 2: n space-separated
//     integers, the sorted array nums. Line 3: integer target.
//
// so the stdin must be "4\n1 3 5 6\n5", size line included. The format is read
// spec by spec ("Line 1:", "Next n lines:", "Final line:", "For each …:") and
// every value is placed where it says. When any spec can't be matched to the
// sample's arguments, null is returned and the plain conversion is used.

interface FormatArg { name: string; node: LiteralNode; used: boolean; sized: boolean }

const SPEC_MARKER =
  /((?:\bLine\s+\d+\s*:)|(?:\bLines\s+\d+\s+to\s+[^:]{1,20}:)|(?:\b(?:Next|Then)\s+[\w+]+\s+lines?\s*:)|(?:\b(?:Final|Last)\s+line\s*:)|(?:\bFor\s+each\s+[^:]{1,40}:))/i;

const SIZE_TOKEN = '[A-Za-z_]\\w*(?:\\s*[+-]\\s*1)?';
const TWO_INTS = new RegExp(`^(?:two|2)\\s+(?:space[-\\s]separated\\s+)?integers?\\s+(${SIZE_TOKEN})\\s+and\\s+(${SIZE_TOKEN})\\b`, 'i');
const ONE_INT = new RegExp(`^(?:an?\\s+)?(?:single\\s+)?(?:integer|int|long|number)\\s+(${SIZE_TOKEN})(?![\\w-])`, 'i');
const ONE_STR = /^(?:an?\s+)?(?:string|word|text)\s+([A-Za-z_]\w*)\b/i;
const ARRAY_LINE = new RegExp(`^(${SIZE_TOKEN})\\s+(?:space[-\\s]separated\\s+)?(?:distinct\\s+)?(?:integers?|numbers?|values?|strings?|words?|elements?)\\b`, 'i');

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text: string, name: string): boolean =>
  new RegExp(`(^|[^\\w])${escapeRe(name)}([^\\w]|$)`).test(text);

const flatRow = (node: LiteralNode): string =>
  node.kind === 'scalar' ? node.value : node.items.map(flatRow).join(' ');

export function normalizeStdinInputWithFormat(raw: string, inputFormat: string): string {
  const plain = normalizeStdinInput(raw);
  const format = (inputFormat ?? '').replace(/\s+/g, ' ').trim();
  if (!format || !/\bLine\s+1\s*:/i.test(format)) return plain;
  const text = (raw ?? '').replace(/\r\n?/g, '\n').trim();
  const assigns = splitAssignments(text);
  if (!assigns) return plain;

  const args: FormatArg[] = [];
  for (const a of assigns) {
    const v = a.value.trim().replace(/,+$/, '').trim();
    if (EMPTY_NOTE.test(v)) { args.push({ name: a.name.trim(), node: { kind: 'list', items: [] }, used: false, sized: false }); continue; }
    const parsed = parseLiteral(v, 0);
    if (!parsed || skipWs(v, parsed.next) < v.length) return plain;
    args.push({ name: a.name.trim(), node: parsed.node, used: false, sized: false });
  }

  const parts = format.split(SPEC_MARKER);
  const specs: { marker: string; text: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    specs.push({ marker: parts[i].trim(), text: (parts[i + 1] ?? '').trim().replace(/[.;]\s*$/, '') });
  }
  const laid = layoutFromSpecs(specs, args);
  // Every argument must have been placed somewhere, or the reading is wrong.
  if (laid === null || args.some(a => !a.used && !(a.sized && a.node.kind === 'list' && a.node.items.length === 0))) return plain;
  return laid;
}

function layoutFromSpecs(specs: { marker: string; text: string }[], args: FormatArg[]): string | null {
  const out: string[] = [];
  const byName = (name: string) => args.find(a => a.name === name);
  const lists = () => args.filter(a => a.node.kind === 'list');
  const named = (t: string, pred: (a: FormatArg) => boolean) =>
    [...args].sort((x, y) => y.name.length - x.name.length).find(a => pred(a) && mentions(t, a.name));
  const nextList = (pred: (a: FormatArg) => boolean) => lists().find(pred);
  const isNested = (a: FormatArg) => a.node.kind === 'list' && a.node.items.some(it => it.kind === 'list');

  // A count token: the value of a scalar argument of that name, else the
  // length of the list it sizes — named in the parenthesis when it is
  // ("size of nums1", "sizes of firstList and secondList"), else the next
  // list not yet sized.
  const resolveToken = (token: string, spec: string, sizeIndex: number, sizesInSpec = 1): string | null => {
    const base = token.replace(/\s/g, '').replace(/[+-]1$/, '');
    const arg = byName(base);
    if (arg && arg.node.kind === 'scalar') { arg.used = true; return arg.node.value; }
    const paren = spec.match(/\(([^)]*)\)/)?.[1] ?? '';
    const inParen = lists().filter(a => mentions(paren, a.name))
      .sort((x, y) => paren.indexOf(x.name) - paren.indexOf(y.name));
    // Trust the parenthesis only when it names every list this line sizes.
    const target = (inParen.length >= sizesInSpec ? inParen[sizeIndex] : undefined) ?? nextList(a => !a.sized);
    if (!target || target.node.kind !== 'list') return null;
    target.sized = true;
    return String(target.node.items.length);
  };

  for (const { marker, text } of specs) {
    if (/^(?:Lines\s+\d+\s+to|Next|Then)\b/i.test(marker)) {
      // Rows of a 2-D list, one per line (an empty list has no rows at all).
      const rowsOf = (a: FormatArg) => !a.used && (isNested(a) || (a.node.kind === 'list' && a.node.items.length === 0));
      const target = named(text, rowsOf) ?? nextList(rowsOf);
      if (!target || target.node.kind !== 'list') return null;
      target.used = true;
      out.push(...target.node.items.map(flatRow));
      continue;
    }
    if (/^For\s+each\b/i.test(marker)) {
      // A list of 2-D lists: each element's row count, then its rows.
      const target = nextList(a => !a.used && a.node.kind === 'list' && a.node.items.every(it => it.kind === 'list'));
      if (!target || target.node.kind !== 'list') return null;
      target.used = true;
      for (const el of target.node.items) {
        if (el.kind !== 'list') return null;
        out.push(String(el.items.length), ...el.items.map(flatRow));
      }
      continue;
    }

    const two = text.match(TWO_INTS);
    if (two) {
      let sizeIndex = 0;
      const vals: string[] = [];
      const isScalarArg = (tok: string) => byName(tok.replace(/\s/g, '').replace(/[+-]1$/, ''))?.node.kind === 'scalar';
      const sizes = [two[1], two[2]].filter(t => !isScalarArg(t)).length;
      for (const tok of [two[1], two[2]]) {
        const isArg = isScalarArg(tok);
        const v = resolveToken(tok, text, isArg ? 0 : sizeIndex, sizes);
        if (v === null) return null;
        if (!isArg) sizeIndex++;
        vals.push(v);
      }
      out.push(vals.join(' '));
      continue;
    }
    const arr = text.match(ARRAY_LINE);
    if (arr) {
      const target = named(text, a => a.node.kind === 'list' && !a.used) ?? nextList(a => !a.used && !isNested(a));
      if (!target) return null;
      target.used = true;
      out.push(flatRow(target.node));
      continue;
    }
    const one = text.match(ONE_INT);
    if (one) {
      const v = resolveToken(one[1], text, 0);
      if (v === null) return null;
      out.push(v);
      continue;
    }
    const str = text.match(ONE_STR);
    if (str) {
      const arg = byName(str[1]) ?? args.find(a => !a.used && a.node.kind === 'scalar');
      if (!arg || arg.node.kind !== 'scalar') return null;
      arg.used = true;
      out.push(arg.node.value);
      continue;
    }
    // "Final line: two integers, the new interval's start and end" — whatever
    // argument is named, else the next one not yet placed.
    const target = named(text, a => !a.used) ?? args.find(a => !a.used);
    if (!target) return null;
    target.used = true;
    out.push(...literalToLines(target.node));
  }
  return out.join('\n');
}
