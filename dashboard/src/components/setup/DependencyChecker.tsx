import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import type { DependencyCheckResult } from '@/types';

interface DependencyCheckerProps {
  dependencies: DependencyCheckResult[];
  loading: boolean;
  onCheck: () => void;
}

export function DependencyChecker({ dependencies, loading, onCheck }: DependencyCheckerProps) {
  // Auto-check on mount
  useEffect(() => {
    if (dependencies.length === 0) {
      onCheck();
    }
  }, [dependencies.length, onCheck]);

  const allAvailable = dependencies.length > 0 && dependencies.every((d) => d.available);
  const missingCount = dependencies.filter((d) => !d.available).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              System Dependencies
            </CardTitle>
            <CardDescription>
              Required CLI tools for PRD and Plan generation
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCheck} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Badge */}
        {dependencies.length > 0 && (
          <div className="flex items-center gap-2">
            {allAvailable ? (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                <CheckCircle2 className="h-3 w-3" />
                All dependencies available
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-red-600 border-red-600">
                <AlertCircle className="h-3 w-3" />
                {missingCount} missing
              </Badge>
            )}
          </div>
        )}

        {/* Dependency List */}
        <div className="space-y-2">
          {loading && dependencies.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking dependencies...
            </div>
          ) : (
            dependencies.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                {dep.available ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{dep.name}</p>
                  {dep.available ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {dep.version} {dep.path && `• ${dep.path}`}
                    </p>
                  ) : (
                    <p className="text-xs text-red-500">
                      {dep.error || 'Not installed'}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Installation Help */}
        {missingCount > 0 && (
          <div className="rounded-lg border border-dashed p-3 text-sm space-y-3">
            <p className="font-medium">Installation Instructions:</p>
            {dependencies
              .filter((d) => !d.available)
              .map((dep) => (
                <div key={dep.id} className="space-y-1">
                  <p className="font-medium text-foreground">{dep.name}:</p>
                  {dep.id === 'claude' && (
                    <code className="block text-xs bg-muted px-2 py-1 rounded">
                      npm install -g @anthropic-ai/claude-code
                    </code>
                  )}
                  {dep.id === 'node' && (
                    <p className="text-xs text-muted-foreground">
                      Download from{' '}
                      <a
                        href="https://nodejs.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        nodejs.org
                      </a>
                    </p>
                  )}
                  {dep.id === 'npm' && (
                    <p className="text-xs text-muted-foreground">
                      Included with Node.js installation
                    </p>
                  )}
                  {dep.id === 'git' && (
                    <p className="text-xs text-muted-foreground">
                      Download from{' '}
                      <a
                        href="https://git-scm.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        git-scm.com
                      </a>
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
