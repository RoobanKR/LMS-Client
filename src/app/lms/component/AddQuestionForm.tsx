import React, { useState, useEffect, useRef } from 'react';
import { X, Save, FileText, Code, MessageSquare, Hash, TestTube2, Cpu, Play, Check, AlertCircle, Zap, Brain, Plus, ChevronDown, ChevronUp, Terminal, Loader, CheckCircle, Database, Table, Settings, Server, Key, User, Wifi, Trash2, Copy, Eye, EyeOff, RefreshCw, FolderOpen, ChevronRight, Lock, Download, Upload, Filter, Search, List, Grid, Split, Columns, Rows, BarChart3 } from 'lucide-react';
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
      // ADD THIS SECTION:
      scoreSettings?: {
        scoreType: string;
        separateMarks?: {
          levelBased?: {
            easy: number[];
            medium: number[];
            hard: number[];
          };
          general?: number[];
        };
        levelBasedMarks?: {
          easy: number;
          medium: number;
          hard: number;
        };
        evenMarks?: number;
        totalMarks?: number;
      };
      createdAt: string;
      updatedAt: string;
    };
  };
  tabType: string;
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

interface TestResult {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTime: string;
  memory: string;
  error?: string;
  resultSet?: any[];
}

// Browser-based database storage with improved functionality
interface BrowserDatabase {
  name: string;
  tables: BrowserTable[];
  createdAt: Date;
  lastModified: Date;
  version: number;
  description?: string;
}

interface BrowserTable {
  name: string;
  columns: BrowserColumn[];
  data: any[];
  indexes: string[];
  constraints: TableConstraint[];
  description?: string;
  engine?: string;
  charset?: string;
}

interface BrowserColumn {
  name: string;
  type: 'VARCHAR' | 'INT' | 'BIGINT' | 'DECIMAL' | 'FLOAT' | 'DOUBLE' | 'DATE' | 'DATETIME' | 'TIMESTAMP' | 'TIME' | 'YEAR' | 'TEXT' | 'LONGTEXT' | 'BOOLEAN' | 'BLOB' | 'JSON' | 'ENUM' | 'SET';
  length?: number;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: any;
  autoIncrement: boolean;
  unique: boolean;
  foreignKey?: ForeignKeyConstraint;
  unsigned?: boolean;
  zerofill?: boolean;
  collation?: string;
  comment?: string;
}

interface TableConstraint {
  type: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK' | 'INDEX';
  name: string;
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

interface ForeignKeyConstraint {
  referencedTable: string;
  referencedColumn: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
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

// Browser Database Manager - ENHANCED VERSION
class BrowserDatabaseManager {
  private static STORAGE_KEY = 'browser_databases_v2';
  private static CURRENT_DB_KEY = 'current_browser_database_v2';
  private static QUERY_HISTORY_KEY = 'query_history_v2';
  private static QUERY_VIEWS_KEY = 'query_views_v2';

  // MySQL data types mapping
  static readonly MYSQL_TYPES = [
    'INT', 'VARCHAR', 'TEXT', 'DATE', 'DATETIME', 'TIMESTAMP',
    'DECIMAL', 'FLOAT', 'DOUBLE', 'BOOLEAN', 'BLOB', 'JSON',
    'ENUM', 'SET', 'BIGINT', 'TIME', 'YEAR', 'LONGTEXT'
  ];

  static getDatabases(): BrowserDatabase[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        // Create sample database if none exists
        const sampleDb = this.createSampleDatabase();
        return [sampleDb];
      }

      const databases = JSON.parse(stored);
      return databases.map((db: any) => ({
        ...db,
        createdAt: new Date(db.createdAt),
        lastModified: new Date(db.lastModified),
        tables: db.tables.map((table: any) => ({
          ...table,
          data: table.data.map((row: any) => {
            const processedRow: any = {};
            Object.keys(row).forEach(key => {
              if (typeof row[key] === 'string' && row[key].includes('T') && row[key].includes('Z')) {
                processedRow[key] = new Date(row[key]);
              } else {
                processedRow[key] = row[key];
              }
            });
            return processedRow;
          })
        }))
      }));
    } catch (error) {
      console.error('Error reading databases from storage:', error);
      const sampleDb = this.createSampleDatabase();
      return [sampleDb];
    }
  }

  static createSampleDatabase(): BrowserDatabase {
    const sampleDb: BrowserDatabase = {
      name: 'lms_sample_db',
      description: 'Sample LMS database with users and courses',
      tables: [
        {
          name: 'users',
          columns: [
            {
              name: 'id',
              type: 'INT',
              nullable: false,
              primaryKey: true,
              autoIncrement: true,
              unique: true
            },
            {
              name: 'name',
              type: 'VARCHAR',
              length: 100,
              nullable: false,
              primaryKey: false,
              autoIncrement: false,
              unique: false
            },
            {
              name: 'email',
              type: 'VARCHAR',
              length: 100,
              nullable: false,
              primaryKey: false,
              autoIncrement: false,
              unique: true
            },
            {
              name: 'age',
              type: 'INT',
              nullable: true,
              primaryKey: false,
              autoIncrement: false,
              unique: false
            },
            {
              name: 'city',
              type: 'VARCHAR',
              length: 50,
              nullable: true,
              primaryKey: false,
              autoIncrement: false,
              unique: false
            },
            {
              name: 'course',
              type: 'VARCHAR',
              length: 50,
              nullable: true,
              primaryKey: false,
              autoIncrement: false,
              unique: false
            },
            {
              name: 'created_at',
              type: 'TIMESTAMP',
              nullable: false,
              primaryKey: false,
              autoIncrement: false,
              unique: false,
              defaultValue: 'CURRENT_TIMESTAMP'
            }
          ],
          data: [
            { id: 1, name: 'John Doe', email: 'john@example.com', age: 25, city: 'New York', course: 'Computer Science', created_at: new Date('2024-01-15') },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 30, city: 'London', course: 'Data Science', created_at: new Date('2024-01-16') },
            { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 28, city: 'Tokyo', course: 'Web Development', created_at: new Date('2024-01-17') },
            { id: 4, name: 'Alice Brown', email: 'alice@example.com', age: 22, city: 'Paris', course: 'AI/ML', created_at: new Date('2024-01-18') },
            { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', age: 35, city: 'Berlin', course: 'Cybersecurity', created_at: new Date('2024-01-19') }
          ],
          indexes: ['idx_email'],
          constraints: [
            {
              type: 'PRIMARY_KEY',
              name: 'PRIMARY',
              columns: ['id']
            },
            {
              type: 'UNIQUE',
              name: 'unique_email',
              columns: ['email']
            }
          ],
          engine: 'InnoDB',
          charset: 'utf8mb4'
        },
        {
          name: 'courses',
          columns: [
            {
              name: 'course_id',
              type: 'INT',
              nullable: false,
              primaryKey: true,
              autoIncrement: true,
              unique: true
            },
            {
              name: 'course_name',
              type: 'VARCHAR',
              length: 100,
              nullable: false,
              primaryKey: false,
              autoIncrement: false,
              unique: false
            },
            {
              name: 'instructor',
              type: 'VARCHAR',
              length: 100,
              nullable: false,
              primaryKey: false,
              autoIncrement: false,
              unique: false
            },
            {
              name: 'duration_weeks',
              type: 'INT',
              nullable: false,
              primaryKey: false,
              autoIncrement: false,
              unique: false
            },
            {
              name: 'price',
              type: 'DECIMAL',
              length: 10,
              nullable: false,
              primaryKey: false,
              autoIncrement: false,
              unique: false
            },
            {
              name: 'enrollment_count',
              type: 'INT',
              nullable: false,
              primaryKey: false,
              autoIncrement: false,
              unique: false,
              defaultValue: 0
            }
          ],
          data: [
            { course_id: 1, course_name: 'Introduction to Programming', instructor: 'Dr. Smith', duration_weeks: 12, price: 299.99, enrollment_count: 45 },
            { course_id: 2, course_name: 'Data Science Fundamentals', instructor: 'Dr. Johnson', duration_weeks: 16, price: 499.99, enrollment_count: 32 },
            { course_id: 3, course_name: 'Web Development Bootcamp', instructor: 'Prof. Williams', duration_weeks: 20, price: 799.99, enrollment_count: 28 },
            { course_id: 4, course_name: 'Machine Learning Advanced', instructor: 'Dr. Brown', duration_weeks: 24, price: 999.99, enrollment_count: 18 }
          ],
          indexes: ['idx_instructor'],
          constraints: [
            {
              type: 'PRIMARY_KEY',
              name: 'PRIMARY',
              columns: ['course_id']
            }
          ],
          engine: 'InnoDB',
          charset: 'utf8mb4'
        }
      ],
      createdAt: new Date(),
      lastModified: new Date(),
      version: 1
    };

    this.saveDatabases([sampleDb]);
    return sampleDb;
  }

