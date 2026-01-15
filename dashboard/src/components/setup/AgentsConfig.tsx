import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, RefreshCw } from 'lucide-react';

interface AgentsConfigProps {
  onReadFile: (file: string) => void;
  onWriteFile: (file: string, content: string) => void;
}

interface AgentsData {
  buildCommand: string;
  runCommand: string;
  devCommand: string;
  testCommand: string;
  typecheckCommand: string;
  lintCommand: string;
}

const DEFAULT_DATA: AgentsData = {
  buildCommand: 'npm run build',
  runCommand: 'npm start',
  devCommand: 'npm run dev',
  testCommand: 'npm test',
  typecheckCommand: 'npm run typecheck',
  lintCommand: 'npm run lint',
};

export function AgentsConfig({ onWriteFile }: AgentsConfigProps) {
  const [data, setData] = useState<AgentsData>(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);

  const generateAgentsMd = () => {
    return `## Build & Run

Succinct rules for how to BUILD the project:

- Build: \`${data.buildCommand}\`
- Run: \`${data.runCommand}\`
- Dev server: \`${data.devCommand}\`

## Validation

Run these after implementing to get immediate feedback:

- Tests: \`${data.testCommand}\`
- Typecheck: \`${data.typecheckCommand}\`
- Lint: \`${data.lintCommand}\`

## Operational Notes

Succinct learnings about how to RUN the project:

[Replace with project-specific operational notes]

### Codebase Patterns

[Ralph will add learnings here as patterns are discovered]

## Operational Learnings

[Ralph will add learnings here about how to run/build the project]
`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const content = generateAgentsMd();
      onWriteFile('AGENTS.md', content);
      // Small delay to show feedback
      await new Promise((r) => setTimeout(r, 500));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AGENTS.md Configuration</CardTitle>
        <CardDescription>
          Configure your project's build, test, and validation commands. These commands are used
          by Ralph to verify implementations before committing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="buildCommand">Build Command</Label>
            <Input
              id="buildCommand"
              value={data.buildCommand}
              onChange={(e) => setData({ ...data, buildCommand: e.target.value })}
              placeholder="npm run build"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="runCommand">Run Command</Label>
            <Input
              id="runCommand"
              value={data.runCommand}
              onChange={(e) => setData({ ...data, runCommand: e.target.value })}
              placeholder="npm start"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="devCommand">Dev Server Command</Label>
            <Input
              id="devCommand"
              value={data.devCommand}
              onChange={(e) => setData({ ...data, devCommand: e.target.value })}
              placeholder="npm run dev"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="testCommand">Test Command</Label>
            <Input
              id="testCommand"
              value={data.testCommand}
              onChange={(e) => setData({ ...data, testCommand: e.target.value })}
              placeholder="npm test"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="typecheckCommand">Typecheck Command</Label>
            <Input
              id="typecheckCommand"
              value={data.typecheckCommand}
              onChange={(e) => setData({ ...data, typecheckCommand: e.target.value })}
              placeholder="npm run typecheck"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lintCommand">Lint Command</Label>
            <Input
              id="lintCommand"
              value={data.lintCommand}
              onChange={(e) => setData({ ...data, lintCommand: e.target.value })}
              placeholder="npm run lint"
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <h4 className="mb-2 font-medium">Preview</h4>
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
            {generateAgentsMd()}
          </pre>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setData(DEFAULT_DATA)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save AGENTS.md'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
