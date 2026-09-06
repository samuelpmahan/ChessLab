
import {pxFn} from '../../../../lab/board.js?v=1659bc36bb2d5fb65e10d55219bcabfc2d6f753a947bc503323c54cfb194a081';
const names={K:'King',Q:'Queen',R:'Rook',B:'Bishop',N:'Knight',P:'Pawn'}         ;
/** A fully observed board fixture. It is intentionally policy-free. */



function materialize(frame      )                    {
 const pieces=frame.pieces.map(p=>{
  const type=names[p.label[0]                      ];
  if(!type||!['w','b'].includes(p.label[1]))throw Error('Unknown piece label: '+p.label);
  return {id:p.label+'@'+p.square,type,color:p.label[1]==='w'?'white':'black',square:p.square,
   has:{source:'px.chess.frame',fen:frame.fen,label:p.label,calculation:'fn.chess.materializePieces'}};
 });
 return {pieces,sideToMove:frame.sideToMove,has:{source:'px.chess.frame',fen:frame.fen},identityScope:'position-local; cross-move identity not yet assigned'};
}
export const calculate=pxFn                                      ('fn.chess.materializePieces');
/** S0's one real materialization calculation. Policy lives in analysis, never here. */
export function execute(px    ){px.register(calculate,materialize);px.set('px.chess.objects',px.call(calculate,px.get       ('px.chess.frame')));}
