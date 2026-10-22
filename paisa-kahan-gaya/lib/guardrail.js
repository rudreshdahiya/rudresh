// Runs before any model call. A question that asks for a product pick, timing or
// a promise is refused in code, so no prompt wording can talk its way past it.

const PRODUCT = "(fund|funds|stock|stocks|share|shares|scheme|schemes|app|apps|ipo|ipos|crypto|coin|coins|etf|etfs|policy|policies|insurer|broker|bank|amc|nfo)";

const ADVICE = [
  new RegExp(`\\b(which|best|top|safest|highest)\\b.{0,40}\\b${PRODUCT}\\b`, "i"),
  new RegExp(`\\bgood\\s+${PRODUCT}\\b`, "i"),
  new RegExp(`\\b(recommend|suggest)\\b.{0,40}\\b${PRODUCT}\\b`, "i"),
  /\b(stock|share|trading|market|crypto)\s+tips?\b/i,
  /\bshould\s+i\s+(buy|sell|invest|put|switch|exit|redeem|hold)\b/i,
  /\b(buy|sell)\b.{0,20}\b(now|today|tomorrow|this week)\b/i,
  /\b(kaunsa|kaun\s*sa|konsa)\b/i,
  /\bguarantee(d)?\b.{0,20}\breturns?\b/i,
  /\b(double|triple)\s+my\s+money\b/i,
  /\bwhere\s+(should|do)\s+i\s+(invest|put)\b/i,
];

// "Which type of fund…" or "SIP vs lumpsum" asks how things work, not what to buy.
const CONCEPT = /\b(type|types|kind|kinds|category|categories|difference|differ|vs|versus|work|works|mean|means|meaning)\b/i;
const NAMED = /\b(which|best|top|safest|highest)\s+(\w+\s+)?(fund|stock|share|scheme|app|etf|ipo)s?\s+(should|to|for|is|are)\b/i;

const OFF_TOPIC = /\b(cricket|movie review|weather|recipe|homework|election|astrology|horoscope)\b/i;

export function classify(question) {
  // "emergency fund" names a goal, not a product
  const q = String(question || "").trim().replace(/\bemergency\s+funds?\b/gi, "emergency cushion");
  if (q.length < 3) return { verdict: "empty" };
  const hit = ADVICE.findIndex((re) => re.test(q));
  if (hit !== -1) {
    const conceptOnly = hit === 0 && CONCEPT.test(q) && !NAMED.test(q);
    if (!conceptOnly) return { verdict: "advice" };
  }
  if (OFF_TOPIC.test(q)) return { verdict: "off_topic" };
  return { verdict: "ok" };
}

// Second check, on the model's own answer. If it slipped into recommending, drop it.
const ADVICE_OUT = [/\byou should (buy|invest in|sell)\b/i, /\bi (recommend|suggest)\b/i, /\b(best|top) (fund|stock|scheme)s? (is|are|for you)\b/i];

export function answerLooksLikeAdvice(text) {
  return ADVICE_OUT.some((re) => re.test(text || ""));
}

export const REFUSAL =
  "That's a request for a recommendation, and I don't give those. In India, personalised investment advice needs a SEBI-registered investment adviser (you can check registrations on sebi.gov.in). What I can do is explain how to compare options yourself: what you need the money for, when you'll need it, and what it costs.";

export const OFF_TOPIC_REPLY = "I only cover everyday money basics: saving, emergency funds, SIPs, inflation, insurance and what funds cost. Try one of the topics above.";
