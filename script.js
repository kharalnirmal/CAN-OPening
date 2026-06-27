const FIRE_DURATION = 15000;
const CURTAIN_DELAY = 900;
const CURTAIN_OPEN_DURATION = 2100;
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
const openingMusic = document.querySelector("#openingMusic");
const clappingSound = document.querySelector("#clappingSound");
const curtainOpenSound = document.querySelector("#curtainOpenSound");
const curtainCloseSound = document.querySelector("#curtainCloseSound");
const sequenceImage = document.querySelector("#sequenceImage");

let revealTimer = 0;
let revealed = false;
let sequenceIndex = 0;
let imageTimer = 0;
let musicStarted = false;
let kioskRetryCount = 0;
const KIOSK_RETRY_LIMIT = 2;

document.documentElement.style.setProperty(
  "--fire-duration",
  `${FIRE_DURATION}ms`,
);

window.addEventListener("load", () => {
  forceOpeningMusic();
  startKioskAutoplay();
  revealTimer = window.setTimeout(revealEventScreen, getFireDuration());
});

["click", "keydown", "touchstart"].forEach((eventName) => {
  window.addEventListener(eventName, unlockOpeningMusic, { once: true });
});

function getFireDuration() {
  const override = Number(params.get("duration"));
  return Number.isFinite(override) && override > 0 ? override : FIRE_DURATION;
}

function revealEventScreen() {
  if (revealed) return;
  revealed = true;
  window.clearTimeout(revealTimer);
  
  // Fade out opening music (m1.mp3) smoothly
  fadeOutOpeningMusic(1200);

  experience.classList.add("is-revealed");

  // Play clapping sound and curtain opening sound when the curtains start opening (at CURTAIN_DELAY)
  window.setTimeout(playClappingSound, CURTAIN_DELAY);
  window.setTimeout(() => playCurtainSound(true), CURTAIN_DELAY);

  window.setTimeout(startImageSequence, CURTAIN_DELAY + CURTAIN_OPEN_DURATION);
}

function playClappingSound() {
  if (!clappingSound) return;
  try {
    clappingSound.muted = false;
    clappingSound.volume = 1.0;
    clappingSound.play().catch((err) => {
      console.warn("Clapping sound autoplay blocked:", err);
    });
  } catch (err) {
    console.error("Error playing clapping sound:", err);
  }
}

function fadeOutOpeningMusic(duration = 1200) {
  if (!openingMusic) return;
  const startVolume = openingMusic.volume;
  if (startVolume <= 0 || openingMusic.paused) {
    openingMusic.volume = 0;
    openingMusic.pause();
    return;
  }

  const startTime = performance.now();

  function fade(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-out: start fast, slow down as it approaches 0 volume.
    const factor = Math.pow(1 - progress, 3);
    openingMusic.volume = Math.max(0, startVolume * factor);

    if (progress < 1) {
      requestAnimationFrame(fade);
    } else {
      openingMusic.pause();
      openingMusic.volume = 0;
    }
  }

  requestAnimationFrame(fade);
}

function playCurtainSound(isOpen) {
  const audioEl = isOpen ? curtainOpenSound : curtainCloseSound;
  if (audioEl) {
    audioEl.muted = false;
    audioEl.volume = 1.0;
    audioEl.play()
      .then(() => console.log(`${isOpen ? 'Open' : 'Close'} curtain sound played.`))
      .catch((err) => {
        console.warn(`Could not play MP3 for curtain ${isOpen ? 'open' : 'close'}:`, err);
        // Fallback to Web Audio synthesized whoosh sound if MP3 fails/is missing
        if (isOpen) {
          playSynthesizedWhoosh(2.2, 180, 550);
        } else {
          playSynthesizedWhoosh(1.6, 500, 150);
        }
      });
  } else {
    // Fallback to Web Audio synthesis directly
    if (isOpen) {
      playSynthesizedWhoosh(2.2, 180, 550);
    } else {
      playSynthesizedWhoosh(1.6, 500, 150);
    }
  }
}

