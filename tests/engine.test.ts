import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {analyze, parseInfoLine} from '../src/engine/uci.ts';
import {materializeEngineAnalysis} from '../src/engine/materialize.ts';

const fixture = fileURLToPath(new URL('./fixtures/fake-uci-engine.mjs', import.meta.url));
const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

test('bounded UCI request parses multipv score WDL PV and is materialized through a Tick', async () => {
  const analysis = await analyze(initialFen, ['e2e4', 'e7e5'], {
    enginePath: process.execPath, engineArgs: [fixture], requestId: 'engine-test-1', nodes: 2_000, multiPv: 2, timeoutMs: 1_000
  });
  assert.equal(analysis.schema, 'chesslab-engine-analysis@1');
  assert.equal(analysis.requestId, 'engine-test-1');
  assert.equal(analysis.position.command, `position fen ${initialFen} moves e2e4 e7e5`);
  assert.equal(analysis.settings.limit.kind, 'nodes');
  assert.equal(analysis.bestmove, 'e2e4');
  assert.equal(analysis.engine.name, 'FixtureFish 0.1');
  assert.deepEqual(analysis.variations[0], {
    multipv: 1, depth: 10, seldepth: 14, score: {kind: 'cp', value: 37, bound: 'exact'}, wdl: {win: 520, draw: 310, loss: 170},
    nodes: 12345, nps: 240000, pv: ['e2e4', 'e7e5', 'g1f3']
  });
  assert.deepEqual(analysis.variations[1]?.score, {kind: 'mate', value: -3, bound: 'exact'});
  const record = materializeEngineAnalysis(analysis);
  assert.equal(record.materialization.requestId, analysis.requestId);
  assert.equal(record.tick.opId, 'chess.materializeEngineAnalysis');
  assert.deepEqual(record.tick.actualConsumes, ['px.chess.engine.completed']);
  assert.deepEqual(record.tick.actualProduces, ['px.chess.engine.analysis']);
  assert.deepEqual(record.tick.frozenCalculations.map(x => x.address), ['fn.chess.materializeEngineAnalysis']);
});

test('info parser accepts sparse updates without fabricating a principal variation', () => {
  assert.equal(parseInfoLine('info string loading'), null);
  assert.deepEqual(parseInfoLine('info depth 4 multipv 2 score cp -11'), {
    multipv: 2, depth: 4, seldepth: null, score: {kind: 'cp', value: -11, bound: 'exact'}, wdl: null, nodes: null, nps: null, pv: []
  });
});

test('an unresponsive engine times out and a cancelled request rejects', async () => {
  const options={enginePath:process.execPath,engineArgs:['-e','process.stdin.resume()'],timeoutMs:100};
  await assert.rejects(analyze(initialFen,[],options),/exceeded 100ms/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(analyze(initialFen,[],{...options,signal:controller.signal}),/cancelled/);
});
