import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bot, Code, Eye, Sparkles, Globe, FolderCode, Server } from 'lucide-react';
import type { AgentInfo } from '@/types';

interface SpecialistAgentsConfigProps {
  availableAgents: AgentInfo[];
  agentsLoading: boolean;
  onListAgents: () => void;
  onToggleAgent: (agentId: string, enabled: boolean) => void;
}

const agentIcons: Record<string, typeof Bot> = {
  'react-typescript-expert': Code,
  'accessibility-expert': Eye,
  'qol-ux-expert': Sparkles,
  'golang-backend-expert': Server,
};

export function SpecialistAgentsConfig({
  availableAgents,
  agentsLoading,
  onListAgents,
  onToggleAgent,
}: SpecialistAgentsConfigProps) {
  // Fetch agents on mount
  useEffect(() => {
    onListAgents();
  }, [onListAgents]);

  // Group agents by source
  const globalAgents = availableAgents.filter((a) => a.source === 'global');
  const projectAgents = availableAgents.filter((a) => a.source === 'project');

  const renderAgent = (agent: AgentInfo) => {
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
            <Badge variant={agent.source === 'global' ? 'outline' : 'secondary'} className="text-xs gap-1">
              {agent.source === 'global' ? (
                <><Globe className="h-3 w-3" /> Global</>
              ) : (
                <><FolderCode className="h-3 w-3" /> Project</>
              )}
            </Badge>
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
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Specialist Agents
        </CardTitle>
        <CardDescription>
          Enable or disable specialist agents that provide code review and quality checks during
          implementation. Agents from ~/.claude/agents/ are available globally, while project
          agents in .claude/agents/ are project-specific.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {agentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading agents...</span>
          </div>
        ) : availableAgents.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Bot className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">No Agents Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No agent files found in ~/.claude/agents/ or .claude/agents/.
              Create agent files with YAML frontmatter to add specialists.
            </p>
          </div>
        ) : (
          <>
            {/* Global Agents Section */}
            {globalAgents.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  Global Agents
                  <span className="text-xs">~/.claude/agents/</span>
                </h3>
                <div className="space-y-3">
                  {globalAgents.map(renderAgent)}
                </div>
              </div>
            )}

            {/* Project Agents Section */}
            {projectAgents.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FolderCode className="h-4 w-4" />
                  Project Agents
                  <span className="text-xs">.claude/agents/</span>
                </h3>
                <div className="space-y-3">
                  {projectAgents.map(renderAgent)}
                </div>
              </div>
            )}

            {/* Empty project agents placeholder */}
            {projectAgents.length === 0 && globalAgents.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FolderCode className="h-4 w-4" />
                  Project Agents
                </h3>
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No project-specific agents. Copy agents from global to .claude/agents/ to override.
                </div>
              </div>
            )}
          </>
        )}

        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="mb-2 font-medium">How Specialist Agents Work</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Specialist agents are invoked through the Task tool when implementing complex
              features. They are defined as Markdown files with YAML frontmatter:
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>Global agents</strong> (~/.claude/agents/): Available in all projects
              </li>
              <li>
                <strong>Project agents</strong> (.claude/agents/): Override global or add project-specific agents
              </li>
            </ul>
            <p className="mt-3">
              Toggle agents on/off to control which specialists Claude can delegate to.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
