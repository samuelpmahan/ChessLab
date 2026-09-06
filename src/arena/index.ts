/**
 * Bounded, file-backed chess arena.  chess.js is the authority for all move,
 * position and game-over decisions; agents never get to mutate a board directly.
 */
import {Chess, type Move, type Color} from 'chess.js';
import {appendFileSync, existsSync, mkdirSync, openSync, closeSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import type {PxC} from '../lab/board.ts';
import {loadCartridge} from '../lab/host.ts';
import {evaluateConstraint} from '../lab/constraint.ts';
import {analyzePosition, type AnalysisPiece, type PieceType} from '../chess/analysis.ts';
import {avoidsImmediateReplyMateConstraint, candidateLegalConstraint, checkingWitnessConstraint, kingInCheckConstraint, chessConstraintPredicates, registerChessConstraintPredicates} from '../chess/constraints.ts';

export type Seat='white'|'black';
export type Visibility='full'|'blind';
export type PlayerKind='terra'|'engine'|'human';
export interface ArenaResult {kind:'win'|'draw'|'unfinished'; reason:'checkmate'|'stalemate'|'threefold'|'fifty-move'|'insufficient-material'|'ply-cap'|'engine-budget'; winner?:Seat}
export interface ArenaConfig {maxPlies:number; maxEngineCalls:number; maxEngineConcurrency:number; visibility:Visibility}
export interface ArenaMove {ply:number; seat:Seat; uci:string; san:string; rationale:string; at:string}
export interface ArenaState {
 schema:'chesslab-arena@1'; gameId:string; revision:number; createdAt:string;
 initialFen:string; fen:string; moves:ArenaMove[]; players:Record<Seat,PlayerKind>;
 config:ArenaConfig; engineCalls:number; engineInFlight:number; engineAnalysis?:{revision:number;fen:string;analysis:unknown;materialization:unknown}; result?:ArenaResult;
}
export interface Submission {gameId:string; revision:number; seat:Seat; move:string; rationale:string}
export interface ArenaEvent {schema:'chesslab-arena-event@1'; id:string; at:string; type:'initialized'|'submission'|'observation'|'engine-analysis'; gameId:string; revision:number; accepted:boolean; submission?:Submission; outcome?:string; move?:ArenaMove; observation?:unknown; analysis?:unknown; result?:ArenaResult}

const DEFAULTS:ArenaConfig={maxPlies:200,maxEngineCalls:32,maxEngineConcurrency:1,visibility:'full'};
const seatColor=(seat:Seat):Color=>seat==='white'?'w':'b';
const colorSeat=(color:Color):Seat=>color==='w'?'white':'black';
const files=(directory:string)=>({directory:resolve(directory),state:join(resolve(directory),'match.json'),events:join(resolve(directory),'events.jsonl'),materialized:join(resolve(directory),'materialized'),lock:join(resolve(directory),'.arena.lock')});
function now(){return new Date().toISOString();}
function fail(message:string):never {throw new Error(message);}
function boundedInteger(value:unknown,name:string,min:number,max:number){const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)fail(`${name} must be an integer from ${min} to ${max}`);return n;}

