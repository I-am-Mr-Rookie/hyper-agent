import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import DockerExecutor from '../src/executor/DockerExecutor.js';
import ResultParser, { compareOutput } from '../src/executor/ResultParser.js';
import IsolateExecutor from '../src/executor/IsolateExecutor.js';

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
  it('demuxes a large frame in many small chunks without quadratic copying', async () => {
    // 16 MB in 16 KB chunks took 1.3-4 s with per-chunk concatenation; linear demux takes ~60 ms.
    const all = frame(1, 'x'.repeat(16 * 1024 * 1024));
    const stream = new EventEmitter();
    const exec = {
      start: (_options, callback) => {
        callback(null, stream);
        setImmediate(() => {
          for (let i = 0; i < all.length; i += 16384) stream.emit('data', all.subarray(i, i + 16384));
          stream.emit('end');
        });
      },
      inspect: async () => ({ ExitCode: 0 }),
    };
    const container = { exec: async () => exec, kill: async () => {} };

    const startedAt = Date.now();
    const result = await Object.create(DockerExecutor.prototype).runCommand(container, 'true', null, 60, '');
    assert.strictEqual(result.stdout.length, 16 * 1024 * 1024);
    assert.ok(Date.now() - startedAt < 500, `demux took ${Date.now() - startedAt} ms`);
  });
});

describe('ResultParser', () => {
  it('reports SIGKILL without a timeout as a runtime error, not TLE', () => {
    const parser = new ResultParser();
    assert.strictEqual(parser.parse({ exitCode: 137, timedOut: false }, {}).status.id, 12);
    assert.strictEqual(parser.parse({ exitCode: 137, timedOut: true }, {}).status.id, 5);
  });
});

describe('ResultParser expected-output judging', () => {
  const parser = new ResultParser();

  it('judges the full stdout, not the 64 KB display-truncated copy', () => {
    const big = 'y'.repeat(70000);
    const parsed = parser.parse({ exitCode: 0, stdout: big, timedOut: false }, { expected_output: big });
    assert.strictEqual(parsed.status.id, 3);
    assert.ok(parsed.stdout.endsWith('[truncated]'));
  });

  it('reports Wrong Answer when the output differs', () => {
    const parsed = parser.parse({ exitCode: 0, stdout: '41\n', timedOut: false }, { expected_output: '42\n' });
    assert.strictEqual(parsed.status.id, 4);
  });

  it('leaves non-Accepted verdicts alone', () => {
    const parsed = parser.parse({ exitCode: 139, stdout: '', timedOut: false }, { expected_output: '42\n' });
    assert.strictEqual(parsed.status.id, 7);
  });
});

describe('IsolateExecutor.buildResult expected-output judging', () => {
  it('judges the full stdout and reports Wrong Answer on mismatch', () => {
    const isolate = Object.create(IsolateExecutor.prototype);
    const big = 'z'.repeat(70000);
    assert.strictEqual(isolate.buildResult({ isoStatus: 'OK', exitCode: 0, stdout: big }, { expected_output: big }).status.id, 3);
    assert.strictEqual(isolate.buildResult({ isoStatus: 'OK', exitCode: 0, stdout: '1' }, { expected_output: '2' }).status.id, 4);
  });
});

describe('compareOutput', () => {
  it('ignores CRLF line endings and trailing spaces per line', () => {
    assert.strictEqual(compareOutput('1 2\n3\n', '1 2  \r\n3\r\n'), true);
  });

  it('still detects real differences', () => {
    assert.strictEqual(compareOutput('1 2\n3\n', '1 2\n4\n'), false);
    assert.strictEqual(compareOutput('12', '1 2'), false);
  });

  it('skips the check when no expected output is given', () => {
    assert.strictEqual(compareOutput('anything', ''), null);
  });
});

describe('DockerExecutor.runCommand demux', () => {
  it('handles frames delivered one byte at a time', async () => {
    const all = Buffer.concat([frame(1, 'hello'), frame(2, 'oops'), frame(1, ' world')]);
    const stream = new EventEmitter();
    const exec = {
      start: (_options, callback) => {
        callback(null, stream);
        setImmediate(() => {
          for (let i = 0; i < all.length; i += 1) stream.emit('data', all.subarray(i, i + 1));
          stream.emit('end');
        });
      },
      inspect: async () => ({ ExitCode: 0 }),
    };
    const container = { exec: async () => exec, kill: async () => {} };

    const result = await Object.create(DockerExecutor.prototype).runCommand(container, 'true', null, 5, '');
    assert.strictEqual(result.stdout, 'hello world');
    assert.strictEqual(result.stderr, 'oops');
  });
});
