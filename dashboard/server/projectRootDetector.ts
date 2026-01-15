import fs from 'fs/promises';
import path from 'path';

export interface ProjectRootResult {
  targetProjectPath: string;       // Parent project to analyze
  ralphPath: string;               // RalphWiggumV2's directory
  mode: 'embedded' | 'standalone';
  detectionReason: string;
}

// Project markers in priority order
const PROJECT_MARKERS = [
  '.git',           // Git repository root (highest priority)
  'package.json',   // Node.js projects
  'go.mod',         // Go projects
  'pyproject.toml', // Python projects (modern)
  'requirements.txt', // Python projects (legacy)
  'Cargo.toml',     // Rust projects
  'pom.xml',        // Java Maven projects
  'build.gradle',   // Java Gradle projects
  'composer.json',  // PHP projects
  'Gemfile',        // Ruby projects
  'mix.exs',        // Elixir projects
  'CMakeLists.txt', // C/C++ projects
  'Makefile',       // General build systems
];

/**
 * Check if a directory contains any project markers
 */
async function hasProjectMarkers(dirPath: string): Promise<string | null> {
  for (const marker of PROJECT_MARKERS) {
    try {
      const markerPath = path.join(dirPath, marker);
      await fs.access(markerPath);
      return marker;
    } catch {
      // Marker not found, continue checking
    }
  }
  return null;
}

/**
 * Check if a path is named RalphWiggumV2 (case-insensitive)
 */
function isRalphDirectory(dirPath: string): boolean {
  const dirName = path.basename(dirPath).toLowerCase();
  return dirName === 'ralphwiggumv2' || dirName === 'ralph-wiggum-v2' || dirName === 'ralph_wiggum_v2';
}

/**
 * Detect the project root for RalphWiggumV2 to analyze.
 *
 * When Ralph is cloned into a project directory (e.g., my-app/RalphWiggumV2/),
 * this function detects that and returns the parent project path.
 *
 * Detection algorithm:
 * 1. Check if current directory is named "RalphWiggumV2" (or similar)
 * 2. If yes, check parent directory for project markers (.git, package.json, go.mod, etc.)
 * 3. Return parent as target if markers found, otherwise return standalone mode
 */
export async function detectProjectRoot(startPath: string): Promise<ProjectRootResult> {
  const normalizedPath = path.normalize(startPath);
  const ralphPath = normalizedPath;

  // Check if we're in a Ralph directory
  if (!isRalphDirectory(normalizedPath)) {
    return {
      targetProjectPath: normalizedPath,
      ralphPath: normalizedPath,
      mode: 'standalone',
      detectionReason: 'Directory is not named RalphWiggumV2 - running in standalone mode',
    };
  }

  // Get parent directory
  const parentPath = path.dirname(normalizedPath);

  // Don't go above filesystem root
  if (parentPath === normalizedPath) {
    return {
      targetProjectPath: normalizedPath,
      ralphPath: normalizedPath,
      mode: 'standalone',
      detectionReason: 'Already at filesystem root - running in standalone mode',
    };
  }

  // Check parent for project markers
  const marker = await hasProjectMarkers(parentPath);

  if (marker) {
    return {
      targetProjectPath: parentPath,
      ralphPath: ralphPath,
      mode: 'embedded',
      detectionReason: `Found ${marker} in parent directory - targeting parent project`,
    };
  }

  // No markers in immediate parent, walk up to find .git (repo root)
  let currentPath = parentPath;
  let walkCount = 0;
  const maxWalkUp = 5; // Don't walk up more than 5 levels

  while (walkCount < maxWalkUp) {
    const grandParent = path.dirname(currentPath);

    // Don't go above filesystem root
    if (grandParent === currentPath) {
      break;
    }

    // Check for .git specifically (repo root indicator)
    try {
      await fs.access(path.join(grandParent, '.git'));
      return {
        targetProjectPath: grandParent,
        ralphPath: ralphPath,
        mode: 'embedded',
        detectionReason: `Found .git in ancestor directory (${walkCount + 1} levels up) - targeting repository root`,
      };
    } catch {
      // No .git, continue walking up
    }

    currentPath = grandParent;
    walkCount++;
  }

  // No project markers found anywhere - use parent anyway if it exists and is readable
  try {
    await fs.access(parentPath);
    const parentStats = await fs.stat(parentPath);
    if (parentStats.isDirectory()) {
      return {
        targetProjectPath: parentPath,
        ralphPath: ralphPath,
        mode: 'embedded',
        detectionReason: 'No project markers found, but using parent directory as target',
      };
    }
  } catch {
    // Can't access parent, fall back to standalone
  }

  return {
    targetProjectPath: normalizedPath,
    ralphPath: normalizedPath,
    mode: 'standalone',
    detectionReason: 'Could not access parent directory - running in standalone mode',
  };
}

/**
 * Get project info for display purposes
 */
export function formatProjectInfo(result: ProjectRootResult): string {
  const lines = [
    `Mode: ${result.mode}`,
    `Target project: ${result.targetProjectPath}`,
  ];

  if (result.mode === 'embedded') {
    lines.push(`Ralph directory: ${result.ralphPath}`);
  }

  lines.push(`Detection: ${result.detectionReason}`);

  return lines.join('\n');
}
