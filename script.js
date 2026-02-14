// ===============================
// script.js (copy everything)
// ===============================

// ---------- Smooth reveal on scroll (staggered, one-by-one feel) ----------
const revealEls = Array.from(document.querySelectorAll(".reveal"));

revealEls.forEach((el, i) => {
  // gives each element a slightly different delay
  el.style.transitionDelay = `${Math.min(i * 90, 420)}ms`;
});

const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      io.unobserve(entry.target);
    }
  }
}, { threshold: 0.18 });

revealEls.forEach(el => io.observe(el));

// ---------- Confetti (canvas) ----------
const canvas = document.getElementById("confetti");
const ctx = canvas.getContext("2d");

let W = 0, H = 0;
function resizeCanvas() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  W = Math.floor(window.innerWidth * dpr);
  H = Math.floor(window.innerHeight * dpr);
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function rand(min, max) { return Math.random() * (max - min) + min; }

let particles = [];
let confettiRunning = false;
let confettiEndAt = 0;

function makeConfettiBurst(count = 160) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const originX = (window.innerWidth * 0.5) * dpr;
  const originY = (window.innerHeight * 0.25) * dpr;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: originX + rand(-30, 30) * dpr,
      y: originY + rand(-20, 20) * dpr,
      vx: rand(-6, 6) * dpr,
      vy: rand(-12, -5) * dpr,
      g: rand(0.18, 0.28) * dpr,
      size: rand(5, 10) * dpr,
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.22, 0.22),
      color: Math.random() < 0.5
        ? "rgba(255,77,141,0.95)"
        : "rgba(255,209,225,0.95)",
      life: rand(90, 160)
    });
  }
}

function startConfetti(durationMs = 1200) {
  canvas.style.opacity = "1";
  confettiRunning = true;
  confettiEndAt = performance.now() + durationMs;
  makeConfettiBurst(170);

  if (!animating) requestAnimationFrame(loop);
}

function stopConfetti() {
  confettiRunning = false;
  particles = [];
  ctx.clearRect(0, 0, W, H);
  canvas.style.opacity = "0";
}

let animating = false;

function loop(now) {
  animating = true;

  ctx.clearRect(0, 0, W, H);

  particles = particles.filter(p => p.life > 0);

  for (const p of particles) {
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 1;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
    ctx.restore();
  }

  if (confettiRunning && now > confettiEndAt) {
    confettiRunning = false;
  }

  if (particles.length > 0 || confettiRunning) {
    requestAnimationFrame(loop);
  } else {
    stopConfetti();
    animating = false;
  }
}

// ---------- Main interaction flow ----------
const startBtn = document.getElementById("startBtn");
const content = document.getElementById("content");

