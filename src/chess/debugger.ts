import {chessCartridge} from './cartridge.ts';
import type {Frame,MaterializedObjects} from './stages/S0/clean/index.ts';
import type {FrameAnalysis,PolicyVariant,SideAnalysis} from './analysis.ts';
import {loadCartridge} from '../lab/host.ts';

export type DebuggerVariant = PolicyVariant;
type Tick=ReturnType<ReturnType<typeof loadCartridge>['run']>;
type SidePanel=SideAnalysis & {threats:SideAnalysis['checkWitnesses'];policy:{variant:DebuggerVariant;candidates:SideAnalysis['candidates']}};
export interface DebuggerSnapshot {
 readonly frame:Frame;
 readonly pieces:MaterializedObjects['pieces'];
 readonly sideToMove:Frame['sideToMove'];
 readonly observed:{
  readonly frame:Pick<Frame,'fen'|'pieces'|'sideToMove'>;
  readonly pieces:MaterializedObjects['pieces'];
  readonly attacks:{white:SideAnalysis['relations'];black:SideAnalysis['relations']};
  readonly checkStatus:{white:Pick<SideAnalysis,'inCheck'|'checkmate'|'stalemate'>;black:Pick<SideAnalysis,'inCheck'|'checkmate'|'stalemate'>};
  readonly limitations:FrameAnalysis['limitations'];
 };
 readonly policy:{variant:DebuggerVariant;sides:{white:{candidates:SideAnalysis['candidates']};black:{candidates:SideAnalysis['candidates']}}};
 readonly sides:FrameAnalysis['sides'];
 readonly white:SidePanel;
 readonly black:SidePanel;
 readonly analysis:FrameAnalysis;
 readonly receipts:readonly Tick[];
}

export interface DebuggerRun {
 readonly schema:'chesslab-debugger@1';
 readonly variant:DebuggerVariant;
 /** The single browser/CLI data payload: raw observations never mix with policy. */
 readonly snapshot:DebuggerSnapshot;
 readonly ticks:readonly Tick[];
}

function variantOf(value:string|undefined):DebuggerVariant {
 if(value===undefined||value==='clean')return 'clean';
 if(value==='exp')return 'exp';
 throw Error(`Unknown debugger policy: ${value}. Use clean or exp.`);
}

/**
 * Runs the cartridge's real, synchronous PxC stages once.  No browser or CLI
 * caller is allowed to recreate its own analysis: they both render this return
 * value, including exactly the receipts emitted by S0 and S1.
 */
export function runDebugger(frame:Frame,requestedVariant?:string):DebuggerRun {
 const variant=variantOf(requestedVariant);
 const host=loadCartridge(chessCartridge);
 host.px.set('px.chess.frame',frame);
 host.run('S0',variant);
 host.run('S1',variant);
 const objects=host.px.get<MaterializedObjects>('px.chess.objects');
 const analysis=host.px.get<FrameAnalysis>('px.chess.analysis');
 const bySide=(side:'white'|'black')=>analysis.sides[side];
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
 const sidePanel=(side:'white'|'black'):SidePanel=>({...bySide(side),threats:bySide(side).checkWitnesses,policy:{variant,candidates:bySide(side).candidates}});
 return {schema:'chesslab-debugger@1',variant,snapshot:{frame,pieces:objects.pieces,sideToMove:frame.sideToMove,observed,policy,sides:analysis.sides,white:sidePanel('white'),black:sidePanel('black'),analysis,receipts:host.ticks},ticks:host.ticks};
}
