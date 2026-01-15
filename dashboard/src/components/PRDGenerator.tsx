import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PRDGeneratorStatus } from '@/types';
import {
  FileText,
  Play,
  Square,
  Copy,
  FileDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  X,
} from 'lucide-react';

interface PRDGeneratorProps {
  prdStatus: PRDGeneratorStatus;
  prdOutput: string;
  prdComplete: { prd: string; audience: string } | null;
  prdError: string | null;
  onGeneratePRD: (options: {
    productName: string;
    problemStatement: string;
    targetAudience: string;
    keyCapabilities: string[];
  }) => void;
  onCancelPRD: () => void;
  onInsertPRD: (prdContent: string, audienceContent: string) => void;
  onClearOutput: () => void;
}

export function PRDGenerator({
  prdStatus,
  prdOutput,
  prdComplete,
  prdError,
  onGeneratePRD,
  onCancelPRD,
  onInsertPRD,
  onClearOutput,
}: PRDGeneratorProps) {
  const [productName, setProductName] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>(['']);

  const handleGenerate = () => {
    const filteredCapabilities = capabilities.filter((cap) => cap.trim() !== '');
    if (!productName.trim() || !problemStatement.trim() || filteredCapabilities.length === 0) return;

    onGeneratePRD({
      productName: productName.trim(),
      problemStatement: problemStatement.trim(),
      targetAudience: targetAudience.trim(),
      keyCapabilities: filteredCapabilities,
    });
  };

  const handleCopyPRD = () => {
    const content = prdComplete?.prd || '';
    navigator.clipboard.writeText(content);
  };

  const handleCopyAudience = () => {
    const content = prdComplete?.audience || '';
    navigator.clipboard.writeText(content);
  };

  const handleInsert = () => {
    if (prdComplete) {
      onInsertPRD(prdComplete.prd, prdComplete.audience);
    }
  };

  const addCapability = () => {
    setCapabilities([...capabilities, '']);
  };

  const removeCapability = (index: number) => {
    if (capabilities.length > 1) {
      setCapabilities(capabilities.filter((_, i) => i !== index));
    }
  };

  const updateCapability = (index: number, value: string) => {
    const updated = [...capabilities];
    updated[index] = value;
    setCapabilities(updated);
  };

  const isGenerating = prdStatus.generating;
  const hasOutput = prdOutput.length > 0 || prdComplete !== null;
  const isValid = productName.trim() && problemStatement.trim() && capabilities.some((cap) => cap.trim());

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate PRD & Audience
          </CardTitle>
          <CardDescription>
            Fill in product details to generate PRD.md and AUDIENCE_JTBD.md documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name</Label>
            <Input
              id="productName"
              placeholder="e.g., TaskFlow Pro, CodeReview Assistant"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Problem Statement */}
          <div className="space-y-2">
            <Label htmlFor="problemStatement">Problem Statement</Label>
            <textarea
              id="problemStatement"
              placeholder="What problem does this solve? Who has this problem? Why is it important to solve?"
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              disabled={isGenerating}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <textarea
              id="targetAudience"
              placeholder="Describe who you're building this for... e.g., 'Software development teams of 5-20 people who struggle with code review bottlenecks'"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              disabled={isGenerating}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* Key Capabilities */}
          <div className="space-y-3">
            <Label>Key Capabilities</Label>
            <div className="space-y-2">
              {capabilities.map((capability, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Capability ${index + 1}, e.g., 'Real-time collaboration'`}
                    value={capability}
                    onChange={(e) => updateCapability(index, e.target.value)}
                    disabled={isGenerating}
                  />
                  {capabilities.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCapability(index)}
                      disabled={isGenerating}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addCapability}
              disabled={isGenerating}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Capability
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {!isGenerating ? (
              <Button
                onClick={handleGenerate}
                disabled={!isValid}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Generate PRD
              </Button>
            ) : (
              <Button variant="destructive" onClick={onCancelPRD} className="gap-2">
                <Square className="h-4 w-4" />
                Cancel
              </Button>
            )}

            {hasOutput && !isGenerating && (
              <Button variant="outline" onClick={onClearOutput} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Output Section */}
      {(hasOutput || isGenerating || prdError) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Documents...
                  </>
                ) : prdError ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Error
                  </>
                ) : prdComplete ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Documents Ready
                  </>
                ) : (
                  'Output'
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {prdError && (
              <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
                {prdError}
              </div>
            )}

            {(prdOutput || prdComplete) && (
              <>
                {prdComplete ? (
                  // Show parsed documents in tabs
                  <Tabs defaultValue="prd" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="prd">PRD.md</TabsTrigger>
                      <TabsTrigger value="audience">AUDIENCE_JTBD.md</TabsTrigger>
                    </TabsList>
                    <TabsContent value="prd">
                      <ScrollArea className="h-[400px] rounded-lg border bg-muted/30">
                        <pre className="whitespace-pre-wrap p-4 font-mono text-sm">
                          {prdComplete.prd}
                        </pre>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="audience">
                      <ScrollArea className="h-[400px] rounded-lg border bg-muted/30">
                        <pre className="whitespace-pre-wrap p-4 font-mono text-sm">
                          {prdComplete.audience || '(No audience document generated)'}
                        </pre>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                ) : (
                  // Show streaming output while generating
                  <ScrollArea className="h-[400px] rounded-lg border bg-muted/30">
                    <pre className="whitespace-pre-wrap p-4 font-mono text-sm">
                      {prdOutput}
                    </pre>
                  </ScrollArea>
                )}

                {/* Action Buttons */}
                {!isGenerating && prdComplete && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={handleInsert} className="gap-2">
                      <FileDown className="h-4 w-4" />
                      Insert Both Files
                    </Button>
                    <Button variant="outline" onClick={handleCopyPRD} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy PRD
                    </Button>
                    <Button variant="outline" onClick={handleCopyAudience} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy Audience
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            The PRD Generator uses Claude Code to create a Product Requirements Document
            and Audience/JTBD analysis based on your inputs.
          </p>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Generated Documents:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>PRD.md:</strong> Product overview, goals, scope, capabilities, and release strategy
              </li>
              <li>
                <strong>AUDIENCE_JTBD.md:</strong> Target audience analysis and jobs-to-be-done
              </li>
            </ul>
          </div>
          <p>
            After generation, click "Insert Both Files" to save the documents,
            then use the Plan Generator to create an implementation plan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
