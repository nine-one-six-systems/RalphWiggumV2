import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GitStatus } from '@/types';
import { GitBranch, GitCommit, AlertCircle } from 'lucide-react';

interface GitHistoryProps {
  status: GitStatus;
}

export function GitHistory({ status }: GitHistoryProps) {
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5" />
            Git Status
          </span>
          <Badge variant="outline" className="font-mono">
            {status.branch}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.uncommittedCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-4 w-4" />
            <span>{status.uncommittedCount} uncommitted change(s)</span>
          </div>
        )}

        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <GitCommit className="h-4 w-4" />
            Recent Commits
          </h4>
          {status.commits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commits yet</p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {status.commits.map((commit) => (
                  <div
                    key={commit.hash}
                    className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                        {commit.hash}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(commit.date)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm line-clamp-2">{commit.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{commit.author}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {status.lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Last checked: {new Date(status.lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
