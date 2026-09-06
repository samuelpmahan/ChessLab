import {chessCartridge} from './cartridge.js?v=f68a48966d9f8e520c928607c280c59642e818ed1fc31dcbdef5371866e0bb8d';


import {loadCartridge} from '../lab/host.js?v=f68a48966d9f8e520c928607c280c59642e818ed1fc31dcbdef5371866e0bb8d';































function variantOf(value                 )                 {
 if(value===undefined||value==='clean')return 'clean';
 if(value==='exp')return 'exp';
 throw Error(`Unknown debugger policy: ${value}. Use clean or exp.`);
}

/**
 * Runs the cartridge's real, synchronous PxC stages once.  No browser or CLI
 * caller is allowed to recreate its own analysis: they both render this return
 * value, including exactly the receipts emitted by S0 and S1.
 */
export function runDebugger(frame      ,requestedVariant        )             {
 const variant=variantOf(requestedVariant);
 const host=loadCartridge(chessCartridge);
 host.px.set('px.chess.frame',frame);
 host.run('S0',variant);
 host.run('S1',variant);
 const objects=host.px.get                     ('px.chess.objects');
 const analysis=host.px.get               ('px.chess.analysis');
 const bySide=(side                )=>analysis.sides[side];
 const observed={
  frame:{fen:frame.fen,pieces:frame.pieces,sideToMove:frame.sideToMove},
  pieces:objects.pieces,
  attacks:{white:bySide('white').relations,black:bySide('black').relations},
  checkStatus:{white:{inCheck:bySide('white').inCheck,checkmate:bySide('white').checkmate,stalemate:bySide('white').stalemate},black:{inCheck:bySide('black').inCheck,checkmate:bySide('black').checkmate,stalemate:bySide('black').stalemate}},
  limitations:analysis.limitations
 };
 const policy={
  variant,
  /** Candidate scores are decisions; all geometry remains in observed. */
  sides:{white:{candidates:bySide('white').candidates},black:{candidates:bySide('black').candidates}}
 };
 const sidePanel=(side                )          =>({...bySide(side),threats:bySide(side).checkWitnesses,policy:{variant,candidates:bySide(side).candidates}});
 return {schema:'chesslab-debugger@1',variant,snapshot:{frame,pieces:objects.pieces,sideToMove:frame.sideToMove,observed,policy,sides:analysis.sides,white:sidePanel('white'),black:sidePanel('black'),analysis,receipts:host.ticks},ticks:host.ticks};
}
