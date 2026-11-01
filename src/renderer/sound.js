'use strict';

window.PixelSound = (() => {
  let audio = null;

  /** Temanın kare dalga melodisini iki kez çalar. */
  function playJingle(notes) {
    audio ??= new AudioContext();
    audio.resume();
    const start = audio.currentTime + 0.02;
    const step = 0.13;
    [...notes, ...notes].forEach((frequency, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.value = frequency;
      gain.gain.value = 0.06;
      gain.gain.setValueAtTime(0, start + (i + 1) * step - 0.01);
      osc.connect(gain).connect(audio.destination);
      osc.start(start + i * step);
      osc.stop(start + (i + 1) * step);
    });
  }

  return { playJingle };
})();
