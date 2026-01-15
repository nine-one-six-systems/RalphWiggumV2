import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { FileWatcher } from './fileWatcher.js';
import { LoopController } from './loopController.js';
import { ProjectConfigManager } from './projectConfig.js';
import { PlanGenerator } from './planGenerator.js';
import { PRDGenerator } from './prdGenerator.js';
import { ProjectScanner } from './projectScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

// Get project path from environment or use parent directory
const PROJECT_PATH = process.env.PROJECT_PATH || path.resolve(__dirname, '../..');

// Initialize services
const projectConfig = new ProjectConfigManager(PROJECT_PATH);
const fileWatcher = new FileWatcher(PROJECT_PATH);
const loopController = new LoopController(PROJECT_PATH);
const planGenerator = new PlanGenerator(PROJECT_PATH);
const prdGenerator = new PRDGenerator(PROJECT_PATH);
const projectScanner = new ProjectScanner(PROJECT_PATH);

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
          break;
        case 'agents:toggle':
          await projectConfig.toggleAgent(message.payload.agentId, message.payload.enabled);
          const enabledAgents = projectConfig.getEnabledAgents();
          broadcast({ type: 'agents:update', payload: { enabledAgents } });
          break;
        case 'plan:generate':
          planGenerator.generatePlan(message.payload);
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
  console.log(`Project path: ${PROJECT_PATH}`);
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('Shutting down...');
  fileWatcher.stop();
  loopController.stop();
  server.close();
  process.exit(0);
});
