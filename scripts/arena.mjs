#!/usr/bin/env node
import {createMatch, observe, submit, status, engineTurn, exportPgn} from '../src/arena/index.ts';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
const [command,...raw]=process.argv.slice(2);
const args={};for(let i=0;i<raw.length;i++){if(raw[i].startsWith('--'))args[raw[i].slice(2)]=raw[i+1]?.startsWith('--')||raw[i+1]===undefined?true:raw[++i];}
const required=(name)=>{if(!args[name])throw Error(`--${name} is required`);return String(args[name]);};
const int=(name,fallback)=>args[name]===undefined?fallback:Number(args[name]);
const print=value=>process.stdout.write(`${JSON.stringify(value,null,2)}\n`);
const help=()=>console.log(`ChessLab Arena\n  init --dir MATCH [--id ID] [--fen FEN] [--white terra|engine|human] [--black ...] [--visibility full|blind] [--max-plies 8] [--engine-budget 4] [--engine-concurrency 1|2]\n  observe --dir MATCH --seat white|black [--out observation.json]\n  submit --dir MATCH --file request.json\n  status --dir MATCH\n  events --dir MATCH\n  engine-turn --dir MATCH [--movetime-ms 500] [--nodes 10000] [--engine-path PATH]\n  export-pgn --dir MATCH [--out game.pgn]\n  example`);
try {
 let value;
 if(command==='init')value=createMatch(required('dir'),{gameId:args.id===undefined?undefined:String(args.id),fen:args.fen===undefined?undefined:String(args.fen),white:args.white===undefined?undefined:String(args.white),black:args.black===undefined?undefined:String(args.black),visibility:args.visibility===undefined?undefined:String(args.visibility),maxPlies:int('max-plies',undefined),maxEngineCalls:int('engine-budget',undefined),maxEngineConcurrency:int('engine-concurrency',undefined)});
 else if(command==='observe'){value=observe(required('dir'),required('seat'));if(args.out)writeFileSync(String(args.out),`${JSON.stringify(value,null,2)}\n`);}
 else if(command==='submit')value=submit(required('dir'),JSON.parse(readFileSync(required('file'),'utf8')));
 else if(command==='status')value=status(required('dir'));
 else if(command==='events'){const file=`${required('dir')}/events.jsonl`;if(!existsSync(file))throw Error(`No event log at ${file}`);value=readFileSync(file,'utf8').trim().split(/\n/).filter(Boolean).map(JSON.parse);}
 else if(command==='engine-turn')value=await engineTurn(required('dir'),{enginePath:args['engine-path']===undefined?undefined:String(args['engine-path']),movetimeMs:int('movetime-ms',undefined),nodes:int('nodes',undefined),timeoutMs:int('timeout-ms',undefined)});
 else if(command==='export-pgn'){const pgn=exportPgn(required('dir'));if(args.out)writeFileSync(String(args.out),pgn);else process.stdout.write(pgn);process.exit(0);}
 else if(command==='example'){console.log(`# initialize a bounded Terra-vs-Terra match\nnode scripts/arena.mjs init --dir /tmp/chesslab-full --id terra-full --white terra --black terra --visibility full --max-plies 8\n# an agent observes only its allowed view\nnode scripts/arena.mjs observe --dir /tmp/chesslab-full --seat white --out /tmp/white-observation.json\n# it writes a request after choosing a listed UCI command\ncat > /tmp/white-request.json <<'JSON'\n{"gameId":"terra-full","revision":0,"seat":"white","move":"e2e4","rationale":"Claims central space and opens lines."}\nJSON\nnode scripts/arena.mjs submit --dir /tmp/chesslab-full --file /tmp/white-request.json\nnode scripts/arena.mjs status --dir /tmp/chesslab-full\nnode scripts/arena.mjs export-pgn --dir /tmp/chesslab-full --out /tmp/chesslab-full.pgn`);process.exit(0);}
 else {help();process.exit(command?2:0);}
 print(value);
} catch(error) {process.stderr.write(`arena: ${(error).message}\n`);process.exitCode=1;}
