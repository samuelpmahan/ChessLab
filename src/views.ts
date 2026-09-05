import type {session} from './state.ts';
type Record = ReturnType<ReturnType<typeof session>['current']>;
export function boardView(record:Record):string {
 const lines:string[]=[];
 const {state,occurrence,hash}=record;
 lines.push(`\nCHESSLAB / composed state ${occurrence} / ${hash.slice(0,12)}\n`);
 for(let rank=8;rank>=1;rank--){let line=rank+'  ';for(const file of 'abcdefgh'){
  const p=state.position.pieces.find(p=>p.square===file+rank);
  const symbol=p?(p.type==='King'?'K':'Q'):'.';line+=(p?.color==='black'?symbol.toLowerCase():symbol)+' ';
 }lines.push(line);}
 lines.push('   a b c d e f g h\n');
 lines.push(`${state.position.sideToMove} to move | check: ${state.check.value} | checkmate: ${state.checkmate.value} | stalemate: ${state.stalemate}`);
 lines.push('Pieces: '+state.position.pieces.map(p=>`${p.id}=${p.square}`).join('  '));

 return lines.join('\n');
}
export function whyView(record:Record):string {
 const lines:string[]=[];
 const s=record.state;lines.push('\n'+s.check.query+' => '+s.check.value);
 for(const a of s.check.has)lines.push(`  ${a.source} attacks ${a.target}; ${a.has.fn}; intervening=[${a.has.path}]`);
 lines.push('Response coverage: '+s.checkmate.has.coverage.scope);
 for(const r of s.checkmate.has.responses)lines.push(`  ${r.piece} → ${r.to}: ${r.legal?'LEGAL':'REJECT'} — ${r.reason}${r.has.attacks?.length?' ('+r.has.attacks.map(a=>a.source+' attacks '+a.target).join(', ')+')':''}`);

 return lines.join('\n');
}
export const stateView=(record:Record)=>boardView(record)+'\n'+whyView(record);
