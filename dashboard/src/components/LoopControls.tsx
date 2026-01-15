import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LoopStatus, LoopMode } from '@/types';
import { Play, Square, Settings2 } from 'lucide-react';

interface LoopControlsProps {
  loopStatus: LoopStatus;
  onStart: (options: { mode: LoopMode; maxIterations?: number; workScope?: string }) => void;
  onStop: () => void;
}

export function LoopControls({ loopStatus, onStart, onStop }: LoopControlsProps) {
  const [mode, setMode] = useState<LoopMode>('build');
  const [maxIterations, setMaxIterations] = useState<string>('20');
  const [workScope, setWorkScope] = useState('');

  const handleStart = () => {
    const iterations = maxIterations ? parseInt(maxIterations, 10) : undefined;
    onStart({
      mode,
      maxIterations: iterations && iterations > 0 ? iterations : undefined,
      workScope: mode === 'plan-work' ? workScope : undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5" />
          Loop Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
          {/* Mode Selection */}
          <div className="w-[180px] space-y-2">
            <Label htmlFor="mode">Mode</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as LoopMode)}
              disabled={loopStatus.running}
            >
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="build">Build</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="plan-slc">Plan SLC</SelectItem>
                <SelectItem value="plan-work">Plan Work</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max Iterations */}
          <div className="w-[120px] space-y-2">
            <Label htmlFor="iterations">Max Iterations</Label>
            <Input
              id="iterations"
              type="number"
              min="0"
              placeholder="Unlimited"
              value={maxIterations}
              onChange={(e) => setMaxIterations(e.target.value)}
              disabled={loopStatus.running}
            />
          </div>

          {/* Work Scope (only for plan-work mode) */}
          {mode === 'plan-work' && (
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label htmlFor="workScope">Work Description</Label>
              <Input
                id="workScope"
                placeholder="e.g., user authentication system"
                value={workScope}
                onChange={(e) => setWorkScope(e.target.value)}
                disabled={loopStatus.running}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {loopStatus.running ? (
              <Button variant="destructive" onClick={onStop} className="gap-2">
                <Square className="h-4 w-4" />
                Stop Loop
              </Button>
            ) : (
              <Button onClick={handleStart} className="gap-2">
                <Play className="h-4 w-4" />
                Start {mode === 'build' ? 'Build' : mode === 'plan' ? 'Planning' : mode === 'plan-slc' ? 'SLC Planning' : 'Work Planning'}
              </Button>
            )}
          </div>
        </div>

        {/* Mode Description */}
        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          {mode === 'build' && (
            <p>
              <strong>Build mode:</strong> Implements tasks from IMPLEMENTATION_PLAN.md one at a
              time. Runs validation, commits on success, and updates the plan.
            </p>
          )}
          {mode === 'plan' && (
            <p>
              <strong>Plan mode:</strong> Analyzes specs and existing code to generate or update
              IMPLEMENTATION_PLAN.md. No implementation or commits.
            </p>
          )}
          {mode === 'plan-slc' && (
            <p>
              <strong>Plan SLC mode:</strong> SLC-oriented planning that recommends Simple,
              Lovable, Complete release slices based on AUDIENCE_JTBD.md.
            </p>
          )}
          {mode === 'plan-work' && (
            <p>
              <strong>Plan Work mode:</strong> Creates a scoped plan for the current work branch.
              Must be run on a feature branch, not main/master.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
