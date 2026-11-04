import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const COMPOSE_FILE = 'docker-compose.test.yml';
const SSH_PORT = '52222';
const isWindows = process.platform === 'win32';

function run(command, args, env = process.env) {
  return spawnSync(command, args, { stdio: 'inherit', env, shell: isWindows }).status ?? 1;
}

function runTool(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.error?.message ?? result.stderr}`);
  }
  return result.stdout;
}

const workDir = mkdtempSync(join(tmpdir(), 'datadock-it-'));
const keyPath = join(workDir, 'id_ed25519');
const caPath = join(workDir, 'ca.crt');
const knownHostsPath = join(workDir, 'known_hosts');

runTool('ssh-keygen', ['-t', 'ed25519', '-N', '', '-q', '-f', keyPath]);

const composeEnv = { ...process.env, DATADOCK_TEST_SSH_PUBLIC_KEY: readFileSync(`${keyPath}.pub`, 'utf8').trim() };
const compose = (...args) => run('docker', ['compose', '-f', COMPOSE_FILE, ...args], composeEnv);
const cleanUp = () => {
  if (!process.argv.includes('--keep')) {
    compose('down', '-v');
    rmSync(workDir, { recursive: true, force: true });
  }
};

const startStatus = compose('up', '-d', '--wait');
if (startStatus !== 0) {
  cleanUp();
  process.exit(startStatus);
}

let testStatus = 1;
try {
  if (compose('cp', 'postgres-tls:/certs/server.crt', caPath) !== 0) {
    throw new Error('Could not copy the test certificate');
  }
  writeFileSync(knownHostsPath, runTool('ssh-keyscan', ['-p', SSH_PORT, '127.0.0.1']));

  testStatus = run('npx', ['vitest', 'run', 'test/integration', '--no-file-parallelism'], {
    ...process.env,
    DATADOCK_TEST_POSTGRES_PORT: '55432',
    DATADOCK_TEST_MYSQL_PORT: '53306',
    DATADOCK_TEST_MARIADB_PORT: '53307',
    DATADOCK_TEST_POSTGRES_TLS_PORT: '55433',
    DATADOCK_TEST_TLS_CA: caPath,
    DATADOCK_TEST_SSH_PORT: SSH_PORT,
    DATADOCK_TEST_SSH_KEY: keyPath,
    DATADOCK_TEST_SSH_KNOWN_HOSTS: knownHostsPath,
  });
} finally {
  cleanUp();
}
process.exit(testStatus);
