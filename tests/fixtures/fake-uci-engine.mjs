import readline from 'node:readline';
const rl = readline.createInterface({input: process.stdin});
let readyCount = 0;
rl.on('line', line => {
  if (line === 'uci') {
    console.log('id name FixtureFish 0.1');
    console.log('id author ChessLab');
    console.log('option name Threads type spin default 1 min 1 max 4');
    console.log('uciok');
  } else if (line === 'isready') {
    console.log('readyok'); readyCount += 1;
  } else if (line.startsWith('go ')) {
    console.log('info depth 10 seldepth 14 multipv 1 score cp 37 wdl 520 310 170 nodes 12345 nps 240000 pv e2e4 e7e5 g1f3');
    console.log('info depth 10 seldepth 12 multipv 2 score mate -3 nodes 11200 pv d2d4 d7d5');
    setTimeout(() => console.log('bestmove e2e4 ponder e7e5'), 10);
  }
});
