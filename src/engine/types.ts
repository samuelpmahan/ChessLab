/** Data produced by one bounded UCI request. Browser-safe: no process or I/O. */
export interface EngineScore {
  readonly kind: 'cp' | 'mate';
  /** Centipawns for `cp`, mating distance in moves for `mate`; always from side-to-move. */
  readonly value: number;
  /** UCI may report only a lower or upper bound instead of an exact score. */
  readonly bound: 'exact' | 'lower' | 'upper';
}

export interface EngineWdl {
  readonly win: number;
  readonly draw: number;
  readonly loss: number;
}

export interface EngineVariation {
  readonly multipv: number;
  readonly depth: number | null;
  readonly seldepth: number | null;
  readonly score: EngineScore | null;
  readonly wdl: EngineWdl | null;
  readonly nodes: number | null;
  readonly nps: number | null;
  readonly pv: readonly string[];
}

export interface EngineSettings {
  readonly threads: number;
  readonly hashMb: number;
  readonly multiPv: number;
  /** Stockfish UCI Skill Level, where 20 is strongest. */
  readonly skillLevel: number;
  readonly limit: Readonly<{ readonly kind: 'movetime' | 'nodes'; readonly value: number }>;
  readonly timeoutMs: number;
}

export interface EnginePosition {
  readonly fen: string;
  readonly moves: readonly string[];
  /** The exact bounded UCI position command sent to the engine. */
  readonly command: string;
}

export interface EngineIdentity {
  readonly command: string;
  /** Command arguments, e.g. the cached WASM launcher passed to Node. */
  readonly arguments: readonly string[];
  readonly name: string | null;
  readonly author: string | null;
  readonly protocol: 'uci';
}

export interface EngineCompletedAnalysis {
  readonly schema: 'chesslab-engine-analysis@1';
  /** Identifies this request and keeps simultaneous positions distinct. */
  readonly requestId: string;
  readonly position: EnginePosition;
  readonly settings: EngineSettings;
  readonly engine: EngineIdentity;
  readonly bestmove: string | null;
  readonly ponder: string | null;
  readonly variations: readonly EngineVariation[];
  readonly startedAtMs: number;
  readonly completedAtMs: number;
  readonly durationMs: number;
}
