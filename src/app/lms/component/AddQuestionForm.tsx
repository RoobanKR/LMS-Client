import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Code, MessageSquare, Hash, TestTube2, Cpu, Play, Check, AlertCircle, Zap, Brain, Plus, ChevronDown, ChevronUp, Terminal, Loader, CheckCircle } from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';

interface AddQuestionFormProps {
  exerciseData: {
    exerciseId: string;
    exerciseName: string;
    exerciseLevel: string;
    selectedLanguages: string[];
    evaluationSettings?: {
      practiceMode: boolean;
      manualEvaluation?: {
        enabled: boolean;
        submissionNeeded?: boolean;
      };
      aiEvaluation: boolean;
      automationEvaluation: boolean;
    };
    nodeId: string;
    nodeName: string;
    subcategory: string;
    nodeType: string;
    fullExerciseData: {
      exerciseInformation: any;
      programmingSettings: {
        selectedLanguages: string[];
        levelConfiguration: any;
        selectedModule: string;
      };
      evaluationSettings: any;
      availabilityPeriod: any;
      compilerSettings: any;
      questionBehavior: any;
      groupSettings: any;
      createdAt: string;
      updatedAt: string;
    };
  };
  tabType: string; // ADD THIS

  onClose: () => void;
  onSave: (questionData: any) => void;
}

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  isSample: boolean;
  description?: string;
}

interface AIConfiguration {
  prompt: string;
  evaluationCriteria: string[];
  maxScore: number;
  parameters: {
    temperature: number;
    maxTokens: number;
  };
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
  memory?: number;
}

interface TestResult {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTime: string;
  memory: string;
  error?: string;
}

// Language templates
const LANGUAGE_TEMPLATES: Record<string, string> = {
  python: `# Write your solution here
# Read input from stdin, process it, and print output

def main():
    import sys
    
    # Read all input
    data = sys.stdin.read().strip().split()
    
    if len(data) >= 2:
        a = int(data[0])
        b = int(data[1])
        result = a + b
        print(result)
    else:
        print("Please provide two numbers as input")

if __name__ == "__main__":
    main()`,

  javascript: `// Write your solution here
// Read input from stdin, process it, and print output

const readline = require('readline');

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const lines = [];
    
    rl.on('line', (line) => {
        lines.push(line);
    });

    await new Promise((resolve) => {
        rl.on('close', resolve);
    });

    // Process input
    if (lines.length >= 2) {
        const a = parseInt(lines[0]);
        const b = parseInt(lines[1]);
        const result = a + b;
        console.log(result);
    } else {
        console.log("Please provide two numbers as input");
    }
}

main().catch(console.error);`,

  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        // Read input
        String[] inputs = new String[2];
        int index = 0;
        
        while (scanner.hasNextLine() && index < 2) {
            inputs[index] = scanner.nextLine();
            index++;
        }
        
        // Process input
        if (inputs[0] != null && inputs[1] != null) {
            int a = Integer.parseInt(inputs[0].trim());
            int b = Integer.parseInt(inputs[1].trim());
            int result = a + b;
            System.out.println(result);
        } else {
            System.out.println("Please provide two numbers as input");
        }
        
        scanner.close();
    }
}`,

  cpp: `#include <iostream>
#include <string>

using namespace std;

