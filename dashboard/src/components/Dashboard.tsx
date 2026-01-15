import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { LoopStatus } from './LoopStatus';
import { TaskList } from './TaskList';
import { LogViewer } from './LogViewer';
import { ContextMeter } from './ContextMeter';
import { GitHistory } from './GitHistory';
import { LoopControls } from './LoopControls';
import { SetupWizard } from './setup/SetupWizard';
import { OnboardingWizard } from './setup/OnboardingWizard';
import { PlanGenerator } from './PlanGenerator';
import { PRDGenerator } from './PRDGenerator';
import { ExistingDocsViewer } from './ExistingDocsViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Settings,
  Terminal,
  Wifi,
  WifiOff,
  Wand2,
  FileText,
  ListTodo,
  Github,
} from 'lucide-react';

export function Dashboard() {
  const {
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
    claudeMdFiles,
    claudeMdContent,
    claudeMdLoading,
    claudeMdApplying,
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
    listClaudeMdFiles,
    readClaudeMdFile,
    applyRalphClaudeMd,
    closeClaudeMdPreview,
    dependencyStatus,
    dependencyLoading,
    checkDependencies,
    configPreviewDoc,
    configPreviewLoading,
    readConfigFile,
    closeConfigPreview,
  } = useWebSocket();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Check if we should show onboarding (AGENTS.md not configured)
  useEffect(() => {
    if (projectConfig && !onboardingComplete) {
      // Show onboarding if AGENTS.md doesn't exist or isn't configured
      const needsOnboarding = !projectConfig.hasAgentsMd;
      setShowOnboarding(needsOnboarding);
    }
  }, [projectConfig, onboardingComplete]);

  // Trigger project scan when entering generate tab if not already scanned
  useEffect(() => {
    if (activeTab === 'generate' && !projectScan && !scanLoading && connected) {
      scanProject();
    }
  }, [activeTab, projectScan, scanLoading, connected, scanProject]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setOnboardingComplete(true);
  };

  const handleSaveAgentsMd = (content: string) => {
    sendCommand({ type: 'config:write', payload: { file: 'AGENTS.md', content } });
  };

  const handleRunWizard = () => {
    setOnboardingComplete(false);
    setShowOnboarding(true);
  };

  // Show onboarding wizard if needed
  if (showOnboarding) {
    return (
      <OnboardingWizard
        projectScan={projectScan}
        projectInfo={projectInfo}
        scanLoading={scanLoading}
        onScanProject={scanProject}
        onSaveAgentsMd={handleSaveAgentsMd}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              RW
            </div>
            <div>
              <h1 className="text-xl font-semibold">Ralph Wiggum Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Autonomous Development Loop Monitor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {gitStatus.repoName && (
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
            <Badge variant={connected ? 'success' : 'destructive'} className="gap-1">
              {connected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Disconnected
                </>
              )}
            </Badge>
            <Badge variant={loopStatus.running ? 'default' : 'secondary'}>
              {loopStatus.running ? `Running: ${loopStatus.mode}` : 'Idle'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-2">
              <Wand2 className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Terminal className="h-4 w-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="setup" className="gap-2">
              <Settings className="h-4 w-4" />
              Setup
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Loop Controls */}
            <LoopControls
              loopStatus={loopStatus}
              onStart={(options) => sendCommand({ type: 'loop:start', payload: options })}
              onStop={() => sendCommand({ type: 'loop:stop' })}
            />

            {/* Existing Documents */}
            <ExistingDocsViewer
              projectConfig={projectConfig}
              onReadFile={readConfigFile}
              onNavigateToGenerate={(tab) => {
                setActiveTab('generate');
                // The inner tabs will default to the right one based on the tab parameter
              }}
              previewDoc={configPreviewDoc}
              isLoadingPreview={configPreviewLoading}
              onClosePreview={closeConfigPreview}
              onRefresh={() => sendCommand({ type: 'config:refresh' })}
            />

            {/* Status Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Loop Status */}
              <LoopStatus status={loopStatus} />

              {/* Context Meter */}
              <ContextMeter iteration={loopStatus.iteration} />

              {/* Git Status */}
              <GitHistory status={gitStatus} />
            </div>

            {/* Tasks */}
            <div className="grid gap-6 lg:grid-cols-2">
              <TaskList tasks={tasks} />
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Terminal className="h-5 w-5" />
                  Recent Logs
                </h3>
                <LogViewer logs={logs.slice(-20)} compact onClear={clearLogs} />
              </div>
            </div>
          </TabsContent>

          {/* Generate Tab */}
          <TabsContent value="generate">
            <Tabs defaultValue="plan" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                <TabsTrigger value="plan" className="gap-2">
                  <ListTodo className="h-4 w-4" />
                  Implementation Plan
                </TabsTrigger>
                <TabsTrigger value="prd" className="gap-2">
                  <FileText className="h-4 w-4" />
                  PRD & Audience
                </TabsTrigger>
              </TabsList>

              <TabsContent value="plan">
                <PlanGenerator
                  planStatus={planStatus}
                  planOutput={planOutput}
                  planComplete={planComplete}
                  planError={planError}
                  onGeneratePlan={(options) =>
                    sendCommand({ type: 'plan:generate', payload: options })
                  }
                  onCancelPlan={() => sendCommand({ type: 'plan:cancel' })}
                  onInsertPlan={(content) =>
                    sendCommand({
                      type: 'config:write',
                      payload: { file: 'IMPLEMENTATION_PLAN.md', content },
                    })
                  }
                  onClearOutput={clearPlanOutput}
                />
              </TabsContent>

              <TabsContent value="prd">
                <PRDGenerator
                  prdStatus={prdStatus}
                  prdOutput={prdOutput}
                  prdComplete={prdComplete}
                  prdError={prdError}
                  discoveredDocs={projectScan?.allMarkdownFiles || []}
                  selectedDocPaths={selectedDocPaths}
                  onDocSelectionChange={setSelectedDocPaths}
                  onPreviewDoc={readDoc}
                  previewDoc={previewDoc}
                  isLoadingPreview={isLoadingPreview}
                  onClosePreview={closeDocPreview}
                  onGeneratePRD={(options) =>
                    sendCommand({ type: 'prd:generate', payload: options })
                  }
                  onCancelPRD={() => sendCommand({ type: 'prd:cancel' })}
                  onInsertPRD={(prd, audience) => {
                    sendCommand({
                      type: 'config:write',
                      payload: { file: 'PRD.md', content: prd },
                    });
                    sendCommand({
                      type: 'config:write',
                      payload: { file: 'AUDIENCE_JTBD.md', content: audience },
                    });
                  }}
                  onClearOutput={clearPrdOutput}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <LogViewer logs={logs} onClear={clearLogs} />
          </TabsContent>

          {/* Setup Tab */}
          <TabsContent value="setup">
            <SetupWizard
              projectConfig={projectConfig}
              enabledAgents={enabledAgents}
              availableAgents={availableAgents}
              cursorRules={cursorRules}
              agentsLoading={agentsLoading}
              rulesLoading={rulesLoading}
              gitStatus={gitStatus}
              projectInfo={projectInfo}
              claudeMdFiles={claudeMdFiles}
              claudeMdContent={claudeMdContent}
              claudeMdLoading={claudeMdLoading}
              claudeMdApplying={claudeMdApplying}
              onReadFile={(file) => sendCommand({ type: 'config:read', payload: { file } })}
              onWriteFile={(file, content) =>
                sendCommand({ type: 'config:write', payload: { file, content } })
              }
              onToggleAgent={(agentId, enabled) =>
                sendCommand({ type: 'agents:toggle', payload: { agentId, enabled } })
              }
              onListAgents={listAgents}
              onListRules={listRules}
              onToggleRule={(ruleId, enabled) =>
                sendCommand({ type: 'rules:toggle', payload: { ruleId, enabled } })
              }
              onListClaudeMdFiles={listClaudeMdFiles}
              onReadClaudeMdFile={readClaudeMdFile}
              onApplyRalphClaudeMd={applyRalphClaudeMd}
              onCloseClaudeMdPreview={closeClaudeMdPreview}
              onRunWizard={handleRunWizard}
              dependencyStatus={dependencyStatus}
              dependencyLoading={dependencyLoading}
              onCheckDependencies={checkDependencies}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
