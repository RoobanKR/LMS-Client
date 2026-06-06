"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Code, 
  CheckCircle, 
  Loader2,
  Terminal,
  Trash2,
  Play,
  RotateCcw,
  Maximize2,
  Minimize2,
  X as XIcon,
  Monitor,
  Layout,
  Palette,
  Eye,
  RefreshCw,
  FileText,
  FileCode,
  FileJson
} from 'lucide-react';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }
);

interface FrontendQuestionProps {
  question: any;
  courseId: string;
  exerciseId: string;
  category: string;
  subcategory: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  studentId: string;
  onComplete: () => void;
  onNext: () => void;
  isLastQuestion: boolean;
  theme?: 'light' | 'dark';
}

interface LogEntry {
  id: string;
  type: 'stdout' | 'stderr' | 'system' | 'error' | 'warning' | 'success' | 'info';
  content: string;
  timestamp: number;
}

const FrontendQuestion: React.FC<FrontendQuestionProps> = ({
  question,
  courseId,
  exerciseId,
  category,
  subcategory,
  nodeId,
  nodeName,
  nodeType,
  studentId,
  onComplete,
  onNext,
  isLastQuestion,
  theme = 'light'
}) => {
  // State
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState("");
  const [selectedTab, setSelectedTab] = useState<'html' | 'css' | 'js' | 'preview'>('html');
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
  const [editorReady, setEditorReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewKey, setPreviewKey] = useState(Date.now());
  
  // Refs
  const htmlEditorRef = useRef<any>(null);
  const cssEditorRef = useRef<any>(null);
  const jsEditorRef = useRef<any>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  
  // Initialize
  useEffect(() => {
    // Start with completely clean files - no boilerplate
    setHtmlCode("");
    setCssCode("");
    setJsCode("");
    
    // If there's existing code in question, use it
    if (question.solutions?.htmlCode) {
      setHtmlCode(question.solutions.htmlCode);
    }
    if (question.solutions?.cssCode) {
      setCssCode(question.solutions.cssCode);
    }
    if (question.solutions?.jsCode) {
      setJsCode(question.solutions.jsCode);
    }
  }, [question]);

  // Terminal functions
  const addTerminalLog = (type: LogEntry['type'], content: string) => {
    setTerminalLogs(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${prev.length}`,
      type,
      content,
      timestamp: Date.now()
    }]);
  };

  const clearTerminal = () => setTerminalLogs([]);

  // Generate full HTML document
  const generateFullHtml = () => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${question.title || 'Frontend Exercise'}</title>
    <style>
        ${cssCode}
        
        /* Basic reset */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
    </style>
</head>
<body>
    ${htmlCode}
    
    <script>
        // Error handling for JavaScript
        try {
            ${jsCode}
        } catch (error) {
            console.error('JavaScript Error:', error);
            // Optionally display error on page
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'background: #fee; color: #c00; padding: 10px; margin: 10px 0; border: 1px solid #c00; border-radius: 4px; font-family: monospace;';
            errorDiv.innerHTML = '<strong>JavaScript Error:</strong> ' + error.message;
            document.body.appendChild(errorDiv);
        }
        
        // Console override to capture logs
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalInfo = console.info;
        
        console.log = function(...args) {
            originalLog.apply(console, args);
            window.parent.postMessage({ type: 'log', level: 'log', args: args.map(arg => String(arg)) }, '*');
        };
        
        console.error = function(...args) {
            originalError.apply(console, args);
            window.parent.postMessage({ type: 'log', level: 'error', args: args.map(arg => String(arg)) }, '*');
        };
        
        console.warn = function(...args) {
            originalWarn.apply(console, args);
            window.parent.postMessage({ type: 'log', level: 'warn', args: args.map(arg => String(arg)) }, '*');
        };
        
        console.info = function(...args) {
            originalInfo.apply(console, args);
            window.parent.postMessage({ type: 'log', level: 'info', args: args.map(arg => String(arg)) }, '*');
        };
    </script>
</body>
</html>
    `.trim();
  };

  // Run/preview code
  const runCode = () => {
    setIsRunning(true);
    setSelectedTab('preview');
    setPreviewKey(Date.now());
    
    // Clear previous logs
    setTerminalLogs([]);
    addTerminalLog('info', '🔄 Running frontend code...');
    
    // Add a small delay to ensure iframe loads
    setTimeout(() => {
      setIsRunning(false);
      addTerminalLog('success', '✅ Preview updated');
    }, 100);
  };

  // Reset code to initial state (empty)
  const resetCode = () => {
    setHtmlCode("");
    setCssCode("");
    setJsCode("");
    
    if (htmlEditorRef.current) {
      htmlEditorRef.current.setValue("");
    }
    if (cssEditorRef.current) {
      cssEditorRef.current.setValue("");
    }
    if (jsEditorRef.current) {
      jsEditorRef.current.setValue("");
    }
    
    addTerminalLog('system', 'Code reset to empty state');
    toast.info('Code reset');
  };

  // Submit code
  const submitCode = async () => {
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
      
      // Combine all code into a single string for submission
      const combinedCode = JSON.stringify({
        html: htmlCode,
        css: cssCode,
        js: jsCode,
        fullHtml: generateFullHtml()
      });

      const formData = new FormData();
      formData.append('courseId', courseId);
      formData.append('exerciseId', exerciseId);
      formData.append('questionId', question._id);
      formData.append('code', combinedCode);
      formData.append('score', "0");
      formData.append('status', 'submitted');
      formData.append('category', category);
      formData.append('subcategory', subcategory);
      formData.append('nodeId', nodeId);
      formData.append('nodeName', nodeName);
      formData.append('nodeType', 'frontend');
      formData.append('language', 'html');

      const response = await fetch('http://localhost:5533/courses/answers/submit', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        addTerminalLog('success', '✅ Frontend code submitted successfully!');
        toast.success('Frontend submission saved!');
        onComplete();
        
        // Auto-move to next question after delay
        setTimeout(() => {
          onNext();
        }, 1500);
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error("Submission error:", error);
      addTerminalLog('error', `❌ ${error}`);
      toast.error('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle iframe messages (for console logs)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'log') {
        const level = event.data.level;
        const message = event.data.args.join(' ');
        
        let type: LogEntry['type'] = 'info';
        switch (level) {
          case 'error': type = 'error'; break;
          case 'warn': type = 'warning'; break;
          case 'log': type = 'stdout'; break;
          case 'info': type = 'info'; break;
        }
        
        addTerminalLog(type, message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Editor functions
  const handleEditorDidMount = (editor: any, type: 'html' | 'css' | 'js') => {
    switch (type) {
      case 'html':
        htmlEditorRef.current = editor;
        if (htmlCode) editor.setValue(htmlCode);
        editor.updateOptions({
          language: 'html',
          fontSize: 14,
          tabSize: 2,
          theme: theme === 'dark' ? 'vs-dark' : 'vs'
        });
        break;
      case 'css':
        cssEditorRef.current = editor;
        if (cssCode) editor.setValue(cssCode);
        editor.updateOptions({
          language: 'css',
          fontSize: 14,
          tabSize: 2,
          theme: theme === 'dark' ? 'vs-dark' : 'vs'
        });
        break;
      case 'js':
        jsEditorRef.current = editor;
        if (jsCode) editor.setValue(jsCode);
        editor.updateOptions({
          language: 'javascript',
          fontSize: 14,
          tabSize: 2,
          theme: theme === 'dark' ? 'vs-dark' : 'vs'
        });
        break;
    }
    
    setEditorReady(true);
    editor.focus();
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Terminal Component
  const InteractiveTerminal = () => {
    if (!showTerminal) return null;

    return (
      <div className="fixed bottom-4 right-4 w-96 h-64 bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 flex flex-col z-50">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Console Output</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearTerminal}
              className="p-1 hover:bg-gray-800 rounded"
              title="Clear"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowTerminal(false)}
              className="p-1 hover:bg-gray-800 rounded"
              title="Close"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
          {terminalLogs.length === 0 && !isRunning && (
            <div className="text-gray-500 italic">Console output will appear here...</div>
          )}
          {terminalLogs.map((log) => (
            <div key={log.id} className="break-all whitespace-pre-wrap leading-relaxed">
              {log.type === 'stdout' && <span className="text-gray-300">{log.content}</span>}
              {log.type === 'stderr' && <span className="text-red-400">{log.content}</span>}
              {log.type === 'system' && <span className="text-blue-400">➜ {log.content}</span>}
              {log.type === 'error' && <span className="text-red-400">{log.content}</span>}
              {log.type === 'warning' && <span className="text-yellow-400">{log.content}</span>}
              {log.type === 'success' && <span className="text-green-400">{log.content}</span>}
              {log.type === 'info' && <span className="text-blue-400">{log.content}</span>}
            </div>
          ))}
          {isRunning && (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="w-3 h-3 text-green-500 animate-spin" />
              <span className="text-gray-500">Running code...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <InteractiveTerminal />
      
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{question.title || 'Frontend Question'}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                Frontend
              </span>
              <span>•</span>
              <Code className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500">
                {htmlCode.length > 0 ? `${htmlCode.split('\n').length} lines HTML` : 'Empty HTML'}
                {cssCode.length > 0 ? ` • ${cssCode.split('\n').length} lines CSS` : ' • Empty CSS'}
                {jsCode.length > 0 ? ` • ${jsCode.split('\n').length} lines JS` : ' • Empty JS'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTerminal(true)}
              className="h-7 px-2 text-xs border border-gray-300 rounded flex items-center gap-1 hover:bg-gray-50"
            >
              <Terminal className="w-3 h-3" />
              Console
            </button>
            
            <button
              onClick={runCode}
              disabled={isRunning}
              className="h-7 px-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
            >
              {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Run
            </button>
            
            <button
              onClick={resetCode}
              className="h-7 px-2 text-xs border border-gray-300 rounded flex items-center gap-1 hover:bg-gray-50"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            
            <button
              onClick={submitCode}
              disabled={isSubmitting}
              className="h-7 px-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              {isLastQuestion ? 'Complete' : 'Submit & Next'}
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setSelectedTab('html')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === 'html'
                ? 'border-purple-500 text-purple-700 bg-purple-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            HTML
          </button>
          
          <button
            onClick={() => setSelectedTab('css')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === 'css'
                ? 'border-blue-500 text-blue-700 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Palette className="w-4 h-4" />
            CSS
          </button>
          
          <button
            onClick={() => setSelectedTab('js')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === 'js'
                ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FileCode className="w-4 h-4" />
            JavaScript
          </button>
          
          <button
            onClick={() => {
              setSelectedTab('preview');
              runCode();
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === 'preview'
                ? 'border-green-500 text-green-700 bg-green-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div className="w-2/5 border-r border-gray-200 p-6 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {question.description || 'Create a frontend solution as described.'}
            </div>
          </div>

          {question.example && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Example</h3>
              <div 
                className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-200"
                dangerouslySetInnerHTML={{ __html: question.example }}
              />
            </div>
          )}

          {question.constraints && question.constraints.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Requirements</h3>
              <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                {question.constraints.map((constraint: string, idx: number) => (
                  <li key={idx} className="leading-relaxed">{constraint}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">💡 Tips</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Start with HTML structure first</li>
              <li>• Add CSS for styling and layout</li>
              <li>• Use JavaScript for interactivity</li>
              <li>• Click "Run" to preview your work</li>
              <li>• Check Console for JavaScript errors</li>
            </ul>
          </div>
        </div>

        {/* Right Panel - Editor or Preview */}
        <div className="flex-1 flex flex-col">
          {selectedTab === 'html' ? (
            <>
              <div className="p-2 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-900">HTML Editor</span>
                    <span className="text-xs text-gray-600">(Write clean HTML)</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {htmlCode.split('\n').length} lines
                  </div>
                </div>
              </div>
              
              <div className="flex-1">
                <MonacoEditor
                  height="100%"
                  language="html"
                  value={htmlCode}
                  onChange={(value) => setHtmlCode(value || "")}
                  onMount={(editor) => handleEditorDidMount(editor, 'html')}
                  theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    automaticLayout: true,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false
                  }}
                />
              </div>
            </>
          ) : selectedTab === 'css' ? (
            <>
              <div className="p-2 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-900">CSS Editor</span>
                    <span className="text-xs text-gray-600">(Style your HTML)</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {cssCode.split('\n').length} lines
                  </div>
                </div>
              </div>
              
              <div className="flex-1">
                <MonacoEditor
                  height="100%"
                  language="css"
                  value={cssCode}
                  onChange={(value) => setCssCode(value || "")}
                  onMount={(editor) => handleEditorDidMount(editor, 'css')}
                  theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    automaticLayout: true,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false
                  }}
                />
              </div>
            </>
          ) : selectedTab === 'js' ? (
            <>
              <div className="p-2 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-900">JavaScript Editor</span>
                    <span className="text-xs text-gray-600">(Add interactivity)</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {jsCode.split('\n').length} lines
                  </div>
                </div>
              </div>
              
              <div className="flex-1">
                <MonacoEditor
                  height="100%"
                  language="javascript"
                  value={jsCode}
                  onChange={(value) => setJsCode(value || "")}
                  onMount={(editor) => handleEditorDidMount(editor, 'js')}
                  theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    automaticLayout: true,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="p-2 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-900">Live Preview</span>
                    <span className="text-xs text-gray-600">(Real-time rendering)</span>
                  </div>
                  <button
                    onClick={runCode}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                </div>
              </div>
              
              <div className="flex-1 relative">
                {isRunning ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Loading preview...</p>
                    </div>
                  </div>
                ) : (
                  <iframe
                    key={previewKey}
                    ref={previewFrameRef}
                    srcDoc={generateFullHtml()}
                    title="Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                )}
                
                <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-white/90 px-2 py-1 rounded">
                  Auto-refresh on run
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FrontendQuestion;