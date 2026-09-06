import {famousGame} from './famousGame.js?v=f68a48966d9f8e520c928607c280c59642e818ed1fc31dcbdef5371866e0bb8d';
import {createReplay} from './lab/replay.js?v=f68a48966d9f8e520c928607c280c59642e818ed1fc31dcbdef5371866e0bb8d';
export const gameReplay=()=>createReplay(famousGame.frames);
export function replayView(replay                              )        {
 const f=replay.current(),width=58,lines         =[];
 const line=(text='')=>lines.push('│ '+text.padEnd(width)+' │');
 const rule=()=>lines.push('├'+'─'.repeat(width+2)+'┤');
 const wrap=(text       )=>{let row='';for(const word of text.split(/\s+/)){if(row.length+word.length+1>width){line(row);row='';}row+=(row?' ':'')+word;}if(row)line(row);};
 lines.push('┌'+'─'.repeat(width+2)+'┐');
 line('CHESSLAB   /   GAME REPLAY');
 line('Deep Fritz vs Kramnik · 2006 · Game 2');rule();
 line(`FRAME ${replay.index()} / ${replay.count-1}     ${f.checkmate?'CHECKMATE':f.sideToMove.toUpperCase()+' TO MOVE'}`);line();
 line('    '+[...'abcdefgh'].map(x=>' '+x+'   ').join('').trimEnd());
 line('   ┌'+Array(8).fill('────').join('┬')+'┐');
 for(let rank=8;rank>=1;rank--){let row=rank+'  │';for(const file of 'abcdefgh'){
  const square=file+rank,p=f.pieces.find(p=>p.square===square);
  const mark=f.change?.target===square?'*':f.change?.source===square?'-':' ';
  row+=' '+(p?.label??'·').padEnd(2)+mark+'│';
 }line(row);if(rank>1)line('   ├'+Array(8).fill('────').join('┼')+'┤');}
 line('   └'+Array(8).fill('────').join('┴')+'┘');
 line('w White · b Black    * arrival · - departure');rule();
 wrap(f.title);line();wrap(f.note);rule();
 line('[next] Forward   [back] Back   [run] Inspect objects');
 line('[replay 0] Restart   [study] Study   [quit] Exit');
 lines.push('└'+'─'.repeat(width+2)+'┘');return lines.join('\n');
}
