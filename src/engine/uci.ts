/**
 * Node-only bounded UCI adapter. This file must not be imported from the browser
 * entrypoint; its public result shape lives in ./types.ts and is browser-safe.
 */
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { EngineCompletedAnalysis, EngineIdentity, EngineScore, EngineSettings, EngineVariation, EngineWdl } from './types.ts';

export type AnalyzeOptions = Readonly<{
  enginePath?: string;
  engineArgs?: readonly string[];
  requestId?: string;
  /** Default 800ms; capped so callers cannot create an unbounded engine job. */
  movetimeMs?: number;
  /** Uses `go nodes N` when present, with the wall-clock timeout still enforced. */
  nodes?: number;
  multiPv?: number;
  /** Stockfish UCI Skill Level from 0 (weakest) through 20 (strongest). Defaults to 20. */
  skillLevel?: number;
  threads?: number;
  hashMb?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}>;

const DEFAULT_MOVETIME_MS = 800;
const MAX_MOVETIME_MS = 10_000;
const MAX_NODES = 5_000_000;
const MAX_TIMEOUT_MS = 15_000;
const MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

const cachedStockfishLauncher = fileURLToPath(new URL('../../.chesslab/engine/stockfish-18.0.8-lite-single/stockfish-18-lite-single.cjs', import.meta.url));

/** Resolves a native STOCKFISH_PATH first, then the reproducibly installed Lite runtime. */
export function defaultEngineCommand(): Readonly<{ command: string; args: readonly string[] }> {
  if (process.env.STOCKFISH_PATH) return { command: process.env.STOCKFISH_PATH, args: [] };
  if (existsSync(cachedStockfishLauncher)) return { command: process.execPath, args: [cachedStockfishLauncher] };
  return { command: 'stockfish', args: [] };
}

function integer(value: number | undefined, fallback: number, name: string, min: number, max: number): number {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result < min || result > max) throw new RangeError(`${name} must be an integer from ${min} to ${max}.`);
  return result;
}

function assertFen(fen: string): void {
  if (typeof fen !== 'string' || /[\r\n]/.test(fen) || fen.trim().split(/\s+/).length !== 6) {
    throw new Error('fen must be a single six-field FEN.');
  }
}

function normalizedMoves(fen: string, moves: readonly string[]): string[] {
  const chess = new Chess(fen.trim());
  const result: string[] = [];
  for (const move of moves) {
    if (!MOVE.test(move)) throw new Error(`Invalid UCI move: ${move}`);
    const applied = chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
    if (!applied) throw new Error(`Illegal UCI move for supplied FEN/history: ${move}`);
    result.push(move);
  }
  return result;
}

function parseNumber(line: string, name: string): number | null {
  const match = new RegExp(`\\b${name} (-?\\d+)\\b`).exec(line);
  return match ? Number(match[1]) : null;
}

export function parseInfoLine(line: string): EngineVariation | null {
  if (!line.startsWith('info ')) return null;
  const pvMarker = /\bpv\s+(.+)$/.exec(line);
  const scoreMatch = /\bscore\s+(cp|mate)\s+(-?\d+)\b/.exec(line);
  const wdlMatch = /\bwdl\s+(\d+)\s+(\d+)\s+(\d+)\b/.exec(line);
  const multipv = parseNumber(line, 'multipv') ?? 1;
  // Ignore non-principal status lines; they cannot materially update a variation.
  if (!pvMarker && !scoreMatch) return null;
  const bound: EngineScore['bound'] = /\blowerbound\b/.test(line) ? 'lower' : /\bupperbound\b/.test(line) ? 'upper' : 'exact';
  const score: EngineScore | null = scoreMatch ? { kind: scoreMatch[1] as EngineScore['kind'], value: Number(scoreMatch[2]), bound } : null;
  const wdl: EngineWdl | null = wdlMatch ? { win: Number(wdlMatch[1]), draw: Number(wdlMatch[2]), loss: Number(wdlMatch[3]) } : null;
  return {
    multipv,
    depth: parseNumber(line, 'depth'),
    seldepth: parseNumber(line, 'seldepth'),
    score,
    wdl,
    nodes: parseNumber(line, 'nodes'),
    nps: parseNumber(line, 'nps'),
    pv: pvMarker ? pvMarker[1].trim().split(/\s+/).filter(Boolean) : []
  };
}

function mergeVariation(previous: EngineVariation | undefined, next: EngineVariation): EngineVariation {
  return {
    multipv: next.multipv,
    depth: next.depth ?? previous?.depth ?? null,
    seldepth: next.seldepth ?? previous?.seldepth ?? null,
    score: next.score ?? previous?.score ?? null,
    wdl: next.wdl ?? previous?.wdl ?? null,
    nodes: next.nodes ?? previous?.nodes ?? null,
    nps: next.nps ?? previous?.nps ?? null,
    pv: next.pv.length ? next.pv : previous?.pv ?? []
  };
}

function onceKill(child: ChildProcessWithoutNullStreams): void {
  if (child.exitCode !== null || child.killed) return;
  child.kill('SIGTERM');
  const force = setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 150);
  force.unref();
}

