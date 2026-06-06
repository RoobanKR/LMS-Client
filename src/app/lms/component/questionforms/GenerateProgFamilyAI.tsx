// ────────────────────────────────────────────────────────────────────────────────
//  Unified "Generate with AI" modal for the programming-family question forms.
//  One component, three modes — `formType`:
//     "programming" → core programming questions (title, description, constraints,
//                     test cases, sample I/O, hints, time/memory limits)
//     "frontend"    → frontend questions (title, description, starter HTML/CSS/JS
//                     files, expected behaviour, hints)
//     "database"    → database/SQL questions (title, description, schema CREATE
//                     statements, seed data INSERT statements, expected query
//                     result, sample query)
//
//  The output of each mode is shaped to match the corresponding question form's
//  `handleBankSelectedQuestions` consumer, so the modal can hand off generated
//  questions through the SAME path the question bank uses — no new injection
//  code needed inside each form.
// ────────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Loader2, AlertCircle, Wand2, RefreshCw, ChevronRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { callGeminiJSON, GeminiError } from './geminiClient';

export type ProgFamilyType = 'programming' | 'frontend' | 'database';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GeneratedQuestion {
  /** Raw shape — each form's `handleBankSelectedQuestions` will map this to its
   *  own internal flow shape via the same mapper it uses for bank questions. */
  questionType: ProgFamilyType;
  title: string;
  description: string;
  difficulty: Difficulty;
  // programming / database
  constraints?: string[];
  testCases?: Array<{ input: string; expectedOutput: string; isSample?: boolean; isHidden?: boolean; points?: number; explanation?: string }>;
  sampleInput?: string;
  sampleOutput?: string;
  hints?: Array<{ hintText: string; pointsDeduction: number; isPublic: boolean; sequence: number }>;
  timeLimit?: number;
  memoryLimit?: number;
  // frontend
  files?: Array<{ filename: string; content: string; language: string; isEntryPoint?: boolean }>;
  // database
  schemaSql?: string;
  seedSql?: string;
  expectedQuery?: string;
  expectedResult?: string;
  databaseType?: string;
}

interface Props {
  formType: ProgFamilyType;
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (questions: GeneratedQuestion[]) => void;
  /** Restrict count if there's a quota — caller passes "remaining open slots". */
  maxCount?: number;
  /** Default difficulty (e.g. the difficulty the user is currently filling). */
  initialDifficulty?: Difficulty;
  /** Language hint for programming / "Available languages" context for frontend / database vendor for database. */
  contextHint?: string;
}

const TYPE_META: Record<ProgFamilyType, { title: string; subtitle: string; icon: React.ReactNode }> = {
  programming: { title: 'Generate Programming Question with AI',  subtitle: 'Coding problem with constraints + test cases', icon: <Wand2 size={18} /> },
  frontend:    { title: 'Generate Frontend Question with AI',     subtitle: 'HTML / CSS / JS task with starter files',     icon: <Wand2 size={18} /> },
  database:    { title: 'Generate Database Question with AI',     subtitle: 'SQL task with schema + seed + expected query', icon: <Wand2 size={18} /> },
};

