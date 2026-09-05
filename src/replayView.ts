import {famousGame} from './famousGame.ts';
import {createReplay} from './lab/replay.ts';
export const gameReplay=()=>createReplay(famousGame.frames);
export function replayView(replay:ReturnType<typeof gameReplay>):string {
 const f=replay.current(),lines=[famousGame.title,`Frame ${replay.index()} / ${replay.count-1} — ${f.title}`,''];
 for(let rank=8;rank>=1;rank--){let row=rank+'  ';for(const file of 'abcdefgh'){
  const square=file+rank,p=f.pieces.find(p=>p.square===square);
  const mark=f.change?.target===square?'*':f.change?.source===square?'-':' ';
  row+=(p?.label??'.').padEnd(2)+mark+' ';
 }lines.push(row.trimEnd());}
 lines.push('   '+[...'abcdefgh'].map(f=>f.padEnd(4)).join('').trimEnd(),'','w = White; b = Black; N = knight; R = rook; B = bishop; P = pawn','* = arrived here; - = left here',f.note,f.checkmate?'CHECKMATE — Black has no legal response.':`${f.sideToMove==='white'?'White':'Black'} to move.`, 'next | back | replay 0..3 | study');
 return lines.join('\n');
}
