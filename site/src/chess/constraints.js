
import { pxFn } from '../lab/board.js?v=1659bc36bb2d5fb65e10d55219bcabfc2d6f753a947bc503323c54cfb194a081';



export const chessConstraintPredicates = {
  kingInCheck: 'fn.chess.constraint.kingInCheck',
  candidateIsLegal: 'fn.chess.constraint.candidateIsLegal',
  avoidsImmediateReplyMate: 'fn.chess.constraint.avoidsImmediateReplyMate',
  hasCheckingWitness: 'fn.chess.constraint.hasCheckingWitness'
}         ;


const color = (value         )               => value === 'white' || value === 'black' ? value : null;
const analysisFor = (value         )                       => value && typeof value === 'object' && (value                 ).schema === 'chesslab-analysis@1' ? value                  : null;
const candidateFor = (value         )                       => value && typeof value === 'object' && typeof (value                 ).legal === 'boolean' && typeof (value                 ).id === 'string' && Array.isArray((value                 ).reasonText) && 'score' in value && 'givesMate' in value ? value                  : null;

function invalid(reason        )        { throw new Error(`Chess constraint predicate received invalid material: ${reason}`); }

const predicates                                                     = {
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
    const witnesses                                  = candidate.score.opponentMateWitnesses;
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
export function registerChessConstraintPredicates(board                       )       {
  for (const [address, predicate] of Object.entries(predicates)                                                  ) {
    board.register(pxFn                                     (address), predicate);
  }
}


export function kingInCheckConstraint(input                )             {
  return { kind: 'constraint', id: input.id ?? 'chess.king-in-check', label: input.label ?? 'King is in check', materials: { analysis: input.analysis, side: input.side }, predicate: chessConstraintPredicates.kingInCheck, basis: { observations: input.observations ?? [input.analysis], assumptions: input.assumptions ?? [input.side] } };
}
export function checkingWitnessConstraint(input                )             {
  return { kind: 'constraint', id: input.id ?? 'chess.checking-witness', label: input.label ?? 'Check has a witness', materials: { analysis: input.analysis, side: input.side }, predicate: chessConstraintPredicates.hasCheckingWitness, basis: { observations: input.observations ?? [input.analysis], assumptions: input.assumptions ?? [input.side] } };
}
export function candidateLegalConstraint(input                                                                                                                                                                        )             {
  return { kind: 'constraint', id: input.id ?? 'chess.candidate-legal', label: input.label ?? 'Candidate move is legal', materials: { candidate: input.candidate }, predicate: chessConstraintPredicates.candidateIsLegal, basis: { observations: input.observations ?? [input.candidate], assumptions: input.assumptions ?? [] } };
}
export function avoidsImmediateReplyMateConstraint(input                                                                                                                                                                        )             {
  return { kind: 'constraint', id: input.id ?? 'chess.avoids-immediate-reply-mate', label: input.label ?? 'Candidate avoids immediate reply mate', materials: { candidate: input.candidate }, predicate: chessConstraintPredicates.avoidsImmediateReplyMate, basis: { observations: input.observations ?? [input.candidate], assumptions: input.assumptions ?? [] } };
}
