#!/usr/bin/env node
import {createMatch,engineTurn,status,exportPgn} from '../src/arena/index.ts';
import {writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

// A forced tactical finish verifies execution, not general playing strength.
// Each seat gets the same full-strength engine and bounded search budget.
const directory=resolve(process.argv[2]??`/tmp/chesslab-engine-smoke-${Date.now()}`);
createMatch(directory,{gameId:'stockfish-forced-finish',
  fen:'4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16',
  white:'engine',black:'engine',visibility:'blind',maxPlies:6,maxEngineCalls:6});
for(let ply=0;ply<6&&!status(directory).result;ply++){
  const result=await engineTurn(directory,{nodes:20_000,timeoutMs:5000});
  if(!result.accepted)throw Error(`Engine execution failed: ${JSON.stringify(result)}`);
  console.log(result.move.san);
}
const result=status(directory);
writeFileSync(join(directory,'game.pgn'),exportPgn(directory));
console.log(JSON.stringify({directory,...result},null,2));
if(result.result?.kind!=='win'||result.result.winner!=='white'){
  throw Error('Forced-finish smoke did not produce the expected White checkmate.');
}
