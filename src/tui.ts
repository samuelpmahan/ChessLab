import {createInterface} from 'node:readline';
import {readFileSync,writeFileSync} from 'node:fs';
import {Board,session,specimen} from './state.ts';
const lab=session();
function show(){
 const {state,occurrence,hash}=lab.current();
 console.log(`\nCHESSLAB / composed state ${occurrence} / ${hash.slice(0,12)}\n`);
 for(let rank=8;rank>=1;rank--){let line=rank+'  ';for(const file of 'abcdefgh'){
  const p=state.position.pieces.find(p=>p.square===file+rank);
  const symbol=p?(p.type==='King'?'K':'Q'):'.';line+=(p?.color==='black'?symbol.toLowerCase():symbol)+' ';
 }console.log(line);}
 console.log('   a b c d e f g h\n');
 console.log(`${state.position.sideToMove} to move | check: ${state.check.value} | checkmate: ${state.checkmate.value} | stalemate: ${state.stalemate}`);
 console.log('Pieces: '+state.position.pieces.map(p=>`${p.id}=${p.square}`).join('  '));
}
function why(){
 const s=lab.current().state;console.log('\n'+s.check.query+' => '+s.check.value);
 for(const a of s.check.has)console.log(`  ${a.source} attacks ${a.target}; ${a.has.fn}; intervening=[${a.has.path}]`);
 console.log('Response coverage: '+s.checkmate.has.coverage.scope);
 for(const r of s.checkmate.has.responses)console.log(`  ${r.piece} → ${r.to}: ${r.legal?'LEGAL':'REJECT'} — ${r.reason}${r.has.attacks?.length?' ('+r.has.attacks.map(a=>a.source+' attacks '+a.target).join(', ')+')':''}`);
}
function command(line:string){
 const [cmd,...args]=line.trim().split(/\s+/);
 if(!cmd)return;
 if(cmd==='quit'||cmd==='exit')return false;
 if(cmd==='board')show();
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
show();
if(process.argv.includes('--demo')){why();console.log('\nRefinement: relocate supporting king f6 → e5');command('place WK e5');why();command('history');}
else{
 command('help');const rl=createInterface({input:process.stdin,output:process.stdout,terminal:!!process.stdin.isTTY});rl.setPrompt('chesslab> ');rl.prompt();
 rl.on('line',line=>{try{if(command(line)===false){rl.close();return;}}catch(e){console.log('ERROR: '+(e as Error).message);}rl.prompt();});
}
