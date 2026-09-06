# LAB arena: first batch

The players are agents. Stockfish analysis is a material a player may be allowed
to inspect, and Stockfish can also occupy a player seat. An agent's submitted
rationale is a public explanation; it is not a recording of private reasoning.

This first CLI batch exercises the path from a position through an observation,
a submitted move, legal execution, and a retained outcome. Short tactical games
are execution probes, not evidence of learning or general playing strength.

## Run

```sh
npm ci
npm run engine:install
npm run arena:smoke
npm run arena -- example
```

The optional installer downloads the pinned npm Stockfish 18.0.8 archive and
keeps only the Lite Single runtime and license locally. The download is larger
than the retained runtime. A native UCI engine can be selected with
`STOCKFISH_PATH=/path/to/stockfish`. No model API key is needed.

Create an agent game with `npm run arena -- init --dir /tmp/my-match --id demo
--visibility full --max-plies 8`. `observe --dir /tmp/my-match --seat white`
returns the current position and legal UCI commands. Submit a JSON file containing
`gameId`, `revision`, `seat`, `move`, and a short `rationale` through
`submit --dir /tmp/my-match --file request.json`. Use `status` between turns and
`export-pgn` afterward. Reusing an old revision is rejected.

`arena:smoke` plays the three-ply Opera Game finish with the installed engine in
both seats. It requires White checkmate, records every engine result and Tick,
and fails rather than quietly substituting a mock engine. This verifies a known
forced finish; it does not measure general strength against a strong opponent.

Opponent skill is configurable with `engine-turn --skill 0..20`; the default is
20. Skill is retained alongside the search budget in each engine analysis.
`node scripts/arena-review.mjs MATCH_DIRECTORY` performs a separate bounded
post-game review of at most six plies without altering player observations.

The first [Terra XHigh ladder](../trials/2026-09-06/xhigh-ladder/README.md) found
that filtering the visible candidates hid an already-computed mating reply.
Full observations now expose immediate-mate risks independently of that filter.
The [fresh-player repair probe](../trials/2026-09-06/xhigh-repair/README.md)
avoided that mate but lost a queen, preserving a second concrete teaching case.

## Computational ownership

- The rules adapter validates moves and reconstructs game history.
- The engine adapter bounds external search and retains its configuration and output.
- A Tick imports completed engine analysis into PxC. External process execution
  and synchronous materialization are distinct operations.
- Constraint definitions refer to named materials and predicates. Their caller's
  Tick records evaluations; the evaluator does not write to PxC.
- Arena observations project the material available to a seat. Visibility changes
  what is shown, not chess legality or the position being analyzed.

## Small batches

Use at most two active agent players in a batch, finite game lengths, and bounded
single-thread engine searches. Stop on terminal positions, the ply budget, or an
execution error. A ply-cap result is unfinished, not a draw or victory. No retry
storm, recursive model scheduler, or unattended tournament is needed.

The CLI does not call a model API. An orchestrator gives each player its current
observation, receives a move, submits it, and returns the next observation when
that player's turn arrives. Thus the same protocol can serve a human, a Terra,
or a scripted player without embedding credentials or model-specific code.

## What to compare

Start with paired short positions under full and blind observations. Preserve
the initial position, seat identities, visibility, legal history, observations,
submitted rationales, rejected requests, and final result. A stronger study would
also counterbalance colors, reset player context, and use unfamiliar positions.

Visibility in this shared developer workspace is a cooperative protocol, not a
security sandbox: player agents could read other files if instructed to do so.
Trials must report that boundary. A controlled benchmark needs isolated player
processes/workspaces and evaluator-only analysis.

Useful failures include a missing relationship, a false constraint, a player
ignoring a visible relationship, and a projection that fails to make a correct
relationship understandable. A score change alone does not identify which one
occurred. Refine the relevant composition and test it on a fresh position.

## Browser scope

The existing browser debugger remains a projection of its current chess
cartridge. This CLI batch does not silently turn it into a full game client or
download a browser engine. Node process and filesystem modules are excluded
from the Pages build. The arena is the producer interface for a later teaching
board integration.