/** Starts one fresh engine process and guarantees it is terminated when this request settles. */
export async function analyze(fen: string, moves: readonly string[] = [], options: AnalyzeOptions = {}): Promise<EngineCompletedAnalysis> {
  assertFen(fen);
  let legalMoves: string[];
  try { legalMoves = normalizedMoves(fen, moves); } catch (error) {
    throw new Error('fen or moves do not describe a legal chess position/history.', { cause: error });
  }
  const movetimeMs = integer(options.movetimeMs, DEFAULT_MOVETIME_MS, 'movetimeMs', 1, MAX_MOVETIME_MS);
  const nodes = options.nodes === undefined ? null : integer(options.nodes, 1, 'nodes', 1, MAX_NODES);
  const multiPv = integer(options.multiPv, 1, 'multiPv', 1, 8);
  const skillLevel = integer(options.skillLevel, 20, 'skillLevel', 0, 20);
  const threads = integer(options.threads, 1, 'threads', 1, 4);
  const hashMb = integer(options.hashMb, 32, 'hashMb', 1, 256);
  const timeoutMs = integer(options.timeoutMs, Math.min(MAX_TIMEOUT_MS, movetimeMs + 2_000), 'timeoutMs', 50, MAX_TIMEOUT_MS);
  const defaultCommand = defaultEngineCommand();
  const enginePath = options.enginePath ?? defaultCommand.command;
  const engineArgs = options.engineArgs ?? (options.enginePath ? [] : defaultCommand.args);
  const settings: EngineSettings = { threads, hashMb, multiPv, skillLevel, limit: nodes === null ? { kind: 'movetime', value: movetimeMs } : { kind: 'nodes', value: nodes }, timeoutMs };
  const requestId = options.requestId ?? randomUUID();
  const positionCommand = `position fen ${fen.trim()}${legalMoves.length ? ` moves ${legalMoves.join(' ')}` : ''}`;
  const startedAtMs = Date.now();

  return await new Promise<EngineCompletedAnalysis>((resolve, reject) => {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(enginePath, [...engineArgs], { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
      reject(new Error(`Unable to start UCI engine '${enginePath}'.`, { cause: error }));
      return;
    }
    let settled = false;
    let phase: 'uci' | 'ready-config' | 'ready-game' | 'searching' = 'uci';
    let identity: EngineIdentity = { command: enginePath, arguments: engineArgs, name: null, author: null, protocol: 'uci' };
    const variations = new Map<number, EngineVariation>();
    const finish = (error?: Error, result?: Omit<EngineCompletedAnalysis, 'schema' | 'requestId' | 'position' | 'settings' | 'engine' | 'startedAtMs'>): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abort);
      child.stdout.removeListener('data', stdout);
      child.stderr.removeListener('data', stderr);
      child.removeListener('error', childError);
      child.removeListener('exit', childExit);
      onceKill(child);
      if (error) { reject(error); return; }
      const completedAtMs = result?.completedAtMs ?? Date.now();
      resolve({ schema: 'chesslab-engine-analysis@1', requestId, position: { fen: fen.trim(), moves: legalMoves, command: positionCommand }, settings, engine: identity,
        bestmove: result?.bestmove ?? null, ponder: result?.ponder ?? null, variations: [...variations.values()].sort((a, b) => a.multipv - b.multipv),
        startedAtMs, completedAtMs, durationMs: completedAtMs - startedAtMs });
    };
    const abort = () => finish(new Error(`UCI request ${requestId} was cancelled.`));
    const timeout = setTimeout(() => finish(new Error(`UCI request ${requestId} exceeded ${timeoutMs}ms.`)), timeoutMs);
    const send = (command: string): void => { if (!settled && child.stdin.writable) child.stdin.write(`${command}\n`); };
    const onLine = (raw: string): void => {
      const line = raw.trim();
      if (!line) return;
      if (line.startsWith('id name ')) identity = { ...identity, name: line.slice('id name '.length) };
      if (line.startsWith('id author ')) identity = { ...identity, author: line.slice('id author '.length) };
      const info = parseInfoLine(line);
      if (info && phase === 'searching') variations.set(info.multipv, mergeVariation(variations.get(info.multipv), info));
      if (line === 'uciok' && phase === 'uci') {
        phase = 'ready-config';
        send(`setoption name Threads value ${threads}`);
        send(`setoption name Hash value ${hashMb}`);
        send(`setoption name MultiPV value ${multiPv}`);
        send(`setoption name Skill Level value ${skillLevel}`);
        send('setoption name UCI_ShowWDL value true');
        send('isready');
      } else if (line === 'readyok' && phase === 'ready-config') {
        phase = 'ready-game'; send('ucinewgame'); send('isready');
      } else if (line === 'readyok' && phase === 'ready-game') {
        phase = 'searching'; send(positionCommand); send(nodes === null ? `go movetime ${movetimeMs}` : `go nodes ${nodes}`);
      } else if (line.startsWith('bestmove ') && phase === 'searching') {
        const fields = line.split(/\s+/);
        finish(undefined, { bestmove: fields[1] && fields[1] !== '(none)' ? fields[1] : null, ponder: fields[2] === 'ponder' ? fields[3] ?? null : null, completedAtMs: Date.now(), durationMs: 0 });
      }
    };
    let buffered = '';
    const stdout = (chunk: Buffer): void => {
      buffered += chunk.toString('utf8');
      const lines = buffered.split(/\r?\n/);
      buffered = lines.pop() ?? '';
      for (const line of lines) onLine(line);
    };
    const stderr = (_chunk: Buffer): void => { /* UCI engines commonly log diagnostics here; protocol remains stdout. */ };
    const childError = (error: Error): void => finish(new Error(`UCI engine '${enginePath}' failed to start.`, { cause: error }));
    const childExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      if (!settled) finish(new Error(`UCI engine exited before bestmove (code ${code ?? 'null'}, signal ${signal ?? 'none'}).`));
    };
    child.stdout.on('data', stdout);
    child.stderr.on('data', stderr);
    child.once('error', childError);
    child.once('exit', childExit);
    if (options.signal?.aborted) { abort(); return; }
    options.signal?.addEventListener('abort', abort, { once: true });
    send('uci');
  });
}
