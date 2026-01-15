import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DocumentationSelector } from './DocumentationSelector';
import { DocumentPreview } from './DocumentPreview';
import type { PRDGeneratorStatus, DiscoveredDoc } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
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
  FolderOpen,
  Sparkles,
} from 'lucide-react';

interface PRDGeneratorProps {
  prdStatus: PRDGeneratorStatus;
  prdOutput: string;
  prdComplete: { prd: string; audience: string } | null;
  prdError: string | null;
  // Document selection for PRD context
  discoveredDocs: DiscoveredDoc[];
  selectedDocPaths: string[];
  onDocSelectionChange: (paths: string[]) => void;
  onPreviewDoc: (path: string) => void;
  previewDoc: { path: string; content: string } | null;
  isLoadingPreview: boolean;
  onClosePreview: () => void;
  // PRD generation
  onGeneratePRD: (options: {
    productName: string;
    problemStatement: string;
    targetAudience: string;
    keyCapabilities: string[];
    contextDocs?: string[];
    docsOnly?: boolean;
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
  discoveredDocs,
  selectedDocPaths,
  onDocSelectionChange,
  onPreviewDoc,
  previewDoc,
  isLoadingPreview,
  onClosePreview,
  onGeneratePRD,
  onCancelPRD,
  onInsertPRD,
  onClearOutput,
}: PRDGeneratorProps) {
  const [productName, setProductName] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>(['']);
  const [showDocSelector, setShowDocSelector] = useState(false);
  const [docsOnlyMode, setDocsOnlyMode] = useState(false);
  const [savedFiles, setSavedFiles] = useState<Set<string>>(new Set());

  const handleGenerate = () => {
    // In docs-only mode, only need selected docs
    if (docsOnlyMode) {
      if (selectedDocPaths.length === 0) return;
      onGeneratePRD({
        productName: '',
        problemStatement: '',
        targetAudience: '',
        keyCapabilities: [],
        contextDocs: selectedDocPaths,
        docsOnly: true,
      });
      return;
    }

    // Normal mode - require form fields
    const filteredCapabilities = capabilities.filter((cap) => cap.trim() !== '');
    if (!productName.trim() || !problemStatement.trim() || filteredCapabilities.length === 0) return;

    onGeneratePRD({
      productName: productName.trim(),
      problemStatement: problemStatement.trim(),
      targetAudience: targetAudience.trim(),
      keyCapabilities: filteredCapabilities,
      contextDocs: selectedDocPaths.length > 0 ? selectedDocPaths : undefined,
    });
  };

  const handleToggleDocSelect = (path: string) => {
    if (selectedDocPaths.includes(path)) {
      onDocSelectionChange(selectedDocPaths.filter((p) => p !== path));
    } else {
      onDocSelectionChange([...selectedDocPaths, path]);
    }
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
      setSavedFiles(new Set()); // Clear previous saved status
      onInsertPRD(prdComplete.prd, prdComplete.audience);
      // Note: We'll update savedFiles when we receive config:saved messages
      // For now, show optimistic feedback
      setTimeout(() => {
        setSavedFiles(new Set(['PRD.md', 'AUDIENCE_JTBD.md']));
        setTimeout(() => setSavedFiles(new Set()), 3000); // Clear after 3 seconds
      }, 500);
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
  const isValid = docsOnlyMode
    ? selectedDocPaths.length > 0
    : productName.trim() && problemStatement.trim() && capabilities.some((cap) => cap.trim());

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
          {/* Context Documents Section */}
          {discoveredDocs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Context Documents
                  {selectedDocPaths.length > 0 && (
                    <Badge variant="secondary">{selectedDocPaths.length} selected</Badge>
                  )}
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDocSelector(!showDocSelector)}
                  disabled={isGenerating}
                >
                  {showDocSelector ? 'Hide' : 'Show'} ({discoveredDocs.length} files)
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Select existing documentation to provide context for PRD generation.
              </p>
              {showDocSelector && (
                <DocumentationSelector
                  docs={discoveredDocs}
                  selectedPaths={selectedDocPaths}
                  onSelectionChange={onDocSelectionChange}
                  onPreviewDoc={onPreviewDoc}
                />
              )}
              {/* Docs-only mode toggle */}
              {selectedDocPaths.length > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-dashed p-3 bg-muted/30">
                  <Checkbox
                    id="docsOnlyMode"
                    checked={docsOnlyMode}
                    onCheckedChange={(checked) => setDocsOnlyMode(checked === true)}
                    disabled={isGenerating}
                  />
                  <div className="space-y-1">
                    <label
                      htmlFor="docsOnlyMode"
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate PRD from documents only
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Skip manual form fields - let Claude analyze the selected documents to extract product details.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form fields - hidden in docs-only mode */}
          {!docsOnlyMode && (
            <>
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
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {!isGenerating ? (
              <Button
                onClick={handleGenerate}
                disabled={!isValid}
                className="gap-2"
              >
                {docsOnlyMode ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {docsOnlyMode ? 'Generate from Docs' : 'Generate PRD'}
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
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {prdError}
                </pre>
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
                  <div className="space-y-2">
                    {isGenerating && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          {prdOutput.length > 0
                            ? `Receiving output... (${prdOutput.length} characters)`
                            : 'Waiting for Claude to start generating...'}
                        </span>
                      </div>
                    )}
                    <ScrollArea className="h-[400px] rounded-lg border bg-muted/30">
                      <pre className="whitespace-pre-wrap p-4 font-mono text-sm">
                        {prdOutput || (isGenerating ? 'Starting generation...' : 'No output yet')}
                      </pre>
                    </ScrollArea>
                  </div>
                )}

                {/* Action Buttons */}
                {!isGenerating && prdComplete && (
                  <div className="space-y-3">
                    {savedFiles.size > 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>
                          Files saved: {Array.from(savedFiles).join(', ')}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={handleInsert} className="gap-2" disabled={savedFiles.size > 0}>
                        <FileDown className="h-4 w-4" />
                        {savedFiles.size > 0 ? 'Files Saved!' : 'Insert Both Files'}
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

      {/* Document Preview Modal */}
      <DocumentPreview
        doc={previewDoc}
        isLoading={isLoadingPreview}
        isOpen={previewDoc !== null || isLoadingPreview}
        isSelected={previewDoc ? selectedDocPaths.includes(previewDoc.path) : false}
        onClose={onClosePreview}
        onToggleSelect={handleToggleDocSelect}
      />
    </div>
  );
}
