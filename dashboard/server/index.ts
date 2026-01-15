import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { FileWatcher } from './fileWatcher.js';
import { LoopController } from './loopController.js';
import { ProjectConfigManager } from './projectConfig.js';
import { PlanGenerator } from './planGenerator.js';
import { PRDGenerator } from './prdGenerator.js';
import { ProjectScanner } from './projectScanner.js';
import { detectProjectRoot, formatProjectInfo, type ProjectRootResult } from './projectRootDetector.js';
import { checkAllDependencies } from './dependencyChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect project root (async initialization)
const RALPH_DEFAULT_PATH = path.resolve(__dirname, '../..');

// Initialize project detection and return paths
async function initializeProjectPaths(): Promise<ProjectRootResult> {
  // Allow explicit override via environment
  if (process.env.PROJECT_PATH) {
    return {
      targetProjectPath: process.env.PROJECT_PATH,
      ralphPath: RALPH_DEFAULT_PATH,
      mode: 'embedded',
      detectionReason: 'Explicitly set via PROJECT_PATH environment variable',
    };
  }
  return detectProjectRoot(RALPH_DEFAULT_PATH);
}

// Start server after initialization
async function startServer() {
  const projectRoot = await initializeProjectPaths();
  const TARGET_PROJECT_PATH = projectRoot.targetProjectPath;
  const RALPH_PATH = projectRoot.ralphPath;

  console.log('\n' + formatProjectInfo(projectRoot) + '\n');

  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(cors());
  app.use(express.json());

  // Initialize services with appropriate paths
  const projectConfig = new ProjectConfigManager(TARGET_PROJECT_PATH, RALPH_PATH);
  const fileWatcher = new FileWatcher(TARGET_PROJECT_PATH);
  const loopController = new LoopController(TARGET_PROJECT_PATH, RALPH_PATH);
  const planGenerator = new PlanGenerator(TARGET_PROJECT_PATH, RALPH_PATH);
  const prdGenerator = new PRDGenerator(TARGET_PROJECT_PATH, RALPH_PATH);
  const projectScanner = new ProjectScanner(TARGET_PROJECT_PATH);

  // Track connected clients
  const clients = new Set<WebSocket>();

  // Broadcast to all connected clients
  function broadcast(message: object) {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected. Total clients:', clients.size);

    // Send initial state
    ws.send(JSON.stringify({ type: 'loop:status', payload: loopController.getStatus() }));
    ws.send(JSON.stringify({ type: 'tasks:update', payload: fileWatcher.getTasks() }));
    ws.send(JSON.stringify({ type: 'git:update', payload: fileWatcher.getGitStatus() }));
    ws.send(JSON.stringify({ type: 'config:update', payload: projectConfig.getConfig() }));
    ws.send(JSON.stringify({ type: 'project:info', payload: projectRoot }));

    // Handle messages from client
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'loop:start':
            loopController.start(message.payload);
            break;
          case 'loop:stop':
            loopController.stop();
            break;
          case 'config:read':
            const content = await projectConfig.readFile(message.payload.file);
            ws.send(JSON.stringify({ type: 'config:content', payload: { file: message.payload.file, content } }));
            break;
          case 'config:write':
            await projectConfig.writeFile(message.payload.file, message.payload.content);
            ws.send(JSON.stringify({ type: 'config:saved', payload: { file: message.payload.file } }));
            // Refresh config if PRD.md or AUDIENCE_JTBD.md was written
            if (message.payload.file === 'PRD.md' || message.payload.file === 'AUDIENCE_JTBD.md') {
              const updatedConfig = await projectConfig.refresh();
              broadcast({ type: 'config:update', payload: updatedConfig });
            }
            break;
          case 'config:refresh':
            try {
              const updatedConfig = await projectConfig.refresh();
              broadcast({ type: 'config:update', payload: updatedConfig });
              ws.send(JSON.stringify({ type: 'config:refreshed' }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'config:error', payload: { error: 'Failed to refresh config' } }));
            }
            break;
          case 'agents:toggle':
            await projectConfig.toggleAgent(message.payload.agentId, message.payload.enabled);
            const enabledAgents = projectConfig.getEnabledAgents();
            broadcast({ type: 'agents:update', payload: { enabledAgents } });
            break;
          case 'plan:generate':
            try {
              // Read PRD context if requested
              let prdContext = '';
              if (message.payload.usePrdContext) {
                try {
                  const prdContent = await projectConfig.readFile('PRD.md');
                  const audienceContent = await projectConfig.readFile('AUDIENCE_JTBD.md');
                  prdContext = `
## Context: PRD.md
${prdContent}

## Context: AUDIENCE_JTBD.md
${audienceContent}
`;
                } catch (err) {
                  console.warn('Could not read PRD files:', err);
                }
              }
              await planGenerator.generatePlan({ ...message.payload, prdContext });
            } catch (err) {
              console.error('Error generating plan:', err);
              ws.send(JSON.stringify({ 
                type: 'plan:error', 
                payload: { error: err instanceof Error ? err.message : 'Failed to start plan generation' } 
              }));
            }
            break;
          case 'plan:cancel':
            planGenerator.cancel();
            break;
          case 'prd:generate':
            prdGenerator.generatePRD(message.payload);
            break;
          case 'prd:cancel':
            prdGenerator.cancel();
            break;
          case 'project:scan':
            const scanResult = await projectScanner.scan();
            ws.send(JSON.stringify({ type: 'project:scan-result', payload: scanResult }));
            break;
          case 'project:info':
            ws.send(JSON.stringify({ type: 'project:info', payload: projectRoot }));
            break;
          case 'agents:list':
            const agents = await projectConfig.listAvailableAgents();
            ws.send(JSON.stringify({ type: 'agents:list-result', payload: agents }));
            break;
          case 'rules:list':
            const rules = await projectConfig.listCursorRulesDetailed();
            ws.send(JSON.stringify({ type: 'rules:list-result', payload: rules }));
            break;
          case 'rules:toggle':
            const updatedRules = await projectConfig.toggleCursorRule(message.payload.ruleId, message.payload.enabled);
            broadcast({ type: 'rules:update', payload: updatedRules });
            break;
          case 'docs:read':
            try {
              const docPath = message.payload.docPath;
              // Validate path to prevent directory traversal
              const normalizedPath = path.normalize(docPath);
              if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
                ws.send(JSON.stringify({ type: 'docs:error', payload: { error: 'Invalid path' } }));
                break;
              }
              const fullPath = path.join(TARGET_PROJECT_PATH, normalizedPath);
              const docContent = await fs.readFile(fullPath, 'utf-8');
              ws.send(JSON.stringify({ type: 'docs:content', payload: { path: docPath, content: docContent } }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'docs:error', payload: { error: 'Failed to read document' } }));
            }
            break;
          case 'claude:list':
            try {
              const claudeFiles = await projectConfig.listClaudeMdFiles();
              ws.send(JSON.stringify({ type: 'claude:list-result', payload: claudeFiles }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'claude:error', payload: { error: 'Failed to list CLAUDE.md files' } }));
            }
            break;
          case 'claude:read':
            try {
              const claudeContent = await projectConfig.readClaudeMdFile(message.payload.path);
              ws.send(JSON.stringify({ type: 'claude:content', payload: { path: message.payload.path, content: claudeContent } }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'claude:error', payload: { error: 'Failed to read CLAUDE.md' } }));
            }
            break;
          case 'claude:apply':
            try {
              await projectConfig.applyRalphClaudeMd();
              ws.send(JSON.stringify({ type: 'claude:applied' }));
              // Refresh and broadcast config update
              const updatedConfig = await projectConfig.refresh();
              broadcast({ type: 'config:update', payload: updatedConfig });
            } catch (err) {
              ws.send(JSON.stringify({ type: 'claude:error', payload: { error: 'Failed to apply CLAUDE.md' } }));
            }
            break;
          case 'dependencies:check':
            try {
              const depResults = await checkAllDependencies();
              ws.send(JSON.stringify({ type: 'dependencies:result', payload: depResults }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'dependencies:error', payload: { error: 'Failed to check dependencies' } }));
            }
            break;
        }
      } catch (err) {
        console.error('Error handling message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected. Total clients:', clients.size);
    });
  });

  // File watcher events
  fileWatcher.on('tasks', (tasks) => {
    broadcast({ type: 'tasks:update', payload: tasks });
  });

  fileWatcher.on('log', (entry) => {
    broadcast({ type: 'loop:log', payload: entry });
  });

  fileWatcher.on('git', (status) => {
    broadcast({ type: 'git:update', payload: status });
  });

  // File watcher config refresh events (when PRD.md or AUDIENCE_JTBD.md change)
  fileWatcher.on('config:refresh', async () => {
    try {
      const updatedConfig = await projectConfig.refresh();
      broadcast({ type: 'config:update', payload: updatedConfig });
    } catch (err) {
      console.error('Error refreshing config:', err);
    }
  });

  // Loop controller events
  loopController.on('status', (status) => {
    broadcast({ type: 'loop:status', payload: status });
  });

  loopController.on('log', (entry) => {
    broadcast({ type: 'loop:log', payload: entry });
  });

  // Plan generator events
  planGenerator.on('status', (status) => {
    broadcast({ type: 'plan:status', payload: status });
  });

  planGenerator.on('output', (text) => {
    broadcast({ type: 'plan:output', payload: { text } });
  });

  planGenerator.on('log', (text) => {
    broadcast({ type: 'plan:log', payload: { text } });
  });

  planGenerator.on('complete', (result) => {
    broadcast({ type: 'plan:complete', payload: result });
  });

  planGenerator.on('error', (error) => {
    broadcast({ type: 'plan:error', payload: { error } });
  });

  planGenerator.on('cancelled', () => {
    broadcast({ type: 'plan:error', payload: { error: 'Plan generation cancelled' } });
  });

  // PRD generator events
  prdGenerator.on('status', (status) => {
    broadcast({ type: 'prd:status', payload: status });
  });

  prdGenerator.on('output', (text) => {
    broadcast({ type: 'prd:output', payload: { text } });
  });

  prdGenerator.on('log', (text) => {
    broadcast({ type: 'prd:log', payload: { text } });
  });

  prdGenerator.on('complete', (result) => {
    broadcast({ type: 'prd:complete', payload: result });
  });

  prdGenerator.on('error', (error) => {
    broadcast({ type: 'prd:error', payload: { error } });
  });

  prdGenerator.on('cancelled', () => {
    broadcast({ type: 'prd:error', payload: { error: 'PRD generation cancelled' } });
  });

  // REST API endpoints
  app.get('/api/status', (req, res) => {
    res.json({
      loop: loopController.getStatus(),
      tasks: fileWatcher.getTasks(),
      git: fileWatcher.getGitStatus(),
      config: projectConfig.getConfig(),
    });
  });

  // New endpoint to get project info
  app.get('/api/project-info', (req, res) => {
    res.json(projectRoot);
  });

  app.get('/api/config/:file', async (req, res) => {
    try {
      const content = await projectConfig.readFile(req.params.file);
      res.json({ content });
    } catch (err) {
      res.status(404).json({ error: 'File not found' });
    }
  });

  app.post('/api/config/:file', async (req, res) => {
    try {
      await projectConfig.writeFile(req.params.file, req.body.content);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save file' });
    }
  });

  app.post('/api/loop/start', (req, res) => {
    loopController.start(req.body);
    res.json({ success: true });
  });

  app.post('/api/loop/stop', (req, res) => {
    loopController.stop();
    res.json({ success: true });
  });

  // Start file watchers
  fileWatcher.start();

  // Start server
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Ralph Dashboard server running on port ${PORT}`);
    console.log(`Target project: ${TARGET_PROJECT_PATH}`);
    if (projectRoot.mode === 'embedded') {
      console.log(`Ralph directory: ${RALPH_PATH}`);
    }
  });

  // Cleanup on exit
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    fileWatcher.stop();
    loopController.stop();
    server.close();
    process.exit(0);
  });
}

// Start the server
startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
