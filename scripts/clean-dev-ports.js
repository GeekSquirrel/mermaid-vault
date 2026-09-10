#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const envDevPath = path.join(rootDir, '.env.dev');

// Parse .env file without external dependencies
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = { ...parseEnv(envPath), ...parseEnv(envDevPath) };

const devPortKeys = [
  { key: 'FRONTEND_PORT', defaultVal: 8081, desc: 'Frontend dev server' },
  { key: 'BACKEND_PORT', defaultVal: 8080, desc: 'Backend dev server' },
  { key: 'DEBUG_PORT', defaultVal: 9229, desc: 'Node.js inspector' },
];

const portsToClean = new Map();

for (const { key, defaultVal, desc } of devPortKeys) {
  const raw = env[key] || process.env[key] || String(defaultVal);
  const port = parseInt(raw, 10);
  if (!Number.isNaN(port) && port > 0 && port < 65536) {
    if (!portsToClean.has(port)) {
      portsToClean.set(port, []);
    }
    portsToClean.get(port).push(`${key} (${desc})`);
  }
}

console.log(
  `[clean-dev-port] Checking development ports: ${Array.from(portsToClean.keys()).join(', ')}...`
);

let killedCount = 0;

for (const [port, labels] of portsToClean.entries()) {
  const labelStr = labels.join(', ');
  const pids = new Set();

  // Try lsof first
  try {
    const output = execSync(`lsof -ti:${port}`, {
      stdio: ['pipe', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
    if (output) {
      output
        .split(/\s+/)
        .filter(Boolean)
        .forEach((pid) => pids.add(pid));
    }
  } catch {
    // Port not in use or lsof exited non-zero
  }

  // Fallback: try fuser if nothing found yet
  if (pids.size === 0) {
    try {
      const output = execSync(`fuser ${port}/tcp 2>/dev/null`, {
        stdio: ['pipe', 'pipe', 'ignore'],
        encoding: 'utf8',
      }).trim();
      if (output) {
        output
          .split(/\s+/)
          .filter(Boolean)
          .forEach((pid) => pids.add(pid));
      }
    } catch {
      // Port not in use
    }
  }

  // Also check if any Docker container is publishing this port
  try {
    const dockerOutput = execSync(
      `docker ps --filter "publish=${port}" --format "{{.ID}} {{.Names}}"`,
      { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' }
    ).trim();
    if (dockerOutput) {
      for (const line of dockerOutput.split('\n')) {
        const [cId, cName] = line.trim().split(/\s+/);
        if (cId) {
          console.log(
            `[clean-dev-port] Port ${port} [${labelStr}] is in use by Docker container: ${cName} (${cId})`
          );
          try {
            execSync(`docker stop ${cId}`, { stdio: 'ignore' });
            console.log(`[clean-dev-port] -> Stopped Docker container ${cName}`);
            killedCount++;
          } catch (err) {
            console.warn(`[clean-dev-port] -> Could not stop container ${cName}:`, err.message);
          }
        }
      }
    }
  } catch {
    // docker not available or command failed
  }

  if (pids.size > 0) {
    console.log(
      `[clean-dev-port] Port ${port} [${labelStr}] is in use by PID(s): ${Array.from(pids).join(', ')}`
    );
    for (const pid of pids) {
      try {
        process.kill(Number(pid), 'SIGKILL');
        console.log(`[clean-dev-port] -> Killed PID ${pid}`);
        killedCount++;
      } catch {
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
          console.log(`[clean-dev-port] -> Killed PID ${pid} via kill -9`);
          killedCount++;
        } catch (err) {
          console.warn(`[clean-dev-port] -> Could not kill PID ${pid}:`, err.message);
        }
      }
    }
  } else if (!killedCount) {
    console.log(`[clean-dev-port] Port ${port} [${labelStr}] is free.`);
  }
}

if (killedCount > 0) {
  console.log(`[clean-dev-port] Successfully cleared ${killedCount} target(s).`);
} else {
  console.log(`[clean-dev-port] All development ports are already free.`);
}
