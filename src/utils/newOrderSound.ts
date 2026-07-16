interface AudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export function playNewOrderSound(): void {
  if (typeof window === "undefined") return;

  const audioWindow = window as AudioWindow;
  const AudioContextConstructor = window.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextConstructor) return;

  try {
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.11, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => { void context.close(); };
    oscillator.start();
    oscillator.stop(context.currentTime + 0.22);
  } catch {
    // Browsers can block audio until a staff member has interacted with the page.
  }
}