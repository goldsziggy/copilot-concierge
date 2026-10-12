// Windows-only filesystem adapter. Schemas and knowledge rendering stay in
// learning.mjs; PowerShell performs complete native read/replace transactions.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const MAX_TRANSPORT = 800000;
const nativeScript = fileURLToPath(new URL('./learning-windows.ps1', import.meta.url));
const bad = message => { throw new Error(message); };

// Syntactic rejection is followed by native handle/volume/ACL verification.
export function windowsPath(value) {
  if (typeof value !== 'string' || !value.isWellFormed() || !/^[A-Z]:\\/.test(value) || /[\x00-\x1f<>"|?*]/.test(value) || value.includes('/')) bad('Windows learning requires a canonical local drive path with an uppercase drive letter.');
  const parts = value.slice(3).split('\\');
  if (parts.at(-1) === '') parts.pop();
  if (parts.some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part) || part.includes(':') || part.includes('~') || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) bad('Unsupported Windows path component or alias.');
  return value.length === 3 ? value : value.replace(/\\$/, '');
}
export function powershellExecutable(systemRoot) {
  return path.win32.join(windowsPath(systemRoot), 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}
export async function invokeWindows(request) {
  if (process.platform !== 'win32') bad('Native Windows learning requires an actual Windows host; no simulated filesystem fallback is used.');
  const encoded = Buffer.from(JSON.stringify(request));
  if (encoded.length > MAX_TRANSPORT) bad('Windows learning request exceeds its transport limit.');
  const executable = powershellExecutable(process.env.SystemRoot);
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', nativeScript], {
      windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], shell: false,
    });
    const chunks = [];
    let count = 0, stderrCount = 0, settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('Windows learning timed out; a write may have completed. Re-read state before retrying.'));
    }, 30000);
    child.on('error', () => finish(new Error('Windows PowerShell 5.1 is unavailable or could not start.')));
    child.stdout.on('data', chunk => {
      count += chunk.length;
      if (count > MAX_TRANSPORT) { child.kill(); finish(new Error('Windows learning returned oversized output; re-read state before retrying.')); }
      else chunks.push(chunk);
    });
    // Never forward PowerShell diagnostics: they may contain input fragments.
    child.stderr.on('data', chunk => { stderrCount += chunk.length; if (stderrCount > MAX_TRANSPORT) child.kill(); });
    child.stdin.on('error', () => {});
    child.on('close', code => {
      if (settled) return;
      let response;
      try { response = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
      catch { return finish(new Error('Windows learning returned no valid result; host policy or native validation may have blocked it. Re-read state before retrying a write.')); }
      if (code !== 0 || response?.ok !== true) {
        const message = typeof response?.error === 'string' && response.error.length <= 400 ? response.error : 'Windows learning could not verify a safe operation.';
        return finish(new Error(message));
      }
      finish(null, response.result);
    });
    child.stdin.end(encoded);
  });
}

// invoke injection is only a module-level fixture seam. CLI callers cannot
// select a transport, redirect the profile, or bypass native validation.
export function createWindowsStorage({ invoke = invokeWindows } = {}) {
  const call = async request => invoke(request);
  return {
    async home() {
      const result = await call({ op: 'context' });
      return windowsPath(result.home);
    },
    async project(root) {
      const result = await call({ op: 'project', root: windowsPath(root) });
      return windowsPath(result.root);
    },
    async memory(root, file) {
      await call({ op: 'memory', root: windowsPath(root), file: windowsPath(file) });
    },
    async source(root, file) {
      await call({ op: 'source', root: windowsPath(root), file: windowsPath(file) });
    },
    async read(root, file, limit, privateFile = false) {
      const result = await call({ op: 'read', root: windowsPath(root), file: windowsPath(file), limit, privateFile });
      if (result.bytes !== null && (typeof result.bytes !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(result.bytes))) bad('Windows learning returned invalid content encoding.');
      const bytes = result.bytes === null ? null : Buffer.from(result.bytes, 'base64');
      if (bytes && bytes.length > limit) bad('Windows learning returned content over the allowed limit.');
      return { ...result, bytes };
    },
    async write(root, file, original, bytes, limit, privateFile) {
      if (bytes.length > limit) bad('Windows learning write exceeds the allowed limit.');
      await call({
        op: 'write', root: windowsPath(root), file: windowsPath(file), limit, privateFile,
        original: { identity: original.identity, parents: original.parents, acl: original.acl, revision: original.revision },
        bytes: bytes.toString('base64'),
      });
    },
  };
}
