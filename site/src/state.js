import {createExecBoard, pxFn, pxKey, trackAccess} from './lab/board.js?v=1659bc36bb2d5fb65e10d55219bcabfc2d6f753a947bc503323c54cfb194a081';
import {sha256HexSyncText} from './lab/sha256.js?v=1659bc36bb2d5fb65e10d55219bcabfc2d6f753a947bc503323c54cfb194a081';


export const King=(id       ,color      ,square       )      =>({id,type:'King',color,square});
export const Queen=(id       ,color      ,square       )      =>({id,type:'Queen',color,square});
export const other=(color      )      =>color==='white'?'black':'white';
const directions=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const xy=(s       )=>[s.charCodeAt(0)-97,Number(s[1])-1];
const square=(x       ,y       )=>String.fromCharCode(97+x)+(y+1);
export class Board {
 pieces        ; sideToMove      ;
 constructor(pieces        ,sideToMove      ='black') {
  if(!['white','black'].includes(sideToMove))throw Error('Side must be white or black');
  this.pieces=pieces.map(p=>({...p}));this.sideToMove=sideToMove;
  if(new Set(pieces.map(p=>p.id)).size!==pieces.length)throw Error('Duplicate piece identity');
  if(new Set(pieces.map(p=>p.square)).size!==pieces.length)throw Error('Two pieces occupy one square');
  for(const p of pieces)if(!/^[a-h][1-8]$/.test(p.square)||!['King','Queen'].includes(p.type)||!['white','black'].includes(p.color))throw Error('Unsupported piece or square');
  for(const c of ['white','black'])if(pieces.filter(p=>p.type==='King'&&p.color===c).length!==1)throw Error('Exactly one king per side required');
  const [a,b]=pieces.filter(p=>p.type==='King').map(p=>xy(p.square));
  if(Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]))<=1)throw Error('Kings cannot be adjacent');
 }
 at(s       ){return this.pieces.find(p=>p.square===s);}
}

export function attacks(board      ,piece      )         {
 const [x,y]=xy(piece.square),out         =[];
 for(const [dx,dy] of directions){const path         =[];
  for(let n=1;n<=(piece.type==='King'?1:7);n++){
   const xx=x+dx*n,yy=y+dy*n;if(xx<0||xx>7||yy<0||yy>7)break;
   const target=square(xx,yy),occupier=board.at(target)??null;
   out.push({source:piece.id,target,has:{fn:`fn.chess.${piece.type.toLowerCase()}.attacks`,piece:{...piece},direction:[dx,dy],path:[...path],occupier}});
   if(occupier)break;path.push(target);
  }
 }
 return out;
}
export const attackers=(board      ,target       ,color      )=>board.pieces.filter(p=>p.color===color).flatMap(p=>attacks(board,p)).filter(a=>a.target===target);
export function compose(board      ){
 const mine=board.sideToMove,king=board.pieces.find(p=>p.type==='King'&&p.color===mine) ;
 const relations=board.pieces.map(p=>({piece:p,attacks:{squares:{set:attacks(board,p).map(a=>a.target)},has:attacks(board,p)}}));
 const checkWitnesses=attackers(board,king.square,other(mine));
 const responses      =[];
 for(const p of board.pieces.filter(p=>p.color===mine))for(const attack of attacks(board,p)){
  const occupant=board.at(attack.target);
  if(occupant?.color===mine||occupant?.type==='King'){
   responses.push({piece:p.id,to:attack.target,legal:false,reason:occupant?.color===mine?'own piece occupies square':'king capture is not a move',has:{candidate:attack}});continue;
  }
  // Hypothetical occupancy: remove capture, then move. Avoid Board validation until king-safety witnesses are collected.
  const next=Object.create(Board.prototype)         ;
  next.pieces=board.pieces.filter(q=>q.id!==occupant?.id).map(q=>q.id===p.id?{...q,square:attack.target}:{...q});next.sideToMove=other(mine);
  const kingSquare=p.type==='King'?attack.target:king.square;
  const danger=attackers(next,kingSquare,other(mine));
  responses.push({piece:p.id,to:attack.target,legal:danger.length===0,reason:danger.length?'king remains under attack':'king safe',has:{candidate:attack,capture:occupant??null,resultingPieces:next.pieces,attacks:danger}});
 }
 const legalMoves=responses.filter(r=>r.legal);
 const check={value:checkWitnesses.length>0,query:'mine.king.square IN opponent.active_pieces.attacks.squares.set',has:checkWitnesses};
 return {schema:'chesslab-state@1',position:{pieces:board.pieces,sideToMove:mine},relations,check,legal_moves:{set:legalMoves},checkmate:{value:check.value&&legalMoves.length===0,has:{check,responses,coverage:{complete:true,scope:'King and Queen only; all board-bounded step/ray destinations through first occupancy',pieces:board.pieces.filter(p=>p.color===mine).map(p=>p.id)}}},stalemate:!check.value&&legalMoves.length===0};
}
export const specimen=()=>new Board([King('WK','white','f6'),Queen('WQ','white','g7'),King('BK','black','h8')]);
export const positionKey=pxKey       ('px.chess.position');
export const stateKey=pxKey                            ('px.state.chess');
const composeFn=pxFn                                  ('fn.chess.compose');
export function session(board=specimen()){
 const pxc=createExecBoard();pxc.register(composeFn,compose);let revision=0;const history      =[];
 function refine(next      ){
  const opponentKing=next.pieces.find(p=>p.type==='King'&&p.color===other(next.sideToMove)) ;
  if(attackers(next,opponentKing.square,next.sideToMove).length)throw Error('Invalid position: side not to move is in check');
  const access=trackAccess(pxc,{id:'compose-state',consumes:[positionKey.address,stateKey.address]});
  const previous=access.tracked.has(stateKey)?access.tracked.get(stateKey):null;
  access.tracked.set(positionKey,next);
  const state=access.tracked.call(composeFn,access.tracked.get(positionKey));access.tracked.set(stateKey,state);
  const record={occurrence:++revision,calculation:composeFn.address,previousHash:previous?history.at(-1).hash:null,hash:sha256HexSyncText(JSON.stringify(state)),reads:[...access.consumed],writes:access.writes,state};history.push(record);return record;
 }
 refine(board);return {pxc,history,refine,current:()=>history.at(-1) };
}
