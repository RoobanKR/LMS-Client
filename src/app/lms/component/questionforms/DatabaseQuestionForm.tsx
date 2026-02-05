import React, { useState, useEffect, useRef } from 'react';
import { X, Save, FileText, MessageSquare, Code, TestTube2, Database, Play, Check, AlertCircle, Zap, Brain, Plus, ChevronDown, ChevronUp, Terminal, Loader, CheckCircle, Table, Settings, Server, Key, User, Wifi, Trash2, Copy, Eye, EyeOff, RefreshCw, FolderOpen, ChevronRight, Lock, Download, Upload, Filter, Search, List, Grid, Split, Columns, Rows, BarChart3 } from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import BrowserDatabaseManager from './BrowserDatabaseManager';

interface DatabaseQuestionFormProps {
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

interface DatabaseTestCase {
  id: string;
  name: string;
  description: string;
  schemaSetup: string;
  initialData: string;
  expectedQuery: string;
  expectedResult: string;
  isHidden: boolean;
  isSample: boolean;
  points: number;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
  memory?: number;
  resultSet?: any[];
  affectedRows?: number;
  columns?: string[];
  queryType?: string;
  rowCount?: number;
  sqlMessage?: string;
  message?: string;
  database?: string;
  warnings?: string[];
}

interface BrowserDatabase {
  name: string;
  tables: any[];
  createdAt: Date;
  lastModified: Date;
  version: number;
  description?: string;
}

interface QueryHistoryItem {
  id: string;
  query: string;
  result: string;
  timestamp: Date;
  success: boolean;
  executionTime: number;
  rowCount?: number;
  affectedRows?: number;
}

interface QueryResultView {
  id: string;
  name: string;
  type: 'table' | 'chart' | 'text';
  data: any[];
  columns?: string[];
  chartType?: 'bar' | 'line' | 'pie';
}

// Language templates
const LANGUAGE_TEMPLATES: Record<string, string> = {
  mysql: `-- MySQL Workbench-like Interface
-- Create sample tables

CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(50),
    salary DECIMAL(10, 2),
    hire_date DATE,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO employees (name, email, department, salary, hire_date) VALUES
('John Doe', 'john@company.com', 'Engineering', 75000.00, '2022-03-15'),
('Jane Smith', 'jane@company.com', 'Marketing', 65000.00, '2021-07-22'),
('Bob Johnson', 'bob@company.com', 'Sales', 70000.00, '2023-01-10');

-- Query examples
SELECT * FROM employees;

SELECT name, department, salary 
FROM employees 
WHERE salary > 70000 
ORDER BY salary DESC;

SELECT 
    department,
    COUNT(*) as employee_count,
    AVG(salary) as avg_salary
FROM employees
GROUP BY department;`,
  sqlite: `-- Create a sample table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    age INTEGER,
    city TEXT,
    course TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (name, email, age, city, course) VALUES 
('John Doe', 'john@example.com', 25, 'New York', 'Computer Science'),
('Jane Smith', 'jane@example.com', 30, 'London', 'Data Science'),
('Bob Johnson', 'bob@example.com', 28, 'Tokyo', 'Web Development');

-- Query the data
SELECT * FROM users;`,
  postgresql: `-- Create a sample table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    age INTEGER,
    city VARCHAR(50),
    course VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (name, email, age, city, course) VALUES
('John Doe', 'john@example.com', 25, 'New York', 'Computer Science'),
('Jane Smith', 'jane@example.com', 30, 'London', 'Data Science'),
('Bob Johnson', 'bob@example.com', 28, 'Tokyo', 'Web Development');

-- Query the data
SELECT * FROM users;`,
  mongodb: `// Create collection and insert documents
db.createCollection("users");

db.users.insertMany([
    {
        name: "John Doe",
        email: "john@example.com",
        age: 25,
        city: "New York",
        course: "Computer Science",
        created_at: new Date()
    },
    {
        name: "Jane Smith",
        email: "jane@example.com",
        age: 30,
        city: "London",
        course: "Data Science",
        created_at: new Date()
    },
    {
        name: "Bob Johnson",
        email: "bob@example.com",
        age: 28,
        city: "Tokyo",
        course: "Web Development",
        created_at: new Date()
    }
]);

// Query the data
db.users.find({ city: "New York" });`
};

const DatabaseQuestionForm: React.FC<DatabaseQuestionFormProps> = ({
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

  const [databaseTestCases, setDatabaseTestCases] = useState<DatabaseTestCase[]>([
    {
      id: '1',
      name: 'Sample Test',
      description: 'Sample database test case',
      schemaSetup: '',
      initialData: '',
      expectedQuery: '',
      expectedResult: '',
      isHidden: false,
      isSample: true,
      points: 1
    }
  ]);

  const [hints, setHints] = useState<Array<{ hintText: string, pointsDeduction: number, isPublic: boolean, sequence: number }>>([]);

  // Compiler states
  const [compilerCode, setCompilerCode] = useState<string>('');
  const [compilerLanguage, setCompilerLanguage] = useState<string>('mysql');
  const [compilerOutput, setCompilerOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'light'>('light');

  // Browser database states
  const [databases, setDatabases] = useState<BrowserDatabase[]>([]);
  const [currentDatabase, setCurrentDatabase] = useState<BrowserDatabase | null>(null);
  const [databaseStructure, setDatabaseStructure] = useState<any[]>([]);
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [newDatabaseDescription, setNewDatabaseDescription] = useState('');
  const [isCreatingDatabase, setIsCreatingDatabase] = useState(false);
  const [isImportingDatabase, setIsImportingDatabase] = useState(false);
  const [importData, setImportData] = useState('');
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [showQueryHistory, setShowQueryHistory] = useState(false);
  const [queryViews, setQueryViews] = useState<QueryResultView[]>([]);
  const [showQueryViews, setShowQueryViews] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get supported languages
  const supportedLanguages = exerciseData.selectedLanguages || ['mysql', 'sqlite', 'postgresql', 'mongodb'];
  const defaultLanguage = supportedLanguages[0]?.toLowerCase() || 'mysql';

  // Load initial data
  useEffect(() => {
    if (initialData && isEditing) {
      console.log('📝 Loading database question data for editing:', initialData);

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
      if (initialData.databaseTestCases) {
        setDatabaseTestCases(initialData.databaseTestCases.map((tc: any, index: number) => ({
          id: tc._id || `db-${Date.now()}-${index}`,
          name: tc.name || `Test Case ${index + 1}`,
          description: tc.description || '',
          schemaSetup: tc.schemaSetup || '',
          initialData: tc.initialData || '',
          expectedQuery: tc.expectedQuery || '',
          expectedResult: tc.expectedResult || '',
          isHidden: tc.isHidden || false,
          isSample: tc.isSample || false,
          points: tc.points || 1
        })));
      }

      // Set compiler language and code
      setCompilerLanguage(initialData.databaseType || defaultLanguage);
      setCompilerCode(LANGUAGE_TEMPLATES[initialData.databaseType || defaultLanguage] || 
        `-- Write your ${initialData.databaseType || defaultLanguage} query here\n\n`);
    } else {
      // Set default compiler code
      setCompilerCode(LANGUAGE_TEMPLATES[defaultLanguage] || `-- Write your ${defaultLanguage} query here\n\n`);
      setCompilerLanguage(defaultLanguage);
    }
  }, [initialData, isEditing, defaultLanguage]);

  // Load databases on mount
  useEffect(() => {
    loadDatabases();
    loadQueryHistory();
    loadQueryViews();
  }, []);

  // Database functions
  const loadDatabases = () => {
    const loadedDatabases = BrowserDatabaseManager.getDatabases();
    setDatabases(loadedDatabases);

    const currentDb = BrowserDatabaseManager.getCurrentDatabase();
    if (currentDb) {
      setCurrentDatabase(currentDb);
      setDatabaseStructure(currentDb.tables);
      if (currentDb.tables.length > 0) {
        setSelectedTable(currentDb.tables[0].name);
        loadTableData(currentDb.tables[0].name);
      }
    }
  };

  const loadQueryHistory = () => {
    const history = BrowserDatabaseManager.getQueryHistory();
    setQueryHistory(history);
  };

  const loadQueryViews = () => {
    const views = BrowserDatabaseManager.getQueryViews();
    setQueryViews(views);
  };

  const loadTableData = (tableName: string) => {
    if (!currentDatabase) return;

    const table = currentDatabase.tables.find((t: any) => t.name === tableName);
    if (table) {
      setTableData(table.data.slice(0, 100));
      setTableColumns(table.columns.map((col: any) => col.name));
    }
  };

  const createDatabase = () => {
    if (!newDatabaseName.trim()) return;

    const newDatabase = BrowserDatabaseManager.createDatabase(newDatabaseName, newDatabaseDescription);
    setDatabases(prev => [...prev.filter(db => db.name !== newDatabaseName), newDatabase]);
    setCurrentDatabase(newDatabase);
    setDatabaseStructure(newDatabase.tables);
    setNewDatabaseName('');
    setNewDatabaseDescription('');
    setIsCreatingDatabase(false);
  };

  const deleteDatabase = (name: string) => {
    if (!window.confirm(`Are you sure you want to delete database "${name}"? All data will be lost.`)) {
      return;
    }

    const success = BrowserDatabaseManager.deleteDatabase(name);
    if (success) {
      setDatabases(prev => prev.filter(db => db.name !== name));

      if (currentDatabase?.name === name) {
        setCurrentDatabase(null);
        setDatabaseStructure([]);
        setSelectedTable(null);
        setTableData([]);
        setTableColumns([]);

        const remainingDatabases = BrowserDatabaseManager.getDatabases();
        if (remainingDatabases.length > 0) {
          switchDatabase(remainingDatabases[0].name);
        }
      }
    }
  };

  const switchDatabase = (name: string) => {
    const databases = BrowserDatabaseManager.getDatabases();
    const database = databases.find(db => db.name === name);

    if (database) {
      BrowserDatabaseManager.setCurrentDatabase(name);
      setCurrentDatabase(database);
      setDatabaseStructure(database.tables);
      if (database.tables.length > 0) {
        setSelectedTable(database.tables[0].name);
        loadTableData(database.tables[0].name);
      } else {
        setSelectedTable(null);
        setTableData([]);
        setTableColumns([]);
      }
    }
  };

  const exportDatabase = () => {
    if (!currentDatabase) return;

    try {
      const exportData = BrowserDatabaseManager.exportDatabase(currentDatabase.name);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentDatabase.name}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting database:', error);
      alert('Failed to export database');
    }
  };

  const importDatabase = () => {
    if (!importData.trim()) {
      alert('Please paste database export data');
      return;
    }

    try {
      const importedDb = BrowserDatabaseManager.importDatabase(importData);
      setDatabases(prev => [...prev.filter(db => db.name !== importedDb.name), importedDb]);
      setCurrentDatabase(importedDb);
      setDatabaseStructure(importedDb.tables);
      setImportData('');
      setIsImportingDatabase(false);
      alert('Database imported successfully!');
    } catch (error) {
      console.error('Error importing database:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Invalid format'}`);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Clear all query history?')) {
      BrowserDatabaseManager.clearHistory();
      setQueryHistory([]);
    }
  };

  const executeDatabaseQuery = async (query: string): Promise<ExecutionResult> => {
    if (!currentDatabase) {
      return {
        success: false,
        output: '',
        error: 'No database selected. Please create or select a database first.',
        executionTime: 0
      };
    }

    const result = BrowserDatabaseManager.executeQuery(currentDatabase.name, query);

    // Refresh UI if needed
    if (result.success && result.queryType && ['CREATE', 'DROP', 'ALTER', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'].includes(result.queryType)) {
      const updatedDb = BrowserDatabaseManager.getCurrentDatabase();
      if (updatedDb) {
        setCurrentDatabase(updatedDb);
        setDatabaseStructure(updatedDb.tables);

        if (selectedTable) {
          const tableExists = updatedDb.tables.some((t: any) => t.name === selectedTable);
          if (tableExists) {
            loadTableData(selectedTable);
          } else {
            setSelectedTable(updatedDb.tables[0]?.name || null);
            if (updatedDb.tables[0]) {
              loadTableData(updatedDb.tables[0].name);
            }
          }
        }
      }
    }

    loadQueryHistory();
    return result;
  };

  const executeCompilerCode = async () => {
    if (!compilerCode.trim()) {
      setCompilerOutput('❌ Please write some code or query first\n');
      return;
    }

    setIsExecuting(true);
    let newOutput = '🚀 Executing...\n\n';

    try {
      const queries = compilerCode.split(';').filter(q => {
        const clean = q.trim().replace(/[;=]+$/, '');
        return clean !== '';
      });

      if (queries.length > 1) {
        // Execute multiple queries
        for (const query of queries) {
          if (!query.trim()) continue;

          const cleanQuery = query.trim();
          const singleResult = await executeDatabaseQuery(cleanQuery);

          if (!singleResult.success) {
            newOutput += `❌ Error in query: ${cleanQuery.substring(0, 50)}...\n`;
            newOutput += `Error: ${singleResult.error}\n\n`;
            setCompilerOutput(newOutput);
            setIsExecuting(false);
            return;
          }

          newOutput += `✅ Query executed: ${cleanQuery.substring(0, 50)}${cleanQuery.length > 50 ? '...' : ''}\n`;

          if (singleResult.rowCount !== undefined) {
            newOutput += `📈 Rows: ${singleResult.rowCount}\n`;
          }
          if (singleResult.affectedRows) {
            newOutput += `📊 Affected: ${singleResult.affectedRows}\n`;
          }
          newOutput += '\n';
        }
      } else {
        // Single query
        const result = await executeDatabaseQuery(compilerCode.trim());
        
        if (result.success) {
          newOutput += `✅ ${result.queryType || 'Query'} executed successfully!\n\n`;

          if (result.database) {
            newOutput += `📊 Database: ${result.database}\n`;
          }

          if (result.executionTime) {
            newOutput += `⏱️  Execution Time: ${result.executionTime.toFixed(2)}ms\n`;
          }

          if (result.memory) {
            newOutput += `💾 Memory Used: ${result.memory.toFixed(2)}MB\n`;
          }

          if (result.queryType) {
            newOutput += `📋 Query Type: ${result.queryType}\n`;
          }

          // Handle SELECT queries
          if (result.queryType === 'SELECT') {
            newOutput += `📈 Row Count: ${result.rowCount || 0}\n`;

            if (result.resultSet && result.resultSet.length > 0) {
              newOutput += '\n📊 Query Results:\n';
              newOutput += '='.repeat(80) + '\n';

              let columns = result.columns;
              if (!columns || columns.length === 0) {
                const firstRow = result.resultSet[0];
                if (firstRow && typeof firstRow === 'object') {
                  columns = Object.keys(firstRow);
                }
              }

              if (columns && columns.length > 0) {
                const colWidths: number[] = [];
                columns.forEach((col, index) => {
                  let maxWidth = col.length;
                  result.resultSet!.forEach(row => {
                    const value = row[col];
                    const strValue = value === null ? 'NULL' :
                      value === undefined ? 'UNDEFINED' :
                        String(value);
                    maxWidth = Math.max(maxWidth, Math.min(strValue.length, 30));
                  });
                  colWidths[index] = Math.min(maxWidth + 2, 32);
                });

                let header = '|';
                columns.forEach((col, index) => {
                  header += ' ' + col.padEnd(colWidths[index]) + ' |';
                });
                newOutput += header + '\n';

                let separator = '|';
                columns.forEach((col, index) => {
                  separator += '-' + '-'.repeat(colWidths[index]) + '-|';
                });
                newOutput += separator + '\n';

                const displayRows = result.resultSet!.slice(0, 50);
                displayRows.forEach((row, rowIndex) => {
                  let rowStr = '|';
                  columns!.forEach((col, index) => {
                    let value = row[col];
                    let displayValue: string;

                    if (value === null) {
                      displayValue = 'NULL';
                    } else if (value === undefined) {
                      displayValue = 'UNDEFINED';
                    } else if (value instanceof Date) {
                      displayValue = value.toISOString().split('T')[0];
                    } else if (typeof value === 'object') {
                      try {
                        displayValue = JSON.stringify(value).substring(0, 25) + '...';
                      } catch {
                        displayValue = '[Object]';
                      }
                    } else {
                      displayValue = String(value);
                    }

                    if (displayValue.length > colWidths[index] - 1) {
                      displayValue = displayValue.substring(0, colWidths[index] - 4) + '...';
                    }

                    rowStr += ' ' + displayValue.padEnd(colWidths[index]) + ' |';
                  });
                  newOutput += rowStr + '\n';
                });

                if (result.resultSet!.length > 50) {
                  newOutput += `\n... and ${result.resultSet!.length - 50} more rows\n`;
                }
              } else {
                newOutput += JSON.stringify(result.resultSet, null, 2) + '\n';
              }
              newOutput += '='.repeat(80) + '\n';
            } else {
              newOutput += `\nℹ️  Query returned 0 rows.\n`;
            }
          }
        } else {
          let errorMsg = '❌ Error:\n\n';
          if (result.sqlMessage) {
            errorMsg += `SQL Error: ${result.sqlMessage}\n`;
          }
          if (result.error) {
            errorMsg += `Error: ${result.error}\n`;
          }
          if (result.message) {
            errorMsg += `Message: ${result.message}\n`;
          }
          newOutput += errorMsg;
        }
      }

      setCompilerOutput(prev => newOutput);
    } catch (error) {
      console.error('Error executing code:', error);
      const errorMsg = `❌ Error executing code: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
      setCompilerOutput(prev => prev + errorMsg);
    } finally {
      setIsExecuting(false);
    }
  };

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
    const newTestCase: DatabaseTestCase = {
      id: Date.now().toString(),
      name: `Test Case ${databaseTestCases.length + 1}`,
      description: 'New database test case',
      schemaSetup: '',
      initialData: '',
      expectedQuery: '',
      expectedResult: '',
      isHidden: false,
      isSample: false,
      points: 1
    };
    setDatabaseTestCases([...databaseTestCases, newTestCase]);
  };

  const duplicateTestCase = (testCase: DatabaseTestCase) => {
    const duplicatedTestCase: DatabaseTestCase = {
      ...testCase,
      id: Date.now().toString(),
      name: `${testCase.description || 'Test'} (Copy)`
    };
    setDatabaseTestCases([...databaseTestCases, duplicatedTestCase]);
  };

  const removeTestCase = (id: string) => {
    if (databaseTestCases.length > 1) {
      setDatabaseTestCases(databaseTestCases.filter(tc => tc.id !== id));
    }
  };

  const updateTestCase = (id: string, field: string, value: any) => {
    setDatabaseTestCases(databaseTestCases.map(tc =>
      tc.id === id ? { ...tc, [field]: value } : tc
    ));
  };

  const goToNextTab = () => {
    const tabs = ['question', 'compiler', 'testcases'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1] as any);
    }
  };

  const goToPreviousTab = () => {
    const tabs = ['question', 'compiler', 'testcases'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1] as any);
    }
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
    const preparedTestCases = databaseTestCases.map((tc, index) => ({
      name: tc.name,
      description: tc.description,
      schemaSetup: tc.schemaSetup,
      initialData: tc.initialData,
      expectedQuery: tc.expectedQuery,
      expectedResult: tc.expectedResult,
      isSample: tc.isSample,
      isHidden: tc.isHidden,
      points: tc.points,
      sequence: index
    }));

    // Create question data
    const questionData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      difficulty: formData.difficulty as 'easy' | 'medium' | 'hard',
      points: formData.score,
      moduleType: 'Database',
      isFrontend: false,
      isDatabase: true,
      isProgramming: false,
      sampleInput: formData.sampleInput.trim() || undefined,
      sampleOutput: formData.sampleOutput.trim() || undefined,
      constraints: formData.constraints.filter(c => c.trim() !== ''),
      hints: preparedHints,
      timeLimit: formData.timeLimit,
      memoryLimit: formData.memoryLimit,
      isActive: true,
      sequence: initialData?.sequence || 0,
      databaseType: compilerLanguage,
      databaseTestCases: preparedTestCases,
      solutions: {
        startedCode: compilerCode,
        functionName: 'main',
        language: compilerLanguage
      },
      browserDatabaseConfig: currentDatabase ? {
        databaseName: currentDatabase.name,
        tables: currentDatabase.tables.length,
        storageType: 'localStorage'
      } : undefined,
      metadata: {
        submittedAt: new Date().toISOString(),
        submissionId: Date.now().toString(36) + Math.random().toString(36).substr(2),
        tabType: tabType,
        nodeType: exerciseData.nodeType,
        nodeId: exerciseData.nodeId,
        exerciseId: exerciseData.exerciseId
      }
    };

    // Call onSave
    onSave(questionData);
    setShowToast(true);
  };

  // Render database management
  const renderDatabaseManagement = () => {
    return (
      <div className="mb-6 p-4 border border-gray-200 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 shadow-sm">
        {/* Database Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg border border-blue-200 shadow-sm">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">Browser Database Manager</h4>
              <p className="text-sm text-gray-600">MySQL Workbench-like interface with full browser storage</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingDatabase(!isCreatingDatabase)}
              className="px-4 py-2 text-sm bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" /> New DB
            </button>
            <button
              onClick={() => setIsImportingDatabase(!isImportingDatabase)}
              className="px-4 py-2 text-sm bg-white border border-green-300 text-green-600 rounded-lg hover:bg-green-50 flex items-center gap-2 transition-colors"
            >
              <Upload className="h-4 w-4" /> Import
            </button>
            {currentDatabase && (
              <button
                onClick={exportDatabase}
                className="px-4 py-2 text-sm bg-white border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 flex items-center gap-2 transition-colors"
              >
                <Download className="h-4 w-4" /> Export
              </button>
            )}
          </div>
        </div>

        {/* Database Creation Form */}
        {isCreatingDatabase && (
          <div className="mb-4 p-4 bg-white border border-blue-200 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Database Name *</label>
                <input
                  type="text"
                  value={newDatabaseName}
                  onChange={(e) => setNewDatabaseName(e.target.value)}
                  placeholder="e.g., my_app_db"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newDatabaseDescription}
                  onChange={(e) => setNewDatabaseDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={createDatabase}
                disabled={!newDatabaseName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Database
              </button>
              <button
                onClick={() => {
                  setIsCreatingDatabase(false);
                  setNewDatabaseName('');
                  setNewDatabaseDescription('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Database Import Form */}
        {isImportingDatabase && (
          <div className="mb-4 p-4 bg-white border border-green-200 rounded-lg shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Import Database JSON</label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste exported database JSON here..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={importDatabase}
                disabled={!importData.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Database
              </button>
              <button
                onClick={() => {
                  setIsImportingDatabase(false);
                  setImportData('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Database Selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Available Databases</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQueryHistory(!showQueryHistory)}
                className="px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <FileText className="h-3 w-3" /> History ({queryHistory.length})
              </button>
              <button
                onClick={() => setShowQueryViews(!showQueryViews)}
                className="px-3 py-1.5 text-xs bg-white border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 flex items-center gap-2"
              >
                <BarChart3 className="h-3 w-3" /> Views ({queryViews.length})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {databases.map(db => (
              <button
                key={db.name}
                onClick={() => switchDatabase(db.name)}
                className={`px-4 py-2 rounded-lg flex items-center gap-3 transition-all ${currentDatabase?.name === db.name
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Database className={`h-4 w-4 ${currentDatabase?.name === db.name ? 'text-white' : 'text-blue-500'}`} />
                  <span className="font-medium">{db.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${currentDatabase?.name === db.name
                    ? 'bg-blue-500 bg-opacity-30 text-blue-100'
                    : 'bg-gray-100 text-gray-600'
                    }`}>
                    {db.tables.length} tables
                  </span>
                  {currentDatabase?.name !== db.name && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDatabase(db.name);
                      }}
                      className="text-red-400 hover:text-red-600 p-1"
                      title="Delete database"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Database Information */}
        {currentDatabase && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Database Info Card */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                Database Info
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-semibold">{currentDatabase.name}</span>
                </div>
                {currentDatabase.description && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Description:</span>
                    <span className="font-medium text-gray-700">{currentDatabase.description}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{currentDatabase.createdAt.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Modified:</span>
                  <span>{currentDatabase.lastModified.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Tables:</span>
                  <span className="font-semibold text-blue-600">{currentDatabase.tables.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Rows:</span>
                  <span className="font-semibold text-green-600">
                    {currentDatabase.tables.reduce((sum, table) => sum + table.data.length, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tables List */}
            <div className="md:col-span-2">
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Table className="h-4 w-4 text-green-500" />
                  Tables ({currentDatabase.tables.length})
                </h5>
                {currentDatabase.tables.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentDatabase.tables.map((table: any) => (
                      <div
                        key={table.name}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedTable === table.name
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        onClick={() => {
                          setSelectedTable(table.name);
                          loadTableData(table.name);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Table className="h-4 w-4 text-gray-500" />
                            <span className="font-semibold text-gray-800">{table.name}</span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {table.data.length} rows
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>Columns: {table.columns.length}</div>
                          <div>Engine: {table.engine || 'InnoDB'}</div>
                          {table.charset && <div>Charset: {table.charset}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Table className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No tables created yet.</p>
                    <p className="text-sm mt-1">Run CREATE TABLE queries to add tables.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Query History Panel */}
        {showQueryHistory && (
          <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Query History
              </h5>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowQueryHistory(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="max-h-60 overflow-auto">
              {queryHistory.length > 0 ? (
                queryHistory.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-3 mb-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${item.success ? 'border-green-100' : 'border-red-100'
                      }`}
                    onClick={() => {
                      if (!item.query.endsWith('...')) {
                        setCompilerCode(item.query);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.success ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-mono text-gray-800 truncate flex-1">{item.query}</span>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-600">
                      <span className={`px-2 py-1 rounded ${item.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {item.result.replace('✅ ', '').replace('❌ ', '')}
                      </span>
                      <div className="flex items-center gap-3">
                        {item.rowCount !== undefined && (
                          <span>Rows: {item.rowCount}</span>
                        )}
                        {item.affectedRows !== undefined && (
                          <span>Affected: {item.affectedRows}</span>
                        )}
                        <span>{item.executionTime.toFixed(2)}ms</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No query history yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table Data Viewer */}
        {selectedTable && tableData.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold text-gray-700 flex items-center gap-2">
                <Table className="h-4 w-4" />
                Table Data: {selectedTable}
                <span className="text-sm font-normal text-gray-500">
                  (Showing {tableData.length} of {currentDatabase?.tables.find((t: any) => t.name === selectedTable)?.data.length || 0} rows)
                </span>
              </h5>
              <button
                onClick={() => {
                  setIsRefreshing(true);
                  setTimeout(() => {
                    loadTableData(selectedTable);
                    setIsRefreshing(false);
                  }, 300);
                }}
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {tableColumns.map(column => (
                      <th
                        key={column}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {tableColumns.map(column => (
                        <td
                          key={`${rowIndex}-${column}`}
                          className="px-4 py-2 text-sm text-gray-700 border-t border-gray-100"
                        >
                          {row[column] === null ? (
                            <span className="text-gray-400 italic">NULL</span>
                          ) : row[column] instanceof Date ? (
                            row[column].toISOString().split('T')[0]
                          ) : typeof row[column] === 'boolean' ? (
                            row[column] ? 'TRUE' : 'FALSE'
                          ) : (
                            String(row[column])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
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
                  const template = LANGUAGE_TEMPLATES[newLang] || `-- Write your ${newLang} query here\n\n`;
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

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Format:</span>
              <button
                onClick={() => {
                  const formatted = compilerCode
                    .replace(/\b(SELECT|FROM|WHERE|ORDER BY|GROUP BY|HAVING|LIMIT|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE|TRUNCATE TABLE|BEGIN|COMMIT|ROLLBACK)\b/gi, '\n$1')
                    .replace(/,\s*/g, ',\n  ')
                    .replace(/\)\s*\(/g, ')\n(');
                  setCompilerCode(formatted.trim());
                }}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm flex items-center gap-2 transition-colors duration-200"
              >
                <Code className="h-4 w-4" />
                Format SQL
              </button>
            </div>

            <button
              onClick={() => {
                const template = LANGUAGE_TEMPLATES[compilerLanguage] || `-- Write your ${compilerLanguage} query here\n\n`;
                setCompilerCode(template);
                setCompilerOutput('');
              }}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm flex items-center gap-2 transition-colors duration-200"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <div className="flex items-center gap-3">
            {currentDatabase && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200 shadow-sm">
                <Database className="h-3 w-3" />
                <div>
                  <div className="font-semibold">{currentDatabase.name}</div>
                  <div className="text-gray-600">{currentDatabase.tables.length} tables</div>
                </div>
              </div>
            )}
            <div className="text-sm font-medium text-gray-700">
              {compilerLanguage.toUpperCase()} Workbench
            </div>
          </div>
        </div>

        {/* Database Management */}
        {renderDatabaseManagement()}

        <div className="flex-1 flex gap-4 min-h-0" style={{
          minHeight: '500px',
          maxHeight: '600px',
          height: 'calc(70vh - 300px)'
        }}>
          {/* Left Panel: Editor (40%) */}
          <div className="w-2/5 flex flex-col min-w-0" style={{ flex: '4' }}>
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  SQL Editor
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {compilerCode.split('\n').length} lines • {compilerCode.length} chars
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={executeCompilerCode}
                    disabled={isExecuting || !currentDatabase}
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
                        Run Query (Ctrl+Enter)
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 border border-gray-300 rounded-xl overflow-hidden shadow-sm bg-white" style={{ minHeight: '300px' }}>
                <MonacoEditor
                  height="100%"
                  language={compilerLanguage === 'mysql' ? 'sql' : compilerLanguage}
                  value={compilerCode}
                  theme={editorTheme}
                  onChange={(value) => setCompilerCode(value || '')}
                  onMount={(editor) => {
                    // Add keyboard shortcut for execution
                    if (editor.addCommand) {
                      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                        executeCompilerCode();
                      });
                    }
                  }}
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
                    lineNumbersMinChars: 3,
                    quickSuggestionsDelay: 100,
                    suggestSelection: 'first',
                    wordBasedSuggestions: 'allDocuments'
                  }}
                />
              </div>

              {/* Query Actions */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setCompilerCode('SELECT * FROM ' + (selectedTable || 'table_name') + ';')}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <Table className="h-4 w-4" />
                  SELECT *
                </button>
                <button
                  onClick={() => setCompilerCode('DESCRIBE ' + (selectedTable || 'table_name') + ';')}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  DESCRIBE
                </button>
                <button
                  onClick={() => setCompilerCode('SHOW TABLES;')}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  SHOW TABLES
                </button>
                <button
                  onClick={() => setCompilerCode('SHOW DATABASES;')}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  SHOW DATABASES
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Output Console (60%) */}
          <div className="w-3/5 flex flex-col min-w-0" style={{ flex: '6' }}>
            {/* Output Header */}
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-600" />
                Query Results
                {currentDatabase && (
                  <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {currentDatabase.name}
                  </span>
                )}
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
                        else if (line.startsWith('|') && line.includes('---')) className += ' text-cyan-300 border-t border-cyan-800 pt-2';
                        else if (line.startsWith('|')) className += ' text-gray-300 border-b border-gray-800 pb-0.5';
                        else if (line.includes('='.repeat(80))) className += ' text-gray-500';
                        else if (line.includes('Database:')) className += ' text-cyan-300 font-medium';
                        else if (line.includes('🚀') || line.includes('🔌')) className += ' text-yellow-300';
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
                            <div className="mb-2 text-lg">👆 Run query to see results here</div>
                            <div className="text-sm text-gray-600">
                              Press Ctrl+Enter to execute query
                            </div>
                            <div className="mt-4 text-xs text-gray-500">
                              <div>Tip: Use SHOW TABLES to list all tables</div>
                              <div>Tip: Use DESCRIBE table_name to see table structure</div>
                              <div>Tip: Multiple queries separated by semicolons are supported</div>
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
                    <div className={`w-2 h-2 rounded-full ${currentDatabase ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-gray-700">
                      {currentDatabase ? 'Database Connected' : 'No Database'}
                    </span>
                  </div>
                  {currentDatabase && (
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold">{currentDatabase.name}</span>
                      <span className="mx-2">•</span>
                      Tables: <span className="font-bold text-blue-600">{currentDatabase.tables.length}</span>
                      <span className="mx-2">•</span>
                      Rows: <span className="font-bold text-green-600">
                        {currentDatabase.tables.reduce((sum, table) => sum + table.data.length, 0)}
                      </span>
                    </div>
                  )}
                  {isExecuting && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader className="h-3 w-3 animate-spin" />
                      <span>Executing query...</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Browser-based MySQL Workbench • Local Storage • No Server Required
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
            <h3 className="text-lg font-semibold text-gray-900">Database Test Cases</h3>
            <p className="text-sm text-gray-600 mt-1">Add test cases for database query evaluation</p>
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
            {databaseTestCases.map((testCase, index) => (
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
                    {databaseTestCases.length > 1 && (
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={testCase.name}
                      onChange={(e) => updateTestCase(testCase.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                      placeholder="Test case name..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={testCase.description}
                      onChange={(e) => updateTestCase(testCase.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                      placeholder="Test case description..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Schema Setup (SQL)</label>
                    <textarea
                      value={testCase.schemaSetup}
                      onChange={(e) => updateTestCase(testCase.id, 'schemaSetup', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500"
                      placeholder="CREATE TABLE statements..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Initial Data (INSERT statements)</label>
                    <textarea
                      value={testCase.initialData}
                      onChange={(e) => updateTestCase(testCase.id, 'initialData', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500"
                      placeholder="INSERT INTO statements..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Query</label>
                    <textarea
                      value={testCase.expectedQuery}
                      onChange={(e) => updateTestCase(testCase.id, 'expectedQuery', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500"
                      placeholder="Expected SQL query..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Result</label>
                    <textarea
                      value={testCase.expectedResult}
                      onChange={(e) => updateTestCase(testCase.id, 'expectedResult', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500"
                      placeholder="Expected query result..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={testCase.points}
                      onChange={(e) => updateTestCase(testCase.id, 'points', parseInt(e.target.value) || 1)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
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
            placeholder="Describe the database query problem. Include table structures, relationships, and expected results."
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
                  placeholder="e.g., Use only SELECT statements, No subqueries allowed"
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
              Sample Query
            </label>
            <textarea
              value={formData.sampleInput}
              onChange={(e) => setFormData({ ...formData, sampleInput: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500"
              placeholder="SELECT * FROM employees WHERE department = 'IT';"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sample Result
            </label>
            <textarea
              value={formData.sampleOutput}
              onChange={(e) => setFormData({ ...formData, sampleOutput: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500"
              placeholder="id | name | email | department\n1 | John | john@it.com | IT\n2 | Jane | jane@it.com | IT"
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
        return renderTestCasesTab();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[95vh] flex flex-col relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-100 shadow">
              <Database className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEditing ? 'Edit Database Question' : 'Add Database Question'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <span className="font-medium">{exerciseData.exerciseName}</span>
                <span className="text-gray-400">•</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800">
                  Database Module
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
          {['question', 'compiler', 'testcases'].map((tab) => (
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
                <div className={`w-2 h-2 rounded-full ${isSaving ? 'animate-pulse bg-yellow-500' : 'bg-cyan-500'}`}></div>
                <div>
                  <span className="font-semibold">Module:</span> Database
                  {isSaving && <span className="ml-2 text-yellow-600 font-medium">(Saving...)</span>}
                </div>
              </div>

              {currentDatabase && (
                <div>
                  <span className="font-semibold">
                    Database: <span className="text-green-600 font-bold">{currentDatabase.name}</span>
                  </span>
                </div>
              )}

              {activeTab === 'testcases' && (
                <div>
                  <span className="font-semibold">
                    Test Cases: <span className="text-green-600 font-bold">{databaseTestCases.length}</span>
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
              {['question', 'compiler', 'testcases'].indexOf(activeTab) > 0 && (
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
              {['question', 'compiler', 'testcases'].indexOf(activeTab) < 2 ? (
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
                        : 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 active:scale-95'
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

export default DatabaseQuestionForm;