const buildPrompt = (formType: ProgFamilyType, topic: string, difficulty: Difficulty, count: number, contextHint?: string): string => {
  const safeCount = Math.max(1, Math.min(count, 10));
  const base = `You are an expert programming-question author. Generate exactly ${safeCount} ${difficulty} ${formType} question${safeCount === 1 ? '' : 's'} on the topic: "${topic}". Return ONLY a strict JSON array (no markdown, no commentary).`;

  if (formType === 'programming') {
    return `${base}
${contextHint ? `Target language(s): ${contextHint}.\n` : ''}Each item must match this exact shape:
{
  "title": "short imperative title (<=80 chars)",
  "description": "one or two paragraph problem statement; explain input/output format clearly",
  "difficulty": "${difficulty}",
  "constraints": ["bulletable constraint string", "another"],
  "sampleInput":  "stdin string for the sample test case",
  "sampleOutput": "stdout string for the sample test case",
  "testCases": [
    { "input": "stdin", "expectedOutput": "stdout", "isSample": true,  "isHidden": false, "points": 1, "explanation": "Sample" },
    { "input": "stdin", "expectedOutput": "stdout", "isSample": false, "isHidden": true,  "points": 2, "explanation": "Edge case" }
  ],
  "hints": [{ "hintText": "useful nudge", "pointsDeduction": 0, "isPublic": true, "sequence": 0 }],
  "timeLimit": 2000,
  "memoryLimit": 256
}
Use 2-4 test cases per question (at least 1 sample, at least 1 hidden). Keep inputs/outputs realistic and parseable.`;
  }

  if (formType === 'frontend') {
    return `${base}
Each item must match this exact shape:
{
  "title": "short imperative title (<=80 chars)",
  "description": "one or two paragraphs describing the visible / interactive behaviour the student must implement (DOM structure, styling, JS behaviour). Mention what is starter vs what the student must add.",
  "difficulty": "${difficulty}",
  "files": [
    { "filename": "index.html", "language": "html", "isEntryPoint": true,  "content": "<!DOCTYPE html><html>...starter HTML the student edits..." },
    { "filename": "styles.css", "language": "css",  "isEntryPoint": false, "content": "/* starter CSS, can be empty or scaffolded */" },
    { "filename": "script.js",  "language": "javascript", "isEntryPoint": false, "content": "// starter JS, mostly empty for the student" }
  ],
  "hints": [{ "hintText": "useful nudge", "pointsDeduction": 0, "isPublic": true, "sequence": 0 }]
}
The starter files must be minimal and runnable — students complete them.`;
  }

  // database
  return `${base}
${contextHint ? `Database engine: ${contextHint}.\n` : ''}Each item must match this exact shape:
{
  "title": "short imperative title (<=80 chars)",
  "description": "one or two paragraphs explaining what query the student must write and what columns / ordering are expected",
  "difficulty": "${difficulty}",
  "databaseType": "${contextHint || 'mysql'}",
  "schemaSql":  "CREATE TABLE ... statements (one or more), no trailing semicolons inside JSON escape weirdness",
  "seedSql":    "INSERT INTO ... realistic seed rows for the schema",
  "expectedQuery":  "the canonical SQL query the student should write",
  "expectedResult": "stringified expected result rows (CSV or pipe-separated)",
  "testCases": [
    { "input": "", "expectedOutput": "stringified rows", "isSample": true,  "isHidden": false, "points": 1, "explanation": "Sample run" },
    { "input": "", "expectedOutput": "stringified rows", "isSample": false, "isHidden": true,  "points": 2, "explanation": "Hidden check" }
  ],
  "hints": [{ "hintText": "useful nudge", "pointsDeduction": 0, "isPublic": true, "sequence": 0 }]
}`;
};

