import { spawn } from 'node:child_process';
import { platform } from 'node:os';

function readOpenCommand(url: string): [string, string[]] {
  if (platform() === 'darwin') return ['open', [url]];
  if (platform() === 'win32') return ['cmd', ['/c', 'start', '', url]];
  return ['xdg-open', [url]];
}

export function openInSystemBrowser(url: string): Promise<boolean> {
  const [command, commandArguments] = readOpenCommand(url);
  return new Promise((resolve) => {
    const child = spawn(command, commandArguments, { detached: true, stdio: 'ignore' });
    child.once('error', () => resolve(false));
    child.once('spawn', () => {
      child.unref();
      resolve(true);
    });
  });
}
