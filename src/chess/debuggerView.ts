import type {DebuggerRun} from './debugger.ts';

type Side = 'white'|'black';
type AnySnapshot = {analysis?:any; observed?:any; policy?:any; sides?:any};

/** Human readable projection of the shared debugger payload. */
export function debuggerView(run:DebuggerRun, side:Side='white'):string {
 const snapshot=run.snapshot as AnySnapshot;
 const analysis=snapshot.analysis ?? snapshot.sides ?? {};
 const sides=analysis.sides ?? snapshot.sides ?? {};
 const selected=sides[side] ?? {};
 const observed=snapshot.observed ?? {};
 const check=selected.inCheck ?? observed.checkStatus?.[side]?.inCheck ?? false;
 const mate=selected.checkmate ?? observed.checkStatus?.[side]?.checkmate ?? false;
 const stale=selected.stalemate ?? observed.checkStatus?.[side]?.stalemate ?? false;
 const lines=[`\nCHESSLAB / debugger ${run.variant} / ${side}`,`Status: viewed side=${side} | frame to move=${(observed.frame?.sideToMove ?? analysis.sideToMove ?? '?')} | in check=${check} | checkmate=${mate} | stalemate=${stale}`];
 lines.push('Pieces: '+(selected.pieces ?? observed.pieces?.[side] ?? []).map((p:any)=>`${p.id ?? p.label ?? p.type}=${p.square}`).join('  '));
 const candidates=[...(selected.candidates ?? [])].filter((c:any)=>c.score).sort((a:any,b:any)=>(b.score?.total??-Infinity)-(a.score?.total??-Infinity)).slice(0,5);
 lines.push('Top candidates:');
 for(const c of candidates) lines.push(`  ${c.id ?? `${c.from}-${c.to}`} ${c.legal?'LEGAL':'REJECT'} score=${c.score.total} [${Object.entries(c.score.components ?? {}).map(([k,v])=>`${k}=${v}`).join(', ')}]${(c.reasonText ?? c.score.explanation ?? []).length?` — ${(c.reasonText ?? c.score.explanation).join('; ')}`:''}`);
 const witnesses=selected.checkWitnesses ?? observed.check?.[side]?.witnesses ?? [];
 lines.push('Check witnesses: '+(witnesses.length ? witnesses.map((w:any)=>`${w.source} attacks ${w.target}`).join('; ') : 'none'));
 return lines.join('\n');
}
