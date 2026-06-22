const reveals = document.querySelectorAll("[data-reveal]");

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12 }
);

reveals.forEach((element) => revealObserver.observe(element));

const canvas = document.getElementById("signal-canvas");
const ctx = canvas.getContext("2d");
let width = 0;
let height = 0;
let deviceScale = 1;
let points = [];
let pointer = { x: 0, y: 0, active: false };

function resizeCanvas() {
  deviceScale = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * deviceScale);
  canvas.height = Math.floor(height * deviceScale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  createPoints();
}

function createPoints() {
  const count = Math.min(76, Math.max(34, Math.floor((width * height) / 19000)));
  points = Array.from({ length: count }, (_, index) => ({
    x: ((index * 127.3) % width) + Math.random() * 20,
    y: ((index * 89.7) % height) + Math.random() * 20,
    vx: (Math.random() - 0.5) * 0.22,
    vy: (Math.random() - 0.5) * 0.22,
    phase: Math.random() * Math.PI * 2,
  }));
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  for (const point of points) {
    point.x += point.vx;
    point.y += point.vy;
    point.phase += 0.01;

    if (point.x < -20) point.x = width + 20;
    if (point.x > width + 20) point.x = -20;
    if (point.y < -20) point.y = height + 20;
    if (point.y > height + 20) point.y = -20;
  }

  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    for (let j = i + 1; j < points.length; j += 1) {
      const b = points[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 135) {
        const alpha = (1 - dist / 135) * 0.26;
        ctx.strokeStyle = `rgba(69, 214, 193, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    if (pointer.active) {
      const dx = a.x - pointer.x;
      const dy = a.y - pointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 210) {
        ctx.strokeStyle = `rgba(242, 184, 75, ${(1 - dist / 210) * 0.34})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
      }
    }
  }

  for (const point of points) {
    const pulse = 1.8 + Math.sin(point.phase) * 0.7;
    ctx.fillStyle = "rgba(185, 246, 223, 0.56)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", (event) => {
  pointer = { x: event.clientX, y: event.clientY, active: true };
});
window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

resizeCanvas();
draw();
