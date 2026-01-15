import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AgentsConfig } from './AgentsConfig';
import { SpecialistAgentsConfig } from './SpecialistAgentsConfig';
import { CursorRulesConfig } from './CursorRulesConfig';
import { PromptsConfig } from './PromptsConfig';
import { ClaudeMdConfig } from './ClaudeMdConfig';
import { DependencyChecker } from './DependencyChecker';
import type { ProjectConfig, AgentInfo, CursorRuleInfo, GitStatus, ProjectInfo, ClaudeMdFile, DependencyCheckResult } from '@/types';
import {
  Settings,
  FileCode,
  Bot,
  Scroll,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Github,
} from 'lucide-react';

interface SetupWizardProps {
  projectConfig: ProjectConfig | null;
  enabledAgents: string[];
  availableAgents: AgentInfo[];
  cursorRules: CursorRuleInfo[];
  agentsLoading: boolean;
  rulesLoading: boolean;
  gitStatus?: GitStatus;
  projectInfo?: ProjectInfo | null;
  claudeMdFiles?: ClaudeMdFile[];
  claudeMdContent?: { path: string; content: string } | null;
  claudeMdLoading?: boolean;
  claudeMdApplying?: boolean;
  onReadFile: (file: string) => void;
  onWriteFile: (file: string, content: string) => void;
  onToggleAgent: (agentId: string, enabled: boolean) => void;
  onListAgents: () => void;
  onListRules: () => void;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onListClaudeMdFiles?: () => void;
  onReadClaudeMdFile?: (path: string) => void;
  onApplyRalphClaudeMd?: () => void;
  onCloseClaudeMdPreview?: () => void;
  onRunWizard?: () => void;
  // Dependency check props
  dependencyStatus?: DependencyCheckResult[];
  dependencyLoading?: boolean;
  onCheckDependencies?: () => void;
}

