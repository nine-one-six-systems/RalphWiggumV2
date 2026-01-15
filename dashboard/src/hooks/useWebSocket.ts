import { useEffect, useRef, useState, useCallback } from 'react';
import type { ServerMessage, ClientCommand, LoopStatus, TasksState, GitStatus, LogEntry, ProjectConfig, PlanGeneratorStatus, PRDGeneratorStatus } from '@/types';

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
  sendCommand: (command: ClientCommand) => void;
  clearLogs: () => void;
  clearPlanOutput: () => void;
  clearPrdOutput: () => void;
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

export function useWebSocket(url: string = 'ws://localhost:3001/ws'): UseWebSocketReturn {
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

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Attempt to reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = () => {
      ws.close();
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
        }
      } catch {
        console.error('Failed to parse WebSocket message');
      }
    };

    wsRef.current = ws;
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
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
    sendCommand,
    clearLogs,
    clearPlanOutput,
    clearPrdOutput,
  };
}
