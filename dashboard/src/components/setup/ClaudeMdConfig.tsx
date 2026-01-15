import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Copy,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { ClaudeMdFile, ProjectInfo } from '@/types';

interface ClaudeMdConfigProps {
  claudeMdFiles: ClaudeMdFile[];
  claudeMdContent: { path: string; content: string } | null;
  claudeMdLoading: boolean;
  claudeMdApplying: boolean;
  projectInfo: ProjectInfo | null;
  onListFiles: () => void;
  onReadFile: (path: string) => void;
  onApplyRalphClaudeMd: () => void;
  onClosePreview: () => void;
}

export function ClaudeMdConfig({
  claudeMdFiles,
  claudeMdContent,
  claudeMdLoading,
  claudeMdApplying,
  projectInfo,
  onListFiles,
  onReadFile,
  onApplyRalphClaudeMd,
  onClosePreview,
}: ClaudeMdConfigProps) {
  // Load files on mount
  useEffect(() => {
    onListFiles();
  }, [onListFiles]);

  const parentFiles = claudeMdFiles.filter((f) => f.location.startsWith('parent'));
  const ralphFile = claudeMdFiles.find((f) => f.location.startsWith('ralph'));
  const hasParentClaudeMd = parentFiles.some((f) => f.exists);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          CLAUDE.md Configuration
        </CardTitle>
        <CardDescription>
          Review and manage CLAUDE.md files for your project and Ralph Wiggum.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Parent Project Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Parent Project</h3>
            <Button variant="ghost" size="sm" onClick={onListFiles} disabled={claudeMdLoading}>
              <RefreshCw className={`h-4 w-4 ${claudeMdLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {projectInfo && (
            <p className="text-xs text-muted-foreground truncate" title={projectInfo.targetProjectPath}>
              {projectInfo.targetProjectPath}
            </p>
          )}
          <div className="space-y-2">
            {parentFiles.map((file) => (
              <div
                key={file.path}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.location}</p>
                  {file.exists && (
                    <p className="text-xs text-muted-foreground">{file.lineCount} lines</p>
                  )}
                </div>
                {file.exists ? (
                  <>
                    <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Exists
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReadFile(file.path)}
                      disabled={claudeMdLoading}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <XCircle className="h-3 w-3" />
                    Not found
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ralph's CLAUDE.md Section */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Ralph Wiggum CLAUDE.md</h3>
          {ralphFile && (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ralphFile.location}</p>
                {ralphFile.exists && (
                  <p className="text-xs text-muted-foreground">{ralphFile.lineCount} lines</p>
                )}
              </div>
              {ralphFile.exists ? (
                <>
                  <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Exists
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReadFile(ralphFile.path)}
                    disabled={claudeMdLoading}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <XCircle className="h-3 w-3" />
                  Not found
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Apply Ralph's CLAUDE.md */}
        {ralphFile?.exists && (
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              {hasParentClaudeMd
                ? "Replace your project's CLAUDE.md with Ralph's workflow configuration."
                : "Apply Ralph's CLAUDE.md to your project to enable the Ralph Wiggum protocol."}
            </p>
            <Button
              onClick={onApplyRalphClaudeMd}
              disabled={claudeMdApplying}
              variant={hasParentClaudeMd ? 'outline' : 'default'}
              className="gap-2"
            >
              {claudeMdApplying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {hasParentClaudeMd ? "Replace with Ralph's CLAUDE.md" : "Apply Ralph's CLAUDE.md"}
            </Button>
          </div>
        )}

        {/* Content Preview Modal */}
        {claudeMdContent && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Preview: {claudeMdContent.path.split(/[\\/]/).pop()}</h3>
              <Button variant="ghost" size="sm" onClick={onClosePreview}>
                Close
              </Button>
            </div>
            <ScrollArea className="h-64 rounded-md border">
              <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                {claudeMdContent.content}
              </pre>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
