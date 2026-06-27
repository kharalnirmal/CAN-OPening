const FIRE_DURATION = 15000;
const EMBER_INTERVAL = 260;
const CURTAIN_DELAY = 900;
const CURTAIN_OPEN_DURATION = 3300;
const params = new URLSearchParams(window.location.search);

const IMAGE_SEQUENCE = [
  { src: "can image 0.jpg", duration: 8000, alt: "CAN presentation visual" },
  {
    src: "can image 1.jpg",
    duration: 8000,
    alt: "CAN digital literacy visual",
  },
  { src: "collab.png", duration: 8000, alt: "Collaboration visual" },
];

const experience = document.querySelector(".experience");
const emberLayer = document.querySelector("#emberLayer");
const openingMusic = document.querySelector("#openingMusic");
const sequenceImage = document.querySelector("#sequenceImage");

let emberTimer = 0;
let revealTimer = 0;
let revealed = false;
let sequenceIndex = 0;
let imageTimer = 0;
let musicFadeTimer = 0;
let audioContext;
let musicStarted = false;
let audioUnlockTimer = 0;
let kioskRetryTimer = 0;

document.documentElement.style.setProperty(
  "--fire-duration",
  `${FIRE_DURATION}ms`,
);

window.addEventListener("load", () => {
  beginEmbers();
  forceOpeningMusic();
  startKioskAutoplay();
  revealTimer = window.setTimeout(revealEventScreen, getFireDuration());
});

document.addEventListener("DOMContentLoaded", () => {
  forceOpeningMusic();
  startKioskAutoplay();
});
openingMusic.addEventListener("canplaythrough", forceOpeningMusic, {
  once: true,
});

["click", "keydown", "touchstart"].forEach((eventName) => {
  window.addEventListener(eventName, unlockOpeningMusic, { once: true });
});

window.addEventListener("pageshow", () => {
  if (!revealed && openingMusic.paused) {
    playOpeningMusic();
    startKioskAutoplay();
  }
});

function simulateUserGesture() {
  const target = document.body;
  const eventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
  };

  if (typeof TouchEvent !== "undefined") {
    try {
      target.dispatchEvent(new TouchEvent("touchstart", eventInit));
      target.dispatchEvent(new TouchEvent("touchend", eventInit));
    } catch {
      // Some browsers reject synthetic TouchEvent construction.
    }
  }

  if (typeof PointerEvent !== "undefined") {
    target.dispatchEvent(
      new PointerEvent("pointerdown", {
        ...eventInit,
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
      }),
    );
    target.dispatchEvent(
      new PointerEvent("pointerup", {
        ...eventInit,
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
      }),
    );
  }

  target.dispatchEvent(
    new MouseEvent("click", {
      ...eventInit,
      detail: 1,
      buttons: 1,
    }),
  );

  unlockOpeningMusic();
}

function startKioskAutoplay() {
  simulateUserGesture();

  window.clearInterval(kioskRetryTimer);
  let attempts = 0;
  kioskRetryTimer = window.setInterval(() => {
    attempts += 1;
    if (revealed || attempts > 10) {
      window.clearInterval(kioskRetryTimer);
      return;
    }
    if (openingMusic.paused || openingMusic.muted || openingMusic.volume < 0.05) {
      simulateUserGesture();
    } else {
      window.clearInterval(kioskRetryTimer);
    }
  }, 450);
}

function getFireDuration() {
  const override = Number(params.get("duration"));
  return Number.isFinite(override) && override > 0 ? override : FIRE_DURATION;
}

function revealEventScreen() {
  if (revealed) return;
  revealed = true;
  window.clearTimeout(revealTimer);
  window.clearInterval(musicFadeTimer);
  stopEmbers();
  fadeAudio(openingMusic, 0, 2200);

  experience.classList.add("is-revealed");
  window.setTimeout(playCurtainSound, CURTAIN_DELAY);
  window.setTimeout(playApplauseSound, CURTAIN_DELAY + 1800);
  window.setTimeout(() => {
    playCalmingBed();
    startImageSequence();
  }, CURTAIN_DELAY + CURTAIN_OPEN_DURATION);
}

function beginEmbers() {
  createEmbers(16);
  emberTimer = window.setInterval(() => createEmbers(4), EMBER_INTERVAL);
}

function stopEmbers() {
  window.clearInterval(emberTimer);
}

async function playOpeningMusic() {
  if (revealed || musicStarted) return;
  try {
    await openingMusic.play();
    musicStarted = true;
    window.setTimeout(() => {
      openingMusic.muted = false;
      fadeAudio(openingMusic, 0.78, 2200);
      scheduleAudioUnlockCheck();
    }, 180);
  } catch {
    musicStarted = false;
    startKioskAutoplay();
  }
}

