# Terra XHigh ladder: benchmark the interface

One fresh `gpt-5.6-terra` player at **xhigh** reasoning effort played White
against Stockfish 18 Lite WASM at Skill Levels 0, 8, and 16 in sequence. The agent
kept its context between rounds. Each round began at the same Fritz–Kramnik
position before 34.Nxf8, with a six-ply cap. Only the configured Skill Level
changed: one engine thread, 32 MB hash, 20,000 requested nodes per move, and a
five-second timeout. Skill numbers are engine settings, not measured Elo ratings.

The player received public FEN/legal moves and the same frozen compact PxC mind
view throughout this ladder. Engine search results were withheld until post-game
review. The observation protocol was cooperative in a shared workspace.

| Stockfish Skill | Terra XHigh actual line | Outcome |
| --- | --- | --- |
| 0 | Nxf8 Bxb2 Qh7# | White wins, 3 plies |
| 8 | Nxf8 Kg8 Qxb4 Qa6 Qe7 Qf1# | Black wins, 6 plies |
| 16 | Nxf8 Kg8 Qxb4 Qf7 Qd6 Qf1# | Black wins, 6 plies |

Terminal checkmate takes precedence over the cap: the last two games are losses,
not unfinished games. This is one short position, with stochastic weakened play,
not an Elo estimate or proof that increasing Skill always produces stronger play.

## The discovered interface failure

After both losses the actor reported that it had not received useful warning of
the mating reply. The retained materializations let us check that explanation.

Before **Qe7**, the domain analysis already contained:

```json
{
  "id": "b4e7",
  "score": {
    "total": -9000,
    "explanation": ["allows an opponent immediate mate"],
    "opponentMateWitnesses": [{"reply": "a6f1"}]
  }
}
```

Before **Qd6**, it similarly retained the mating reply `f7f1`. Both selected moves
were outside the five preferred candidates shown by the compact observation.
The computation had found the problem; the projection did not deliver it to the
player. The actor's account is therefore a useful report about its view, not an
accurate description of everything PxC had materialized.

## Repair after freezing these results

Full observations now include `mind.summary.immediateMateRisks`, independently
of the preferred-candidate limit. These alerts retain the candidate, exact
opponent reply, checking piece, source square, target king square, and path.
Their constraint evaluations are executed in the same Tick. The full underlying
constraint definition remains in the archived materialization.

A regression test loads the failed position, verifies that Qe7 is still outside
the top five, confirms the visible Qf1 warning, then legally executes both moves
and verifies Black checkmate. The original ladder observations are unchanged.

## Engine control and limits

The matched engine-only control is in `../xhigh-control/`. Skill-20 Stockfish
played White against the same three nominal settings: it won the Skill-0 round
in three plies and reached the six-ply cap at Skills 8 and 16. Weakened engine
choices were not seeded or matched move-for-move between conditions.

The starting position has a defensible continuation; a bounded engine search
evaluates its best line near equality. A strong opponent need not allow a win.
These rounds establish a concrete interface failure and a reproducible repair;
they do not establish broad strength, teaching efficacy, or a learning effect.

Each round retains `match.json`, `events.jsonl`, `game.pgn`, `review.json`, and
the exact materializations referenced by observations. Review analyses were
produced after play and were not shown to the actors.