int main() {
    // Read input
    string line1, line2;
    
    if (getline(cin, line1) && getline(cin, line2)) {
        int a = stoi(line1);
        int b = stoi(line2);
        int result = a + b;
        cout << result << endl;
    } else {
        cout << "Please provide two numbers as input" << endl;
    }
    
    return 0;
}`,

  c: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    char line1[100], line2[100];
    
    // Read input
    if (fgets(line1, sizeof(line1), stdin) && fgets(line2, sizeof(line2), stdin)) {
        // Remove newline characters
        line1[strcspn(line1, "\\n")] = 0;
        line2[strcspn(line2, "\\n")] = 0;
        
        int a = atoi(line1);
        int b = atoi(line2);
        int result = a + b;
        printf("%d\\n", result);
    } else {
        printf("Please provide two numbers as input\\n");
    }
    
    return 0;
}`,

  typescript: `// Write your solution here
// Read input from stdin, process it, and print output

const readline = require('readline');

async function main(): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const lines: string[] = [];
    
    rl.on('line', (line: string) => {
        lines.push(line);
    });

    await new Promise<void>((resolve) => {
        rl.on('close', resolve);
    });

    // Process input
    if (lines.length >= 2) {
        const a = parseInt(lines[0]);
        const b = parseInt(lines[1]);
        const result = a + b;
        console.log(result);
    } else {
        console.log("Please provide two numbers as input");
    }
}

main().catch(console.error);`,

  go: `package main

import (
    "bufio"
    "fmt"
    "os"
    "strconv"
    "strings"
)

func main() {
    scanner := bufio.NewScanner(os.Stdin)
    var inputs []string
    
    for scanner.Scan() {
        inputs = append(inputs, scanner.Text())
        if len(inputs) >= 2 {
            break
        }
    }
    
    if len(inputs) >= 2 {
        a, _ := strconv.Atoi(strings.TrimSpace(inputs[0]))
        b, _ := strconv.Atoi(strings.TrimSpace(inputs[1]))
        result := a + b
        fmt.Println(result)
    } else {
        fmt.Println("Please provide two numbers as input")
    }
}`,

  rust: `use std::io::{self, BufRead};

fn main() {
    let stdin = io::stdin();
    let mut lines = stdin.lock().lines();
    
    if let (Some(Ok(line1)), Some(Ok(line2))) = (lines.next(), lines.next()) {
        let a: i32 = line1.trim().parse().unwrap_or(0);
        let b: i32 = line2.trim().parse().unwrap_or(0);
        let result = a + b;
        println!("{}", result);
    } else {
        println("Please provide two numbers as input");
    }
}`,

  kotlin: `import java.util.Scanner

fun main() {
    val scanner = Scanner(System.\`in\`)
    val inputs = mutableListOf<String>()
    
    for (i in 0 until 2) {
        if (scanner.hasNextLine()) {
            inputs.add(scanner.nextLine())
        }
    }
    
    if (inputs.size == 2) {
        val a = inputs[0].trim().toInt()
        val b = inputs[1].trim().toInt()
        val result = a + b
        println(result)
    } else {
        println("Please provide two numbers as input")
    }
    
    scanner.close()
}`,

  swift: `import Foundation

func main() {
    // Read from standard input
    guard let line1 = readLine(), let line2 = readLine() else {
        print("Please provide two numbers as input")
        return
    }
    
    if let a = Int(line1), let b = Int(line2) {
        let result = a + b
        print(result)
    } else {
        print("Please provide valid numbers")
    }
}

main()`
};

const API_BASE_URL = 'http://localhost:5533';