startBtn.addEventListener("click", () => {
  content.style.display = "block";
  content.setAttribute("aria-hidden", "false");

  startConfetti(1300);

  setTimeout(() => {
    content.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 250);
});

// ---------- Yes / No behavior (darting No -> 😡) ----------
const yesBtn = document.getElementById("yesBtn");
const noBtn  = document.getElementById("noBtn");
const result = document.getElementById("result");

let noCount = 0;

// Keep "No" in the normal layout (no fixed darting)
noBtn.style.position = "relative";
noBtn.style.left = "0px";
noBtn.style.top  = "0px";

// Helper
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function moveNoASmallWay() {
  // Measure positions
  const noRect  = noBtn.getBoundingClientRect();
  const yesRect = yesBtn.getBoundingClientRect();

  // How far "No" is allowed to move from its original spot (in px)
  const maxMove = 70;     // small teleport distance
  const pad = 10;

  // We'll try a few random offsets and pick one that:
  // 1) keeps No fully on-screen
  // 2) does NOT overlap the Yes button
  for (let tries = 0; tries < 18; tries++) {
    const dx = Math.round((Math.random() * 2 - 1) * maxMove);
    const dy = Math.round((Math.random() * 2 - 1) * maxMove);

    const newLeft = dx;
    const newTop  = dy;

    // Predict new rect if we apply transform translate
    const predicted = {
      left: noRect.left + newLeft,
      top: noRect.top + newTop,
      right: noRect.right + newLeft,
      bottom: noRect.bottom + newTop
    };

    // 1) stay on screen
    const onScreen =
      predicted.left >= pad &&
      predicted.top >= pad &&
      predicted.right <= window.innerWidth - pad &&
      predicted.bottom <= window.innerHeight - pad;

    if (!onScreen) continue;

    // 2) don't overlap Yes button (with a little safety padding)
    const overlap =
      predicted.left < (yesRect.right + pad) &&
      predicted.right > (yesRect.left - pad) &&
      predicted.top < (yesRect.bottom + pad) &&
      predicted.bottom > (yesRect.top - pad);

    if (overlap) continue;

    // If valid, apply the move smoothly
    noBtn.style.transition = "transform 160ms ease";
    noBtn.style.transform = `translate(${newLeft}px, ${newTop}px)`;

    // Tiny bounce to feel intentional
    noBtn.animate(
      [{ transform: `translate(${newLeft}px, ${newTop}px) scale(0.98)` },
       { transform: `translate(${newLeft}px, ${newTop}px) scale(1.02)` },
       { transform: `translate(${newLeft}px, ${newTop}px) scale(1.00)` }],
      { duration: 180, easing: "ease-out" }
    );

    return;
  }

  // Fallback: if we couldn't find a safe move, just nudge downward a bit
  noBtn.style.transform = `translate(0px, 40px)`;
}

yesBtn.addEventListener("click", () => {
  startConfetti(1600);
  result.innerHTML = "YAYYYYY 💖💖💖<br>You're now  officially my Valentine ";

  yesBtn.disabled = true;
  noBtn.disabled = true;
});

noBtn.addEventListener("click", () => {
  noCount++;

  const lines = [
    "Wait… what",
    "akeed misclick ",
    "You sure about that? ",
    "ba3mallik 3oros hala",
    "wi7yat rabbi la afarjeeki",
    "sharmoota",
    "just press the fucking yes button"
  ];

  // Message updates
  result.textContent = lines[Math.min(noCount - 1, lines.length - 1)];

  // Move ONLY on click, and only a small amount
  moveNoASmallWay();

  // Turn into angry emoji after enough attempts
  if (noCount >= 8) {
  const src = "./img/bird.jpeg";
  noBtn.innerHTML = `<img class="wa-emoji" src="${src}" alt="angry bird">`;
  noBtn.classList.add("angry");

  const img = noBtn.querySelector("img");
  console.log("img src (raw):", img.getAttribute("src"));
  console.log("img src (resolved):", img.src);

  img.addEventListener("error", () => console.log("IMAGE FAILED TO LOAD:", img.src));
  img.addEventListener("load",  () => console.log("IMAGE LOADED:", img.src));
}
});

// If phone rotates/resizes, reset the No button so it doesn't end up awkward
window.addEventListener("resize", () => {
  noBtn.style.transform = "translate(0px, 0px)";
});


// ===============================
// Background hearts (more visible + scroll-reactive)
// Paste at the VERY BOTTOM of script.js
// ===============================
(function () {
  const layer = document.getElementById("bgHearts");
  if (!layer) return;

  const HEART_COUNT = 40;        // increase for more hearts
  const MIN_SIZE = 12;
  const MAX_SIZE = 30;

  const hearts = [];
  const rand = (a, b) => Math.random() * (b - a) + a;

  function spawnHearts() {
    layer.innerHTML = "";
    hearts.length = 0;

    for (let i = 0; i < HEART_COUNT; i++) {
      const el = document.createElement("span");
      el.className = "bg-heart" + (Math.random() < 0.35 ? " is-soft" : "");

      const size = rand(MIN_SIZE, MAX_SIZE);
      const x = rand(0, window.innerWidth);
      const yStart = rand(window.innerHeight * 0.2, window.innerHeight * 1.2);
      const yEnd = yStart - rand(250, 700);
      const drift = rand(-120, 120);

      const duration = rand(6.5, 12.5);
      const delay = rand(0, 6);

      const opacity = rand(0.25, 0.45); // stronger visibility
      const scale = rand(0.85, 1.25);

      el.style.width = size + "px";
      el.style.height = size + "px";

      // CSS vars used by keyframes
      el.style.setProperty("--x", `${x}px`);
      el.style.setProperty("--yStart", `${yStart}px`);
      el.style.setProperty("--yEnd", `${yEnd}px`);
      el.style.setProperty("--drift", `${drift}px`);
      el.style.setProperty("--s", `${scale}`);
      el.style.setProperty("--o", `${opacity}`);

      el.style.animation = `heartFloat ${duration}s linear ${delay}s infinite`;

      layer.appendChild(el);

      hearts.push({
        el,
        baseX: x,
        baseY: yStart,
        drift,
        depth: rand(0.12, 0.55),     // how much it reacts to scroll
        spin: rand(-0.08, 0.08)      // tiny rotation variance
      });
    }
  }

  // Extra scroll-reactive feel (doesn't fight CSS animation; just adds a gentle offset)
  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;

    // Apply tiny drift based on scroll delta
    for (const h of hearts) {
      // only adjust a little so animation stays smooth
      const nudgeX = clamp(dy * h.depth * 0.06, -14, 14);
      const nudgeR = clamp(dy * h.spin * 0.06, -0.9, 0.9);

      h.el.style.transform = `translate3d(${nudgeX}px, 0px, 0px) rotate(${45 + nudgeR}deg)`;
    }
  }

  // clamp helper (your file already has one, but keep this local & safe)
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  spawnHearts();
  window.addEventListener("resize", spawnHearts, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
})();