function playSynthesizedWhoosh(duration, startFreq, endFreq) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Create random white noise buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource(buffer);
    noise.buffer = buffer;
    
    // Bandpass filter to make it sound like air/wind/fabric whoosh
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.5;
    
    // Gain envelope for volume ramp
    const gain = ctx.createGain();
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    // Smooth volume fade-in and exponential fade-out
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.25); // Louder synthesized whoosh
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    // Frequency sweep
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration * 0.45);
    filter.frequency.exponentialRampToValueAtTime(startFreq * 0.4, now + duration);
    
    noise.start(now);
    noise.stop(now + duration);
  } catch (e) {
    console.warn("Could not play synthesized whoosh:", e);
  }
}

function startKioskAutoplay() {
  if (revealed || kioskRetryCount >= KIOSK_RETRY_LIMIT) return;
  unlockOpeningMusic();
  if (!openingMusic.paused && !openingMusic.muted) return;

  kioskRetryCount += 1;
  window.setTimeout(() => {
    if (!revealed && (openingMusic.paused || openingMusic.muted)) {
      unlockOpeningMusic();
    }
  }, 1200);
}

async function playOpeningMusic() {
  if (revealed || musicStarted) return;
  try {
    if (openingMusic.preload === "none") {
      openingMusic.preload = "auto";
      openingMusic.load();
    }
    // Try to play unmuted at normal volume immediately (succeeds with browser flags)
    openingMusic.muted = false;
    openingMusic.volume = 0.78;
    await openingMusic.play();
    musicStarted = true;
  } catch (err) {
    console.warn("Unmuted autoplay blocked, falling back to muted playback:", err);
    try {
      // Fallback to muted autoplay
      openingMusic.muted = true;
      openingMusic.volume = 0;
      await openingMusic.play();
      musicStarted = true;
    } catch (muteErr) {
      console.error("Muted playback failed:", muteErr);
      musicStarted = false;
    }
  }
}

function forceOpeningMusic() {
  if (revealed || musicStarted) return;
  playOpeningMusic();
}

function unlockOpeningMusic() {
  if (revealed) return;
  openingMusic.muted = false;
  if (openingMusic.paused || !musicStarted) {
    musicStarted = false;
    playOpeningMusic();
  } else if (openingMusic.volume < 0.7) {
    openingMusic.volume = 0.78;
  }

  // Preload and unlock audio elements on user interaction
  if (clappingSound) clappingSound.load();
  if (curtainOpenSound) curtainOpenSound.load();
  if (curtainCloseSound) curtainCloseSound.load();
}

function startImageSequence() {
  sequenceIndex = 0;
  showSequenceImage(sequenceIndex, { immediate: true });
}

function showSequenceImage(index, options = {}) {
  const item = IMAGE_SEQUENCE[index];
  if (!item) {
    revealWelcomeMessage();
    return;
  }

  window.clearTimeout(imageTimer);
  const swap = () => {
    sequenceImage.classList.remove("is-active");
    window.setTimeout(() => {
      sequenceImage.src = item.src;
      sequenceImage.alt = item.alt;
      sequenceImage.classList.add("is-active");
    }, 180);
  };

  if (options.immediate) {
    swap();
  } else {
    sequenceImage.classList.remove("is-active");
    window.setTimeout(swap, 260);
  }

  imageTimer = window.setTimeout(() => {
    sequenceIndex = index + 1;
    showSequenceImage(sequenceIndex);
  }, item.duration);
}

function revealWelcomeMessage() {
  // Fade out the last sequence image
  sequenceImage.classList.remove("is-active");

  const welcomeOverlay = document.querySelector("#welcomeOverlay");
  if (welcomeOverlay) {
    // Wait a moment for the image to start fading out before showing welcome text
    window.setTimeout(() => {
      welcomeOverlay.classList.add("is-active");
      
      // Show the message for 4.5 seconds, then fade it out and close the curtains
      window.setTimeout(() => {
        welcomeOverlay.classList.remove("is-active");
        closeCurtains();
      }, 4500);
    }, 450);
  } else {
    closeCurtains();
  }
}

function closeCurtains() {
  experience.classList.add("is-closing");
  playCurtainSound(false);
}
