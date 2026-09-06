import {loadCartridge} from './src/lab/host.js?v=fa516eb9d427ea75fc05aa6f334df34cf6754f748ecfd6fc971f7e4d4b38d78f';
import {chessCartridge} from './src/chess/cartridge.js?v=fa516eb9d427ea75fc05aa6f334df34cf6754f748ecfd6fc971f7e4d4b38d78f';
import {gameReplay,replayView} from './src/replayView.js?v=fa516eb9d427ea75fc05aa6f334df34cf6754f748ecfd6fc971f7e4d4b38d78f';
const replay=gameReplay();let replayMode=true;
import {DebugMaterializer} from './src/lab/debugMaterializer.js?v=fa516eb9d427ea75fc05aa6f334df34cf6754f748ecfd6fc971f7e4d4b38d78f';
import {boardView,whyView} from './src/views.js?v=fa516eb9d427ea75fc05aa6f334df34cf6754f748ecfd6fc971f7e4d4b38d78f';
import {Board,session,specimen} from './src/state.js?v=fa516eb9d427ea75fc05aa6f334df34cf6754f748ecfd6fc971f7e4d4b38d78f';
const lab=session(),output=document.querySelector('#output'),input=document.querySelector('#command');
const print=s=>{output.textContent+=(output.textContent?'\n':'')+s;output.scrollTop=output.scrollHeight;};
function render(){
 document.querySelector('#board').textContent=replayMode?DebugMaterializer(replay,replayView):DebugMaterializer(lab.current(),boardView);
 document.querySelector('#mode-label').textContent=replayMode?'REPLAY':'STUDY';
 document.querySelector('#status').textContent=replayMode?`Frame ${replay.index()} / ${replay.count-1} · ${replay.current().title}`:'King + Queen study · place edits the position';
 for(const b of document.querySelectorAll('[data-command]')){const c=b.dataset.command;b.disabled=(c==='back'&&replayMode&&replay.index()===0)||(c==='next'&&replayMode&&replay.index()===replay.count-1)||(replayMode&&['inspect WQ','place WK e5','save','load'].includes(c));}
 requestAnimationFrame(fitBoard);
}
function execute(line){const [cmd,...args]=line.trim().split(/\s+/);if(!cmd)return;print('> '+line);try{const s=lab.current().state;
 if(cmd==='clear')output.textContent='';
 else if(cmd==='run'){const host=loadCartridge(chessCartridge);host.px.set('px.chess.frame',replay.current());const tick=host.run('S0');print(JSON.stringify({tick,objects:host.px.get('px.chess.objects')},null,2));}
 else if(cmd==='why'&&replayMode)print(replay.current().title+'\n'+replay.current().note);
 else if(cmd==='replay'){replayMode=true;replay.seek(args.length?Number(args[0]):0);}
 else if(cmd==='next'||cmd==='back'){replayMode=true;replay[cmd]();}
 else if(cmd==='study'){replayMode=false;}
 else if(replayMode){print('Replay: next | back | replay 0..3 | study');}
 else if(cmd==='why')print(DebugMaterializer(lab.current(),whyView));
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
const defaults={layout:'split',theme:'green',fit:true,size:14};let prefs={...defaults};
try{const saved=JSON.parse(localStorage.getItem('chesslab.display')||'{}');if(['split','stack','board'].includes(saved.layout))prefs.layout=saved.layout;if(['green','amber','ice'].includes(saved.theme))prefs.theme=saved.theme;if(typeof saved.fit==='boolean')prefs.fit=saved.fit;if(Number.isFinite(saved.size))prefs.size=Math.max(11,Math.min(22,saved.size));}catch{}
function fitBoard(){const el=document.querySelector('#board'),box=document.querySelector('#viewport');if(!prefs.fit){el.style.fontSize=prefs.size+'px';return;}const rows=el.textContent.split('\n'),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='100px '+getComputedStyle(el).fontFamily;const maxWidth=Math.max(...rows.map(r=>ctx.measureText(r).width))/100;el.style.fontSize=Math.max(5,Math.min(24,(box.clientWidth-24)/maxWidth,(box.clientHeight-24)/(rows.length*1.25)))+'px';}
function applyPrefs(){document.body.dataset.layout=prefs.layout;document.body.dataset.theme=prefs.theme;document.documentElement.style.setProperty('--size',prefs.size+'px');document.querySelector('#layout-choice').value=prefs.layout;document.querySelector('#theme-choice').value=prefs.theme;document.querySelector('#fit').checked=prefs.fit;document.querySelector('#text-size').value=prefs.size;document.querySelector('#size-label').value=prefs.size;try{localStorage.setItem('chesslab.display',JSON.stringify(prefs));}catch{}requestAnimationFrame(fitBoard);}
for(const [id,key] of [['layout-choice','layout'],['theme-choice','theme'],['fit','fit'],['text-size','size']])document.getElementById(id).addEventListener('input',e=>{prefs[key]=key==='fit'?e.target.checked:key==='size'?Number(e.target.value):e.target.value;applyPrefs();});
document.querySelector('#defaults').addEventListener('click',()=>{prefs={...defaults};applyPrefs();});
new ResizeObserver(fitBoard).observe(document.querySelector('#viewport'));
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();execute(e.key==='ArrowRight'?'next':'back');}if(e.key==='/'){e.preventDefault();if(prefs.layout==='board'){prefs.layout='split';applyPrefs();}input.focus();}});
applyPrefs();render();print('Select Next to follow the finish. Explain shows the current move.');
