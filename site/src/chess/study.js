import {analyzePosition} from './analysis.js?v=f68a48966d9f8e520c928607c280c59642e818ed1fc31dcbdef5371866e0bb8d';











const TYPES                         ={K:'King',Q:'Queen',R:'Rook',B:'Bishop',N:'Knight',P:'Pawn'};
export const STUDY_HISTORY_LIMITATION='Study edits clear castling, en-passant, and move-history metadata.';

/** Canonicalizes `WK` and `Kw` to the fixture label form `Kw`. */
export function normalizeStudyLabel(value       )        {
 const raw=String(value??'').trim();
 const fixture=/^([KQRBNP])([wb])$/i.exec(raw);
 if(fixture)return `${fixture[1].toUpperCase()}${fixture[2].toLowerCase()}`;
 const colorFirst=/^([wb])([KQRBNP])$/i.exec(raw);
 if(colorFirst)return `${colorFirst[2].toUpperCase()}${colorFirst[1].toLowerCase()}`;
 throw Error(`Unknown piece label: ${raw}`);
}

function colorOf(label       )      {return normalizeStudyLabel(label)[1]==='w'?'white':'black';}
function typeOf(label       )          {return TYPES[normalizeStudyLabel(label)[0]];}
function assertSquare(square       ){if(!/^[a-h][1-8]$/.test(square))throw Error('Square must be a1 through h8');}
function adjacent(a       ,b       ){return Math.max(Math.abs(a.charCodeAt(0)-b.charCodeAt(0)),Math.abs(Number(a[1])-Number(b[1])))<=1;}

/** Stable FEN metadata generated directly from the editable piece placement. */
export function studyFen(pieces                      ,sideToMove      )        {
 const at=new Map(pieces.map(piece=>[piece.square,normalizeStudyLabel(piece.label)]));
 const ranks         =[];
 for(let rank=8;rank>=1;rank--){
  let empty=0,row='';
  for(const file of 'abcdefgh'){
   const label=at.get(`${file}${rank}`);
   if(!label){empty++;continue;}
   if(empty){row+=empty;empty=0;}
   row+=label[1]==='w'?label[0]:label[0].toLowerCase();
  }
  if(empty)row+=empty;
  ranks.push(row);
 }
 return `${ranks.join('/')} ${sideToMove==='white'?'w':'b'} - - 0 1`;
}

/** Validates and canonicalizes a loaded or unedited study frame. Its FEN stays intact. */
export function prepareStudyFrame(frame           )            {
 if(frame.sideToMove!=='white'&&frame.sideToMove!=='black')throw Error('Turn must be white or black');
 const pieces=frame.pieces.map(piece=>({id:piece.id,square:piece.square,label:normalizeStudyLabel(piece.label)}));
 for(const piece of pieces)assertSquare(piece.square);
 if(new Set(pieces.map(piece=>piece.square)).size!==pieces.length)throw Error('Two pieces cannot occupy one square');
 for(const color of ['white','black']         ){
  const kings=pieces.filter(piece=>typeOf(piece.label)==='King'&&colorOf(piece.label)===color);
  if(kings.length!==1)throw Error(`Exactly one ${color} king is required`);
 }
 const whiteKing=pieces.find(piece=>typeOf(piece.label)==='King'&&colorOf(piece.label)==='white') ;
 const blackKing=pieces.find(piece=>typeOf(piece.label)==='King'&&colorOf(piece.label)==='black') ;
 if(adjacent(whiteKing.square,blackKing.square))throw Error('Kings cannot be adjacent');
 const analysis=analyzePosition({pieces,sideToMove:frame.sideToMove});
 const waiting=frame.sideToMove==='white'?'black':'white';
 if(analysis.sides[waiting].inCheck)throw Error('Invalid position: side not to move is in check');
 return {...frame,pieces};
}

/** Accepts human aliases such as `WK` as well as materialized ids and labels. */
export function studyPieceMatches(piece           ,id       )         {
 const wanted=String(id??'').trim();
 if(piece.id&&wanted.toUpperCase()===piece.id.toUpperCase())return true;
 try{
  const materialized=piece                                           ;
  const label=materialized.label??(materialized.type&&materialized.color
   ? `${({King:'K',Queen:'Q',Rook:'R',Bishop:'B',Knight:'N',Pawn:'P'}                         )[materialized.type]??materialized.type[0]}${materialized.color==='white'?'w':materialized.color==='black'?'b':''}`
   : '');
  return normalizeStudyLabel(wanted)===normalizeStudyLabel(label);
 }catch{return false;}
}

export function moveStudyPiece(frame           ,id       ,square       )            {
 assertSquare(square);
 const index=frame.pieces.findIndex(piece=>studyPieceMatches(piece,id));
 if(index<0)throw Error('Unknown piece ID');
 const current=frame.pieces[index];
 const next={...frame,pieces:frame.pieces.map((piece,i)=>i===index?{...piece,square}:{...piece}),change:{source:current.square,target:square,piece:id}};
 const prepared=prepareStudyFrame(next);
 const note=prepared.note?.includes(STUDY_HISTORY_LIMITATION)?prepared.note:[prepared.note,STUDY_HISTORY_LIMITATION].filter(Boolean).join(' ');
 return {...prepared,fen:studyFen(prepared.pieces,prepared.sideToMove),note};
}

export function turnStudyFrame(frame           ,sideToMove      )            {
 const prepared=prepareStudyFrame({...frame,sideToMove,change:null});
 const note=prepared.note?.includes(STUDY_HISTORY_LIMITATION)?prepared.note:[prepared.note,STUDY_HISTORY_LIMITATION].filter(Boolean).join(' ');
 return {...prepared,fen:studyFen(prepared.pieces,sideToMove),note};
}
