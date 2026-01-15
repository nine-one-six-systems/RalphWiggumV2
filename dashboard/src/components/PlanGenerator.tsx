import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { PlanGeneratorStatus } from '@/types';
import {
  Wand2,
  Play,
  Square,
  Copy,
  FileDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  FileText,
} from 'lucide-react';

interface PlanGeneratorProps {
  planStatus: PlanGeneratorStatus;
  planOutput: string;
  planComplete: { plan: string; output: string } | null;
  planError: string | null;
  onGeneratePlan: (options: {
    goal: string;
    mode: 'plan' | 'plan-slc' | 'plan-work';
    workScope?: string;
    usePrdContext?: boolean;
  }) => void;
  onCancelPlan: () => void;
  onInsertPlan: (content: string) => void;
  onClearOutput: () => void;
}

type PlanMode = 'plan' | 'plan-slc' | 'plan-work';

const MODE_INFO: Record<PlanMode, { name: string; description: string }> = {
  plan: {
    name: 'Standard',
    description: 'Full planning mode - analyzes specs and creates comprehensive implementation plan',
  },
  'plan-slc': {
    name: 'SLC',
    description: 'Simple, Lovable, Complete - focuses on incremental user value delivery',
  },
  'plan-work': {
    name: 'Work-Scoped',
    description: 'Focused planning for a specific feature or scope',
  },
};

export function PlanGenerator({
  planStatus,
  planOutput,
  planComplete,
  planError,
  onGeneratePlan,
  onCancelPlan,
  onInsertPlan,
  onClearOutput,
}: PlanGeneratorProps) {
  const [goal, setGoal] = useState('');
  const [mode, setMode] = useState<PlanMode>('plan');
  const [workScope, setWorkScope] = useState('');
  const [usePrdDocs, setUsePrdDocs] = useState(false);

  const handleGenerate = () => {
    // Allow empty goal only if using PRD documents as context
    if (!goal.trim() && !usePrdDocs) return;
    if (mode === 'plan-work' && !workScope.trim()) return;
    
    onGeneratePlan({
      goal: goal.trim() || 'Analyze the codebase based on PRD and AUDIENCE_JTBD documents',
      mode,
      workScope: mode === 'plan-work' ? workScope.trim() : undefined,
      usePrdContext: usePrdDocs,
    });
  };

  const handleCopyToClipboard = () => {
    const content = planComplete?.plan || planOutput;
    navigator.clipboard.writeText(content);
  };

  const handleInsert = () => {
    const content = planComplete?.plan || planOutput;
    if (content) {
      onInsertPlan(content);
    }
  };

  const isGenerating = planStatus.generating;
  const hasOutput = planOutput.length > 0 || planComplete !== null;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Generate Implementation Plan
          </CardTitle>
          <CardDescription>
            Describe your project goal and Claude will generate a Ralph Wiggum-compatible
            implementation plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Goal Input */}
          <div className="space-y-2">
            <Label htmlFor="goal">Project Goal</Label>
            <textarea
              id="goal"
              placeholder="Describe what you want to build... e.g., 'Build a real-time chat application with user authentication, message persistence, and typing indicators'"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={isGenerating}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* Use PRD Documents Toggle */}
          <div className="flex items-start gap-3 rounded-lg border border-dashed p-3 bg-muted/30">
            <Checkbox
              id="usePrdDocs"
              checked={usePrdDocs}
              onCheckedChange={(checked) => setUsePrdDocs(checked === true)}
              disabled={isGenerating}
            />
            <div className="space-y-1">
              <label
                htmlFor="usePrdDocs"
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Use PRD Documents
              </label>
              <p className="text-xs text-muted-foreground">
                Include PRD.md and AUDIENCE_JTBD.md as context for plan generation
              </p>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-3">
            <Label>Planning Mode</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(MODE_INFO) as PlanMode[]).map((modeKey) => (
                <button
                  key={modeKey}
                  type="button"
                  onClick={() => setMode(modeKey)}
                  disabled={isGenerating}
                  className={`flex cursor-pointer flex-col rounded-lg border-2 bg-transparent p-4 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                    mode === modeKey ? 'border-primary' : 'border-muted'
                  }`}
                >
                  <span className="font-semibold">{MODE_INFO[modeKey].name}</span>
                  <span className="text-xs text-muted-foreground">
                    {MODE_INFO[modeKey].description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Work Scope (for plan-work mode) */}
          {mode === 'plan-work' && (
            <div className="space-y-2">
              <Label htmlFor="workScope">Work Scope</Label>
              <Input
                id="workScope"
                placeholder="e.g., 'User authentication feature' or 'API rate limiting'"
                value={workScope}
                onChange={(e) => setWorkScope(e.target.value)}
                disabled={isGenerating}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (!goal.trim() && !usePrdDocs) || (mode === 'plan-work' && !workScope.trim())}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Generate Plan
                </>
              )}
            </Button>
            {isGenerating && (
              <Button variant="destructive" onClick={onCancelPlan} className="gap-2">
                <Square className="h-4 w-4" />
                Cancel
              </Button>
            )}

            {hasOutput && !isGenerating && (
              <Button variant="outline" onClick={onClearOutput} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Output Section */}
      {(hasOutput || isGenerating || planError) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Plan...
                  </>
                ) : planError ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Error
                  </>
                ) : planComplete ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Plan Complete
                  </>
                ) : (
                  'Output'
                )}
              </CardTitle>
              {planStatus.mode && (
                <Badge variant="secondary">
                  {MODE_INFO[planStatus.mode as PlanMode]?.name || planStatus.mode}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {planError && (
              <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
                {planError}
              </div>
            )}

            {(planOutput || planComplete) && (
              <>
                <ScrollArea className="h-[400px] rounded-lg border bg-muted/30">
                  <pre className="whitespace-pre-wrap p-4 font-mono text-sm">
                    {planComplete?.plan || planOutput}
                  </pre>
                </ScrollArea>

                {/* Action Buttons */}
                {!isGenerating && (
                  <div className="flex items-center gap-3">
                    <Button onClick={handleInsert} className="gap-2">
                      <FileDown className="h-4 w-4" />
                      Insert into IMPLEMENTATION_PLAN.md
                    </Button>
                    <Button variant="outline" onClick={handleCopyToClipboard} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy to Clipboard
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            The Plan Generator uses Claude Code to analyze your project's specs, existing code,
            and your goal to create a prioritized implementation plan.
          </p>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Planning Modes:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>Standard:</strong> Comprehensive analysis of specs and codebase
              </li>
              <li>
                <strong>SLC:</strong> Focus on Simple, Lovable, Complete - delivers user value
                incrementally
              </li>
              <li>
                <strong>Work-Scoped:</strong> Focused planning for a specific feature branch
              </li>
            </ul>
          </div>
          <p>
            After generation, click "Insert" to save the plan to IMPLEMENTATION_PLAN.md,
            then use the Loop Controls to start building.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