const GenerateProgFamilyAI: React.FC<Props> = ({
  formType, isOpen, onClose, onGenerated,
  maxCount, initialDifficulty = 'medium', contextHint,
}) => {
  const meta = TYPE_META[formType];
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [count, setCount] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GeneratedQuestion[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDifficulty(initialDifficulty);
      setError(null);
      setPreview(null);
    }
  }, [isOpen, initialDifficulty]);

  useEffect(() => {
    if (maxCount && maxCount > 0 && count > maxCount) setCount(maxCount);
  }, [maxCount, count]);

  if (!isOpen) return null;

  const effectiveMax = maxCount && maxCount > 0 ? Math.min(maxCount, 10) : 10;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast('Enter a topic first (e.g. "two-pointer arrays", "responsive nav with flexbox", "JOIN aggregates").', { icon: 'ℹ️' });
      return;
    }
    setError(null);
    setLoading(true);
    setPreview(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const prompt = buildPrompt(formType, topic.trim(), difficulty, count, contextHint);
      const data = await callGeminiJSON<any>({ prompt, signal: abortRef.current.signal, temperature: 0.8 });
      const arr: any[] = Array.isArray(data) ? data : (Array.isArray(data?.questions) ? data.questions : []);
      if (!arr.length) {
        setError('The AI returned no questions. Try a more specific topic.');
        return;
      }
      // Warn when Gemini returns fewer items than asked — happens sometimes for
      // niche topics where the model can only produce one clear question. We
      // still proceed with whatever we got so the user isn't blocked.
      if (arr.length < count) {
        toast(`Asked Gemini for ${count} questions but only ${arr.length} came back. You can re-generate to try for more, or refine your topic.`, { icon: '⚠️', duration: 6000, style: { maxWidth: 480 } });
      }
      const normalized: GeneratedQuestion[] = arr.slice(0, count).map((q): GeneratedQuestion => ({
        questionType: formType,
        title: String(q.title || '').slice(0, 200) || 'Untitled',
        description: String(q.description || ''),
        difficulty: (['easy','medium','hard'].includes((q.difficulty || '').toLowerCase()) ? (q.difficulty as Difficulty) : difficulty),
        constraints: Array.isArray(q.constraints) ? q.constraints.map(String) : [],
        testCases: Array.isArray(q.testCases) ? q.testCases.map((tc: any, i: number) => ({
          input: String(tc.input || ''),
          expectedOutput: String(tc.expectedOutput || ''),
          isSample: !!tc.isSample,
          isHidden: !!tc.isHidden,
          points: Number(tc.points || 1),
          explanation: String(tc.explanation || `Test case ${i + 1}`),
        })) : [],
        sampleInput: q.sampleInput,
        sampleOutput: q.sampleOutput,
        hints: Array.isArray(q.hints) ? q.hints.map((h: any, i: number) => ({
          hintText: String(h.hintText || h.text || ''),
          pointsDeduction: Number(h.pointsDeduction || 0),
          isPublic: h.isPublic !== false,
          sequence: Number(h.sequence ?? i),
        })) : [],
        timeLimit: q.timeLimit || 2000,
        memoryLimit: q.memoryLimit || 256,
        files: Array.isArray(q.files) ? q.files.map((f: any) => ({
          filename: String(f.filename || 'index.html'),
          content: String(f.content || ''),
          language: String(f.language || 'html').toLowerCase(),
          isEntryPoint: !!f.isEntryPoint,
        })) : undefined,
        schemaSql: q.schemaSql,
        seedSql: q.seedSql,
        expectedQuery: q.expectedQuery,
        expectedResult: q.expectedResult,
        databaseType: q.databaseType,
      }));
      setPreview(normalized);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      const msg = e instanceof GeminiError
        ? `${e.message}${e.status ? ` (HTTP ${e.status})` : ''}`
        : (e?.message || 'AI generation failed.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (!preview || preview.length === 0) return;
    onGenerated(preview);
    onClose();
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)' }}
    >
      <div
        onClick={stop}
        style={{
          width: 'min(760px, 96vw)', maxHeight: 'min(720px, 92vh)',
          background: '#ffffff', borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(242,119,87,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F27757' }}>
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{meta.title}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{meta.subtitle}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
          {/* Topic */}
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Topic <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            autoFocus
            value={topic}
            onChange={e => setTopic(e.target.value)}
            disabled={loading}
            placeholder={
              formType === 'programming' ? 'e.g. binary search, dynamic programming, two pointers'
              : formType === 'frontend' ? 'e.g. responsive navbar with flexbox, modal dialog with focus trap'
              : 'e.g. JOIN with aggregation, window functions, GROUP BY HAVING'
            }
            style={{ width: '100%', height: 38, padding: '0 12px', fontSize: 13, borderRadius: 8, border: '1.5px solid #e5e7eb', outline: 'none', fontFamily: 'inherit' }}
          />

          {/* Difficulty + count */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Difficulty</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['easy','medium','hard'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => !loading && setDifficulty(d)}
                    style={{
                      flex: 1, height: 32, fontSize: 12, fontWeight: 700, borderRadius: 7,
                      border: `1.5px solid ${difficulty === d ? '#F27757' : '#e5e7eb'}`,
                      background: difficulty === d ? 'rgba(242,119,87,0.1)' : '#ffffff',
                      color: difficulty === d ? '#F27757' : '#6b7280',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                How many? <span style={{ color: '#9ca3af', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(max {effectiveMax})</span>
              </label>
              <input
                type="number"
                min={1}
                max={effectiveMax}
                value={count}
                disabled={loading}
                onChange={e => {
                  const v = parseInt(e.target.value || '1', 10);
                  if (!isNaN(v)) setCount(Math.max(1, Math.min(effectiveMax, v)));
                }}
                style={{ width: '100%', height: 32, padding: '0 10px', fontSize: 13, borderRadius: 7, border: '1.5px solid #e5e7eb', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Context hint display */}
          {contextHint && (
            <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6, background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: 11, color: '#075985' }}>
              Context: {contextHint}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle size={14} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>{error}</div>
            </div>
          )}

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Preview ({preview.length} question{preview.length === 1 ? '' : 's'})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {preview.map((q, i) => (
                  <div key={i} style={{ padding: 12, borderRadius: 9, border: '1px solid #e5e7eb', background: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                        <span style={{ color: '#9ca3af' }}>#{i + 1}</span> {q.title}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: q.difficulty === 'easy' ? '#dcfce7' : q.difficulty === 'hard' ? '#fee2e2' : '#fef3c7', color: q.difficulty === 'easy' ? '#15803d' : q.difficulty === 'hard' ? '#b91c1c' : '#92400e', textTransform: 'uppercase' }}>
                        {q.difficulty}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: '#4b5563', lineHeight: 1.45, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {q.description}
                    </div>
                    {/* Per-type quick badges */}
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {formType === 'programming' && (
                        <>
                          {q.constraints && q.constraints.length > 0 && (
                            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 6, background: '#eef2ff', color: '#4338ca' }}>{q.constraints.length} constraint{q.constraints.length === 1 ? '' : 's'}</span>
                          )}
                          {q.testCases && q.testCases.length > 0 && (
                            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 6, background: '#ecfeff', color: '#0e7490' }}>{q.testCases.length} test case{q.testCases.length === 1 ? '' : 's'}</span>
                          )}
                        </>
                      )}
                      {formType === 'frontend' && q.files && q.files.length > 0 && (
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 6, background: '#f0fdf4', color: '#15803d' }}>{q.files.length} file{q.files.length === 1 ? '' : 's'}: {q.files.map(f => f.filename).join(', ')}</span>
                      )}
                      {formType === 'database' && (
                        <>
                          {q.schemaSql && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 6, background: '#eef2ff', color: '#4338ca' }}>schema</span>}
                          {q.seedSql && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 6, background: '#ecfeff', color: '#0e7490' }}>seed data</span>}
                          {q.expectedQuery && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 6, background: '#f5f3ff', color: '#6d28d9' }}>expected query</span>}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#ffffff' }}>
          {preview && preview.length > 0 ? (
            <>
              <button
                onClick={() => setPreview(null)}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 5, height: 36, padding: '0 14px', fontSize: 12, fontWeight: 600, borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#ffffff', color: '#374151', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                <RefreshCw size={12} /> Re-generate
              </button>
              <button
                onClick={handleUse}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', fontSize: 12, fontWeight: 700, borderRadius: 7, border: 'none', background: '#16a34a', color: '#ffffff', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(22,163,74,0.25)' }}
              >
                <CheckCircle size={13} /> Use these {preview.length} question{preview.length === 1 ? '' : 's'} <ChevronRight size={12} />
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', fontSize: 12, fontWeight: 700, borderRadius: 7, border: 'none', background: loading || !topic.trim() ? '#9ca3af' : '#F27757', color: '#ffffff', cursor: loading || !topic.trim() ? 'not-allowed' : 'pointer', boxShadow: loading || !topic.trim() ? 'none' : '0 2px 8px rgba(242,119,87,0.30)' }}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {loading ? 'Generating…' : 'Generate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateProgFamilyAI;
