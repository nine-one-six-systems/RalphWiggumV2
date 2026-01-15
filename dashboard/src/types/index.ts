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
  remoteUrl?: string;
  repoName?: string;
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
  hasPRD: boolean;
  hasAudienceJTBD: boolean;
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

// Document content messages (for PRD context)
export interface DocsContentMessage extends WSMessage {
  type: 'docs:content';
  payload: { path: string; content: string };
}

export interface DocsErrorMessage extends WSMessage {
  type: 'docs:error';
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
  | DocsContentMessage
  | DocsErrorMessage
  | ProjectScanMessage
  | ProjectInfoMessage
  | ClaudeMdListResultMessage
  | ClaudeMdContentMessage
  | ClaudeMdAppliedMessage
  | ClaudeMdErrorMessage
  | DependenciesResultMessage
  | DependenciesErrorMessage;

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
    usePrdContext?: boolean;  // Include PRD.md and AUDIENCE_JTBD.md as context
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
    contextDocs?: string[];  // Optional array of doc paths to include as context
    docsOnly?: boolean;      // If true, generate PRD from docs only without form fields
  };
}

export interface CancelPRDCommand {
  type: 'prd:cancel';
}

// Document reading command
export interface ReadDocCommand {
  type: 'docs:read';
  payload: {
    docPath: string;
  };
}

// Project info (from project root detector)
export interface ProjectInfo {
  targetProjectPath: string;
  ralphPath: string;
  mode: 'embedded' | 'standalone';
  detectionReason: string;
}

export interface ProjectInfoMessage extends WSMessage {
  type: 'project:info';
  payload: ProjectInfo;
}

// Subproject detected within a monorepo/multi-project structure
export interface SubProject {
  name: string;
  path: string;
  language: 'typescript' | 'javascript' | 'go' | 'python' | 'unknown';
  framework: string | null;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null;
}

// Discovered markdown document for PRD context selection
export interface DiscoveredDoc {
  path: string;           // Relative path from project root
  name: string;           // File basename
  size: number;           // File size in bytes
  directory: string;      // Parent directory (for grouping in UI)
}

// Project scanning types
export interface ProjectScan {
  projectName: string;
  projectPath: string;
  scanMode: 'embedded' | 'standalone';
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
  // All discovered markdown files for PRD context selection
  allMarkdownFiles: DiscoveredDoc[];
  hasRalphConfig: {
    agentsMd: boolean;
    claudeMd: boolean;
    implementationPlan: boolean;
    loopSh: boolean;
    specsDir: boolean;
    cursorRules: boolean;
  };
  hasRalphSubdirectory: boolean;
  structure: Array<{
    path: string;
    type: 'dir' | 'file';
  }>;
  subprojects: SubProject[];
  isMonorepo: boolean;
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

// CLAUDE.md file info
export interface ClaudeMdFile {
  path: string;
  location: string;
  exists: boolean;
  lineCount: number;
}

// CLAUDE.md commands
export interface ListClaudeMdCommand {
  type: 'claude:list';
}

export interface ReadClaudeMdCommand {
  type: 'claude:read';
  payload: {
    path: string;
  };
}

export interface ApplyClaudeMdCommand {
  type: 'claude:apply';
}

// CLAUDE.md messages
export interface ClaudeMdListResultMessage extends WSMessage {
  type: 'claude:list-result';
  payload: ClaudeMdFile[];
}

export interface ClaudeMdContentMessage extends WSMessage {
  type: 'claude:content';
  payload: {
    path: string;
    content: string;
  };
}

export interface ClaudeMdAppliedMessage extends WSMessage {
  type: 'claude:applied';
}

export interface ClaudeMdErrorMessage extends WSMessage {
  type: 'claude:error';
  payload: {
    error: string;
  };
}

// Dependency check result
export interface DependencyCheckResult {
  id: string;
  name: string;
  available: boolean;
  version?: string;
  path?: string;
  error?: string;
}

// Dependency check commands
export interface CheckDependenciesCommand {
  type: 'dependencies:check';
}

// Dependency check messages
export interface DependenciesResultMessage extends WSMessage {
  type: 'dependencies:result';
  payload: DependencyCheckResult[];
}

export interface DependenciesErrorMessage extends WSMessage {
  type: 'dependencies:error';
  payload: {
    error: string;
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
  | ReadDocCommand
  | ScanProjectCommand
  | ListClaudeMdCommand
  | ReadClaudeMdCommand
  | ApplyClaudeMdCommand
  | CheckDependenciesCommand;
