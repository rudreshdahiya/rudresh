// Learn cards: our own summaries. Page numbers are PDF pages in the source files.
// Shared by the page (cards) and the API (fallback answers when no model is configured).

const VARSITY = { name: "Zerodha Varsity, Personal Finance", url: "https://zerodha.com/varsity/module/personal-finance/" };
const NISM_VA = { name: "NISM Series V-A workbook (Mutual Fund Distributors)", url: "https://www.nism.ac.in/" };
const NISM_VB = { name: "NISM Series V-B workbook (Mutual Fund Foundation)", url: "https://www.nism.ac.in/" };

export const LEARN_CARDS = [
  {
    id: "emergency-fund",
    title: "Build the cushion before anything else",
    body: "An emergency fund is money set aside for a job loss, a hospital bill or a sudden trip home. It should be easy to reach and shouldn't swing in value, so it isn't the place for equity. The sources don't fix a size. This app uses six months of essential spending, a common rule of thumb.",
    sources: [
      { ...VARSITY, page: 330 },
      { ...NISM_VA, page: 14 },
    ],
    keywords: ["emergency", "cushion", "fund", "job", "loss", "corpus", "safety", "rainy"],
  },
  {
    id: "insurance-first",
    title: "Cover the risks, then invest",
    body: "Varsity puts two things before any portfolio: health and term insurance, then an emergency corpus. Term insurance protects people who depend on you. It also says insurance products linked to investment plans aren't worth it.",
    sources: [
      { ...VARSITY, page: 330 },
      { ...VARSITY, page: 348 },
    ],
    keywords: ["insurance", "term", "health", "cover", "ulip", "policy", "debt", "loan", "credit"],
  },
  {
    id: "inflation",
    title: "Idle money quietly shrinks",
    body: "Inflation means the same rupee buys less every year. ₹50,000 a month of expenses today will cost much more in twenty years, so you can't plan a goal by multiplying today's price by the number of years. Cash sitting in a wallet or savings account loses value in real terms.",
    sources: [
      { ...VARSITY, page: 40 },
      { ...NISM_VA, page: 23 },
    ],
    keywords: ["inflation", "price", "value", "idle", "cash", "savings", "account", "future", "cost"],
  },
  {
    id: "sip",
    title: "SIPs and rupee cost averaging",
    body: "A systematic investment plan puts the same amount in on a fixed date every month. When prices are low that amount buys more units, and when they're high it buys fewer, so you average out your buying price without trying to time the market. That's called rupee cost averaging.",
    sources: [
      { ...NISM_VA, page: 201 },
      { ...NISM_VB, page: 167 },
    ],
    keywords: ["sip", "systematic", "monthly", "rupee", "cost", "averaging", "timing", "market", "regular"],
  },
  {
    id: "compounding",
    title: "Small amounts, long time",
    body: "Returns earn their own returns over time, so time matters as much as the amount. This app's poster projects a trimmed habit at an illustrative 10% a year. Varsity lists long-run growth of roughly 10–11% for equities, 6–7% for fixed deposits and 8–9% for gold, as opinions to test, not promises.",
    sources: [{ ...VARSITY, page: 48 }],
    keywords: ["compound", "compounding", "return", "returns", "growth", "cagr", "long", "time", "percent"],
  },
  {
    id: "time-horizon",
    title: "Match the money to when you need it",
    body: "Pick where money goes based on when you'll need it, not on how good a fund looks. Money for the next few months, like an emergency corpus, suits low-risk, easy-to-withdraw options such as liquid funds, which hold debt maturing within 91 days. Money for ten years away can take more ups and downs.",
    sources: [
      { ...VARSITY, page: 313 },
      { ...VARSITY, page: 132 },
    ],
    keywords: ["horizon", "goal", "short", "long", "term", "liquid", "debt", "equity", "when", "years"],
  },
  {
    id: "expense-ratio",
    title: "What a fund costs you",
    body: "Every mutual fund charges a yearly fee called the total expense ratio, taken out of the fund's value. It's disclosed and easy to compare. Index funds have very little active management, so their expense ratio is usually low. A small difference in fees adds up over many years.",
    sources: [
      { ...NISM_VB, page: 64 },
      { ...NISM_VB, page: 74 },
    ],
    keywords: ["expense", "ratio", "ter", "fee", "fees", "cost", "charges", "index", "compare", "direct"],
  },
];

export function matchCard(question) {
  const words = question.toLowerCase().match(/[a-z]+/g) || [];
  let best = null;
  let bestScore = 0;
  for (const card of LEARN_CARDS) {
    const score = words.filter((w) => card.keywords.includes(w)).length;
    if (score > bestScore) [best, bestScore] = [card, score];
  }
  return best;
}
