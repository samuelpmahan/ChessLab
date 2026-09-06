                                              
import {execute} from './stages/S0/clean/index.js?v=fa516eb9d427ea75fc05aa6f334df34cf6754f748ecfd6fc971f7e4d4b38d78f';
export const chessCartridge          ={id:'chess',stages:[{
 id:'S0',variant:'clean',operation:{id:'chess.materializePieces',kind:'materialize',gate:'always',unit:'chess.S0',consumes:['px.chess.frame'],produces:['px.chess.objects'],calculations:['fn.chess.materializePieces']},execute
}]};