/** Throws if persisted history cannot reproduce the saved position. */
export function replay(state:ArenaState):Chess {
 const chess=new Chess(state.initialFen);
 for(const entry of state.moves){
  const move=applyUci(chess,entry.uci);
  if(!move)fail(`Corrupt history at ply ${entry.ply}: ${entry.uci}`);
 }
 if(chess.fen()!==state.fen)fail('Corrupt state: FEN does not equal replayed history');
 return chess;
}
function applyUci(chess:Chess,uci:string):Move|undefined {
 if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(uci))return undefined;
 try{return chess.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]?.toLowerCase() as 'q'|'r'|'b'|'n'|undefined});}catch{return undefined;}
}
function uci(move:Move){return `${move.from}${move.to}${move.promotion??''}`;}
function terminal(chess:Chess):ArenaResult|undefined {
 if(chess.isCheckmate())return {kind:'win',reason:'checkmate',winner:colorSeat(chess.turn()==='w'?'b':'w')};
 if(chess.isStalemate())return {kind:'draw',reason:'stalemate'};
 if(chess.isThreefoldRepetition())return {kind:'draw',reason:'threefold'};
 if(chess.isDrawByFiftyMoves())return {kind:'draw',reason:'fifty-move'};
 if(chess.isInsufficientMaterial())return {kind:'draw',reason:'insufficient-material'};
 return undefined;
}
function validateState(value:unknown):ArenaState {
 const state=value as ArenaState;
 if(!state||state.schema!=='chesslab-arena@1')fail('Unsupported arena state');
 if(!state.players||!state.config||!Array.isArray(state.moves))fail('Malformed arena state');
 boundedInteger(state.revision,'revision',0,1_000_000); boundedInteger(state.config.maxPlies,'maxPlies',1,10_000); boundedInteger(state.config.maxEngineCalls,'maxEngineCalls',0,10_000); boundedInteger(state.config.maxEngineConcurrency,'maxEngineConcurrency',1,2);
 if(state.config.visibility!=='full'&&state.config.visibility!=='blind')fail('Malformed visibility');
 replay(state); return state;
}
function eventPath(directory:string,event:ArenaEvent){appendFileSync(files(directory).events,`${JSON.stringify(event)}\n`,{encoding:'utf8'});}
function save(directory:string,state:ArenaState){const target=files(directory).state,tmp=`${target}.${process.pid}.${randomUUID()}.tmp`;writeFileSync(tmp,`${JSON.stringify(state,null,2)}\n`);renameSync(tmp,target);}
function archiveMind(directory:string,revision:number,mind:unknown){
 const p=files(directory),content=JSON.stringify(mind,null,2)+'\n';
 const digest=createHash('sha256').update(content).digest('hex');
 const name=`mind-r${revision}-${digest.slice(0,16)}.json`,target=join(p.materialized,name);
 mkdirSync(p.materialized,{recursive:true});
 if(!existsSync(target)){const tmp=`${target}.${process.pid}.${randomUUID()}.tmp`;writeFileSync(tmp,content);renameSync(tmp,target);}
 return `materialized/${name}`;
}
function acquire(directory:string){const p=files(directory);mkdirSync(p.directory,{recursive:true});let fd:number;try{fd=openSync(p.lock,'wx');}catch{fail('Arena is busy; retry the same request with its unchanged revision');}return ()=>{closeSync(fd!);rmSync(p.lock,{force:true});};}

