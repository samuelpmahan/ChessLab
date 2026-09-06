# CHESSLAB — inspect both sides

[Open the debugger](https://samuelpmahan.github.io/ChessLab/).
Black's model sits on the left, the board in the middle, White's model on the right.
Select a piece or candidate move to inspect its relationships and reasons. Step the
replay to see those relationships change. The side that is not to move is explicitly
an **if-this-side-moved-now** analysis.

The panels expose a deterministic policy built for inspection. They are not the
historical players' recovered thoughts, a Stockfish evaluation, or win probabilities.
The policy can be wrong in an instructive, inspectable way.

## Run

Node 22.18+; no dependency install needed.

```sh
npm start             # terminal replay
npm run debug         # print the King/Queen specimen
npm run sequence      # print the historical finish
npm test
npm run build
```

Terminal commands: `next`, `back`, `replay 0..3`, `mind black`, `mind white`,
`run` (full shared debugger payload), `run exp` (experimental policy), and `study`.
In the King/Queen study: `inspect WQ`, `why`, `place WK e5`, `turn black`,
`history`, `receipt`, `save FILE`, `load FILE`, `reset`.
`place` edits a position; it does not play a legal move.

## One LAB execution path

Both browser and terminal call `runDebugger(frame, variant)`. Views project its
returned values; they do not maintain another move generator or scoring engine.

| Stage | Reads | Writes | Calculation |
| --- | --- | --- | --- |
| S0: piece construction | `px.chess.frame` | `px.chess.objects` | `fn.chess.materializePieces` |
| S1: relationships and decisions | frame + S0 objects | `px.chess.analysis` | `fn.chess.analyzeFrame` |

`clean/` is the default; `exp/` selects alternative policy weights. Both use the
same observations and legality. Receipts record actual accesses and called
calculation identities. Runtime-function hashes cover that function's body, not its
transitive dependencies; timing fields naturally vary between runs. The host is
synchronous, with no transactional rollback or complete PCR/gateway/tidy integration.

The source substrate `src/lab/board.ts` and `contract.ts` came from ChainSpot
Sweep-Ready (`lab/dev-pathfinding`, head `60f53cd9ae8ab210dc73aa884086e315dccbe0a2`,
implementation `9a6a69e1e5c6568fe1875faa8d303f7de4677824`). Access tracking now also
retains calls and registered implementations. Chess remains the domain cartridge.

## What the model contains

- All six piece types, with position-local IDs, color, square and construction source.
- Attack geometry, blockers, defenders, threatened pieces and checking sources.
- Candidate moves, legal/rejected outcomes and hypothetical king-safety witnesses.
- Deterministic score components for captures, promotion, check, mate and an
  opponent's immediate mating reply. The score is a heuristic, not an engine score.
- Separate position facts and policy rankings; raw data and receipts remain inspectable.

An attack is not a legal move: a pinned piece can still attack a square, pawns
attack diagonally, and kings are never capture candidates. Check corresponds to:

```text
mine.king.square IN opponent.active_pieces.attacks.squares.set
```

There is no general PxCQL parser yet. The six-piece analysis is a small positional
model; castling/en-passant support and history adjudication are explicitly bounded
in its output. It does not establish historical reachability. No broad strategy or
long search is implied by the short tactical horizon.

The original editable King/Queen specimen is still available under **Study**:
White king f6, White queen g7, Black king h8, Black to move. Moving the white king
to e5 removes its protection of the queen and opens a legal capture.

## Learning cases

Case records retain source links, full published game scores, verified snapshots,
and short teaching notes. The model computes its own relationships and legal
moves; tests compare them with independently generated python-chess fixtures.
Historical notes are distinguished from computed policy rankings.

The Deep Fritz–Kramnik finish demonstrates a missed mate-in-one and coordination
between the queen and knight. It was a blunder from a defensible position, not a
verified losing-to-winning comeback. The source score is in
`fixtures/fritz-kramnik.pgn`. The Opera Game case follows `Qb8+ Nxb8 Rd8#`,
showing deflection and rook/bishop coordination. Regenerate its snapshots with
`python scripts/generate-learning-cases.py` (requires python-chess). Source FEN
metadata, including retained castling rights, is preserved.

## Materialization and publishing

`DebugMaterializer(value, view)` is a pure text projection. CLI `mind` exposes the
same debugger snapshot used by the browser. Board labels retain both type and
color (`Kw`, `Kb`, `Nw`), while browser selections highlight relationships.

Pages publishes `main` / root. Run `npm run build` and commit `site/` and
`index.html` with source changes. The build fingerprints all compiled model/view
inputs and versions module URLs, including domain-only edits. CI checks tests
and generated-output parity. GitHub's branch Pages publisher is the only deployer.
