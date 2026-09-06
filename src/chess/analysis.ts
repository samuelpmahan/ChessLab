/**
 * Pure, deterministic chess analysis for replay frames.
 *
 * This module deliberately has no engine, clock, I/O, or historical inference.  It
 * computes geometry and legal moves from the supplied position.  Castling and
 * en-passant are reported as unsupported omissions because a replay frame does
 * not carry enough move-history state for this small model.
 */

export type Color = 'white' | 'black';
export type PieceType = 'King' | 'Queen' | 'Rook' | 'Bishop' | 'Knight' | 'Pawn';
export type MoveStatus = 'legal' | 'rejected';
export type PolicyVariant = 'clean' | 'exp';
export type RejectionReason =
  | 'blocked'
  | 'friendly'
  | 'king-safety'
  | 'king-capture'
  | 'empty-capture'
  | 'unsupported-promotion'
  | 'unsupported-rule';

export interface ReplayPiece {
  readonly square: string;
  readonly label: string;
}

/** The subset of famousGame's ReplayFrame consumed by this module. */
export interface ReplayFrame {
  readonly fen: string;
  readonly pieces: readonly ReplayPiece[];
  readonly sideToMove: Color | string;
  readonly legalMoves?: readonly string[];
  readonly check?: boolean;
  readonly checkmate?: boolean;
  readonly [key: string]: unknown;
}

export interface AnalysisPiece {
  readonly id?: string;
  readonly type: PieceType;
  readonly color: Color;
  readonly square: string;
  readonly label?: string;
  /** Provenance carried through from S0 materialization when available. */
  readonly has?: unknown;
}

