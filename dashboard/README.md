# Ralph Wiggum Dashboard

A comprehensive web dashboard for visualizing, configuring, and controlling the Ralph Wiggum autonomous development loop.

## Features

- **Real-time Loop Monitoring**: Live status, iteration count, task progress
- **Task Visualization**: See IMPLEMENTATION_PLAN.md tasks with completion progress
- **Log Streaming**: Real-time ralph.log viewer with search and filtering
- **Git Integration**: Recent commits, branch info, uncommitted changes
- **Context Health**: Visualize context utilization and "smart zone" status
- **Loop Control**: Start/stop loops, select modes, set iteration limits
- **Project Setup Wizard**: Guided configuration for AGENTS.md, specialist agents, cursor rules, and prompts

## Quick Start

```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev

# Or start separately:
npm run dev:client  # Frontend on port 5173
npm run dev:server  # Backend on port 3001
```

Then open http://localhost:5173 in your browser.

## Architecture

```
dashboard/
├── server/                    # Express + WebSocket backend
│   ├── index.ts              # Main server entry
│   ├── fileWatcher.ts        # Watch ralph.log, IMPLEMENTATION_PLAN.md
│   ├── loopController.ts     # Start/stop loop.sh processes
│   └── projectConfig.ts      # Read/write config files
└── src/
    ├── components/
    │   ├── Dashboard.tsx     # Main layout
    │   ├── LoopStatus.tsx    # Status panel
    │   ├── TaskList.tsx      # Task visualization
    │   ├── LogViewer.tsx     # Log streaming
    │   ├── ContextMeter.tsx  # Context health
    │   ├── GitHistory.tsx    # Git status
    │   ├── LoopControls.tsx  # Start/stop controls
    │   ├── ui/               # shadcn/ui components
    │   └── setup/            # Setup wizard
    ├── hooks/
    │   └── useWebSocket.ts   # WebSocket connection
    └── types/
        └── index.ts          # TypeScript types
```

## Configuration

The dashboard connects to your Ralph Wiggum project in the parent directory. It watches:

- `IMPLEMENTATION_PLAN.md` - Task list and progress
- `ralph.log` - Loop output
- `AGENTS.md`, `CLAUDE.md` - Configuration files
- `.cursor/rules/` - Cursor rules
- `specs/` - Specification files

## API Endpoints

### REST API (port 3001)

- `GET /api/status` - Current loop, tasks, git status
- `GET /api/config/:file` - Read config file
- `POST /api/config/:file` - Write config file
- `POST /api/loop/start` - Start loop
- `POST /api/loop/stop` - Stop loop

### WebSocket (ws://localhost:3001/ws)

Server events:
- `loop:status` - Loop state updates
- `loop:log` - Log entries
- `tasks:update` - Task list changes
- `git:update` - Git status changes
- `config:update` - Config file changes

Client commands:
- `loop:start` - Start loop with options
- `loop:stop` - Stop running loop
- `config:read` - Request file content
- `config:write` - Save file content

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, shadcn/ui, Radix UI
- **Backend**: Express, WebSocket (ws), chokidar, simple-git
- **Build**: Vite, tsx

## Scripts

```bash
npm run dev         # Start frontend + backend concurrently
npm run dev:client  # Start frontend only
npm run dev:server  # Start backend only
npm run build       # Build for production
npm run server      # Run server only (production)
```
