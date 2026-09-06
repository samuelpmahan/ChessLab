#!/usr/bin/env node
import {createMatch,engineTurn,status,exportPgn} from '../src/arena/index.ts';
import {writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve(process.argv[2]??`/tmp/chesslab-control-${Date.now()}`);
for(const skillLevel of [0,8,16]){
 const directory=join(root,`skill-${skillLevel}`);
 createMatch(directory,{gameId:`control-skill-${skillLevel}`,
  fen:'5r1k/q5p1/4N2p/4P3/pp2Q3/8/1P4PP/2b4K w - - 0 34',
  white:'engine',black:'engine',visibility:'blind',maxPlies:6,maxEngineCalls:6});
 for(let ply=0;ply<6&&!status(directory).result;ply++){
  const result=await engineTurn(directory,{skillLevel:ply%2?skillLevel:20,nodes:20_000,timeoutMs:5000});
  if(!result.accepted)throw Error(JSON.stringify(result));
 }
 writeFileSync(join(directory,'game.pgn'),exportPgn(directory));
 console.log(JSON.stringify({skillLevel,...status(directory)}));
}
