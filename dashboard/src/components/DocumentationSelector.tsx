import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DiscoveredDoc } from '@/types';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Eye,
  Square,
  CheckSquare,
  FolderOpen,
} from 'lucide-react';

interface DocumentationSelectorProps {
  docs: DiscoveredDoc[];
  selectedPaths: string[];
  onSelectionChange: (selectedPaths: string[]) => void;
  onPreviewDoc: (path: string) => void;
}

export function DocumentationSelector({
  docs,
  selectedPaths,
  onSelectionChange,
  onPreviewDoc,
}: DocumentationSelectorProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['Root']));

  // Group docs by directory
  const groupedDocs = useMemo(() => {
    const groups: Record<string, DiscoveredDoc[]> = {};

    for (const doc of docs) {
      const dir = doc.directory;
      if (!groups[dir]) {
        groups[dir] = [];
      }
      groups[dir].push(doc);
    }

    // Sort directories, with Root first
    const sortedDirs = Object.keys(groups).sort((a, b) => {
      if (a === 'Root') return -1;
      if (b === 'Root') return 1;
      return a.localeCompare(b);
    });

    return { groups, sortedDirs };
  }, [docs]);

  const toggleDir = (dir: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) {
        next.delete(dir);
      } else {
        next.add(dir);
      }
      return next;
    });
  };

  const toggleDoc = (docPath: string) => {
    const isSelected = selectedPaths.includes(docPath);
    if (isSelected) {
      onSelectionChange(selectedPaths.filter((p) => p !== docPath));
    } else {
      onSelectionChange([...selectedPaths, docPath]);
    }
  };

  const selectAll = () => {
    onSelectionChange(docs.map((d) => d.path));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectDir = (dir: string) => {
    const dirDocs = groupedDocs.groups[dir] || [];
    const dirPaths = dirDocs.map((d) => d.path);
    const allSelected = dirPaths.every((p) => selectedPaths.includes(p));

    if (allSelected) {
      // Deselect all in this dir
      onSelectionChange(selectedPaths.filter((p) => !dirPaths.includes(p)));
    } else {
      // Select all in this dir
      const newPaths = new Set([...selectedPaths, ...dirPaths]);
      onSelectionChange(Array.from(newPaths));
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="border rounded-lg bg-muted/30">
      {/* Header with Select All / Clear All */}
      <div className="flex items-center justify-between p-3 border-b">
        <span className="text-sm text-muted-foreground">
          {selectedPaths.length} of {docs.length} files selected
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear All
          </Button>
        </div>
      </div>

      {/* Scrollable doc list */}
      <ScrollArea className="h-64">
        <div className="p-2 space-y-1">
          {docs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No markdown files found
            </div>
          ) : (
            groupedDocs.sortedDirs.map((dir) => {
              const dirDocs = groupedDocs.groups[dir];
              const isExpanded = expandedDirs.has(dir);
              const selectedInDir = dirDocs.filter((d) =>
                selectedPaths.includes(d.path)
              ).length;
              const allInDirSelected = selectedInDir === dirDocs.length;

              return (
                <div key={dir} className="space-y-1">
                  {/* Directory header */}
                  <div className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50">
                    <button
                      onClick={() => toggleDir(dir)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{dir}</span>
                      <Badge variant="outline" className="ml-auto">
                        {selectedInDir}/{dirDocs.length}
                      </Badge>
                    </button>
                    <button
                      onClick={() => selectDir(dir)}
                      className="p-1 rounded hover:bg-muted"
                      title={allInDirSelected ? 'Deselect all in folder' : 'Select all in folder'}
                    >
                      {allInDirSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {/* Files in directory */}
                  {isExpanded && (
                    <div className="ml-6 space-y-1">
                      {dirDocs.map((doc) => {
                        const isSelected = selectedPaths.includes(doc.path);
                        return (
                          <div
                            key={doc.path}
                            className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                              isSelected
                                ? 'bg-primary/10 border border-primary/20'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <button
                              onClick={() => toggleDoc(doc.path)}
                              className="p-0.5"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span
                              className={`text-sm flex-1 truncate ${
                                isSelected ? 'font-medium' : ''
                              }`}
                              title={doc.path}
                            >
                              {doc.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatSize(doc.size)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => onPreviewDoc(doc.path)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
