# Fresh-player probe after the projection repair

A fresh `gpt-5.6-terra` **xhigh** player received the repaired full observation
at the Skill-8 failure position. It was not told which move failed before, and
could not consult the original actor or engine analysis under its cooperative
reading instructions. Black used Skill 16 with 20,000 requested nodes.

The new player selected **Qc4+** and Black answered **Qxc4**. The two-ply probe
then stopped as **unfinished**, not a win or draw. Its submitted public account
said it used the check candidates and immediate-mate-risk list to avoid Qf1.

The repaired projection exposed the already-computed mate danger. The new
decision nevertheless lost White's queen. This is not evidence of improved
overall play. It identifies the next useful domain composition: a checking
piece may itself be legally captured, with an inspectable reply showing how.
Such a capture is a fact to expose, not an unconditional ban on sacrifices.

The original failure is covered by a deterministic regression test. This single
fresh-agent probe is illustrative, not a controlled estimate of the repair's
effect. Exact observations, source materialization, submitted rationale and
actual moves are retained here.
