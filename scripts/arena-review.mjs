#!/usr/bin/env node
import {Chess} from 'chess.js';
import {loadMatch} from '../src/arena/index.ts';
import {analyze} from '../src/engine/uci.ts';
import {materializeEngineAnalysis} from '../src/engine/materialize.ts';
import {writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

if(!process.argv[2])throw Error('Usage: node scripts/arena-review.mjs MATCH_DIRECTORY');
const directory=resolve(process.argv[2]),state=loadMatch(directory);
const chess=new Chess(state.initialFen),positions=[];
// Post-game reviewer: never inject these results into the player observations.
const lastPly=Math.min(6,state.moves.length);
for(let ply=0;ply<=lastPly;ply++){
 if(ply){const uci=state.moves[ply-1].uci;chess.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});}
 const completed=await analyze(state.initialFen,state.moves.slice(0,ply).map(m=>m.uci),{nodes:20_000,multiPv:3,timeoutMs:5000});
 const {materialization,tick}=materializeEngineAnalysis(completed);
 const score=completed.variations[0]?.score??null;
 const whiteScore=score?{...score,value:score.value*(chess.turn()==='w'?1:-1),
   bound:chess.turn()==='w'||score.bound==='exact'?score.bound:score.bound==='lower'?'upper':'lower'}:null;
 positions.push({ply,fen:chess.fen(),sideToMove:chess.turn(),whiteScore,
   checkmate:chess.isCheckmate(),winner:chess.isCheckmate()?(chess.turn()==='w'?'black':'white'):null,materialization,tick});
}
const report={schema:'chesslab-arena-review@1',gameId:state.gameId,
 note:'Post-game bounded engine analysis. cp and mate are different units; no human win probability or learning effect is inferred.',
 evaluatedThroughPly:lastPly,truncated:lastPly<state.moves.length,positions};
writeFileSync(join(directory,'review.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({gameId:state.gameId,positions:positions.map(p=>({ply:p.ply,whiteScore:p.whiteScore,bestmove:p.materialization.analysis.bestmove}))},null,2));
