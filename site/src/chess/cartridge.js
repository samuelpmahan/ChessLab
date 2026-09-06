
import {execute} from './stages/S0/clean/index.js?v=1659bc36bb2d5fb65e10d55219bcabfc2d6f753a947bc503323c54cfb194a081';
import {execute as executeExp} from './stages/S0/exp/index.js?v=1659bc36bb2d5fb65e10d55219bcabfc2d6f753a947bc503323c54cfb194a081';
import {execute as analyze} from './stages/S1/clean/index.js?v=1659bc36bb2d5fb65e10d55219bcabfc2d6f753a947bc503323c54cfb194a081';
import {execute as analyzeExp} from './stages/S1/exp/index.js?v=1659bc36bb2d5fb65e10d55219bcabfc2d6f753a947bc503323c54cfb194a081';
const materializeOperation={kind:'materialize'         ,gate:'always',unit:'chess.S0',consumes:['px.chess.frame'],produces:['px.chess.objects'],calculations:['fn.chess.materializePieces']         ,accessConformance:'exact'         };
/**
 * Both variants execute the same evidence materialization. `exp` is only a
 * policy selector for the analysis projection; it does not fabricate a second
 * PxC execution or alter observed pieces.
 */
export const chessCartridge          ={id:'chess',stages:[
 {id:'S0',variant:'clean',operation:{id:'chess.materializePieces',...materializeOperation},execute},
 {id:'S0',variant:'exp',operation:{id:'chess.materializePieces.exp',...materializeOperation},execute:executeExp},
 {id:'S1',variant:'clean',operation:{id:'chess.analyzeFrame',kind:'compute',gate:'always',unit:'chess.S1',consumes:['px.chess.frame','px.chess.objects'],produces:['px.chess.analysis'],calculations:['fn.chess.analyzeFrame'],accessConformance:'exact'},execute:analyze},
 {id:'S1',variant:'exp',operation:{id:'chess.analyzeFrame.exp',kind:'compute',gate:'always',unit:'chess.S1',consumes:['px.chess.frame','px.chess.objects'],produces:['px.chess.analysis'],calculations:['fn.chess.analyzeFrame'],accessConformance:'exact'},execute:analyzeExp}
]};