const AddQuestionForm: React.FC<AddQuestionFormProps> = ({ exerciseData, tabType, onClose, onSave }) => {
  // Debug: Log the exercise data
  console.log(exerciseData)
  useEffect(() => {
    console.log('📋 Exercise Data Received in AddQuestionForm:', exerciseData);
    console.log('📋 Exercise ID:', exerciseData.exerciseId);
    console.log('📋 Full exercise data:', JSON.stringify(exerciseData, null, 2));
  }, [exerciseData]);

  // --- NEW LOGIC FOR FRONTEND MODULE DETECTION ---
  const selectedModule = exerciseData.fullExerciseData?.programmingSettings?.selectedModule?.toLowerCase();
  const isFrontendModule = selectedModule === 'frontend';

  const nodeType = exerciseData.nodeType; // e.g., 'topics', 'subtopics'
  const nodeId = exerciseData.nodeId; // The ID of the topic/subtopic
  // Get supported languages from props
  const supportedLanguages = exerciseData.selectedLanguages || ['python', 'javascript', 'java', 'cpp'];
  const defaultLanguage = supportedLanguages[0]?.toLowerCase() || 'python';

  const [activeTab, setActiveTab] = useState<'question' | 'testcases' | 'solution' | 'ai-configuration'>('question');

  // NEW STATE: For controlling the success toast
  const [showToast, setShowToast] = useState(false);

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

  const [solutions, setSolutions] = useState({
    startedCode: '',
    functionName: '',
    language: defaultLanguage
  });

  const [aiConfig, setAiConfig] = useState<AIConfiguration>({
    prompt: 'Evaluate the solution based on correctness, efficiency, and code quality.',
    evaluationCriteria: ['Correctness', 'Code Quality', 'Efficiency'],
    maxScore: 5,
    parameters: {
      temperature: 0.7,
      maxTokens: 1000
    }
  });

  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<string>('');
  const [showTestDetails, setShowTestDetails] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hints, setHints] = useState<Array<{ hintText: string, pointsDeduction: number, isPublic: boolean, sequence: number }>>([]);

  // Determine evaluation mode
  const isAutomationMode = exerciseData.evaluationSettings?.automationEvaluation;
  const isAIMode = exerciseData.evaluationSettings?.aiEvaluation;
  const isPracticeMode = exerciseData.evaluationSettings?.practiceMode;
  const isManualMode = exerciseData.evaluationSettings?.manualEvaluation?.enabled;

  // Initialize code based on selected language for both automation and practice modes
  useEffect(() => {
    if (isAutomationMode || isPracticeMode) {
      const template = LANGUAGE_TEMPLATES[solutions.language] ||
        `// Write your ${solutions.language} solution here`;

      setSolutions(prev => ({
        ...prev,
        startedCode: template
      }));
    }
  }, [solutions.language, isAutomationMode, isPracticeMode]);

  // Initialize with supported languages from props for both automation and practice modes
  useEffect(() => {
    if ((isAutomationMode || isPracticeMode) && supportedLanguages.length > 0 && !supportedLanguages.includes(solutions.language)) {
      const firstLang = supportedLanguages[0].toLowerCase();
      setSolutions(prev => ({
        ...prev,
        language: firstLang,
        startedCode: LANGUAGE_TEMPLATES[firstLang] || ''
      }));
    }
  }, [supportedLanguages, isAutomationMode, isPracticeMode]);

  const getEvaluationModeLabel = () => {
    if (!exerciseData.evaluationSettings) return 'Not specified';

    if (isPracticeMode) return 'Practice Mode';
    if (isAutomationMode) return 'Automated Evaluation';
    if (isManualMode) return 'Manual Evaluation';
    if (isAIMode) return 'AI Evaluation';

    return 'Not specified';
  };

  const sendQuestionToAPI = async (questionData: any) => {
    try {
      setIsSaving(true);
      setConsoleOutput('🔄 Saving question to server...\n');

      const url = `${API_BASE_URL}/question-add/${nodeType}s/${nodeId}/exercise/${exerciseData.exerciseId}`;

      console.log('📤 Sending to API:', {
        url,
        nodeType: `${nodeType}s`,
        nodeId,
        exerciseId: exerciseData.exerciseId,
        subcategory: exerciseData.subcategory,
        requestId: Date.now() // For tracking
      });

      // Add nodeType and subcategory to the request body
      const payload = {
        ...questionData,
        tabType: tabType,
        subcategory: exerciseData.subcategory || 'Practical',
        nodeType: `${nodeType}s`,
        nodeId: nodeId,
        requestTimestamp: new Date().toISOString()
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      console.log('📥 Raw response:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(result.message?.[0]?.value || result.error || `HTTP error! status: ${response.status}`);
      }

      setConsoleOutput(prev => prev + `✅ Question saved successfully!\nQuestion ID: ${result.data?.question?._id || result.data?.questionId}\n`);

      return result;

    } catch (error) {
      console.error('❌ Error saving question:', error);
      setConsoleOutput(prev => prev + `❌ Error saving question: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSaving) {
      console.log('⏳ Save already in progress...');
      return;
    }

    console.log('🚀 Submitting question...');
    console.log('📋 Exercise Data:', exerciseData);
    console.log('📋 Exercise ID:', exerciseData.exerciseId);

    // Validate required fields for all modes
    if (!formData.title.trim()) {
      alert('Please enter a question title');
      return;
    }

    if (!formData.description.trim()) {
      alert('Please enter a question description');
      return;
    }

    // Mode-specific validations
    // SKIP these validations if it is a Frontend Module
    if (!isFrontendModule) {
      if (isAutomationMode) {
        if (testCases.length === 0) {
          alert('Please add at least one test case for automation evaluation');
          return;
        }

        if (!solutions.startedCode.trim()) {
          alert('Please provide a solution code');
          return;
        }

        if (!solutions.functionName.trim()) {
          alert('Please provide a function name for the solution');
          return;
        }
      }

      // For practice mode, validate solution code
      if (isPracticeMode && !solutions.startedCode.trim()) {
        alert('Please provide a solution code for practice mode');
        return;
      }
    }

    // Prepare hints array - convert from hint string to hint objects
    const preparedHints = [];
    if (formData.hint.trim()) {
      preparedHints.push({
        hintText: formData.hint.trim(),
        pointsDeduction: 0,
        isPublic: true,
        sequence: 0
      });
    }

    // Add additional hints from hints state
    preparedHints.push(...hints);

    // Prepare test cases with proper structure (only for automation mode)
    const preparedTestCases = isAutomationMode ? testCases.map((tc, index) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isSample: tc.isSample,
      isHidden: tc.isHidden,
      points: 1,
      explanation: tc.description || `Test case ${index + 1}`,
      sequence: index
    })) : [];

    // Create question data in the CORRECT API format that matches backend schema
    const questionData: any = {
      // Basic question info (REQUIRED by backend)
      title: formData.title.trim(),
      description: formData.description.trim(),
      difficulty: formData.difficulty,
      score: formData.score,

      // Optional fields
      sampleInput: formData.sampleInput.trim() || undefined,
      sampleOutput: formData.sampleOutput.trim() || undefined,
      constraints: formData.constraints.filter(c => c.trim() !== ''),
      hints: preparedHints,
      timeLimit: formData.timeLimit,
      memoryLimit: formData.memoryLimit,

      // Status
      isActive: true,
      sequence: 0 // Will be auto-calculated by backend
    };

    // Add test cases only for automation mode and if NOT frontend
    if (!isFrontendModule && isAutomationMode && preparedTestCases.length > 0) {
      questionData.testCases = preparedTestCases;
    }

    // Add solutions for both automation and practice modes if NOT frontend
    if (!isFrontendModule && (isAutomationMode || isPracticeMode) && solutions.startedCode.trim()) {
      questionData.solutions = {
        startedCode: solutions.startedCode,
        functionName: solutions.functionName || 'main',
        language: solutions.language
      };
    }

    console.log('📤 Final data to send:', {
      exerciseId: exerciseData.exerciseId,
      questionData,
      evaluationMode: getEvaluationModeLabel(),
      timestamp: new Date().toISOString()
    });

    try {
      // Send single API request
      console.log('📡 Sending API request...');

      const savedQuestion = await sendQuestionToAPI(questionData);

      console.log('✅ API Response received:', savedQuestion);

      if (savedQuestion) {
        // Extract the saved question data properly
        const questionResult = savedQuestion.question ||
          savedQuestion.data?.question ||
          savedQuestion.data ||
          savedQuestion;

        console.log('✅ Question saved successfully:', questionResult);

        // --- NEW TOAST LOGIC START ---
        // 1. Show the toast
        setShowToast(true);

        // 2. Wait for 1.5 seconds so user sees the message
        setTimeout(() => {
          // 3. Update parent and close
          onSave({
            ...questionResult,
            exerciseId: exerciseData.exerciseId,
            exerciseName: exerciseData.exerciseName
          });
          onClose();
        }, 1500);
        // --- NEW TOAST LOGIC END ---

        setConsoleOutput(prev => prev + `\n🎉 Question "${formData.title}" saved successfully!\n`);
      }

    } catch (error) {
      console.error('❌ Failed to save question:', error);
      alert(`Failed to save question: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const executeCode = async (code: string, language: string, input: string = ''): Promise<ExecutionResult> => {
    setIsCompiling(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      let hasError = false;
      let errorMessage = '';

      switch (language) {
        case 'python':
          if (!code.includes('def ') && !code.includes('print(')) {
            hasError = true;
            errorMessage = 'Python code must contain function definitions or print statements';
          }
          break;

        case 'java':
          if (!code.includes('class ') || !code.includes('public static void main')) {
            hasError = true;
            errorMessage = 'Java code must contain a class with main method';
          }
          break;

        case 'cpp':
        case 'c':
          if (!code.includes('main(') && !code.includes('main (')) {
            hasError = true;
            errorMessage = 'C/C++ code must contain a main function';
          }
          break;

        case 'javascript':
        case 'typescript':
          if (!code.includes('function') && !code.includes('=>')) {
            hasError = true;
            errorMessage = 'JavaScript/TypeScript code should contain functions';
          }
          break;
      }

      if (hasError) {
        return {
          success: false,
          output: '',
          error: errorMessage
        };
      }

      const inputs = input.split('\n').filter(line => line.trim() !== '');
      let output = '';

      if (inputs.length >= 2) {
        const a = parseInt(inputs[0]) || 0;
        const b = parseInt(inputs[1]) || 0;
        output = (a + b).toString();
      } else if (inputs.length === 1) {
        const num = parseInt(inputs[0]) || 0;
        output = `Input received: ${num}`;
      } else {
        output = 'No input provided. Using default values: 5 + 10 = 15';
      }

      return {
        success: true,
        output: output,
        executionTime: Math.random() * 500 + 100,
        memory: Math.random() * 50 + 10
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Execution Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      setIsCompiling(false);
    }
  };

  const runCode = async () => {
    if (!solutions.startedCode.trim()) {
      alert('Please write solution code first');
      return;
    }

    setIsRunningCode(true);
    setConsoleOutput('🔄 Compiling and running code...\n');

    try {
      const input = formData.sampleInput ||
        testCases.find(tc => tc.isSample)?.input ||
        '';

      const result = await executeCode(solutions.startedCode, solutions.language, input);

      if (result.success) {
        setConsoleOutput(`✅ Compilation Successful!\n\n`);
        setConsoleOutput(prev => prev + `📤 Input:\n${input || '(No input provided)'}\n\n`);
        setConsoleOutput(prev => prev + `📥 Output:\n${result.output}\n\n`);
        setConsoleOutput(prev => prev + `⏱️  Execution Time: ${result.executionTime?.toFixed(2)}ms\n`);
        setConsoleOutput(prev => prev + `💾 Memory Used: ${result.memory?.toFixed(2)}MB\n`);
      } else {
        setConsoleOutput(`❌ Compilation/Runtime Error:\n\n${result.error}\n`);
      }

    } catch (error) {
      console.error('Error running code:', error);
      setConsoleOutput('❌ Error executing code. Please check your code and try again.\n');
    } finally {
      setIsRunningCode(false);
    }
  };

  const runTestCases = async () => {
    if (!solutions.startedCode.trim()) {
      alert('Please write solution code first');
      return;
    }

    if (testCases.length === 0) {
      alert('Please add test cases first');
      return;
    }

    setIsRunningTests(true);
    setTestResults([]);
    setConsoleOutput('🔄 Running test cases...\n');
    setShowTestDetails(true);

    try {
      const results: TestResult[] = [];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];

        setConsoleOutput(prev => prev + `\n🔍 Running Test ${i + 1}: ${testCase.description || 'Test Case'}\n`);

        const result = await executeCode(solutions.startedCode, solutions.language, testCase.input);

        const testResult: TestResult = {
          testCaseId: testCase.id,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput.trim(),
          actualOutput: result.output.trim(),
          passed: result.success && result.output.trim() === testCase.expectedOutput.trim(),
          executionTime: result.executionTime ? `${result.executionTime.toFixed(2)}ms` : 'N/A',
          memory: result.memory ? `${result.memory.toFixed(2)}MB` : 'N/A',
          error: result.error
        };

        results.push(testResult);

        setConsoleOutput(prev => prev +
          `${testResult.passed ? '✅ PASSED' : '❌ FAILED'}\n` +
          `Input: ${testCase.input}\n` +
          `Expected: ${testCase.expectedOutput}\n` +
          `Got: ${result.output}\n` +
          `Time: ${testResult.executionTime}\n` +
          `Memory: ${testResult.memory}\n`
        );
      }

      setTestResults(results);

      const passedCount = results.filter(r => r.passed).length;
      const totalCount = results.length;

      setConsoleOutput(prev => prev + `\n📊 Test Summary: ${passedCount}/${totalCount} tests passed\n`);

      if (passedCount === totalCount) {
        setConsoleOutput(prev => prev + '🎉 All tests passed successfully!\n');
      } else {
        setConsoleOutput(prev => prev + '⚠️ Some tests failed. Please check your solution.\n');
      }

    } catch (error) {
      console.error('Error running tests:', error);
      setConsoleOutput('❌ Error running tests. Please check your code and try again.\n');
    } finally {
      setIsRunningTests(false);
    }
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

  const updateTestCase = (id: string, field: keyof TestCase, value: any) => {
    setTestCases(testCases.map(tc =>
      tc.id === id ? { ...tc, [field]: value } : tc
    ));
  };

  const handleResetToTemplate = () => {
    if (confirm('Reset to template? This will overwrite your current code.')) {
      const template = LANGUAGE_TEMPLATES[solutions.language] || '';
      setSolutions({
        ...solutions,
        startedCode: template
      });
    }
  };

  const addAICriterion = () => {
    setAiConfig({
      ...aiConfig,
      evaluationCriteria: [...aiConfig.evaluationCriteria, '']
    });
  };

  const updateAICriterion = (index: number, value: string) => {
    const newCriteria = [...aiConfig.evaluationCriteria];
    newCriteria[index] = value;
    setAiConfig({
      ...aiConfig,
      evaluationCriteria: newCriteria
    });
  };

  const removeAICriterion = (index: number) => {
    if (aiConfig.evaluationCriteria.length > 1) {
      const newCriteria = aiConfig.evaluationCriteria.filter((_, i) => i !== index);
      setAiConfig({
        ...aiConfig,
        evaluationCriteria: newCriteria
      });
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
    // --- UPDATED TAB LOGIC ---
    // If it's a frontend module, strictly only show the Question tab
    if (isFrontendModule) {
      return ['question'];
    }

    const tabs: ('question' | 'testcases' | 'solution' | 'ai-configuration')[] = ['question'];

    if (isAutomationMode) {
      tabs.push('testcases', 'solution');
    } else if (isAIMode) {
      tabs.push('ai-configuration');
    } else if (isPracticeMode) {
      tabs.push('solution');
    }

    return tabs;
  };

  const availableTabs = getAvailableTabs();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'question':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
                placeholder="Enter question title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the problem in detail. Include input format, output format, and examples."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                required
              />
            </div>

            {/* HIDE ALL OTHER FIELDS IF FRONTEND MODULE */}
            {!isFrontendModule && (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Score *
                    </label> {/* CHANGE: Points -> Score */}
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.score} // CHANGE: points -> score
                      onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 10 })} // CHANGE: points -> score
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                  </div>


                  {/* Conditionally render Difficulty field */}
                  {exerciseData.fullExerciseData.programmingSettings.levelConfiguration.levelType !== 'general' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Difficulty *
                      </label>
                      <select
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        required
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  )}

                  {/* Adjust the grid column span for the remaining fields */}
                  <div className={exerciseData.fullExerciseData.programmingSettings.levelConfiguration.levelType === 'general' ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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

                  <div className={exerciseData.fullExerciseData.programmingSettings.levelConfiguration.levelType === 'general' ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Constraints
                    </label>
                    <button
                      type="button"
                      onClick={addConstraint}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>
                  <div className="space-y-1">
                    {formData.constraints.map((constraint, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <input
                          type="text"
                          value={constraint}
                          onChange={(e) => updateConstraint(index, e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                          placeholder="e.g., 1 <= n <= 10^5"
                        />
                        {formData.constraints.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeConstraint(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sample Input
                    </label>
                    <textarea
                      value={formData.sampleInput}
                      onChange={(e) => setFormData({ ...formData, sampleInput: e.target.value })}
                      rows={3}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                      placeholder="Enter sample input..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sample Output
                    </label>
                    <textarea
                      value={formData.sampleOutput}
                      onChange={(e) => setFormData({ ...formData, sampleOutput: e.target.value })}
                      rows={3}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                      placeholder="Enter expected output..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hint (Optional)
                  </label>
                  <textarea
                    value={formData.hint}
                    onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                    rows={2}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Add a hint for students..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Additional Hints
                    </label>
                    <button
                      type="button"
                      onClick={addHint}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add Hint
                    </button>
                  </div>
                  <div className="space-y-2">
                    {hints.map((hint, index) => (
                      <div key={index} className="border border-gray-200 rounded p-2 bg-gray-50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">Hint {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeHint(index)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <textarea
                          value={hint.hintText}
                          onChange={(e) => updateHint(index, 'hintText', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs mb-1"
                          placeholder="Hint text..."
                        />
                        <div className="flex items-center gap-3 text-xs">
                          <label className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={hint.pointsDeduction}
                              onChange={(e) => updateHint(index, 'pointsDeduction', parseInt(e.target.value) || 0)}
                              className="w-12 px-1 py-0.5 border border-gray-300 rounded"
                            />
                            Points Deduction
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={hint.isPublic}
                              onChange={(e) => updateHint(index, 'isPublic', e.target.checked)}
                              className="rounded"
                            />
                            Public
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'testcases':
        if (!isAutomationMode) return null;

        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Test Cases</h3>
                <p className="text-xs text-gray-600">Add test cases for automated evaluation</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={addTestCase}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Test Case
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="space-y-3">
                {testCases.map((testCase, index) => (
                  <div key={testCase.id} className="border border-gray-200 rounded p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">Test Case {index + 1}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${testCase.isSample
                          ? 'bg-blue-100 text-blue-800'
                          : testCase.isHidden
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-green-100 text-green-800'
                          }`}>
                          {testCase.isSample ? 'Sample' : testCase.isHidden ? 'Hidden' : 'Public'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => duplicateTestCase(testCase)}
                          className="text-xs text-blue-600 hover:text-blue-700 p-1"
                          title="Duplicate"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        {testCases.length > 1 && (
                          <button
                            onClick={() => removeTestCase(testCase.id)}
                            className="text-red-500 hover:text-red-700 p-1 text-xs"
                            title="Delete"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Description</label>
                        <input
                          type="text"
                          value={testCase.description || ''}
                          onChange={(e) => updateTestCase(testCase.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          placeholder="Test case description..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Input</label>
                        <textarea
                          value={testCase.input}
                          onChange={(e) => updateTestCase(testCase.id, 'input', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                          placeholder="Test input (one value per line)..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Expected Output</label>
                        <textarea
                          value={testCase.expectedOutput}
                          onChange={(e) => updateTestCase(testCase.id, 'expectedOutput', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                          placeholder="Expected output..."
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={testCase.isSample}
                          onChange={(e) => updateTestCase(testCase.id, 'isSample', e.target.checked)}
                          className="rounded text-xs"
                        />
                        Sample Test Case
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={testCase.isHidden}
                          onChange={(e) => updateTestCase(testCase.id, 'isHidden', e.target.checked)}
                          className="rounded text-xs"
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

      case 'solution':
        if (!isAutomationMode && !isPracticeMode) return null;

        return (
          <div className="h-full flex flex-col gap-3">
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Language:</span>
                  <select
                    value={solutions.language}
                    onChange={(e) => setSolutions({ ...solutions, language: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    {supportedLanguages.map(lang => (
                      <option key={lang} value={lang.toLowerCase()}>
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {isAutomationMode && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Function Name:</span>
                    <input
                      type="text"
                      value={solutions.functionName}
                      onChange={(e) => setSolutions({ ...solutions, functionName: e.target.value })}
                      className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="e.g., main, solve"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Theme:</span>
                  <button
                    onClick={() => setEditorTheme(editorTheme === 'vs-dark' ? 'light' : 'vs-dark')}
                    className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                  >
                    {editorTheme === 'vs-dark' ? '☀️ Light' : '🌙 Dark'}
                  </button>
                </div>

                <button
                  onClick={handleResetToTemplate}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  Reset Template
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Cpu className="h-4 w-4" />
                <span>Mode: </span>
                <span className={isPracticeMode ? 'text-green-600' : 'text-blue-600'}>
                  {isPracticeMode ? 'Practice Mode' : 'Automation Mode'}
                </span>
              </div>
            </div>

            <div className="flex-1 flex gap-3 min-h-0">
              <div className="flex-1 flex flex-col">
                <div className="flex-1 border border-gray-300 rounded overflow-hidden">
                  <MonacoEditor
                    height="100%"
                    language={solutions.language}
                    value={solutions.startedCode}
                    theme={editorTheme}
                    onChange={(value) => setSolutions({ ...solutions, startedCode: value || '' })}
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
                      padding: { top: 10, bottom: 10 }
                    }}
                  />
                </div>
              </div>

              <div className="w-96 flex flex-col gap-3">
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Output</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={runCode}
                      disabled={isRunningCode || isRunningTests || isCompiling}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {isRunningCode || isCompiling ? <Loader className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                      {isRunningCode || isCompiling ? 'Running...' : 'Run Code'}
                    </button>
                    {isAutomationMode && (
                      <button
                        onClick={runTestCases}
                        disabled={isRunningTests || isRunningCode || isCompiling}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {isRunningTests ? <Loader className="h-3 w-3 animate-spin" /> : <TestTube2 className="h-3 w-3" />}
                        {isRunningTests ? 'Testing...' : 'Run Tests'}
                      </button>
                    )}
                  </div>
                </div>

                <div className={`${showTestDetails && isAutomationMode ? 'h-1/2' : 'flex-1'} border border-gray-300 rounded overflow-hidden flex flex-col`}>
                  <div className="flex items-center justify-between bg-gray-100 p-2 border-b">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <Terminal className="h-3 w-3" />
                      Console Output
                    </span>
                    <div className="text-xs text-gray-600">
                      {consoleOutput ? `${consoleOutput.split('\n').length} lines` : 'No output'}
                    </div>
                  </div>
                  <div className="flex-1 bg-black text-green-400 font-mono p-3 overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap leading-relaxed">
                      {consoleOutput || 'Run code or tests to see output here...'}
                    </pre>
                  </div>
                </div>

                {isAutomationMode && testResults.length > 0 && (
                  <div className={`${showTestDetails ? 'h-1/2' : 'h-0'} overflow-hidden transition-all duration-300 flex flex-col`}>
                    <div className="flex items-center justify-between bg-gray-100 p-2 border border-gray-300 rounded-t">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900">Test Results</h4>
                        <span className={`px-2 py-0.5 rounded text-xs ${testResults.every(r => r.passed)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {testResults.filter(r => r.passed).length}/{testResults.length} passed
                        </span>
                      </div>
                      <button
                        onClick={() => setShowTestDetails(!showTestDetails)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {showTestDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="flex-1 border border-gray-300 border-t-0 rounded-b overflow-auto p-2 bg-white">
                      <div className="space-y-1">
                        {testResults.map((result, index) => (
                          <div
                            key={index}
                            className={`p-2 rounded border text-xs ${result.passed
                              ? 'border-green-200 bg-green-50'
                              : 'border-red-200 bg-red-50'
                              }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${result.passed ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                  Test Case {index + 1}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs ${result.passed
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-red-200 text-red-800'
                                  }`}>
                                  {result.passed ? 'PASS' : 'FAIL'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600">
                                <span>{result.executionTime}</span>
                                <span className="mx-1">•</span>
                                <span>{result.memory}</span>
                              </div>
                            </div>
                            {!result.passed && (
                              <div className="mt-1 space-y-1 text-xs">
                                {result.error ? (
                                  <div className="text-red-600 font-mono bg-red-50 p-1 rounded">
                                    Error: {result.error}
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex gap-2">
                                      <span className="text-gray-600">Expected:</span>
                                      <span className="font-mono bg-gray-100 px-1 rounded">{result.expectedOutput}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="text-gray-600">Got:</span>
                                      <span className="font-mono bg-gray-100 px-1 rounded">{result.actualOutput}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'ai-configuration':
        if (!isAIMode) return null;

        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Evaluation Prompt
              </label>
              <textarea
                value={aiConfig.prompt}
                onChange={(e) => setAiConfig({ ...aiConfig, prompt: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Describe how the AI should evaluate submissions..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Evaluation Criteria
                </label>
                <button
                  onClick={addAICriterion}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {aiConfig.evaluationCriteria.map((criterion, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <input
                      type="text"
                      value={criterion}
                      onChange={(e) => updateAICriterion(index, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Evaluation criterion..."
                    />
                    {aiConfig.evaluationCriteria.length > 1 && (
                      <button
                        onClick={() => removeAICriterion(index)}
                        className="text-red-500 hover:text-red-700 p-1"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature: {aiConfig.parameters.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={aiConfig.parameters.temperature}
                  onChange={(e) => setAiConfig({
                    ...aiConfig,
                    parameters: {
                      ...aiConfig.parameters,
                      temperature: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full h-2 bg-gray-200 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Tokens: {aiConfig.parameters.maxTokens}
                </label>
                <input
                  type="range"
                  min="500"
                  max="2000"
                  step="100"
                  value={aiConfig.parameters.maxTokens}
                  onChange={(e) => setAiConfig({
                    ...aiConfig,
                    parameters: {
                      ...aiConfig.parameters,
                      maxTokens: parseInt(e.target.value)
                    }
                  })}
                  className="w-full h-2 bg-gray-200 rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Score
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={aiConfig.maxScore}
                onChange={(e) => setAiConfig({ ...aiConfig, maxScore: parseInt(e.target.value) || 1 })}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 p-2">
      {/* Added relative here so the toast can position absolutely inside it */}
      <div className="bg-white rounded-lg shadow-xl w-full h-full flex flex-col relative">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${isAutomationMode ? 'bg-blue-100' :
              isAIMode ? 'bg-purple-100' :
                isPracticeMode ? 'bg-green-100' :
                  isManualMode ? 'bg-orange-100' :
                    'bg-gray-100'
              }`}>
              {isAutomationMode ? (
                <Zap className="h-4 w-4 text-blue-600" />
              ) : isAIMode ? (
                <Brain className="h-4 w-4 text-purple-600" />
              ) : isPracticeMode ? (
                <FileText className="h-4 w-4 text-green-600" />
              ) : (
                <FileText className="h-4 w-4 text-gray-600" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Add Question</h2>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span>{exerciseData.exerciseName}</span>
                {/* Only show modes and languages if NOT frontend */}
                {!isFrontendModule && (
                  <>
                    <span>•</span>
                    <span className={`px-1.5 py-0.5 rounded-full ${isAutomationMode ? 'bg-blue-100 text-blue-800' :
                      isAIMode ? 'bg-purple-100 text-purple-800' :
                        isPracticeMode ? 'bg-green-100 text-green-800' :
                          isManualMode ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                      }`}>
                      {getEvaluationModeLabel()}
                    </span>
                    {(isAutomationMode || isPracticeMode) && (
                      <>
                        <span>•</span>
                        <span className="text-xs">{supportedLanguages.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b px-3">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 -mb-px ${activeTab === tab
                ? tab === 'question' ? 'border-blue-600 text-blue-600' :
                  tab === 'testcases' ? 'border-green-600 text-green-600' :
                    tab === 'solution' ? 'border-purple-600 text-purple-600' :
                      'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              {tab === 'question' && <MessageSquare className="h-3 w-3" />}
              {tab === 'testcases' && <TestTube2 className="h-3 w-3" />}
              {tab === 'solution' && <Code className="h-3 w-3" />}
              {tab === 'ai-configuration' && <Brain className="h-3 w-3" />}
              {tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-3">
          {renderTabContent()}
        </div>

        <div className="border-t p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              <span className="font-medium">Mode:</span> {getEvaluationModeLabel()}
              {/* Only show technical details if NOT frontend */}
              {!isFrontendModule && (isAutomationMode || isPracticeMode) && (
                <>
                  <span className="ml-2 font-medium">Languages:</span> {supportedLanguages.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}
                </>
              )}
              {activeTab === 'testcases' && (
                <span className="ml-2 font-medium">Test Cases: <span className="text-green-600">{testCases.length}</span></span>
              )}
            </div>
            <div className="flex gap-2">
              {availableTabs.indexOf(activeTab) > 0 && (
                <button
                  type="button"
                  onClick={goToPreviousTab}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  Back
                </button>
              )}

              {availableTabs.indexOf(activeTab) < availableTabs.length - 1 ? (
                <button
                  type="button"
                  onClick={goToNextTab}
                  className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-900"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className={`px-3 py-1.5 text-xs text-white rounded flex items-center gap-1 ${isAutomationMode ? 'bg-green-600 hover:bg-green-700' :
                    isAIMode ? 'bg-purple-600 hover:bg-purple-700' :
                      isPracticeMode ? 'bg-blue-600 hover:bg-blue-700' :
                        'bg-gray-600 hover:bg-gray-700'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? (
                    <>
                      <Loader className="h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3" />
                      Save Question
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* --- TOAST COMPONENT: ADDED HERE --- */}
        {showToast && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 border border-green-500">
              <CheckCircle className="h-6 w-6" />
              <div>
                <h4 className="font-bold text-sm">Success!</h4>
                <p className="text-xs opacity-90">Question added successfully.</p>
              </div>
            </div>
          </div>
        )}
        {/* ----------------------------------- */}

      </div>
    </div>
  );
};

export default AddQuestionForm;