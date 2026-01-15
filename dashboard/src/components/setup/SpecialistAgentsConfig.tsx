import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SPECIALIST_AGENTS } from '@/types';
import { Bot, Code, Eye, Sparkles } from 'lucide-react';

interface SpecialistAgentsConfigProps {
  enabledAgents: string[];
  onToggleAgent: (agentId: string, enabled: boolean) => void;
}

const agentIcons: Record<string, typeof Bot> = {
  'react-typescript-expert': Code,
  'accessibility-expert': Eye,
  'qol-ux-expert': Sparkles,
};

export function SpecialistAgentsConfig({ enabledAgents, onToggleAgent }: SpecialistAgentsConfigProps) {
  // Derive agents with enabled state from props
  const agents = SPECIALIST_AGENTS.map((agent) => ({
    ...agent,
    enabled: enabledAgents.includes(agent.id),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Specialist Agents
        </CardTitle>
        <CardDescription>
          Enable or disable specialist agents that provide code review and quality checks during
          implementation. These agents are invoked via the Task tool delegation system in CLAUDE.md.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {agents.map((agent) => {
            const Icon = agentIcons[agent.id] || Bot;
            return (
              <div
                key={agent.id}
                className="flex items-start gap-4 rounded-lg border p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={agent.id} className="font-semibold">
                      {agent.name}
                    </Label>
                    <Badge variant={agent.enabled ? 'default' : 'secondary'} className="text-xs">
                      {agent.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                </div>
                <Switch
                  id={agent.id}
                  checked={agent.enabled}
                  onCheckedChange={(checked) => onToggleAgent(agent.id, checked)}
                />
              </div>
            );
          })}
        </div>

        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="mb-2 font-medium">How Specialist Agents Work</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Specialist agents are invoked through the Task tool when implementing complex
              features. They provide:
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>react-typescript-expert:</strong> Reviews component architecture, hooks
                usage, TypeScript types, and performance patterns
              </li>
              <li>
                <strong>accessibility-expert:</strong> Audits for WCAG 2.2 compliance, ARIA
                patterns, keyboard navigation, and screen reader support
              </li>
              <li>
                <strong>qol-ux-expert:</strong> Improves loading states, error handling, form
                validation UX, dark mode, and responsive patterns
              </li>
            </ul>
            <p className="mt-3">
              Enable the agents relevant to your project's technology stack and quality
              requirements.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
