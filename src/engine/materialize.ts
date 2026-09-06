import type {PxC} from '../lab/board.ts';
import {pxFn, pxKey} from '../lab/board.ts';
import {loadCartridge} from '../lab/host.ts';
import type {Cartridge} from '../lab/host.ts';
import type {EngineCompletedAnalysis} from './types.ts';

export const completedEngineAnalysisSlot = pxKey<EngineCompletedAnalysis>('px.chess.engine.completed');
export const materializedEngineAnalysisSlot = pxKey<EngineMaterialization>('px.chess.engine.analysis');
export const materializeEngineAnalysisFn = pxFn<EngineCompletedAnalysis, EngineMaterialization>('fn.chess.materializeEngineAnalysis');

export interface EngineMaterialization {
  readonly schema: 'chesslab-engine-materialization@1';
  readonly requestId: string;
  readonly analysis: EngineCompletedAnalysis;
}

/** Pure and synchronous: async engine I/O has completed before a PxC Tick calls this. */
export function materializeCompletedEngineAnalysis(analysis: EngineCompletedAnalysis): EngineMaterialization {
  return Object.freeze({ schema: 'chesslab-engine-materialization@1', requestId: analysis.requestId, analysis });
}

export function executeEngineMaterialization(px: PxC): void {
  const completed = px.get(completedEngineAnalysisSlot);
  px.register(materializeEngineAnalysisFn, materializeCompletedEngineAnalysis);
  px.set(materializedEngineAnalysisSlot, px.call(materializeEngineAnalysisFn, completed));
}

export const engineCartridge: Cartridge = {
  id: 'chess-engine',
  stages: [{
    id: 'materialize', variant: 'completed',
    operation: { id: 'chess.materializeEngineAnalysis', kind: 'materialize', gate: 'always', unit: 'chess.engine',
      consumes: [completedEngineAnalysisSlot.address], produces: [materializedEngineAnalysisSlot.address],
      calculations: [materializeEngineAnalysisFn.address], accessConformance: 'exact' },
    execute: executeEngineMaterialization
  }]
};

/** Records one already-completed request in a real synchronous PxC Tick. */
export function materializeEngineAnalysis(analysis: EngineCompletedAnalysis) {
  const host = loadCartridge(engineCartridge);
  host.px.set(completedEngineAnalysisSlot, analysis);
  const tick = host.run('materialize', 'completed');
  return { materialization: host.px.get<EngineMaterialization>(materializedEngineAnalysisSlot), tick };
}
