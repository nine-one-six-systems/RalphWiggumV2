import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { LogEntry } from '@/types';
import { Terminal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogViewerProps {
  logs: LogEntry[];
  compact?: boolean;
  onClear: () => void;
}

export function LogViewer({ logs, compact = false, onClear }: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'success':
        return 'text-green-500';
      default:
        return 'text-foreground';
    }
  };

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <ScrollArea className="h-[300px]" ref={scrollRef}>
            <div className="space-y-1 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">No logs yet</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={cn('flex gap-2', getLogColor(log.type))}
                  >
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="break-all">{log.content}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="h-5 w-5" />
          Log Output
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onClear}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-1 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Terminal className="mb-2 h-8 w-8" />
                <p>No logs yet</p>
                <p className="text-xs">Start a loop to see output</p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    'flex gap-3 rounded px-2 py-1 hover:bg-muted/50',
                    getLogColor(log.type)
                  )}
                >
                  <span className="shrink-0 text-muted-foreground">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className="break-all whitespace-pre-wrap">{log.content}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
