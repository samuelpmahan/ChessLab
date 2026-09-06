#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {engineTurn,status} from '../src/arena/index.ts';

// The human/orchestrator fixes this file before a player sees the position.
// It exposes a bounded opponent action without giving the player engine settings.
if(!process.argv[2])throw Error('Usage: node scripts/ladder-reply.mjs MATCH_DIRECTORY');
const directory=resolve(process.argv[2]);
const config=JSON.parse(readFileSync(join(directory,'opponent.json'),'utf8'));
if(status(directory).result){console.log(JSON.stringify(status(directory)));}
else{
 const result=await engineTurn(directory,{skillLevel:config.skillLevel,nodes:config.nodes,timeoutMs:5000});
 if(!result.accepted)throw Error(JSON.stringify(result));
 console.log(JSON.stringify({move:result.move,gameOver:result.gameOver,revision:result.revision}));
}
