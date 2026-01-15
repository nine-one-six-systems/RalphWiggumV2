import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileCode, ChevronRight, Loader2, RefreshCw, FolderOpen } from 'lucide-react';
import type { CursorRuleInfo } from '@/types';

interface CursorRulesConfigProps {
  cursorRules: CursorRuleInfo[];
  rulesLoading: boolean;
  onListRules: () => void;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
}

export function CursorRulesConfig({
  cursorRules,
  rulesLoading,
  onListRules,
  onToggleRule,
}: CursorRulesConfigProps) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  // Fetch rules on mount
  useEffect(() => {
    onListRules();
  }, [onListRules]);

  const enabledCount = cursorRules.filter((r) => r.enabled).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          Cursor Rules Configuration
        </CardTitle>
        <CardDescription>
          Manage .cursor/rules/*.mdc rule files in your project. Rules define coding standards and
          patterns that Ralph follows during implementation. Toggle rules to enable or disable them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div>
            <p className="font-medium">Rules Location</p>
            <p className="text-sm text-muted-foreground">.cursor/rules/*.mdc</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{enabledCount} enabled</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onListRules}
              disabled={rulesLoading}
            >
              <RefreshCw className={`h-4 w-4 ${rulesLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {rulesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading rules...</span>
          </div>
        ) : cursorRules.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">No Rules Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No .mdc rule files found in .cursor/rules/.
              Add rule files with frontmatter to define coding standards.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Example: .cursor/rules/2000-golang-backend.mdc
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {cursorRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`rounded-lg border transition-colors hover:bg-muted/50 ${
                    !rule.enabled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 p-4">
                    <Switch
                      id={rule.id}
                      checked={rule.enabled}
                      onCheckedChange={(checked) => onToggleRule(rule.id, checked)}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={rule.id}
                        className="cursor-pointer font-medium"
                      >
                        {rule.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {rule.description || 'No description'}
                      </p>
                    </div>
                    <Badge variant={rule.enabled ? 'default' : 'secondary'} className="text-xs">
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedRule(expandedRule === rule.id ? null : rule.id)
                      }
                    >
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          expandedRule === rule.id ? 'rotate-90' : ''
                        }`}
                      />
                    </Button>
                  </div>

                  {expandedRule === rule.id && (
                    <div className="border-t bg-muted/30 p-4">
                      <div className="space-y-2">
                        {rule.globs.length > 0 && (
                          <div>
                            <span className="text-sm font-medium">File Patterns:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {rule.globs.map((glob, i) => (
                                <code
                                  key={i}
                                  className="rounded bg-muted px-2 py-1 text-xs"
                                >
                                  {glob}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium">Rule File:</span>
                          <code className="ml-2 rounded bg-muted px-2 py-1 text-xs">
                            .cursor/rules/{rule.name}
                          </code>
                        </div>
                        {!rule.enabled && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            This rule is disabled. The file has been renamed to {rule.name}.disabled
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="mb-2 font-medium">How Cursor Rules Work</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Rules are .mdc files with YAML frontmatter that define coding standards:
            </p>
            <pre className="mt-2 rounded bg-muted p-2 text-xs">
{`---
description: Go backend development standards
globs: ["**/*.go", "go.mod", "go.sum"]
---

# Rule content here...`}
            </pre>
            <p className="mt-3">
              CLAUDE.md automatically loads rules based on the file patterns when you're working on
              matching files. Disabled rules are renamed to .mdc.disabled.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
