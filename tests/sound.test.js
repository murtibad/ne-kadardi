import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOUND_FILES,
  soundForResult,
  createSoundPlayer,
  haptic,
} from '../js/sound.js';

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, val) {
      map.set(key, String(val));
    },
  };
}

function createFakeAudioContextClass() {
  let constructorCallCount = 0;
  const instances = [];

  class FakeAudioContext {
    constructor() {
      constructorCallCount++;
      this.state = 'suspended';
      this.currentTime = 0;
      this.destination = { name: 'destination' };
      this.resumed = false;
      this.gains = [];
      this.bufferSources = [];
      this.decodedBuffers = [];
      instances.push(this);
    }

    resume() {
      this.resumed = true;
      this.state = 'running';
      return Promise.resolve();
    }

    decodeAudioData(arrayBuffer) {
      const fakeBuffer = { byteLength: arrayBuffer.byteLength, duration: 0.5 };
      this.decodedBuffers.push(fakeBuffer);
      return Promise.resolve(fakeBuffer);
    }

    createGain() {
      const node = {
        type: 'gain',
        gain: { value: 1 },
        connections: [],
        connect(target) {
          this.connections.push(target);
        },
      };
      this.gains.push(node);
      return node;
    }

    createBufferSource() {
      const node = {
        type: 'bufferSource',
        buffer: null,
        connections: [],
        connect(target) {
          this.connections.push(target);
        },
        startedAt: null,
        stopped: false,
        stopCalls: 0,
        onended: null,
        start(time = 0) {
          this.startedAt = time;
        },
        stop() {
          this.stopped = true;
          this.stopCalls++;
        },
      };
      this.bufferSources.push(node);
      return node;
    }
  }

  return {
    FakeAudioContext,
    getConstructorCallCount: () => constructorCallCount,
    getInstances: () => instances,
  };
}

function createFakeFetch({ shouldFail = false, onFetch } = {}) {
  const counts = new Map();
  let totalCalls = 0;

  async function fetchFn(url) {
    totalCalls++;
    counts.set(url, (counts.get(url) || 0) + 1);
    if (onFetch) onFetch(url);
    if (shouldFail) {
      throw new Error(`Network error for ${url}`);
    }
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    };
  }

  return {
    fetchFn,
    getCount: (url) => counts.get(url) || 0,
    getTotalCalls: () => totalCalls,
    setShouldFail: (val) => {
      shouldFail = val;
    },
  };
}

