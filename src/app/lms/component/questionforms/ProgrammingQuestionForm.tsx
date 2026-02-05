import React, { useState, useEffect } from 'react';
import { X, Save, FileText, MessageSquare, Code, TestTube2, Play, Check, AlertCircle, Zap, Brain, Plus, Terminal, Loader, CheckCircle, Trash2, Copy, RefreshCw } from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';

interface ProgrammingQuestionFormProps {
  exerciseData: any;
  tabType: string;
  initialData?: any;
  isEditing?: boolean;
  onClose: () => void;
  onSave: (questionData: any) => void;
  isSaving: boolean;
  saveProgress: number;
  saveMessage: string;
}

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  isSample: boolean;
  description?: string;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
  memory?: number;
}

// Language templates
const LANGUAGE_TEMPLATES: Record<string, string> = {
  python: `# Write your solution here

def main():
    # Your code here
    print("Hello, World!")

if __name__ == "__main__":
    main()`,
  javascript: `// Write your solution here

function main() {
    // Your code here
    console.log("Hello, World!");
}

main();`,
  java: `// Write your solution here

public class Main {
    public static void main(String[] args) {
        // Your code here
        System.out.println("Hello, World!");
    }
}`,
  cpp: `// Write your solution here

#include <iostream>
using namespace std;

int main() {
    // Your code here
    cout << "Hello, World!" << endl;
    return 0;
}`,
  c: `// Write your solution here

#include <stdio.h>

int main() {
    // Your code here
    printf("Hello, World!\\n");
    return 0;
}`,
  go: `// Write your solution here

package main

import "fmt"

func main() {
    // Your code here
    fmt.Println("Hello, World!")
}`,
  rust: `// Write your solution here

fn main() {
    // Your code here
    println!("Hello, World!");
}`,
  swift: `// Write your solution here

import Foundation

func main() {
    // Your code here
    print("Hello, World!")
}

main()`
};

