#!/usr/bin/env node
/** Install the pinned Stockfish JS runtime locally without adding it to the browser build. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join, resolve} from 'node:path';

const version = '18.0.8';
const packageName = `stockfish@${version}`;
const runtimeStem = 'stockfish-18-lite-single';
const npmIntegrity = 'sha512-z+f2UMPXLylDBGjv9e9zU8QulY7hUl8MYHesLRrdddewlOXjJrUSmtNmbtID1/F72EPhq0CCkCNxgWS5MQVWtQ==';
const root = resolve(import.meta.dirname, '..');
const engineRoot = join(root, '.chesslab', 'engine');
const target = join(engineRoot, `stockfish-${version}-lite-single`);
const entry = join(target, `${runtimeStem}.cjs`);
const wasm = join(target, `${runtimeStem}.wasm`);

if (existsSync(entry) && existsSync(wasm)) {
  console.log(`Stockfish runtime ready: ${entry}`);
  process.exit(0);
}

const temp = mkdtempSync(join(tmpdir(), 'chesslab-stockfish-'));
const staging = join(temp, 'runtime');
const sourceEntry = join(staging, `${runtimeStem}.js`);
mkdirSync(staging);
try {
  execFileSync('npm', ['pack', packageName, '--pack-destination', temp], {cwd: root, stdio: 'inherit'});
  const tarball = join(temp, `stockfish-${version}.tgz`);
  const digest = `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`;
  if (digest !== npmIntegrity) throw new Error(`Stockfish tarball integrity mismatch: expected ${npmIntegrity}, got ${digest}.`);
  execFileSync('tar', ['-xzf', tarball, '-C', staging, '--strip-components=2',
    `package/bin/${runtimeStem}.js`, `package/bin/${runtimeStem}.wasm`]);
  renameSync(sourceEntry, join(staging, `${runtimeStem}.cjs`));
  writeFileSync(join(staging, 'COPYING.txt'), execFileSync('tar', ['-xOf', tarball, 'package/Copying.txt']));
  if (!existsSync(join(staging, basename(entry))) || !existsSync(join(staging, basename(wasm)))) throw new Error('Stockfish runtime archive did not contain the expected Lite Single files.');
  mkdirSync(engineRoot, {recursive: true});
  if (existsSync(target)) rmSync(target, {recursive: true, force: true});
  renameSync(staging, target);
  console.log(`Installed Stockfish ${version} Lite Single runtime: ${entry}`);
} finally {
  rmSync(temp, {recursive: true, force: true});
}
