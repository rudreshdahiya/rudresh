import { BUCKETS, analyse, sipFutureValue, EMERGENCY_MONTHS } from "./engine.js";
import { ARCHETYPES } from "./archetypes.js";
import { LEARN_CARDS, matchCard } from "./learn-cards.js";
import { classify, REFUSAL, OFF_TOPIC_REPLY } from "../lib/guardrail.js";

const $ = (s) => document.querySelector(s);
const rupees = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const digits = (v) => Number(String(v).replace(/[^\d]/g, "")) || 0;
const STORE = "pkg-month-v1";

const GROUPS = { needs: "Needs", family: "Family", wants: "Wants", saved: "Saved" };
const EXAMPLE = { income: 52000, rent: 15000, bills: 6500, commute: 2500, family: 5000, food: 7500, shopping: 3000, fun: 3500, saved: 4000 };

// ---------- Scene 1: the month ----------

function renderBuckets() {
  const wrap = $("#buckets");
  for (const [group, title] of Object.entries(GROUPS)) {
    const block = document.createElement("div");
    block.className = `bucket-group g-${group}`;
    block.innerHTML = `<p class="group-name">${title}</p>`;
    for (const b of BUCKETS.filter((x) => x.group === group)) {
      block.insertAdjacentHTML(
        "beforeend",
        `<div class="row"><label for="b-${b.key}">${b.label}</label>
         <div class="money small"><span aria-hidden="true">₹</span><input id="b-${b.key}" name="${b.key}" inputmode="numeric" autocomplete="off" placeholder="0"></div></div>`
      );
    }
    wrap.append(block);
  }
}

function readForm() {
  const f = $("#month-form");
  const spend = Object.fromEntries(BUCKETS.map((b) => [b.key, digits(f.elements[b.key].value)]));
  return {
    income: digits(f.elements.income.value),
    spend,
    habits: { payday: f.elements.payday.value || null, plan: f.elements.plan.value || null },
  };
}

function fillForm(data) {
  const f = $("#month-form");
  const put = (name, v) => (f.elements[name].value = v ? Number(v).toLocaleString("en-IN") : "");
  put("income", data.income);
  for (const b of BUCKETS) put(b.key, data.spend ? data.spend[b.key] : data[b.key]);
  for (const name of ["payday", "plan"]) {
    const v = data.habits?.[name];
    if (v) f.querySelector(`input[name=${name}][value=${v}]`).checked = true;
  }
  updateTally();
}

function updateTally() {
  const { income, spend } = readForm();
  const listed = Object.values(spend).reduce((a, b) => a + b, 0);
  const text = $("#tally-text");
  const fill = $("#bar-fill");
  if (!income) {
    text.textContent = "Add your take-home pay to start.";
    fill.style.width = "0%";
    return;
  }
  const ratio = listed / income;
  fill.style.width = `${Math.min(ratio, 1) * 100}%`;
  fill.classList.toggle("over", ratio > 1);
  const gap = income - listed;
  text.textContent =
    gap >= 0
      ? `${rupees(listed)} placed. ${rupees(gap)} you can't place yet.`
      : `${rupees(listed)} listed, ${rupees(-gap)} more than you took home.`;
}

function save(data) {
  try {
    localStorage.setItem(STORE, JSON.stringify(data));
  } catch {}
}

function restore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE) || "null");
    if (data?.income) fillForm(data);
  } catch {}
}

// ---------- Scene 2: the poster ----------

let current = null;

function twistLine(r) {
  if (r.twist.key === "overspent") return `${rupees(r.twist.amount)} more than you earned`;
  if (r.twist.key === "unplaced") return `${rupees(r.twist.amount)} a month you can't place`;
  return "You can place almost every rupee";
}

function sequelLine(r) {
  const s = r.sequel;
  if (r.twist.key === "overspent") return `Close the ${rupees(r.twist.amount)} gap first`;
  if (!s.target) return "Start a cushion";
  if (s.monthsWithTrim) return `A ${EMERGENCY_MONTHS}-month cushion in ${s.monthsWithTrim} months`;
  return `A ${EMERGENCY_MONTHS}-month cushion, starting now`;
}