async function flushAsync(ticks = 5) {
  for (let i = 0; i < ticks; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
}

test('soundForResult returns bell only for exact match (factor === 1)', () => {
  assert.equal(soundForResult(100, 1), 'bell');
  assert.equal(soundForResult(70, 1), 'bell');
  assert.equal(soundForResult(0, 1), 'bell');
  assert.equal(soundForResult(undefined, 1), 'bell');

  // Non-exact results always return null regardless of score.
  assert.equal(soundForResult(100, 1.05), null);
  assert.equal(soundForResult(85, 1.2), null);
  assert.equal(soundForResult(70, 1.1), null);
  assert.equal(soundForResult(50, 1.5), null);
  assert.equal(soundForResult(10, 3), null);
  assert.equal(soundForResult(0, 5), null);

  // Invalid inputs return null.
  assert.equal(soundForResult(null, null), null);
  assert.equal(soundForResult(undefined, undefined), null);
  assert.equal(soundForResult(NaN, NaN), null);
  assert.equal(soundForResult(100, '1'), null);
});

test('SOUND_FILES contains expected keys, urls, and gains', () => {
  const expectedNames = ['print', 'tear', 'beep', 'bell'];
  assert.deepEqual(Object.keys(SOUND_FILES).sort(), expectedNames.sort());

  for (const name of expectedNames) {
    const entry = SOUND_FILES[name];
    assert.equal(typeof entry.url, 'string');
    assert.ok(entry.url.startsWith('sounds/'), `${name} url must start with sounds/`);
    assert.ok(entry.url.endsWith('.mp3'), `${name} url must end with .mp3`);
    assert.equal(typeof entry.gain, 'number');
    assert.ok(
      Number.isFinite(entry.gain) && entry.gain > 0 && entry.gain <= 1,
      `${name} gain must be in (0, 1], got ${entry.gain}`,
    );
  }
});

test('player default enabled with empty storage or missing storage', () => {
  const emptyStorage = createMemoryStorage();
  const player = createSoundPlayer({ storage: emptyStorage });
  assert.equal(player.isEnabled(), true);

  const noStoragePlayer = createSoundPlayer({ storage: undefined });
  assert.equal(noStoragePlayer.isEnabled(), true);
});

test('setEnabled persists 0 and 1 and toggle flips state', () => {
  const storage = createMemoryStorage();
  const player = createSoundPlayer({ storage });

  assert.equal(player.isEnabled(), true);

  player.setEnabled(false);
  assert.equal(player.isEnabled(), false);
  assert.equal(storage.getItem('ne-kadardi-sound'), '0');

  player.setEnabled(true);
  assert.equal(player.isEnabled(), true);
  assert.equal(storage.getItem('ne-kadardi-sound'), '1');

  const toggledOff = player.toggle();
  assert.equal(toggledOff, false);
  assert.equal(player.isEnabled(), false);
  assert.equal(storage.getItem('ne-kadardi-sound'), '0');

  const toggledOn = player.toggle();
  assert.equal(toggledOn, true);
  assert.equal(player.isEnabled(), true);
  assert.equal(storage.getItem('ne-kadardi-sound'), '1');

  // Starts disabled if storage already holds '0'.
  const restoredPlayer = createSoundPlayer({
    storage: createMemoryStorage({ 'ne-kadardi-sound': '0' }),
  });
  assert.equal(restoredPlayer.isEnabled(), false);
});

test('broken storage (throws) does not throw', () => {
  const brokenStorage = {
    getItem() {
      throw new Error('getItem permission denied');
    },
    setItem() {
      throw new Error('setItem quota exceeded');
    },
  };

  let player;
  assert.doesNotThrow(() => {
    player = createSoundPlayer({ storage: brokenStorage });
  });
  assert.equal(player.isEnabled(), true);

  assert.doesNotThrow(() => {
    player.setEnabled(false);
  });
  assert.equal(player.isEnabled(), false);

  assert.doesNotThrow(() => {
    const res = player.toggle();
    assert.equal(res, true);
  });
  assert.equal(player.isEnabled(), true);
});

test('disabled player never constructs the AudioContext and never fetches', async () => {
  const { FakeAudioContext, getConstructorCallCount } = createFakeAudioContextClass();
  const { fetchFn, getTotalCalls } = createFakeFetch();
  const storage = createMemoryStorage({ 'ne-kadardi-sound': '0' });

  const player = createSoundPlayer({
    storage,
    AudioContextCtor: FakeAudioContext,
    fetchFn,
  });

  assert.equal(player.isEnabled(), false);
  assert.equal(getConstructorCallCount(), 0);

  assert.equal(player.play('beep'), false);
  assert.equal(player.play('bell'), false);
  assert.equal(player.unlock(), false);
  await flushAsync();

  assert.equal(getConstructorCallCount(), 0);
  assert.equal(getTotalCalls(), 0);
});

test('unknown name returns false without constructing AudioContext or fetching', async () => {
  const { FakeAudioContext, getConstructorCallCount } = createFakeAudioContextClass();
  const { fetchFn, getTotalCalls } = createFakeFetch();
  const player = createSoundPlayer({
    AudioContextCtor: FakeAudioContext,
    fetchFn,
  });

  assert.equal(player.play('nonexistent'), false);
  assert.equal(player.play('cashbox'), false);
  assert.equal(player.play(''), false);
  assert.equal(player.play(null), false);
  assert.equal(player.play(undefined), false);
  await flushAsync();

  assert.equal(getConstructorCallCount(), 0);
  assert.equal(getTotalCalls(), 0);
});

test('missing ctor or throwing ctor makes play and unlock return false', () => {
  const { fetchFn } = createFakeFetch();

  const playerWithoutCtor = createSoundPlayer({
    AudioContextCtor: null,
    fetchFn,
  });
  assert.equal(playerWithoutCtor.play('beep'), false);
  assert.equal(playerWithoutCtor.unlock(), false);

  class ThrowingAudioContext {
    constructor() {
      throw new Error('Web Audio not supported');
    }
  }

  const playerWithFailingCtor = createSoundPlayer({
    AudioContextCtor: ThrowingAudioContext,
    fetchFn,
  });
  assert.equal(playerWithFailingCtor.play('beep'), false);
  assert.equal(playerWithFailingCtor.unlock(), false);
});

test('play("beep") fetches, decodes, connects source -> gain -> destination, and starts at now() + delay', async () => {
  const { FakeAudioContext, getConstructorCallCount, getInstances } = createFakeAudioContextClass();
  const { fetchFn, getCount } = createFakeFetch();

  const player = createSoundPlayer({
    storage: createMemoryStorage(),
    AudioContextCtor: FakeAudioContext,
    fetchFn,
    now: () => 2.0,
  });

  assert.equal(getConstructorCallCount(), 0);

  const ok = player.play('beep', { delay: 0.35 });
  assert.equal(ok, true);
  assert.equal(getConstructorCallCount(), 1);

  await flushAsync();

  assert.equal(getCount('sounds/beep.mp3'), 1);
  const [ctx] = getInstances();
  assert.equal(ctx.resumed, true);
  assert.equal(ctx.bufferSources.length, 1);
  assert.equal(ctx.gains.length, 1);

  const source = ctx.bufferSources[0];
  const gainNode = ctx.gains[0];
  assert.equal(gainNode.gain.value, SOUND_FILES.beep.gain);
  assert.equal(source.connections[0], gainNode);
  assert.equal(gainNode.connections[0], ctx.destination);
  assert.ok(Math.abs(source.startedAt - 2.35) < 1e-9);
});

test('context in "interrupted" state gets resume() called on play', async () => {
  const { FakeAudioContext, getInstances } = createFakeAudioContextClass();
  const { fetchFn } = createFakeFetch();

  const player = createSoundPlayer({
    storage: createMemoryStorage(),
    AudioContextCtor: FakeAudioContext,
    fetchFn,
  });

  player.unlock();
  await flushAsync();

  const [ctx] = getInstances();
  ctx.state = 'interrupted';
  ctx.resumed = false;

  assert.equal(player.play('beep'), true);
  assert.equal(ctx.resumed, true);
  assert.equal(ctx.state, 'running');
});

test('each file is fetched only once across repeated plays; unlock() preloads all four files without playing', async () => {
  const { FakeAudioContext, getConstructorCallCount, getInstances } = createFakeAudioContextClass();
  const { fetchFn, getCount, getTotalCalls } = createFakeFetch();

  const player = createSoundPlayer({
    storage: createMemoryStorage(),
    AudioContextCtor: FakeAudioContext,
    fetchFn,
    now: () => 1.0,
  });

  assert.equal(player.unlock(), true);
  assert.equal(getConstructorCallCount(), 1);
  await flushAsync();

  assert.equal(getTotalCalls(), 4);
  for (const spec of Object.values(SOUND_FILES)) {
    assert.equal(getCount(spec.url), 1);
  }

  const [ctx] = getInstances();
  // unlock() only loads buffers and does not start any buffer sources.
  assert.equal(ctx.bufferSources.length, 0);

  // Subsequent plays reuse cached buffers without fetching again.
  assert.equal(player.play('print'), true);
  assert.equal(player.play('print', { delay: 0.1 }), true);
  assert.equal(player.play('tear', { delay: 0.5 }), true);
  await flushAsync();

  assert.equal(getTotalCalls(), 4);
  assert.equal(ctx.bufferSources.length, 3);
});

test('failing fetch does not throw and a later play retries the fetch', async () => {
  const { FakeAudioContext, getInstances } = createFakeAudioContextClass();
  const { fetchFn, getCount, setShouldFail } = createFakeFetch({ shouldFail: true });

  const player = createSoundPlayer({
    storage: createMemoryStorage(),
    AudioContextCtor: FakeAudioContext,
    fetchFn,
    now: () => 0.5,
  });

  assert.equal(player.play('bell'), true);
  await flushAsync();

  const [ctx] = getInstances();
  assert.equal(getCount('sounds/bell.mp3'), 1);
  assert.equal(ctx.bufferSources.length, 0);

  // Recover network and play again: should re-fetch and play.
  setShouldFail(false);
  assert.equal(player.play('bell'), true);
  await flushAsync();

  assert.equal(getCount('sounds/bell.mp3'), 2);
  assert.equal(ctx.bufferSources.length, 1);
  assert.equal(ctx.gains[0].gain.value, SOUND_FILES.bell.gain);
});

test('slow uncached load (> 400 ms) is skipped silently', async () => {
  const { FakeAudioContext, getInstances } = createFakeAudioContextClass();
  let currentMs = 1000;
  const { fetchFn } = createFakeFetch({
    onFetch: () => {
      // Simulate a 450 ms network + decode delay on the initial load.
      currentMs += 450;
    },
  });

  const player = createSoundPlayer({
    storage: createMemoryStorage(),
    AudioContextCtor: FakeAudioContext,
    fetchFn,
    now: () => 1.0,
    clock: () => currentMs,
  });

  assert.equal(player.play('tear'), true);
  await flushAsync();

  const [ctx] = getInstances();
  assert.equal(ctx.bufferSources.length, 0, 'slow initial load must not play late');

  // Once cached, a subsequent play plays immediately even though clock advanced.
  currentMs += 1000;
  assert.equal(player.play('tear'), true);
  await flushAsync();

  assert.equal(ctx.bufferSources.length, 1, 'cached buffer should play on next call');
});

test('stop() stops started sources of that name, forgets them, and ignores ended or unknown sources', async () => {
  const { FakeAudioContext, getInstances } = createFakeAudioContextClass();
  const { fetchFn } = createFakeFetch();

  const player = createSoundPlayer({
    storage: createMemoryStorage(),
    AudioContextCtor: FakeAudioContext,
    fetchFn,
  });

  // Unknown or never-played names are a no-op.
  assert.doesNotThrow(() => {
    player.stop('print');
    player.stop('nonexistent');
    player.stop(null);
  });

  player.play('print');
  player.play('print');
  player.play('beep');
  await flushAsync();

  const [ctx] = getInstances();
  assert.equal(ctx.bufferSources.length, 3);
  const [print1, print2, beep1] = ctx.bufferSources;

  // Simulate print1 finishing naturally before stop('print') is called.
  print1.onended();

  player.stop('print');
  assert.equal(print1.stopped, false, 'already ended source should not be stopped again');
  assert.equal(print2.stopped, true);
  assert.equal(print2.stopCalls, 1);
  assert.equal(beep1.stopped, false, 'other sound names must not be affected');

  // Calling stop('print') a second time is a no-op because sources were forgotten.
  player.stop('print');
  assert.equal(print2.stopCalls, 1);
});

test('setEnabled(false) stops all playing sources', async () => {
  const { FakeAudioContext, getInstances } = createFakeAudioContextClass();
  const { fetchFn } = createFakeFetch();

  const player = createSoundPlayer({
    storage: createMemoryStorage(),
    AudioContextCtor: FakeAudioContext,
    fetchFn,
  });

  player.play('print');
  player.play('bell');
  await flushAsync();

  const [ctx] = getInstances();
  assert.equal(ctx.bufferSources.length, 2);

  player.setEnabled(false);
  assert.equal(ctx.bufferSources[0].stopped, true);
  assert.equal(ctx.bufferSources[1].stopped, true);
});

test('haptic with fake nav', () => {
  let vibratedWith = null;
  const fakeNav = {
    vibrate(ms) {
      vibratedWith = ms;
      return true;
    },
  };

  // Positive ms vibrated.
  assert.equal(haptic(25, fakeNav), true);
  assert.equal(vibratedWith, 25);

  // Default duration is 10 ms.
  assert.equal(haptic(undefined, fakeNav), true);
  assert.equal(vibratedWith, 10);

  // Skips non-positive durations.
  vibratedWith = null;
  assert.equal(haptic(0, fakeNav), false);
  assert.equal(haptic(-10, fakeNav), false);
  assert.equal(haptic(NaN, fakeNav), false);
  assert.equal(haptic('15', fakeNav), false);
  assert.equal(vibratedWith, null);

  // Missing navigator or vibrate method.
  assert.equal(haptic(10, null), false);
  assert.equal(haptic(10, {}), false);
  assert.equal(haptic(10, undefined), false);

  // navigator.vibrate returns false.
  const denyingNav = { vibrate: () => false };
  assert.equal(haptic(10, denyingNav), false);

  // Throwing navigator.vibrate does not bubble up.
  const throwingNav = {
    vibrate() {
      throw new Error('NotAllowedError');
    },
  };
  assert.equal(haptic(10, throwingNav), false);
});

test('prefetch() downloads all sounds without an AudioContext; the first play only decodes', async () => {
  const { FakeAudioContext, getConstructorCallCount, getInstances } = createFakeAudioContextClass();
  const { fetchFn, getTotalCalls } = createFakeFetch();
  const player = createSoundPlayer({ storage: createMemoryStorage(), AudioContextCtor: FakeAudioContext, fetchFn, now: () => 0 });

  assert.equal(player.prefetch(), true);
  await flushAsync();
  assert.equal(getTotalCalls(), 4);
  assert.equal(getConstructorCallCount(), 0, 'no context before a user gesture');

  player.play('print');
  await flushAsync();
  assert.equal(getTotalCalls(), 4, 'play reuses the prefetched bytes');
  assert.equal(getInstances()[0].bufferSources.length, 1);
});

test('prefetch() does nothing while muted', () => {
  const { fetchFn, getTotalCalls } = createFakeFetch();
  const player = createSoundPlayer({ storage: createMemoryStorage({ 'ne-kadardi-sound': '0' }), fetchFn });
  assert.equal(player.prefetch(), false);
  assert.equal(getTotalCalls(), 0);
});

test('a sound waits for a sleeping context and is skipped when waking takes too long', async () => {
  const { FakeAudioContext, getInstances } = createFakeAudioContextClass();
  const { fetchFn } = createFakeFetch();
  let currentMs = 0;
  const player = createSoundPlayer({ storage: createMemoryStorage(), AudioContextCtor: FakeAudioContext, fetchFn, now: () => 0, clock: () => currentMs });
  player.unlock();
  await flushAsync();
  const [ctx] = getInstances();

  // The tab slept: the context is suspended again and resume() takes 600 ms.
  ctx.state = 'suspended';
  ctx.resume = () => new Promise((r) => setTimeout(() => { currentMs += 600; ctx.state = 'running'; r(); }, 5));
  player.play('beep');
  await new Promise((r) => setTimeout(r, 20));
  await flushAsync();
  assert.equal(ctx.bufferSources.length, 0, 'late sound is dropped, not played out of sync');

  // Awake now: the next sound plays at once.
  player.play('beep');
  await flushAsync();
  assert.equal(ctx.bufferSources.length, 1);
});

test('wake() resumes a suspended context and ignores a running one or a missing one', async () => {
  const { FakeAudioContext, getInstances } = createFakeAudioContextClass();
  const { fetchFn } = createFakeFetch();
  const player = createSoundPlayer({ storage: createMemoryStorage(), AudioContextCtor: FakeAudioContext, fetchFn });
  assert.equal(player.wake(), false, 'no context before the first gesture');
  player.unlock();
  const [ctx] = getInstances();
  ctx.state = 'suspended';
  ctx.resumed = false;
  assert.equal(player.wake(), true);
  assert.equal(ctx.resumed, true);
  ctx.resumed = false;
  assert.equal(player.wake(), true);
  assert.equal(ctx.resumed, false, 'a running context is left alone');
});
