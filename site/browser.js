import {renderBoardStory} from './boardStory.js?v=39bcfefb661b1c4e536ad75dac14d6b55666cbddf86d9d219da356a444d0894d';
import {famousGame} from './src/famousGame.js?v=39bcfefb661b1c4e536ad75dac14d6b55666cbddf86d9d219da356a444d0894d';
import {learningCases} from './src/learningCases.js?v=39bcfefb661b1c4e536ad75dac14d6b55666cbddf86d9d219da356a444d0894d';
import {prepareStudyFrame, moveStudyPiece, turnStudyFrame, studyPieceMatches} from './src/chess/study.js?v=39bcfefb661b1c4e536ad75dac14d6b55666cbddf86d9d219da356a444d0894d';
import {runDebugger} from './src/chess/debugger.js?v=39bcfefb661b1c4e536ad75dac14d6b55666cbddf86d9d219da356a444d0894d';
import {
  snapshotOf, ticksOf, frameOf, piecesOf, pieceLabel, pieceSquare, sideOf,
  candidateRelation, renderSide, renderBoard, renderRaw, modelAnalysis,
  snapshotSummary, renderSelection
} from './debuggerView.js?v=39bcfefb661b1c4e536ad75dac14d6b55666cbddf86d9d219da356a444d0894d';

const availableCases = Array.isArray(learningCases) && learningCases.length ? learningCases : [famousGame];
let activeCase = availableCases.find(item => item.id === famousGame.id) ?? availableCases[0];
let replayFrames = Array.isArray(activeCase.frames) ? activeCase.frames : [];
const output = document.querySelector('#output');
const input = document.querySelector('#command');
const boardGrid = document.querySelector('#board-grid');
const cache = new Map();
const defaults = {layout: 'split', theme: 'green', fit: true, size: 14, policy: 'clean'};
let prefs = {...defaults};
let policyVariant = 'clean';
let replayMode = true;
let replayIndex = 0;
let studyFrame = studySeed();
let studyHistory = [];
let selected = {piece: null, relation: null, changed: null};
let current = {frame: replayFrames[0] ?? studyFrame, result: null, snapshot: {}, ticks: []};

function studySeed() {
  return prepareStudyFrame({
    title: 'King + Queen study',
    note: 'Editable frame sent to the PxC debugger. Analysis is produced by the configured debugger.',
    fen: '7k/6Q1/5K2/8/8/8/8/8 b - - 0 1',
    pieces: [
      {square: 'f6', label: 'Kw'},
      {square: 'g7', label: 'Qw'},
      {square: 'h8', label: 'Kb'}
    ],
    sideToMove: 'black',
    change: null
  });
}

