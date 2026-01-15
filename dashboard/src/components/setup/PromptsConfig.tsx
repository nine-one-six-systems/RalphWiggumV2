import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, FileText, Info } from 'lucide-react';

interface PromptsConfigProps {
  onReadFile: (file: string) => void;
  onWriteFile: (file: string, content: string) => void;
}

const PROMPTS = [
  {
    id: 'build',
    name: 'Build Mode',
    file: 'PROMPT_build.md',
    description: 'Executes tasks from IMPLEMENTATION_PLAN.md',
  },
  {
    id: 'plan',
    name: 'Plan Mode',
    file: 'PROMPT_plan.md',
    description: 'Creates/updates implementation plan from specs',
  },
  {
    id: 'plan-slc',
    name: 'Plan SLC Mode',
    file: 'PROMPT_plan_slc.md',
    description: 'SLC-oriented planning with audience focus',
  },
  {
    id: 'plan-work',
    name: 'Plan Work Mode',
    file: 'PROMPT_plan_work.md',
    description: 'Scoped planning for feature branches',
  },
];

const DEFAULT_PLAN_PROMPT = `0a. Study \`specs/*\` with up to 250 parallel Sonnet subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md (if present) to understand the plan so far.
0c. Study \`src/lib/*\` with up to 250 parallel Sonnet subagents to understand shared utilities & components.
0d. For reference, the application source code is in \`src/*\`.

1. Study @IMPLEMENTATION_PLAN.md (if present; it may be incorrect) and use up to 500 Sonnet subagents to study existing source code in \`src/*\` and compare it against \`specs/*\`. Use an Opus subagent to analyze findings, prioritize tasks, and create/update @IMPLEMENTATION_PLAN.md as a bullet point list sorted in priority of items yet to be implemented. Ultrathink. Consider searching for TODO, minimal implementations, placeholders, skipped/flaky tests, and inconsistent patterns. Study @IMPLEMENTATION_PLAN.md to determine starting point for research and keep it up to date with items considered complete/incomplete using subagents.

For each task in the plan, derive required tests from acceptance criteria in specs - what specific outcomes need verification (behavior, performance, edge cases). Tests verify WHAT works, not HOW it's implemented. Include as part of task definition.

When deriving test requirements from acceptance criteria, identify whether verification requires programmatic validation (measurable, inspectable) or human-like judgment (perceptual quality, tone, aesthetics). Both types are equally valid backpressure mechanisms. For subjective criteria that resist programmatic validation, explore src/lib for non-deterministic evaluation patterns.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first. Treat \`src/lib\` as the project's standard library for shared utilities and components. Prefer consolidated, idiomatic implementations there over ad-hoc copies.

ULTIMATE GOAL: We want to achieve [YOUR PROJECT GOAL HERE]. Consider missing elements and plan accordingly. If an element is missing, search first to confirm it doesn't exist, then if needed author the specification at specs/FILENAME.md. If you create a new element then document the plan to implement it in @IMPLEMENTATION_PLAN.md using a subagent.
`;

export function PromptsConfig({ onWriteFile }: PromptsConfigProps) {
  const [activePrompt, setActivePrompt] = useState('plan');
  const [content, setContent] = useState(DEFAULT_PLAN_PROMPT);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const prompt = PROMPTS.find((p) => p.id === activePrompt);
      if (prompt) {
        onWriteFile(prompt.file, content);
      }
      await new Promise((r) => setTimeout(r, 500));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Prompt Templates
        </CardTitle>
        <CardDescription>
          Configure the prompts used for different Ralph Wiggum modes. These prompts define how
          Ralph approaches planning and building.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activePrompt} onValueChange={setActivePrompt}>
          <TabsList className="grid w-full grid-cols-4">
            {PROMPTS.map((prompt) => (
              <TabsTrigger key={prompt.id} value={prompt.id}>
                {prompt.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {PROMPTS.map((prompt) => (
            <TabsContent key={prompt.id} value={prompt.id} className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div>
                  <p className="font-medium">{prompt.name}</p>
                  <p className="text-sm text-muted-foreground">{prompt.description}</p>
                </div>
                <Badge variant="outline" className="font-mono">
                  {prompt.file}
                </Badge>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt Content</label>
                <ScrollArea className="h-[350px] rounded-lg border">
                  <textarea
                    className="min-h-full w-full resize-none bg-transparent p-4 font-mono text-sm outline-none"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter prompt content..."
                  />
                </ScrollArea>
              </div>

              {prompt.id === 'plan' && (
                <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-600 dark:text-blue-400">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Important: Set Your Project Goal</p>
                    <p>
                      Replace <code>[YOUR PROJECT GOAL HERE]</code> at the end of the prompt with
                      your specific project objective. This guides Ralph's planning priorities.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setContent(DEFAULT_PLAN_PROMPT)}>
            Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Prompt'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
