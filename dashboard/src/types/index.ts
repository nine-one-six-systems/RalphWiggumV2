export type LoopMode = 'plan' | 'plan-slc' | 'plan-work' | 'build';

export interface LoopStatus {
  running: boolean;
  mode: LoopMode | null;
  iteration: number;
  maxIterations: number;
  workScope?: string;
  startedAt?: Date;
  pid?: number;
}

export interface Task {
  id: string;
  content: string;
  completed: boolean;
  priority?: number;
}

export interface TasksState {
  tasks: Task[];
  completed: number;
  total: number;
  lastUpdated?: Date;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
}

export interface GitStatus {
  branch: string;
  uncommittedCount: number;
  commits: GitCommit[];
  lastUpdated?: Date;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  content: string;
  type: 'info' | 'error' | 'warning' | 'success';
}

export interface ProjectConfig {
  projectPath: string;
  hasAgentsMd: boolean;
  hasClaudeMd: boolean;
  hasImplementationPlan: boolean;
  hasSpecs: boolean;
  hasCursorRules: boolean;
  hasLoopSh: boolean;
  enabledAgents: string[];
}

export interface AgentsConfig {
  buildCommand: string;
  runCommand: string;
  devCommand: string;
  testCommand: string;
  typecheckCommand: string;
  lintCommand: string;
  operationalNotes: string;
  codebasePatterns: string;
}

export interface SpecialistAgent {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const SPECIALIST_AGENTS: SpecialistAgent[] = [
  {
    id: 'react-typescript-expert',
    name: 'React TypeScript Expert',
    description: 'React architecture, hooks, state, TypeScript types, code reviews, performance optimization',
    enabled: true,
  },
  {
    id: 'accessibility-expert',
    name: 'Accessibility Expert',
    description: 'WCAG 2.2 compliance, ARIA patterns, keyboard navigation, screen reader support, focus management',
    enabled: true,
  },
  {
    id: 'qol-ux-expert',
    name: 'QoL UX Expert',
    description: 'Loading states, toasts, forms UX, dark mode, animations, responsive patterns',
    enabled: true,
  },
];

// Dynamic agent info from file system
export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  source: 'global' | 'project';
  enabled: boolean;
  filePath: string;
}

// Cursor rule info from .cursor/rules/
export interface CursorRuleInfo {
  id: string;
  name: string;
  description: string;
  globs: string[];
  enabled: boolean;
  filePath: string;
}

// WebSocket message types
export interface WSMessage {
  type: string;
  payload: unknown;
}

export interface LoopStatusMessage extends WSMessage {
  type: 'loop:status';
  payload: LoopStatus;
}

export interface LogMessage extends WSMessage {
  type: 'loop:log';
  payload: LogEntry;
}

export interface TasksMessage extends WSMessage {
  type: 'tasks:update';
  payload: TasksState;
}

export interface GitMessage extends WSMessage {
  type: 'git:update';
  payload: GitStatus;
}

export interface ConfigMessage extends WSMessage {
  type: 'config:update';
  payload: ProjectConfig;
}

export interface AgentsUpdateMessage extends WSMessage {
  type: 'agents:update';
  payload: {
    enabledAgents: string[];
  };
}

// Plan generation messages
export interface PlanGeneratorStatus {
  generating: boolean;
  mode: 'plan' | 'plan-slc' | 'plan-work' | null;
  startedAt: Date | null;
}

export interface PlanStatusMessage extends WSMessage {
  type: 'plan:status';
  payload: PlanGeneratorStatus;
}

export interface PlanOutputMessage extends WSMessage {
  type: 'plan:output';
  payload: { text: string };
}

export interface PlanLogMessage extends WSMessage {
  type: 'plan:log';
  payload: { text: string };
}

export interface PlanCompleteMessage extends WSMessage {
  type: 'plan:complete';
  payload: { plan: string; output: string };
}

export interface PlanErrorMessage extends WSMessage {
  type: 'plan:error';
  payload: { error: string };
}

// PRD generation messages
export interface PRDGeneratorStatus {
  generating: boolean;
  startedAt: Date | null;
}

export interface PRDStatusMessage extends WSMessage {
  type: 'prd:status';
  payload: PRDGeneratorStatus;
}

