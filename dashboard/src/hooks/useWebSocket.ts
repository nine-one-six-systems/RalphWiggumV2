import { useEffect, useRef, useState, useCallback } from 'react';
import type { ServerMessage, ClientCommand, LoopStatus, TasksState, GitStatus, LogEntry, ProjectConfig, PlanGeneratorStatus, PRDGeneratorStatus, ProjectScan, AgentInfo, CursorRuleInfo, ProjectInfo, ClaudeMdFile, DependencyCheckResult } from '@/types';

interface UseWebSocketReturn {
  connected: boolean;
  loopStatus: LoopStatus;
  tasks: TasksState;
  gitStatus: GitStatus;
  logs: LogEntry[];
  projectConfig: ProjectConfig | null;
  enabledAgents: string[];
  // Plan generation state
  planStatus: PlanGeneratorStatus;
  planOutput: string;
  planComplete: { plan: string; output: string } | null;
  planError: string | null;
  // PRD generation state
  prdStatus: PRDGeneratorStatus;
  prdOutput: string;
  prdComplete: { prd: string; audience: string } | null;
  prdError: string | null;
  // Project scanning state
  projectScan: ProjectScan | null;
  scanLoading: boolean;
  // Project info (from server)
  projectInfo: ProjectInfo | null;
  // Agent and rules state
  availableAgents: AgentInfo[];
  cursorRules: CursorRuleInfo[];
  agentsLoading: boolean;
  rulesLoading: boolean;
  // Document selection state (for PRD context)
  selectedDocPaths: string[];
  previewDoc: { path: string; content: string } | null;
  isLoadingPreview: boolean;
  // CLAUDE.md state
  claudeMdFiles: ClaudeMdFile[];
  claudeMdContent: { path: string; content: string } | null;
  claudeMdLoading: boolean;
  claudeMdApplying: boolean;
  // Dependency check state
  dependencyStatus: DependencyCheckResult[];
  dependencyLoading: boolean;
  // Config file preview state (for ExistingDocsViewer)
  configPreviewDoc: { file: string; content: string } | null;
  configPreviewLoading: boolean;
  sendCommand: (command: ClientCommand) => void;
  clearLogs: () => void;
  clearPlanOutput: () => void;
  clearPrdOutput: () => void;
  scanProject: () => void;
  listAgents: () => void;
  listRules: () => void;
  // Document selection handlers
  setSelectedDocPaths: (paths: string[]) => void;
  readDoc: (docPath: string) => void;
  closeDocPreview: () => void;
  // CLAUDE.md handlers
  listClaudeMdFiles: () => void;
  readClaudeMdFile: (filePath: string) => void;
  applyRalphClaudeMd: () => void;
  closeClaudeMdPreview: () => void;
  // Dependency check handler
  checkDependencies: () => void;
  // Config file preview handlers
  readConfigFile: (filename: string) => void;
  closeConfigPreview: () => void;
}

const DEFAULT_LOOP_STATUS: LoopStatus = {
  running: false,
  mode: null,
  iteration: 0,
  maxIterations: 0,
};

const DEFAULT_TASKS: TasksState = {
  tasks: [],
  completed: 0,
  total: 0,
};

const DEFAULT_GIT_STATUS: GitStatus = {
  branch: 'main',
  uncommittedCount: 0,
  commits: [],
};

const DEFAULT_ENABLED_AGENTS = ['react-typescript-expert', 'accessibility-expert', 'qol-ux-expert'];

const DEFAULT_PLAN_STATUS: PlanGeneratorStatus = {
  generating: false,
  mode: null,
  startedAt: null,
};

const DEFAULT_PRD_STATUS: PRDGeneratorStatus = {
  generating: false,
  startedAt: null,
};

// Allow WebSocket port to be configured via environment variable for multi-instance support
const DEFAULT_WS_PORT = import.meta.env.VITE_WS_PORT || '3001';

