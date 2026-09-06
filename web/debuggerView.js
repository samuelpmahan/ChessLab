/* DOM-only renderer for the debugger HUD. It projects PxC-owned data; it does not
 * infer chess facts or calculate legal moves. Every user-facing value is assigned
 * through textContent. */

const isObject = value => value !== null && typeof value === 'object';
const arr = value => Array.isArray(value) ? value : [];
const asText = value => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isObject(value)) {
    if (typeof value.label === 'string') return value.label;
    if (typeof value.name === 'string') return value.name;
    if (typeof value.id === 'string') return value.id;
    if (typeof value.reason === 'string') return value.reason;
    if (typeof value.description === 'string') return value.description;
    return JSON.stringify(value);
  }
  return String(value);
};

export function snapshotOf(result) {
  if (!isObject(result)) return {};
  return isObject(result.snapshot) ? result.snapshot : (isObject(result.state) ? result.state : result);
}

export function ticksOf(result) {
  if (!isObject(result)) return [];
  return arr(result.ticks ?? result.receipts ?? result.trace);
}

export function frameOf(snapshot, fallback) {
  if (isObject(snapshot.frame)) return snapshot.frame;
  if (isObject(snapshot.observed?.frame)) return snapshot.observed.frame;
  if (isObject(snapshot.position?.frame)) return snapshot.position.frame;
  if (isObject(snapshot.input)) return snapshot.input;
  return fallback ?? {};
}

export function piecesOf(snapshot, fallbackFrame) {
  const frame = frameOf(snapshot, fallbackFrame);
  return arr(snapshot.pieces ?? snapshot.observed?.pieces ?? snapshot.position?.pieces ?? frame.pieces);
}

export function pieceSquare(piece) { return String(piece?.square ?? piece?.at ?? ''); }
export function pieceLabel(piece) {
  if (typeof piece?.label === 'string') return piece.label;
  const color = piece?.color === 'white' ? 'w' : piece?.color === 'black' ? 'b' : '';
  const typeNames = {King: 'K', Queen: 'Q', Rook: 'R', Bishop: 'B', Knight: 'N', Pawn: 'P'};
  const type = typeNames[piece?.type] ?? (typeof piece?.type === 'string' ? piece.type[0] : '');
  return `${type}${color}` || String(piece?.id ?? 'piece');
}
export function sideOf(snapshot, fallbackFrame) {
  const frame = frameOf(snapshot, fallbackFrame);
  return String(snapshot.sideToMove ?? snapshot.position?.sideToMove ?? frame.sideToMove ?? 'unknown');
}

function sideValue(snapshot, color) {
  const sides = snapshot.sides ?? snapshot.players ?? snapshot.analysis;
  if (isObject(sides) && isObject(sides[color])) return sides[color];
  const side = snapshot[color];
  if (isObject(side)) return side;
  return {};
}

