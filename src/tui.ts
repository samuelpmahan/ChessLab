import {gameReplay,replayView} from './replayView.ts';
import {DebugMaterializer} from './lab/debugMaterializer.ts';
import {boardView,whyView} from './views.ts';
import {createInterface} from 'node:readline';
import {readFileSync,writeFileSync} from 'node:fs';
import {Board,session,specimen} from './state.ts';
const lab=session(),replay=gameReplay();let replayMode=process.argv.includes('--replay');
const showReplay=()=>console.log(DebugMaterializer(replay,replayView));
function show(){console.log(DebugMaterializer(lab.current(),boardView));}
function why(){console.log(DebugMaterializer(lab.current(),whyView));}
function command(line:string){
 const [cmd,...args]=line.trim().split(/\s+/);
 if(!cmd)return;
 if(cmd==='quit'||cmd==='exit')return false;
 if(cmd==='replay'){replayMode=true;replay.seek(args.length?Number(args[0]):0);showReplay();}
 else if(cmd==='next'||cmd==='back'){replayMode=true;replay[cmd]();showReplay();}
 else if(cmd==='study'){replayMode=false;show();}
 else if(cmd==='board'){if(replayMode)showReplay();else show();}
 else if(replayMode){console.log('Replay: next | back | replay 0..3 | study');}
 else if(cmd==='why')why();
 else if(cmd==='inspect'){
  const s=lab.current().state;
  const value=args[0]?s.relations.find(r=>r.piece.id===args[0]):s;
  if(!value)throw Error('Unknown piece ID');console.log(JSON.stringify(value,null,2));
 }else if(cmd==='place'){
  const s=lab.current().state;if(!s.position.pieces.some(p=>p.id===args[0]))throw Error('Unknown piece ID');
  lab.refine(new Board(s.position.pieces.map(p=>p.id===args[0]?{...p,square:args[1]}:p),s.position.sideToMove));show();
 }else if(cmd==='turn'){
  const s=lab.current().state;lab.refine(new Board(s.position.pieces,args[0] as any));show();
 }else if(cmd==='reset'){lab.refine(specimen());show();}
 else if(cmd==='history')console.log(lab.history.map(r=>`${r.occurrence} ${r.hash.slice(0,12)} check=${r.state.check.value} mate=${r.state.checkmate.value}`).join('\n'));
 else if(cmd==='receipt'){const {state,...receipt}=lab.current();console.log(JSON.stringify(receipt,null,2));}
 else if(cmd==='save'){if(!args.length)throw Error('save FILE');writeFileSync(args.join(' '),JSON.stringify(lab.current().state,null,2));console.log('Saved');}
 else if(cmd==='load'){const s=JSON.parse(readFileSync(args.join(' '),'utf8'));if(s.schema!=='chesslab-state@1')throw Error('Unsupported schema');lab.refine(new Board(s.position.pieces,s.position.sideToMove));show();}
 else console.log('board | why | inspect [WK/WQ/BK] | place ID SQUARE | turn white/black | history | receipt | reset | save FILE | load FILE | quit\nplace edits a study position, not a legal game move. Only King/Queen positions are supported.');
 return true;
}
if(!process.argv.includes('--sequence')){if(replayMode)showReplay();else show();}
if(process.argv.includes('--sequence')){for(let i=0;i<replay.count;i++){replay.seek(i);showReplay();}}
else if(process.argv.includes('--debug')){why();}
else if(process.argv.includes('--demo')){why();console.log('\nRefinement: relocate supporting king f6 → e5');command('place WK e5');why();command('history');}
else{
 command('help');const rl=createInterface({input:process.stdin,output:process.stdout,terminal:!!process.stdin.isTTY});rl.setPrompt('chesslab> ');rl.prompt();
 rl.on('line',line=>{try{if(command(line)===false){rl.close();return;}}catch(e){console.log('ERROR: '+(e as Error).message);}rl.prompt();});
}