  static saveDatabases(databases: BrowserDatabase[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(databases));
    } catch (error) {
      console.error('Error saving databases to storage:', error);
    }
  }

  static getCurrentDatabase(): BrowserDatabase | null {
    try {
      const currentDbName = localStorage.getItem(this.CURRENT_DB_KEY);
      if (!currentDbName) {
        const databases = this.getDatabases();
        if (databases.length > 0) {
          this.setCurrentDatabase(databases[0].name);
          return databases[0];
        }
        return null;
      }

      const databases = this.getDatabases();
      return databases.find(db => db.name === currentDbName) || databases[0] || null;
    } catch (error) {
      console.error('Error getting current database:', error);
      return null;
    }
  }

  static setCurrentDatabase(name: string): void {
    try {
      localStorage.setItem(this.CURRENT_DB_KEY, name);
    } catch (error) {
      console.error('Error setting current database:', error);
    }
  }

  static getQueryHistory(): QueryHistoryItem[] {
    try {
      const stored = localStorage.getItem(this.QUERY_HISTORY_KEY);
      if (!stored) return [];

      const history = JSON.parse(stored);
      return history.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
    } catch (error) {
      console.error('Error reading query history:', error);
      return [];
    }
  }

  static saveQueryHistory(history: QueryHistoryItem[]): void {
    try {
      // Keep only last 100 items
      const limitedHistory = history.slice(0, 100);
      localStorage.setItem(this.QUERY_HISTORY_KEY, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error saving query history:', error);
    }
  }

  static addToHistory(item: QueryHistoryItem): void {
    const history = this.getQueryHistory();
    history.unshift(item);
    this.saveQueryHistory(history);
  }

  static clearHistory(): void {
    localStorage.removeItem(this.QUERY_HISTORY_KEY);
  }

  static getQueryViews(): QueryResultView[] {
    try {
      const stored = localStorage.getItem(this.QUERY_VIEWS_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error reading query views:', error);
      return [];
    }
  }

  static saveQueryViews(views: QueryResultView[]): void {
    try {
      localStorage.setItem(this.QUERY_VIEWS_KEY, JSON.stringify(views));
    } catch (error) {
      console.error('Error saving query views:', error);
    }
  }

  static createDatabase(name: string, description?: string): BrowserDatabase {
    const databases = this.getDatabases();

    // Check if database already exists
    const existingDb = databases.find(db => db.name === name);
    if (existingDb) {
      return existingDb;
    }

    const newDatabase: BrowserDatabase = {
      name,
      description,
      tables: [],
      createdAt: new Date(),
      lastModified: new Date(),
      version: 1
    };

    databases.push(newDatabase);
    this.saveDatabases(databases);
    this.setCurrentDatabase(name);

    return newDatabase;
  }

  static deleteDatabase(name: string): boolean {
    const databases = this.getDatabases();
    const filtered = databases.filter(db => db.name !== name);

    if (filtered.length === databases.length) {
      return false; // Database not found
    }

    this.saveDatabases(filtered);

    // If we're deleting the current database, clear current
    const current = this.getCurrentDatabase();
    if (current && current.name === name) {
      localStorage.removeItem(this.CURRENT_DB_KEY);
    }

    return true;
  }

  static exportDatabase(name: string): string {
    const databases = this.getDatabases();
    const database = databases.find(db => db.name === name);

    if (!database) {
      throw new Error(`Database "${name}" not found`);
    }

    return JSON.stringify(database, null, 2);
  }

  static importDatabase(data: string): BrowserDatabase {
    try {
      const importedDb = JSON.parse(data);

      // Validate structure
      if (!importedDb.name || !Array.isArray(importedDb.tables)) {
        throw new Error('Invalid database format');
      }

      const databases = this.getDatabases();

      // Check if database already exists
      const existingIndex = databases.findIndex(db => db.name === importedDb.name);
      if (existingIndex !== -1) {
        // Update existing database
        databases[existingIndex] = {
          ...importedDb,
          lastModified: new Date(),
          createdAt: new Date(importedDb.createdAt || new Date())
        };
      } else {
        // Add new database
        databases.push({
          ...importedDb,
          createdAt: new Date(importedDb.createdAt || new Date()),
          lastModified: new Date(),
          version: importedDb.version || 1
        });
      }

      this.saveDatabases(databases);
      this.setCurrentDatabase(importedDb.name);

      return this.getCurrentDatabase()!;
    } catch (error) {
      console.error('Error importing database:', error);
      throw new Error('Failed to import database');
    }
  }

  static executeQuery(databaseName: string, query: string): ExecutionResult {
    const startTime = performance.now();
    const databases = this.getDatabases();
    const database = databases.find(db => db.name === databaseName);

    if (!database) {
      return {
        success: false,
        output: '',
        error: `Database "${databaseName}" not found`,
        executionTime: performance.now() - startTime
      };
    }

    try {
      // Clean and normalize the query
      let cleanQuery = query
        .trim()
        .replace(/--.*$/gm, '') // Remove single line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/;$/, ''); // Remove trailing semicolon

      // Handle empty queries
      if (!cleanQuery.trim()) {
        return {
          success: false,
          output: '',
          error: 'Empty query',
          executionTime: performance.now() - startTime
        };
      }

      const normalizedQuery = cleanQuery.toUpperCase().trim();

      // Parse query type
      let result: ExecutionResult;

      if (normalizedQuery.startsWith('SELECT')) {
        result = this.executeSelectQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('CREATE TABLE')) {
        result = this.executeCreateTableQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('INSERT INTO')) {
        result = this.executeInsertQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('UPDATE')) {
        result = this.executeUpdateQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('DELETE FROM')) {
        result = this.executeDeleteQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('DROP TABLE')) {
        result = this.executeDropTableQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('SHOW TABLES')) {
        result = this.executeShowTablesQuery(database);
      } else if (normalizedQuery.startsWith('DESCRIBE') || normalizedQuery.startsWith('DESC')) {
        result = this.executeDescribeQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('ALTER TABLE')) {
        result = this.executeAlterTableQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('TRUNCATE TABLE')) {
        result = this.executeTruncateTableQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('CREATE DATABASE')) {
        result = this.executeCreateDatabaseQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('DROP DATABASE')) {
        result = this.executeDropDatabaseQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('USE')) {
        result = this.executeUseQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('SHOW DATABASES')) {
        result = this.executeShowDatabasesQuery();
      } else if (normalizedQuery.startsWith('EXPLAIN')) {
        result = this.executeExplainQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('CREATE INDEX')) {
        result = this.executeCreateIndexQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('DROP INDEX')) {
        result = this.executeDropIndexQuery(database, cleanQuery);
      } else if (normalizedQuery.startsWith('BEGIN') || normalizedQuery.startsWith('START TRANSACTION')) {
        result = this.executeBeginTransaction(database);
      } else if (normalizedQuery.startsWith('COMMIT')) {
        result = this.executeCommitTransaction(database);
      } else if (normalizedQuery.startsWith('ROLLBACK')) {
        result = this.executeRollbackTransaction(database);
      } else {
        result = {
          success: false,
          output: '',
          error: `Unsupported query type. Supported: SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, SHOW, DESCRIBE, TRUNCATE, EXPLAIN, USE, BEGIN, COMMIT, ROLLBACK`,
          queryType: 'UNKNOWN'
        };
      }

      const endTime = performance.now();
      result.executionTime = endTime - startTime;
      result.memory = Math.random() * 10 + 1;
      result.database = database.name;

      // Add to history if successful or error
      if (result.queryType && result.queryType !== 'UNKNOWN') {
        this.addToHistory({
          id: Date.now().toString(),
          query: cleanQuery.substring(0, 200) + (cleanQuery.length > 200 ? '...' : ''),
          result: result.success ? '✅ Success' : '❌ Error',
          timestamp: new Date(),
          success: result.success,
          executionTime: result.executionTime,
          rowCount: result.rowCount,
          affectedRows: result.affectedRows
        });
      }

      // Update database if modified
      if (result.success && result.queryType && ['CREATE', 'DROP', 'ALTER', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'].includes(result.queryType)) {
        database.lastModified = new Date();
        this.saveDatabase(database);
      }

      return result;

    } catch (error) {
      console.error('Query execution error:', error);
      return {
        success: false,
        output: '',
        error: `Query execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: performance.now() - startTime
      };
    }
  }

  private static executeSelectQuery(database: BrowserDatabase, query: string): ExecutionResult {
    try {
      // Extract table name(s) - handle joins
      const fromMatch = query.match(/FROM\s+([^\s;,(]+)/i);
      if (!fromMatch) {
        return {
          success: false,
          output: '',
          error: 'Invalid SELECT query: No FROM clause found',
          queryType: 'SELECT'
        };
      }

      const tableName = fromMatch[1].trim().replace(/[`"']/g, '');
      const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());

      if (!table) {
        return {
          success: false,
          output: '',
          error: `Table "${tableName}" does not exist`,
          queryType: 'SELECT'
        };
      }

      // Parse SELECT clause
      const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i) || query.match(/SELECT\s+(.+)$/i);
      if (!selectMatch) {
        return {
          success: false,
          output: '',
          error: 'Invalid SELECT clause',
          queryType: 'SELECT'
        };
      }

      const selectClause = selectMatch[1].trim();
      let columns: string[] = [];

      if (selectClause === '*') {
        columns = table.columns.map(col => col.name);
      } else {
        columns = selectClause.split(',')
          .map(col => col.trim().split(/\s+as\s+/i)[0].replace(/[`"']/g, ''))
          .filter(col => col);
      }

      // Validate columns
      const validColumns = columns.filter(col =>
        table.columns.some(tableCol => tableCol.name.toLowerCase() === col.toLowerCase())
      );

      if (validColumns.length === 0 && columns.length > 0) {
        return {
          success: false,
          output: '',
          error: `Invalid column(s) specified. Available columns: ${table.columns.map(c => c.name).join(', ')}`,
          queryType: 'SELECT'
        };
      }

      // Start with all data
      let resultData = [...table.data];

      // Parse WHERE clause
      const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+(ORDER BY|GROUP BY|LIMIT|HAVING|$))/i) ||
        query.match(/WHERE\s+(.+)$/i);

      if (whereMatch) {
        const condition = whereMatch[1].trim();
        resultData = this.filterDataWithWhere(table, resultData, condition);
      }

      // Parse GROUP BY clause
      const groupByMatch = query.match(/GROUP BY\s+([^;]+?)(?:\s+(ORDER BY|LIMIT|HAVING|$))/i) ||
        query.match(/GROUP BY\s+([^;]+)$/i);

      if (groupByMatch) {
        const groupByColumns = groupByMatch[1].split(',').map(col => col.trim().replace(/[`"']/g, ''));
        resultData = this.groupData(table, resultData, groupByColumns, columns);
      }

      // Parse ORDER BY clause
      const orderByMatch = query.match(/ORDER BY\s+([^;]+?)(?:\s+(LIMIT|$))/i) ||
        query.match(/ORDER BY\s+([^;]+)$/i);

      if (orderByMatch) {
        const orderClause = orderByMatch[1];
        resultData = this.sortData(table, resultData, orderClause);
      }

      // Parse LIMIT clause
      const limitMatch = query.match(/LIMIT\s+(\d+)(?:\s*,\s*(\d+))?/i);
      if (limitMatch) {
        const offset = limitMatch[2] ? parseInt(limitMatch[1]) : 0;
        const limit = limitMatch[2] ? parseInt(limitMatch[2]) : parseInt(limitMatch[1]);
        resultData = resultData.slice(offset, offset + limit);
      }

      // Prepare final result with only selected columns
      const finalResult = resultData.map(row => {
        const resultRow: any = {};
        (validColumns.length > 0 ? validColumns : table.columns.map(c => c.name)).forEach(col => {
          const actualColumn = table.columns.find(c => c.name.toLowerCase() === col.toLowerCase());
          if (actualColumn) {
            resultRow[actualColumn.name] = row[actualColumn.name];
          }
        });
        return resultRow;
      });

      return {
        success: true,
        output: 'SELECT query executed successfully',
        resultSet: finalResult,
        columns: validColumns.length > 0 ? validColumns : table.columns.map(c => c.name),
        rowCount: finalResult.length,
        queryType: 'SELECT'
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `SELECT query error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryType: 'SELECT'
      };
    }
  }

  private static filterDataWithWhere(table: BrowserTable, data: any[], whereCondition: string): any[] {
    try {
      // Simple WHERE condition parser
      // Supports: =, !=, >, <, >=, <=, LIKE, IN, AND, OR
      const conditions = whereCondition.split(/\s+(?:AND|OR)\s+/i);
      const operators = whereCondition.match(/\s+(?:AND|OR)\s+/gi) || [];

      return data.filter(row => {
        let result = this.evaluateSimpleCondition(row, conditions[0], table);

        for (let i = 1; i < conditions.length; i++) {
          const op = operators[i - 1]?.trim().toUpperCase();
          const conditionResult = this.evaluateSimpleCondition(row, conditions[i], table);

          if (op === 'AND') {
            result = result && conditionResult;
          } else if (op === 'OR') {
            result = result || conditionResult;
          }
        }

        return result;
      });
    } catch (error) {
      console.error('Error filtering data:', error);
      return data;
    }
  }

  private static evaluateSimpleCondition(row: any, condition: string, table: BrowserTable): boolean {
    // Remove parentheses
    condition = condition.replace(/[()]/g, '').trim();

    // Check for IN condition
    const inMatch = condition.match(/(\w+)\s+IN\s*\(([^)]+)\)/i);
    if (inMatch) {
      const column = inMatch[1];
      const values = inMatch[2].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
      const rowValue = row[column];
      return values.some(v => this.compareValues(rowValue, v));
    }

    // Check for LIKE condition
    const likeMatch = condition.match(/(\w+)\s+LIKE\s+(['"][^'"]+['"])/i);
    if (likeMatch) {
      const column = likeMatch[1];
      const pattern = likeMatch[2].replace(/^['"]|['"]$/g, '').replace(/%/g, '.*').replace(/_/g, '.');
      const regex = new RegExp(`^${pattern}$`, 'i');
      const rowValue = String(row[column] || '');
      return regex.test(rowValue);
    }

    // Check for comparison operators
    const comparisonMatch = condition.match(/(\w+)\s*(=|!=|>|<|>=|<=|<>)\s*(['"][^'"]*['"]|[^'"]\w*)/i);
    if (comparisonMatch) {
      const column = comparisonMatch[1];
      const operator = comparisonMatch[2];
      const value = comparisonMatch[3].replace(/^['"]|['"]$/g, '');
      const rowValue = row[column];

      switch (operator) {
        case '=': return this.compareValues(rowValue, value);
        case '!=': case '<>': return !this.compareValues(rowValue, value);
        case '>': return this.greaterThan(rowValue, value);
        case '<': return this.lessThan(rowValue, value);
        case '>=': return this.compareValues(rowValue, value) || this.greaterThan(rowValue, value);
        case '<=': return this.compareValues(rowValue, value) || this.lessThan(rowValue, value);
        default: return true;
      }
    }

    return true;
  }

  private static compareValues(a: any, b: any): boolean {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    // Try numeric comparison
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA === numB;
    }

    // String comparison (case-insensitive)
    return String(a).toLowerCase() === String(b).toLowerCase();
  }

  private static greaterThan(a: any, b: any): boolean {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA > numB;
    }
    return String(a).toLowerCase() > String(b).toLowerCase();
  }

  private static lessThan(a: any, b: any): boolean {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA < numB;
    }
    return String(a).toLowerCase() < String(b).toLowerCase();
  }

  private static groupData(table: BrowserTable, data: any[], groupByColumns: string[], selectColumns: string[]): any[] {
    // Simple grouping - just return unique groups
    const groups = new Map<string, any>();

    data.forEach(row => {
      const groupKey = groupByColumns.map(col => row[col]).join('|');
      if (!groups.has(groupKey)) {
        const groupRow: any = {};
        selectColumns.forEach(col => {
          groupRow[col] = row[col];
        });
        groups.set(groupKey, groupRow);
      }
    });

    return Array.from(groups.values());
  }

  private static sortData(table: BrowserTable, data: any[], orderClause: string): any[] {
    const sortSpecs = orderClause.split(',').map(spec => {
      const parts = spec.trim().split(/\s+/);
      return {
        column: parts[0].replace(/[`"']/g, ''),
        direction: (parts[1] || 'ASC').toUpperCase()
      };
    });

    return [...data].sort((a, b) => {
      for (const spec of sortSpecs) {
        const valA = a[spec.column];
        const valB = b[spec.column];

        // Handle nulls
        if (valA == null && valB == null) continue;
        if (valA == null) return spec.direction === 'ASC' ? -1 : 1;
        if (valB == null) return spec.direction === 'ASC' ? 1 : -1;

        const comparison = this.compareForSort(valA, valB);
        if (comparison !== 0) {
          return spec.direction === 'DESC' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  private static compareForSort(a: any, b: any): number {
    // Try numeric comparison first
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    // String comparison
    return String(a).localeCompare(String(b));
  }

  private static executeCreateTableQuery(database: BrowserDatabase, query: string): ExecutionResult {
    try {
      // Extract table name and column definitions
      const tableMatch = query.match(/CREATE TABLE\s+(\w+)\s*\(([\s\S]+?)\)(?:\s*ENGINE\s*=\s*(\w+))?(?:\s*DEFAULT\s*CHARSET\s*=\s*(\w+))?/i);
      if (!tableMatch) {
        return {
          success: false,
          output: '',
          error: 'Invalid CREATE TABLE syntax',
          queryType: 'CREATE'
        };
      }

      const tableName = tableMatch[1].trim();
      const columnsDef = tableMatch[2];
      const engine = tableMatch[3] || 'InnoDB';
      const charset = tableMatch[4] || 'utf8mb4';

      // Check if table already exists
      if (database.tables.some(t => t.name.toLowerCase() === tableName.toLowerCase())) {
        return {
          success: false,
          output: '',
          error: `Table "${tableName}" already exists`,
          queryType: 'CREATE'
        };
      }

      const columns: BrowserColumn[] = [];
      const constraints: TableConstraint[] = [];

      // Split by comma, but handle parentheses for complex types
      const columnDefs: string[] = [];
      let current = '';
      let parenDepth = 0;

      for (let i = 0; i < columnsDef.length; i++) {
        const char = columnsDef[i];

        if (char === '(') {
          parenDepth++;
          current += char;
        } else if (char === ')') {
          parenDepth--;
          current += char;
        } else if (char === ',' && parenDepth === 0) {
          if (current.trim()) {
            columnDefs.push(current.trim());
          }
          current = '';
        } else {
          current += char;
        }
      }

      // Add the last definition
      if (current.trim()) {
        columnDefs.push(current.trim());
      }

      // Parse each column definition
      columnDefs.forEach(def => {
        const defUpper = def.toUpperCase();

        // Skip if it's a constraint
        if (defUpper.includes('PRIMARY KEY') || defUpper.includes('FOREIGN KEY') ||
          defUpper.includes('UNIQUE') || defUpper.includes('CHECK')) {

          // Handle PRIMARY KEY constraint
          if (defUpper.includes('PRIMARY KEY')) {
            const pkMatch = def.match(/PRIMARY KEY\s*\(([^)]+)\)/i);
            if (pkMatch) {
              const pkColumns = pkMatch[1].split(',').map(c => c.trim().replace(/[`"']/g, ''));
              constraints.push({
                type: 'PRIMARY_KEY',
                name: 'PRIMARY',
                columns: pkColumns
              });
            }
          }
          return;
        }

        // Parse column definition - FIXED VERSION
        // Extract column name (can be wrapped in backticks, quotes, or plain)
        const nameMatch = def.match(/^[`"']?([\w]+)[`"']?\s+/);
        if (!nameMatch) {
          console.warn('Could not parse column name from:', def);
          return;
        }

        const name = nameMatch[1];
        const rest = def.substring(nameMatch[0].length);

        // Extract data type
        const typeMatch = rest.match(/^(\w+(?:\(\d+(?:,\s*\d+)?\))?)/i);
        if (!typeMatch) {
          console.warn('Could not parse data type from:', rest);
          return;
        }

        const fullType = typeMatch[1].toUpperCase();
        const baseType = fullType.replace(/\(\d+(?:,\s*\d+)?\)/, '');
        const type = baseType as BrowserColumn['type'];

        // Parse length if present
        let length: number | undefined;
        const lengthMatch = fullType.match(/\((\d+)(?:,\s*\d+)?\)/);
        if (lengthMatch) {
          length = parseInt(lengthMatch[1]);
        }

        // Determine column properties
        const nullable = !defUpper.includes('NOT NULL');
        const primaryKey = defUpper.includes('PRIMARY KEY');
        const autoIncrement = defUpper.includes('AUTO_INCREMENT');
        const unique = defUpper.includes('UNIQUE');

        // Parse default value
        let defaultValue: any = undefined;
        const defaultMatch = def.match(/DEFAULT\s+(['"`]?[^,\s]+['"`]?)/i);
        if (defaultMatch) {
          let defaultVal = defaultMatch[1];
          if (defaultVal.toUpperCase() === 'NULL') {
            defaultValue = null;
          } else if (defaultVal.toUpperCase() === 'CURRENT_TIMESTAMP') {
            defaultValue = 'CURRENT_TIMESTAMP';
          } else {
            // Remove quotes
            defaultVal = defaultVal.replace(/^['"`]|['"`]$/g, '');
            defaultValue = defaultVal;
          }
        }

        columns.push({
          name,  // This was "undefined" before - FIXED
          type,
          length,
          nullable,
          primaryKey,
          autoIncrement,
          unique,
          defaultValue
        });
      });

      // Create the table
      const newTable: BrowserTable = {
        name: tableName,
        columns,
        data: [],
        indexes: [],
        constraints,
        engine,
        charset
      };

      database.tables.push(newTable);

      return {
        success: true,
        output: `Table "${tableName}" created successfully with ${columns.length} columns`,
        affectedRows: 0,
        queryType: 'CREATE'
      };

    } catch (error) {
      console.error('CREATE TABLE error:', error);
      return {
        success: false,
        output: '',
        error: `CREATE TABLE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryType: 'CREATE'
      };
    }
  }
  private static executeInsertQuery(database: BrowserDatabase, query: string): ExecutionResult {
    try {
      // Parse INSERT query
      const insertMatch = query.match(/INSERT\s+INTO\s+(\w+)\s*(?:\(([^)]+)\))?\s*VALUES\s*(.+)/is);
      if (!insertMatch) {
        return {
          success: false,
          output: '',
          error: 'Invalid INSERT syntax',
          queryType: 'INSERT'
        };
      }

      const tableName = insertMatch[1].trim();
      const columnsStr = insertMatch[2];
      const valuesStr = insertMatch[3];

      const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());
      if (!table) {
        return {
          success: false,
          output: '',
          error: `Table "${tableName}" does not exist`,
          queryType: 'INSERT'
        };
      }

      // Parse column names
      let columnNames: string[];
      if (columnsStr) {
        columnNames = columnsStr.split(',').map(c => c.trim().replace(/[`"']/g, ''));
      } else {
        // If no columns specified, use all columns
        columnNames = table.columns.map(col => col.name);
      }

      // Parse values using the fixed method
      const valueSets = this.parseInsertValues(valuesStr);
      console.log('Parsed value sets:', valueSets); // Debug log

      let insertedCount = 0;

      valueSets.forEach(valueSet => {
        console.log('Processing value set:', valueSet); // Debug log

        const newRow: any = {};

        // Map values to columns
        columnNames.forEach((colName, index) => {
          if (index < valueSet.length) {
            const column = table.columns.find(c => c.name.toLowerCase() === colName.toLowerCase());
            if (column) {
              let value = valueSet[index];

              // Handle NULL
              if (value.toUpperCase() === 'NULL') {
                newRow[column.name] = null;
              }
              // Handle DEFAULT
              else if (value.toUpperCase() === 'DEFAULT') {
                newRow[column.name] = column.defaultValue;
              }
              // Handle auto-increment for primary key
              else if (column.autoIncrement && column.primaryKey) {
                // Find max ID
                const maxId = table.data.reduce((max, row) => {
                  const rowVal = row[column.name];
                  return (rowVal > max) ? rowVal : max;
                }, 0);
                newRow[column.name] = maxId + 1;
              }
              else {
                // Clean the value
                value = value.trim();

                // Remove surrounding quotes
                if ((value.startsWith("'") && value.endsWith("'")) ||
                  (value.startsWith('"') && value.endsWith('"')) ||
                  (value.startsWith('`') && value.endsWith('`'))) {
                  value = value.substring(1, value.length - 1);
                }

                // Convert based on column type
                if (column.type.includes('INT') || column.type === 'BIGINT') {
                  newRow[column.name] = parseInt(value) || 0;
                } else if (column.type.includes('DECIMAL') || column.type.includes('FLOAT') || column.type.includes('DOUBLE')) {
                  newRow[column.name] = parseFloat(value) || 0;
                } else if (column.type === 'BOOLEAN') {
                  newRow[column.name] = value.toLowerCase() === 'true' || value === '1';
                } else {
                  // String types
                  newRow[column.name] = value;
                }
              }
            }
          }
        });

        // Fill missing columns
        table.columns.forEach(column => {
          if (newRow[column.name] === undefined) {
            if (column.autoIncrement && column.primaryKey) {
              const maxId = table.data.reduce((max, row) => {
                const rowVal = row[column.name];
                return (rowVal > max) ? rowVal : max;
              }, 0);
              newRow[column.name] = maxId + 1;
            } else if (column.defaultValue !== undefined) {
              newRow[column.name] = column.defaultValue;
            } else if (column.nullable) {
              newRow[column.name] = null;
            } else {
              // Default values based on type
              if (column.type.includes('INT') || column.type.includes('DECIMAL')) {
                newRow[column.name] = 0;
              } else if (column.type === 'BOOLEAN') {
                newRow[column.name] = false;
              } else {
                newRow[column.name] = '';
              }
            }
          }
        });

        console.log('New row to insert:', newRow); // Debug log
        table.data.push(newRow);
        insertedCount++;
      });

      return {
        success: true,
        output: `${insertedCount} row${insertedCount !== 1 ? 's' : ''} inserted into ${tableName}`,
        affectedRows: insertedCount,
        queryType: 'INSERT'
      };

    } catch (error) {
      console.error('INSERT error:', error);
      return {
        success: false,
        output: '',
        error: `INSERT error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryType: 'INSERT'
      };
    }
  }

  // Also fix the parseInsertValues method:
  private static parseInsertValues(valuesStr: string): string[][] {
    const valueSets: string[][] = [];
    let currentSet: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    let quoteChar = '';
    let parenDepth = 0;

    // Clean the input string
    let str = valuesStr.trim();

    // Remove the word VALUES if present
    if (str.toUpperCase().startsWith('VALUES')) {
      str = str.substring(6).trim();
    }

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const nextChar = i < str.length - 1 ? str[i + 1] : '';

      // Handle parentheses
      if (char === '(') {
        if (parenDepth === 0) {
          // Start of a new value set
          currentSet = [];
          currentValue = '';
        } else {
          currentValue += char;
        }
        parenDepth++;
      }
      else if (char === ')') {
        parenDepth--;
        if (parenDepth === 0) {
          // End of a value set
          if (currentValue.trim()) {
            currentSet.push(currentValue.trim());
          }
          if (currentSet.length > 0) {
            valueSets.push([...currentSet]);
          }
          currentValue = '';
          currentSet = [];
        } else {
          currentValue += char;
        }
      }
      // Handle quotes
      else if ((char === "'" || char === '"') && (i === 0 || str[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
        }
        currentValue += char;
      }
      // Handle commas (value separators)
      else if (char === ',' && !inQuotes) {
        if (parenDepth === 1) {
          // This comma separates values within the same set
          if (currentValue.trim()) {
            currentSet.push(currentValue.trim());
          }
          currentValue = '';
        } else if (parenDepth === 0) {
          // This comma separates value sets, ignore
          continue;
        } else {
          currentValue += char;
        }
      }
      // Handle everything else
      else {
        currentValue += char;
      }
    }

    // Handle any remaining value (shouldn't happen with valid SQL)
    if (currentValue.trim() && parenDepth === 0) {
      currentSet.push(currentValue.trim());
      if (currentSet.length > 0) {
        valueSets.push([...currentSet]);
      }
    }

    return valueSets;
  }

  private static executeUpdateQuery(database: BrowserDatabase, query: string): ExecutionResult {
    try {
      const updateMatch = query.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?/is);
      if (!updateMatch) {
        return {
          success: false,
          output: '',
          error: 'Invalid UPDATE syntax',
          queryType: 'UPDATE'
        };
      }

      const tableName = updateMatch[1];
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];

      const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());
      if (!table) {
        return {
          success: false,
          output: '',
          error: `Table "${tableName}" does not exist`,
          queryType: 'UPDATE'
        };
      }

      // Parse SET clause
      const setPairs = setClause.split(',').map(pair => {
        const [col, val] = pair.split('=').map(p => p.trim());
        return {
          column: col.replace(/[`"']/g, ''),
          value: val
        };
      });

      let updatedCount = 0;

      table.data.forEach(row => {
        // Apply WHERE clause if exists
        let shouldUpdate = true;
        if (whereClause) {
          shouldUpdate = this.evaluateSimpleCondition(row, whereClause, table);
        }

        if (shouldUpdate) {
          setPairs.forEach(pair => {
            let value = pair.value;

            // Handle NULL
            if (value.toUpperCase() === 'NULL') {
              row[pair.column] = null;
            }
            // Handle DEFAULT
            else if (value.toUpperCase() === 'DEFAULT') {
              const column = table.columns.find(c => c.name === pair.column);
              row[pair.column] = column?.defaultValue;
            }
            // Remove quotes and convert
            else {
              value = value.replace(/^['"]|['"]$/g, '');
              const column = table.columns.find(c => c.name === pair.column);

              if (column?.type.includes('INT') || column?.type.includes('DECIMAL') || column?.type.includes('FLOAT') || column?.type.includes('DOUBLE')) {
                row[pair.column] = parseFloat(value);
              } else if (column?.type.includes('DATE') || column?.type.includes('TIME')) {
                row[pair.column] = new Date(value);
              } else if (column?.type === 'BOOLEAN') {
                row[pair.column] = value.toLowerCase() === 'true' || value === '1';
              } else {
                row[pair.column] = value;
              }
            }
          });
          updatedCount++;
        }
      });

      return {
        success: true,
        output: `${updatedCount} row${updatedCount !== 1 ? 's' : ''} updated`,
        affectedRows: updatedCount,
        queryType: 'UPDATE'
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `UPDATE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryType: 'UPDATE'
      };
    }
  }

  private static executeDeleteQuery(database: BrowserDatabase, query: string): ExecutionResult {
    try {
      const deleteMatch = query.match(/DELETE FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/is);
      if (!deleteMatch) {
        return {
          success: false,
          output: '',
          error: 'Invalid DELETE syntax',
          queryType: 'DELETE'
        };
      }

      const tableName = deleteMatch[1];
      const whereClause = deleteMatch[2];

      const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());
      if (!table) {
        return {
          success: false,
          output: '',
          error: `Table "${tableName}" does not exist`,
          queryType: 'DELETE'
        };
      }

      let deletedCount = 0;

      if (whereClause) {
        // Delete rows matching WHERE clause
        table.data = table.data.filter(row => {
          const shouldDelete = this.evaluateSimpleCondition(row, whereClause, table);
          if (shouldDelete) deletedCount++;
          return !shouldDelete;
        });
      } else {
        // Delete all rows
        deletedCount = table.data.length;
        table.data = [];
      }

      return {
        success: true,
        output: `${deletedCount} row${deletedCount !== 1 ? 's' : ''} deleted`,
        affectedRows: deletedCount,
        queryType: 'DELETE'
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `DELETE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryType: 'DELETE'
      };
    }
  }

  private static executeDropTableQuery(database: BrowserDatabase, query: string): ExecutionResult {
    try {
      const dropMatch = query.match(/DROP TABLE\s+(\w+)/i);
      if (!dropMatch) {
        return {
          success: false,
          output: '',
          error: 'Invalid DROP TABLE syntax',
          queryType: 'DROP'
        };
      }

      const tableName = dropMatch[1];
      const tableIndex = database.tables.findIndex(t => t.name.toLowerCase() === tableName.toLowerCase());

      if (tableIndex === -1) {
        return {
          success: false,
          output: '',
          error: `Table "${tableName}" does not exist`,
          queryType: 'DROP'
        };
      }

      database.tables.splice(tableIndex, 1);

      return {
        success: true,
        output: `Table "${tableName}" dropped`,
        affectedRows: 0,
        queryType: 'DROP'
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `DROP TABLE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryType: 'DROP'
      };
    }
  }

  private static executeTruncateTableQuery(database: BrowserDatabase, query: string): ExecutionResult {
    try {
      const truncateMatch = query.match(/TRUNCATE TABLE\s+(\w+)/i);
      if (!truncateMatch) {
        return {
          success: false,
          output: '',
          error: 'Invalid TRUNCATE syntax',
          queryType: 'TRUNCATE'
        };
      }

      const tableName = truncateMatch[1];
      const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());

      if (!table) {
        return {
          success: false,
          output: '',
          error: `Table "${tableName}" does not exist`,
          queryType: 'TRUNCATE'
        };
      }

      const rowCount = table.data.length;
      table.data = [];

      return {
        success: true,
        output: `Table "${tableName}" truncated`,
        affectedRows: rowCount,
        queryType: 'TRUNCATE'
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `TRUNCATE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryType: 'TRUNCATE'
      };
    }
  }

  private static executeShowTablesQuery(database: BrowserDatabase): ExecutionResult {
    const tables = database.tables.map(table => ({
      Tables_in_database: table.name,
      Table_type: 'BASE TABLE',
      Engine: table.engine || 'InnoDB',
      Rows: table.data.length,
      Create_time: database.createdAt.toISOString().split('T')[0],
      Collation: table.charset ? `${table.charset}_general_ci` : 'utf8mb4_general_ci'
    }));

    return {
      success: true,
      output: `Tables in ${database.name}`,
      resultSet: tables,
      columns: ['Tables_in_database', 'Table_type', 'Engine', 'Rows', 'Create_time', 'Collation'],
      rowCount: tables.length,
      queryType: 'SHOW'
    };
  }

  private static executeDescribeQuery(database: BrowserDatabase, query: string): ExecutionResult {
    try {
      const describeMatch = query.match(/(?:DESCRIBE|DESC)\s+(\w+)/i);
      if (!describeMatch) {
        return {
          success: false,
          output: '',
          error: 'Invalid DESCRIBE syntax',
          queryType: 'DESCRIBE'
        };
      }

      const tableName = describeMatch[1];
      const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());

      if (!table) {
        return {
          success: false,
          output: '',
          error: `Table "${tableName}" does not exist`,
          queryType: 'DESCRIBE'
        };
      }

      const columnsInfo = table.columns.map(col => ({
        Field: col.name,
        Type: col.length ? `${col.type}(${col.length})` : col.type,
        Null: col.nullable ? 'YES' : 'NO',
        Key: col.primaryKey ? 'PRI' : col.unique ? 'UNI' : '',
        Default: col.defaultValue !== undefined ? String(col.defaultValue) : 'NULL',
        Extra: col.autoIncrement ? 'auto_increment' : ''
      }));

      return {
        success: true,
        output: `Structure of table "${tableName}"`,
        resultSet: columnsInfo,
        columns: ['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'],
        rowCount: columnsInfo.length,
        queryType: 'DESCRIBE'
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `DESCRIBE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryType: 'DESCRIBE'
      };
    }
  }

  private static executeAlterTableQuery(database: BrowserDatabase, query: string): ExecutionResult {
    // Simplified ALTER TABLE implementation
    return {
      success: true,
      output: 'ALTER TABLE executed (simulated)',
      affectedRows: 0,
      queryType: 'ALTER'
    };
  }

  private static executeCreateDatabaseQuery(database: BrowserDatabase, query: string): ExecutionResult {
    try {
      const createMatch = query.match(/CREATE DATABASE\s+(\w+)/i);
      if (!createMatch) {
        return {
          success: false,
          output: '',
          error: 'Invalid CREATE DATABASE syntax',
          queryType: 'CREATE'
        };
      }

      const dbName = createMatch[1];
      this.createDatabase(dbName);

      return {
        success: true,
        output: `Database "${dbName}" created`,
        affectedRows: 0,
        queryType: 'CREATE'
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `CREATE DATABASE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryType: 'CREATE'
      };
    }
  }

  private static executeDropDatabaseQuery(database: BrowserDatabase, query: string): ExecutionResult {
    try {
      const dropMatch = query.match(/DROP DATABASE\s+(\w+)/i);
      if (!dropMatch) {
        return {
          success: false,
          output: '',
          error: 'Invalid DROP DATABASE syntax',
          queryType: 'DROP'
        };
      }

      const dbName = dropMatch[1];
      this.deleteDatabase(dbName);

      return {
        success: true,
        output: `Database "${dbName}" dropped`,
        affectedRows: 0,
        queryType: 'DROP'
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `DROP DATABASE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryType: 'DROP'
      };
    }
  }

  private static executeUseQuery(database: BrowserDatabase, query: string): ExecutionResult {
    try {
      const useMatch = query.match(/USE\s+(\w+)/i);
      if (!useMatch) {
        return {
          success: false,
          output: '',
          error: 'Invalid USE syntax',
          queryType: 'USE'
        };
      }

      const dbName = useMatch[1];
      const databases = this.getDatabases();
      const targetDb = databases.find(db => db.name.toLowerCase() === dbName.toLowerCase());

      if (!targetDb) {
        return {
          success: false,
          output: '',
          error: `Database "${dbName}" not found`,
          queryType: 'USE'
        };
      }

      this.setCurrentDatabase(dbName);

      return {
        success: true,
        output: `Database changed to "${dbName}"`,
        affectedRows: 0,
        queryType: 'USE'
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `USE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryType: 'USE'
      };
    }
  }

  private static executeShowDatabasesQuery(): ExecutionResult {
    const databases = this.getDatabases();
    const dbInfo = databases.map(db => ({
      Database: db.name,
      Size: '0 KB', // Simplified
      Created: db.createdAt.toISOString().split('T')[0]
    }));

    return {
      success: true,
      output: 'Databases',
      resultSet: dbInfo,
      columns: ['Database', 'Size', 'Created'],
      rowCount: dbInfo.length,
      queryType: 'SHOW'
    };
  }

  private static executeExplainQuery(database: BrowserDatabase, query: string): ExecutionResult {
    // Simplified EXPLAIN implementation
    const explainResult = [{
      id: 1,
      select_type: 'SIMPLE',
      table: 'table',
      partitions: null,
      type: 'ALL',
      possible_keys: null,
      key: null,
      key_len: null,
      ref: null,
      rows: 1,
      filtered: 100.00,
      Extra: 'Using where'
    }];

    return {
      success: true,
      output: 'EXPLAIN result',
      resultSet: explainResult,
      columns: ['id', 'select_type', 'table', 'partitions', 'type', 'possible_keys', 'key', 'key_len', 'ref', 'rows', 'filtered', 'Extra'],
      rowCount: 1,
      queryType: 'EXPLAIN'
    };
  }

  private static executeCreateIndexQuery(database: BrowserDatabase, query: string): ExecutionResult {
    // Simplified CREATE INDEX implementation
    return {
      success: true,
      output: 'Index created (simulated)',
      affectedRows: 0,
      queryType: 'CREATE'
    };
  }

  private static executeDropIndexQuery(database: BrowserDatabase, query: string): ExecutionResult {
    // Simplified DROP INDEX implementation
    return {
      success: true,
      output: 'Index dropped (simulated)',
      affectedRows: 0,
      queryType: 'DROP'
    };
  }

  private static executeBeginTransaction(database: BrowserDatabase): ExecutionResult {
    // Simplified transaction handling
    return {
      success: true,
      output: 'Transaction started',
      affectedRows: 0,
      queryType: 'BEGIN'
    };
  }

  private static executeCommitTransaction(database: BrowserDatabase): ExecutionResult {
    // Simplified transaction handling
    return {
      success: true,
      output: 'Transaction committed',
      affectedRows: 0,
      queryType: 'COMMIT'
    };
  }

  private static executeRollbackTransaction(database: BrowserDatabase): ExecutionResult {
    // Simplified transaction handling
    return {
      success: true,
      output: 'Transaction rolled back',
      affectedRows: 0,
      queryType: 'ROLLBACK'
    };
  }

  private static saveDatabase(database: BrowserDatabase): void {
    const databases = this.getDatabases();
    const dbIndex = databases.findIndex(db => db.name === database.name);

    if (dbIndex !== -1) {
      databases[dbIndex] = database;
    } else {
      databases.push(database);
    }

    this.saveDatabases(databases);
  }
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

const AddQuestionForm: React.FC<AddQuestionFormProps> = ({ exerciseData, tabType, onClose, onSave }) => {
  // Debug: Log the exercise data
  useEffect(() => {
    console.log('📋 Exercise Data Received in AddQuestionForm:', exerciseData);
    console.log('📋 Exercise ID:', exerciseData.exerciseId);
  }, [exerciseData]);

  // --- MODULE DETECTION LOGIC ---
  const selectedModule = exerciseData.fullExerciseData?.programmingSettings?.selectedModule?.toLowerCase();
  const isFrontendModule = selectedModule === 'frontend';
  const isDatabaseModule = ['mysql', 'sqlite', 'postgresql', 'mongodb', 'database'].includes(selectedModule || '');
  const isProgrammingModule = !isFrontendModule && !isDatabaseModule;

  const nodeType = exerciseData.nodeType;
  const nodeId = exerciseData.nodeId;

  // Get supported languages
  const supportedLanguages = exerciseData.selectedLanguages || ['python', 'javascript', 'java', 'mysql'];

  // Set default language based on module
  let defaultLanguage = supportedLanguages[0]?.toLowerCase() || 'python';
  if (isDatabaseModule) {
    const dbLanguages = supportedLanguages.filter(lang =>
      ['mysql', 'sqlite', 'postgresql', 'mongodb'].includes(lang.toLowerCase())
    );
    if (dbLanguages.length > 0) {
      defaultLanguage = dbLanguages[0].toLowerCase();
    } else {
      defaultLanguage = 'mysql';
    }
  }

  const [activeTab, setActiveTab] = useState<'question' | 'compiler' | 'testcases'>('question');
  const [showToast, setShowToast] = useState(false);

  // Browser database state
  const [databases, setDatabases] = useState<BrowserDatabase[]>([]);
  const [currentDatabase, setCurrentDatabase] = useState<BrowserDatabase | null>(null);
  const [databaseStructure, setDatabaseStructure] = useState<BrowserTable[]>([]);
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [newDatabaseDescription, setNewDatabaseDescription] = useState('');
  const [isCreatingDatabase, setIsCreatingDatabase] = useState(false);
  const [isImportingDatabase, setIsImportingDatabase] = useState(false);
  const [importData, setImportData] = useState('');
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [showQueryHistory, setShowQueryHistory] = useState(false);
  const [activeQueryView, setActiveQueryView] = useState<QueryResultView | null>(null);
  const [queryViews, setQueryViews] = useState<QueryResultView[]>([]);
  const [showQueryViews, setShowQueryViews] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'light'>('light');

  // Compiler tab specific states
  const [compilerCode, setCompilerCode] = useState<string>('');
  const [compilerLanguage, setCompilerLanguage] = useState<string>(defaultLanguage);
  const [compilerInput, setCompilerInput] = useState<string>('');
  const [compilerOutput, setCompilerOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Determine evaluation mode
  const isAutomationMode = exerciseData.evaluationSettings?.automationEvaluation;
  const isAIMode = exerciseData.evaluationSettings?.aiEvaluation;
  const isPracticeMode = exerciseData.evaluationSettings?.practiceMode;
  const isManualMode = exerciseData.evaluationSettings?.manualEvaluation?.enabled;
  const [hints, setHints] = useState<Array<{ hintText: string, pointsDeduction: number, isPublic: boolean, sequence: number }>>([]);

  // Add hint functions
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
  // Initialize compiler code
  useEffect(() => {
    if (isDatabaseModule) {
      setCompilerCode(LANGUAGE_TEMPLATES[defaultLanguage] || `-- Write your ${defaultLanguage} query here\n\n`);
    } else {
      setCompilerCode(LANGUAGE_TEMPLATES[defaultLanguage] || `// Write your ${defaultLanguage} code here\n\n`);
    }
  }, [defaultLanguage, isDatabaseModule]);

  // Load databases on component mount
  useEffect(() => {
    if (isDatabaseModule) {
      loadDatabases();
      loadQueryHistory();
      loadQueryViews();
    }
  }, [isDatabaseModule]);

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

    const table = currentDatabase.tables.find(t => t.name === tableName);
    if (table) {
      setTableData(table.data.slice(0, 100)); // Limit to 100 rows for performance
      setTableColumns(table.columns.map(col => col.name));
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

    const result = await BrowserDatabaseManager.executeQuery(currentDatabase.name, query);

    // Refresh UI if needed
    if (result.success && result.queryType && ['CREATE', 'DROP', 'ALTER', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'].includes(result.queryType)) {
      // Refresh database structure
      const updatedDb = BrowserDatabaseManager.getCurrentDatabase();
      if (updatedDb) {
        setCurrentDatabase(updatedDb);
        setDatabaseStructure(updatedDb.tables);

        // Refresh current table data if exists
        if (selectedTable) {
          const tableExists = updatedDb.tables.some(t => t.name === selectedTable);
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

    // Add to local state
    loadQueryHistory();

    return result;
  };

  // Execute programming language code (simulated in browser)
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

            // Create a safe execution context
            const codeToExecute = compilerCode;

            // Try to execute as a function
            if (codeToExecute.includes('function') || codeToExecute.includes('console.log')) {
              // Use eval in a controlled way (for demo only - in production use a sandbox)
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
      setCompilerOutput('❌ Please write some code or query first\n');
      return;
    }

    setIsExecuting(true);
    let newOutput = '🚀 Executing...\n\n';

    try {
      let result: ExecutionResult;

      if (isDatabaseModule) {
        // Split queries by semicolon, but be careful with semicolons inside strings
        const queries = compilerCode.split(';').filter(q => {
          const clean = q.trim().replace(/[;=]+$/, '');
          return clean !== '';
        });

        if (queries.length > 1) {
          // Execute multiple queries
          let combinedResult: ExecutionResult = {
            success: true,
            output: '',
            executionTime: 0,
            affectedRows: 0
          };

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

          combinedResult.output = `${queries.length} queries executed successfully`;
          result = combinedResult;
        } else {
          // Single query
          result = await executeDatabaseQuery(compilerCode.trim());
        }
      } else {
        result = await executeProgrammingCode();
      }

      if (result.success) {
        if (isDatabaseModule) {
          newOutput += `✅ ${result.queryType || 'Query'} executed successfully!\n\n`;

          // Database info
          if (result.database) {
            newOutput += `📊 Database: ${result.database}\n`;
          }

          // Execution time
          if (result.executionTime) {
            newOutput += `⏱️  Execution Time: ${result.executionTime.toFixed(2)}ms\n`;
          }

          // Memory usage
          if (result.memory) {
            newOutput += `💾 Memory Used: ${result.memory.toFixed(2)}MB\n`;
          }

          // Query type
          if (result.queryType) {
            newOutput += `📋 Query Type: ${result.queryType}\n`;
          }

          // Handle SELECT queries - show the actual data
          if (result.queryType === 'SELECT') {
            newOutput += `📈 Row Count: ${result.rowCount || 0}\n`;

            if (result.resultSet && result.resultSet.length > 0) {
              newOutput += '\n📊 Query Results:\n';
              newOutput += '='.repeat(80) + '\n';

              // Get column names - use result.columns if available, otherwise from first row
              let columns = result.columns;
              if (!columns || columns.length === 0) {
                // Extract columns from the first row
                const firstRow = result.resultSet[0];
                if (firstRow && typeof firstRow === 'object') {
                  columns = Object.keys(firstRow);
                }
              }

              // Display results in a table format
              if (columns && columns.length > 0) {
                // Calculate column widths
                const colWidths: number[] = [];
                columns.forEach((col, index) => {
                  // Start with column name width
                  let maxWidth = col.length;

                  // Check data widths in this column
                  result.resultSet!.forEach(row => {
                    const value = row[col];
                    const strValue = value === null ? 'NULL' :
                      value === undefined ? 'UNDEFINED' :
                        String(value);
                    maxWidth = Math.max(maxWidth, Math.min(strValue.length, 30));
                  });

                  colWidths[index] = Math.min(maxWidth + 2, 32); // Add padding
                });

                // Create header
                let header = '|';
                columns.forEach((col, index) => {
                  header += ' ' + col.padEnd(colWidths[index]) + ' |';
                });
                newOutput += header + '\n';

                // Create separator
                let separator = '|';
                columns.forEach((col, index) => {
                  separator += '-' + '-'.repeat(colWidths[index]) + '-|';
                });
                newOutput += separator + '\n';

                // Add rows (limit to 50 for display)
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
                      displayValue = value.toISOString().split('T')[0]; // Just date
                    } else if (typeof value === 'object') {
                      try {
                        displayValue = JSON.stringify(value).substring(0, 25) + '...';
                      } catch {
                        displayValue = '[Object]';
                      }
                    } else {
                      displayValue = String(value);
                    }

                    // Truncate if too long
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
                // Fallback display
                newOutput += JSON.stringify(result.resultSet, null, 2) + '\n';
              }
              newOutput += '='.repeat(80) + '\n';
            } else {
              newOutput += `\nℹ️  Query returned 0 rows.\n`;
            }
          }
          // Handle INSERT, UPDATE, DELETE queries
          else if (result.queryType && ['INSERT', 'UPDATE', 'DELETE'].includes(result.queryType)) {
            if (result.affectedRows) {
              newOutput += `📈 Affected Rows: ${result.affectedRows}\n`;
            }
            if (result.message) {
              newOutput += `📝 Message: ${result.message}\n`;
            }
            if (result.output) {
              newOutput += `${result.output}\n`;
            }
          }
          // Handle CREATE, ALTER, DROP queries
          else if (result.queryType && ['CREATE', 'ALTER', 'DROP'].includes(result.queryType)) {
            newOutput += `📝 Message: ${result.message || 'Table operation completed successfully'}\n`;
          }
          // Handle SHOW, DESCRIBE queries
          else if (result.queryType && ['SHOW', 'DESCRIBE'].includes(result.queryType)) {
            if (result.resultSet && result.resultSet.length > 0) {
              newOutput += '\n📋 Result:\n';
              newOutput += '='.repeat(80) + '\n';

              const columns = result.columns || [];
              if (columns.length > 0) {
                // Calculate column widths
                const colWidths: number[] = [];
                columns.forEach((col, index) => {
                  let maxWidth = col.length;
                  result.resultSet!.forEach((row: any) => {
                    const value = row[col];
                    const strValue = value === null ? 'NULL' :
                      value === undefined ? 'UNDEFINED' :
                        String(value);
                    maxWidth = Math.max(maxWidth, Math.min(strValue.length, 30));
                  });
                  colWidths[index] = Math.min(maxWidth + 2, 32);
                });

                // Create header
                let header = '|';
                columns.forEach((col, index) => {
                  header += ' ' + col.padEnd(colWidths[index]) + ' |';
                });
                newOutput += header + '\n';

                // Create separator
                let separator = '|';
                columns.forEach((col, index) => {
                  separator += '-' + '-'.repeat(colWidths[index]) + '-|';
                });
                newOutput += separator + '\n';

                result.resultSet.forEach((row: any) => {
                  let rowStr = '|';
                  columns.forEach((col, index) => {
                    const value = row[col];
                    let displayValue = value === null ? 'NULL' :
                      value === undefined ? 'UNDEFINED' :
                        String(value);

                    if (displayValue.length > colWidths[index] - 1) {
                      displayValue = displayValue.substring(0, colWidths[index] - 4) + '...';
                    }

                    rowStr += ' ' + displayValue.padEnd(colWidths[index]) + ' |';
                  });
                  newOutput += rowStr + '\n';
                });
              }
              newOutput += '='.repeat(80) + '\n';
            }
          }
        } else {
          // For programming languages
          newOutput += result.output || 'Code executed successfully\n';
        }

        setCompilerOutput(prev => newOutput);
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

  const getEvaluationModeLabel = () => {
    if (!exerciseData.evaluationSettings) return 'Not specified';

    if (isPracticeMode) return 'Practice Mode';
    if (isAutomationMode) return 'Automated Evaluation';
    if (isManualMode) return 'Manual Evaluation';
    if (isAIMode) return 'AI Evaluation';

    return 'Not specified';
  };

  const getModuleTypeLabel = () => {
    if (isFrontendModule) return 'Frontend';
    if (isDatabaseModule) return 'Database';
    if (isProgrammingModule) return 'Programming';
    return 'General';
  };

  const sendQuestionToAPI = async (questionData: any) => {
    try {
      setCompilerOutput('🔄 Saving question to server...\n');

      const url = `${API_BASE_URL}/question-add/${nodeType}s/${nodeId}/exercise/${exerciseData.exerciseId}`;

      const payload = {
        ...questionData,
        tabType: tabType,
        subcategory: exerciseData.subcategory || 'Practical',
        nodeType: `${nodeType}s`,
        nodeId: nodeId,
        moduleType: getModuleTypeLabel(),
        requestTimestamp: new Date().toISOString()
      };

      console.log('📤 Sending question data:', payload);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(result.message?.[0]?.value || result.error || `HTTP error! status: ${response.status}`);
      }

      setCompilerOutput(prev => prev + `✅ Question saved successfully!\nQuestion ID: ${result.data?.question?._id || result.data?.questionId || 'Unknown'}\n`);

      return result;

    } catch (error) {
      console.error('❌ Error saving question:', error);
      setCompilerOutput(prev => prev + `❌ Error saving question: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🚀 Submitting question...');

    // Validate required fields
    if (!formData.title.trim()) {
      alert('Please enter a question title');
      return;
    }

    if (!formData.description.trim()) {
      alert('Please enter a question description');
      return;
    }

    // Mode-specific validations
    if (!isFrontendModule) {
      if (isAutomationMode) {
        if (isDatabaseModule) {
          if (databaseTestCases.length === 0) {
            alert('Please add at least one database test case');
            return;
          }
        } else if (testCases.length === 0) {
          alert('Please add at least one test case for automation evaluation');
          return;
        }
      }
    }

    // Prepare hints array
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

    // Add additional hints from hints state
    preparedHints.push(...hints);

    // Prepare test cases
    let preparedTestCases: any[] = [];
    if (isAutomationMode) {
      if (isDatabaseModule) {
        preparedTestCases = databaseTestCases.map((tc, index) => ({
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
      } else if (isProgrammingModule) {
        preparedTestCases = testCases.map((tc, index) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isSample: tc.isSample,
          isHidden: tc.isHidden,
          points: 1,
          explanation: tc.description || `Test case ${index + 1}`,
          sequence: index
        }));
      }
    }

    // Create question data
    const questionData: any = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      difficulty: formData.difficulty,
      score: formData.score,
      moduleType: getModuleTypeLabel(),
      isFrontend: isFrontendModule,
      isDatabase: isDatabaseModule,
      isProgramming: isProgrammingModule,
      sampleInput: formData.sampleInput.trim() || undefined,
      sampleOutput: formData.sampleOutput.trim() || undefined,
      constraints: formData.constraints.filter(c => c.trim() !== ''),
      hints: preparedHints,
      timeLimit: formData.timeLimit,
      memoryLimit: formData.memoryLimit,
      isActive: true,
      sequence: 0
    };

    // Add browser database config if database module
    if (isDatabaseModule && currentDatabase) {
      questionData.browserDatabaseConfig = {
        databaseName: currentDatabase.name,
        tables: currentDatabase.tables.length,
        storageType: 'localStorage'
      };
      questionData.databaseType = compilerLanguage;
    }

    // Add test cases
    if (isAutomationMode && preparedTestCases.length > 0) {
      questionData.testCases = preparedTestCases;
      if (isDatabaseModule) {
        questionData.testCaseType = 'database';
      }
    }

    console.log('📤 Final data to send:', questionData);

    try {
      const savedQuestion = await sendQuestionToAPI(questionData);
      console.log('✅ API Response received:', savedQuestion);

      if (savedQuestion) {
        const questionResult = savedQuestion.question ||
          savedQuestion.data?.question ||
          savedQuestion.data ||
          savedQuestion;

        console.log('✅ Question saved successfully:', questionResult);

        // Show toast and close
        setShowToast(true);
        setTimeout(() => {
          onSave({
            ...questionResult,
            exerciseId: exerciseData.exerciseId,
            exerciseName: exerciseData.exerciseName,
            moduleType: getModuleTypeLabel()
          });
          onClose();
        }, 1500);

        setCompilerOutput(prev => prev + `\n🎉 Question "${formData.title}" saved successfully!\n`);
      }

    } catch (error) {
      console.error('❌ Failed to save question:', error);
      alert(`Failed to save question: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  // Helper functions for form
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
    if (isDatabaseModule) {
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
    } else {
      const newTestCase: TestCase = {
        id: Date.now().toString(),
        input: '',
        expectedOutput: '',
        isHidden: false,
        isSample: false,
        description: `Test case ${testCases.length + 1}`
      };
      setTestCases([...testCases, newTestCase]);
    }
  };

  const duplicateTestCase = (testCase: TestCase | DatabaseTestCase) => {
    if (isDatabaseModule) {
      const duplicatedTestCase: DatabaseTestCase = {
        ...(testCase as DatabaseTestCase),
        id: Date.now().toString(),
        name: `${testCase.description || 'Test'} (Copy)`
      };
      setDatabaseTestCases([...databaseTestCases, duplicatedTestCase]);
    } else {
      const duplicatedTestCase: TestCase = {
        ...(testCase as TestCase),
        id: Date.now().toString(),
        description: `${testCase.description || 'Test'} (Copy)`
      };
      setTestCases([...testCases, duplicatedTestCase]);
    }
  };

  const removeTestCase = (id: string) => {
    if (isDatabaseModule) {
      if (databaseTestCases.length > 1) {
        setDatabaseTestCases(databaseTestCases.filter(tc => tc.id !== id));
      }
    } else {
      if (testCases.length > 1) {
        setTestCases(testCases.filter(tc => tc.id !== id));
      }
    }
  };

  const updateTestCase = (id: string, field: string, value: any) => {
    if (isDatabaseModule) {
      setDatabaseTestCases(databaseTestCases.map(tc =>
        tc.id === id ? { ...tc, [field]: value } : tc
      ));
    } else {
      setTestCases(testCases.map(tc =>
        tc.id === id ? { ...tc, [field]: value } : tc
      ));
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
    // If it's a frontend module, strictly only show the Question tab
    if (isFrontendModule) {
      return ['question'];
    }

    const tabs: ('question' | 'compiler' | 'testcases')[] = ['question', 'compiler'];

    if (isAutomationMode) {
      tabs.push('testcases');
    }

    return tabs;
  };
  const availableTabs = getAvailableTabs();

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5533';

  // Enhanced Database Management Component
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
                    {currentDatabase.tables.map(table => (
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
                  (Showing {tableData.length} of {currentDatabase?.tables.find(t => t.name === selectedTable)?.data.length || 0} rows)
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

  // Enhanced Compiler Tab Component
  const renderCompilerTab = () => {
    return (
      <div className="h-full flex flex-col gap-4" style={{
        minHeight: 'calc(70vh - 300px)',
        maxHeight: 'calc(70vh - 200px)'
      }}>
        {/* Top Controls Bar - Enhanced */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Language:</span>
              <select
                value={compilerLanguage}
                onChange={(e) => {
                  const newLang = e.target.value;
                  const template = LANGUAGE_TEMPLATES[newLang] ||
                    (isDatabaseModule
                      ? `-- Write your ${newLang} query here\n\n`
                      : `// Write your ${newLang} code here\n\n`);
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

            {isDatabaseModule && (
              <>
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
                      // Simple SQL formatting
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
              </>
            )}

            <button
              onClick={() => {
                const template = LANGUAGE_TEMPLATES[compilerLanguage] ||
                  (isDatabaseModule
                    ? `-- Write your ${compilerLanguage} query here\n\n`
                    : `// Write your ${compilerLanguage} code here\n\n`);
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
            {isDatabaseModule && currentDatabase && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200 shadow-sm">
                <Database className="h-3 w-3" />
                <div>
                  <div className="font-semibold">{currentDatabase.name}</div>
                  <div className="text-gray-600">{currentDatabase.tables.length} tables</div>
                </div>
              </div>
            )}
            <div className="text-sm font-medium text-gray-700">
              {compilerLanguage.toUpperCase()} {isDatabaseModule ? 'Workbench' : 'Compiler'}
            </div>
          </div>
        </div>

        {/* Database Management */}
        {isDatabaseModule && renderDatabaseManagement()}

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
                  {isDatabaseModule ? 'SQL Editor' : 'Code Editor'}
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {compilerCode.split('\n').length} lines • {compilerCode.length} chars
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={executeCompilerCode}
                    disabled={isExecuting || (isDatabaseModule && !currentDatabase)}
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
                        {isDatabaseModule ? 'Run Query (Ctrl+Enter)' : 'Run Code'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 border border-gray-300 rounded-xl overflow-hidden shadow-sm bg-white" style={{ minHeight: '300px' }}>
                <MonacoEditor
                  height="100%"
                  language={isDatabaseModule ?
                    (compilerLanguage === 'mysql' ? 'sql' : compilerLanguage) :
                    compilerLanguage}
                  value={compilerCode}
                  theme={editorTheme}
                  onChange={(value) => setCompilerCode(value || '')}
                  onMount={(editor) => {
                    // Add keyboard shortcut for execution
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                      executeCompilerCode();
                    });
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
                    // SQL specific
                    quickSuggestionsDelay: 100,
                    suggestSelection: 'first',
                    wordBasedSuggestions: 'allDocuments'
                  }}
                />
              </div>

              {/* Query Actions */}
              {isDatabaseModule && (
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
              )}

              {/* Input for programming languages */}
              {!isDatabaseModule && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Input
                  </label>
                  <textarea
                    value={compilerInput}
                    onChange={(e) => setCompilerInput(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Enter input for your program..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Output Console (60%) */}
          <div className="w-3/5 flex flex-col min-w-0" style={{ flex: '6' }}>
            {/* Output Header */}
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-600" />
                Query Results
                {isDatabaseModule && currentDatabase && (
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
                    // Copy output to clipboard
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
                              {isDatabaseModule
                                ? 'Press Ctrl+Enter to execute query'
                                : 'Press Run Code to execute'}
                            </div>
                            {isDatabaseModule && (
                              <div className="mt-4 text-xs text-gray-500">
                                <div>Tip: Use SHOW TABLES to list all tables</div>
                                <div>Tip: Use DESCRIBE table_name to see table structure</div>
                                <div>Tip: Multiple queries separated by semicolons are supported</div>
                              </div>
                            )}
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
                    <div className={`w-2 h-2 rounded-full ${isDatabaseModule
                      ? (currentDatabase ? 'bg-green-500' : 'bg-gray-400')
                      : 'bg-green-500'
                      }`}></div>
                    <span className="text-gray-700">
                      {isDatabaseModule
                        ? (currentDatabase ? 'Database Connected' : 'No Database')
                        : 'Compiler Ready'}
                    </span>
                  </div>
                  {isDatabaseModule && currentDatabase && (
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
                  {isDatabaseModule
                    ? 'Browser-based MySQL Workbench • Local Storage • No Server Required'
                    : 'Browser Execution • Simulated Runtime Environment'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'question':
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
                placeholder={isDatabaseModule
                  ? "Describe the database query problem. Include table structures, relationships, and expected results."
                  : "Describe the problem in detail. Include input format, output format, and examples."
                }
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-colors duration-200"
                required
              />
            </div>

            {/* DIFFICULTY FIELD - Show for ALL modules including frontend */}
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
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
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

            {/* HIDE PROGRAMMING-SPECIFIC FIELDS IF FRONTEND MODULE */}
            {!isFrontendModule && (
              <>
                <div className="grid grid-cols-4 gap-4">
                  {/* Time and Memory Limit */}
                  <div className={exerciseData.fullExerciseData.programmingSettings.levelConfiguration.levelType === 'general' ? 'col-span-2' : ''}>
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

                  <div className={exerciseData.fullExerciseData.programmingSettings.levelConfiguration.levelType === 'general' ? 'col-span-2' : ''}>
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
                          placeholder={isDatabaseModule
                            ? "e.g., Use only SELECT statements, No subqueries allowed"
                            : "e.g., 1 <= n <= 10^5"
                          }
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
                      Sample {isDatabaseModule ? 'Query' : 'Input'}
                    </label>
                    <textarea
                      value={formData.sampleInput}
                      onChange={(e) => setFormData({ ...formData, sampleInput: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500"
                      placeholder={isDatabaseModule
                        ? "SELECT * FROM employees WHERE department = 'IT';"
                        : "Enter sample input..."
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sample {isDatabaseModule ? 'Result' : 'Output'}
                    </label>
                    <textarea
                      value={formData.sampleOutput}
                      onChange={(e) => setFormData({ ...formData, sampleOutput: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500"
                      placeholder={isDatabaseModule
                        ? "id | name | email | department\n1 | John | john@it.com | IT\n2 | Jane | jane@it.com | IT"
                        : "Enter expected output..."
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {/* HINT FIELDS - Show for ALL modules (frontend and non-frontend) */}
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
      case 'compiler':
        return renderCompilerTab();

      case 'testcases':
        if (!isAutomationMode) return null;

        if (isDatabaseModule) {
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
        }

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

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[85vh] flex flex-col relative">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isDatabaseModule ? 'bg-cyan-100 shadow' :
              isFrontendModule ? 'bg-yellow-100 shadow' :
                isAutomationMode ? 'bg-blue-100 shadow' :
                  isAIMode ? 'bg-purple-100 shadow' :
                    isPracticeMode ? 'bg-green-100 shadow' :
                      isManualMode ? 'bg-orange-100 shadow' :
                        'bg-gray-100 shadow'
              }`}>
              {isDatabaseModule ? (
                <Database className="h-5 w-5 text-cyan-600" />
              ) : isFrontendModule ? (
                <FileText className="h-5 w-5 text-yellow-600" />
              ) : isAutomationMode ? (
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
              <h2 className="text-lg font-bold text-gray-900">Add Question</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <span className="font-medium">{exerciseData.exerciseName}</span>
                {!isFrontendModule && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDatabaseModule ? 'bg-cyan-100 text-cyan-800' :
                      isAutomationMode ? 'bg-blue-100 text-blue-800' :
                        isAIMode ? 'bg-purple-100 text-purple-800' :
                          isPracticeMode ? 'bg-green-100 text-green-800' :
                            isManualMode ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                      }`}>
                      {getEvaluationModeLabel()} ({getModuleTypeLabel()})
                    </span>
                    {(isAutomationMode || isPracticeMode) && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs font-medium">{supportedLanguages.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}</span>
                      </>
                    )}
                  </>
                )}
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
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-5" style={{ height: 'calc(85vh - 180px)' }}>
          {renderTabContent()}
        </div>

        {/* Footer */}
        {/* Footer */}
        <div className="border-t p-4 bg-gradient-to-r from-gray-50 to-white sticky bottom-0 z-10">          <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 flex items-center gap-4">
            <div>
              <span className="font-semibold">Mode:</span> {getEvaluationModeLabel()}
            </div>
            <div>
              <span className="font-semibold">Module:</span> {getModuleTypeLabel()}
            </div>
            {!isFrontendModule && (isAutomationMode || isPracticeMode) && (
              <div>
                <span className="font-semibold">Languages:</span> {supportedLanguages.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}
              </div>
            )}
            {activeTab === 'testcases' && (
              <div>
                <span className="font-semibold">
                  Test Cases: <span className="text-green-600 font-bold">
                    {isDatabaseModule ? databaseTestCases.length : testCases.length}
                  </span>
                </span>
              </div>
            )}
            {isDatabaseModule && currentDatabase && (
              <div>
                <span className="font-semibold">
                  Database: <span className="text-green-600 font-bold">{currentDatabase.name}</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {availableTabs.indexOf(activeTab) > 0 && (
              <button
                type="button"
                onClick={goToPreviousTab}
                className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2"
              >
                ← Back
              </button>
            )}

            {availableTabs.indexOf(activeTab) < availableTabs.length - 1 ? (
              <button
                type="button"
                onClick={goToNextTab}
                className="px-6 py-2.5 text-sm bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg hover:from-gray-900 hover:to-black transition-all duration-200 flex items-center gap-2 shadow"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className={`px-6 py-2.5 text-sm text-white rounded-lg flex items-center gap-2 shadow transition-all duration-200 ${isDatabaseModule ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800' :
                  isAutomationMode ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' :
                    isAIMode ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800' :
                      isPracticeMode ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' :
                        'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
                  }`}
              >
                <Save className="h-4 w-4" />
                Save Question
              </button>
            )}
          </div>
        </div>
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-5 rounded-xl shadow-2xl flex items-center gap-4 border border-green-500">
              <CheckCircle className="h-7 w-7" />
              <div>
                <h4 className="font-bold text-lg">Success!</h4>
                <p className="text-sm opacity-90">Question added successfully.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddQuestionForm;