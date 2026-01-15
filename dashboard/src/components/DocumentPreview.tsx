import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  X,
  FileText,
  CheckSquare,
  Square,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';

interface DocumentPreviewProps {
  doc: { path: string; content: string } | null;
  isLoading: boolean;
  isOpen: boolean;
  isSelected: boolean;
  onClose: () => void;
  onToggleSelect: (path: string) => void;
}

export function DocumentPreview({
  doc,
  isLoading,
  isOpen,
  isSelected,
  onClose,
  onToggleSelect,
}: DocumentPreviewProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (doc?.content) {
      await navigator.clipboard.writeText(doc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="font-semibold">{doc?.path || 'Loading...'}</h2>
              {doc && (
                <p className="text-xs text-muted-foreground">
                  {(doc.content.length / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {doc && (
              <>
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
                <Button
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToggleSelect(doc.path)}
                  className="gap-2"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {isSelected ? 'Selected' : 'Select'}
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : doc ? (
            <pre className="text-sm font-mono whitespace-pre-wrap break-words">
              {doc.content}
            </pre>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              Failed to load document
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            {isSelected && (
              <Badge variant="success">
                <Check className="h-3 w-3 mr-1" />
                Selected for PRD context
              </Badge>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