function safeJson(value) {
  try { return JSON.stringify(value); } catch { return ''; }
}
function frameKey(frame, variant = 'clean') { return `${activeCase.id ?? 'case'}:${variant}:${safeJson(frame)}`; }
function runFrame(frame, variant = policyVariant) {
  const key = frameKey(frame, variant);
  if (cache.has(key)) return cache.get(key);
  const result = runDebugger(frame, variant);
  const entry = {frame, result, snapshot: snapshotOf(result), ticks: ticksOf(result)};
  cache.set(key, entry);
  return entry;
}
function currentFrame() { return replayMode ? replayFrames[replayIndex] : studyFrame; }
function ensureCurrent() {
  const frame = currentFrame();
  const key = frameKey(frame, policyVariant);
  const cached = cache.get(key);
  current = cached ?? runFrame(frame, policyVariant);
  return current;
}
function print(value) {
  const text = String(value ?? '');
  output.textContent += (output.textContent ? '\n' : '') + text;
  output.scrollTop = output.scrollHeight;
}
function printJson(value) {
  try { print(JSON.stringify(value, null, 2)); } catch { print('[unserializable]'); }
}
function analysisText(entry) {
  const analysis = modelAnalysis(entry.snapshot, entry.frame);
  const side=entry.snapshot.sides[entry.snapshot.sideToMove];
  return `${analysis.title}\n${snapshotSummary(entry.snapshot,entry.frame)}\n${side.checkWitnesses.map(w=>`${w.sourcePiece.type} on ${w.sourcePiece.square} attacks the king on ${w.target}`).join('\n')}\n${side.legalMoves.length} legal options.\n${side.legalMoves.slice(0,3).map(c=>`${c.from} → ${c.to}: ${c.score.explanation.join('; ')} (score ${c.score.total})`).join('\n')}`;
}
function selectedRelationForCandidate(candidate) {
  const relation = candidateRelation(candidate);
  return relation.source || relation.target ? relation : null;
}
function updateSelection() {
  const entry = ensureCurrent();
  renderBoard(boardGrid, entry.snapshot, entry.frame, selected, {
    onPiece: piece => {
      selected.piece = piece ?? null;
      selected.candidate = null;
      selected.relation = null;
      const color = piece?.color ?? (pieceLabel(piece).endsWith('w') ? 'white' : 'black');
      const relations = entry.snapshot.sides?.[color]?.relations ?? [];
      selected.pieceRelation = piece ? relations.find(item => item.piece?.id === piece.id || item.piece?.square === pieceSquare(piece)) : null;
      selected.relations = selected.pieceRelation?.attacks?.map(item => ({source: pieceSquare(piece), target: item.target})) ?? [];
      updateSelection();
    }
  });
  renderSelection(document.querySelector('#selection-readout'), selected, entry.snapshot);
  requestAnimationFrame(paintStory);
}
function render() {
  const entry = ensureCurrent();
  if(selected.candidate) selected.candidate = entry.snapshot.sides[selected.candidate.side].candidates.find(c=>c.id===selected.candidate.id) ?? null;
  const pieces = piecesOf(entry.snapshot, entry.frame);
  renderSide(document.querySelector('#black-panel'), 'black', entry.snapshot, pieces, {
    onCandidate: candidate => { selected.relation = selectedRelationForCandidate(candidate); selected.relations = selected.relation ? [selected.relation] : []; selected.candidate = candidate; selected.piece = null; selected.pieceRelation = null; updateSelection(); }
  });
  renderSide(document.querySelector('#white-panel'), 'white', entry.snapshot, pieces, {
    onCandidate: candidate => { selected.relation = selectedRelationForCandidate(candidate); selected.relations = selected.relation ? [selected.relation] : []; selected.candidate = candidate; selected.piece = null; selected.pieceRelation = null; updateSelection(); }
  });
  renderBoard(boardGrid, entry.snapshot, entry.frame, selected, {
    onPiece: piece => {
      selected.piece = piece ?? null;
      selected.candidate = null;
      selected.relation = null;
      const color = piece?.color ?? (pieceLabel(piece).endsWith('w') ? 'white' : 'black');
      const relations = entry.snapshot.sides?.[color]?.relations ?? [];
      selected.pieceRelation = piece ? relations.find(item => item.piece?.id === piece.id || item.piece?.square === pieceSquare(piece)) : null;
      selected.relations = selected.pieceRelation?.attacks?.map(item => ({source: pieceSquare(piece), target: item.target})) ?? [];
      updateSelection();
    }
  });
  renderSelection(document.querySelector('#selection-readout'), selected, entry.snapshot);
  requestAnimationFrame(paintStory);
  const analysis = modelAnalysis(entry.snapshot, entry.frame);
  document.querySelector('#analysis-title').textContent = analysis.title;
  document.querySelector('#analysis-note').textContent = analysis.note || 'No model analysis note reported.';
  const sourceLink=document.querySelector('#case-source');sourceLink.hidden=!replayMode;sourceLink.href=activeCase.source;
  document.querySelector('#mode-label').textContent = replayMode ? 'REPLAY' : 'STUDY';
  const frameCount = replayFrames.length;
  document.querySelector('#status').textContent = replayMode
    ? `Frame ${replayIndex} / ${Math.max(0, frameCount - 1)} · ${snapshotSummary(entry.snapshot, entry.frame)}`
    : `Study frame · ${snapshotSummary(entry.snapshot, entry.frame)} · edits recompute through debugger`;
  renderRaw(rawInspector, entry.snapshot, entry.ticks);
  updateCommandState();
  requestAnimationFrame(fitBoard);
}
function updateCommandState() {
  for (const button of document.querySelectorAll('[data-command]')) {
    const command = button.dataset.command;
    const isReplayOnlyDisabled = replayMode && ['inspect WQ', 'place WK e5', 'save', 'load'].includes(command);
    button.disabled = isReplayOnlyDisabled || (command === 'back' && replayIndex === 0) || (command === 'next' && replayIndex >= replayFrames.length - 1);
  }
}
function setReplay(index = 0) {
  replayMode = true;
  replayIndex = Math.max(0, Math.min(replayFrames.length - 1, Number(index) || 0));
  selected = {piece: null, relation: null, changed: replayFrames[replayIndex]?.change ?? null};
  render();
}
function chooseCase(id) {
  const next = availableCases.find(item => item.id === id);
  if (!next) throw Error('Unknown learning case');
  activeCase = next;
  replayMode = true;
  replayFrames = Array.isArray(activeCase.frames) ? activeCase.frames : [];
  replayIndex = 0;
  selected = {piece: null, relation: null, changed: replayFrames[0]?.change ?? null};
  render();
}
function setStudy() {
  replayMode = false;
  selected = {piece: null, relation: null, changed: studyFrame.change ?? null};
  render();
}
function editStudyPlace(id, square) {
  const next = moveStudyPiece(studyFrame, id, square);
  studyFrame = next;
  studyHistory.push({kind: 'place', piece: id, square, frame: studyFrame});
  selected = {piece: null, relation: null, changed: studyFrame.change};
  render();
}
function inspect(id) {
  const entry = ensureCurrent();
  const piece = piecesOf(entry.snapshot, entry.frame).find(item => studyPieceMatches(item, id));
  if (!piece) throw Error('Unknown piece ID');
  printJson(piece);
}
function saveState() {
  const frame = replayMode ? current.frame : studyFrame;
  const payload = {schema: 'chesslab-state@1', frame, position: {pieces: frame.pieces, sideToMove: frame.sideToMove}};
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'}));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'chesslab-state.json'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  print('Downloaded state.');
}
function normalizeLoadedFrame(value) {
  const source = value?.frame ?? value?.position?.frame ?? value;
  const pieces = source?.pieces ?? value?.position?.pieces ?? value?.pieces;
  if (!Array.isArray(pieces)) throw Error('State has no pieces');
  const converted = pieces.map(piece => {
    if (piece.label) return {...piece};
    const type = ({King: 'K', Queen: 'Q', Rook: 'R', Bishop: 'B', Knight: 'N', Pawn: 'P'})[piece.type] ?? String(piece.type ?? '')[0];
    const color = piece.color === 'white' ? 'w' : piece.color === 'black' ? 'b' : '';
    if (!type || !color || !piece.square) throw Error('Unsupported piece shape');
    return {...piece, label: `${type}${color}`};
  });
  return prepareStudyFrame({...source, title: source?.title ?? 'Loaded study', note: source?.note ?? 'Loaded frame sent to the PxC debugger.', fen: source?.fen ?? value?.fen ?? '', pieces: converted, sideToMove: source?.sideToMove ?? value?.position?.sideToMove ?? value?.sideToMove ?? 'white', change: null});
}
async function loadState() {
  const file = document.querySelector('#upload').files[0];
  if (!file) return;
  const parsed = JSON.parse(await file.text());
  if (parsed.schema && parsed.schema !== 'chesslab-state@1') throw Error('Unsupported schema');
  studyFrame = normalizeLoadedFrame(parsed);
  studyHistory.push({kind: 'load', frame: studyFrame});
  setStudy();
  print('Loaded frame and recomposed through debugger.');
}
function execute(line) {
  const trimmed = String(line ?? '').trim();
  const [cmd, ...args] = trimmed.split(/\s+/);
  if (!cmd) return;
  print('> ' + trimmed);
  try {
    if (cmd === 'clear') output.textContent = '';
    else if (cmd === 'run') {
      const variant = args[0] === 'exp' ? 'exp' : args[0] === 'clean' ? 'clean' : policyVariant;
      policyVariant = variant; prefs.policy = variant; applyPrefs();
      const entry = ensureCurrent(); render(); printJson({variant: entry.result?.variant ?? variant, ticks: entry.ticks, snapshot: entry.snapshot});
    }
    else if (cmd === 'why') print(analysisText(ensureCurrent()));
    else if (cmd === 'replay') setReplay(args.length ? Number(args[0]) : 0);
    else if (cmd === 'next') setReplay(replayIndex + 1);
    else if (cmd === 'back') setReplay(replayIndex - 1);
    else if (cmd === 'study') setStudy();
    else if (cmd === 'inspect') inspect(args[0]);
    else if (cmd === 'place') { if (replayMode) throw Error('Switch to Study before editing'); editStudyPlace(args[0], args[1]); print('Position recomposed through debugger.'); }
    else if (cmd === 'turn') { if (replayMode) throw Error('Switch to Study before editing'); if (!['white', 'black'].includes(args[0])) throw Error('Turn must be white or black'); studyFrame = turnStudyFrame(studyFrame, args[0]); studyHistory.push({kind: 'turn', sideToMove: args[0], frame: studyFrame}); render(); }
    else if (cmd === 'reset') { studyFrame = studySeed(); studyHistory = []; setStudy(); print('Study frame restored.'); }
    else if (cmd === 'history') print(studyHistory.length ? studyHistory.map((item, index) => `${index + 1} ${item.kind}${item.piece ? ` ${item.piece}` : ''}${item.square ? ` → ${item.square}` : ''}`).join('\n') : 'No study edits.');
    else if (cmd === 'receipt') printJson(ensureCurrent().ticks);
    else if (cmd === 'save') saveState();
    else if (cmd === 'load') document.querySelector('#upload').click();
    else if (cmd === 'board') render();
    else print('why | inspect [ID] | place ID SQUARE | turn white/black | history | receipt | reset | save | load | clear');
    updateCommandState();
  } catch (error) { setTerminal(true); print('ERROR: ' + (error?.message ?? String(error))); }
}

