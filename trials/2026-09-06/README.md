# First bounded arena batch

Four fresh `gpt-5.6-terra` player contexts at **low** reasoning effort played two
games, with at most two players active concurrently. Both began at the Opera
Game's position before White's sixteenth move. Players received FEN/legal moves,
not its name or historical continuation. This familiar position may nevertheless
be recognizable to a model.

| Trial | Actual continuation | Result |
| --- | --- | --- |
| Terra / full view | Rxd7 Kxd7 Qb7+ Ke8 Qb8+ Kd7 | Unfinished at six-ply cap |
| Terra / blind view | Qb7 Qxa2 Qc8# | White checkmate after three plies |
| Stockfish in both seats | Qb8+ Nxb8 Rd8# | White checkmate after three plies |

These are smoke trials, not a controlled comparison of visibility or learning.
The full view changed during the run: early observations had only check
judgments; a later observation had detailed materializations large enough to
truncate tool output; final observations used a compact mind summary. One blind
player attempt encountered a transient source syntax error before observing and
was retried after repair. Exact issued observations and submitted rationales
remain in each match's `events.jsonl`. Player blindness was cooperative in a
shared workspace, not enforced filesystem isolation.

The Stockfish run used the same installed **Stockfish 18 Lite WASM** for both
seats with one thread, 32 MB hash, 20,000 requested search nodes per move, and a
five-second process timeout. Three calls completed. Search node totals can
slightly exceed the requested count as the engine stops. It demonstrates that
the bestmove → legal execution → next position → checkmate loop works from a
known forced win, not general playing strength.

## Useful counterexamples produced

Post-game `review.json` records separate bounded Stockfish analysis through each
played position. These results were not given to the actors.

- **The initial position contains mate in two:** Stockfish returns `Qb8+ Nxb8
  Rd8#`. Neither Terra White selected that first move.
- **Full-view Black described 17...Ke8 as sheltering its king and preserving a
  decisive material advantage.** The subsequent engine search instead finds
  White mate in three beginning `Qb5+`. White then missed it with `Qb8+`.
- **Blind-view Black described ...Qxa2 as useful infiltration.** White answered
  with actual checkmate. The difference between an attractive attack and a
  response that permits mate is an immediately reusable constraint target.

No numerical centipawn subtraction is made across a mate score. Reviews keep
`cp` and `mate` distinct, retain search bounds, and normalize their displayed
scores to White's perspective. A terminal mate score of zero needs the recorded
winner/board state for interpretation.

The next comparison should freeze the producer, use several unfamiliar
positions, and counterbalance colors. This batch's concrete gain is the working
arena and exposed failure cases—not a demonstrated learning effect.
