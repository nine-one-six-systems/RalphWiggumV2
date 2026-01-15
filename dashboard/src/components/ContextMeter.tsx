import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Gauge } from 'lucide-react';

interface ContextMeterProps {
  iteration: number;
}

export function ContextMeter({ iteration }: ContextMeterProps) {
  // Simulate context usage - in reality this would come from actual token counts
  // After each iteration, context resets, so we show "smart zone" concept
  const estimatedContextUsage = Math.min(iteration * 15, 60); // Estimate ~15% per iteration task
  const smartZoneMin = 40;
  const smartZoneMax = 60;

  const getZoneStatus = () => {
    if (estimatedContextUsage < smartZoneMin) {
      return { label: 'Low', color: 'bg-blue-500', description: 'Room for more context' };
    }
    if (estimatedContextUsage <= smartZoneMax) {
      return { label: 'Smart Zone', color: 'bg-green-500', description: 'Optimal context utilization' };
    }
    return { label: 'High', color: 'bg-yellow-500', description: 'Consider refreshing context' };
  };

  const zone = getZoneStatus();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gauge className="h-5 w-5" />
          Context Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estimated Usage</span>
            <span className="font-medium">{estimatedContextUsage}%</span>
          </div>
          <div className="relative">
            <Progress value={estimatedContextUsage} className="h-3" />
            {/* Smart zone indicator */}
            <div
              className="absolute top-0 h-3 border-l-2 border-r-2 border-green-500/50 bg-green-500/10"
              style={{
                left: `${smartZoneMin}%`,
                width: `${smartZoneMax - smartZoneMin}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="text-green-500">Smart Zone (40-60%)</span>
            <span>100%</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div>
            <p className="font-medium">{zone.label}</p>
            <p className="text-xs text-muted-foreground">{zone.description}</p>
          </div>
          <div className={`h-3 w-3 rounded-full ${zone.color}`} />
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Ralph Wiggum uses one task per iteration to maintain fresh context and stay in the
            "smart zone" for optimal AI performance.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-muted/50 p-2">
              <p className="font-medium">Total Window</p>
              <p className="text-muted-foreground">~200K tokens</p>
            </div>
            <div className="rounded bg-muted/50 p-2">
              <p className="font-medium">Usable</p>
              <p className="text-muted-foreground">~176K tokens</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