function firstList(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

export function candidatesOf(snapshot, color) {
  return arr(snapshot.sides?.[color]?.legalMoves);
}

export function threatsOf(snapshot, color) {
  return arr(snapshot.sides?.[color]?.threatened);
}

export function policyOf(snapshot, color) {
  const side = sideValue(snapshot, color);
  if (isObject(side.policy)) return side.policy;
  if (isObject(side.score)) return side.score;
  if (isObject(snapshot.policy?.sides?.[color])) return snapshot.policy.sides[color];
  if (isObject(snapshot.policy?.[color])) return snapshot.policy[color];
  if (isObject(snapshot.policy)) return snapshot.policy;
  return {};
}

export function repliesOf(snapshot, color) {
  return arr(snapshot.sides?.[color]?.legalMoves).flatMap(move =>
    arr(move.score?.opponentMateWitnesses).map(witness=>({...witness, after:move.id})));
}

function heading(text) {
  const h = document.createElement('h3');
  h.textContent = text;
  return h;
}
function line(text, className = '') {
  const p = document.createElement('p');
  if (className) p.className = className;
  p.textContent = text;
  return p;
}
function listItem(text, className = '') {
  const li = document.createElement('li');
  if (className) li.className = className;
  li.textContent = text;
  return li;
}
function block(title, body) {
  const section = document.createElement('section');
  section.className = 'readout-block';
  section.append(heading(title));
  if (body) section.append(body);
  return section;
}
function listBlock(title, values, formatter, empty = 'No debugger data reported.') {
  const section = block(title);
  const list = document.createElement('ol');
  list.className = 'readout-list';
  if (!values.length) list.append(listItem(empty, 'empty'));
  values.forEach((value, index) => list.append(formatter(value, index)));
  section.append(list);
  return section;
}
function rawBlock(title, value) {
  const details = document.createElement('details');
  details.className = 'raw-block';
  const summary = document.createElement('summary');
  summary.textContent = title;
  details.append(summary);
  const pre = document.createElement('pre');
  try { pre.textContent = JSON.stringify(value, null, 2); }
  catch { pre.textContent = '[unserializable]'; }
  details.append(pre);
  return details;
}

export function candidateRelation(candidate) {
  if (typeof candidate === 'string') return {source:candidate.slice(0,2),target:candidate.slice(2,4)};
  return {source:candidate?.from ?? candidate?.source?.square ?? '',target:candidate?.to ?? ''};
}

function candidateButton(candidate, index, onCandidate) {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'candidate-button';
  const relation = candidateRelation(candidate);
  const move = relation.source && relation.target ? `${relation.source} → ${relation.target}` : asText(candidate?.move ?? candidate?.notation ?? candidate?.san ?? candidate);
  const reason = candidate.score?.explanation?.join('; ') || candidate.reasonText?.join('; ');
  const score = candidate?.score?.total;
  const scoreText = score !== undefined && (typeof score === 'string' || typeof score === 'number') ? ` · score ${score}` : '';
  button.textContent = `#${index + 1} ${move}${scoreText}${reason ? ` · ${asText(reason)}` : ''}`;
  button.setAttribute('aria-label', `${candidate.side} candidate ${move}`);
  button.addEventListener('click', () => onCandidate?.(candidate, index));
  li.append(button);
  return li;
}

function materialLines(snapshot, color, pieces) {
  const side = sideValue(snapshot, color);
  const material = side.material ?? snapshot.material?.[color] ?? snapshot.material;
  if (Array.isArray(material)) return material.map(asText);
  if (isObject(material)) return Object.entries(material).map(([key, value]) => `${key}: ${asText(value)}`);
  const own = pieces.filter(piece => {
    const pieceColor = piece?.color ?? (String(piece?.label ?? '').endsWith('w') ? 'white' : String(piece?.label ?? '').endsWith('b') ? 'black' : '');
    return pieceColor === color;
  });
  return own.map(piece => `${pieceLabel(piece)} @ ${pieceSquare(piece)}`);
}

function policyLines(policy) {
  if (!isObject(policy)) return [];
  const ranked = Array.isArray(policy.rankedMoves) ? policy.rankedMoves : Array.isArray(policy.candidates) ? policy.candidates : [];
  if (ranked.length) return ranked.slice(0, 5).map(item => {
    const id = item.id ?? `${item.from ?? '?'}→${item.to ?? '?'}`;
    const score = item.total ?? item.score?.total;
    const components = item.components ?? item.score?.components;
    const explanation = item.explanation ?? item.score?.explanation;
    const pieces = [`${id}${score === undefined ? '' : ` score=${score}`}`];
    if (components && isObject(components)) pieces.push(Object.entries(components).map(([key, value]) => `${key}:${value}`).join(' '));
    if (Array.isArray(explanation) && explanation.length) pieces.push(explanation.join('; '));
    return pieces.join(' · ');
  });
  const components = policy.components ?? policy.explanation ?? policy.reasons ?? policy.factors;
  if (Array.isArray(components)) return components.map(asText);
  if (isObject(components)) return Object.entries(components).map(([key, value]) => `${key}: ${asText(value)}`);
  return Object.entries(policy).filter(([key]) => !['candidates', 'replies'].includes(key)).map(([key, value]) => `${key}: ${asText(value)}`);
}

function formatThreat(threat) {
  const li = document.createElement('li');
  if (threat?.piece?.square && Array.isArray(threat?.attackerSources)) {
    const attackers = threat.attackerSources.map(source => `${pieceLabel(source.sourcePiece)} ${source.sourcePiece.square} → ${source.target}`).join(', ');
    li.textContent = `${threat.piece.square} threatened${attackers ? ` · ${attackers}` : ''}`;
    return li;
  }
  const source = threat?.source ?? threat?.attacker?.square ?? threat?.piece?.square ?? '';
  const target = threat?.target ?? threat?.kingSquare ?? threat?.victim?.square ?? '';
  const kind = threat?.kind ?? threat?.type ?? threat?.reason;
  li.textContent = source || target ? `${source || '?'} → ${target || '?'}${kind ? ` · ${asText(kind)}` : ''}` : asText(threat);
  return li;
}

function formatReply(reply) {
  const li = document.createElement('li');
  const relation = candidateRelation(reply);
  const text = relation.source && relation.target ? `${relation.source} → ${relation.target}` : asText(reply?.move ?? reply?.notation ?? reply);
  const reason = reply?.reason ?? reply?.why ?? reply?.explanation;
  li.textContent = `${text}${reason ? ` · ${asText(reason)}` : ''}`;
  return li;
}

export function renderSide(container, color, snapshot, pieces, {onCandidate} = {}) {
  container.replaceChildren();
  const side = snapshot.sides[color];
  const active = snapshot.sideToMove === color;
  const title = document.createElement('div');
  title.className = 'side-title';
  title.textContent = `${color.toUpperCase()} / ${active ? 'TO MOVE' : 'IF MOVING NOW'}`;
  container.append(title);
  const status = side.checkmate ? 'CHECKMATE — no legal escape' : side.inCheck ? 'CHECK — king must be protected' : side.stalemate ? 'STALEMATE — no legal move, no check' : 'King is not in check';
  container.append(block('Position',line(`${status} · ${side.legalMoves.length} legal option${side.legalMoves.length===1?'':'s'}${side.moveSetComplete ? '' : ' (partial rules)'}`)));
  const own = document.createElement('p'); own.className='piece-inventory';
  own.textContent = side.pieces.map(p=>`${pieceLabel(p)} ${p.square}`).join(' · ');
  const inventory = block(`Material: ${side.materialPoints / 100} points · kings excluded`,own);
  container.append(inventory);
  container.append(listBlock('Under attack', threatsOf(snapshot,color), formatThreat, 'No piece is under attack.'));
  const candidates = candidatesOf(snapshot,color);
  const intent = candidates[0];
  const thinking = block('Policy lens',line(intent ? `I prioritize ${intent.id.slice(0,2)} → ${intent.to}: ${intent.score.explanation.join('; ')}.` : 'No legal move to rank.'));
  thinking.append(line('Mate / check / captures / immediate mate risk. Heuristic points; no engine or win probability.','muted'));
  container.append(thinking);
  container.append(listBlock('Top choices · select to decompose',candidates.slice(0,5),(c,i)=>candidateButton(c,i,onCandidate),'No legal candidates.'));
  if(candidates.length>5){
    const more=document.createElement('details'); more.className='raw-block';
    const summary=document.createElement('summary');summary.textContent=`All ${candidates.length} legal candidates`;more.append(summary);
    more.append(listBlock('Legal candidates',candidates,(c,i)=>candidateButton(c,i,onCandidate)));container.append(more);
  }
  const risky=candidates.filter(c=>c.score?.opponentMateWitnesses?.length);
  if(risky.length)container.append(listBlock('Moves that allow mate next',risky,(c,i)=>candidateButton(c,i,onCandidate)));
  const rejected=side.candidates.filter(c=>!c.legal);
  const rejectedDetails=document.createElement('details');rejectedDetails.className='raw-block';
  const rs=document.createElement('summary');rs.textContent=`Why not? ${rejected.length} rejected moves`;rejectedDetails.append(rs);
  rejectedDetails.append(listBlock('Rejected candidates',rejected,(c,i)=>candidateButton(c,i,onCandidate),'None'));container.append(rejectedDetails);
}

export function renderBoard(container, snapshot, fallbackFrame, selected, {onPiece} = {}) {
  const pieces = piecesOf(snapshot, fallbackFrame);
  const bySquare = new Map(pieces.map(piece => [pieceSquare(piece), piece]));
  const relation = selected?.relation ?? {};
  container.replaceChildren();
  const corner = document.createElement('span');
  corner.className = 'board-label corner';
  corner.textContent = '';
  container.append(corner);
  for (const file of 'abcdefgh') {
    const label = document.createElement('span');
    label.className = 'board-label file-label';
    label.textContent = file;
    container.append(label);
  }
  const end = document.createElement('span');
  end.className = 'board-label corner';
  end.textContent = '';
  container.append(end);
  for (let rank = 8; rank >= 1; rank -= 1) {
    const rankLabel = document.createElement('span');
    rankLabel.className = 'board-label rank-label';
    rankLabel.textContent = String(rank);
    container.append(rankLabel);
    for (const file of 'abcdefgh') {
      const square = `${file}${rank}`;
      const piece = bySquare.get(square);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `board-cell ${(file.charCodeAt(0) + rank) % 2 ? 'dark' : 'light'}`;
      cell.dataset.square = square;
      if (square === relation.source) cell.classList.add('relation-source');
      if (square === relation.target) cell.classList.add('relation-target');
      if (square === selected?.piece?.square) cell.classList.add('selected-piece');
      if (selected?.relations?.some(item => item.target === square)) cell.classList.add('relation-target');
      if (square === selected?.changed?.source) cell.classList.add('changed-source');
      if (square === selected?.changed?.target) cell.classList.add('changed-target');
      const label = pieceLabel(piece);
      const symbol = document.createElement('span');
      symbol.className = 'piece-glyph';
      symbol.textContent = piece ? ({Kw:'♔',Qw:'♕',Rw:'♖',Bw:'♗',Nw:'♘',Pw:'♙',Kb:'♚',Qb:'♛',Rb:'♜',Bb:'♝',Nb:'♞',Pb:'♟'}[label] ?? label) : '·';
      cell.append(symbol);
      if (piece) {
        const pieceCode = document.createElement('span');
        pieceCode.className = 'piece-code';
        pieceCode.textContent = label;
        cell.append(pieceCode);
      }
      const coordinate = document.createElement('span');
      coordinate.className = 'cell-coordinate';
      coordinate.textContent = square;
      cell.append(coordinate);
      cell.setAttribute('aria-label', piece ? `${square}, ${label}` : `${square}, empty`);
      cell.addEventListener('click', () => onPiece?.(piece, square));
      container.append(cell);
    }
    const endRank = document.createElement('span');
    endRank.className = 'board-label rank-label';
    endRank.textContent = String(rank);
    container.append(endRank);
  }
  const bottomCorner = document.createElement('span');
  bottomCorner.className = 'board-label corner';
  bottomCorner.textContent = '';
  container.append(bottomCorner);
  for (const file of 'abcdefgh') {
    const label = document.createElement('span');
    label.className = 'board-label file-label';
    label.textContent = file;
    container.append(label);
  }
  container.append(document.createElement('span'));
}

export function modelAnalysis(snapshot, frame) {
  const title = frame?.title ?? snapshot?.title ?? 'Current frame';
  const note = frame?.note ?? snapshot?.note ?? '';
  return {title: String(title), note: String(note)};
}

export function snapshotSummary(snapshot, frame) {
  const side = sideOf(snapshot, frame);
  const check = snapshot?.check ?? snapshot?.checkStatus ?? snapshot?.observed?.checkStatus?.[side];
  if (!isObject(check)) return `${side.toUpperCase()} TO MOVE${check === undefined ? '' : ` · CHECK ${asText(check).toUpperCase()}`}`;
  const labels = [];
  if (check.inCheck ?? check.value ?? check.status ?? check.state) labels.push('CHECK');
  if (check.checkmate) labels.push('MATE');
  if (check.stalemate) labels.push('STALEMATE');
  return `${side.toUpperCase()} TO MOVE${labels.length ? ` · ${labels.join(' / ')}` : ''}`;
}

export function renderSelection(container, selection, snapshot) {
  container.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = 'SELECTION';
  container.append(title);
  const body = document.createElement('span');
  if (selection?.candidate) {
    const candidate = selection.candidate;
    const relation = candidateRelation(candidate);
    const score = candidate.score?.total ?? candidate.score?.value ?? candidate.total;
    const bits = [`${relation.source || candidate.from || '?'} → ${relation.target || candidate.to || '?'}`];
    if (score !== undefined) bits.push(`score=${score}`);
    if (candidate.legal !== undefined) bits.push(candidate.legal ? 'legal' : 'rejected');
    if (candidate.givesCheck !== undefined) bits.push(candidate.givesCheck ? 'gives check' : 'no check');
    if (candidate.givesMate !== undefined && candidate.givesMate !== null) bits.push(candidate.givesMate ? 'gives mate' : 'no mate');
    body.textContent = bits.join(' · ');
    container.append(document.createElement('br'), body);
    const explanation = candidate.score?.explanation ?? candidate.reasonText ?? candidate.explanation;
    if (Array.isArray(explanation) && explanation.length) {
      const reason = document.createElement('span');
      reason.textContent = `Why: ${explanation.join('; ')}`;
      container.append(document.createElement('br'), reason);
    }
    const components = candidate.score?.components ?? candidate.components;
    if (isObject(components)) {
      const parts = document.createElement('span');
      parts.textContent = `Components: ${Object.entries(components).map(([key, value]) => `${key}=${value}`).join(' ')}`;
      container.append(document.createElement('br'), parts);
    }
    const witnesses = [...arr(candidate.kingSafetyWitnesses), ...arr(candidate.score?.opponentMateWitnesses)];
    if (Array.isArray(witnesses) && witnesses.length) {
      const witness = document.createElement('span');
      witness.textContent = `Replies / witnesses: ${witnesses.map(item => {
        const sources = item.checkingSources ?? [];
        const evidence = sources.length ? sources.map(source => `${source.sourcePiece?.type ?? 'Piece'} ${source.sourcePiece?.square ?? source.source} attacks ${source.target}`).join(', ') : `${item.sourcePiece?.type ?? 'Piece'} ${item.sourcePiece?.square ?? item.source} attacks ${item.target}`;
        return `${item.reply ? `${item.reply.slice(0,2)} → ${item.reply.slice(2,4)}: ` : ''}${evidence}`;
      }).join('; ')}`;
      container.append(document.createElement('br'), witness);
    }
    if (candidate.has !== undefined) {
      const provenance = document.createElement('span');
      provenance.textContent = `Construction: ${candidate.has.calculation} · ${candidate.has.rule}`;
      container.append(document.createElement('br'), provenance);
    }
    return;
  }
  if (selection?.piece) {
    const piece = selection.piece;
    const id = piece.id ?? piece.label ?? piece.square;
    const relation = selection.pieceRelation;
    body.textContent = `${id} @ ${pieceSquare(piece)} · ${piece.type ?? pieceLabel(piece)}`;
    container.append(document.createElement('br'), body);
    if (relation) {
      const line = document.createElement('span');
      const attackTargets = arr(relation.attacks).map(item => item.target).join(', ') || 'none';
      const defendedBy = arr(relation.defendedBy).map(item => item.source).join(', ') || 'none';
      const attackedBy = arr(relation.attackedBy).map(item => item.source).join(', ') || 'none';
      line.textContent = `Attacks: ${attackTargets} · Defended by: ${defendedBy} · Attacked by: ${attackedBy}`;
      container.append(document.createElement('br'), line);
    }
    const movement = {King:'One square in any direction; may never enter an opponent attack.',Queen:'Any distance along a rank, file, or diagonal; stops at the first piece.',Rook:'Any distance horizontally or vertically; stops at the first piece.',Bishop:'Any distance diagonally; stops at the first piece.',Knight:'Two squares along one axis and one along the other; jumps over pieces.',Pawn:'Moves forward into empty squares; attacks one square diagonally forward.'};
    container.append(line(movement[piece.type] ?? ''));
    const notes = snapshot?.observed?.limitations?.completeForCurrentFrame ? [] : snapshot?.observed?.limitations?.notes;
    if (Array.isArray(notes) && notes.length) {
      const hint = document.createElement('span');
      hint.textContent = `Rule scope: ${notes.join('; ')}`;
      container.append(document.createElement('br'), hint);
    }
    return;
  }
  body.textContent = 'Click a piece or ranked candidate to inspect its relations.';
  container.append(document.createElement('br'), body);
}

export function renderRaw(container, snapshot, ticks) {
  container.replaceChildren(rawBlock('Raw snapshot', snapshot), rawBlock('PxC provenance / ticks', ticks));
}
