import { spawn } from 'child_process';
import os from 'os';

export interface DependencyCheckResult {
  id: string;
  name: string;
  available: boolean;
  version?: string;
  path?: string;
  error?: string;
}

interface DependencyDef {
  id: string;
  name: string;
  command: string;
  versionFlag: string;
  description: string;
}

const DEPENDENCIES: DependencyDef[] = [
  {
    id: 'claude',
    name: 'Claude CLI',
    command: 'claude',
    versionFlag: '--version',
    description: 'Required for PRD and Plan generation',
  },
  {
    id: 'node',
    name: 'Node.js',
    command: 'node',
    versionFlag: '--version',
    description: 'JavaScript runtime',
  },
  {
    id: 'npm',
    name: 'npm',
    command: 'npm',
    versionFlag: '--version',
    description: 'Node package manager',
  },
  {
    id: 'git',
    name: 'Git',
    command: 'git',
    versionFlag: '--version',
    description: 'Version control',
  },
];

/**
 * Check if a single dependency is available in PATH and get its version
 */
export async function checkDependency(dep: DependencyDef): Promise<DependencyCheckResult> {
  const isWindows = os.platform() === 'win32';
  const whichCmd = isWindows ? 'where' : 'which';

  return new Promise((resolve) => {
    // First check if command exists in PATH
    const whereProc = spawn(whichCmd, [dep.command], { shell: true });
    let pathOutput = '';
    let errorOutput = '';

    whereProc.stdout.on('data', (data) => {
      pathOutput += data.toString();
    });

    whereProc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    whereProc.on('close', (code) => {
      if (code !== 0) {
        resolve({
          id: dep.id,
          name: dep.name,
          available: false,
          error: 'Not found in PATH',
        });
        return;
      }

      // Get version
      const versionProc = spawn(dep.command, [dep.versionFlag], { shell: true });
      let versionOutput = '';

      versionProc.stdout.on('data', (data) => {
        versionOutput += data.toString();
      });

      versionProc.stderr.on('data', (data) => {
        // Some tools output version to stderr (like git)
        versionOutput += data.toString();
      });

      versionProc.on('close', () => {
        // Clean up version string - take first line and trim
        const version = versionOutput.trim().split('\n')[0];
        const execPath = pathOutput.trim().split('\n')[0];

        resolve({
          id: dep.id,
          name: dep.name,
          available: true,
          version: version,
          path: execPath,
        });
      });

      // Handle spawn error
      versionProc.on('error', () => {
        resolve({
          id: dep.id,
          name: dep.name,
          available: true, // Path exists but version check failed
          path: pathOutput.trim().split('\n')[0],
          error: 'Could not get version',
        });
      });
    });

    // Handle spawn error for where/which
    whereProc.on('error', (err) => {
      resolve({
        id: dep.id,
        name: dep.name,
        available: false,
        error: `Check failed: ${err.message}`,
      });
    });
  });
}

/**
 * Check all dependencies in parallel
 */
export async function checkAllDependencies(): Promise<DependencyCheckResult[]> {
  return Promise.all(DEPENDENCIES.map(checkDependency));
}

/**
 * Get the list of dependency definitions (for UI)
 */
export function getDependencyList(): DependencyDef[] {
  return [...DEPENDENCIES];
}
