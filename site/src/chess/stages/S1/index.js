
import {pxFn} from '../../../lab/board.js?v=39bcfefb661b1c4e536ad75dac14d6b55666cbddf86d9d219da356a444d0894d';
import {analyzePosition} from '../../analysis.js?v=39bcfefb661b1c4e536ad75dac14d6b55666cbddf86d9d219da356a444d0894d';





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
