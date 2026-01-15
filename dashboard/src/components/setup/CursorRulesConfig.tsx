import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileCode, Download, ChevronRight } from 'lucide-react';

interface CursorRulesConfigProps {
  onReadFile: (file: string) => void;
  onWriteFile: (file: string, content: string) => void;
}

const AVAILABLE_RULES = [
  {
    id: '1000-react-general',
    name: 'React General',
    description: 'Vite + React 19 + TypeScript conventions',
    globs: ['src/**/*.{ts,tsx}'],
  },
  {
    id: '1001-react-components',
    name: 'React Components',
    description: 'Component structure and patterns',
    globs: ['src/components/**/*.tsx'],
  },
  {
    id: '1002-react-hooks',
    name: 'React Hooks',
    description: 'Custom hooks best practices',
    globs: ['src/hooks/**/*.ts'],
  },
  {
    id: '1003-react-forms',
    name: 'React Forms',
    description: 'Form handling patterns',
    globs: ['*Form*.tsx', 'src/components/forms/*'],
  },
  {
    id: '1004-accessibility-wcag',
    name: 'Accessibility (WCAG)',
    description: 'WCAG 2.2 compliance rules',
    globs: ['*.tsx'],
  },
  {
    id: '1005-qol-ux',
    name: 'QoL/UX',
    description: 'Loading states, toasts, dark mode',
    globs: ['*.tsx'],
  },
  {
    id: '1006-testing',
    name: 'Testing',
    description: 'Test file conventions',
    globs: ['*.test.{ts,tsx}'],
  },
  {
    id: '1007-tailwindcss',
    name: 'TailwindCSS',
    description: 'Tailwind styling patterns',
    globs: ['*.tsx', '*.css'],
  },
  {
    id: '1008-typescript',
    name: 'TypeScript',
    description: 'TypeScript strict mode rules',
    globs: ['*.ts', '*.tsx'],
  },
  {
    id: '1009-services',
    name: 'Services',
    description: 'API and service layer patterns',
    globs: ['src/services/**/*.ts'],
  },
  {
    id: '1010-state-management',
    name: 'State Management',
    description: 'Store and state patterns',
    globs: ['src/store/**/*.ts'],
  },
  {
    id: '2000-golang-backend',
    name: 'Go Backend',
    description: 'Go backend conventions',
    globs: ['**/*.go'],
  },
];

export function CursorRulesConfig(_props: CursorRulesConfigProps) {
  const [enabledRules, setEnabledRules] = useState<Set<string>>(
    new Set(['1000-react-general', '1004-accessibility-wcag', '1008-typescript'])
  );
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const toggleRule = (id: string) => {
    setEnabledRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          Cursor Rules Configuration
        </CardTitle>
        <CardDescription>
          Select which .cursor/rules/*.mdc rule files to include in your project. Rules define
          coding standards and patterns that Ralph follows during implementation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div>
            <p className="font-medium">Rules Location</p>
            <p className="text-sm text-muted-foreground">.cursor/rules/*.mdc</p>
          </div>
          <Badge variant="outline">{enabledRules.size} enabled</Badge>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {AVAILABLE_RULES.map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-4 p-4">
                  <Switch
                    id={rule.id}
                    checked={enabledRules.has(rule.id)}
                    onCheckedChange={() => toggleRule(rule.id)}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={rule.id}
                      className="cursor-pointer font-medium"
                    >
                      {rule.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {rule.description}
                    </p>
                  </div>
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
                      <div>
                        <span className="text-sm font-medium">File Pattern:</span>
                        <code className="ml-2 rounded bg-muted px-2 py-1 text-xs">
                          {rule.globs.join(', ')}
                        </code>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Rule File:</span>
                        <code className="ml-2 rounded bg-muted px-2 py-1 text-xs">
                          .cursor/rules/{rule.id}.mdc
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setEnabledRules(
                new Set([
                  '1000-react-general',
                  '1001-react-components',
                  '1004-accessibility-wcag',
                  '1008-typescript',
                ])
              )
            }
          >
            Reset to Defaults
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Download Rules
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
