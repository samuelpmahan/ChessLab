                                              
import {execute} from './stages/S0/clean/index.js';
export const chessCartridge          ={id:'chess',stages:[{
 id:'S0',variant:'clean',operation:{id:'chess.materializePieces',kind:'materialize',gate:'always',unit:'chess.S0',consumes:['px.chess.frame'],produces:['px.chess.objects'],calculations:['fn.chess.materializePieces']},execute
}]};