export function SetupWizard({
  projectConfig,
  availableAgents,
  cursorRules,
  agentsLoading,
  rulesLoading,
  gitStatus,
  projectInfo,
  claudeMdFiles = [],
  claudeMdContent,
  claudeMdLoading = false,
  claudeMdApplying = false,
  onReadFile,
  onWriteFile,
  onToggleAgent,
  onListAgents,
  onListRules,
  onToggleRule,
  onListClaudeMdFiles,
  onReadClaudeMdFile,
  onApplyRalphClaudeMd,
  onCloseClaudeMdPreview,
  onRunWizard,
  // Dependency check props
  dependencyStatus = [],
  dependencyLoading = false,
  onCheckDependencies,
}: SetupWizardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const configItems = [
    {
      id: 'agents',
      name: 'AGENTS.md',
      description: 'Build/test commands and operational notes',
      icon: FileCode,
      exists: projectConfig?.hasAgentsMd ?? false,
      tooltipExists: 'Build/test commands are configured in AGENTS.md',
      tooltipMissing: 'Missing AGENTS.md - Configure build commands',
    },
    {
      id: 'claude',
      name: 'CLAUDE.md',
      description: 'Claude Code configuration and rules',
      icon: Bot,
      exists: projectConfig?.hasClaudeMd ?? false,
      tooltipExists: 'Claude Code rules are active from CLAUDE.md',
      tooltipMissing: 'Missing CLAUDE.md - Add Claude configuration',
    },
    {
      id: 'cursor',
      name: 'Cursor Rules',
      description: 'Code style and pattern rules',
      icon: Scroll,
      exists: projectConfig?.hasCursorRules ?? false,
      tooltipExists: 'Code style rules active from .cursor/rules/',
      tooltipMissing: 'No cursor rules found',
    },
    {
      id: 'prompts',
      name: 'Prompts',
      description: 'Planning and build prompt templates',
      icon: FileText,
      exists: projectConfig?.hasLoopSh ?? false,
      tooltipExists: 'Prompt templates are configured',
      tooltipMissing: 'Prompt templates not found',
    },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Project Setup
                </CardTitle>
                <CardDescription>
                  Configure your Ralph Wiggum project with the guided setup wizard or edit individual
                  configuration files.
                </CardDescription>
              </div>
              {gitStatus?.repoName && (
                <a
                  href={`https://github.com/${gitStatus.repoName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="h-4 w-4" />
                  {gitStatus.repoName}
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Config Status Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {configItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <item.icon className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {item.exists ? (
                        <CheckCircle className="h-5 w-5 text-green-500 cursor-help" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500 cursor-help" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.exists ? item.tooltipExists : item.tooltipMissing}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="agents">AGENTS.md</TabsTrigger>
          <TabsTrigger value="claudemd">CLAUDE.md</TabsTrigger>
          <TabsTrigger value="specialists">Specialists</TabsTrigger>
          <TabsTrigger value="cursor">Cursor Rules</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Follow these steps to set up your Ralph Wiggum project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {onRunWizard && (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    New to this project? Run the guided setup wizard to scan and configure automatically.
                  </p>
                  <Button onClick={onRunWizard} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Run Setup Wizard
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-semibold">1. Configure Build Commands</h3>
                <p className="text-sm text-muted-foreground">
                  Edit AGENTS.md with your project's build, test, and lint commands. Ralph uses
                  these for validation after each implementation.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('agents')}
                >
                  Configure AGENTS.md
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">2. Enable Specialist Agents</h3>
                <p className="text-sm text-muted-foreground">
                  Choose which specialist agents to use for code review and quality checks.
                  Agents from ~/.claude/agents/ are available globally.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('specialists')}
                >
                  Configure Specialists
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">3. Set Up Cursor Rules</h3>
                <p className="text-sm text-muted-foreground">
                  Add .cursor/rules/*.mdc files to define coding standards, patterns, and best
                  practices for your project.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('cursor')}
                >
                  Configure Rules
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">4. Customize Prompts</h3>
                <p className="text-sm text-muted-foreground">
                  Review and customize the planning and build prompts. Set your project-specific
                  goals in PROMPT_plan.md.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('prompts')}
                >
                  Configure Prompts
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dependencies">
          <DependencyChecker
            dependencies={dependencyStatus}
            loading={dependencyLoading}
            onCheck={onCheckDependencies ?? (() => {})}
          />
        </TabsContent>

        <TabsContent value="agents">
          <AgentsConfig onReadFile={onReadFile} onWriteFile={onWriteFile} />
        </TabsContent>

        <TabsContent value="claudemd">
          {onListClaudeMdFiles && onReadClaudeMdFile && onApplyRalphClaudeMd && onCloseClaudeMdPreview ? (
            <ClaudeMdConfig
              claudeMdFiles={claudeMdFiles}
              claudeMdContent={claudeMdContent ?? null}
              claudeMdLoading={claudeMdLoading}
              claudeMdApplying={claudeMdApplying}
              projectInfo={projectInfo ?? null}
              onListFiles={onListClaudeMdFiles}
              onReadFile={onReadClaudeMdFile}
              onApplyRalphClaudeMd={onApplyRalphClaudeMd}
              onClosePreview={onCloseClaudeMdPreview}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                CLAUDE.md configuration not available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="specialists">
          <SpecialistAgentsConfig
            availableAgents={availableAgents}
            agentsLoading={agentsLoading}
            onListAgents={onListAgents}
            onToggleAgent={onToggleAgent}
          />
        </TabsContent>

        <TabsContent value="cursor">
          <CursorRulesConfig
            cursorRules={cursorRules}
            rulesLoading={rulesLoading}
            onListRules={onListRules}
            onToggleRule={onToggleRule}
          />
        </TabsContent>

        <TabsContent value="prompts">
          <PromptsConfig onReadFile={onReadFile} onWriteFile={onWriteFile} />
        </TabsContent>
      </Tabs>
      </div>
    </TooltipProvider>
  );
}
