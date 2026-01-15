import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { TasksState } from '@/types';
import { ListTodo, CheckCircle2, Circle } from 'lucide-react';

interface TaskListProps {
  tasks: TasksState;
}

export function TaskList({ tasks }: TaskListProps) {
  const progress = tasks.total > 0 ? (tasks.completed / tasks.total) * 100 : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <ListTodo className="h-5 w-5" />
            Implementation Plan
          </span>
          <Badge variant="outline">
            {tasks.completed}/{tasks.total}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {tasks.tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <ListTodo className="mb-2 h-8 w-8" />
            <p className="text-sm">No tasks found</p>
            <p className="text-xs">Run planning mode to generate tasks</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {tasks.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    task.completed
                      ? 'border-green-500/20 bg-green-500/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  {task.completed ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className={`text-sm ${
                      task.completed ? 'text-muted-foreground line-through' : ''
                    }`}
                  >
                    {task.content}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {tasks.lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(tasks.lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
