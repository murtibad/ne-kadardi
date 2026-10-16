import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOUND_PLANS,
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
      this.sampleRate = 44100;
      this.destination = { name: 'destination' };
      this.resumed = false;
      this.oscillators = [];
      this.gains = [];
      this.buffers = [];
      this.bufferSources = [];
      this.filters = [];
      instances.push(this);
    }

    resume() {
      this.resumed = true;
      this.state = 'running';
      return Promise.resolve();
    }

    createGain() {
      const node = {
        type: 'gain',
        gain: {
          value: 1,
          calls: [],
          setValueAtTime(val, time) {
            this.calls.push({ method: 'setValueAtTime', val, time });
          },
          linearRampToValueAtTime(val, time) {
            this.calls.push({ method: 'linearRampToValueAtTime', val, time });
          },
        },
        connections: [],
        connect(target) {
          this.connections.push(target);
        },
      };
      this.gains.push(node);
      return node;
    }

    createOscillator() {
      const node = {
        type: 'oscillator',
        wave: 'sine',
        frequency: {
          value: 440,
          calls: [],
          setValueAtTime(val, time) {
            this.calls.push({ method: 'setValueAtTime', val, time });
          },
          linearRampToValueAtTime(val, time) {
            this.calls.push({ method: 'linearRampToValueAtTime', val, time });
          },
        },
        connections: [],
        connect(target) {
          this.connections.push(target);
        },
        startedAt: null,
        stoppedAt: null,
        start(time) {
          this.startedAt = time;
        },
        stop(time) {
          this.stoppedAt = time;
        },
      };
      this.oscillators.push(node);
      return node;
    }

    createBuffer(channels, length, sampleRate) {
      const channelData = new Float32Array(length);
      const buf = {
        channels,
        length,
        sampleRate,
        getChannelData(index) {
          return channelData;
        },
      };
      this.buffers.push(buf);
      return buf;
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
        stoppedAt: null,
        start(time) {
          this.startedAt = time;
        },
        stop(time) {
          this.stoppedAt = time;
        },
      };
      this.bufferSources.push(node);
      return node;
    }

    createBiquadFilter() {
      const node = {
        type: 'biquadFilter',
        filterType: 'bandpass',
        frequency: {
          value: 350,
          calls: [],
          setValueAtTime(val, time) {
            this.calls.push({ method: 'setValueAtTime', val, time });
          },
        },
        Q: { value: 1 },
        connections: [],
        connect(target) {
          this.connections.push(target);
        },
      };
      this.filters.push(node);
      return node;
    }
  }

  return {
    FakeAudioContext,
    getConstructorCallCount: () => constructorCallCount,
    getInstances: () => instances,
  };
}

test('soundForResult boundaries', () => {
  // Exact match (factor === 1) always triggers cashbox regardless of score.
  assert.equal(soundForResult(100, 1), 'cashbox');
  assert.equal(soundForResult(70, 1), 'cashbox');
  assert.equal(soundForResult(50, 1), 'cashbox');
  assert.equal(soundForResult(10, 1), 'cashbox');
  assert.equal(soundForResult(0, 1), 'cashbox');
  assert.equal(soundForResult(undefined, 1), 'cashbox');

  // Score >= 70 triggers good when factor !== 1.
  assert.equal(soundForResult(100, 1.05), 'good');
  assert.equal(soundForResult(85, 1.2), 'good');
  assert.equal(soundForResult(70, 1.1), 'good');

  // Just below 70 is neutral.
  assert.equal(soundForResult(69.9, 1.1), null);
  assert.equal(soundForResult(50, 1.5), null);
  assert.equal(soundForResult(20, 2), null);

  // Score < 20 triggers sad.
  assert.equal(soundForResult(19.9, 2), 'sad');
  assert.equal(soundForResult(10, 3), 'sad');
  assert.equal(soundForResult(0, 5), 'sad');
  assert.equal(soundForResult(-10, 10), 'sad');

  // Invalid or undefined values return null when factor !== 1.
  assert.equal(soundForResult(null, null), null);
  assert.equal(soundForResult(undefined, undefined), null);
  assert.equal(soundForResult(NaN, NaN), null);
});