export function createMatch(directory:string, options:Partial<ArenaConfig>&{gameId?:string;fen?:string;white?:PlayerKind;black?:PlayerKind}={}) {
 const release=acquire(directory);try{
  const p=files(directory);if(existsSync(p.state))fail(`Arena already exists: ${p.state}`);
  const config={...DEFAULTS}; for(const key of ['maxPlies','maxEngineCalls','maxEngineConcurrency','visibility'] as const)if(options[key]!==undefined)config[key]=options[key] as never;
  config.maxPlies=boundedInteger(config.maxPlies,'maxPlies',1,10_000);config.maxEngineCalls=boundedInteger(config.maxEngineCalls,'maxEngineCalls',0,10_000);config.maxEngineConcurrency=boundedInteger(config.maxEngineConcurrency,'maxEngineConcurrency',1,2);
  if(config.visibility!=='full'&&config.visibility!=='blind')fail('visibility must be full or blind');
  for(const player of [options.white??'terra',options.black??'terra'])if(player!=='terra'&&player!=='engine'&&player!=='human')fail('players must be terra, engine, or human');
  const chess=new Chess(options.fen); const state:ArenaState={schema:'chesslab-arena@1',gameId:options.gameId??randomUUID(),revision:0,createdAt:now(),initialFen:chess.fen(),fen:chess.fen(),moves:[],players:{white:options.white??'terra',black:options.black??'terra'},config,engineCalls:0,engineInFlight:0,result:terminal(chess)};
  save(directory,state);eventPath(directory,{schema:'chesslab-arena-event@1',id:randomUUID(),at:now(),type:'initialized',gameId:state.gameId,revision:0,accepted:true,result:state.result});return state;
 }finally{release();}
}
export function loadMatch(directory:string){const p=files(directory);if(!existsSync(p.state))fail(`No arena match at ${p.state}`);return validateState(JSON.parse(readFileSync(p.state,'utf8')));}
function legalMoves(chess:Chess){return chess.moves({verbose:true}).map(move=>({uci:uci(move),san:move.san}));}
const analysisTypes:Record<string,PieceType>={k:'King',q:'Queen',r:'Rook',b:'Bishop',n:'Knight',p:'Pawn'};
/** Runs the deterministic chess mind as a tracked PxC Tick, not as an untracked map. */
function materializeArenaMind(chess:Chess){
 const pieces=chess.board().flat().filter((piece): piece is NonNullable<typeof piece>=>piece!==null).map(piece=>({square:piece.square,type:analysisTypes[piece.type],color:piece.color==='w'?'white':'black'} satisfies AnalysisPiece));
 const side=colorSeat(chess.turn()),analysis=analyzePosition({fen:chess.fen(),pieces,sideToMove:side});
 const candidates=analysis.activeSide.legalMoves.slice(0,5),candidateAddresses=candidates.map((_candidate,index)=>`arena.candidate.${index}`);
 const cartridge={id:'arena-mind',stages:[{id:'materialize',variant:'current',operation:{id:'arena.materializeMind',kind:'materialize',gate:'always',unit:'chess.arena',consumes:['arena.analysis','arena.side',...candidateAddresses],produces:['arena.mind'],calculations:Object.values(chessConstraintPredicates),accessConformance:'exact' as const},execute(px:PxC){
  const localAnalysis=px.get<typeof analysis>('arena.analysis'),localSide=px.get<typeof side>('arena.side');registerChessConstraintPredicates(px);
  const constraints=[kingInCheckConstraint({id:'arena.king-check',analysis:'arena.analysis',side:'arena.side'}),checkingWitnessConstraint({id:'arena.check-witness',analysis:'arena.analysis',side:'arena.side'}),...candidateAddresses.flatMap((address,index)=>[candidateLegalConstraint({id:`arena.candidate.${index}.legal`,candidate:address}),avoidsImmediateReplyMateConstraint({id:`arena.candidate.${index}.reply-mate`,candidate:address})])];
  const evaluations=constraints.map(constraint=>{const result=evaluateConstraint(px,constraint);return {id:constraint.id,...result};});
  px.set('arena.mind',{summary:{side:localSide,fen:localAnalysis.fen,limitations:localAnalysis.limitations,candidates:localAnalysis.policy.rankedMoves[localSide].slice(0,5),checkWitnesses:localAnalysis.sides[localSide].checkWitnesses,attacks:localAnalysis.sides[localSide].relations.slice(0,20),constraintEvaluations:evaluations},analysis:localAnalysis,evaluations});
 }}]};
 const host=loadCartridge(cartridge);host.px.set('arena.analysis',analysis);host.px.set('arena.side',side);candidates.forEach((candidate,index)=>host.px.set(candidateAddresses[index],candidate));const tick=host.run('materialize','current');
 return {materialization:host.px.get<unknown>('arena.mind'),tick};
}
function compactSource(value:any){return {source:value.source,target:value.target,kind:value.kind,relation:value.relation,path:value.path,occupiedBy:value.occupiedBy??null};}
function compactMind(directory:string,revision:number,detailed:any){
 const raw=detailed.materialization.summary, attacks=(raw.attacks??[]).flatMap((relation:any)=>relation.attacks??[relation]).slice(0,20).map(compactSource);
 return {summary:{side:raw.side,fen:raw.fen?.raw??null,limitations:raw.limitations,candidates:raw.candidates.map((candidate:any)=>({id:candidate.id,total:candidate.total,components:candidate.components,explanation:candidate.explanation})),checkWitnesses:(raw.checkWitnesses??[]).map(compactSource),attacks,constraintEvaluations:raw.constraintEvaluations.map(({id,status,reason}:any)=>({id,status,reason}))},tick:detailed.tick,archive:{path:archiveMind(directory,revision,detailed),revision}};
}
/** Carefully whitelisted observation output. Blind observations contain only public board facts and move history; they never contain rationales, players, engine analysis, or domain judgments. */
export function observe(directory:string,seat:Seat){
 if(seat!=='white'&&seat!=='black')fail('seat must be white or black');
 const release=acquire(directory);try{
  const state=loadMatch(directory), chess=replay(state);
  const core={schema:'chesslab-arena-observation@1',gameId:state.gameId,revision:state.revision,youAre:seat,fen:state.fen,sideToMove:colorSeat(chess.turn()),legalMoves:state.result?[]:legalMoves(chess),history:state.moves.map(({ply,seat:moveSeat,uci:moveUci,san})=>({ply,seat:moveSeat,uci:moveUci,san})),gameOver:state.result??null};
  const detailedMind=state.config.visibility==='full'?materializeArenaMind(chess):null;const mind=detailedMind?compactMind(directory,state.revision,detailedMind):null;const engine=state.engineAnalysis;const engineAnalysis=!engine?{available:false,reason:'No engine analysis has been requested for this match'}:engine.revision===state.revision&&engine.fen===state.fen?{available:true,...engine}:{available:false,stale:true,analyzedRevision:engine.revision,analyzedFen:engine.fen};
  const observation=state.config.visibility==='blind'?core:{...core,mind,engineAnalysis};
  eventPath(directory,{schema:'chesslab-arena-event@1',id:randomUUID(),at:now(),type:'observation',gameId:state.gameId,revision:state.revision,accepted:true,observation});
  return observation;
 }finally{release();}
}
function reject(directory:string, state:ArenaState, submission:Submission, outcome:string){const event:ArenaEvent={schema:'chesslab-arena-event@1',id:randomUUID(),at:now(),type:'submission',gameId:state.gameId,revision:state.revision,accepted:false,submission,outcome};eventPath(directory,event);return {accepted:false,revision:state.revision,outcome,eventId:event.id};}
/** Applies exactly one optimistic-concurrency checked request, recording every accepted or rejected attempt. */
export function submit(directory:string, input:Submission){
 const release=acquire(directory);try{
  const state=loadMatch(directory);
  if(!input||typeof input!=='object')fail('Submission must be an object');
  if(input.gameId!==state.gameId)return reject(directory,state,input,'wrong-game-id');
  if(input.revision!==state.revision)return reject(directory,state,input,'stale-revision');
  if(input.seat!=='white'&&input.seat!=='black')return reject(directory,state,input,'invalid-seat');
  if(typeof input.rationale!=='string'||!input.rationale.trim())return reject(directory,state,input,'rationale-required');
  if(input.rationale.length>500)return reject(directory,state,input,'rationale-too-long');
  if(state.result)return reject(directory,state,input,'game-over');
  const chess=replay(state);
  if(chess.turn()!==seatColor(input.seat))return reject(directory,state,input,'not-your-turn');
  const move=applyUci(chess,String(input.move??''));
  if(!move)return reject(directory,state,input,'illegal-move');
  const record:ArenaMove={ply:state.moves.length+1,seat:input.seat,uci:uci(move),san:move.san,rationale:input.rationale.trim(),at:now()};
  const next:ArenaState={...state,revision:state.revision+1,fen:chess.fen(),moves:[...state.moves,record]};
  next.result=terminal(chess)??(next.moves.length>=next.config.maxPlies?{kind:'unfinished',reason:'ply-cap'}:undefined);
  replay(next);save(directory,next);
  const event:ArenaEvent={schema:'chesslab-arena-event@1',id:randomUUID(),at:now(),type:'submission',gameId:next.gameId,revision:next.revision,accepted:true,submission:input,move:record,result:next.result};eventPath(directory,event);
  return {accepted:true,revision:next.revision,move:record,gameOver:next.result??null,eventId:event.id};
 }finally{release();}
}
export function status(directory:string){const state=loadMatch(directory),chess=replay(state);return {schema:'chesslab-arena-status@1',gameId:state.gameId,revision:state.revision,plies:state.moves.length,maxPlies:state.config.maxPlies,fen:state.fen,awaiting:state.result?null:colorSeat(chess.turn()),player:state.result?null:state.players[colorSeat(chess.turn())],engine:{calls:state.engineCalls,inFlight:state.engineInFlight,budget:state.config.maxEngineCalls,concurrency:state.config.maxEngineConcurrency},result:state.result??null};}
/** Runs one configured engine turn.  The UCI adapter is deliberately dynamically loaded so Terra-only matches have no engine dependency. */
function acquireEngine(directory:string, slots:number){
 const base=resolve(directory);for(let slot=0;slot<slots;slot++){const lock=join(base,slot===0?'.engine.lock':`.engine.${slot}.lock`);try{const fd=openSync(lock,'wx');return ()=>{closeSync(fd);rmSync(lock,{force:true});};}catch{ /* try another bounded slot */ }}fail('Engine concurrency limit reached; retry later');
}
/** Reserves one budgeted engine search before work begins. Failed searches still consume that attempt. */
export async function engineTurn(directory:string, options:{enginePath?:string;engineArgs?:readonly string[];movetimeMs?:number;nodes?:number;timeoutMs?:number}={}){
 const initial=loadMatch(directory), current=status(directory);
 if(current.result)return {accepted:false,outcome:'game-over'};
 if(current.player!=='engine')return {accepted:false,outcome:'awaiting-non-engine-player'};
 const releaseEngine=acquireEngine(directory,initial.config.maxEngineConcurrency);let reserved:ArenaState|undefined;
 try{
  const releaseReservation=acquire(directory);try{
   const fresh=loadMatch(directory),live=status(directory);if(live.result)return {accepted:false,outcome:'game-over'};if(live.player!=='engine')return {accepted:false,outcome:'stale-engine-turn'};
   if(fresh.engineCalls>=fresh.config.maxEngineCalls){const next={...fresh,revision:fresh.revision+1,result:{kind:'unfinished',reason:'engine-budget'} as ArenaResult};save(directory,next);eventPath(directory,{schema:'chesslab-arena-event@1',id:randomUUID(),at:now(),type:'submission',gameId:next.gameId,revision:next.revision,accepted:false,outcome:'engine-budget',result:next.result});return {accepted:false,outcome:'engine-budget',gameOver:'unfinished'};}
   reserved={...fresh,engineCalls:fresh.engineCalls+1,engineInFlight:fresh.engineInFlight+1};save(directory,reserved);
  }finally{releaseReservation();}
  let analysis:any,materialization:any;try{const module=await import('../engine/uci.ts');analysis=await module.analyze(reserved.initialFen,reserved.moves.map(move=>move.uci),{...options,threads:1});const output=await import('../engine/materialize.ts');materialization=output.materializeEngineAnalysis(analysis);}catch(error){return {accepted:false,outcome:'engine-unavailable',detail:(error as Error).message};}
  const candidate=analysis?.bestmove;
  const releaseAnalysis=acquire(directory);try{const fresh=loadMatch(directory);if(fresh.revision===reserved.revision){const engineAnalysis={revision:reserved.revision,fen:reserved.fen,analysis,materialization};save(directory,{...fresh,engineAnalysis});eventPath(directory,{schema:'chesslab-arena-event@1',id:randomUUID(),at:now(),type:'engine-analysis',gameId:fresh.gameId,revision:fresh.revision,accepted:true,analysis:engineAnalysis});}}finally{releaseAnalysis();}
  if(typeof candidate!=='string')return {accepted:false,outcome:'engine-returned-no-bestmove'};
  return submit(directory,{gameId:reserved.gameId,revision:reserved.revision,seat:current.awaiting!,move:candidate,rationale:'Engine bestmove selection.'});
 }finally{
  // Reservation is retained on a failed search; this only releases the active execution slot.
  if(reserved){try { const releaseCleanup=acquire(directory);try{const fresh=loadMatch(directory);if(fresh.engineInFlight>0)save(directory,{...fresh,engineInFlight:fresh.engineInFlight-1});}finally{releaseCleanup();} } catch { /* do not overwrite a match while cleaning up */ }}
  releaseEngine();
 }
}
export function exportPgn(directory:string){const state=loadMatch(directory);const chess=replay(state);const result=state.result?.kind==='win'?(state.result.winner==='white'?'1-0':'0-1'):state.result?.kind==='draw'?'1/2-1/2':'*';const headers=[`[Event "ChessLab Arena"]`,`[Site "local"]`,`[Date "${state.createdAt.slice(0,10).replaceAll('-','.')}"]`,`[Round "${state.gameId}"]`,`[White "${state.players.white}"]`,`[Black "${state.players.black}"]`,`[Result "${result}"]`];if(state.initialFen!==new Chess().fen())headers.push(`[SetUp "1"]`,`[FEN "${state.initialFen}"]`);const movetext=(chess.pgn().split(/\n\n/).at(-1)??'').replace(/\s+\*$/,'').trim();return `${headers.join('\n')}\n\n${movetext}${movetext?' ':''}${result}`.trimEnd()+"\n";}
