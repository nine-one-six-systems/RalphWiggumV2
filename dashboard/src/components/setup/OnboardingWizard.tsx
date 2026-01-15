import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import type { ProjectScan, ProjectInfo } from '@/types';
import {
  Search,
  Check,
  ChevronRight,
  Folder,
  FileText,
  Package,
  Code,
  Terminal,
  Loader2,
  AlertCircle,
  Sparkles,
  FileCode,
  Settings,
  ExternalLink,
} from 'lucide-react';

interface OnboardingWizardProps {
  projectScan: ProjectScan | null;
  projectInfo: ProjectInfo | null;
  scanLoading: boolean;
  onScanProject: () => void;
  onSaveAgentsMd: (content: string) => void;
  onComplete: () => void;
  onSkip: () => void;
}

type WizardStep = 'welcome' | 'scanning' | 'results' | 'configure' | 'docs' | 'complete';

export function OnboardingWizard({
  projectScan,
  projectInfo,
  scanLoading,
  onScanProject,
  onSaveAgentsMd,
  onComplete,
  onSkip,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<WizardStep>('welcome');
  const [commands, setCommands] = useState({
    build: '',
    dev: '',
    test: '',
    lint: '',
    typecheck: '',
  });

  // Update commands when scan results come in
  useEffect(() => {
    if (projectScan?.detectedCommands) {
      setCommands({
        build: projectScan.detectedCommands.build || '',
        dev: projectScan.detectedCommands.dev || '',
        test: projectScan.detectedCommands.test || '',
        lint: projectScan.detectedCommands.lint || '',
        typecheck: projectScan.detectedCommands.typecheck || '',
      });
    }
  }, [projectScan]);

  // Handle scan completion
  useEffect(() => {
    if (step === 'scanning' && projectScan && !scanLoading) {
      setStep('results');
    }
  }, [step, projectScan, scanLoading]);

  const handleStartScan = () => {
    setStep('scanning');
    onScanProject();
  };

  const generateAgentsMd = () => {
    const pm = projectScan?.packageManager || 'npm';
    const framework = projectScan?.framework || 'Unknown';
    const language = projectScan?.language || 'unknown';

    return `## Build & Run

Succinct rules for how to BUILD the project:

- Build: \`${commands.build || `${pm} run build`}\`
- Run: \`${commands.dev || `${pm} run start`}\`
- Dev server: \`${commands.dev || `${pm} run dev`}\`

## Validation

Run these after implementing to get immediate feedback:

- Tests: \`${commands.test || `${pm} test`}\`
- Typecheck: \`${commands.typecheck || 'npx tsc --noEmit'}\`
- Lint: \`${commands.lint || `${pm} run lint`}\`

## Operational Notes

Project: ${projectScan?.projectName || 'Unknown'}
Framework: ${framework}
Language: ${language}

### Codebase Patterns

[Ralph will add learnings here as patterns are discovered]

## Operational Learnings

[Ralph will add learnings here about how to run/build the project]
`;
  };

  const handleSaveConfig = () => {
    const content = generateAgentsMd();
    onSaveAgentsMd(content);
    setStep('docs');
  };

  const handleFinish = () => {
    onComplete();
  };

  const getStepProgress = () => {
    const steps: WizardStep[] = ['welcome', 'scanning', 'results', 'configure', 'docs', 'complete'];
    const currentIndex = steps.indexOf(step);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <Progress value={getStepProgress()} className="h-2" />
        </div>

        {/* Welcome Step */}
        {step === 'welcome' && (
          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to Ralph Wiggum</CardTitle>
              <CardDescription className="text-base">
                Let's set up your project for autonomous AI-powered development.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Show embedded mode info */}
              {projectInfo && projectInfo.mode === 'embedded' && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-left">
                  <div className="flex items-start gap-3">
                    <ExternalLink className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-700">Embedded Mode Detected</p>
                      <p className="text-sm text-green-600/80 mt-1">
                        Ralph will analyze your parent project:
                      </p>
                      <code className="text-xs bg-green-500/10 px-2 py-1 rounded mt-2 block truncate">
                        {projectInfo.targetProjectPath}
                      </code>
                    </div>
                  </div>
                </div>
              )}
              <div className="text-left space-y-4 bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Search className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Scan your project</p>
                    <p className="text-sm text-muted-foreground">
                      Detect framework, language, and build commands
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Settings className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Configure AGENTS.md</p>
                    <p className="text-sm text-muted-foreground">
                      Set up commands for Ralph to use
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Import documentation</p>
                    <p className="text-sm text-muted-foreground">
                      Consolidate existing docs into Ralph's structure
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button onClick={handleStartScan} size="lg" className="gap-2">
                  <Search className="h-4 w-4" />
                  Scan My Project
                </Button>
                <Button variant="ghost" onClick={onSkip}>
                  Skip Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scanning Step */}
        {step === 'scanning' && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle>Scanning Your Project</CardTitle>
              <CardDescription>
                Analyzing codebase, detecting frameworks, and finding documentation...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Checking package.json...</p>
                <p>Detecting build tools...</p>
                <p>Finding existing documentation...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Step */}
        {step === 'results' && projectScan && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <CardTitle>Project Analysis Complete</CardTitle>
              </div>
              <CardDescription>
                Here's what we found in your project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Path Info */}
              {projectInfo && projectInfo.mode === 'embedded' && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-700">
                    <ExternalLink className="h-4 w-4" />
                    <span className="text-sm font-medium">Analyzing parent project</span>
                  </div>
                  <code className="text-xs text-green-600/80 mt-1 block truncate">
                    {projectInfo.targetProjectPath}
                  </code>
                </div>
              )}

              {/* Detected Info */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Detected Configuration
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Framework</p>
                      <p className="font-medium">{projectScan.framework || 'Not detected'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Language</p>
                      <p className="font-medium capitalize">{projectScan.language}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Package Manager</p>
                      <p className="font-medium">{projectScan.packageManager || 'None'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Project</p>
                      <p className="font-medium truncate">{projectScan.projectName}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detected Subprojects (Monorepo) */}
              {projectScan.isMonorepo && projectScan.subprojects.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    Detected Subprojects ({projectScan.subprojects.length})
                  </h3>
                  <div className="space-y-2">
                    {projectScan.subprojects.map((sub) => (
                      <div
                        key={sub.path}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      >
                        <Badge variant="outline" className="capitalize">
                          {sub.language}
                        </Badge>
                        <span className="font-medium">{sub.name}</span>
                        <span className="text-xs text-muted-foreground">/{sub.path}</span>
                        {sub.framework && (
                          <Badge variant="secondary">{sub.framework}</Badge>
                        )}
                        {sub.packageManager && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {sub.packageManager}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected Commands */}
              {Object.values(projectScan.detectedCommands).some(Boolean) && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Detected Commands
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(projectScan.detectedCommands).map(
                      ([key, value]) =>
                        value && (
                          <div key={key} className="flex items-center gap-2">
                            <Badge variant="outline" className="w-20 justify-center">
                              {key}
                            </Badge>
                            <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                              {value}
                            </code>
                          </div>
                        )
                    )}
                  </div>
                </div>
              )}

              {/* Existing Docs */}
              {projectScan.existingDocs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Existing Documentation
                  </h3>
                  <div className="space-y-2">
                    {projectScan.existingDocs.slice(0, 5).map((doc) => (
                      <div
                        key={doc.path}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <span className="text-sm">{doc.path}</span>
                        <span className="text-xs text-muted-foreground">
                          {(doc.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ralph Config Status */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Ralph Configuration Status
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(projectScan.hasRalphConfig).map(([key, exists]) => (
                    <Badge key={key} variant={exists ? 'default' : 'secondary'}>
                      {exists ? <Check className="h-3 w-3 mr-1" /> : null}
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep('welcome')}>
                  Back
                </Button>
                <Button onClick={() => setStep('configure')} className="gap-2">
                  Continue to Configuration
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configure Step */}
        {step === 'configure' && projectScan && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configure AGENTS.md
              </CardTitle>
              <CardDescription>
                Review and adjust the commands Ralph will use for your project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="build">Build Command</Label>
                  <Input
                    id="build"
                    value={commands.build}
                    onChange={(e) => setCommands({ ...commands, build: e.target.value })}
                    placeholder={`${projectScan.packageManager || 'npm'} run build`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev">Dev Server Command</Label>
                  <Input
                    id="dev"
                    value={commands.dev}
                    onChange={(e) => setCommands({ ...commands, dev: e.target.value })}
                    placeholder={`${projectScan.packageManager || 'npm'} run dev`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test">Test Command</Label>
                  <Input
                    id="test"
                    value={commands.test}
                    onChange={(e) => setCommands({ ...commands, test: e.target.value })}
                    placeholder={`${projectScan.packageManager || 'npm'} test`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lint">Lint Command</Label>
                  <Input
                    id="lint"
                    value={commands.lint}
                    onChange={(e) => setCommands({ ...commands, lint: e.target.value })}
                    placeholder={`${projectScan.packageManager || 'npm'} run lint`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typecheck">Type Check Command</Label>
                  <Input
                    id="typecheck"
                    value={commands.typecheck}
                    onChange={(e) => setCommands({ ...commands, typecheck: e.target.value })}
                    placeholder="npx tsc --noEmit"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <ScrollArea className="h-48 rounded-lg border bg-muted/30">
                  <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                    {generateAgentsMd()}
                  </pre>
                </ScrollArea>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep('results')}>
                  Back
                </Button>
                <Button onClick={handleSaveConfig} className="gap-2">
                  Save Configuration
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Docs Step */}
        {step === 'docs' && projectScan && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentation Setup
              </CardTitle>
              <CardDescription>
                Choose how to set up your project documentation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {projectScan.existingDocs.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium mb-2">Found {projectScan.existingDocs.length} existing docs</p>
                    <p className="text-sm text-muted-foreground">
                      You can use the PRD Generator in the dashboard to create standardized
                      documentation from your existing files.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="font-medium">No existing documentation found</p>
                  <p className="text-sm text-muted-foreground">
                    Use the PRD Generator in the dashboard to create PRD.md and AUDIENCE_JTBD.md
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-medium">Next Steps:</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    AGENTS.md has been configured
                  </p>
                  <p className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Use Generate tab to create PRD & Audience docs
                  </p>
                  <p className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Run <code className="bg-muted px-1 rounded">./loop.sh plan</code> to generate implementation plan
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep('configure')}>
                  Back
                </Button>
                <Button onClick={handleFinish} className="gap-2">
                  Complete Setup
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