function scheduleAudioUnlockCheck() {
  window.clearTimeout(audioUnlockTimer);
  audioUnlockTimer = window.setTimeout(() => {
    if (revealed) return;
    if (openingMusic.paused || openingMusic.muted) {
      startKioskAutoplay();
    }
  }, 500);
}

function forceOpeningMusic() {
  if (revealed || musicStarted) return;
  openingMusic.currentTime = 0;
  openingMusic.volume = 0;
  openingMusic.muted = true;
  playOpeningMusic();
}

function unlockOpeningMusic() {
  if (revealed) return;
  getAudioContext();
  openingMusic.muted = false;
  if (openingMusic.paused || !musicStarted) {
    musicStarted = false;
    playOpeningMusic();
  } else if (openingMusic.volume < 0.7) {
    fadeAudio(openingMusic, 0.78, 900);
  }
}

function startImageSequence() {
  sequenceIndex = 0;
  showSequenceImage(sequenceIndex, { immediate: true });
}

function showSequenceImage(index, options = {}) {
  const item = IMAGE_SEQUENCE[index];
  if (!item) {
    closeCurtains();
    return;
  }

  window.clearTimeout(imageTimer);
  const swap = () => {
    sequenceImage.classList.remove("is-active");
    window.setTimeout(() => {
      sequenceImage.src = item.src;
      sequenceImage.alt = item.alt;
      sequenceImage.classList.add("is-active");
    }, 260);
  };

  if (options.immediate) {
    swap();
  } else {
    sequenceImage.classList.remove("is-active");
    window.setTimeout(swap, 430);
  }

  imageTimer = window.setTimeout(() => {
    sequenceIndex = index + 1;
    showSequenceImage(sequenceIndex);
  }, item.duration);
}

function closeCurtains() {
  experience.classList.add("is-closing");
  playCurtainSound();
}

function createEmbers(count) {
  for (let index = 0; index < count; index += 1) {
    const ember = document.createElement("span");
    ember.className = "ember";
    ember.style.left = `${44 + Math.random() * 12}%`;
    ember.style.bottom = `${22 + Math.random() * 9}%`;
    ember.style.setProperty("--size", `${2 + Math.random() * 3.5}px`);
    ember.style.setProperty("--life", `${1400 + Math.random() * 1200}ms`);
    ember.style.setProperty("--drift", `${(Math.random() - 0.5) * 5.8}rem`);
    emberLayer.appendChild(ember);
    ember.addEventListener("animationend", () => ember.remove(), {
      once: true,
    });
  }
}

function fadeAudio(audio, targetVolume, duration) {
  const startVolume = audio.volume;
  const startedAt = performance.now();
  window.clearInterval(musicFadeTimer);
  musicFadeTimer = window.setInterval(() => {
    const progress = Math.min((performance.now() - startedAt) / duration, 1);
    audio.volume = startVolume + (targetVolume - startVolume) * progress;
    if (progress >= 1) {
      window.clearInterval(musicFadeTimer);
      if (targetVolume === 0) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
  }, 50);
}

function getAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function playCurtainSound() {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const source = context.createBufferSource();
  const buffer = context.createBuffer(
    1,
    Math.floor(context.sampleRate * 2.2),
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.linearRampToValueAtTime(180, now + 2.2);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(context.destination);
  source.start(now);
  source.stop(now + 2.25);
}

function playApplauseSound() {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  for (let i = 0; i < 34; i += 1) {
    const clapAt = now + Math.random() * 2.4;
    const source = context.createBufferSource();
    const buffer = context.createBuffer(
      1,
      Math.floor(context.sampleRate * 0.06),
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let j = 0; j < data.length; j += 1) {
      data[j] = (Math.random() * 2 - 1) * (1 - j / data.length);
    }
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = "bandpass";
    filter.frequency.value = 1200 + Math.random() * 900;
    gain.gain.setValueAtTime(0.0001, clapAt);
    gain.gain.exponentialRampToValueAtTime(
      0.08 + Math.random() * 0.05,
      clapAt + 0.006,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, clapAt + 0.08);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(clapAt);
    source.stop(clapAt + 0.09);
  }
}

function playCalmingBed() {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  [146.83, 220, 293.66].forEach((frequency, index) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035 / (index + 1), now + 2);
    gain.gain.setValueAtTime(0.035 / (index + 1), now + 22);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 26);
    osc.connect(gain).connect(context.destination);
    osc.start(now);
    osc.stop(now + 26.5);
  });
}