function renderPoster(r) {
  const a = ARCHETYPES[r.key];
  const poster = $("#poster");
  poster.style.setProperty("--ray-a", a.rays[0]);
  poster.style.setProperty("--ray-b", a.rays[1]);
  poster.style.setProperty("--title-ink", a.ink);
  $("#p-hindi").textContent = a.hindi;
  $("#p-name").textContent = a.name;
  $("#p-tagline").textContent = a.tagline;
  $("#p-villain").textContent = r.villain ? `${r.villain.label}, ${rupees(r.villain.monthly)} a month` : "None worth naming";
  $("#p-twist").textContent = twistLine(r);
  $("#p-sequel").textContent = sequelLine(r);

  renderNumbers(r);
  $("#why-list").innerHTML = r.why.map((w) => `<li>${w}</li>`).join("");
  $("#next-text").textContent = a.next;
  const card = LEARN_CARDS.find((c) => c.id === a.learn);
  const link = $("#next-learn");
  link.textContent = `Read: ${card.title}`;
  link.href = `#card-${card.id}`;
  link.onclick = () => openCard(card.id);
}

function renderNumbers(r) {
  const rate = Number($("#rate").value);
  const v = r.villain;
  const vd = $("#villain-detail");
  if (!v) {
    vd.innerHTML = `<p>No single leak stands out. Nothing you spend on "wants" is above 3% of your take-home.</p>`;
  } else if (v.key === "overspend") {
    vd.innerHTML = `<p><strong>${rupees(v.monthly)}</strong> a month more than you took home is <strong>${rupees(v.yearly)}</strong> a year that came from credit, loans or past savings.</p>`;
  } else {
    const grown = Math.round(sipFutureValue(v.trim, rate, 10));
    const subject = v.key === "unaccounted" ? "Money you can't place" : v.label;
    vd.innerHTML = `<p><strong>${subject}</strong>: ${rupees(v.monthly)} a month, ${rupees(v.yearly)} a year (${Math.round(v.share * 100)}% of take-home).</p>
      <p>Trim a quarter of it, ${rupees(v.trim)} a month, and set it aside for ten years: ${rupees(v.trim * 120)} saved, or about <strong>${rupees(grown)}</strong> if it grew at ${Math.round(rate * 100)}% a year.</p>`;
  }
  const s = r.sequel;
  const sd = $("#sequel-detail");
  if (!s.target) {
    sd.innerHTML = `<p>Add rent, bills, commute or family support to size your emergency cushion.</p>`;
    return;
  }
  const now = s.monthsNow ? `At what you save now (${rupees(r.spend.saved)} a month), that takes about <strong>${s.monthsNow} months</strong>.` : "You aren't saving anything yet, so this is where to start.";
  const trim = s.extra && s.monthsWithTrim ? ` Add the trimmed ${rupees(s.extra)} and it's about <strong>${s.monthsWithTrim} months</strong>.` : "";
  sd.innerHTML = `<p>Your essentials (rent, bills, commute, family) come to ${rupees(s.essentials)} a month. A ${EMERGENCY_MONTHS}-month cushion is <strong>${rupees(s.target)}</strong>. ${now}${trim}</p>`;
}

async function sharePoster() {
  const btn = $("#share");
  btn.disabled = true;
  btn.textContent = "Preparing…";
  try {
    if (!window.html2canvas) {
      await new Promise((ok, fail) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        s.onload = ok;
        s.onerror = () => fail(new Error("Couldn't load the image tool. Check your connection and try again."));
        document.head.append(s);
      });
    }
    await document.fonts.ready;
    const canvas = await window.html2canvas($("#poster"), { scale: 2, backgroundColor: null });
    const blob = await new Promise((ok) => canvas.toBlob(ok, "image/png"));
    const file = new File([blob], "paisa-kahan-gaya.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Paisa Kahan Gaya?", text: "My month, as a film." });
    } else {
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: file.name });
      a.click();
      URL.revokeObjectURL(a.href);
    }
  } catch (e) {
    if (e.name !== "AbortError") $("#form-error").textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Share poster";
  }
}

