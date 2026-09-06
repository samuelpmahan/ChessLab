import type {PxC} from '../../../lab/board.ts';
import {pxFn} from '../../../lab/board.ts';
import {analyzePosition} from '../../analysis.ts';
import type {FrameAnalysis,PolicyVariant} from '../../analysis.ts';
import type {Frame,MaterializedObjects} from '../S0/clean/index.ts';

export interface AnalysisInput {frame:Frame;objects:MaterializedObjects;variant:PolicyVariant}

/**
 * The debugger's analysis is a regular PxC calculation.  It receives the
 * original frame (including FEN metadata) and S0's observed piece objects;
 * S0 is therefore an actual dependency rather than a second in-memory path.
 */
function analyze(input:AnalysisInput){
 const analysis=analyzePosition({fen:input.frame.fen,pieces:input.objects.pieces,sideToMove:input.frame.sideToMove},input.variant);
 // Position facts are read from S0 objects. Frame metadata remains explicit
 // diagnostic provenance, rather than silently disappearing during the join.
 return {...analysis,source:{...analysis.source,frameSideToMove:input.frame.sideToMove,frameLegalMoves:input.frame.legalMoves?[...input.frame.legalMoves]:null,frameCheck:input.frame.check??null,frameCheckmate:input.frame.checkmate??null}};
}
export const calculate=pxFn<AnalysisInput,FrameAnalysis>('fn.chess.analyzeFrame');

export function execute(px:PxC,variant:PolicyVariant){
 px.register(calculate,analyze);
 const frame=px.get<Frame>('px.chess.frame');
 const objects=px.get<MaterializedObjects>('px.chess.objects');
 px.set('px.chess.analysis',px.call(calculate,{frame,objects,variant}));
}
