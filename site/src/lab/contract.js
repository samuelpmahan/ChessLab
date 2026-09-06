// Shared exec contract for the compiled-operation execution model
// (Wave 1A). Types only — no runtime logic lives here, so both chunks
// (A: compiler/gateway/receipts under src/exec/**; B: g0/adapters/UI) can
// depend on a stable shape from minute one, before either side's design
// has settled.
//
// R1 (browser-safe core): everything below describes DATA. Writing an
// artifact or receipt to disk is the job of an INJECTED sink the caller
// hands to executeCompiledPlan — never something a type here performs.
// This file imports nothing and reaches no I/O.

/** The five verbs an operation is allowed to be. */


/**
 * Reference to a named value flowing through a compiled plan. Deliberately
 * a plain string, not a closed enum: R2 requires operations at a finer
 * grain than the existing engine units, so the slot namespace has to stay
 * open (e.g. 'badgeStage.brightMask', 'badgeStage.components',
 * 'assignment.scoring', 'assignment.selection') without this file growing
 * every time a unit gets decomposed further. Legality of who-produces-
 * before-who-consumes is enforced by the compiler's dependency walk, not
 * by the type system.
 */


/**
 * One node in the operation DAG. A single engine unit (e.g. badgeStage,
 * assignment) may decompose into several OperationSpecs; `unit` carries
 * the owning unit purely as a grouping/trace-display label — it is never
 * consulted for scheduling. Ordering and legality come entirely from
 * `consumes`/`produces` plus the compiled execution list.
 */






	                        













	                                                                              




/** One executable calculation frozen at the moment a Tick ran. */










/** How one PxC address changed while a Tick ran. */





/** Kinds of artifacts an operation may hand to the sink. */













/**
 * Content-addressed reference to an artifact the sink has stored. `uri` is
 * sink-defined (a file:// path from the Node sink, an in-memory handle
 * from a browser/collector sink) — the exec core never interprets it,
 * only carries it through the receipt.
 */
/** Pixel dimensions of a raster-shaped payload (rgba/mask/scalarField/
 * orientationField), in image-px. Present only when the producing extractor
 * had them in hand; the payload bytes themselves never carry shape. */
















/** A single named numeric observation captured during an operation's run. */





/**
 * Per-operation execution record. `declared*` comes from the OperationSpec;
 * `actual*` comes from what the operation really touched on the evidence
 * board while running. The two diverging is a conformance failure the
 * gateway surfaces rather than silently accepting.
 */
















/**
 * A Tick is the existing gateway Receipt understood as inspection testimony:
 * exact addresses in, frozen calculations, exact addresses out.  It adds no
 * execution authority and deliberately has no run() method.
 */


/**
 * Placeholder import point for the canonical input type (resolved config +
 * image + params — the thing planFingerprint hashes alongside op
 * universe). Landing as `unknown` so downstream code (Chunk B, the
 * compiler) has a stable name to import today; narrows to a real shape in
 * a follow-up commit once the compiler's needs are settled. Do not widen
 * this ad hoc from a consuming file — narrow it here.
 */

