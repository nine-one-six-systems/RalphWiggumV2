import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ProjectConfig } from '@/types';
import {
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Wand2,
  Loader2,
  X,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

interface DocFile {
  name: string;
  description: string;
  exists: boolean;
  generateTab?: 'plan' | 'prd';
}

interface ExistingDocsViewerProps {
  projectConfig: ProjectConfig | null;
  onReadFile: (filename: string) => void;
  onNavigateToGenerate: (tab: 'plan' | 'prd') => void;
  previewDoc: { file: string; content: string } | null;
  isLoadingPreview: boolean;
  onClosePreview: () => void;
  onRefresh?: () => void;
}

export function ExistingDocsViewer({
  projectConfig,
  onReadFile,
  onNavigateToGenerate,
  previewDoc,
  isLoadingPreview,
  onClosePreview,
  onRefresh,
}: ExistingDocsViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!projectConfig) {
    return null;
  }

  const docs: DocFile[] = [
    {
      name: 'AGENTS.md',
      description: 'Build commands and project config',
      exists: projectConfig.hasAgentsMd,
    },
    {
      name: 'PRD.md',
      description: 'Product Requirements Document',
      exists: projectConfig.hasPRD,
      generateTab: 'prd',
    },
    {
      name: 'AUDIENCE_JTBD.md',
      description: 'Target audience and jobs-to-be-done',
      exists: projectConfig.hasAudienceJTBD,
      generateTab: 'prd',
    },
    {
      name: 'IMPLEMENTATION_PLAN.md',
      description: 'Task list for Ralph to execute',
      exists: projectConfig.hasImplementationPlan,
      generateTab: 'plan',
    },
  ];

  const existingCount = docs.filter((d) => d.exists).length;

  const handleCopy = async () => {
    if (previewDoc?.content) {
      await navigator.clipboard.writeText(previewDoc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClosePreview();
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Current Documents
            </CardTitle>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  className="h-7 w-7 p-0"
                  title="Refresh document status"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              <Badge variant="secondary">
                {existingCount}/{docs.length} ready
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.name}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {doc.exists ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.exists ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReadFile(doc.name)}
                      className="gap-1.5"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  ) : doc.generateTab ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigateToGenerate(doc.generateTab!)}
                      className="gap-1.5"
                    >
                      <Wand2 className="h-4 w-4" />
                      Generate
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Missing
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {(previewDoc !== null || isLoadingPreview) && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h2 className="font-semibold">
                    {previewDoc?.file || 'Loading...'}
                  </h2>
                  {previewDoc && (
                    <p className="text-xs text-muted-foreground">
                      {(previewDoc.content.length / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClosePreview}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-auto p-4">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : previewDoc ? (
                <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                  {previewDoc.content}
                </pre>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Failed to load document
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-4 border-t bg-muted/30 shrink-0">
              <Button variant="outline" onClick={onClosePreview}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