export interface PRDOutputMessage extends WSMessage {
  type: 'prd:output';
  payload: { text: string };
}

export interface PRDCompleteMessage extends WSMessage {
  type: 'prd:complete';
  payload: { prd: string; audience: string };
}

export interface PRDErrorMessage extends WSMessage {
  type: 'prd:error';
  payload: { error: string };
}

export type ServerMessage =
  | LoopStatusMessage
  | LogMessage
  | TasksMessage
  | GitMessage
  | ConfigMessage
  | AgentsUpdateMessage
  | AgentsListResultMessage
  | RulesListResultMessage
  | RulesUpdateMessage
  | PlanStatusMessage
  | PlanOutputMessage
  | PlanLogMessage
  | PlanCompleteMessage
  | PlanErrorMessage
  | PRDStatusMessage
  | PRDOutputMessage
  | PRDCompleteMessage
  | PRDErrorMessage
  | ProjectScanMessage;

// Client commands
export interface StartLoopCommand {
  type: 'loop:start';
  payload: {
    mode: LoopMode;
    maxIterations?: number;
    workScope?: string;
  };
}

export interface StopLoopCommand {
  type: 'loop:stop';
}

export interface ReadConfigCommand {
  type: 'config:read';
  payload: {
    file: string;
  };
}

export interface WriteConfigCommand {
  type: 'config:write';
  payload: {
    file: string;
    content: string;
  };
}

export interface ToggleAgentCommand {
  type: 'agents:toggle';
  payload: {
    agentId: string;
    enabled: boolean;
  };
}

export interface GeneratePlanCommand {
  type: 'plan:generate';
  payload: {
    goal: string;
    mode: 'plan' | 'plan-slc' | 'plan-work';
    workScope?: string;
  };
}

export interface CancelPlanCommand {
  type: 'plan:cancel';
}

export interface ClearPlanOutputCommand {
  type: 'plan:clear';
}

export interface GeneratePRDCommand {
  type: 'prd:generate';
  payload: {
    productName: string;
    problemStatement: string;
    targetAudience: string;
    keyCapabilities: string[];
  };
}

export interface CancelPRDCommand {
  type: 'prd:cancel';
}

// Project scanning types
export interface ProjectScan {
  projectName: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null;
  framework: string | null;
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'mixed' | 'unknown';
  detectedCommands: {
    build?: string;
    dev?: string;
    test?: string;
    lint?: string;
    typecheck?: string;
  };
  existingDocs: Array<{
    path: string;
    name: string;
    size: number;
  }>;
  hasRalphConfig: {
    agentsMd: boolean;
    claudeMd: boolean;
    implementationPlan: boolean;
    loopSh: boolean;
    specsDir: boolean;
    cursorRules: boolean;
  };
  structure: Array<{
    path: string;
    type: 'dir' | 'file';
  }>;
}

export interface ProjectScanMessage extends WSMessage {
  type: 'project:scan-result';
  payload: ProjectScan;
}

export interface ScanProjectCommand {
  type: 'project:scan';
}

// Agent list messages
export interface AgentsListResultMessage extends WSMessage {
  type: 'agents:list-result';
  payload: AgentInfo[];
}

// Cursor rules messages
export interface RulesListResultMessage extends WSMessage {
  type: 'rules:list-result';
  payload: CursorRuleInfo[];
}

export interface RulesUpdateMessage extends WSMessage {
  type: 'rules:update';
  payload: CursorRuleInfo[];
}

// Agent list command
export interface ListAgentsCommand {
  type: 'agents:list';
}

// Cursor rules commands
export interface ListRulesCommand {
  type: 'rules:list';
}

export interface ToggleRuleCommand {
  type: 'rules:toggle';
  payload: {
    ruleId: string;
    enabled: boolean;
  };
}

export type ClientCommand =
  | StartLoopCommand
  | StopLoopCommand
  | ReadConfigCommand
  | WriteConfigCommand
  | ToggleAgentCommand
  | ListAgentsCommand
  | ListRulesCommand
  | ToggleRuleCommand
  | GeneratePlanCommand
  | CancelPlanCommand
  | ClearPlanOutputCommand
  | GeneratePRDCommand
  | CancelPRDCommand
  | ScanProjectCommand;