// ---------- Scene 3: learn ----------

function renderCards() {
  $("#cards").innerHTML = LEARN_CARDS.map(
    (c) => `<details class="card" id="card-${c.id}">
      <summary>${c.title}</summary>
      <p>${c.body}</p>
      <p class="sources">${c.sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.name}, p.${s.page}</a>`).join("<br>")}</p>
    </details>`
  ).join("");
}

function openCard(id) {
  const el = document.getElementById(`card-${id}`);
  if (el) el.open = true;
}

// Static hosting has no /api: answer in the browser with the same rules and summaries.
function localAnswer(question) {
  const { verdict } = classify(question);
  if (verdict === "advice") return { mode: "refused", answer: REFUSAL, card: "expense-ratio", citations: [] };
  if (verdict !== "ok") return { mode: "off_topic", answer: OFF_TOPIC_REPLY, citations: [] };
  const card = matchCard(question);
  if (!card) return { mode: "card", answer: "My sources don't cover that. Try one of the topics above.", citations: [] };
  return { mode: "card", answer: card.body, card: card.id, citations: card.sources.map((s) => ({ source: s.name, page: s.page, url: s.url })) };
}

const STATIC_HOST = location.hostname.endsWith("github.io");

async function fetchAnswer(question) {
  if (STATIC_HOST) return localAnswer(question);
  let res;
  try {
    res = await fetch("api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
  } catch {
    return localAnswer(question);
  }
  if ([404, 405, 501].includes(res.status)) return localAnswer(question);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}

async function ask(question) {
  const box = $("#answer");
  box.hidden = false;
  box.className = "answer loading";
  box.textContent = "Looking it up in the sources…";
  try {
    const data = await fetchAnswer(question);
    box.className = `answer mode-${data.mode}`;
    const cites = (data.citations || []).map((c) => `<a href="${c.url}" target="_blank" rel="noopener">${c.source}, p.${c.page}</a>`).join("<br>");
    const label = { refused: "Not something I'll answer", grounded: "From the sources", card: "From our summaries", off_topic: "Outside what I cover" }[data.mode];
    box.innerHTML = `<p class="answer-label">${label}</p><p></p>${data.note ? `<p class="fine">${data.note}</p>` : ""}${cites ? `<p class="sources">${cites}</p>` : ""}`;
    box.querySelector("p:nth-child(2)").textContent = data.answer;
    if (data.card) openCard(data.card);
  } catch (e) {
    box.className = "answer mode-error";
    box.textContent = e.message;
  }
}

// ---------- wiring ----------

function init() {
  renderBuckets();
  renderCards();
  restore();

  const form = $("#month-form");
  form.addEventListener("input", (e) => {
    if (e.target.inputMode === "numeric") {
      const n = digits(e.target.value);
      e.target.value = n ? n.toLocaleString("en-IN") : "";
    }
    updateTally();
  });

  $("#example").addEventListener("click", () => fillForm({ ...EXAMPLE, habits: { payday: "treat", plan: "check" } }));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $("#form-error");
    err.textContent = "";
    const data = readForm();
    try {
      current = analyse(data, { returnRate: Number($("#rate").value) });
    } catch (ex) {
      err.textContent = ex.message;
      $("#income").focus();
      return;
    }
    save(data);
    renderPoster(current);
    const scene = $("#poster-scene");
    scene.hidden = false;
    scene.classList.remove("revealed");
    void scene.offsetWidth;
    scene.classList.add("revealed");
    scene.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });

  $("#rate").addEventListener("change", () => current && renderNumbers(current));
  $("#edit").addEventListener("click", () => {
    $("#month").scrollIntoView();
    $("#income").focus();
  });
  $("#share").addEventListener("click", sharePoster);

  $("#ask-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#question").value.trim();
    if (q) ask(q);
  });
  document.querySelectorAll(".chip-btn").forEach((b) =>
    b.addEventListener("click", () => {
      $("#question").value = b.textContent;
      ask(b.textContent);
    })
  );
}

init();
