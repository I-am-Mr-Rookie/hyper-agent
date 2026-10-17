import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import DockerExecutor from '../src/executor/DockerExecutor.js';
import ResultParser from '../src/executor/ResultParser.js';

// Offline unit checks; run with `node --test tests/executor.test.js` (no Docker or API needed).
function frame(type, text) {
  const body = Buffer.from(text);
  const header = Buffer.alloc(8);
  header[0] = type;
  header.writeUInt32BE(body.length, 4);
  return Buffer.concat([header, body]);
}

describe('DockerExecutor.runCommand', () => {
  it('reassembles stdout/stderr frames split across stream chunks', async () => {
    const all = Buffer.concat([frame(1, 'x'.repeat(70000)), frame(2, 'err')]);
    const stream = new EventEmitter();
    const exec = {
      start: (_options, callback) => {
        callback(null, stream);
        setImmediate(() => {
          for (const chunk of [all.subarray(0, 5), all.subarray(5, 40000), all.subarray(40000)]) stream.emit('data', chunk);
          stream.emit('end');
        });
      },
      inspect: async () => ({ ExitCode: 0 }),
    };
    const container = { exec: async () => exec, kill: async () => {} };

    const result = await Object.create(DockerExecutor.prototype).runCommand(container, 'true', null, 5, '');
    assert.strictEqual(result.stdout.length, 70000);
    assert.strictEqual(result.stderr, 'err');
  });
});

describe('ResultParser', () => {
  it('reports SIGKILL without a timeout as a runtime error, not TLE', () => {
    const parser = new ResultParser();
    assert.strictEqual(parser.parse({ exitCode: 137, timedOut: false }, {}).status.id, 12);
    assert.strictEqual(parser.parse({ exitCode: 137, timedOut: true }, {}).status.id, 5);
  });
});
