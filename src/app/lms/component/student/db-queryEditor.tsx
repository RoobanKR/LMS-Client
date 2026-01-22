import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
    Play, RotateCcw, CheckCircle2, Maximize2, Minimize2,
    X, Code, FileText, AlertCircle, Terminal, Menu, ChevronRight, ChevronLeft,
    Search, AlertTriangle, CheckCircle, XCircle, Lock, ArrowUpDown, X as XIcon,
    Loader2, SkipForward, Clock, ShieldAlert, Camera, Video, Save, LogOut,
    Trash2, Shield, Mic, MicOff, ShieldCheck, UserCheck, Monitor, Database,
    Table, Download, Upload, Eye, EyeOff, Filter, Server, Key, RefreshCw, Zap
} from "lucide-react"
import dynamic from 'next/dynamic'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Script from 'next/script'

// Piston API configuration
const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute"

// Cloudinary configuration for recording
const CLOUDINARY_CLOUD_NAME = "dusxfgvhi"
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`
const CLOUDINARY_PRESET = "dusxfgvhi"

const MonacoEditor = dynamic(
    () => import('@monaco-editor/react'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs text-gray-600">Loading Editor...</p>
                </div>
            </div>
        )
    }
)

// Browser-based database storage with improved functionality
interface BrowserDatabase {
    name: string
    tables: BrowserTable[]
    createdAt: Date
    lastModified: Date
    version: number
    description?: string
}

interface BrowserTable {
    name: string
    columns: BrowserColumn[]
    data: any[]
    indexes: string[]
    constraints: TableConstraint[]
    description?: string
    engine?: string
    charset?: string
}

interface BrowserColumn {
    name: string
    type: 'VARCHAR' | 'INT' | 'BIGINT' | 'DECIMAL' | 'FLOAT' | 'DOUBLE' | 'DATE' | 'DATETIME' | 'TIMESTAMP' | 'TIME' | 'YEAR' | 'TEXT' | 'LONGTEXT' | 'BOOLEAN' | 'BLOB' | 'JSON' | 'ENUM' | 'SET'
    length?: number
    nullable: boolean
    primaryKey: boolean
    defaultValue?: any
    autoIncrement: boolean
    unique: boolean
    foreignKey?: ForeignKeyConstraint
    unsigned?: boolean
    zerofill?: boolean
    collation?: string
    comment?: string
}

interface TableConstraint {
    type: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK' | 'INDEX'
    name: string
    columns: string[]
    referencedTable?: string
    referencedColumns?: string[]
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
}

interface ForeignKeyConstraint {
    referencedTable: string
    referencedColumn: string
    onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
    onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
}

interface QueryHistoryItem {
    id: string
    query: string
    result: string
    timestamp: Date
    success: boolean
    executionTime: number
    rowCount?: number
    affectedRows?: number
}

interface QueryResultView {
    id: string
    name: string
    type: 'table' | 'chart' | 'text'
    data: any[]
    columns?: string[]
    chartType?: 'bar' | 'line' | 'pie'
}

interface ExecutionResult {
    success: boolean
    output: string
    error?: string
    executionTime?: number
    memory?: number
    resultSet?: any[]
    affectedRows?: number
    columns?: string[]
    queryType?: string
    rowCount?: number
    sqlMessage?: string
    message?: string
    database?: string
    warnings?: string[]
}

interface DatabaseQuestion {
    _id: string
    title: string
    description: string
    difficulty: "easy" | "medium" | "hard" | "beginner" | "intermediate" | "advanced"
    schema: string
    sampleQueries: string[]
    expectedResults: any[]
    hints: Array<{
        hintText: string
        pointsDeduction: number
        isPublic: boolean
        sequence: number
        _id: string
    }>
    testCases: Array<{
        setupQuery: string
        testQuery: string
        expectedResult: any[]
        isSample: boolean
        isHidden: boolean
        points: number
        _id: string
    }>
    points: number
    timeLimit: number
    memoryLimit: number
    isActive: boolean
    sequence: number
    createdAt: string
    updatedAt: string
    allowedDatabases?: string[]
}

interface ExerciseInformation {
    exerciseId: string
    exerciseName: string
    description: string
    exerciseLevel: "beginner" | "medium" | "hard"
    _id: string
    totalPoints?: number
    totalQuestions?: number
    estimatedTime?: number
}

interface ProgrammingSettings {
    selectedModule: string
    selectedLanguages: string[]
    _id: string
    levelConfiguration?: {
        levelBased?: {
            easy: number
            medium: number
            hard: number
        }
        levelType: string
        general: number
    }
}

interface CompilerSettings {
    allowCopyPaste: boolean
    autoSuggestion: boolean
    autoCloseBrackets: boolean
    _id: string
    theme?: string
    fontSize?: number
    tabSize?: number
}

interface AvailabilityPeriod {
    startDate: string
    endDate: string
    gracePeriodAllowed: boolean
    gracePeriodDate: string | null
    _id: string
}

interface QuestionBehavior {
    shuffleQuestions: boolean
    allowNext: boolean
    allowSkip: boolean
    attemptLimitEnabled: boolean
    maxAttempts: number
    _id: string
    showPoints?: boolean
    showDifficulty?: boolean
    allowHintUsage?: boolean
    allowTestRun?: boolean
}

interface ManualEvaluation {
    enabled: boolean
    submissionNeeded: boolean
    _id: string
}

interface EvaluationSettings {
    practiceMode: boolean
    manualEvaluation: ManualEvaluation
    aiEvaluation: boolean
    automationEvaluation: boolean
    _id: string
    passingScore?: number
    showResultsImmediately?: boolean
    allowReview?: boolean
}

interface GroupSettings {
    groupSettingsEnabled: boolean
    showExistingUsers: boolean
    selectedGroups: any[]
    chatEnabled: boolean
    _id: string
    collaborationEnabled?: boolean
}

interface DatabaseExercise {
    _id: string
    exerciseInformation: ExerciseInformation
    programmingSettings: ProgrammingSettings
    compilerSettings: CompilerSettings
    availabilityPeriod: AvailabilityPeriod
    questionBehavior: QuestionBehavior
    evaluationSettings: EvaluationSettings
    groupSettings: GroupSettings
    createdAt: string
    updatedAt: string
    version?: number
    questions: DatabaseQuestion[]
    courseId?: string
    securitySettings?: {
        timerEnabled?: boolean
        timerDuration?: number
        cameraMicEnabled?: boolean
        fullScreenMode?: boolean
        tabSwitchAllowed?: boolean
        maxTabSwitches?: number
        disableClipboard?: boolean
        screenRecordingEnabled?: boolean
    }
}

interface ToastNotification {
    id: string
    type: 'success' | 'error' | 'info' | 'warning'
    title: string
    message: string
    duration: number
}

interface LogEntry {
    id: string
    type: 'stdout' | 'stderr' | 'stdin' | 'system' | 'error' | 'warning' | 'success' | 'info' | 'sql'
    content: string
    timestamp: number
}

interface SecuritySettings {
    timerEnabled?: boolean
    timerDuration?: number
    cameraMicEnabled?: boolean
    fullScreenMode?: boolean
    tabSwitchAllowed?: boolean
    maxTabSwitches?: number
    disableClipboard?: boolean
    screenRecordingEnabled?: boolean
}

// Browser Database Manager - ENHANCED VERSION
class BrowserDatabaseManager {
    private static STORAGE_KEY = 'browser_databases_v2'
    private static CURRENT_DB_KEY = 'current_browser_database_v2'
    private static QUERY_HISTORY_KEY = 'query_history_v2'
    private static QUERY_VIEWS_KEY = 'query_views_v2'

    // MySQL data types mapping
    static readonly MYSQL_TYPES = [
        'INT', 'VARCHAR', 'TEXT', 'DATE', 'DATETIME', 'TIMESTAMP',
        'DECIMAL', 'FLOAT', 'DOUBLE', 'BOOLEAN', 'BLOB', 'JSON',
        'ENUM', 'SET', 'BIGINT', 'TIME', 'YEAR', 'LONGTEXT'
    ]

    static getDatabases(): BrowserDatabase[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY)
            if (!stored) {
                // Create sample database if none exists
                const sampleDb = this.createSampleDatabase()
                return [sampleDb]
            }

            const databases = JSON.parse(stored)
            return databases.map((db: any) => ({
                ...db,
                createdAt: new Date(db.createdAt),
                lastModified: new Date(db.lastModified),
                tables: db.tables.map((table: any) => ({
                    ...table,
                    data: table.data.map((row: any) => {
                        const processedRow: any = {}
                        Object.keys(row).forEach(key => {
                            if (typeof row[key] === 'string' && row[key].includes('T') && row[key].includes('Z')) {
                                processedRow[key] = new Date(row[key])
                            } else {
                                processedRow[key] = row[key]
                            }
                        })
                        return processedRow
                    })
                }))
            }))
        } catch (error) {
            console.error('Error reading databases from storage:', error)
            const sampleDb = this.createSampleDatabase()
            return [sampleDb]
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
        }

        this.saveDatabases([sampleDb])
        return sampleDb
    }

    static saveDatabases(databases: BrowserDatabase[]): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(databases))
        } catch (error) {
            console.error('Error saving databases to storage:', error)
        }
    }

    static getCurrentDatabase(): BrowserDatabase | null {
        try {
            const currentDbName = localStorage.getItem(this.CURRENT_DB_KEY)
            if (!currentDbName) {
                const databases = this.getDatabases()
                if (databases.length > 0) {
                    this.setCurrentDatabase(databases[0].name)
                    return databases[0]
                }
                return null
            }

            const databases = this.getDatabases()
            return databases.find(db => db.name === currentDbName) || databases[0] || null
        } catch (error) {
            console.error('Error getting current database:', error)
            return null
        }
    }

    static setCurrentDatabase(name: string): void {
        try {
            localStorage.setItem(this.CURRENT_DB_KEY, name)
        } catch (error) {
            console.error('Error setting current database:', error)
        }
    }

    static getQueryHistory(): QueryHistoryItem[] {
        try {
            const stored = localStorage.getItem(this.QUERY_HISTORY_KEY)
            if (!stored) return []

            const history = JSON.parse(stored)
            return history.map((item: any) => ({
                ...item,
                timestamp: new Date(item.timestamp)
            }))
        } catch (error) {
            console.error('Error reading query history:', error)
            return []
        }
    }

    static saveQueryHistory(history: QueryHistoryItem[]): void {
        try {
            // Keep only last 100 items
            const limitedHistory = history.slice(0, 100)
            localStorage.setItem(this.QUERY_HISTORY_KEY, JSON.stringify(limitedHistory))
        } catch (error) {
            console.error('Error saving query history:', error)
        }
    }

    static addToHistory(item: QueryHistoryItem): void {
        const history = this.getQueryHistory()
        history.unshift(item)
        this.saveQueryHistory(history)
    }

    static clearHistory(): void {
        localStorage.removeItem(this.QUERY_HISTORY_KEY)
    }

    static getQueryViews(): QueryResultView[] {
        try {
            const stored = localStorage.getItem(this.QUERY_VIEWS_KEY)
            if (!stored) return []
            return JSON.parse(stored)
        } catch (error) {
            console.error('Error reading query views:', error)
            return []
        }
    }

    static saveQueryViews(views: QueryResultView[]): void {
        try {
            localStorage.setItem(this.QUERY_VIEWS_KEY, JSON.stringify(views))
        } catch (error) {
            console.error('Error saving query views:', error)
        }
    }

    static createDatabase(name: string, description?: string): BrowserDatabase {
        const databases = this.getDatabases()

        // Check if database already exists
        const existingDb = databases.find(db => db.name === name)
        if (existingDb) {
            return existingDb
        }

        const newDatabase: BrowserDatabase = {
            name,
            description,
            tables: [],
            createdAt: new Date(),
            lastModified: new Date(),
            version: 1
        }

        databases.push(newDatabase)
        this.saveDatabases(databases)
        this.setCurrentDatabase(name)

        return newDatabase
    }

    static deleteDatabase(name: string): boolean {
        const databases = this.getDatabases()
        const filtered = databases.filter(db => db.name !== name)

        if (filtered.length === databases.length) {
            return false // Database not found
        }

        this.saveDatabases(filtered)

        // If we're deleting the current database, clear current
        const current = this.getCurrentDatabase()
        if (current && current.name === name) {
            localStorage.removeItem(this.CURRENT_DB_KEY)
        }

        return true
    }

    static exportDatabase(name: string): string {
        const databases = this.getDatabases()
        const database = databases.find(db => db.name === name)

        if (!database) {
            throw new Error(`Database "${name}" not found`)
        }

        return JSON.stringify(database, null, 2)
    }

    static importDatabase(data: string): BrowserDatabase {
        try {
            const importedDb = JSON.parse(data)

            // Validate structure
            if (!importedDb.name || !Array.isArray(importedDb.tables)) {
                throw new Error('Invalid database format')
            }

            const databases = this.getDatabases()

            // Check if database already exists
            const existingIndex = databases.findIndex(db => db.name === importedDb.name)
            if (existingIndex !== -1) {
                // Update existing database
                databases[existingIndex] = {
                    ...importedDb,
                    lastModified: new Date(),
                    createdAt: new Date(importedDb.createdAt || new Date())
                }
            } else {
                // Add new database
                databases.push({
                    ...importedDb,
                    createdAt: new Date(importedDb.createdAt || new Date()),
                    lastModified: new Date(),
                    version: importedDb.version || 1
                })
            }

            this.saveDatabases(databases)
            this.setCurrentDatabase(importedDb.name)

            return this.getCurrentDatabase()!
        } catch (error) {
            console.error('Error importing database:', error)
            throw new Error('Failed to import database')
        }
    }

    static executeQuery(databaseName: string, query: string): ExecutionResult {
        const startTime = performance.now()
        const databases = this.getDatabases()
        const database = databases.find(db => db.name === databaseName)

        if (!database) {
            return {
                success: false,
                output: '',
                error: `Database "${databaseName}" not found`,
                executionTime: performance.now() - startTime
            }
        }

        try {
            // Clean and normalize the query
            let cleanQuery = query
                .trim()
                .replace(/--.*$/gm, '') // Remove single line comments
                .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
                .replace(/\s+/g, ' ') // Normalize whitespace
                .replace(/;$/, '') // Remove trailing semicolon

            // Handle empty queries
            if (!cleanQuery.trim()) {
                return {
                    success: false,
                    output: '',
                    error: 'Empty query',
                    executionTime: performance.now() - startTime
                }
            }

            const normalizedQuery = cleanQuery.toUpperCase().trim()

            // Parse query type
            let result: ExecutionResult

            if (normalizedQuery.startsWith('SELECT')) {
                result = this.executeSelectQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('CREATE TABLE')) {
                result = this.executeCreateTableQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('INSERT INTO')) {
                result = this.executeInsertQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('UPDATE')) {
                result = this.executeUpdateQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('DELETE FROM')) {
                result = this.executeDeleteQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('DROP TABLE')) {
                result = this.executeDropTableQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('SHOW TABLES')) {
                result = this.executeShowTablesQuery(database)
            } else if (normalizedQuery.startsWith('DESCRIBE') || normalizedQuery.startsWith('DESC')) {
                result = this.executeDescribeQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('ALTER TABLE')) {
                result = this.executeAlterTableQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('TRUNCATE TABLE')) {
                result = this.executeTruncateTableQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('CREATE DATABASE')) {
                result = this.executeCreateDatabaseQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('DROP DATABASE')) {
                result = this.executeDropDatabaseQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('USE')) {
                result = this.executeUseQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('SHOW DATABASES')) {
                result = this.executeShowDatabasesQuery()
            } else if (normalizedQuery.startsWith('EXPLAIN')) {
                result = this.executeExplainQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('CREATE INDEX')) {
                result = this.executeCreateIndexQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('DROP INDEX')) {
                result = this.executeDropIndexQuery(database, cleanQuery)
            } else if (normalizedQuery.startsWith('BEGIN') || normalizedQuery.startsWith('START TRANSACTION')) {
                result = this.executeBeginTransaction(database)
            } else if (normalizedQuery.startsWith('COMMIT')) {
                result = this.executeCommitTransaction(database)
            } else if (normalizedQuery.startsWith('ROLLBACK')) {
                result = this.executeRollbackTransaction(database)
            } else {
                result = {
                    success: false,
                    output: '',
                    error: `Unsupported query type. Supported: SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, SHOW, DESCRIBE, TRUNCATE, EXPLAIN, USE, BEGIN, COMMIT, ROLLBACK`,
                    queryType: 'UNKNOWN'
                }
            }

            const endTime = performance.now()
            result.executionTime = endTime - startTime
            result.memory = Math.random() * 10 + 1
            result.database = database.name

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
                })
            }

            // Update database if modified
            if (result.success && result.queryType && ['CREATE', 'DROP', 'ALTER', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'].includes(result.queryType)) {
                database.lastModified = new Date()
                this.saveDatabase(database)
            }

            return result

        } catch (error) {
            console.error('Query execution error:', error)
            return {
                success: false,
                output: '',
                error: `Query execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                executionTime: performance.now() - startTime
            }
        }
    }

    private static executeSelectQuery(database: BrowserDatabase, query: string): ExecutionResult {
        try {
            // Extract table name(s) - handle joins
            const fromMatch = query.match(/FROM\s+([^\s;,(]+)/i)
            if (!fromMatch) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid SELECT query: No FROM clause found',
                    queryType: 'SELECT'
                }
            }

            const tableName = fromMatch[1].trim().replace(/[`"']/g, '')
            const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase())

            if (!table) {
                return {
                    success: false,
                    output: '',
                    error: `Table "${tableName}" does not exist`,
                    queryType: 'SELECT'
                }
            }

            // Parse SELECT clause
            const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i) || query.match(/SELECT\s+(.+)$/i)
            if (!selectMatch) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid SELECT clause',
                    queryType: 'SELECT'
                }
            }

            const selectClause = selectMatch[1].trim()
            let columns: string[] = []

            if (selectClause === '*') {
                columns = table.columns.map(col => col.name)
            } else {
                columns = selectClause.split(',')
                    .map(col => col.trim().split(/\s+as\s+/i)[0].replace(/[`"']/g, ''))
                    .filter(col => col)
            }

            // Validate columns
            const validColumns = columns.filter(col =>
                table.columns.some(tableCol => tableCol.name.toLowerCase() === col.toLowerCase())
            )

            if (validColumns.length === 0 && columns.length > 0) {
                return {
                    success: false,
                    output: '',
                    error: `Invalid column(s) specified. Available columns: ${table.columns.map(c => c.name).join(', ')}`,
                    queryType: 'SELECT'
                }
            }

            // Start with all data
            let resultData = [...table.data]

            // Parse WHERE clause
            const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+(ORDER BY|GROUP BY|LIMIT|HAVING|$))/i) ||
                query.match(/WHERE\s+(.+)$/i)

            if (whereMatch) {
                const condition = whereMatch[1].trim()
                resultData = this.filterDataWithWhere(table, resultData, condition)
            }

            // Parse GROUP BY clause
            const groupByMatch = query.match(/GROUP BY\s+([^;]+?)(?:\s+(ORDER BY|LIMIT|HAVING|$))/i) ||
                query.match(/GROUP BY\s+([^;]+)$/i)

            if (groupByMatch) {
                const groupByColumns = groupByMatch[1].split(',').map(col => col.trim().replace(/[`"']/g, ''))
                resultData = this.groupData(table, resultData, groupByColumns, columns)
            }

            // Parse ORDER BY clause
            const orderByMatch = query.match(/ORDER BY\s+([^;]+?)(?:\s+(LIMIT|$))/i) ||
                query.match(/ORDER BY\s+([^;]+)$/i)

            if (orderByMatch) {
                const orderClause = orderByMatch[1]
                resultData = this.sortData(table, resultData, orderClause)
            }

            // Parse LIMIT clause
            const limitMatch = query.match(/LIMIT\s+(\d+)(?:\s*,\s*(\d+))?/i)
            if (limitMatch) {
                const offset = limitMatch[2] ? parseInt(limitMatch[1]) : 0
                const limit = limitMatch[2] ? parseInt(limitMatch[2]) : parseInt(limitMatch[1])
                resultData = resultData.slice(offset, offset + limit)
            }

            // Prepare final result with only selected columns
            const finalResult = resultData.map(row => {
                const resultRow: any = {}
                    ; (validColumns.length > 0 ? validColumns : table.columns.map(c => c.name)).forEach(col => {
                        const actualColumn = table.columns.find(c => c.name.toLowerCase() === col.toLowerCase())
                        if (actualColumn) {
                            resultRow[actualColumn.name] = row[actualColumn.name]
                        }
                    })
                return resultRow
            })

            return {
                success: true,
                output: 'SELECT query executed successfully',
                resultSet: finalResult,
                columns: validColumns.length > 0 ? validColumns : table.columns.map(c => c.name),
                rowCount: finalResult.length,
                queryType: 'SELECT'
            }

        } catch (error) {
            return {
                success: false,
                output: '',
                error: `SELECT query error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                queryType: 'SELECT'
            }
        }
    }

    private static filterDataWithWhere(table: BrowserTable, data: any[], whereCondition: string): any[] {
        try {
            // Simple WHERE condition parser
            // Supports: =, !=, >, <, >=, <=, LIKE, IN, AND, OR
            const conditions = whereCondition.split(/\s+(?:AND|OR)\s+/i)
            const operators = whereCondition.match(/\s+(?:AND|OR)\s+/gi) || []

            return data.filter(row => {
                let result = this.evaluateSimpleCondition(row, conditions[0], table)

                for (let i = 1; i < conditions.length; i++) {
                    const op = operators[i - 1]?.trim().toUpperCase()
                    const conditionResult = this.evaluateSimpleCondition(row, conditions[i], table)

                    if (op === 'AND') {
                        result = result && conditionResult
                    } else if (op === 'OR') {
                        result = result || conditionResult
                    }
                }

                return result
            })
        } catch (error) {
            console.error('Error filtering data:', error)
            return data
        }
    }

    private static evaluateSimpleCondition(row: any, condition: string, table: BrowserTable): boolean {
        // Remove parentheses
        condition = condition.replace(/[()]/g, '').trim()

        // Check for IN condition
        const inMatch = condition.match(/(\w+)\s+IN\s*\(([^)]+)\)/i)
        if (inMatch) {
            const column = inMatch[1]
            const values = inMatch[2].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''))
            const rowValue = row[column]
            return values.some(v => this.compareValues(rowValue, v))
        }

        // Check for LIKE condition
        const likeMatch = condition.match(/(\w+)\s+LIKE\s+(['"][^'"]+['"])/i)
        if (likeMatch) {
            const column = likeMatch[1]
            const pattern = likeMatch[2].replace(/^['"]|['"]$/g, '').replace(/%/g, '.*').replace(/_/g, '.')
            const regex = new RegExp(`^${pattern}$`, 'i')
            const rowValue = String(row[column] || '')
            return regex.test(rowValue)
        }

        // Check for comparison operators
        const comparisonMatch = condition.match(/(\w+)\s*(=|!=|>|<|>=|<=|<>)\s*(['"][^'"]*['"]|[^'"]\w*)/i)
        if (comparisonMatch) {
            const column = comparisonMatch[1]
            const operator = comparisonMatch[2]
            const value = comparisonMatch[3].replace(/^['"]|['"]$/g, '')
            const rowValue = row[column]

            switch (operator) {
                case '=': return this.compareValues(rowValue, value)
                case '!=': case '<>': return !this.compareValues(rowValue, value)
                case '>': return this.greaterThan(rowValue, value)
                case '<': return this.lessThan(rowValue, value)
                case '>=': return this.compareValues(rowValue, value) || this.greaterThan(rowValue, value)
                case '<=': return this.compareValues(rowValue, value) || this.lessThan(rowValue, value)
                default: return true
            }
        }

        return true
    }

    private static compareValues(a: any, b: any): boolean {
        if (a == null && b == null) return true
        if (a == null || b == null) return false

        // Try numeric comparison
        const numA = Number(a)
        const numB = Number(b)
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA === numB
        }

        // String comparison (case-insensitive)
        return String(a).toLowerCase() === String(b).toLowerCase()
    }

    private static greaterThan(a: any, b: any): boolean {
        const numA = Number(a)
        const numB = Number(b)
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA > numB
        }
        return String(a).toLowerCase() > String(b).toLowerCase()
    }

    private static lessThan(a: any, b: any): boolean {
        const numA = Number(a)
        const numB = Number(b)
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA < numB
        }
        return String(a).toLowerCase() < String(b).toLowerCase()
    }

    private static groupData(table: BrowserTable, data: any[], groupByColumns: string[], selectColumns: string[]): any[] {
        // Simple grouping - just return unique groups
        const groups = new Map<string, any>()

        data.forEach(row => {
            const groupKey = groupByColumns.map(col => row[col]).join('|')
            if (!groups.has(groupKey)) {
                const groupRow: any = {}
                selectColumns.forEach(col => {
                    groupRow[col] = row[col]
                })
                groups.set(groupKey, groupRow)
            }
        })

        return Array.from(groups.values())
    }

    private static sortData(table: BrowserTable, data: any[], orderClause: string): any[] {
        const sortSpecs = orderClause.split(',').map(spec => {
            const parts = spec.trim().split(/\s+/)
            return {
                column: parts[0].replace(/[`"']/g, ''),
                direction: (parts[1] || 'ASC').toUpperCase()
            }
        })

        return [...data].sort((a, b) => {
            for (const spec of sortSpecs) {
                const valA = a[spec.column]
                const valB = b[spec.column]

                // Handle nulls
                if (valA == null && valB == null) continue
                if (valA == null) return spec.direction === 'ASC' ? -1 : 1
                if (valB == null) return spec.direction === 'ASC' ? 1 : -1

                const comparison = this.compareForSort(valA, valB)
                if (comparison !== 0) {
                    return spec.direction === 'DESC' ? -comparison : comparison
                }
            }
            return 0
        })
    }

    private static compareForSort(a: any, b: any): number {
        // Try numeric comparison first
        const numA = Number(a)
        const numB = Number(b)
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB
        }

        // String comparison
        return String(a).localeCompare(String(b))
    }

    private static executeCreateTableQuery(database: BrowserDatabase, query: string): ExecutionResult {
        try {
            // Clean and normalize the query
            let cleanQuery = query
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .trim()

            // Extract table name - match CREATE TABLE <name> (
            const tableNameMatch = cleanQuery.match(/CREATE\s+TABLE\s+(\w+)\s*\(/i)
            if (!tableNameMatch) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid CREATE TABLE syntax: Could not find table name',
                    queryType: 'CREATE'
                }
            }

            const tableName = tableNameMatch[1].trim()

            // Check if table already exists
            if (database.tables.some(t => t.name.toLowerCase() === tableName.toLowerCase())) {
                return {
                    success: false,
                    output: '',
                    error: `Table "${tableName}" already exists`,
                    queryType: 'CREATE'
                }
            }

            // Find the content between the first '(' and the last ')'
            const startIndex = cleanQuery.indexOf('(')
            const endIndex = cleanQuery.lastIndexOf(')')

            if (startIndex === -1 || endIndex === -1) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid CREATE TABLE syntax: Missing parentheses',
                    queryType: 'CREATE'
                }
            }

            let columnsContent = cleanQuery.substring(startIndex + 1, endIndex).trim()

            // Remove ENGINE and CHARSET if present at the end
            columnsContent = columnsContent.replace(/\s*ENGINE\s*=\s*\w+/gi, '')
            columnsContent = columnsContent.replace(/\s*DEFAULT\s*CHARSET\s*=\s*\w+/gi, '')
            columnsContent = columnsContent.trim()

            // SPLIT COLUMNS MANUALLY
            const columns: BrowserColumn[] = []
            let currentColumn = ''
            let parenDepth = 0
            let inQuotes = false
            let quoteChar = ''

            for (let i = 0; i < columnsContent.length; i++) {
                const char = columnsContent[i]

                // Handle quotes
                if ((char === "'" || char === '"') && (i === 0 || columnsContent[i - 1] !== '\\')) {
                    if (!inQuotes) {
                        inQuotes = true
                        quoteChar = char
                    } else if (char === quoteChar) {
                        inQuotes = false
                    }
                    currentColumn += char
                }
                // Handle parentheses (for data types like VARCHAR(100))
                else if (char === '(' && !inQuotes) {
                    parenDepth++
                    currentColumn += char
                }
                else if (char === ')' && !inQuotes) {
                    parenDepth--
                    currentColumn += char
                }
                // Handle column separator (comma) when not in quotes or parentheses
                else if (char === ',' && !inQuotes && parenDepth === 0) {
                    if (currentColumn.trim()) {
                        const column = this.parseColumnDefinition(currentColumn.trim())
                        if (column) {
                            columns.push(column)
                        }
                    }
                    currentColumn = ''
                }
                else {
                    currentColumn += char
                }
            }

            // Don't forget the last column
            if (currentColumn.trim()) {
                const column = this.parseColumnDefinition(currentColumn.trim())
                if (column) {
                    columns.push(column)
                }
            }

            if (columns.length === 0) {
                return {
                    success: false,
                    output: '',
                    error: 'No columns found in CREATE TABLE statement',
                    queryType: 'CREATE'
                }
            }

            const newTable: BrowserTable = {
                name: tableName,
                columns,
                data: [],
                indexes: [],
                constraints: [],
                engine: 'InnoDB',
                charset: 'utf8mb4'
            }

            database.tables.push(newTable)
            this.saveDatabase(database)

            return {
                success: true,
                output: `Table "${tableName}" created successfully with ${columns.length} columns`,
                affectedRows: 0,
                queryType: 'CREATE'
            }

        } catch (error) {
            return {
                success: false,
                output: '',
                error: `CREATE TABLE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                queryType: 'CREATE'
            }
        }
    }

    private static parseColumnDefinition(def: string): BrowserColumn | null {
        // Skip if it's a constraint
        const upperDef = def.toUpperCase()
        if (upperDef.includes('PRIMARY KEY') ||
            upperDef.includes('FOREIGN KEY') ||
            upperDef.includes('UNIQUE KEY') ||
            upperDef.includes('CHECK') ||
            upperDef.includes('CONSTRAINT')) {
            return null
        }

        // Parse column definition pattern: name type [constraints]
        let match = def.match(/^(\w+)\s+(\w+(?:\(\d+(?:,\s*\d+)?\))?)/i)

        // Pattern 2: `name` type
        if (!match) {
            match = def.match(/^[`"']?(\w+)[`"']?\s+(\w+(?:\(\d+(?:,\s*\d+)?\))?)/i)
        }

        if (!match) {
            return null
        }

        const name = match[1]
        const dataType = match[2].toUpperCase()
        const rest = def.substring(match[0].length).trim()

        // Extract base type and length
        let baseType = dataType
        let length: number | undefined

        const lengthMatch = dataType.match(/(\w+)\((\d+)(?:,\s*\d+)?\)/)
        if (lengthMatch) {
            baseType = lengthMatch[1]
            length = parseInt(lengthMatch[2])
        }

        // Determine properties from constraints
        const restUpper = rest.toUpperCase()
        const nullable = !restUpper.includes('NOT NULL')
        const primaryKey = restUpper.includes('PRIMARY KEY')
        const autoIncrement = restUpper.includes('AUTO_INCREMENT') || restUpper.includes('AUTOINCREMENT')
        const unique = restUpper.includes('UNIQUE')

        // Parse default value
        let defaultValue: any = undefined
        const defaultMatch = rest.match(/DEFAULT\s+([^,\s]+)/i)
        if (defaultMatch) {
            let defaultVal = defaultMatch[1]
            if (defaultVal.toUpperCase() === 'NULL') {
                defaultValue = null
            } else if (defaultVal.toUpperCase() === 'CURRENT_TIMESTAMP') {
                defaultValue = 'CURRENT_TIMESTAMP'
            } else {
                defaultVal = defaultVal.replace(/^['"]|['"]$/g, '')
                defaultValue = defaultVal
            }
        }

        const column: BrowserColumn = {
            name,
            type: baseType as BrowserColumn['type'],
            length,
            nullable,
            primaryKey,
            autoIncrement,
            unique,
            defaultValue
        }

        return column
    }

    private static executeInsertQuery(database: BrowserDatabase, query: string): ExecutionResult {
        try {
            // Clean the query
            query = query.replace(/\s+/g, ' ').trim()

            // Parse INSERT query
            const insertMatch = query.match(/INSERT\s+INTO\s+(\w+)\s*(?:\(([^)]+)\))?\s*VALUES\s*(.+)/i)
            if (!insertMatch) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid INSERT syntax',
                    queryType: 'INSERT'
                }
            }

            const tableName = insertMatch[1].trim()
            const columnsStr = insertMatch[2]
            const valuesStr = insertMatch[3]

            const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase())
            if (!table) {
                return {
                    success: false,
                    output: '',
                    error: `Table "${tableName}" does not exist`,
                    queryType: 'INSERT'
                }
            }

            // Parse column names
            let columnNames: string[]
            if (columnsStr) {
                columnNames = columnsStr.split(',').map(c => c.trim().replace(/[`"']/g, ''))
            } else {
                columnNames = table.columns.map(col => col.name)
            }

            // Parse values
            const valueSets: string[][] = []

            // Find all value tuples
            const valueRegex = /\(([^)]+)\)/g
            let match

            while ((match = valueRegex.exec(valuesStr)) !== null) {
                const tuple = match[1]
                const values: string[] = []
                let current = ''
                let inQuotes = false
                let quoteChar = ''

                for (let i = 0; i < tuple.length; i++) {
                    const char = tuple[i]

                    if ((char === "'" || char === '"') && (i === 0 || tuple[i - 1] !== '\\')) {
                        if (!inQuotes) {
                            inQuotes = true
                            quoteChar = char
                        } else if (char === quoteChar) {
                            inQuotes = false
                        }
                        current += char
                    } else if (char === ',' && !inQuotes) {
                        values.push(current.trim())
                        current = ''
                    } else {
                        current += char
                    }
                }

                // Add last value
                if (current.trim()) {
                    values.push(current.trim())
                }

                valueSets.push(values)
            }

            if (valueSets.length === 0) {
                return {
                    success: false,
                    output: '',
                    error: 'No values found to insert',
                    queryType: 'INSERT'
                }
            }

            let insertedCount = 0

            valueSets.forEach((valueSet, rowIndex) => {
                const newRow: any = {}

                // Map values to columns
                columnNames.forEach((colName, colIndex) => {
                    if (colIndex < valueSet.length) {
                        const column = table.columns.find(c => c.name.toLowerCase() === colName.toLowerCase())
                        if (column) {
                            let value = valueSet[colIndex]

                            // Handle NULL
                            if (value.toUpperCase() === 'NULL') {
                                newRow[column.name] = null
                            }
                            // Handle DEFAULT
                            else if (value.toUpperCase() === 'DEFAULT') {
                                newRow[column.name] = column.defaultValue
                            }
                            // Handle auto-increment
                            else if (column.autoIncrement && column.primaryKey) {
                                const maxId = table.data.reduce((max, row) => Math.max(max, row[column.name] || 0), 0)
                                newRow[column.name] = maxId + 1
                            }
                            else {
                                // Clean string values
                                value = value.trim()

                                // Remove quotes if present
                                if ((value.startsWith("'") && value.endsWith("'")) ||
                                    (value.startsWith('"') && value.endsWith('"')) ||
                                    (value.startsWith('`') && value.endsWith('`'))) {
                                    value = value.substring(1, value.length - 1)
                                }

                                // Convert based on type
                                if (column.type.includes('INT') || column.type === 'BIGINT') {
                                    newRow[column.name] = parseInt(value) || 0
                                } else if (column.type.includes('DECIMAL') || column.type.includes('FLOAT')) {
                                    newRow[column.name] = parseFloat(value) || 0
                                } else if (column.type === 'BOOLEAN') {
                                    newRow[column.name] = value.toLowerCase() === 'true' || value === '1'
                                } else {
                                    newRow[column.name] = value
                                }
                            }
                        }
                    }
                })

                // Fill missing columns (like auto-increment ID)
                table.columns.forEach(column => {
                    if (newRow[column.name] === undefined) {
                        if (column.autoIncrement && column.primaryKey) {
                            const maxId = table.data.reduce((max, row) => Math.max(max, row[column.name] || 0), 0)
                            newRow[column.name] = maxId + 1
                        } else if (column.defaultValue !== undefined) {
                            newRow[column.name] = column.defaultValue
                        } else if (column.nullable) {
                            newRow[column.name] = null
                        } else {
                            // Default values
                            if (column.type.includes('INT') || column.type.includes('DECIMAL')) {
                                newRow[column.name] = 0
                            } else {
                                newRow[column.name] = ''
                            }
                        }
                    }
                })

                table.data.push(newRow)
                insertedCount++
            })

            // Save the database
            this.saveDatabase(database)

            return {
                success: true,
                output: `${insertedCount} row${insertedCount !== 1 ? 's' : ''} inserted into ${tableName}`,
                affectedRows: insertedCount,
                queryType: 'INSERT'
            }

        } catch (error) {
            return {
                success: false,
                output: '',
                error: `INSERT error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                queryType: 'INSERT'
            }
        }
    }

    private static executeUpdateQuery(database: BrowserDatabase, query: string): ExecutionResult {
        try {
            const updateMatch = query.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?/is)
            if (!updateMatch) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid UPDATE syntax',
                    queryType: 'UPDATE'
                }
            }

            const tableName = updateMatch[1]
            const setClause = updateMatch[2]
            const whereClause = updateMatch[3]

            const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase())
            if (!table) {
                return {
                    success: false,
                    output: '',
                    error: `Table "${tableName}" does not exist`,
                    queryType: 'UPDATE'
                }
            }

            // Parse SET clause
            const setPairs = setClause.split(',').map(pair => {
                const [col, val] = pair.split('=').map(p => p.trim())
                return {
                    column: col.replace(/[`"']/g, ''),
                    value: val
                }
            })

            let updatedCount = 0

            table.data.forEach(row => {
                // Apply WHERE clause if exists
                let shouldUpdate = true
                if (whereClause) {
                    shouldUpdate = this.evaluateSimpleCondition(row, whereClause, table)
                }

                if (shouldUpdate) {
                    setPairs.forEach(pair => {
                        let value = pair.value

                        // Handle NULL
                        if (value.toUpperCase() === 'NULL') {
                            row[pair.column] = null
                        }
                        // Handle DEFAULT
                        else if (value.toUpperCase() === 'DEFAULT') {
                            const column = table.columns.find(c => c.name === pair.column)
                            row[pair.column] = column?.defaultValue
                        }
                        // Remove quotes and convert
                        else {
                            value = value.replace(/^['"]|['"]$/g, '')
                            const column = table.columns.find(c => c.name === pair.column)

                            if (column?.type.includes('INT') || column?.type.includes('DECIMAL') || column?.type.includes('FLOAT') || column?.type.includes('DOUBLE')) {
                                row[pair.column] = parseFloat(value)
                            } else if (column?.type.includes('DATE') || column?.type.includes('TIME')) {
                                row[pair.column] = new Date(value)
                            } else if (column?.type === 'BOOLEAN') {
                                row[pair.column] = value.toLowerCase() === 'true' || value === '1'
                            } else {
                                row[pair.column] = value
                            }
                        }
                    })
                    updatedCount++
                }
            })

            return {
                success: true,
                output: `${updatedCount} row${updatedCount !== 1 ? 's' : ''} updated`,
                affectedRows: updatedCount,
                queryType: 'UPDATE'
            }

        } catch (error) {
            return {
                success: false,
                output: '',
                error: `UPDATE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                queryType: 'UPDATE'
            }
        }
    }

    private static executeDeleteQuery(database: BrowserDatabase, query: string): ExecutionResult {
        try {
            const deleteMatch = query.match(/DELETE FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/is)
            if (!deleteMatch) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid DELETE syntax',
                    queryType: 'DELETE'
                }
            }

            const tableName = deleteMatch[1]
            const whereClause = deleteMatch[2]

            const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase())
            if (!table) {
                return {
                    success: false,
                    output: '',
                    error: `Table "${tableName}" does not exist`,
                    queryType: 'DELETE'
                }
            }

            let deletedCount = 0

            if (whereClause) {
                // Delete rows matching WHERE clause
                table.data = table.data.filter(row => {
                    const shouldDelete = this.evaluateSimpleCondition(row, whereClause, table)
                    if (shouldDelete) deletedCount++
                    return !shouldDelete
                })
            } else {
                // Delete all rows
                deletedCount = table.data.length
                table.data = []
            }

            return {
                success: true,
                output: `${deletedCount} row${deletedCount !== 1 ? 's' : ''} deleted`,
                affectedRows: deletedCount,
                queryType: 'DELETE'
            }

        } catch (error) {
            return {
                success: false,
                output: '',
                error: `DELETE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                queryType: 'DELETE'
            }
        }
    }

    private static executeDropTableQuery(database: BrowserDatabase, query: string): ExecutionResult {
        try {
            const dropMatch = query.match(/DROP TABLE\s+(\w+)/i)
            if (!dropMatch) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid DROP TABLE syntax',
                    queryType: 'DROP'
                }
            }

            const tableName = dropMatch[1]
            const tableIndex = database.tables.findIndex(t => t.name.toLowerCase() === tableName.toLowerCase())

            if (tableIndex === -1) {
                return {
                    success: false,
                    output: '',
                    error: `Table "${tableName}" does not exist`,
                    queryType: 'DROP'
                }
            }

            database.tables.splice(tableIndex, 1)

            return {
                success: true,
                output: `Table "${tableName}" dropped`,
                affectedRows: 0,
                queryType: 'DROP'
            }

        } catch (error) {
            return {
                success: false,
                output: '',
                error: `DROP TABLE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                queryType: 'DROP'
            }
        }
    }

    private static executeTruncateTableQuery(database: BrowserDatabase, query: string): ExecutionResult {
        try {
            const truncateMatch = query.match(/TRUNCATE TABLE\s+(\w+)/i)
            if (!truncateMatch) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid TRUNCATE syntax',
                    queryType: 'TRUNCATE'
                }
            }

            const tableName = truncateMatch[1]
            const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase())

            if (!table) {
                return {
                    success: false,
                    output: '',
                    error: `Table "${tableName}" does not exist`,
                    queryType: 'TRUNCATE'
                }
            }

            const rowCount = table.data.length
            table.data = []

            return {
                success: true,
                output: `Table "${tableName}" truncated`,
                affectedRows: rowCount,
                queryType: 'TRUNCATE'
            }

        } catch (error) {
            return {
                success: false,
                output: '',
                error: `TRUNCATE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                queryType: 'TRUNCATE'
            }
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
        }))

        return {
            success: true,
            output: `Tables in ${database.name}`,
            resultSet: tables,
            columns: ['Tables_in_database', 'Table_type', 'Engine', 'Rows', 'Create_time', 'Collation'],
            rowCount: tables.length,
            queryType: 'SHOW'
        }
    }

    private static executeDescribeQuery(database: BrowserDatabase, query: string): ExecutionResult {
        try {
            const describeMatch = query.match(/(?:DESCRIBE|DESC)\s+(\w+)/i)
            if (!describeMatch) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid DESCRIBE syntax',
                    queryType: 'DESCRIBE'
                }
            }

            const tableName = describeMatch[1]
            const table = database.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase())

            if (!table) {
                return {
                    success: false,
                    output: '',
                    error: `Table "${tableName}" does not exist`,
                    queryType: 'DESCRIBE'
                }
            }

            const columnsInfo = table.columns.map(col => ({
                Field: col.name,
                Type: col.length ? `${col.type}(${col.length})` : col.type,
                Null: col.nullable ? 'YES' : 'NO',
                Key: col.primaryKey ? 'PRI' : col.unique ? 'UNI' : '',
                Default: col.defaultValue !== undefined ? String(col.defaultValue) : 'NULL',
                Extra: col.autoIncrement ? 'auto_increment' : ''
            }))

            return {
                success: true,
                output: `Structure of table "${tableName}"`,
                resultSet: columnsInfo,
                columns: ['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'],
                rowCount: columnsInfo.length,
                queryType: 'DESCRIBE'
            }

        } catch (error) {
            return {
                success: false,
                output: '',
                error: `DESCRIBE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                queryType: 'DESCRIBE'
            }
        }
    }

    private static executeAlterTableQuery(database: BrowserDatabase, query: string): ExecutionResult {
        // Simplified ALTER TABLE implementation
        return {
            success: true,
            output: 'ALTER TABLE executed (simulated)',
            affectedRows: 0,
            queryType: 'ALTER'
        }
    }

    private static executeCreateDatabaseQuery(database: BrowserDatabase, query: string): ExecutionResult {
        try {
            const createMatch = query.match(/CREATE DATABASE\s+(\w+)/i)
            if (!createMatch) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid CREATE DATABASE syntax',
                    queryType: 'CREATE'
                }
            }

            const dbName = createMatch[1]
            this.createDatabase(dbName)

            return {
                success: true,
                output: `Database "${dbName}" created`,
                affectedRows: 0,
                queryType: 'CREATE'
            }

        } catch (error) {
            return {
                success: false,
                output: '',
                error: `CREATE DATABASE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                queryType: 'CREATE'
            }
        }
    }

    private static executeDropDatabaseQuery(database: BrowserDatabase, query: string): ExecutionResult {
        try {
            const dropMatch = query.match(/DROP DATABASE\s+(\w+)/i)
            if (!dropMatch) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid DROP DATABASE syntax',
                    queryType: 'DROP'
                }
            }

            const dbName = dropMatch[1]
            this.deleteDatabase(dbName)

            return {
                success: true,
                output: `Database "${dbName}" dropped`,
                affectedRows: 0,
                queryType: 'DROP'
            }

        } catch (error) {
            return {
                success: false,
                output: '',
                error: `DROP DATABASE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                queryType: 'DROP'
            }
        }
    }

    private static executeUseQuery(database: BrowserDatabase, query: string): ExecutionResult {
        try {
            const useMatch = query.match(/USE\s+(\w+)/i)
            if (!useMatch) {
                return {
                    success: false,
                    output: '',
                    error: 'Invalid USE syntax',
                    queryType: 'USE'
                }
            }

            const dbName = useMatch[1]
            const databases = this.getDatabases()
            const targetDb = databases.find(db => db.name.toLowerCase() === dbName.toLowerCase())

            if (!targetDb) {
                return {
                    success: false,
                    output: '',
                    error: `Database "${dbName}" not found`,
                    queryType: 'USE'
                }
            }

            this.setCurrentDatabase(dbName)

            return {
                success: true,
                output: `Database changed to "${dbName}"`,
                affectedRows: 0,
                queryType: 'USE'
            }

        } catch (error) {
            return {
                success: false,
                output: '',
                error: `USE error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                queryType: 'USE'
            }
        }
    }

    private static executeShowDatabasesQuery(): ExecutionResult {
        const databases = this.getDatabases()
        const dbInfo = databases.map(db => ({
            Database: db.name,
            Size: '0 KB', // Simplified
            Created: db.createdAt.toISOString().split('T')[0]
        }))

        return {
            success: true,
            output: 'Databases',
            resultSet: dbInfo,
            columns: ['Database', 'Size', 'Created'],
            rowCount: dbInfo.length,
            queryType: 'SHOW'
        }
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
        }]

        return {
            success: true,
            output: 'EXPLAIN result',
            resultSet: explainResult,
            columns: ['id', 'select_type', 'table', 'partitions', 'type', 'possible_keys', 'key', 'key_len', 'ref', 'rows', 'filtered', 'Extra'],
            rowCount: 1,
            queryType: 'EXPLAIN'
        }
    }

    private static executeCreateIndexQuery(database: BrowserDatabase, query: string): ExecutionResult {
        // Simplified CREATE INDEX implementation
        return {
            success: true,
            output: 'Index created (simulated)',
            affectedRows: 0,
            queryType: 'CREATE'
        }
    }

    private static executeDropIndexQuery(database: BrowserDatabase, query: string): ExecutionResult {
        // Simplified DROP INDEX implementation
        return {
            success: true,
            output: 'Index dropped (simulated)',
            affectedRows: 0,
            queryType: 'DROP'
        }
    }

    private static executeBeginTransaction(database: BrowserDatabase): ExecutionResult {
        // Simplified transaction handling
        return {
            success: true,
            output: 'Transaction started',
            affectedRows: 0,
            queryType: 'BEGIN'
        }
    }

    private static executeCommitTransaction(database: BrowserDatabase): ExecutionResult {
        // Simplified transaction handling
        return {
            success: true,
            output: 'Transaction committed',
            affectedRows: 0,
            queryType: 'COMMIT'
        }
    }

    private static executeRollbackTransaction(database: BrowserDatabase): ExecutionResult {
        // Simplified transaction handling
        return {
            success: true,
            output: 'Transaction rolled back',
            affectedRows: 0,
            queryType: 'ROLLBACK'
        }
    }

    private static saveDatabase(database: BrowserDatabase): void {
        const databases = this.getDatabases()
        const dbIndex = databases.findIndex(db => db.name === database.name)

        if (dbIndex !== -1) {
            databases[dbIndex] = database
        } else {
            databases.push(database)
        }

        this.saveDatabases(databases)
    }
}

// Security Agreement Modal Component
const SecurityAgreementModal = ({
    isOpen,
    onAgree,
    onCancel,
    securitySettings,
    theme = "light"
}: {
    isOpen: boolean;
    onAgree: () => void;
    onCancel: () => void;
    securitySettings: SecuritySettings;
    theme?: "light" | "dark";
}) => {
    if (!isOpen) return null;

    const themeClasses = theme === 'dark'
        ? 'bg-gray-900 text-white border-gray-700'
        : 'bg-white text-gray-900 border-gray-300';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-xl shadow-2xl border p-6 ${themeClasses}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Assessment Security Agreement</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Please review and agree to the security measures</p>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <Monitor className="w-4 h-4" /> Security Features
                        </h3>
                        <ul className="space-y-2 text-sm">
                            {securitySettings.timerEnabled ? (
                                <li className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-blue-500" />
                                    <span>Timed Assessment: {securitySettings.timerDuration || 60} minutes</span>
                                </li>
                            ) : (
                                <li className="flex items-center gap-2 text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    <span>Timed Assessment: Disabled</span>
                                </li>
                            )}

                            {securitySettings.fullScreenMode ? (
                                <li className="flex items-center gap-2">
                                    <Maximize2 className="w-3 h-3 text-purple-500" />
                                    <span>Full Screen Mode Required</span>
                                </li>
                            ) : (
                                <li className="flex items-center gap-2 text-gray-400">
                                    <Maximize2 className="w-3 h-3" />
                                    <span>Full Screen Mode: Optional</span>
                                </li>
                            )}

                            {securitySettings.cameraMicEnabled ? (
                                <li className="flex items-center gap-2">
                                    <Camera className="w-3 h-3 text-green-500" />
                                    <span>Camera & Microphone Monitoring</span>
                                </li>
                            ) : (
                                <li className="flex items-center gap-2">
                                    <Camera className="w-3 h-3 text-gray-500" />
                                    <span>Camera: Disabled</span>
                                </li>
                            )}

                            {securitySettings.screenRecordingEnabled ? (
                                <li className="flex items-center gap-2">
                                    <Video className="w-3 h-3 text-red-500" />
                                    <span>Screen Recording Active</span>
                                </li>
                            ) : (
                                <li className="flex items-center gap-2 text-gray-400">
                                    <Video className="w-3 h-3" />
                                    <span>Screen Recording: Disabled</span>
                                </li>
                            )}

                            {securitySettings.tabSwitchAllowed === false ? (
                                <li className="flex items-center gap-2">
                                    <Lock className="w-3 h-3 text-yellow-500" />
                                    <span>Tab Switching Restricted</span>
                                </li>
                            ) : (
                                <li className="flex items-center gap-2 text-gray-400">
                                    <Lock className="w-3 h-3" />
                                    <span>Tab Switching: Allowed</span>
                                </li>
                            )}

                            {securitySettings.disableClipboard ? (
                                <li className="flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                                    <span>Copy/Paste Disabled</span>
                                </li>
                            ) : (
                                <li className="flex items-center gap-2 text-gray-400">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Copy/Paste: Allowed</span>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-medium border transition-colors ${theme === 'dark'
                            ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                    >
                        Cancel Assessment
                    </button>
                    <button
                        onClick={onAgree}
                        className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        I Understand & Agree
                    </button>
                </div>
            </div>
        </div>
    );
};

// Exit Confirmation Modal
const ExitConfirmationModal = (props: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    theme?: "light" | "dark";
}) => {
    const { isOpen, onConfirm, onCancel, theme = "light" } = props;

    if (!isOpen) return null;

    const themeClasses = theme === 'dark'
        ? 'bg-gray-900 text-white border-gray-700'
        : 'bg-white text-gray-900 border-gray-300';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-xl shadow-2xl border p-6 ${themeClasses}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Exit Assessment?</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Are you sure you want to leave the assessment?
                        </p>
                    </div>
                </div>

                <div className="mb-6">
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <h4 className="font-semibold mb-2">⚠️ Important Notice</h4>
                        <ul className="text-sm space-y-2">
                            <li className="flex items-start gap-2">
                                <div className="mt-0.5">•</div>
                                <span>Your progress will be saved up to this point</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-0.5">•</div>
                                <span>You cannot resume this assessment once exited</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-0.5">•</div>
                                <span>This action may be recorded and reviewed</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-medium border transition-colors ${theme === 'dark'
                            ? 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                    >
                        Continue Assessment
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Exit Assessment
                    </button>
                </div>
            </div>
        </div>
    );
};
// Database Result Table Component
const DatabaseResultTable = ({
    data,
    columns,
    queryType,
    theme = "light"
}: {
    data: any[];
    columns?: string[];
    queryType?: string;
    theme?: "light" | "dark";
}) => {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    if (!data || data.length === 0) {
        return (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                <Table className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No data returned</p>
                <p className="text-sm mt-1">The query returned an empty result set</p>
            </div>
        );
    }

    const effectiveColumns = columns || (data[0] ? Object.keys(data[0]) : []);

    // Filter data based on search term
    const filteredData = searchTerm ? data.filter(row =>
        effectiveColumns.some(col =>
            String(row[col] || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
    ) : data;

    // Sort data
    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortColumn) return 0;

        const valA = a[sortColumn];
        const valB = b[sortColumn];

        // Handle null values
        if (valA == null && valB == null) return 0;
        if (valA == null) return sortDirection === 'asc' ? -1 : 1;
        if (valB == null) return sortDirection === 'asc' ? 1 : -1;

        // Compare values
        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc'
            ? strA.localeCompare(strB)
            : strB.localeCompare(strA);
    });

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleSelectAll = () => {
        if (selectedRows.size === data.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(data.map((_, index) => index)));
        }
    };

    const handleSelectRow = (index: number) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedRows(newSelected);
    };

    return (
        <div className="rounded-lg border overflow-hidden">
            {/* Table Controls */}
            <div className={`p-3 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            placeholder="Search in results..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`pl-8 pr-3 py-1.5 text-sm border rounded w-64 focus:ring-1 focus:ring-blue-500 focus:outline-none ${theme === 'dark'
                                ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                        />
                    </div>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {filteredData.length} of {data.length} rows
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const csv = [
                                effectiveColumns.join(','),
                                ...sortedData.map(row =>
                                    effectiveColumns.map(col => {
                                        const val = row[col];
                                        if (val == null) return '';
                                        if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
                                        return String(val);
                                    }).join(',')
                                )
                            ].join('\n');

                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `query_results_${new Date().toISOString().split('T')[0]}.csv`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }}
                        className={`px-3 py-1.5 text-xs rounded flex items-center gap-1 ${theme === 'dark'
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                    >
                        <Download className="w-3 h-3" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'}`}>
                    <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}>
                        <tr>
                            <th className="px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={selectedRows.size === data.length && data.length > 0}
                                    onChange={handleSelectAll}
                                    className={`rounded ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                                />
                            </th>
                            {effectiveColumns.map((column, index) => (
                                <th
                                    key={index}
                                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                                    onClick={() => handleSort(column)}
                                >
                                    <div className="flex items-center gap-1">
                                        {column}
                                        {sortColumn === column && (
                                            <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}`}>
                        {sortedData.slice(0, 100).map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={`${selectedRows.has(rowIndex)
                                    ? (theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50')
                                    : (theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50')}`}
                                onClick={() => handleSelectRow(rowIndex)}
                            >
                                <td className="px-4 py-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.has(rowIndex)}
                                        onChange={() => handleSelectRow(rowIndex)}
                                        className={`rounded ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </td>
                                {effectiveColumns.map((column, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                                    >
                                        {row[column] === null ? (
                                            <span className="italic text-gray-400 dark:text-gray-500">NULL</span>
                                        ) : row[column] === undefined ? (
                                            <span className="italic text-gray-400 dark:text-gray-500">-</span>
                                        ) : row[column] instanceof Date ? (
                                            row[column].toISOString().split('T')[0]
                                        ) : typeof row[column] === 'boolean' ? (
                                            <span className={`px-2 py-0.5 rounded text-xs ${row[column]
                                                ? (theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800')
                                                : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800')}`}>
                                                {row[column] ? 'TRUE' : 'FALSE'}
                                            </span>
                                        ) : typeof row[column] === 'object' ? (
                                            <span className="italic text-gray-400 dark:text-gray-500">
                                                [Object]
                                            </span>
                                        ) : (
                                            <div className="max-w-xs truncate" title={String(row[column])}>
                                                {String(row[column])}
                                            </div>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Table Footer */}
            <div className={`px-4 py-2 border-t ${theme === 'dark' ? 'border-gray-800 bg-gray-800 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                <div className="flex items-center justify-between text-xs">
                    <div>
                        Showing {Math.min(sortedData.length, 100)} of {sortedData.length} rows
                        {sortedData.length > 100 && (
                            <span className="ml-2 italic">(truncated for performance)</span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <span>
                            Selected: {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''}
                        </span>
                        {queryType && (
                            <span className={`px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                {queryType}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Database Management Panel
const DatabaseManagementPanel = ({
    currentDatabase,
    databases,
    onCreateDatabase,
    onImportDatabase,
    onExportDatabase,
    onSwitchDatabase,
    onDeleteDatabase,
    theme = "light"
}: {
    currentDatabase: BrowserDatabase | null
    databases: BrowserDatabase[]
    onCreateDatabase: () => void
    onImportDatabase: () => void
    onExportDatabase: () => void
    onSwitchDatabase: (name: string) => void
    onDeleteDatabase: (name: string) => void
    theme?: "light" | "dark"
}) => {
    const [isExpanded, setIsExpanded] = useState(true)

    return (
        <div className={`rounded-lg border mb-4 ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2">
                    <Database className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Database Manager
                    </span>
                    {currentDatabase && (
                        <span className={`text-xs px-2 py-1 rounded ${theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                            {currentDatabase.name}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCreateDatabase}
                        className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${theme === 'dark'
                            ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    >
                        <Database className="w-3 h-3" /> New
                    </button>
                    <button
                        onClick={onImportDatabase}
                        className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${theme === 'dark'
                            ? 'bg-green-900/50 text-green-300 hover:bg-green-800'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                    >
                        <Upload className="w-3 h-3" /> Import
                    </button>
                    {currentDatabase && (
                        <button
                            onClick={onExportDatabase}
                            className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${theme === 'dark'
                                ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-800'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                        >
                            <Download className="w-3 h-3" /> Export
                        </button>
                    )}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                    >
                        {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="p-4">
                    {/* Database Selection */}
                    <div className="mb-4">
                        <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Select Database
                        </label>
                        <div className="space-y-1">
                            {databases.map(db => (
                                <div
                                    key={db.name}
                                    className={`flex items-center justify-between p-2 rounded ${currentDatabase?.name === db.name
                                        ? (theme === 'dark' ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200')
                                        : (theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50')}`}
                                >
                                    <button
                                        onClick={() => onSwitchDatabase(db.name)}
                                        className="flex-1 text-left flex items-center gap-2"
                                    >
                                        <Database className={`w-3 h-3 ${currentDatabase?.name === db.name
                                            ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-600')
                                            : (theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}`} />
                                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {db.name}
                                        </span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                            {db.tables.length} tables
                                        </span>
                                    </button>
                                    {currentDatabase?.name !== db.name && (
                                        <button
                                            onClick={() => onDeleteDatabase(db.name)}
                                            className="p-1 text-red-500 hover:text-red-700"
                                            title="Delete database"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Database Info */}
                    {currentDatabase && (
                        <div className={`p-3 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Database Information
                                </h4>
                                <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                    v{currentDatabase.version}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>Tables:</span>
                                    <span className={`ml-2 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {currentDatabase.tables.length}
                                    </span>
                                </div>
                                <div>
                                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>Total Rows:</span>
                                    <span className={`ml-2 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {currentDatabase.tables.reduce((sum, table) => sum + table.data.length, 0)}
                                    </span>
                                </div>
                                <div>
                                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>Created:</span>
                                    <span className={`ml-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {currentDatabase.createdAt.toLocaleDateString()}
                                    </span>
                                </div>
                                <div>
                                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>Modified:</span>
                                    <span className={`ml-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {currentDatabase.lastModified.toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            {currentDatabase.description && (
                                <div className="mt-2 text-xs">
                                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>Description:</span>
                                    <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {currentDatabase.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Actions */}
                    {currentDatabase && (
                        <div className="mt-4">
                            <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Quick Actions
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { }}
                                    className={`p-2 text-xs rounded flex items-center justify-center gap-1 ${theme === 'dark'
                                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                >
                                    <Eye className="w-3 h-3" /> View Tables
                                </button>
                                <button
                                    onClick={() => { }}
                                    className={`p-2 text-xs rounded flex items-center justify-center gap-1 ${theme === 'dark'
                                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                >
                                    <RefreshCw className="w-3 h-3" /> Refresh
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// Main DBQueryEditor Component
interface DBQueryEditorProps {
    exercise?: DatabaseExercise
    defaultQuestions?: DatabaseQuestion[]
    theme?: "light" | "dark"
    courseId?: string
    nodeId?: string
    nodeName?: string
    nodeType?: string
    subcategory?: string
    category?: string
    studentId?: string
    onBack?: () => void
    onCloseExercise?: () => void
    onResetExercise?: () => void
}

export default function DBQueryEditor({
    exercise,
    defaultQuestions,
    theme = "light",
    courseId = "",
    nodeId = "",
    nodeName = "",
    nodeType = "",
    subcategory = "",
    category = "We_Do",
    studentId = "unknown_student",
    onBack,
    onCloseExercise,
    onResetExercise
}: DBQueryEditorProps) {
    // --- Security State ---
    const [isAssessmentMode, setIsAssessmentMode] = useState(false)
    const [showSecurityAgreement, setShowSecurityAgreement] = useState(false)
    const [hasAgreedToSecurity, setHasAgreedToSecurity] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const [isTerminated, setIsTerminated] = useState(false)
    const [terminationReason, setTerminationReason] = useState("")
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [tabSwitchCount, setTabSwitchCount] = useState(0)
    const [showTerminal, setShowTerminal] = useState(false)
    const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([])
    const [isRecording, setIsRecording] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
    const [isInFullscreenMode, setIsInFullscreenMode] = useState(false)
    const [micEnabled, setMicEnabled] = useState(true)
    // Add these states at the top with your other states
    const [sortBy, setSortBy] = useState<'default' | 'difficulty' | 'title'>('default')
    const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all')

    const [databases, setDatabases] = useState<BrowserDatabase[]>([])
    const [currentDatabase, setCurrentDatabase] = useState<BrowserDatabase | null>(null)
    const [queryResult, setQueryResult] = useState<ExecutionResult | null>(null)
    const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([])
    const [showQueryHistory, setShowQueryHistory] = useState(false)

    // --- Editor State ---
    const [code, setCode] = useState("")
    const [isRunning, setIsRunning] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [showSidebar, setShowSidebar] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [toasts, setToasts] = useState<ToastNotification[]>([])
    const [isLoadingAttempts, setIsLoadingAttempts] = useState(false)
    const [userAttempts, setUserAttempts] = useState(0)
    const [attemptsLoaded, setAttemptsLoaded] = useState(false)
    const [solvedQuestions, setSolvedQuestions] = useState<Set<number>>(new Set())
    const [skippedQuestions, setSkippedQuestions] = useState<Set<number>>(new Set())
    const [showSearch, setShowSearch] = useState(false);

    // --- Refs ---
    const editorInstanceRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedChunksRef = useRef<Blob[]>([])
    const animationFrameRef = useRef<number | null>(null)
    const screenVideoRef = useRef<HTMLVideoElement>(null)
    const [showExitConfirmation, setShowExitConfirmation] = useState(false)
    const [pendingExitAction, setPendingExitAction] = useState<(() => void) | null>(null)

    // --- Questions ---
    const questions = useMemo(() => {
        return exercise
            ? exercise.questions
            : (defaultQuestions || [])
    }, [exercise, defaultQuestions])

    const currentQuestion = questions.length > 0 ? questions[currentQuestionIndex] : null

    // --- Security Settings ---
    const securitySettings = exercise?.securitySettings || {}




    // Add this useEffect to handle fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isCurrentlyFullscreen);

            // If we're in assessment mode and user exited fullscreen without permission
            if (isAssessmentMode && hasStarted && !isCurrentlyFullscreen && !showExitConfirmation) {
                // Prevent the default ESC behavior
                if (document.fullscreenElement) {
                    // Request fullscreen again immediately
                    document.documentElement.requestFullscreen().catch(() => { });
                }

                // Show exit confirmation modal
                setPendingExitAction(() => () => {
                    if (document.fullscreenElement) {
                        document.exitFullscreen().catch(() => { });
                    }
                    handleCancelAssessment();
                });
                setShowExitConfirmation(true);
            }
        };

        // Also handle ESC key press specifically
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isAssessmentMode && hasStarted && e.key === 'Escape' && document.fullscreenElement) {
                e.preventDefault();
                e.stopPropagation();

                setPendingExitAction(() => () => {
                    document.exitFullscreen().catch(() => { });
                    handleCancelAssessment();
                });
                setShowExitConfirmation(true);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('keydown', handleKeyDown, true); // Use capture phase

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isAssessmentMode, hasStarted, showExitConfirmation]);



    // Determine if assessment mode is active
    useEffect(() => {
        const normCategory = (category || "").replace(/_/g, ' ').toLowerCase().trim()
        const isYouDoCategory = normCategory === 'you do'

        setIsAssessmentMode(isYouDoCategory)

        if (isYouDoCategory && !hasAgreedToSecurity) {
            setShowSecurityAgreement(true)
        }

        if (!isAssessmentMode) {
            setHasStarted(true)
        }
    }, [category, hasAgreedToSecurity])

    // Initialize database
    useEffect(() => {
        loadDatabases()
        loadQueryHistory()

        if (currentQuestion?.schema) {
            setCode(currentQuestion.schema)
        } else {
            setCode(`-- Write your SQL queries here
-- Use the database manager on the left to manage databases
-- Sample queries:
-- SELECT * FROM users;
-- INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com');
-- UPDATE users SET email = 'new@example.com' WHERE id = 1;
-- DELETE FROM users WHERE id = 1;`)
        }
    }, [currentQuestion])

    const loadDatabases = () => {
        const loadedDatabases = BrowserDatabaseManager.getDatabases()
        const currentDb = BrowserDatabaseManager.getCurrentDatabase()
        if (currentDb) {
            setCurrentDatabase(currentDb)
        }
    }
    const loadQueryHistory = () => {
        const history = BrowserDatabaseManager.getQueryHistory()
        setQueryHistory(history)
    }

    // --- Toast System ---
    const showToast = (notification: Omit<ToastNotification, 'id'>) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newToast = { ...notification, id }
        setToasts(prev => [...prev, newToast])
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id))
        }, notification.duration)
    }

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }


    const cycleSortOption = () => {
        const sortOptions: Array<'default' | 'difficulty' | 'title'> = ['default', 'difficulty', 'title']
        const currentIndex = sortOptions.indexOf(sortBy)
        const nextIndex = (currentIndex + 1) % sortOptions.length
        setSortBy(sortOptions[nextIndex])
    }

    const getSortIcon = () => {
        switch (sortBy) {
            case 'difficulty':
                return '🟢🟡🔴'
            case 'title':
                return 'A-Z'
            case 'default':
            default:
                return '123'
        }
    }

    const getFilteredAndSortedProblems = () => {
        let filtered = [...questions]

        // Apply difficulty filter
        if (filterDifficulty !== 'all') {
            filtered = filtered.filter(q => q.difficulty === filterDifficulty)
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim()
            filtered = filtered.filter(q =>
                q.title.toLowerCase().includes(query) ||
                q.description?.toLowerCase().includes(query)
            )
        }

        // Apply sorting
        switch (sortBy) {
            case 'difficulty':
                const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 }
                filtered.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty])
                break
            case 'title':
                filtered.sort((a, b) => a.title.localeCompare(b.title))
                break
            case 'default':
            default:
                filtered.sort((a, b) => a.sequence - b.sequence)
                break
        }

        return filtered
    }



    // --- Database Management Functions ---
    const handleCreateDatabase = () => {
        const name = prompt("Enter database name:")
        if (name && name.trim()) {
            const newDatabase = BrowserDatabaseManager.createDatabase(name.trim())
            setDatabases(prev => [...prev.filter(db => db.name !== newDatabase.name), newDatabase])
            setCurrentDatabase(newDatabase)
            showToast({
                type: 'success',
                title: 'Database Created',
                message: `Database "${name}" created successfully`,
                duration: 3000
            })
        }
    }

    const handleImportDatabase = () => {
        const data = prompt("Paste database export JSON:")
        if (data && data.trim()) {
            try {
                const importedDb = BrowserDatabaseManager.importDatabase(data.trim())
                setDatabases(prev => [...prev.filter(db => db.name !== importedDb.name), importedDb])
                setCurrentDatabase(importedDb)
                showToast({
                    type: 'success',
                    title: 'Database Imported',
                    message: `Database "${importedDb.name}" imported successfully`,
                    duration: 3000
                })
            } catch (error) {
                showToast({
                    type: 'error',
                    title: 'Import Failed',
                    message: error instanceof Error ? error.message : 'Invalid database format',
                    duration: 5000
                })
            }
        }
    }

    const handleExportDatabase = () => {
        if (!currentDatabase) return

        try {
            const exportData = BrowserDatabaseManager.exportDatabase(currentDatabase.name)
            const blob = new Blob([exportData], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${currentDatabase.name}_export_${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            showToast({
                type: 'success',
                title: 'Database Exported',
                message: `Database "${currentDatabase.name}" exported successfully`,
                duration: 3000
            })
        } catch (error) {
            showToast({
                type: 'error',
                title: 'Export Failed',
                message: error instanceof Error ? error.message : 'Failed to export database',
                duration: 5000
            })
        }
    }


    const handleSwitchDatabase = (name: string) => {
        BrowserDatabaseManager.setCurrentDatabase(name)
        const databases = BrowserDatabaseManager.getDatabases()
        const database = databases.find(db => db.name === name)
        if (database) {
            setCurrentDatabase(database)
        }
    }

    const handleDeleteDatabase = (name: string) => {
        if (!window.confirm(`Are you sure you want to delete database "${name}"? All data will be lost.`)) {
            return
        }

        const success = BrowserDatabaseManager.deleteDatabase(name)
        if (success) {
            setDatabases(prev => prev.filter(db => db.name !== name))

            if (currentDatabase?.name === name) {
                setCurrentDatabase(null)
                const remainingDatabases = BrowserDatabaseManager.getDatabases()
                if (remainingDatabases.length > 0) {
                    handleSwitchDatabase(remainingDatabases[0].name)
                }
            }

            showToast({
                type: 'success',
                title: 'Database Deleted',
                message: `Database "${name}" deleted successfully`,
                duration: 3000
            })
        }
    }

    // --- Query Execution ---
    const executeQuery = async (query: string): Promise<ExecutionResult> => {
        if (!currentDatabase) {
            return {
                success: false,
                output: '',
                error: 'No database selected. Please select or create a database first.',
                executionTime: 0
            }
        }

        const result = await BrowserDatabaseManager.executeQuery(currentDatabase.name, query)

        // Refresh database state
        if (result.success && result.queryType && ['CREATE', 'DROP', 'ALTER', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'].includes(result.queryType)) {
            const updatedDb = BrowserDatabaseManager.getCurrentDatabase()
            if (updatedDb) {
                setCurrentDatabase(updatedDb)
                loadDatabases()
            }
        }

        // Add to terminal logs
        const logType = result.success ? 'success' : 'error'
        const logContent = result.success
            ? `✅ Query executed successfully (${result.executionTime?.toFixed(2)}ms)`
            : `❌ Query failed: ${result.error}`

        addTerminalLog(logType, logContent)

        if (result.success && result.resultSet) {
            addTerminalLog('sql', `📊 Result: ${result.rowCount || 0} row${result.rowCount !== 1 ? 's' : ''} returned`)
        }

        return result
    }

    const runCode = async () => {
        if (!currentDatabase) {
            showToast({
                type: 'error',
                title: 'No Database',
                message: 'Please select or create a database first',
                duration: 3000
            })
            return
        }

        const query = editorInstanceRef.current ? editorInstanceRef.current.getValue() : code
        if (!query.trim()) {
            showToast({
                type: 'warning',
                title: 'Empty Query',
                message: 'Please write a SQL query first',
                duration: 3000
            })
            return
        }

        setIsRunning(true)
        setShowTerminal(true)

        try {
            // Split multiple queries by semicolon
            const queries = query.split(';').filter(q => q.trim())
            let lastResult: ExecutionResult | null = null

            for (const singleQuery of queries) {
                if (!singleQuery.trim()) continue

                addTerminalLog('system', `🔧 Executing: ${singleQuery.substring(0, 50)}${singleQuery.length > 50 ? '...' : ''}`)

                const result = await executeQuery(singleQuery)
                lastResult = result

                if (!result.success) {
                    addTerminalLog('error', `❌ Failed: ${result.error}`)
                    break
                }
            }

            setQueryResult(lastResult)

        } catch (error) {
            addTerminalLog('error', `❌ Execution error: ${error}`)
        } finally {
            setIsRunning(false)
        }
    }

    const addTerminalLog = (type: LogEntry['type'], content: string) => {
        setTerminalLogs(prev => [...prev, {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${prev.length}`,
            type,
            content,
            timestamp: Date.now()
        }])
    }

    const clearTerminal = () => setTerminalLogs([])

    // --- Security Functions ---
    const handleSecurityAgreement = () => {
        setHasAgreedToSecurity(true)
        setShowSecurityAgreement(false)
        startAssessment()
    }

    const startAssessment = async () => {
        if (!isAssessmentMode) return

        setHasStarted(true)

        // Force fullscreen
        try {
            await document.documentElement.requestFullscreen()
            setIsFullscreen(true)
            setIsInFullscreenMode(true)
        } catch (error) {
            console.error('Fullscreen error:', error)
            showToast({
                type: 'error',
                title: 'Fullscreen Required',
                message: 'Assessment cannot start without fullscreen',
                duration: 5000
            })
            return
        }

        // Start recording if enabled
        if (securitySettings.screenRecordingEnabled) {
            // Start screen recording implementation here
            showToast({
                type: 'success',
                title: 'Assessment Started',
                message: 'Screen recording and security features are active',
                duration: 5000
            })
        } else {
            showToast({
                type: 'success',
                title: 'Assessment Started',
                message: 'Security features are now active',
                duration: 5000
            })
        }
    }
const handleTermination = useCallback(async (reason: string, status: 'completed' | 'terminated' = 'terminated') => {
  setIsLocked(true);
  setIsTerminated(true);
  setTerminationReason(reason);
 
  let screenRecordingBlob: Blob | null = null;
 
  // Create blob from recorded chunks if available
  if (securitySettings.screenRecordingEnabled && recordedChunksRef.current.length > 0) {
    screenRecordingBlob = new Blob(recordedChunksRef.current, {
      type: mediaRecorderRef.current?.mimeType || 'video/webm'
    });
    console.log('📹 Screen recording blob created:', {
      size: screenRecordingBlob.size,
      type: screenRecordingBlob.type
    });
  }
 
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => { });
  }
 
  showToast({
    type: 'error',
    title: 'Assessment Terminated',
    message: reason,
    duration: 10000
  });
 
  // Lock exercise on backend with screen recording
  try {
    const token = localStorage.getItem('smartcliff_token') || '';
    const formData = new FormData();
   
    // Add all data as separate form fields
    formData.append('courseId', courseId || '');
    formData.append('exerciseId', exercise?._id || '');
    formData.append('category', 'You_Do');
    formData.append('subcategory', subcategory || '');
    formData.append('status', status);
    formData.append('isLocked', 'true');
    formData.append('reason', reason || '');
   
    // Get user ID from token or localStorage
    const userData = localStorage.getItem('userData');
    const targetUserId = userData ? JSON.parse(userData)._id : '';
    if (targetUserId) {
      formData.append('targetUserId', targetUserId);
    }
 
    console.log('📤 Sending lock request with form data fields:');
    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        console.log(`${key}: ${value}`);
      } else {
        console.log(`${key}: [File] - ${value.name} (${value.size} bytes)`);
      }
    });
 
    // Add screen recording if available
    if (screenRecordingBlob) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `terminated_${courseId}_${studentId}_${exercise?._id}_${timestamp}.webm`;
      formData.append('screenRecording', screenRecordingBlob, filename);
      console.log('🎥 Added screen recording to form data:', filename, screenRecordingBlob.size);
    }
 
    const response = await fetch('https://lms-server-ym1q.onrender.com/exercise/lock', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type header - let browser set it with boundary
      },
      body: formData
    });
 
    const responseData = await response.json();
   
    if (response.ok) {
      addTerminalLog('success', '✅ Exercise locked with recording successfully');
      console.log('✅ Server response:', responseData);
    } else {
      console.error('❌ Server error response:', responseData);
      throw new Error(`Server responded with ${response.status}: ${JSON.stringify(responseData)}`);
    }
  } catch (error) {
    console.error('Failed to lock exercise:', error);
    addTerminalLog('error', `❌ Failed to lock exercise: ${error.message}`);
  }
}, [courseId, exercise, subcategory, securitySettings.screenRecordingEnabled, studentId]);
 
    const handleCancelAssessment = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { })
        }

        setIsAssessmentMode(false)
        setHasAgreedToSecurity(false)
        setHasStarted(false)
        setIsLocked(false)
        setShowExitConfirmation(false)

        if (onCloseExercise) {
            onCloseExercise()
        } else if (onBack) {
            onBack()
        }

        showToast({
            type: 'info',
            title: 'Assessment Cancelled',
            message: 'Returning to exercises...',
            duration: 3000
        })
    }

    // --- Submission ---
    const submitCode = async () => {
        if (isAssessmentMode && !hasStarted) {
            showToast({
                type: 'warning',
                title: 'Assessment Not Started',
                message: 'Please start the assessment first',
                duration: 3000
            })
            return
        }

        // Check attempts
        if (exercise?.questionBehavior.attemptLimitEnabled && currentQuestion) {
            const max = exercise.questionBehavior.maxAttempts || 1
            if (userAttempts >= max) {
                showToast({
                    type: 'error',
                    title: 'Limit Reached',
                    message: `Maximum attempts reached (${userAttempts}/${max})`,
                    duration: 4000
                })
                return
            }
        }

        setIsRunning(true)
        setShowTerminal(true)
        clearTerminal()

        addTerminalLog('system', '🚀 Starting submission process...')

        try {
            // For You Do assessments, just submit for manual evaluation
            const token = localStorage.getItem('smartcliff_token') || ''
            const response = await fetch('https://lms-server-ym1q.onrender.com/courses/answers/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    courseId,
                    exerciseId: exercise?._id || '',
                    questionId: currentQuestion?._id || '',
                    code: editorInstanceRef.current ? editorInstanceRef.current.getValue() : code,
                    score: 0,
                    status: 'submitted',
                    category: category || "We_Do",
                    subcategory,
                    nodeId,
                    nodeName,
                    nodeType,
                    language: 'sql',
                    attemptLimitEnabled: exercise?.questionBehavior.attemptLimitEnabled,
                    maxAttempts: exercise?.questionBehavior.maxAttempts
                }),
            })

            if (response.ok) {
                setUserAttempts(prev => prev + 1)
                setSolvedQuestions(prev => {
                    const newSet = new Set(prev)
                    newSet.add(currentQuestionIndex)
                    return newSet
                })

                addTerminalLog('success', '✅ Code submitted for manual evaluation!')

                // Auto-navigate if allowed
                if (exercise?.questionBehavior.allowNext && currentQuestionIndex < questions.length - 1) {
                    let countdown = 3
                    const countdownInterval = setInterval(() => {
                        addTerminalLog('system', `⏱️ Next question in ${countdown}...`)
                        countdown--

                        if (countdown < 0) {
                            clearInterval(countdownInterval)
                            setCurrentQuestionIndex(currentQuestionIndex + 1)
                            addTerminalLog('system', '➡️ Moving to next question...')
                        }
                    }, 1000)
                }

                // Check if last question in assessment mode
                if (isAssessmentMode && currentQuestionIndex === questions.length - 1) {
                    setTimeout(() => {
                        handleTermination("Assessment Completed Successfully", 'completed')
                    }, 2000)
                }
            } else {
                throw new Error('Submission failed')
            }

        } catch (error) {
            addTerminalLog('error', `❌ ${error}`)
        } finally {
            setIsRunning(false)
        }
    }

    // --- Question Navigation ---
    const nextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1)
        }
    }

    const prevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1)
        }
    }

    const selectQuestion = (index: number) => {
        if (index >= 0 && index < questions.length) {
            setCurrentQuestionIndex(index)
        }
    }

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } else {
            await document.exitFullscreen()
            setIsFullscreen(false)
        }
    }

    const resetCode = () => {
        if (currentQuestion?.schema) {
            setCode(currentQuestion.schema)
            if (editorInstanceRef.current) {
                editorInstanceRef.current.setValue(currentQuestion.schema)
            }
            addTerminalLog('system', 'Code reset to initial schema')
        }
    }

    // --- Render ---
    if (isTerminated || isLocked) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white p-4">
                <div className="bg-zinc-800 p-8 rounded border border-red-600 max-w-md text-center shadow-2xl">
                    {isSaving ? (
                        <>
                            <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                            <h2 className="text-xl font-bold mb-2">Saving Session...</h2>
                            <p className="text-gray-400">Please wait while we save your assessment data.</p>
                        </>
                    ) : (
                        <>
                            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold mb-2">Access Terminated</h2>
                            <p className="mb-4 text-red-200">{terminationReason}</p>
                            <button
                                className="bg-zinc-700 px-6 py-2 rounded hover:bg-zinc-600 font-bold w-full"
                                onClick={onBack}
                            >
                                Return to Dashboard
                            </button>
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className={`${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} border-gray-300 rounded-lg w-full flex flex-col border transition-all duration-300 ${isFullscreen
                ? "fixed inset-0 z-50 rounded-none"
                : "relative h-full min-h-0 flex-1"
                }`}
        >
            {/* Security Agreement Modal */}
            <SecurityAgreementModal
                isOpen={showSecurityAgreement}
                onAgree={handleSecurityAgreement}
                onCancel={handleCancelAssessment}
                securitySettings={securitySettings}
                theme={theme}
            />

            <ExitConfirmationModal
                isOpen={showExitConfirmation}
                onConfirm={() => {
                    if (pendingExitAction) {
                        pendingExitAction()
                    }
                    setShowExitConfirmation(false)
                    setPendingExitAction(null)
                }}
                onCancel={() => {
                    setShowExitConfirmation(false)
                    setPendingExitAction(null)
                    if (isAssessmentMode && hasStarted && !document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(() => { })
                    }
                }}
                theme={theme}
            />

            {/* Header */}
            <div className={`flex items-center justify-between p-2.5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                {/* In the header section */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-700'}`}
                        title={showSidebar ? 'Hide questions' : 'Show questions'}
                    >
                        {showSidebar ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>

                    {questions.length > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={prevQuestion}
                                disabled={currentQuestionIndex === 0}
                                className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-200 text-gray-700'} disabled:opacity-50`}
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-medium">{currentQuestionIndex + 1}/{questions.length}</span>
                            <button
                                onClick={nextQuestion}
                                disabled={currentQuestionIndex === questions.length - 1}
                                className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-200 text-gray-700'} disabled:opacity-50`}
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowTerminal(true)}
                        className={`h-7 px-2 text-xs border rounded flex items-center gap-1 ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-200 text-gray-700'}`}
                    >
                        <Terminal className="w-3 h-3" />
                        Console
                    </button>

                    {isAssessmentMode && hasStarted && (
                        <button
                            onClick={() => {
                                setPendingExitAction(() => handleCancelAssessment)
                                setShowExitConfirmation(true)
                            }}
                            className={`h-7 px-2 text-xs border rounded flex items-center gap-1 ${theme === 'dark'
                                ? 'border-red-600 hover:bg-red-900/50 text-red-400'
                                : 'border-red-300 hover:bg-red-50 text-red-600'}`}
                        >
                            <LogOut className="w-3 h-3" />
                            Exit
                        </button>
                    )}

                    <button
                        onClick={runCode}
                        disabled={isRunning || !currentDatabase}
                        className="h-7 px-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                    >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Run
                    </button>

                    <button
                        onClick={submitCode}
                        disabled={isRunning || (exercise?.questionBehavior.attemptLimitEnabled && userAttempts >= (exercise.questionBehavior.maxAttempts || 1))}
                        className="h-7 px-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center gap-1 disabled:cursor-not-allowed"
                    >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        {exercise?.questionBehavior.attemptLimitEnabled && userAttempts >= (exercise.questionBehavior.maxAttempts || 1)
                            ? "Limit Reached"
                            : "Submit"}
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark' ? 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300' : 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                {/* Left Sidebar - Questions List Only */}
                {showSidebar && (
                    <div className={`w-80 border-r overflow-hidden flex flex-col ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-white'}`}>
                        {/* Questions Header */}
                        <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                    Questions ({questions.length})
                                </h3>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setShowSearch(!showSearch)}
                                        className={`p-1 ml-1 rounded transition-colors ${showSearch ? (theme === 'dark' ? 'bg-blue-700' : 'bg-blue-500') : (theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600')}`}
                                    >
                                        {showSearch ? <XIcon className="w-3.5 h-3.5 text-white" /> : <Search className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {showSearch && (
                                <div className="relative mb-3">
                                    <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                                    <input
                                        type="text"
                                        placeholder="Search questions..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={`w-full pl-8 pr-6 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none ${theme === 'dark' ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500'}`}
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery("")} className="absolute right-1 top-1/2 transform -translate-y-1/2">
                                            <XIcon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Filter and Sort Controls */}
                            <div className="flex items-center justify-between gap-3">
                                {/* Difficulty Filter Dropdown */}
                                <div className="flex-1">
                                    <select
                                        value={filterDifficulty}
                                        onChange={(e) => setFilterDifficulty(e.target.value as any)}
                                        className={`w-full text-xs border rounded px-2 py-1.5 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-900'}`}
                                    >
                                        <option value="all">All Difficulties</option>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>

                                {/* Sort Icon Button */}
                                <button
                                    onClick={cycleSortOption}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded transition-colors ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`}
                                    title={`Sort by: ${sortBy === 'default' ? 'Default Order' : sortBy === 'difficulty' ? 'Difficulty' : 'Title'}. Click to change.`}
                                >
                                    <ArrowUpDown className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                                    <span className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {sortBy === 'default' ? 'Default' : sortBy === 'difficulty' ? 'Difficulty' : 'Title'}
                                    </span>
                                </button>
                            </div>

                            {/* Sort Indicator */}
                            <div className={`mt-2 text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} flex items-center justify-between`}>
                                <span>
                                    {filterDifficulty !== 'all' && `Filtered: ${filterDifficulty}`}
                                    {filterDifficulty === 'all' && 'Showing all difficulties'}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span>Sort:</span>
                                    <span className={`px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                        {getSortIcon()}
                                    </span>
                                </span>
                            </div>
                        </div>

                        {/* Questions List */}
                        <div className="flex-1 overflow-y-auto">
                            {getFilteredAndSortedProblems().length === 0 ? (
                                <div className="p-4 text-center">
                                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        No questions found
                                        {filterDifficulty !== 'all' && ` for "${filterDifficulty}" difficulty`}
                                        {searchQuery && ` matching "${searchQuery}"`}
                                    </div>
                                </div>
                            ) : (
                                getFilteredAndSortedProblems().map((p, index) => {
                                    const originalIndex = questions.findIndex(prob => prob._id === p._id);
                                    return (
                                        <button
                                            key={p._id}  // Use _id instead of id
                                            onClick={() => selectQuestion(originalIndex)}
                                            className={`w-full p-3 text-left transition-colors border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'} ${currentQuestionIndex === originalIndex
                                                ? (theme === 'dark' ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : 'bg-blue-50 border-l-2 border-l-blue-500')
                                                : (theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50')}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                                        {originalIndex + 1}. {p.title}
                                                    </div>
                                                    <div className="flex gap-2 mt-1 items-center">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.difficulty === 'easy'
                                                            ? (theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800')
                                                            : p.difficulty === 'medium'
                                                                ? (theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800')
                                                                : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800')}`}>
                                                            {p.difficulty}
                                                        </span>
                                                        {solvedQuestions.has(originalIndex) && (
                                                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                        )}
                                                        {skippedQuestions.has(originalIndex) && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                                                                Skipped
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Question Description */}
                    <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-white'}`}>
                        <h1 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                            {currentQuestion?.title || "Database Question"}
                        </h1>
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${currentQuestion?.difficulty === "easy" || currentQuestion?.difficulty === "beginner"
                                ? (theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800')
                                : currentQuestion?.difficulty === "medium" || currentQuestion?.difficulty === "intermediate"
                                    ? (theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800')
                                    : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800')}`}>
                                {currentQuestion?.difficulty || "Medium"}
                            </span>
                            {exercise?.questionBehavior.attemptLimitEnabled && (
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${userAttempts >= (exercise.questionBehavior.maxAttempts || 1)
                                    ? (theme === 'dark' ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-100 text-red-800 border-red-200')
                                    : (theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200')}`}>
                                    Attempts: {userAttempts} / {exercise.questionBehavior.maxAttempts}
                                </span>
                            )}
                        </div>
                        <div className={`text-sm space-y-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {currentQuestion?.description?.split('\n').map((line, i) => <p key={i} className="leading-relaxed">{line}</p>)}
                        </div>
                    </div>

                    {/* Editor and Results Split View */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Editor Panel */}
                        <div className="w-1/2 border-r flex flex-col">
                            <div className={`flex items-center justify-between p-2 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                                <div className="flex items-center gap-1.5">
                                    <Code className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>SQL Editor</span>
                                    {currentDatabase && (
                                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                            ({currentDatabase.name})
                                        </span>
                                    )}
                                </div>
                                <button onClick={resetCode} className={`flex items-center gap-1 px-2 py-0.5 text-xs border rounded transition-colors ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                                </button>
                            </div>
                            <div className="flex-1">
                                <MonacoEditor
                                    key={`editor-${currentQuestionIndex}`}
                                    height="100%"
                                    language="sql"
                                    value={code}
                                    onChange={(value) => setCode(value || '')}
                                    onMount={(editor) => {
                                        editorInstanceRef.current = editor
                                        editor.focus()
                                    }}
                                    theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                                    options={{
                                        minimap: { enabled: true },
                                        fontSize: 14,
                                        readOnly: isAssessmentMode && !hasStarted,
                                        wordWrap: 'on',
                                        automaticLayout: true
                                    }}
                                />
                            </div>
                        </div>

                        {/* Results Panel */}
                        <div className="w-1/2 flex flex-col">
                            <div className={`flex items-center justify-between p-2 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                                <div className="flex items-center gap-1.5">
                                    <Table className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
                                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Query Results</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {queryResult && (
                                        <>
                                            <span className={`text-xs px-2 py-0.5 rounded ${queryResult.success
                                                ? (theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800')
                                                : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800')}`}>
                                                {queryResult.success ? '✓ Success' : '✗ Error'}
                                            </span>
                                            {queryResult?.executionTime && (
                                                <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                                    {queryResult.executionTime.toFixed(2)}ms
                                                </span>
                                            )}
                                            {queryResult?.rowCount !== undefined && (
                                                <span className={`text-xs ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    {queryResult.rowCount} row{queryResult.rowCount !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto">
                                {queryResult ? (
                                    <>
                                        {/* Show query execution info */}
                                        <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                                {queryResult.queryType && (
                                                    <span className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                                        Type: {queryResult.queryType}
                                                    </span>
                                                )}
                                                {queryResult.database && (
                                                    <span className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                                                        DB: {queryResult.database}
                                                    </span>
                                                )}
                                                {queryResult.affectedRows !== undefined && (
                                                    <span className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'}`}>
                                                        Affected: {queryResult.affectedRows}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Show success/error message */}
                                        {!queryResult.success ? (
                                            <div className={`p-4 m-4 rounded-lg border ${theme === 'dark' ? 'border-red-800 bg-red-900/20' : 'border-red-200 bg-red-50'}`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertTriangle className={`w-5 h-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                                                    <span className={`font-medium ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                                                        Query Error
                                                    </span>
                                                </div>
                                                <div className={`font-mono text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                                                    {queryResult.error}
                                                </div>
                                                {queryResult.sqlMessage && (
                                                    <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                                                        {queryResult.sqlMessage}
                                                    </div>
                                                )}
                                            </div>
                                        ) : queryResult.resultSet ? (
                                            // Show table results for SELECT queries
                                            <div className="p-4">
                                                <div className="mb-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            Query Results
                                                        </span>
                                                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                                            Showing {Math.min(queryResult.resultSet.length, 100)} of {queryResult.resultSet.length} rows
                                                        </span>
                                                    </div>
                                                    <DatabaseResultTable
                                                        data={queryResult.resultSet.slice(0, 100)} // Limit to 100 rows for performance
                                                        columns={queryResult.columns}
                                                        queryType={queryResult.queryType}
                                                        theme={theme}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            // Show success message for DML/DDL queries
                                            <div className={`p-4 m-4 rounded-lg ${theme === 'dark' ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                                                    <span className={`font-medium ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                                                        Query Executed Successfully
                                                    </span>
                                                </div>
                                                <div className={`text-sm ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                                                    {queryResult.output || 'Query completed successfully'}
                                                </div>
                                                {queryResult.affectedRows !== undefined && queryResult.affectedRows > 0 && (
                                                    <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                                                        ✓ {queryResult.affectedRows} row{queryResult.affectedRows !== 1 ? 's' : ''} affected
                                                    </div>
                                                )}
                                                {queryResult.message && (
                                                    <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                                                        {queryResult.message}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    // Empty state
                                    <div className="h-full flex flex-col items-center justify-center p-8">
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                            <Table className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                                        </div>
                                        <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                            No Query Results Yet
                                        </h3>
                                        <p className={`text-center max-w-md mb-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                            Run a SQL query to see the results displayed here in table format.
                                            Results will appear automatically when you execute your query.
                                        </p>
                                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-green-500' : 'bg-green-600'}`}></div>
                                                    <span>SELECT queries show table results</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'}`}></div>
                                                    <span>DML queries show affected rows</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-yellow-500' : 'bg-yellow-600'}`}></div>
                                                <span>Errors show detailed messages</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terminal Modal */}
            {/* {showTerminal && (
                <div className={`fixed inset-x-0 bottom-0 z-40 h-96 ${theme === 'dark' ? 'bg-gray-900 border-t border-gray-700' : 'bg-white border-t border-gray-300'}`}>
                    <div className="flex items-center justify-between p-2 border-b">
                        <div className="flex items-center gap-2">
                            <Terminal className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Console</span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                ({terminalLogs.length} logs)
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={clearTerminal}
                                className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
                                title="Clear"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowTerminal(false)}
                                className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
                                title="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="h-[calc(100%-40px)] overflow-auto p-2 font-mono text-sm">
                        {terminalLogs.length === 0 ? (
                            <div className={`italic ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                                Run queries to see logs here
                            </div>
                        ) : (
                            terminalLogs.map((log) => (
                                <div key={log.id} className="mb-1">
                                    <span className={`mr-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <span className={
                                        log.type === 'success' ? 'text-green-600 dark:text-green-400' :
                                        log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                                        log.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                                        log.type === 'sql' ? 'text-blue-600 dark:text-blue-400' :
                                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                    }>
                                        {log.content}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )} */}

            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-start gap-3 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${toast.type === 'success' ? 'bg-green-50 border border-green-200' : toast.type === 'error' ? 'bg-red-50 border border-red-200' : toast.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'}`}
                    >
                        <div className={`flex-shrink-0 ${toast.type === 'success' ? 'text-green-500' : toast.type === 'error' ? 'text-red-500' : toast.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`}>
                            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : toast.type === 'error' ? <XCircle className="w-5 h-5" /> : toast.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">{toast.title}</h4>
                            <p className="text-xs text-gray-600">{toast.message}</p>
                        </div>
                        <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}