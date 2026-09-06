import type {PxC} from '../../../../lab/board.ts';
import {pxFn} from '../../../../lab/board.ts';
const names={K:'King',Q:'Queen',R:'Rook',B:'Bishop',N:'Knight',P:'Pawn'} as const;
/** A fully observed board fixture. It is intentionally policy-free. */
export interface Frame {fen:string;pieces:{square:string;label:string}[];sideToMove:'white'|'black';check?:boolean;checkmate?:boolean;legalMoves?:string[]}
export interface MaterializedPiece {id:string;type:string;color:'white'|'black';square:string;has:{source:'px.chess.frame';fen:string;label:string;calculation:'fn.chess.materializePieces'}}
export interface MaterializedObjects {pieces:MaterializedPiece[];sideToMove:'white'|'black';has:{source:'px.chess.frame';fen:string};identityScope:string}
function materialize(frame:Frame):MaterializedObjects{
 const pieces=frame.pieces.map(p=>{
  const type=names[p.label[0] as keyof typeof names];
  if(!type||!['w','b'].includes(p.label[1]))throw Error('Unknown piece label: '+p.label);
  return {id:p.label+'@'+p.square,type,color:p.label[1]==='w'?'white':'black',square:p.square,
   has:{source:'px.chess.frame',fen:frame.fen,label:p.label,calculation:'fn.chess.materializePieces'}};
 });
 return {pieces,sideToMove:frame.sideToMove,has:{source:'px.chess.frame',fen:frame.fen},identityScope:'position-local; cross-move identity not yet assigned'};
}
export const calculate=pxFn<Frame,ReturnType<typeof materialize>>('fn.chess.materializePieces');
/** S0's one real materialization calculation. Policy lives in analysis, never here. */
export function execute(px:PxC){px.register(calculate,materialize);px.set('px.chess.objects',px.call(calculate,px.get<Frame>('px.chess.frame')));}
