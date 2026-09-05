import {DebugMaterializer} from './src/lab/debugMaterializer.js';
import {boardView,whyView} from './src/views.js';
import {Board,session,specimen} from './src/state.js';
const lab=session(),output=document.querySelector('#output'),input=document.querySelector('#command');
const print=s=>{output.textContent+=(output.textContent?'\n':'')+s;output.scrollTop=output.scrollHeight;};
function render(){document.querySelector('#board').textContent=DebugMaterializer(lab.current(),boardView);document.querySelector('#status').textContent='';}
function execute(line){const [cmd,...args]=line.trim().split(/\s+/);if(!cmd)return;print('> '+line);try{const s=lab.current().state;
 if(cmd==='why')print(DebugMaterializer(lab.current(),whyView));
 else if(cmd==='inspect'){const v=args[0]?s.relations.find(r=>r.piece.id===args[0]):s;if(!v)throw Error('Unknown piece ID');print(JSON.stringify(v,null,2));}
 else if(cmd==='place'){if(!s.position.pieces.some(p=>p.id===args[0]))throw Error('Unknown piece ID');lab.refine(new Board(s.position.pieces.map(p=>p.id===args[0]?{...p,square:args[1]}:p),s.position.sideToMove));print('Position recomposed. Type why to inspect.');}
 else if(cmd==='turn')lab.refine(new Board(s.position.pieces,args[0]));
 else if(cmd==='reset'){lab.refine(specimen());print('Specimen restored.');}
 else if(cmd==='history')print(lab.history.map(r=>`${r.occurrence} ${r.hash.slice(0,12)} check=${r.state.check.value} mate=${r.state.checkmate.value}`).join('\n'));
 else if(cmd==='receipt'){const {state,...receipt}=lab.current();print(JSON.stringify(receipt,null,2));}
 else if(cmd==='save'){const url=URL.createObjectURL(new Blob([JSON.stringify(s,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='chesslab-state.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);print('Downloaded state.');}
 else if(cmd==='load')document.querySelector('#upload').click();
 else if(cmd==='clear')output.textContent='';
 else if(cmd==='board')print('Board refreshed.');
 else print('why | inspect [ID] | place ID SQUARE | turn white/black | history | receipt | reset | save | load | clear');
 render();}catch(e){print('ERROR: '+e.message);}}
document.querySelector('#form').addEventListener('submit',e=>{e.preventDefault();execute(input.value);input.value='';});
for(const b of document.querySelectorAll('[data-command]'))b.addEventListener('click',()=>execute(b.dataset.command));
document.querySelector('#upload').addEventListener('change',async e=>{try{const f=e.target.files[0];if(!f)return;const s=JSON.parse(await f.text());if(s.schema!=='chesslab-state@1')throw Error('Unsupported schema');lab.refine(new Board(s.position.pieces,s.position.sideToMove));render();print('Loaded and recomposed state.');}catch(err){print('ERROR: '+err.message);}finally{e.target.value='';}});
render();print('Open a composition. Change a part. See what follows.');execute('why');
