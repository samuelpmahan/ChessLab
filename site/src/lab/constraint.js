/** A Constraint relates computational materials through a named predicate.
 * Definitions are reusable; the caller's Tick records evaluations in PxC.
 */








































/** The materials a predicate receives after its declared addresses resolve. */








/** Structural read-only PxC surface; constraint evaluation never writes. */






/** Compatibility alias for earlier consumers. */











const unique = (addresses                    )            => [...new Set(addresses)];
const requiredAddresses = (constraint            )            => unique([
  ...Object.values(constraint.materials),
  ...constraint.basis.observations,
  ...constraint.basis.assumptions
]);

function unknown(reason        , details                                    )                     {
  return { status: 'unknown', reason, ...(details ? { details } : {}) };
}

function evaluateLeaf(reader           , constraint            )                       {
  const required = requiredAddresses(constraint);
  const missing = required.filter(address => !reader.has(address));
  if (missing.length) {
    return { constraint, ...unknown(`Required materials unavailable: ${missing.join(', ')}`), reads: [], missing };
  }

  const values = new Map                  ();
  for (const address of required) values.set(address, reader.get(address));
  const byAddress = (addresses                    )                                     => Object.fromEntries(addresses.map(address => [address, values.get(address)]));
  const materials = Object.fromEntries(Object.entries(constraint.materials).map(([name, address]) => [name, values.get(address)]));
  const judgment = reader.call                                     ({address: constraint.predicate}, {
    materials,
    observations: byAddress(constraint.basis.observations),
    assumptions: byAddress(constraint.basis.assumptions)
  });
  return { constraint, ...judgment, reads: required, missing: [] };
}

function groupJudgment(group                 , members                                 )                     {
  if (!members.length) throw new Error(`Constraint group '${group.id}' has no members.`);
  const statuses = members.map(member => member.status);
  if (group.operator === 'all') {
    if (statuses.includes('violated')) return { status: 'violated', reason: `At least one member of '${group.label}' is violated.` };
    if (statuses.every(status => status === 'satisfied')) return { status: 'satisfied', reason: `All members of '${group.label}' are satisfied.` };
    return { status: 'unknown', reason: `No member of '${group.label}' is violated, but at least one is unknown.` };
  }
  if (statuses.includes('satisfied')) return { status: 'satisfied', reason: `At least one member of '${group.label}' is satisfied.` };
  if (statuses.every(status => status === 'violated')) return { status: 'violated', reason: `All members of '${group.label}' are violated.` };
  return { status: 'unknown', reason: `No member of '${group.label}' is satisfied, but at least one is unknown.` };
}

/** Evaluates declarative constraints only; callers retain ownership of every board write. */
export function evaluateConstraint(reader           , constraint                )                       {
  if (constraint.kind === 'constraint') return evaluateLeaf(reader, constraint);
  if (!constraint.members.length) throw new Error(`Constraint group '${constraint.id}' has no members.`);
  const members = constraint.members.map(member => evaluateConstraint(reader, member));
  return {
    constraint,
    ...groupJudgment(constraint, members),
    reads: unique(members.flatMap(member => member.reads)),
    missing: unique(members.flatMap(member => member.missing)),
    children: members
  };
}