export function useWebSocket(url: string = `ws://localhost:${DEFAULT_WS_PORT}/ws`): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [loopStatus, setLoopStatus] = useState<LoopStatus>(DEFAULT_LOOP_STATUS);
  const [tasks, setTasks] = useState<TasksState>(DEFAULT_TASKS);
  const [gitStatus, setGitStatus] = useState<GitStatus>(DEFAULT_GIT_STATUS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [enabledAgents, setEnabledAgents] = useState<string[]>(DEFAULT_ENABLED_AGENTS);
  // Plan generation state
  const [planStatus, setPlanStatus] = useState<PlanGeneratorStatus>(DEFAULT_PLAN_STATUS);
  const [planOutput, setPlanOutput] = useState('');
  const [planComplete, setPlanComplete] = useState<{ plan: string; output: string } | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  // PRD generation state
  const [prdStatus, setPrdStatus] = useState<PRDGeneratorStatus>(DEFAULT_PRD_STATUS);
  const [prdOutput, setPrdOutput] = useState('');
  const [prdComplete, setPrdComplete] = useState<{ prd: string; audience: string } | null>(null);
  const [prdError, setPrdError] = useState<string | null>(null);
  // Project scanning state
  const [projectScan, setProjectScan] = useState<ProjectScan | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  // Project info (from server)
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  // Agent and rules state
  const [availableAgents, setAvailableAgents] = useState<AgentInfo[]>([]);
  const [cursorRules, setCursorRules] = useState<CursorRuleInfo[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  // Document selection state (for PRD context)
  const [selectedDocPaths, setSelectedDocPaths] = useState<string[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{ path: string; content: string } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  // CLAUDE.md state
  const [claudeMdFiles, setClaudeMdFiles] = useState<ClaudeMdFile[]>([]);
  const [claudeMdContent, setClaudeMdContent] = useState<{ path: string; content: string } | null>(null);
  const [claudeMdLoading, setClaudeMdLoading] = useState(false);
  const [claudeMdApplying, setClaudeMdApplying] = useState(false);
  // Dependency check state
  const [dependencyStatus, setDependencyStatus] = useState<DependencyCheckResult[]>([]);
  const [dependencyLoading, setDependencyLoading] = useState(false);
  // Config file preview state (for ExistingDocsViewer)
  const [configPreviewDoc, setConfigPreviewDoc] = useState<{ file: string; content: string } | null>(null);
  const [configPreviewLoading, setConfigPreviewLoading] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCleaningUpRef = useRef(false);

  const connect = useCallback(() => {
    if (isCleaningUpRef.current) {
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Close existing connection if it exists
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(url);

    ws.onopen = () => {
      if (!isCleaningUpRef.current) {
        setConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      }
    };

    ws.onclose = () => {
      if (!isCleaningUpRef.current) {
        setConnected(false);
        // Attempt to reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isCleaningUpRef.current) {
            connect();
          }
        }, 2000);
      }
    };

    ws.onerror = (error) => {
      // Only log errors if not cleaning up (React StrictMode causes intentional errors)
      if (!isCleaningUpRef.current && ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
        console.error('WebSocket error:', error);
      }
      if (!isCleaningUpRef.current) {
        ws.close();
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'loop:status':
            setLoopStatus(message.payload);
            break;
          case 'loop:log':
            setLogs((prev) => [...prev.slice(-500), message.payload]); // Keep last 500 logs
            break;
          case 'tasks:update':
            setTasks(message.payload);
            break;
          case 'git:update':
            setGitStatus(message.payload);
            break;
          case 'config:update':
            setProjectConfig(message.payload);
            if (message.payload.enabledAgents) {
              setEnabledAgents(message.payload.enabledAgents);
            }
            break;
          case 'config:saved':
            // File was saved successfully - could track this for UI feedback
            console.log('File saved:', message.payload.file);
            break;
          case 'agents:update':
            setEnabledAgents(message.payload.enabledAgents);
            break;
          // Plan generation messages
          case 'plan:status':
            setPlanStatus(message.payload);
            if (message.payload.generating) {
              // Clear previous results when starting new generation
              setPlanOutput('');
              setPlanComplete(null);
              setPlanError(null);
            }
            break;
          case 'plan:output':
            setPlanOutput((prev) => prev + message.payload.text);
            break;
          case 'plan:log':
            // Could add to a separate log stream if needed
            break;
          case 'plan:complete':
            setPlanComplete(message.payload);
            break;
          case 'plan:error':
            setPlanError(message.payload.error);
            break;
          // PRD generation messages
          case 'prd:status':
            setPrdStatus(message.payload);
            if (message.payload.generating) {
              // Clear previous results when starting new generation
              setPrdOutput('');
              setPrdComplete(null);
              setPrdError(null);
            }
            break;
          case 'prd:output':
            setPrdOutput((prev) => prev + message.payload.text);
            break;
          case 'prd:complete':
            setPrdComplete(message.payload);
            break;
          case 'prd:error':
            setPrdError(message.payload.error);
            break;
          // Project scanning messages
          case 'project:scan-result':
            setProjectScan(message.payload);
            setScanLoading(false);
            break;
          case 'project:info':
            setProjectInfo(message.payload);
            break;
          // Agent and rules messages
          case 'agents:list-result':
            setAvailableAgents(message.payload);
            setAgentsLoading(false);
            break;
          case 'rules:list-result':
          case 'rules:update':
            setCursorRules(message.payload);
            setRulesLoading(false);
            break;
          // Document preview messages
          case 'docs:content':
            setPreviewDoc({
              path: message.payload.path,
              content: message.payload.content,
            });
            setIsLoadingPreview(false);
            break;
          case 'docs:error':
            console.error('Doc read error:', message.payload.error);
            setIsLoadingPreview(false);
            break;
          // CLAUDE.md messages
          case 'claude:list-result':
            setClaudeMdFiles(message.payload);
            setClaudeMdLoading(false);
            break;
          case 'claude:content':
            setClaudeMdContent({
              path: message.payload.path,
              content: message.payload.content,
            });
            setClaudeMdLoading(false);
            break;
          case 'claude:applied':
            setClaudeMdApplying(false);
            break;
          case 'claude:error':
            console.error('CLAUDE.md error:', message.payload.error);
            setClaudeMdLoading(false);
            setClaudeMdApplying(false);
            break;
          // Dependency check messages
          case 'dependencies:result':
            setDependencyStatus(message.payload);
            setDependencyLoading(false);
            break;
          case 'dependencies:error':
            console.error('Dependency check error:', message.payload.error);
            setDependencyLoading(false);
            break;
          // Config file preview messages (for ExistingDocsViewer)
          case 'config:content':
            setConfigPreviewDoc({
              file: message.payload.file,
              content: message.payload.content,
            });
            setConfigPreviewLoading(false);
            break;
        }
      } catch {
        console.error('Failed to parse WebSocket message');
      }
    };

    wsRef.current = ws;
  }, [url]);

  useEffect(() => {
    isCleaningUpRef.current = false;
    connect();

    return () => {
      isCleaningUpRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        // Remove event listeners to prevent errors during cleanup
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendCommand = useCallback((command: ClientCommand) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command));
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const clearPlanOutput = useCallback(() => {
    setPlanOutput('');
    setPlanComplete(null);
    setPlanError(null);
  }, []);

  const clearPrdOutput = useCallback(() => {
    setPrdOutput('');
    setPrdComplete(null);
    setPrdError(null);
  }, []);

  const scanProject = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setScanLoading(true);
      wsRef.current.send(JSON.stringify({ type: 'project:scan' }));
    }
  }, []);

  const listAgents = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setAgentsLoading(true);
      wsRef.current.send(JSON.stringify({ type: 'agents:list' }));
    }
  }, []);

  const listRules = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setRulesLoading(true);
      wsRef.current.send(JSON.stringify({ type: 'rules:list' }));
    }
  }, []);

  const readDoc = useCallback((docPath: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsLoadingPreview(true);
      setPreviewDoc(null);
      wsRef.current.send(JSON.stringify({ type: 'docs:read', payload: { docPath } }));
    }
  }, []);

  const closeDocPreview = useCallback(() => {
    setPreviewDoc(null);
    setIsLoadingPreview(false);
  }, []);

  const listClaudeMdFiles = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setClaudeMdLoading(true);
      wsRef.current.send(JSON.stringify({ type: 'claude:list' }));
    }
  }, []);

  const readClaudeMdFile = useCallback((filePath: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setClaudeMdLoading(true);
      setClaudeMdContent(null);
      wsRef.current.send(JSON.stringify({ type: 'claude:read', payload: { path: filePath } }));
    }
  }, []);

  const applyRalphClaudeMd = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setClaudeMdApplying(true);
      wsRef.current.send(JSON.stringify({ type: 'claude:apply' }));
    }
  }, []);

  const closeClaudeMdPreview = useCallback(() => {
    setClaudeMdContent(null);
    setClaudeMdLoading(false);
  }, []);

  const checkDependencies = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setDependencyLoading(true);
      wsRef.current.send(JSON.stringify({ type: 'dependencies:check' }));
    }
  }, []);

  const readConfigFile = useCallback((filename: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setConfigPreviewLoading(true);
      setConfigPreviewDoc(null);
      wsRef.current.send(JSON.stringify({ type: 'config:read', payload: { file: filename } }));
    }
  }, []);

  const closeConfigPreview = useCallback(() => {
    setConfigPreviewDoc(null);
    setConfigPreviewLoading(false);
  }, []);

  return {
    connected,
    loopStatus,
    tasks,
    gitStatus,
    logs,
    projectConfig,
    enabledAgents,
    planStatus,
    planOutput,
    planComplete,
    planError,
    prdStatus,
    prdOutput,
    prdComplete,
    prdError,
    projectScan,
    scanLoading,
    projectInfo,
    availableAgents,
    cursorRules,
    agentsLoading,
    rulesLoading,
    selectedDocPaths,
    previewDoc,
    isLoadingPreview,
    sendCommand,
    clearLogs,
    clearPlanOutput,
    clearPrdOutput,
    scanProject,
    listAgents,
    listRules,
    setSelectedDocPaths,
    readDoc,
    closeDocPreview,
    // CLAUDE.md
    claudeMdFiles,
    claudeMdContent,
    claudeMdLoading,
    claudeMdApplying,
    listClaudeMdFiles,
    readClaudeMdFile,
    applyRalphClaudeMd,
    closeClaudeMdPreview,
    // Dependencies
    dependencyStatus,
    dependencyLoading,
    checkDependencies,
    // Config file preview (for ExistingDocsViewer)
    configPreviewDoc,
    configPreviewLoading,
    readConfigFile,
    closeConfigPreview,
  };
}
