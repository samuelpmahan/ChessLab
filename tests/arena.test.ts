import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createMatch, engineTurn, exportPgn, observe, status, submit} from '../src/arena/index.ts';

const temp=()=>mkdtempSync(join(tmpdir(),'chesslab-arena-'));
test('arena validates stale moves, preserves public history, and records observations',()=>{
 const directory=temp();createMatch(directory,{gameId:'game',visibility:'blind',maxPlies:2});
 const first=submit(directory,{gameId:'game',revision:0,seat:'white',move:'e2e4',rationale:'Centre.'});assert.equal(first.accepted,true);
 const stale=submit(directory,{gameId:'game',revision:0,seat:'black',move:'e7e5',rationale:'Reply.'});assert.deepEqual({accepted:stale.accepted,outcome:stale.outcome},{accepted:false,outcome:'stale-revision'});
 const view=observe(directory,'black');assert.equal(view.history.length,1);assert.equal('analysis' in view,false);assert.equal('engineAnalysis' in view,false);
 const events=readFileSync(join(directory,'events.jsonl'),'utf8');assert.match(events,/\"type\":\"submission\"/);assert.match(events,/"type":"observation"/);assert.match(events,/"accepted":false/);
});
test('a ply cap is an unfinished game and PGN does not claim a draw',()=>{
 const directory=temp();createMatch(directory,{gameId:'cap',maxPlies:1});
 submit(directory,{gameId:'cap',revision:0,seat:'white',move:'e2e4',rationale:'Centre.'});
 assert.deepEqual(status(directory).result,{kind:'unfinished',reason:'ply-cap'});assert.match(exportPgn(directory),/\[Result "\*"\]/);
});
test('exhausted engine budget is unfinished without starting an engine',async()=>{
 const directory=temp();createMatch(directory,{gameId:'engine',white:'engine',maxEngineCalls:0});
 const result=await engineTurn(directory);assert.equal(result.outcome,'engine-budget');assert.deepEqual(status(directory).result,{kind:'unfinished',reason:'engine-budget'});
});

test('engine turn reserves a call, uses bestmove, and persists UCI plus PxC materialization',async()=>{
 const directory=temp();createMatch(directory,{gameId:'engine-ok',white:'engine',maxEngineCalls:1});
 const fixture=new URL('./fixtures/fake-uci-engine.mjs',import.meta.url);
 const result=await engineTurn(directory,{enginePath:process.execPath,engineArgs:[fixture.pathname],nodes:500,timeoutMs:1_000});
 assert.equal(result.accepted,true);assert.equal(status(directory).engine.calls,1);assert.equal(status(directory).engine.inFlight,0);
 const saved=JSON.parse(readFileSync(join(directory,'match.json'),'utf8'));
 assert.equal(saved.moves[0].uci,'e2e4');assert.equal(saved.engineAnalysis.analysis.bestmove,'e2e4');assert.equal(saved.engineAnalysis.materialization.tick.opId,'chess.materializeEngineAnalysis');
});

test('full observations materialize a tracked tactical mind while blind stays whitelisted',()=>{
 const full=temp();createMatch(full,{gameId:'full',visibility:'full'});const detailed=observe(full,'white') as any;
 assert.equal(detailed.mind.tick.opId,'arena.materializeMind');assert.equal(detailed.mind.summary.candidates.length,5);assert.equal(detailed.mind.summary.constraintEvaluations.length,12);assert.equal(detailed.mind.summary.fen,detailed.fen);assert.match(detailed.mind.archive.path,/^materialized\/mind-r0-[a-f0-9]{16}\.json$/);
 const archived=JSON.parse(readFileSync(join(full,detailed.mind.archive.path),'utf8'));assert.deepEqual(archived.tick,detailed.mind.tick);assert.ok(archived.materialization.evaluations[0].constraint.predicate);
 const blind=temp();createMatch(blind,{gameId:'blind',visibility:'blind'});const limited=observe(blind,'white') as Record<string,unknown>;
 assert.deepEqual(Object.keys(limited),['schema','gameId','revision','youAre','fen','sideToMove','legalMoves','history','gameOver']);
});
