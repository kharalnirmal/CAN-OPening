const FIRE_DURATION = 10000;
const EMBER_INTERVAL = 260;
const params = new URLSearchParams(window.location.search);

const experience = document.querySelector(".experience");
const emberLayer = document.querySelector("#emberLayer");

let emberTimer = 0;

document.documentElement.style.setProperty("--fire-duration", `${FIRE_DURATION}ms`);

window.addEventListener("load", () => {
  beginEmbers();
  window.setTimeout(revealEventScreen, getFireDuration());
});

function getFireDuration() {
  const override = Number(params.get("duration"));
  return Number.isFinite(override) && override > 0 ? override : FIRE_DURATION;
}

function revealEventScreen() {
  stopEmbers();
  experience.classList.add("is-revealed");
}

function beginEmbers() {
  createEmbers(16);
  emberTimer = window.setInterval(() => createEmbers(4), EMBER_INTERVAL);
}

function stopEmbers() {
  window.clearInterval(emberTimer);
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
    ember.addEventListener("animationend", () => ember.remove(), { once: true });
  }
}