export interface PositionInput {
  readonly fen?: string;
  readonly pieces: readonly (ReplayPiece | AnalysisPiece)[];
  readonly sideToMove: Color | string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface FenMetadata {
  readonly raw: string;
  readonly activeColor: Color | null;
  readonly castlingRights: string;
  readonly enPassant: string;
  readonly halfmove: number | null;
  readonly fullmove: number | null;
}

export interface RuleSupport {
  readonly castling: { readonly supported: false; readonly status: 'omitted'; readonly reason: string };
  readonly enPassant: { readonly supported: false; readonly status: 'omitted'; readonly reason: string };
  readonly promotion: { readonly supported: true; readonly status: 'enumerated'; readonly choices: readonly PieceType[] };
}

export interface AttackSource {
  readonly source: string;
  readonly target: string;
  readonly sourcePiece: AnalysisPiece;
  readonly kind: 'ray' | 'step' | 'pawn';
  readonly direction: readonly [number, number];
  readonly path: readonly string[];
  readonly occupiedBy: string | null;
  readonly occupiedByColor: Color | null;
  readonly relation: 'attack' | 'defend';
  readonly has: {
    readonly source: string;
    readonly calculation: 'fn.chess.analyzeFrame';
    readonly rule: string;
  };
}

export interface PieceRelations {
  readonly piece: AnalysisPiece;
  readonly attacks: readonly AttackSource[];
  readonly attackedBy: readonly AttackSource[];
  readonly defendedBy: readonly AttackSource[];
}

export interface MoveScore {
  readonly total: number;
  readonly components: Readonly<{
    mate: number;
    check: number;
    capture: number;
    materialDelta: number;
    opponentImmediateMate: number;
    kingSafety: number;
  }>;
  readonly explanation: readonly string[];
  readonly opponentMateWitnesses: readonly ImmediateMateWitness[];
}

export interface ImmediateMateWitness {
  readonly reply: string;
  readonly checkingSources: readonly AttackSource[];
}

export interface CandidateMove {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly promotion?: PieceType;
  readonly side: Color;
  readonly source: AnalysisPiece;
  readonly captured: AnalysisPiece | null;
  readonly status: MoveStatus;
  readonly legal: boolean;
  readonly reasons: readonly RejectionReason[];
  readonly reasonText: readonly string[];
  readonly kingSafetyWitnesses: readonly AttackSource[];
  readonly has: {
    readonly source: string;
    readonly calculation: 'fn.chess.analyzeFrame';
    readonly rule: string;
  };
  readonly givesCheck: boolean;
  /** null means mate status is unknown because omitted history moves could exist. */
  readonly givesMate: boolean | null;
  readonly score: MoveScore | null;
}

export interface SideAnalysis {
  readonly side: Color;
  readonly label: 'active side' | 'hypothetical side';
  readonly pieces: readonly AnalysisPiece[];
  readonly material: Readonly<Record<PieceType, number>>;
  readonly materialPoints: number;
  readonly inCheck: boolean;
  readonly checkWitnesses: readonly AttackSource[];
  /** null means terminal status is unknown because the generated move set is incomplete. */
  readonly checkmate: boolean | null;
  readonly stalemate: boolean | null;
  readonly moveSetComplete: boolean;
  readonly relations: readonly PieceRelations[];
  readonly candidates: readonly CandidateMove[];
  readonly legalMoves: readonly CandidateMove[];
  readonly threatened: readonly ThreatenedPiece[];
}

export interface ThreatenedPiece {
  readonly piece: AnalysisPiece;
  readonly attackerSources: readonly AttackSource[];
  readonly defenderSources: readonly AttackSource[];
  readonly capturableByLegalMove: boolean;
}

export interface AnalysisLimitations {
  readonly rules: RuleSupport;
  readonly completeForCurrentFrame: boolean;
  readonly notes: readonly string[];
}

export interface FrameAnalysis {
  readonly schema: 'chesslab-analysis@1';
  readonly fen: FenMetadata | null;
  readonly sideToMove: Color;
  readonly activeSide: SideAnalysis;
  readonly hypotheticalSide: SideAnalysis;
  readonly sides: Readonly<Record<Color, SideAnalysis>>;
  readonly limitations: AnalysisLimitations;
  readonly source: {
    readonly frameSideToMove: string;
    readonly frameLegalMoves: readonly string[] | null;
    readonly frameCheck: boolean | null;
    readonly frameCheckmate: boolean | null;
  };
  /** Position facts and legality evidence, kept separate from policy ranking. */
  readonly observed: {
    readonly pieces: Readonly<Record<Color, readonly AnalysisPiece[]>>;
    readonly relations: Readonly<Record<Color, readonly PieceRelations[]>>;
    readonly check: Readonly<Record<Color, { readonly inCheck: boolean; readonly checkmate: boolean | null; readonly stalemate: boolean | null; readonly witnesses: readonly AttackSource[] }>>;
    readonly candidates: Readonly<Record<Color, readonly Omit<CandidateMove, 'score'>[]>>;
    readonly threatened: Readonly<Record<Color, readonly ThreatenedPiece[]>>;
  };
  /** Deterministic ranking only; it does not alter observed legality facts. */
  readonly policy: {
    readonly variant: PolicyVariant;
    readonly description: string;
    readonly rankedMoves: Readonly<Record<Color, readonly { readonly id: string; readonly total: number; readonly components: MoveScore['components']; readonly explanation: readonly string[] }[]>>;
  };
}

interface BoardState { pieces: AnalysisPiece[]; fen: FenMetadata | null; }
interface Geometry { to: string; kind: 'ray' | 'step' | 'pawn'; direction: [number, number]; path: string[]; }
interface InternalMove { source: AnalysisPiece; to: string; promotion?: PieceType; geometry: Geometry; captured: AnalysisPiece | null; reasons: RejectionReason[]; }

const FILES = 'abcdefgh';
const PIECE_VALUES: Record<PieceType, number> = { King: 20000, Queen: 900, Rook: 500, Bishop: 330, Knight: 320, Pawn: 100 };
const TYPES: Record<string, PieceType> = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' };
const PROMOTIONS: readonly PieceType[] = ['Queen', 'Rook', 'Bishop', 'Knight'];
const ORTHOGONAL: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAGONAL: readonly [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT: readonly [number, number][] = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING: readonly [number, number][] = [...ORTHOGONAL, ...DIAGONAL];

const other = (color: Color): Color => color === 'white' ? 'black' : 'white';
const inBounds = (x: number, y: number): boolean => x >= 0 && x < 8 && y >= 0 && y < 8;
const xy = (square: string): [number, number] => [FILES.indexOf(square[0]), Number(square[1]) - 1];
const squareAt = (x: number, y: number): string => `${FILES[x]}${y + 1}`;
const validSquare = (s: string): boolean => /^[a-h][1-8]$/.test(s);

function fenMetadata(fen?: string): FenMetadata | null {
  if (!fen) return null;
  const fields = fen.trim().split(/\s+/);
  const activeColor = fields[1] === 'w' ? 'white' : fields[1] === 'b' ? 'black' : null;
  const toNumber = (value: string | undefined): number | null => value !== undefined && /^\d+$/.test(value) ? Number(value) : null;
  return {
    raw: fen,
    activeColor,
    castlingRights: fields[2] ?? '-',
    enPassant: fields[3] ?? '-',
    halfmove: toNumber(fields[4]),
    fullmove: toNumber(fields[5])
  };
}

function parsePiece(piece: ReplayPiece | AnalysisPiece, index: number): AnalysisPiece {
  if (!validSquare(piece.square)) throw new Error(`Invalid chess square: ${piece.square}`);
  if ('type' in piece && 'color' in piece && piece.type && piece.color) {
    if (!Object.values(TYPES).includes(piece.type as PieceType)) throw new Error(`Unsupported piece type: ${piece.type}`);
    if (piece.color !== 'white' && piece.color !== 'black') throw new Error(`Invalid piece color: ${piece.color}`);
    return { id: piece.id ?? `${piece.type[0]}${piece.color[0]}@${piece.square}#${index}`, type: piece.type, color: piece.color, square: piece.square, label: piece.label, has: (piece as AnalysisPiece).has };
  }
  const label = String((piece as ReplayPiece).label ?? '');
  const type = TYPES[label[0]?.toUpperCase() ?? ''];
  const color = label[1] === 'w' ? 'white' : label[1] === 'b' ? 'black' : null;
  if (!type || !color) throw new Error(`Unknown piece label: ${label}`);
  return { id: `${label}@${piece.square}#${index}`, type, color, square: piece.square, label, has: (piece as AnalysisPiece).has };
}

function boardFrom(input: PositionInput): BoardState {
  const pieces = input.pieces.map(parsePiece);
  if (new Set(pieces.map(p => p.square)).size !== pieces.length) throw new Error('Two pieces occupy one square');
  if (pieces.filter(p => p.type === 'King' && p.color === 'white').length !== 1 || pieces.filter(p => p.type === 'King' && p.color === 'black').length !== 1) {
    throw new Error('Analysis requires exactly one king per side');
  }
  return { pieces, fen: fenMetadata(input.fen) };
}

const at = (board: BoardState, square: string): AnalysisPiece | null => board.pieces.find(p => p.square === square) ?? null;
const kingOf = (board: BoardState, color: Color): AnalysisPiece => board.pieces.find(p => p.type === 'King' && p.color === color)!;

function geometryFor(board: BoardState, piece: AnalysisPiece): Geometry[] {
  const [x, y] = xy(piece.square);
  const out: Geometry[] = [];
  const addStep = (direction: [number, number], kind: Geometry['kind'] = 'step') => {
    const xx = x + direction[0], yy = y + direction[1];
    if (inBounds(xx, yy)) out.push({ to: squareAt(xx, yy), kind, direction, path: [] });
  };
  if (piece.type === 'Pawn') {
    const dy = piece.color === 'white' ? 1 : -1;
    addStep([0, dy], 'pawn');
    const startRank = piece.color === 'white' ? 2 : 7;
    if (Number(piece.square[1]) === startRank) addStep([0, 2 * dy], 'pawn');
    for (const dx of [-1, 1]) addStep([dx, dy], 'pawn');
    return out;
  }
  const dirs = piece.type === 'Knight' ? KNIGHT : piece.type === 'King' ? KING : piece.type === 'Bishop' ? DIAGONAL : piece.type === 'Rook' ? ORTHOGONAL : [...ORTHOGONAL, ...DIAGONAL];
  const ray = piece.type !== 'Knight' && piece.type !== 'King';
  for (const direction of dirs) {
    if (!ray) { addStep(direction, 'step'); continue; }
    let path: string[] = [];
    for (let n = 1; n <= 7; n++) {
      const xx = x + direction[0] * n, yy = y + direction[1] * n;
      if (!inBounds(xx, yy)) break;
      const to = squareAt(xx, yy);
      out.push({ to, kind: 'ray', direction, path: [...path] });
      if (at(board, to)) break;
      path = [...path, to];
    }
  }
  return out;
}

function attackSources(board: BoardState, source: AnalysisPiece, relationColor: Color = source.color): AttackSource[] {
  const out: AttackSource[] = [];
  for (const geometry of geometryFor(board, source)) {
    const occupied = at(board, geometry.to);
    // Pawn forward geometry is movement-only; pawn attacks are diagonal.
    if (source.type === 'Pawn' && geometry.direction[0] === 0) continue;
    // A pawn's diagonal attack is valid even when the target is empty.
    // Sliding and stepping attacks include the first occupied square, which is
    // what makes friendly defenders and pinned pieces visible to the debugger.
    out.push({ source: source.id!, target: geometry.to, sourcePiece: { ...source }, kind: source.type === 'Pawn' ? 'pawn' : geometry.kind, direction: geometry.direction, path: geometry.path, occupiedBy: occupied?.id ?? null, occupiedByColor: occupied?.color ?? null, relation: occupied?.color === relationColor ? 'defend' : 'attack', has: { source: source.id!, calculation: 'fn.chess.analyzeFrame', rule: `${source.type}.attacks` } });
  }
  return out;
}

function attacksTo(board: BoardState, target: string, color: Color): AttackSource[] {
  return board.pieces.filter(p => p.color === color).flatMap(p => attackSources(board, p)).filter(a => a.target === target);
}

function cloneAfter(board: BoardState, move: InternalMove): BoardState {
  const pieces = board.pieces.filter(p => p.id !== move.captured?.id).map(p => p.id === move.source.id ? { ...p, square: move.to, ...(move.promotion ? { type: move.promotion } : {}) } : { ...p });
  let fen = board.fen;
  // A pawn's two-square advance creates an en-passant target for the child
  // position.  We do not implement en-passant, so that child is explicitly
  // incomplete for terminal and bounded forecast claims.
  if (fen && move.source.type === 'Pawn' && Math.abs(Number(move.to[1]) - Number(move.source.square[1])) === 2) {
    const midRank = (Number(move.to[1]) + Number(move.source.square[1])) / 2;
    fen = { ...fen, enPassant: `${move.source.square[0]}${midRank}` };
  }
  return { pieces, fen };
}

/** Whether the generated move set is complete for this side in this position. */
export function completeFor(board: BoardState, side: Color): boolean {
  if (!board.fen) return !board.pieces.some(p => p.type === 'Pawn' || p.type === 'Rook');
  const fen = board.fen;
  // An en-passant target matters only when the side to move has a pawn that
  // could capture onto it.  If it does, this bounded analyzer declines to
  // claim terminal status because the history-dependent capture is omitted.
  if (validSquare(fen.enPassant)) {
    const [tx, ty] = xy(fen.enPassant);
    const pawnRank = side === 'white' ? ty - 1 : ty + 1;
    if (board.pieces.some(p => p.color === side && p.type === 'Pawn' && xy(p.square)[1] === pawnRank && Math.abs(xy(p.square)[0] - tx) === 1)) return false;
  }
  const king = board.pieces.find(p => p.color === side && p.type === 'King');
  if (!king || attacksTo(board, king.square, other(side)).length > 0) return true;
  const kingRight = side === 'white' ? fen.castlingRights.includes('K') : fen.castlingRights.includes('k');
  const queenRight = side === 'white' ? fen.castlingRights.includes('Q') : fen.castlingRights.includes('q');
  const rank = side === 'white' ? '1' : '8';
  const rook = (square: string) => board.pieces.find(p => p.color === side && p.type === 'Rook' && p.square === square);
  const empty = (squares: readonly string[]) => squares.every(s => !at(board, s));
  if (king.square === `e${rank}` && kingRight && rook(`h${rank}`) && empty([`f${rank}`, `g${rank}`])) return false;
  if (king.square === `e${rank}` && queenRight && rook(`a${rank}`) && empty([`b${rank}`, `c${rank}`, `d${rank}`])) return false;
  return true;
}

function candidateInternals(board: BoardState, side: Color): InternalMove[] {
  const out: InternalMove[] = [];
  for (const source of board.pieces.filter(p => p.color === side)) {
    for (const geometry of geometryFor(board, source)) {
      const target = at(board, geometry.to);
      const reasons: RejectionReason[] = [];
      if (source.type === 'Pawn') {
        const dx = geometry.direction[0];
        if (dx === 0 && target) reasons.push('blocked');
        if (dx !== 0 && (!target || target.color === side)) reasons.push(target ? 'friendly' : 'empty-capture');
        if (dx === 0 && Math.abs(geometry.direction[1]) === 2) {
          const mid = squareAt(xy(source.square)[0], xy(source.square)[1] + geometry.direction[1] / 2);
          if (at(board, mid)) reasons.push('blocked');
        }
      } else if (target?.color === side) reasons.push('friendly');
      if (target?.type === 'King') reasons.push('king-capture');
      if (source.type === 'Pawn' && geometry.to[1] === (side === 'white' ? '8' : '1')) {
        // Promotion is represented as four deterministic candidate records.
        for (const promotion of PROMOTIONS) out.push({ source, to: geometry.to, promotion, geometry, captured: target, reasons: [...reasons] });
        continue;
      }
      out.push({ source, to: geometry.to, geometry, captured: target, reasons });
    }
  }
  return out;
}

function reasonsForKingSafety(board: BoardState, move: InternalMove): RejectionReason[] {
  const reasons = [...move.reasons];
  if (reasons.length) return reasons;
  const next = cloneAfter(board, move);
  const king = kingOf(next, move.source.color);
  if (attacksTo(next, king.square, other(move.source.color)).length) reasons.push('king-safety');
  return reasons;
}

function coordinateMove(move: InternalMove): string { return `${move.source.square}${move.to}${move.promotion ? `=${move.promotion[0]}` : ''}`; }

function internalLegal(board: BoardState, side: Color): InternalMove[] {
  return candidateInternals(board, side).filter(m => reasonsForKingSafety(board, m).length === 0);
}

function toAttackSource(board: BoardState, source: AnalysisPiece, target: string): AttackSource | null {
  return attackSources(board, source).find(a => a.target === target) ?? null;
}

function material(board: BoardState, side: Color): Record<PieceType, number> {
  const result: Record<PieceType, number> = { King: 0, Queen: 0, Rook: 0, Bishop: 0, Knight: 0, Pawn: 0 };
  for (const p of board.pieces) if (p.color === side) result[p.type]++;
  return result;
}

function scoreMove(board: BoardState, move: InternalMove, next: BoardState, givesCheck: boolean, givesMate: boolean | null, variant: PolicyVariant, complete: boolean): MoveScore {
  const opponent = other(move.source.color);
  const beforeMaterial = board.pieces.filter(p => p.color === move.source.color).reduce((n, p) => n + PIECE_VALUES[p.type], 0);
  const afterMaterial = next.pieces.filter(p => p.color === move.source.color).reduce((n, p) => n + PIECE_VALUES[p.type], 0);
  const capture = move.captured ? PIECE_VALUES[move.captured.type] : 0;
  // Captures are their own component.  materialDelta therefore describes only
  // the moving side's own value change (normally zero; promotion can change it)
  // and cannot accidentally count a capture twice.
  const materialDelta = afterMaterial - beforeMaterial;
  const opponentMateWitnesses: ImmediateMateWitness[] = [];
  for (const reply of complete ? internalLegal(next, opponent) : []) {
    const replyBoard = cloneAfter(next, reply);
    const king = kingOf(replyBoard, move.source.color);
    const checkingSources = attacksTo(replyBoard, king.square, opponent);
    if (checkingSources.length > 0 && internalLegal(replyBoard, move.source.color).length === 0) {
      opponentMateWitnesses.push({ reply: coordinateMove(reply), checkingSources });
    }
  }
  const opponentCanMate = opponentMateWitnesses.length > 0;
  // Both policies are transparent weighted heuristics.  They never change
  // legality or observations; exp only makes tactical forcing moves rank more
  // aggressively for debugger comparison.
  const weights = variant === 'exp'
    ? { mate: 120000, check: 1500, capture: 1.25, opponentMate: -12000 }
    : { mate: 100000, check: 1000, capture: 1, opponentMate: -9000 };
  const components = {
    mate: givesMate === true ? weights.mate : 0,
    check: givesCheck ? weights.check : 0,
    capture: capture * weights.capture,
    materialDelta,
    opponentImmediateMate: opponentCanMate ? weights.opponentMate : 0,
    kingSafety: 0
  } as const;
  const explanation: string[] = [];
  if (givesMate) explanation.push('delivers checkmate'); else if (givesCheck) explanation.push('gives check');
  if (move.captured) explanation.push(`captures ${move.captured.type} (${capture})`);
  if (opponentCanMate) explanation.push('allows an opponent immediate mate');
  if (variant === 'exp') explanation.push('exp policy weights forcing tactics more heavily');
  if (!explanation.length) explanation.push('legal move; no immediate check or capture');
  return { total: components.mate + components.check + components.capture + components.materialDelta + components.opponentImmediateMate + components.kingSafety, components, explanation, opponentMateWitnesses };
}

function sideAnalysis(board: BoardState, side: Color, active: Color, variant: PolicyVariant, complete: boolean): SideAnalysis {
  const checkWitnesses = attacksTo(board, kingOf(board, side).square, other(side));
  const internals = candidateInternals(board, side);
  const candidates: CandidateMove[] = internals.map(move => {
    const reasons = reasonsForKingSafety(board, move);
    const legal = reasons.length === 0;
    const next = legal ? cloneAfter(board, move) : null;
    const givesCheck = !!next && attacksTo(next, kingOf(next, other(side)).square, side).length > 0;
    const childComplete = !!next && completeFor(next, other(side));
    const givesMate: boolean | null = !complete || !childComplete ? null : givesCheck && internalLegal(next!, other(side)).length === 0;
    const kingSafetyWitnesses = !legal && reasons.includes('king-safety') ? attacksTo(cloneAfter(board, move), kingOf(cloneAfter(board, move), side).square, other(side)) : [];
    const reasonText = reasons.map(reason => reason === 'friendly' ? 'friendly piece occupies destination' : reason === 'blocked' ? 'path or pawn advance is blocked' : reason === 'king-safety' ? 'own king remains under attack' : reason === 'king-capture' ? 'capturing a king is not a legal move' : reason === 'empty-capture' ? 'pawn diagonal requires an opposing piece' : 'rule is unsupported in this frame');
    return { id: coordinateMove(move), from: move.source.square, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}), side, source: { ...move.source }, captured: move.captured ? { ...move.captured } : null, status: legal ? 'legal' : 'rejected', legal, reasons, reasonText, kingSafetyWitnesses, givesCheck, givesMate, has: { source: move.source.id!, calculation: 'fn.chess.analyzeFrame', rule: `${move.source.type}.legalMove` }, score: legal && next ? scoreMove(board, move, next, givesCheck, givesMate, variant, complete && childComplete) : null };
  });
  const legalMoves = candidates.filter(m => m.legal).sort((a, b) => (b.score?.total ?? -Infinity) - (a.score?.total ?? -Infinity) || a.id.localeCompare(b.id));
  const relations: PieceRelations[] = board.pieces.filter(p => p.color === side).map(piece => {
    const attacks = attackSources(board, piece);
    return { piece: { ...piece }, attacks, attackedBy: attacksTo(board, piece.square, other(side)), defendedBy: attacksTo(board, piece.square, side) };
  });
  const threatened = board.pieces.filter(p => p.color === side).map(piece => {
    const attackers = attacksTo(board, piece.square, other(side));
    const defenders = attacksTo(board, piece.square, side);
    return { piece: { ...piece }, attackerSources: attackers, defenderSources: defenders, capturableByLegalMove: internalLegal(board, other(side)).some(m => m.to === piece.square && m.captured?.id === piece.id) };
  }).filter(t => t.attackerSources.length);
  const legalCount = legalMoves.length;
  return { side, label: side === active ? 'active side' : 'hypothetical side', pieces: board.pieces.filter(p => p.color === side).map(p => ({ ...p })), material: material(board, side), materialPoints: board.pieces.filter(p => p.color === side && p.type !== 'King').reduce((n, p) => n + PIECE_VALUES[p.type], 0), inCheck: checkWitnesses.length > 0, checkWitnesses, checkmate: complete ? checkWitnesses.length > 0 && legalCount === 0 : null, stalemate: complete ? checkWitnesses.length === 0 && legalCount === 0 : null, moveSetComplete: complete, relations, candidates, legalMoves, threatened };
}

