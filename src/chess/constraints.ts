import type { CandidateMove, Color, FrameAnalysis, ImmediateMateWitness } from './analysis.ts';
import { pxFn } from '../lab/board.ts';
import type { PxC } from '../lab/board.ts';
import type { Address, Constraint, ConstraintPredicate, PredicateInputs, ConstraintJudgment } from '../lab/constraint.ts';

export const chessConstraintPredicates = {
  kingInCheck: 'fn.chess.constraint.kingInCheck',
  candidateIsLegal: 'fn.chess.constraint.candidateIsLegal',
  avoidsImmediateReplyMate: 'fn.chess.constraint.avoidsImmediateReplyMate',
  hasCheckingWitness: 'fn.chess.constraint.hasCheckingWitness'
} as const;

type ChessPredicateAddress = typeof chessConstraintPredicates[keyof typeof chessConstraintPredicates];
const color = (value: unknown): Color | null => value === 'white' || value === 'black' ? value : null;
const analysisFor = (value: unknown): FrameAnalysis | null => value && typeof value === 'object' && (value as FrameAnalysis).schema === 'chesslab-analysis@1' ? value as FrameAnalysis : null;
const candidateFor = (value: unknown): CandidateMove | null => value && typeof value === 'object' && typeof (value as CandidateMove).legal === 'boolean' && typeof (value as CandidateMove).id === 'string' && Array.isArray((value as CandidateMove).reasonText) && 'score' in value && 'givesMate' in value ? value as CandidateMove : null;

function invalid(reason: string): never { throw new Error(`Chess constraint predicate received invalid material: ${reason}`); }

const predicates: Record<ChessPredicateAddress, ConstraintPredicate> = {
  [chessConstraintPredicates.kingInCheck]: ({ materials }) => {
    const analysis = analysisFor(materials.analysis); const side = color(materials.side);
    if (!analysis || !side) return invalid('Analysis or side material is invalid.');
    const checked = analysis.sides[side];
    return checked.inCheck
      ? { status: 'satisfied', reason: `${side} king is in check.`, details: { witnesses: checked.checkWitnesses } }
      : { status: 'violated', reason: `${side} king is not in check.` };
  },
  [chessConstraintPredicates.candidateIsLegal]: ({ materials }) => {
    const candidate = candidateFor(materials.candidate);
    if (!candidate) return invalid('Candidate move material is invalid.');
    return candidate.legal
      ? { status: 'satisfied', reason: `${candidate.id} is legal.`, details: { candidate } }
      : { status: 'violated', reason: `${candidate.id} is rejected: ${candidate.reasonText.join('; ') || 'no legal basis'}.`, details: { candidate } };
  },
  [chessConstraintPredicates.avoidsImmediateReplyMate]: ({ materials }) => {
    const candidate = candidateFor(materials.candidate);
    if (!candidate) return invalid('Candidate move material is invalid.');
    if (candidate.score === null) return {status:'unknown',reason:'The candidate was not searched for mating replies.'};
    if (candidate.givesMate === null) return { status: 'unknown', reason: `Immediate reply-mate coverage for ${candidate.id} is incomplete.`, details: { scope: 'History-dependent reply moves are omitted by the bounded analyzer.' } };
    const witnesses: readonly ImmediateMateWitness[] = candidate.score.opponentMateWitnesses;
    return witnesses.length
      ? { status: 'violated', reason: `${candidate.id} permits an immediate mating reply.`, details: { witnesses } }
      : { status: 'satisfied', reason: `No mating reply found in analyzed replies for ${candidate.id}.`, details: { witnesses: [] } };
  },
  [chessConstraintPredicates.hasCheckingWitness]: ({ materials }) => {
    const analysis = analysisFor(materials.analysis); const side = color(materials.side);
    if (!analysis || !side) return invalid('Analysis or side material is invalid.');
    const witnesses = analysis.sides[side].checkWitnesses;
    return witnesses.length
      ? { status: 'satisfied', reason: `${side} check has ${witnesses.length} checking witness${witnesses.length === 1 ? '' : 'es'}.`, details: { witnesses } }
      : { status: 'violated', reason: `${side} has no checking witness.` };
  }
};

/** Register these predicates in the Tick/board that will evaluate the constraints. */
export function registerChessConstraintPredicates(board: Pick<PxC, 'register'>): void {
  for (const [address, predicate] of Object.entries(predicates) as [ChessPredicateAddress, ConstraintPredicate][]) {
    board.register(pxFn<PredicateInputs, ConstraintJudgment>(address), predicate);
  }
}

interface BaseConstraint { readonly id?: string; readonly label?: string; readonly analysis: Address; readonly side: Address; readonly observations?: readonly Address[]; readonly assumptions?: readonly Address[]; }
export function kingInCheckConstraint(input: BaseConstraint): Constraint {
  return { kind: 'constraint', id: input.id ?? 'chess.king-in-check', label: input.label ?? 'King is in check', materials: { analysis: input.analysis, side: input.side }, predicate: chessConstraintPredicates.kingInCheck, basis: { observations: input.observations ?? [input.analysis], assumptions: input.assumptions ?? [input.side] } };
}
export function checkingWitnessConstraint(input: BaseConstraint): Constraint {
  return { kind: 'constraint', id: input.id ?? 'chess.checking-witness', label: input.label ?? 'Check has a witness', materials: { analysis: input.analysis, side: input.side }, predicate: chessConstraintPredicates.hasCheckingWitness, basis: { observations: input.observations ?? [input.analysis], assumptions: input.assumptions ?? [input.side] } };
}
export function candidateLegalConstraint(input: { readonly id?: string; readonly label?: string; readonly candidate: Address; readonly observations?: readonly Address[]; readonly assumptions?: readonly Address[]; }): Constraint {
  return { kind: 'constraint', id: input.id ?? 'chess.candidate-legal', label: input.label ?? 'Candidate move is legal', materials: { candidate: input.candidate }, predicate: chessConstraintPredicates.candidateIsLegal, basis: { observations: input.observations ?? [input.candidate], assumptions: input.assumptions ?? [] } };
}
export function avoidsImmediateReplyMateConstraint(input: { readonly id?: string; readonly label?: string; readonly candidate: Address; readonly observations?: readonly Address[]; readonly assumptions?: readonly Address[]; }): Constraint {
  return { kind: 'constraint', id: input.id ?? 'chess.avoids-immediate-reply-mate', label: input.label ?? 'Candidate avoids immediate reply mate', materials: { candidate: input.candidate }, predicate: chessConstraintPredicates.avoidsImmediateReplyMate, basis: { observations: input.observations ?? [input.candidate], assumptions: input.assumptions ?? [] } };
}
