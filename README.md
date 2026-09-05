# CHESSLAB — one composed state

King, Queen, Board, attack constructions, Check, and Checkmate in a dependency-free terminal workbench. Requires Node 22.18+ (tested with Node 24.19).

```sh
npm start
npm run demo
npm test
```

No npm install is needed. Piece labels include color: Kw/Qw are White; Kb/Qb are Black.

Start with White king f6, White queen g7, Black king h8; Black to move.

- `why`: expand Checkmate into its checking attack and every candidate response.
- `inspect WQ`: expand a piece's `attacks.squares.set` and `has` constructions.
- `inspect`: print the complete composed state.
- `place WK e5`: edit the specimen. The queen becomes capturable, so mate becomes false.
- `turn white` / `turn black`: edit side to move (invalid positions rejected).
- `history`: compare retained compositions and content hashes.
- `receipt`: show occurrence, calculation address, predecessor hash, PxC reads/writes.
- `save FILE` / `load FILE`: save JSON; loading validates and recomputes relationships.
- `reset`, `board`, `quit`.

`place` is position editing, not playing a legal move. Refine constructors in `src/state.ts` and rerun to refine the model itself. Session history records position revisions; model revisions currently live in source/Git.

## Composition

`px.chess.position` holds the Board. `fn.chess.compose` produces `px.state.chess`.

The proposed PxCQL expression is displayed and implemented directly:

```
mine.king.square IN opponent.active_pieces.attacks.squares.set
```

There is no general PxCQL parser yet. Check retains matching attack witnesses. Each attack retains its piece, direction, intervening path, endpoint occupancy, and descriptive calculation address. King and Queen attack addresses identify direct helpers; only the aggregate `fn.chess.compose` is registered in PxC in this slice.

Checkmate retains Check plus complete candidate-response coverage for the supported King/Queen domain. Each candidate retains hypothetical occupancy and attacks that reject it. Captures remove the captured piece before king safety is assessed. An enemy king is never a capture candidate. Attack geometry is independent of whether the attacking piece could legally move without exposing its own king.

This is a position study tool, not a full chess engine: only King and Queen types, exactly one king per side, no pawns/castling/en-passant/promotion or game-history adjudication. Validation rejects overlap, adjacent kings, unsupported pieces, and check on the side not to move; it does not prove historical reachability. State hashes identify JSON content, not transitive source/dependency identity. Receipts use existing access testimony but are not full PCRs.

## Source provenance

`src/lab/board.ts` and `contract.ts` come from the supplied ChainSpot Sweep-Ready bundle, `lab/dev-pathfinding` head `60f53cd9ae8ab210dc73aa884086e315dccbe0a2`, implementation commit `9a6a69e1e5c6568fe1875faa8d303f7de4677824`. Only the board's local type-import extension was changed for native Node TypeScript execution.

The existing PxC and access tracking are reused without ThreeFactor, Stage Sweep, or an engine integration. The chess model and terminal shell are new. `tidy`, stage layout, and `clean/exp/` integration remain the shared LAB-seam work; this specimen does not redefine those contracts.

## DebugMaterializer

Run `npm run debug` to print the composed specimen and its response trace, then exit.
The CLI and browser use the same pure `boardView` and `whyView` projections through
`DebugMaterializer(value, view)`. It does not recompute or mutate the supplied state.
LAB owns this domain-neutral text boundary; the chess cartridge supplies the views.
This is a small host seam, not yet the complete cartridge loader/stage integration.

## Famous-game replay

`npm run replay`: step through the last three turns of Deep Fritz–Kramnik (2006, game 2) with `next`, `back`, or `replay 0..3`. `study` returns to the editable K/Q specimen. `npm run sequence` prints every frame. The browser offers the same replay controls and text projection.

The full published score is in `fixtures/fritz-kramnik.pgn`; four snapshots were generated and checked using python-chess 1.11.2. This is a historical replay with verified move data, not an expansion of the live King/Queen composer. All pieces stay on the board. No winning percentages are invented. Generic LAB replay navigation materializes `px.story.cursor` and `px.story.frame`; chess supplies frames and a view.

## First cartridge execution

In the terminal, `replay 0` then `run` loads the chess cartridge and executes S0/clean against the selected historical frame. The shared host uses ChainSpot's OperationSpec and trackAccess. `px.chess.frame` becomes `px.chess.objects`: all six piece types, position-local IDs, colors, squares and construction sources. `run` prints the actual access record and objects. No chess behavior is inferred from the labels. Cross-move identities, compiled gateway/PCR, tidy enforcement and exp selection remain unfinished integration work.