function build(input: PositionInput, sourceFrame?: ReplayFrame, variant: PolicyVariant = 'clean'): FrameAnalysis {
  const sideToMove = input.sideToMove === 'white' || input.sideToMove === 'black' ? input.sideToMove : (() => { throw new Error(`Invalid side to move: ${input.sideToMove}`); })();
  const board = boardFrom(input);
  const metadata = board.fen;
  // Completeness is side-specific: a blocked rook path makes castling
  // irrelevant for that side, while an eligible en-passant target does not.
  const activeComplete = completeFor(board, sideToMove);
  const hypotheticalComplete = completeFor(board, other(sideToMove));
  const activeSide = sideAnalysis(board, sideToMove, sideToMove, variant, activeComplete);
  const hypotheticalSide = sideAnalysis(board, other(sideToMove), sideToMove, variant, hypotheticalComplete);
  const incomplete = !activeComplete;
  const notes = ['Move legality is computed from this position only.', 'Castling and en-passant candidates are omitted because this analysis does not reconstruct move history.'];
  if (metadata?.castlingRights && metadata.castlingRights !== '-') notes.push(`FEN castling rights '${metadata.castlingRights}' are present; castling is omitted, so legal-move completeness is unknown.`);
  if (metadata?.enPassant && metadata.enPassant !== '-') notes.push(`FEN en-passant target '${metadata.enPassant}' is present; en-passant is omitted, so legal-move completeness is unknown.`);
  if (!metadata && incomplete) notes.push('No FEN metadata was supplied and pawn/rook state is present; history-dependent completeness is unknown.');
  const sides = { white: sideToMove === 'white' ? activeSide : hypotheticalSide, black: sideToMove === 'black' ? activeSide : hypotheticalSide } as const;
  const withoutPolicyScores = (moves: readonly CandidateMove[]): Omit<CandidateMove, 'score'>[] => moves.map(({ score: _score, ...facts }) => facts);
  const observed = {
    pieces: { white: sides.white.pieces, black: sides.black.pieces },
    relations: { white: sides.white.relations, black: sides.black.relations },
    check: {
      white: { inCheck: sides.white.inCheck, checkmate: sides.white.checkmate, stalemate: sides.white.stalemate, witnesses: sides.white.checkWitnesses },
      black: { inCheck: sides.black.inCheck, checkmate: sides.black.checkmate, stalemate: sides.black.stalemate, witnesses: sides.black.checkWitnesses }
    },
    candidates: { white: withoutPolicyScores(sides.white.candidates), black: withoutPolicyScores(sides.black.candidates) },
    threatened: { white: sides.white.threatened, black: sides.black.threatened }
  } as const;
  const rankedMoves = {
    white: sides.white.legalMoves.map(m => ({ id: m.id, total: m.score!.total, components: m.score!.components, explanation: m.score!.explanation })),
    black: sides.black.legalMoves.map(m => ({ id: m.id, total: m.score!.total, components: m.score!.components, explanation: m.score!.explanation }))
  } as const;
  return { schema: 'chesslab-analysis@1', fen: metadata, sideToMove, activeSide, hypotheticalSide, sides, limitations: { rules: { castling: { supported: false, status: 'omitted', reason: 'FEN castling rights are retained as metadata, but castling is intentionally omitted because rook/history state is outside this bounded analyzer.' }, enPassant: { supported: false, status: 'omitted', reason: 'FEN en-passant target is retained as metadata, but en-passant is intentionally omitted because the previous move is outside this bounded analyzer.' }, promotion: { supported: true, status: 'enumerated', choices: PROMOTIONS } }, completeForCurrentFrame: !incomplete, notes }, source: { frameSideToMove: String(sourceFrame?.sideToMove ?? input.sideToMove), frameLegalMoves: sourceFrame?.legalMoves ? [...sourceFrame.legalMoves] : null, frameCheck: typeof sourceFrame?.check === 'boolean' ? sourceFrame.check : null, frameCheckmate: typeof sourceFrame?.checkmate === 'boolean' ? sourceFrame.checkmate : null }, observed, policy: { variant, description: variant === 'exp' ? 'Experimental deterministic tactical weights; facts and legality are unchanged.' : 'Clean deterministic material, check, mate, and safety weights.', rankedMoves } };
}

export function analyzeFrame(frame: ReplayFrame, variantOrOptions: PolicyVariant | { readonly policy?: PolicyVariant } = 'clean'): FrameAnalysis {
  const variant = typeof variantOrOptions === 'string' ? variantOrOptions : (variantOrOptions.policy ?? 'clean');
  return build({ fen: frame.fen, pieces: frame.pieces, sideToMove: frame.sideToMove }, frame, variant);
}

export function analyzePosition(position: PositionInput, variant: PolicyVariant = 'clean'): FrameAnalysis {
  return build(position, undefined, variant);
}

/** Alias useful to callers that already materialized frame pieces. */
export const analyze = analyzePosition;
