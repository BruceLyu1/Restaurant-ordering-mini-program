import { afterEach, describe, expect, it } from "vitest";
import { playNewOrderSound } from "../newOrderSound";

const originalAudioContext = window.AudioContext;

afterEach(() => {
  Object.defineProperty(window, "AudioContext", { configurable: true, value: originalAudioContext });
});

describe("playNewOrderSound", () => {
  it("silently handles browsers that do not expose audio playback", () => {
    Object.defineProperty(window, "AudioContext", { configurable: true, value: undefined });

    expect(() => playNewOrderSound()).not.toThrow();
  });

  it("silently handles browser audio permission failures", () => {
    class BlockedAudioContext {
      constructor() {
        throw new Error("Audio playback blocked");
      }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: BlockedAudioContext });

    expect(() => playNewOrderSound()).not.toThrow();
  });
});