test('every plan step has valid fields and gain <= 0.25 and finite non-negative start/dur', () => {
  const expectedNames = ['beep', 'print', 'cashbox', 'good', 'sad', 'tick'];
  assert.deepEqual(Object.keys(SOUND_PLANS).sort(), expectedNames.sort());

  for (const [name, steps] of Object.entries(SOUND_PLANS)) {
    assert.ok(Array.isArray(steps), `${name} plan should be an array`);
    assert.ok(steps.length > 0, `${name} plan must have at least one step`);

    for (const step of steps) {
      assert.ok(['tone', 'noise'].includes(step.kind), `${name} step kind must be tone or noise`);

      assert.equal(typeof step.start, 'number', `${name} step start must be a number`);
      assert.ok(Number.isFinite(step.start) && step.start >= 0, `${name} step start must be finite non-negative`);

      assert.equal(typeof step.dur, 'number', `${name} step dur must be a number`);
      assert.ok(Number.isFinite(step.dur) && step.dur > 0, `${name} step dur must be finite positive`);

      assert.equal(typeof step.gain, 'number', `${name} step gain must be a number`);
      assert.ok(
        Number.isFinite(step.gain) && step.gain >= 0 && step.gain <= 0.25,
        `${name} step gain must be between 0 and 0.25 (got ${step.gain})`,
      );

      if (step.kind === 'tone') {
        assert.equal(typeof step.freq, 'number', `${name} tone step must have freq`);
        assert.ok(Number.isFinite(step.freq) && step.freq > 0);
        if (step.wave !== undefined) {
          assert.ok(['sine', 'square', 'triangle', 'sawtooth'].includes(step.wave));
        }
      }

      if (step.kind === 'noise' && step.filter !== undefined) {
        assert.equal(typeof step.filter, 'number', `${name} noise filter must be a number`);
        assert.ok(Number.isFinite(step.filter) && step.filter > 0);
      }
    }
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
  const restoredPlayer = createSoundPlayer({ storage: createMemoryStorage({ 'ne-kadardi-sound': '0' }) });
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

test('disabled player never constructs the AudioContext (fake constructor counting calls)', () => {
  const { FakeAudioContext, getConstructorCallCount } = createFakeAudioContextClass();
  const storage = createMemoryStorage({ 'ne-kadardi-sound': '0' });

  const player = createSoundPlayer({
    storage,
    AudioContextCtor: FakeAudioContext,
  });

  assert.equal(player.isEnabled(), false);
  assert.equal(getConstructorCallCount(), 0);

  const playedBeep = player.play('beep');
  assert.equal(playedBeep, false);
  assert.equal(getConstructorCallCount(), 0);

  const playedCashbox = player.play('cashbox');
  assert.equal(playedCashbox, false);
  assert.equal(getConstructorCallCount(), 0);
});

test('play with a fake AudioContext returns true and schedules nodes', () => {
  const { FakeAudioContext, getConstructorCallCount, getInstances } = createFakeAudioContextClass();
  const storage = createMemoryStorage();

  const player = createSoundPlayer({
    storage,
    AudioContextCtor: FakeAudioContext,
    now: () => 1.5,
  });

  // Not constructed until first play.
  assert.equal(getConstructorCallCount(), 0);

  // Play tone ('beep').
  const beepResult = player.play('beep');
  assert.equal(beepResult, true);
  assert.equal(getConstructorCallCount(), 1);

  const [ctx] = getInstances();
  assert.equal(ctx.resumed, true);
  assert.ok(ctx.oscillators.length >= 1, 'expected oscillator to be created');
  assert.ok(ctx.gains.length >= 1, 'expected gain node to be created');

  const osc = ctx.oscillators[0];
  assert.equal(osc.wave, 'sine');
  assert.equal(osc.startedAt, 1.5);
  assert.equal(osc.connections[0], ctx.gains[0]);
  assert.equal(ctx.gains[0].connections[0], ctx.destination);

  // Play noise ('print').
  const printResult = player.play('print');
  assert.equal(printResult, true);
  // Reuses existing AudioContext instance.
  assert.equal(getConstructorCallCount(), 1);

  assert.ok(ctx.buffers.length >= 1, 'expected noise buffer to be created');
  assert.ok(ctx.bufferSources.length >= 1, 'expected buffer source to be created');
  assert.ok(ctx.filters.length >= 1, 'expected bandpass filter to be created');

  const source = ctx.bufferSources[0];
  assert.equal(source.startedAt, 1.5);
  assert.equal(source.connections[0], ctx.filters[0]);
  assert.equal(ctx.filters[0].connections[0], ctx.gains[1]);

  // Play multi-step ('cashbox').
  const cashboxResult = player.play('cashbox');
  assert.equal(cashboxResult, true);
  assert.equal(getConstructorCallCount(), 1);
});

test('unknown name returns false and does not construct AudioContext', () => {
  const { FakeAudioContext, getConstructorCallCount } = createFakeAudioContextClass();
  const player = createSoundPlayer({
    AudioContextCtor: FakeAudioContext,
  });

  assert.equal(player.play('nonexistent'), false);
  assert.equal(player.play(''), false);
  assert.equal(player.play(null), false);
  assert.equal(player.play(undefined), false);
  assert.equal(getConstructorCallCount(), 0);
});

test('play handles missing AudioContextCtor or failing constructor gracefully', () => {
  const playerWithoutCtor = createSoundPlayer({
    AudioContextCtor: null,
  });
  assert.equal(playerWithoutCtor.play('beep'), false);

  class ThrowingAudioContext {
    constructor() {
      throw new Error('Web Audio not supported');
    }
  }

  const playerWithFailingCtor = createSoundPlayer({
    AudioContextCtor: ThrowingAudioContext,
  });
  assert.equal(playerWithFailingCtor.play('beep'), false);
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