for (const button of document.querySelectorAll('[data-command]')) button.addEventListener('click', () => execute(button.dataset.command));
document.querySelector('#form').addEventListener('submit', event => { event.preventDefault(); execute(input.value); input.value = ''; });
const caseChoice = document.querySelector('#case-choice');
for (const item of availableCases) {
  const option = document.createElement('option');
  option.value = String(item.id ?? 'case');
  option.textContent = String(item.title ?? item.id ?? 'Learning case');
  caseChoice.append(option);
}
caseChoice.value = String(activeCase.id ?? 'case');
caseChoice.addEventListener('change', event => { try { chooseCase(event.target.value); } catch (error) { setTerminal(true); print('ERROR: ' + (error?.message ?? String(error))); } });
document.querySelector('#upload').addEventListener('change', async event => { try { await loadState(); } catch (error) { setTerminal(true); print('ERROR: ' + (error?.message ?? String(error))); } finally { event.target.value = ''; } });

try {
  const saved = JSON.parse(localStorage.getItem('chesslab.display') || '{}');
  if (['split', 'stack', 'board'].includes(saved.layout)) prefs.layout = saved.layout;
  if (['green', 'amber', 'ice'].includes(saved.theme)) prefs.theme = saved.theme;
  if (['clean', 'exp'].includes(saved.policy)) prefs.policy = saved.policy;
  if (typeof saved.fit === 'boolean') prefs.fit = saved.fit;
  if (Number.isFinite(saved.size)) prefs.size = Math.max(11, Math.min(22, saved.size));
} catch {}
function paintStory(){
 if(!current.result)return;
 const focus={...selected,nextMove:replayMode?replayFrames[replayIndex+1]?.change:null};
 renderBoardStory(boardGrid,current.snapshot,current.frame,focus);
}
function fitBoard() {
  const box = document.querySelector('#viewport');
  if (!box || !prefs.fit) { document.documentElement.style.setProperty('--board-size', ''); boardGrid.style.width = ''; requestAnimationFrame(paintStory); return; }
  const size = Math.max(80, Math.min(box.clientWidth - 20, box.clientHeight - 20));
  document.documentElement.style.setProperty('--board-size', `${size}px`);
  boardGrid.style.width = `${size}px`;
  requestAnimationFrame(paintStory);
}
function applyPrefs() {
  policyVariant = prefs.policy === 'exp' ? 'exp' : 'clean';
  document.body.dataset.layout = prefs.layout;
  document.body.dataset.theme = prefs.theme;
  document.documentElement.style.setProperty('--size', `${prefs.size}px`);
  document.querySelector('#layout-choice').value = prefs.layout;
  document.querySelector('#policy-choice').value = prefs.policy;
  document.querySelector('#theme-choice').value = prefs.theme;
  document.querySelector('#fit').checked = prefs.fit;
  document.querySelector('#text-size').value = prefs.size;
  document.querySelector('#size-label').textContent = String(prefs.size);
  try { localStorage.setItem('chesslab.display', JSON.stringify(prefs)); } catch {}
  requestAnimationFrame(fitBoard);
}
for (const [id, key] of [['layout-choice', 'layout'], ['theme-choice', 'theme'], ['fit', 'fit'], ['text-size', 'size']]) {
  document.getElementById(id).addEventListener('input', event => {
    prefs[key] = key === 'fit' ? event.target.checked : key === 'size' ? Number(event.target.value) : event.target.value;
    applyPrefs();
  });
}
document.querySelector('#policy-choice').addEventListener('input', event => {
  policyVariant = event.target.value === 'exp' ? 'exp' : 'clean';
  prefs.policy = policyVariant;
  applyPrefs();
  render();
});
document.querySelector('#defaults').addEventListener('click', () => { prefs = {...defaults}; applyPrefs(); render(); });
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fitBoard).observe(document.querySelector('#viewport'));
document.addEventListener('keydown', event => {
  if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement?.tagName) || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); execute('next'); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); execute('back'); }
  if (event.key === '/') { event.preventDefault(); setTerminal(true); if (prefs.layout === 'board') { prefs.layout = 'split'; applyPrefs(); } input.focus(); }
});

// Existing users may have saved the former board-only layout. The migration is
// intentionally one-way: once this new HUD is seen, explicit choices persist.
try {
  const marker = localStorage.getItem('chesslab.hud-v2');
  if (!marker && prefs.layout === 'board') { prefs.layout = 'split'; localStorage.setItem('chesslab.hud-v2', '1'); }
  else if (!marker) localStorage.setItem('chesslab.hud-v2', '1');
} catch {}

function setTerminal(open){document.body.dataset.console=open?'open':'closed';document.querySelector('#terminal-toggle').setAttribute('aria-expanded',String(open));requestAnimationFrame(fitBoard);}
document.querySelector('#terminal-toggle').addEventListener('click',()=>setTerminal(document.body.dataset.console!=='open'));
const rawInspector = document.querySelector('#provenance');
applyPrefs();
try { ensureCurrent(); render(); print('Select Next to follow the finish. Explain shows model analysis from the current frame.'); }
catch (error) { print('ERROR: debugger unavailable: ' + (error?.message ?? String(error))); }
