import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TIMEOUT_MS = 15_000;

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCli(args: string): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execAsync(`openclaw ${args}`, {
      timeout: TIMEOUT_MS,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout?.trim() || '',
      stderr: err.stderr?.trim() || err.message,
      exitCode: err.code ?? 1,
    };
  }
}

export async function getGatewayStatus(): Promise<CliResult> {
  return runCli('gateway status');
}

export async function getChannelsStatus(): Promise<CliResult> {
  return runCli('channels status --probe');
}

export async function listAgentsCli(): Promise<CliResult> {
  return runCli('agents list');
}

export async function restartGateway(): Promise<CliResult> {
  return runCli('gateway restart');
}

export async function getLogsFromCli(lines = 200): Promise<CliResult> {
  return runCli(`logs --lines ${lines}`);
}

export async function regenerateCatalog(): Promise<CliResult> {
  return runCli('catalog generate');
}