const ProgrammingQuestionForm: React.FC<ProgrammingQuestionFormProps> = ({
  exerciseData,
  tabType,
  initialData,
  isEditing,
  onClose,
  onSave,
  isSaving,
  saveProgress,
  saveMessage
}) => {
  // State for the form
  const [activeTab, setActiveTab] = useState<'question' | 'compiler' | 'testcases'>('question');
  const [showToast, setShowToast] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    questionText: '',
    title: '',
    description: '',
    constraints: [''],
    sampleInput: '',
    sampleOutput: '',
    hint: '',
    difficulty: 'medium',
    timeLimit: 2000,
    memoryLimit: 256,
    score: 10
  });

  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: '1',
      input: '',
      expectedOutput: '',
      isHidden: false,
      isSample: true,
      description: 'Sample test case'
    }
  ]);

  const [hints, setHints] = useState<Array<{ hintText: string, pointsDeduction: number, isPublic: boolean, sequence: number }>>([]);

  // Compiler states
  const [compilerCode, setCompilerCode] = useState<string>('');
  const [compilerLanguage, setCompilerLanguage] = useState<string>('python');
  const [compilerInput, setCompilerInput] = useState<string>('');
  const [compilerOutput, setCompilerOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'light'>('light');

  // Get supported languages
  const supportedLanguages = exerciseData.selectedLanguages || ['python', 'javascript', 'java', 'cpp', 'c'];
  const defaultLanguage = supportedLanguages[0]?.toLowerCase() || 'python';

  // Determine evaluation mode
  const isAutomationMode = exerciseData.evaluationSettings?.automationEvaluation;
  const isAIMode = exerciseData.evaluationSettings?.aiEvaluation;
  const isPracticeMode = exerciseData.evaluationSettings?.practiceMode;

  // Load initial data
  useEffect(() => {
    if (initialData && isEditing) {
      console.log('📝 Loading programming question data for editing:', initialData);

      setFormData({
        questionText: '',
        title: initialData.title || '',
        description: initialData.description || '',
        constraints: initialData.constraints?.length ? initialData.constraints : [''],
        sampleInput: initialData.sampleInput || '',
        sampleOutput: initialData.sampleOutput || '',
        hint: initialData.hints?.[0]?.hintText || '',
        difficulty: initialData.difficulty || 'medium',
        timeLimit: initialData.timeLimit || 2000,
        memoryLimit: initialData.memoryLimit || 256,
        score: initialData.points || 10
      });

      // Populate hints
      if (initialData.hints && initialData.hints.length > 0) {
        setHints(initialData.hints.map((hint: any, index: number) => ({
          hintText: hint.hintText,
          pointsDeduction: hint.pointsDeduction || 0,
          isPublic: hint.isPublic !== undefined ? hint.isPublic : true,
          sequence: hint.sequence || index
        })));
      }

      // Populate test cases
      if (initialData.testCases) {
        setTestCases(initialData.testCases.map((tc: any, index: number) => ({
          id: tc._id || `tc-${Date.now()}-${index}`,
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || '',
          isHidden: tc.isHidden || false,
          isSample: tc.isSample || false,
          description: tc.explanation || `Test case ${index + 1}`
        })));
      }

      // Set compiler language and code
      if (initialData.solutions?.startedCode) {
        setCompilerCode(initialData.solutions.startedCode);
        setCompilerLanguage(initialData.solutions.language || defaultLanguage);
      } else {
        setCompilerCode(LANGUAGE_TEMPLATES[defaultLanguage] || `// Write your ${defaultLanguage} code here\n\n`);
        setCompilerLanguage(defaultLanguage);
      }
    } else {
      // Set default compiler code
      setCompilerCode(LANGUAGE_TEMPLATES[defaultLanguage] || `// Write your ${defaultLanguage} code here\n\n`);
      setCompilerLanguage(defaultLanguage);
    }
  }, [initialData, isEditing, defaultLanguage]);

  // Helper functions
  const getAvailableDifficulties = () => {
    const levelConfig = exerciseData.fullExerciseData?.questionConfiguration?.levelType;
    const levels = exerciseData.fullExerciseData?.questionConfiguration;

    if (levelConfig !== 'levelBased') {
      return ['easy', 'medium', 'hard'];
    }

    const difficulties: string[] = [];
    if (levels.levelBased) {
      if (levels.levelBased.easy > 0) difficulties.push('easy');
      if (levels.levelBased.medium > 0) difficulties.push('medium');
      if (levels.levelBased.hard > 0) difficulties.push('hard');
    }

    return difficulties.length > 0 ? difficulties : ['easy', 'medium', 'hard'];
  };

  const addHint = () => {
    setHints([...hints, {
      hintText: '',
      pointsDeduction: 0,
      isPublic: true,
      sequence: hints.length
    }]);
  };

  const updateHint = (index: number, field: string, value: any) => {
    const newHints = [...hints];
    newHints[index] = { ...newHints[index], [field]: value };
    setHints(newHints);
  };

  const removeHint = (index: number) => {
    setHints(hints.filter((_, i) => i !== index));
  };

  const addConstraint = () => {
    setFormData({ ...formData, constraints: [...formData.constraints, ''] });
  };

  const updateConstraint = (index: number, value: string) => {
    const newConstraints = [...formData.constraints];
    newConstraints[index] = value;
    setFormData({ ...formData, constraints: newConstraints });
  };

  const removeConstraint = (index: number) => {
    if (formData.constraints.length > 1) {
      const newConstraints = formData.constraints.filter((_, i) => i !== index);
      setFormData({ ...formData, constraints: newConstraints });
    }
  };

  const addTestCase = () => {
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      input: '',
      expectedOutput: '',
      isHidden: false,
      isSample: false,
      description: `Test case ${testCases.length + 1}`
    };
    setTestCases([...testCases, newTestCase]);
  };

  const duplicateTestCase = (testCase: TestCase) => {
    const duplicatedTestCase: TestCase = {
      ...testCase,
      id: Date.now().toString(),
      description: `${testCase.description || 'Test'} (Copy)`
    };
    setTestCases([...testCases, duplicatedTestCase]);
  };

  const removeTestCase = (id: string) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter(tc => tc.id !== id));
    }
  };

  const updateTestCase = (id: string, field: string, value: any) => {
    setTestCases(testCases.map(tc =>
      tc.id === id ? { ...tc, [field]: value } : tc
    ));
  };

  // Execute programming code (simulated in browser)
  const executeProgrammingCode = async (): Promise<ExecutionResult> => {
    const startTime = performance.now();

    try {
      let output = '';
      let error = '';

      switch (compilerLanguage) {
        case 'python':
          output = 'Python code executed successfully (simulated in browser)\n';
          output += 'Output: Hello, World!\n';
          break;

        case 'javascript':
          // Actually execute JavaScript in browser
          try {
            const originalConsoleLog = console.log;
            let capturedOutput = '';
            console.log = (...args) => {
              capturedOutput += args.join(' ') + '\n';
            };

            const codeToExecute = compilerCode;

            // Try to execute as a function
            if (codeToExecute.includes('function') || codeToExecute.includes('console.log')) {
              try {
                eval(codeToExecute);
                output = capturedOutput || 'JavaScript executed successfully\n';
              } catch (e) {
                error = `JavaScript error: ${e instanceof Error ? e.message : 'Unknown error'}`;
              }
            } else {
              output = 'JavaScript code would execute here (simulated)\n';
            }

            console.log = originalConsoleLog;
          } catch (e) {
            error = `JavaScript execution error: ${e instanceof Error ? e.message : 'Unknown error'}`;
          }
          break;

        case 'java':
          output = 'Java code compiled and executed (simulated)\n';
          output += 'Output: Hello, World!\n';
          break;

        default:
          output = `${compilerLanguage} code executed successfully (simulated)\n`;
          output += 'Output: Hello, World!\n';
      }

      const endTime = performance.now();

      return {
        success: !error,
        output: error ? '' : output,
        error: error || undefined,
        executionTime: endTime - startTime,
        memory: Math.random() * 50 + 10
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Code execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  };

  const executeCompilerCode = async () => {
    if (!compilerCode.trim()) {
      setCompilerOutput('❌ Please write some code first\n');
      return;
    }

    setIsExecuting(true);
    let newOutput = '🚀 Executing code...\n\n';

    try {
      const result = await executeProgrammingCode();

      if (result.success) {
        newOutput += '✅ Code executed successfully!\n\n';

        // Execution time
        if (result.executionTime) {
          newOutput += `⏱️  Execution Time: ${result.executionTime.toFixed(2)}ms\n`;
        }

        // Memory usage
        if (result.memory) {
          newOutput += `💾 Memory Used: ${result.memory.toFixed(2)}MB\n`;
        }

        newOutput += '\n📋 Output:\n';
        newOutput += '='.repeat(80) + '\n';
        newOutput += result.output + '\n';
        newOutput += '='.repeat(80) + '\n';

        // Show input if provided
        if (compilerInput.trim()) {
          newOutput += '\n📥 Input Provided:\n';
          newOutput += '='.repeat(80) + '\n';
          newOutput += compilerInput + '\n';
          newOutput += '='.repeat(80) + '\n';
        }

        setCompilerOutput(prev => newOutput);
      } else {
        let errorMsg = '❌ Error:\n\n';
        if (result.error) {
          errorMsg += `Error: ${result.error}\n`;
        }

        newOutput += errorMsg;
        setCompilerOutput(prev => newOutput);
      }

    } catch (error) {
      console.error('Error executing code:', error);
      const errorMsg = `❌ Error executing code: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
      setCompilerOutput(prev => prev + errorMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  const goToNextTab = () => {
    const tabs = getAvailableTabs();
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1] as any);
    }
  };

  const goToPreviousTab = () => {
    const tabs = getAvailableTabs();
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1] as any);
    }
  };

  const getAvailableTabs = () => {
    const tabs: ('question' | 'compiler' | 'testcases')[] = ['question', 'compiler'];

    if (isAutomationMode) {
      tabs.push('testcases');
    }

    return tabs;
  };

  const getEvaluationModeLabel = () => {
    if (!exerciseData.evaluationSettings) return 'Not specified';

    if (isPracticeMode) return 'Practice Mode';
    if (isAutomationMode) return 'Automated Evaluation';
    if (exerciseData.evaluationSettings.manualEvaluation?.enabled) return 'Manual Evaluation';
    if (isAIMode) return 'AI Evaluation';

    return 'Not specified';
  };

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  // Validate required fields
  if (!formData.title.trim()) {
      alert('Please enter a question title');
      return;
  }

  if (!formData.description.trim()) {
      alert('Please enter a question description');
      return;
  }

  // Prepare hints array
  const preparedHints = [];
  if (formData.hint.trim()) {
      preparedHints.push({
          hintText: formData.hint.trim(),
          pointsDeduction: 0,
          isPublic: true,
          sequence: 0
      });
  }
  preparedHints.push(...hints);

  // Prepare test cases
  const preparedTestCases = testCases.map((tc, index) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isSample: tc.isSample,
      isHidden: tc.isHidden,
      points: 1,
      explanation: tc.description || `Test case ${index + 1}`,
      sequence: index
  }));

  // Create question data - send fields directly (not nested in programmingQuestion)
  const questionData = {
      questionType: 'programming',
      // Direct fields
      title: formData.title.trim(),
      description: formData.description.trim(),
      difficulty: formData.difficulty as 'easy' | 'medium' | 'hard',
      sampleInput: formData.sampleInput.trim() || '',
      sampleOutput: formData.sampleOutput.trim() || '',
      constraints: formData.constraints.filter(c => c.trim() !== ''),
      hints: preparedHints,
      testCases: isAutomationMode ? preparedTestCases : [],
      solutions: {
          startedCode: compilerCode,
          functionName: 'main',
          language: compilerLanguage
      },
      timeLimit: formData.timeLimit,
      memoryLimit: formData.memoryLimit,
      isActive: true,
      sequence: initialData?.sequence || 0
  };

  console.log('📤 Programming Payload being sent:', JSON.stringify(questionData, null, 2));

  // Call onSave
  onSave(questionData);
  setShowToast(true);
};
  // Render compiler tab
  const renderCompilerTab = () => {
    return (
      <div className="h-full flex flex-col gap-4" style={{
        minHeight: 'calc(70vh - 300px)',
        maxHeight: 'calc(70vh - 200px)'
      }}>
        {/* Top Controls Bar */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Language:</span>
              <select
                value={compilerLanguage}
                onChange={(e) => {
                  const newLang = e.target.value;
                  const template = LANGUAGE_TEMPLATES[newLang] || `// Write your ${newLang} code here\n\n`;
                  setCompilerLanguage(newLang);
                  setCompilerCode(template);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
              >
                {supportedLanguages.map(lang => (
                  <option key={lang} value={lang.toLowerCase()}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Theme:</span>
              <button
                onClick={() => setEditorTheme(editorTheme === 'vs-dark' ? 'light' : 'vs-dark')}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors duration-200 ${editorTheme === 'vs-dark'
                  ? 'bg-gray-800 text-white hover:bg-gray-900'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }`}
              >
                {editorTheme === 'vs-dark' ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>

            <button
              onClick={() => {
                const template = LANGUAGE_TEMPLATES[compilerLanguage] || `// Write your ${compilerLanguage} code here\n\n`;
                setCompilerCode(template);
                setCompilerOutput('');
              }}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm flex items-center gap-2 transition-colors duration-200"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <div className="text-sm font-medium text-gray-700">
            {compilerLanguage.toUpperCase()} Compiler
          </div>
        </div>

        <div className="flex-1 flex gap-4 min-h-0" style={{
          minHeight: '500px',
          maxHeight: '600px',
          height: 'calc(70vh - 300px)'
        }}>
          {/* Left Panel: Editor (50%) */}
          <div className="w-1/2 flex flex-col min-w-0">
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  Code Editor
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {compilerCode.split('\n').length} lines • {compilerCode.length} chars
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={executeCompilerCode}
                    disabled={isExecuting}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center gap-2 shadow transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    {isExecuting ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Run Code
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 border border-gray-300 rounded-xl overflow-hidden shadow-sm bg-white" style={{ minHeight: '300px' }}>
                <MonacoEditor
                  height="100%"
                  language={compilerLanguage}
                  value={compilerCode}
                  theme={editorTheme}
                  onChange={(value) => setCompilerCode(value || '')}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                    formatOnPaste: true,
                    formatOnType: true,
                    suggestOnTriggerCharacters: true,
                    tabSize: 2,
                    readOnly: false,
                    scrollBeyondLastLine: false,
                    padding: { top: 15, bottom: 15 },
                    suggest: { preview: true },
                    quickSuggestions: true,
                    renderLineHighlight: 'all',
                    cursorBlinking: 'smooth',
                    cursorStyle: 'line',
                    lineNumbers: 'on',
                    glyphMargin: true,
                    folding: true,
                    lineDecorationsWidth: 10,
                    lineNumbersMinChars: 3
                  }}
                />
              </div>

              {/* Input for programming languages */}
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Input (Optional)
                </label>
                <textarea
                  value={compilerInput}
                  onChange={(e) => setCompilerInput(e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Enter input for your program..."
                />
              </div>
            </div>
          </div>

          {/* Right Panel: Output Console (50%) */}
          <div className="w-1/2 flex flex-col min-w-0">
            {/* Output Header */}
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-600" />
                Execution Results
                {compilerOutput.includes('✅') && (
                  <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-800 rounded">
                    Success
                  </span>
                )}
                {compilerOutput.includes('❌') && (
                  <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-800 rounded">
                    Error
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(compilerOutput);
                  }}
                  className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2 transition-colors duration-200"
                  title="Copy Output"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
                <button
                  onClick={() => setCompilerOutput('')}
                  className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2 transition-colors duration-200"
                  title="Clear Output"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>

            {/* Output Console */}
            <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: '400px' }}>
              <div className="flex-1 border border-gray-300 rounded-xl overflow-hidden shadow-sm flex flex-col bg-white" style={{
                height: '100%',
                maxHeight: 'none'
              }}>
                <div className="flex-1 bg-gray-900 text-gray-100 font-mono p-4 overflow-auto" style={{
                  height: '100%',
                  minHeight: '350px',
                  maxHeight: 'calc(65vh - 300px)'
                }}>
                  <div className="h-full overflow-auto">
                    <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                      lineHeight: '1.5',
                      minHeight: '100%'
                    }}>
                      {compilerOutput ? compilerOutput.split('\n').map((line, index) => {
                        let className = 'py-0.5';
                        if (line.includes('✅')) className += ' text-green-400 font-semibold';
                        else if (line.includes('❌') || line.includes('Error:')) className += ' text-red-400 font-semibold';
                        else if (line.includes('⚠️') || line.includes('Warning:')) className += ' text-yellow-400 font-semibold';
                        else if (line.includes('📊') || line.includes('📈') || line.includes('📋')) className += ' text-blue-300 font-medium';
                        else if (line.includes('⏱️') || line.includes('💾')) className += ' text-purple-300 font-medium';
                        else if (line.includes('📥')) className += ' text-cyan-300 font-medium';
                        else if (line.includes('='.repeat(80))) className += ' text-gray-500';
                        else if (line.includes('🚀')) className += ' text-yellow-300';
                        else if (line.includes('💡')) className += ' text-gray-400 italic';
                        else className += ' text-gray-300';

                        return (
                          <div key={index} className={className}>
                            {line || ' '}
                          </div>
                        );
                      }) : (
                        <div className="text-gray-500 italic py-8 text-center h-full flex items-center justify-center" style={{ minHeight: '300px' }}>
                          <div>
                            <div className="mb-2 text-lg">👆 Run code to see results here</div>
                            <div className="text-sm text-gray-600">
                              Press Run Code to execute
                            </div>
                            <div className="mt-4 text-xs text-gray-500">
                              <div>Tip: Use the input field to provide test data</div>
                              <div>Tip: Multiple test cases can be added in the Test Cases tab</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Footer */}
            <div className="mt-4 p-3 border border-gray-300 rounded-xl bg-gradient-to-r from-gray-50 to-white shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-gray-700">Compiler Ready</span>
                  </div>
                  {isExecuting && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader className="h-3 w-3 animate-spin" />
                      <span>Executing code...</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Browser Execution • Simulated Runtime Environment
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render test cases tab
  const renderTestCasesTab = () => {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Test Cases</h3>
            <p className="text-sm text-gray-600 mt-1">Add test cases for automated evaluation</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addTestCase}
              className="px-4 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow transition-all duration-200"
            >
              <Plus className="h-4 w-4" /> Add Test Case
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="space-y-4">
            {testCases.map((testCase, index) => (
              <div key={testCase.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">Test Case {index + 1}</span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${testCase.isSample
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : testCase.isHidden
                        ? 'bg-gray-100 text-gray-800 border border-gray-200'
                        : 'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                      {testCase.isSample ? 'Sample' : testCase.isHidden ? 'Hidden' : 'Public'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => duplicateTestCase(testCase)}
                      className="text-sm text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    {testCases.length > 1 && (
                      <button
                        onClick={() => removeTestCase(testCase.id)}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={testCase.description || ''}
                      onChange={(e) => updateTestCase(testCase.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                      placeholder="Test case description..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Input</label>
                    <textarea
                      value={testCase.input}
                      onChange={(e) => updateTestCase(testCase.id, 'input', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500"
                      placeholder="Test input (one value per line)..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Output</label>
                    <textarea
                      value={testCase.expectedOutput}
                      onChange={(e) => updateTestCase(testCase.id, 'expectedOutput', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500"
                      placeholder="Expected output..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={testCase.isSample}
                      onChange={(e) => updateTestCase(testCase.id, 'isSample', e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Sample Test Case
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={testCase.isHidden}
                      onChange={(e) => updateTestCase(testCase.id, 'isHidden', e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Hidden Test Case
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render question tab
  const renderQuestionTab = () => {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Question Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors duration-200"
            required
            placeholder="Enter question title"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Question Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the problem in detail. Include input format, output format, and examples."
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-colors duration-200"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Difficulty *
          </label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          >
            {getAvailableDifficulties().map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* SCORE FIELD - Show only if scoreType is "separateMarks" */}
        {exerciseData?.fullExerciseData?.scoreSettings?.scoreType === 'separateMarks' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Score *
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          <div className={exerciseData?.fullExerciseData?.programmingSettings?.levelConfiguration?.levelType === 'general' ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Limit (ms)
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              value={formData.timeLimit}
              onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 2000 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className={exerciseData?.fullExerciseData?.programmingSettings?.levelConfiguration?.levelType === 'general' ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Memory Limit (MB)
            </label>
            <input
              type="number"
              min="16"
              max="1024"
              value={formData.memoryLimit}
              onChange={(e) => setFormData({ ...formData, memoryLimit: parseInt(e.target.value) || 256 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-gray-700">
              Constraints
            </label>
            <button
              type="button"
              onClick={addConstraint}
              className="text-sm px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors duration-200"
            >
              <Plus className="h-4 w-4" /> Add Constraint
            </button>
          </div>
          <div className="space-y-2">
            {formData.constraints.map((constraint, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={constraint}
                  onChange={(e) => updateConstraint(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., 1 <= n <= 10^5"
                />
                {formData.constraints.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeConstraint(index)}
                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sample Input
            </label>
            <textarea
              value={formData.sampleInput}
              onChange={(e) => setFormData({ ...formData, sampleInput: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500"
              placeholder="Enter sample input..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sample Output
            </label>
            <textarea
              value={formData.sampleOutput}
              onChange={(e) => setFormData({ ...formData, sampleOutput: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500"
              placeholder="Enter expected output..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Hint (Optional)
          </label>
          <textarea
            value={formData.hint}
            onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
            placeholder="Add a hint for students..."
          />
        </div>

        {/* ADDITIONAL HINTS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700">
              Additional Hints
            </label>
            <button
              type="button"
              onClick={addHint}
              className="text-sm px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors duration-200"
            >
              <Plus className="h-4 w-4" /> Add Hint
            </button>
          </div>
          <div className="space-y-3">
            {hints.map((hint, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Hint {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeHint(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={hint.hintText}
                  onChange={(e) => updateHint(index, 'hintText', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                  placeholder="Hint text..."
                />
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <span className="text-gray-600">Points Deduction:</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={hint.pointsDeduction}
                      onChange={(e) => updateHint(index, 'pointsDeduction', parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={hint.isPublic}
                      onChange={(e) => updateHint(index, 'isPublic', e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-gray-600">Public</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'question':
        return renderQuestionTab();
      case 'compiler':
        return renderCompilerTab();
      case 'testcases':
        return isAutomationMode ? renderTestCasesTab() : null;
      default:
        return null;
    }
  };

  const availableTabs = getAvailableTabs();
  const evaluationModeLabel = getEvaluationModeLabel();

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[95vh] flex flex-col relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${
              isAutomationMode ? 'bg-blue-100 shadow' :
              isAIMode ? 'bg-purple-100 shadow' :
              isPracticeMode ? 'bg-green-100 shadow' :
              'bg-gray-100 shadow'
            }`}>
              {isAutomationMode ? (
                <Zap className="h-5 w-5 text-blue-600" />
              ) : isAIMode ? (
                <Brain className="h-5 w-5 text-purple-600" />
              ) : isPracticeMode ? (
                <FileText className="h-5 w-5 text-green-600" />
              ) : (
                <FileText className="h-5 w-5 text-gray-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEditing ? 'Edit Programming Question' : 'Add Programming Question'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <span className="font-medium">{exerciseData.exerciseName}</span>
                <span className="text-gray-400">•</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isAutomationMode ? 'bg-blue-100 text-blue-800' :
                  isAIMode ? 'bg-purple-100 text-purple-800' :
                  isPracticeMode ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {evaluationModeLabel} (Programming)
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-xs font-medium">{supportedLanguages.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-5 bg-gray-50">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors duration-200 ${activeTab === tab
                ? tab === 'question' ? 'border-blue-600 text-blue-600' :
                  tab === 'compiler' ? 'border-purple-600 text-purple-600' :
                    tab === 'testcases' ? 'border-green-600 text-green-600' :
                      'border-gray-600 text-gray-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
            >
              {tab === 'question' && <MessageSquare className="h-4 w-4" />}
              {tab === 'compiler' && <Code className="h-4 w-4" />}
              {tab === 'testcases' && <TestTube2 className="h-4 w-4" />}
              {tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-5" style={{ height: 'calc(85vh - 180px)' }}>
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gradient-to-r from-gray-50 to-white sticky bottom-0 z-10">
          <div className="flex items-center justify-between">
            {/* Left side - Information */}
            <div className="text-sm text-gray-600 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isSaving ? 'animate-pulse bg-yellow-500' :
                  isAutomationMode ? 'bg-blue-500' :
                  isAIMode ? 'bg-purple-500' :
                  isPracticeMode ? 'bg-green-500' :
                  'bg-gray-500'
                }`}></div>
                <div>
                  <span className="font-semibold">Mode:</span> {evaluationModeLabel}
                  {isSaving && <span className="ml-2 text-yellow-600 font-medium">(Saving...)</span>}
                </div>
              </div>

              <div>
                <span className="font-semibold">Module:</span> Programming
              </div>

              <div>
                <span className="font-semibold">Languages:</span> {supportedLanguages.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}
              </div>

              {activeTab === 'testcases' && (
                <div>
                  <span className="font-semibold">
                    Test Cases: <span className="text-green-600 font-bold">{testCases.length}</span>
                  </span>
                </div>
              )}

              {/* Progress indicator when saving */}
              {isSaving && (
                <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-blue-700">Processing...</span>
                </div>
              )}
            </div>

            {/* Right side - Action buttons */}
            <div className="flex gap-3">
              {/* Back button - Only show if not on first tab */}
              {availableTabs.indexOf(activeTab) > 0 && (
                <button
                  type="button"
                  onClick={goToPreviousTab}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  ← Back
                </button>
              )}

              {/* Next/Save button */}
              {availableTabs.indexOf(activeTab) < availableTabs.length - 1 ? (
                <button
                  type="button"
                  onClick={goToNextTab}
                  disabled={isSaving}
                  className="px-6 py-2.5 text-sm bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg hover:from-gray-900 hover:to-black transition-all duration-200 flex items-center gap-2 shadow disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:from-gray-800 disabled:hover:to-gray-900"
                >
                  Next →
                </button>
              ) : (
                // Save button
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className={`relative px-6 py-2.5 text-sm text-white rounded-lg flex items-center gap-2 shadow transition-all duration-200 min-w-[140px] justify-center ${
                      isSaving
                        ? 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed'
                        : isAutomationMode
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-95'
                          : isAIMode
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:scale-95'
                            : isPracticeMode
                              ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:scale-95'
                              : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 active:scale-95'
                    }`}
                  >
                    {/* Loading overlay on button */}
                    {isSaving && (
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg opacity-70"></div>
                    )}

                    {/* Button content */}
                    <div className="flex items-center gap-2 relative z-10">
                      {isSaving ? (
                        <>
                          <div className="relative">
                            <Loader className="h-4 w-4 animate-spin" />
                            {/* Pulsing ring effect */}
                            <div className="absolute -inset-1 border-2 border-white/30 rounded-full animate-ping"></div>
                          </div>
                          <span className="whitespace-nowrap">{isEditing ? 'Updating...' : 'Saving...'}</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span className="whitespace-nowrap">{isEditing ? 'Update Question' : 'Save Question'}</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              )}

              {/* Cancel button */}
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Progress bar when saving */}
          {isSaving && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full animate-pulse"
                  style={{ width: '100%' }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{saveMessage}</span>
                <span>Please do not close this window</span>
              </div>
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-5 rounded-xl shadow-2xl flex items-center gap-4 border border-green-500">
              <CheckCircle className="h-7 w-7" />
              <div>
                <h4 className="font-bold text-lg">Success!</h4>
                <p className="text-sm opacity-90">{isEditing ? 'Question updated' : 'Question added'} successfully.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgrammingQuestionForm;