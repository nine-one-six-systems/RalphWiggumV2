import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LoopStatus as LoopStatusType } from '@/types';
import { Play, Pause, Clock, Hash, Target } from 'lucide-react';

interface LoopStatusProps {
  status: LoopStatusType;
}

export function LoopStatus({ status }: LoopStatusProps) {
  const formatDuration = (startedAt?: Date) => {
    if (!startedAt) return '-';
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(startedAt).getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {status.running ? (
            <Play className="h-5 w-5 text-green-500" />
          ) : (
            <Pause className="h-5 w-5 text-muted-foreground" />
          )}
          Loop Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">State</span>
          <Badge variant={status.running ? 'success' : 'secondary'}>
            {status.running ? 'Running' : 'Stopped'}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Mode</span>
          <Badge variant="outline">{status.mode || 'None'}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Hash className="h-4 w-4" />
            Iteration
          </span>
          <span className="font-mono font-semibold">
            {status.iteration}
            {status.maxIterations > 0 && (
              <span className="text-muted-foreground">/{status.maxIterations}</span>
            )}
          </span>
        </div>

        {status.running && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Duration
            </span>
            <span className="font-mono">{formatDuration(status.startedAt)}</span>
          </div>
        )}

        {status.workScope && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Scope
            </span>
            <span className="truncate text-sm max-w-[150px]" title={status.workScope}>
              {status.workScope}
            </span>
          </div>
        )}

        {status.pid && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">PID</span>
            <span className="font-mono text-sm">{status.pid}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
