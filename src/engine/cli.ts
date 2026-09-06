#!/usr/bin/env node
import {analyze} from './uci.ts';
import {materializeEngineAnalysis} from './materialize.ts';

const usage = 'Usage: node src/engine/cli.ts --fen "<six-field FEN>" [--moves e2e4,e7e5] [--engine /path/to/stockfish] [--movetime 800] [--nodes 100000] [--multipv 3]';
const args = process.argv.slice(2);
const value = (name: string): string | undefined => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
if (args.includes('--help') || !value('--fen')) { console.error(usage); process.exitCode = args.includes('--help') ? 0 : 2; }
else {
  const numeric = (name: string): number | undefined => value(name) === undefined ? undefined : Number(value(name));
  try {
    const completed = await analyze(value('--fen')!, value('--moves')?.split(',').filter(Boolean) ?? [], {
      enginePath: value('--engine'), movetimeMs: numeric('--movetime'), nodes: numeric('--nodes'), multiPv: numeric('--multipv')
    });
    const {materialization, tick} = materializeEngineAnalysis(completed);
    console.log(JSON.stringify({analysis: materialization, tick}, null, 2));
  } catch (error) { console.error((error as Error).message); process.exitCode = 1; }
}
