import type {PxC} from '../../../../lab/board.ts';
import {pxFn} from '../../../../lab/board.ts';
const names={K:'King',Q:'Queen',R:'Rook',B:'Bishop',N:'Knight',P:'Pawn'} as const;
export interface Frame {fen:string;pieces:{square:string;label:string}[];sideToMove:string}
function materialize(frame:Frame){
 const pieces=frame.pieces.map(p=>{
  const type=names[p.label[0] as keyof typeof names];
  if(!type||!['w','b'].includes(p.label[1]))throw Error('Unknown piece label: '+p.label);
  return {id:p.label+'@'+p.square,type,color:p.label[1]==='w'?'white':'black',square:p.square,
   has:{source:'px.chess.frame',fen:frame.fen,label:p.label,calculation:'fn.chess.materializePieces'}};
 });
 return {pieces,sideToMove:frame.sideToMove,has:{source:'px.chess.frame',fen:frame.fen},identityScope:'position-local; cross-move identity not yet assigned'};
}
export const calculate=pxFn<Frame,ReturnType<typeof materialize>>('fn.chess.materializePieces');
export function execute(px:PxC){px.register(calculate,materialize);px.set('px.chess.objects',px.call(calculate,px.get<Frame>('px.chess.frame')));}
