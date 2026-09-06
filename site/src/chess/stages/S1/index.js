
import {pxFn} from '../../../lab/board.js?v=f68a48966d9f8e520c928607c280c59642e818ed1fc31dcbdef5371866e0bb8d';
import {analyzePosition} from '../../analysis.js?v=f68a48966d9f8e520c928607c280c59642e818ed1fc31dcbdef5371866e0bb8d';





/**
 * The debugger's analysis is a regular PxC calculation.  It receives the
 * original frame (including FEN metadata) and S0's observed piece objects;
 * S0 is therefore an actual dependency rather than a second in-memory path.
 */
function analyze(input              ){
 const analysis=analyzePosition({fen:input.frame.fen,pieces:input.objects.pieces,sideToMove:input.frame.sideToMove},input.variant);
 // Position facts are read from S0 objects. Frame metadata remains explicit
 // diagnostic provenance, rather than silently disappearing during the join.
 return {...analysis,source:{...analysis.source,frameSideToMove:input.frame.sideToMove,frameLegalMoves:input.frame.legalMoves?[...input.frame.legalMoves]:null,frameCheck:input.frame.check??null,frameCheckmate:input.frame.checkmate??null}};
}
export const calculate=pxFn                             ('fn.chess.analyzeFrame');

export function execute(px    ,variant              ){
 px.register(calculate,analyze);
 const frame=px.get       ('px.chess.frame');
 const objects=px.get                     ('px.chess.objects');
 px.set('px.chess.analysis',px.call(calculate,{frame,objects,variant}));
}
