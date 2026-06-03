import React, { useState } from 'react';
import {
  Plus, Trash2, Terminal, Layout, Database,
  ChevronDown, Bold, Italic, Underline, Code2, Image,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type CategoryType = 'core' | 'frontend' | 'database';

export interface Hint {
  hintText: string;
  isPublic: boolean;
  sequence: number;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  isSample: boolean;
  isHidden: boolean;
  explanation?: string;
}

export interface Solution {
  startedCode?: string;
  functionName?: string;
  language?: string;
}

export interface ProgrammingData {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sampleInput: string;
  sampleOutput: string;
  score: number;
  constraints: string[];
  hints: Hint[];
  testCases: TestCase[];
  solutions?: Solution;
  category?: CategoryType;
  sampleQuery?: string;
  expectedResult?: string;
}

interface ProgrammingFieldsProps {
  data: ProgrammingData;
  onChange: (field: string, value: any) => void;
}

// ─── Rich Text Toolbar ────────────────────────────────────────────────────────
const RichToolbar: React.FC<{ onFormat?: (fmt: string) => void }> = ({ onFormat }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '2px',
    padding: '6px 10px', borderBottom: '1px solid #e5e7eb', background: '#fff',
  }}>
    {[
      { icon: <Bold size={13} />, cmd: 'bold' },
      { icon: <Italic size={13} />, cmd: 'italic' },
      { icon: <Underline size={13} />, cmd: 'underline' },
    ].map(({ icon, cmd }) => (
      <button key={cmd} type="button" onClick={() => onFormat?.(cmd)}
        style={{ padding: '3px 6px', border: 'none', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center' }}
        onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
      >{icon}</button>
    ))}
    <div style={{ width: 1, height: 16, background: '#d1d5db', margin: '0 4px' }} />
    {[
      { icon: <Code2 size={13} />, cmd: 'code' },
      { icon: <Image size={13} />, cmd: 'image' },
    ].map(({ icon, cmd }) => (
      <button key={cmd} type="button" onClick={() => onFormat?.(cmd)}
        style={{ padding: '3px 6px', border: 'none', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center' }}
        onMouseOver={e => (e.currentTarget.style.background = '#f3f4f6')}
        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
      >{icon}</button>
    ))}
  </div>
);

// ─── Field Label ──────────────────────────────────────────────────────────────
const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label style={{
    display: 'block', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.06em', color: '#111827',
    marginBottom: 8, textTransform: 'uppercase',
  }}>
    {children}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
  </label>
);

// ─── Divider ──────────────────────────────────────────────────────────────────
const Divider = () => (
  <div style={{ borderTop: '2px solid #f97316', margin: '20px 0', opacity: 0.25 }} />
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ProgrammingFields: React.FC<ProgrammingFieldsProps> = ({ data, onChange }) => {
  const [newConstraint, setNewConstraint] = useState('');
  const [newFrontendConstraint, setNewFrontendConstraint] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>(data.category || 'core');

  // First test case always open by default
  const [openTestCases, setOpenTestCases] = useState<boolean[]>(() => {
    const len = data.testCases?.length ?? 0;
    if (len === 0) return [true];
    return data.testCases.map((_, i) => i === 0);
  });

  const categories = [
    { value: 'core' as CategoryType, label: 'Core Programming', icon: <Terminal size={14} /> },
    { value: 'frontend' as CategoryType, label: 'Frontend', icon: <Layout size={14} /> },
    { value: 'database' as CategoryType, label: 'Database', icon: <Database size={14} /> },
  ];

  // ── Shared Styles ──
  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    border: 'none', borderBottom: '2px solid #f97316',
    padding: '8px 2px', fontSize: 14, color: '#111827',
    background: 'transparent', outline: 'none', fontFamily: 'inherit',
  };

  const boxInput: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '10px 14px', fontSize: 14, color: '#111827',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  const richBox: React.CSSProperties = {
    border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden',
  };

  // ── Helpers ──
  const handleCategoryChange = (cat: CategoryType) => {
    setSelectedCategory(cat);
    onChange('category', cat);
  };

const addConstraint = (isFrontend = false) => {
  const val = isFrontend ? newFrontendConstraint : newConstraint;
  const field = isFrontend ? 'constraints' : 'constraints';

    const existing = isFrontend ? data.constraints || [] : data.constraints || [];
    if (val.trim()) {
      onChange(field, [...existing, val.trim()]);
      isFrontend ? setNewFrontendConstraint('') : setNewConstraint('');
    }
  };

  const removeConstraint = (index: number, isFrontend = false) => {
    const field = isFrontend ? 'constraints' : 'constraints';
    const list = [...(isFrontend ? data.constraints || [] : data.constraints || [])];
    list.splice(index, 1);
    onChange(field, list);
  };

  const handleAddTestCase = () => {
    onChange('testCases', [
      ...(data.testCases || []),
      { input: '', expectedOutput: '', isSample: false, isHidden: false, explanation: '' },
    ]);
    setOpenTestCases(prev => [...prev, false]);
  };

  const handleTestCaseChange = (index: number, field: keyof TestCase, value: any) => {
    const updated = [...(data.testCases || [])];
    updated[index] = { ...updated[index], [field]: value };
    onChange('testCases', updated);
  };

  const handleRemoveTestCase = (index: number) => {
    const updated = [...(data.testCases || [])];
    updated.splice(index, 1);
    onChange('testCases', updated);
    setOpenTestCases(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTestCase = (index: number) => {
    setOpenTestCases(prev => prev.map((isOpen, i) => i === index ? !isOpen : isOpen));
  };

  const handleAddHint = () => {
    const hintText = prompt('Enter hint text:');
    if (hintText?.trim()) {
      onChange('hints', [
        ...(data.hints || []),
        { hintText: hintText.trim(), isPublic: false, sequence: (data.hints?.length || 0) + 1 },
      ]);
    }
  };

  const handleRemoveHint = (index: number) => {
    const updated = [...(data.hints || [])];
    updated.splice(index, 1);
    onChange('hints', updated);
  };

  // ── Constraints ──
  const renderConstraints = (constraints: string[], isFrontend: boolean) => {
    const newVal = isFrontend ? newFrontendConstraint : newConstraint;
    const setVal = isFrontend ? setNewFrontendConstraint : setNewConstraint;
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <FieldLabel>Constraints</FieldLabel>
          <button type="button" onClick={() => addConstraint(isFrontend)} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 14px', borderRadius: 20,
            border: '1.5px solid #f97316', background: '#fff',
            color: '#f97316', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={12} /> Add
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <input
            type="text" value={newVal}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addConstraint(isFrontend)}
            placeholder="Type constraint and press Enter or Add"
            style={{ ...boxInput, marginBottom: 0 }}
            onFocus={e => (e.currentTarget.style.borderColor = '#f97316')}
            onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
          />
        </div>
        {constraints.map((c, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', marginBottom: 6,
            background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 6,
          }}>
            <span style={{ color: '#f97316', fontWeight: 700, fontSize: 13 }}>•</span>
            <input
              type="text" value={c}
              onChange={e => {
                const updated = [...constraints];
                updated[i] = e.target.value;
                onChange(isFrontend ? 'constraints' : 'constraints', updated);
              }}
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: '#374151', outline: 'none' }}
            />
            <button type="button" onClick={() => removeConstraint(i, isFrontend)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}
              onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseOut={e => (e.currentTarget.style.color = '#9ca3af')}
            ><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
    );
  };

  // ── Test Cases ──
  const renderTestCases = () => (
    <div style={{ marginBottom: 24 }}>
      <FieldLabel required>Test Cases</FieldLabel>
      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
        Test Case 1 is the sample. Add hidden cases for grading.
      </p>

      {(data.testCases || []).map((tc, i) => (
        <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 16px', background: '#f9fafb',
            borderBottom: openTestCases[i] ? '1px solid #e5e7eb' : 'none',
            cursor: 'pointer',
          }} onClick={() => toggleTestCase(i)}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
              Test Case {i + 1}
              {tc.isSample && <span style={{ marginLeft: 8, color: '#3b82f6', fontWeight: 500, fontSize: 11 }}>Sample</span>}
              {tc.isHidden && <span style={{ marginLeft: 6, color: '#6b7280', fontWeight: 500, fontSize: 11 }}>Hidden</span>}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} onClick={e => e.stopPropagation()}>
              {[
                { label: 'Sample', field: 'isSample' as keyof TestCase, val: tc.isSample },
                { label: 'Hidden', field: 'isHidden' as keyof TestCase, val: tc.isHidden },
              ].map(({ label, field, val }) => (
                <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!val}
                    onChange={e => handleTestCaseChange(i, field, e.target.checked)}
                    style={{ accentColor: '#f97316' }}
                  />
                  {label}
                </label>
              ))}
              <button type="button" onClick={() => handleRemoveTestCase(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}
                onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseOut={e => (e.currentTarget.style.color = '#9ca3af')}
              ><Trash2 size={14} /></button>
              <ChevronDown size={14} style={{
                transform: openTestCases[i] ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s', color: '#9ca3af',
              }} />
            </div>
          </div>

          {/* Body */}
          {openTestCases[i] && (
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Input
                </label>
                <textarea value={tc.input}
                  onChange={e => handleTestCaseChange(i, 'input', e.target.value)}
                  rows={3}
                  style={{ ...boxInput, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                  placeholder="stdin..."
                  onFocus={e => (e.currentTarget.style.borderColor = '#f97316')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Expected Output
                </label>
                <textarea value={tc.expectedOutput}
                  onChange={e => handleTestCaseChange(i, 'expectedOutput', e.target.value)}
                  rows={3}
                  style={{ ...boxInput, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                  placeholder="expected stdout..."
                  onFocus={e => (e.currentTarget.style.borderColor = '#f97316')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Explanation (Optional)
                </label>
                <input type="text" value={tc.explanation || ''}
                  onChange={e => handleTestCaseChange(i, 'explanation', e.target.value)}
                  style={boxInput} placeholder="Explain this test case..."
                  onFocus={e => (e.currentTarget.style.borderColor = '#f97316')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Bottom Add Button */}
      <button type="button" onClick={handleAddTestCase} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        width: '100%', padding: '10px',
        borderRadius: 8, marginTop: 4,
        border: '1.5px dashed #93c5fd', background: '#eff6ff',
        color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
        onMouseOver={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#3b82f6'; }}
        onMouseOut={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
      >
        <Plus size={14} /> Add Test Case
      </button>
    </div>
  );

  // ── Hints ──
  const renderHints = () => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <FieldLabel>Hints (Optional)</FieldLabel>
        <button type="button" onClick={handleAddHint} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '5px 14px', borderRadius: 20,
          border: '1.5px solid #10b981', background: '#fff',
          color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={12} /> Add Hint
        </button>
      </div>
      {(data.hints || []).map((hint, i) => (
        <div key={i} style={{
          padding: '12px 14px', marginBottom: 8,
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#065f46' }}>Hint #{hint.sequence || i + 1}</span>
            <button type="button" onClick={() => handleRemoveHint(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseOut={e => (e.currentTarget.style.color = '#9ca3af')}
            ><Trash2 size={13} /></button>
          </div>
          <p style={{ fontSize: 13, color: '#374151', margin: '0 0 8px' }}>{hint.hintText}</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: '#6b7280' }}>
            <input type="checkbox" checked={hint.isPublic}
              onChange={e => {
                const updated = [...(data.hints || [])];
                updated[i] = { ...updated[i], isPublic: e.target.checked };
                onChange('hints', updated);
              }}
              style={{ accentColor: '#10b981' }}
            />
            Public
          </label>
        </div>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Geist', 'Inter', sans-serif", color: '#111827' }}>

      {/* Category Selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {categories.map(cat => {
          const active = selectedCategory === cat.value;
          return (
            <button key={cat.value} type="button"
              onClick={() => handleCategoryChange(cat.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                border: active ? '2px solid #f97316' : '2px solid #e5e7eb',
                background: active ? '#fff7ed' : '#fff',
                color: active ? '#f97316' : '#6b7280',
                fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
              }}
            >
              {cat.icon} {cat.label}
            </button>
          );
        })}
      </div>

      {/* Difficulty */}
      <div style={{ marginBottom: 24 }}>
        <FieldLabel required>Difficulty</FieldLabel>
        <div style={{ position: 'relative', maxWidth: '200px' }}>
          <select
            value={data.difficulty || 'medium'}
            onChange={e => onChange('difficulty', e.target.value)}
            style={{ ...boxInput, appearance: 'none', paddingRight: 32, fontWeight: 500, cursor: 'pointer' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#f97316')}
            onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }} />
        </div>
      </div>

      {/* Problem Title */}
      <div style={{ marginBottom: 24 }}>
        <FieldLabel required>Problem Title</FieldLabel>
        <input
          type="text" value={data.title || ''}
          onChange={e => onChange('title', e.target.value)}
          placeholder={
            selectedCategory === 'database' ? 'Enter database question title...' :
            selectedCategory === 'frontend' ? 'Enter frontend challenge title...' :
            'Type your problem title here...'
          }
          style={inputBase}
        />
      </div>

      {/* Problem Description */}
      <div style={{ marginBottom: 24 }}>
        <FieldLabel required>Problem Description</FieldLabel>
        <div style={richBox}>
          <RichToolbar />
          <textarea
            value={data.description || ''}
            onChange={e => onChange('description', e.target.value)}
            rows={5}
            placeholder={
              selectedCategory === 'database'
                ? 'Describe the database problem. Include table schemas, sample data, and expected query results.'
                : selectedCategory === 'frontend'
                ? 'Describe the frontend challenge. Include UI requirements, behaviour, and acceptance criteria.'
                : 'Describe the problem clearly. Include input/output format and examples.'
            }
            style={{
              width: '100%', boxSizing: 'border-box',
              border: 'none', padding: '12px 14px',
              fontSize: 14, color: '#374151',
              background: '#fff', outline: 'none',
              resize: 'vertical', fontFamily: 'inherit', minHeight: 120,
            }}
          />
          <div style={{ borderTop: '1px solid #f3f4f6', padding: '6px 14px', background: '#fafafa' }} />
        </div>
      </div>

      <Divider />

      {/* ── Core Programming ── */}
      {selectedCategory === 'core' && (
        <>
          {renderConstraints(data.constraints || [], false)}
          <Divider />
          {renderTestCases()}
        </>
      )}

      {/* ── Frontend ── */}
{selectedCategory === 'frontend' && (
  <>
    {renderConstraints(data.constraints || [], true)}
  </>
)}

      {/* ── Database ── */}
      {selectedCategory === 'database' && (
        <>
          {/* Sample Query */}
           <div style={{ marginBottom: 24 }}>
      <FieldLabel required>Sample Query</FieldLabel>
      <textarea
        value={data.sampleQuery || ''}
        onChange={e => onChange('sampleQuery', e.target.value)}
              rows={5}
              placeholder={`-- Example:\nSELECT employee_id, name, department\nFROM employees\nWHERE salary > 50000;`}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1px solid #374151', borderRadius: 8,
                padding: '12px 14px', fontSize: 13,
                fontFamily: 'monospace', color: '#e5e7eb',
                background: '#1e293b', outline: 'none',
                resize: 'vertical', minHeight: 120,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#f97316')}
              onBlur={e => (e.currentTarget.style.borderColor = '#374151')}
            />
          </div>

          {/* Expected Result */}
 <div style={{ marginBottom: 24 }}>
      <FieldLabel required>Expected Result</FieldLabel>
      <div style={richBox}>
        <RichToolbar />
        <textarea
          value={data.expectedResult || ''}
          onChange={e => onChange('expectedResult', e.target.value)}
                rows={4}
                placeholder="Describe the expected result. Use table format or plain text."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: 'none', padding: '12px 14px',
                  fontSize: 14, color: '#374151',
                  background: '#fff', outline: 'none',
                  resize: 'vertical', fontFamily: 'inherit',
                }}
              />
              <div style={{ borderTop: '1px solid #f3f4f6', padding: '6px', background: '#fafafa' }} />
            </div>
          </div>

          <Divider />
          {renderConstraints(data.constraints || [], false)}
        </>
      )}

      <Divider />

      {/* Hints — all categories */}
      {renderHints()}

    </div>
  );
};

export default ProgrammingFields;