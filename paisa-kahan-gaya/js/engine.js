// Paisa Kahan Gaya? — deterministic money-month engine.
// Pure functions only: no DOM, no network. Shared by the browser and the tests.

export const BUCKETS = [
  { key: "rent", label: "Rent / EMI", group: "needs" },
  { key: "bills", label: "Groceries & bills", group: "needs" },
  { key: "commute", label: "Commute", group: "needs" },
  { key: "family", label: "Family / sent home", group: "family" },
  { key: "food", label: "Eating out & ordering", group: "wants" },
  { key: "shopping", label: "Shopping", group: "wants" },
  { key: "fun", label: "Trips, outings & subscriptions", group: "wants" },
  { key: "saved", label: "Saved or invested", group: "saved" },
];

// The lines each archetype is judged against. These are design choices, not
// population statistics; the poster's "how we decided" panel says so.
export const LINES = {
  overspend: 0.02, // spent more than 2% beyond income
  unaccounted: 0.2, // can't place 20%+ of income
  unaccountedDrift: 0.12, // lower bar when they say money "just goes"
  needs: 0.6,
  needsSavedMax: 0.1,
  family: 0.15,
  food: 0.15,
  shopping: 0.12,
  fun: 0.12,
  saved: 0.25,
  gang: 0.2,
  villainMin: 0.03,
};

export const EMERGENCY_MONTHS = 6;
export const DEFAULT_RETURN = 0.1; // illustrative; Varsity cites 10–11% long-run for equities

const pct = (x) => `${Math.round(x * 100)}%`;

export function sipFutureValue(monthly, annualRate, years) {
  const n = years * 12;
  if (annualRate === 0) return monthly * n;
  const r = annualRate / 12;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

function clean(n) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function analyse(input, { returnRate = DEFAULT_RETURN } = {}) {
  const income = clean(input.income);
  if (!income) throw new Error("Enter your take-home pay to see your poster.");

  const spend = Object.fromEntries(BUCKETS.map((b) => [b.key, clean(input.spend?.[b.key])]));
  const habits = input.habits || {};
  const share = Object.fromEntries(Object.entries(spend).map(([k, v]) => [k, v / income]));

  const needs = spend.rent + spend.bills + spend.commute;
  const accounted = Object.values(spend).reduce((a, b) => a + b, 0);
  const gap = income - accounted; // +ve: can't place it; -ve: spent beyond income
  const gapShare = gap / income;
  const needsShare = needs / income;

  const why = [];
  let key;

  if (gapShare < -LINES.overspend) {
    key = "udhaar";
    why.push(`What you listed adds up to ${pct(accounted / income)} of your take-home, so the gap came from somewhere else (card, loan or savings).`);
  } else if (gapShare >= LINES.unaccounted || (habits.payday === "drift" && gapShare >= LINES.unaccountedDrift)) {
    key = "whodunit";
    why.push(`You couldn't place ${pct(gapShare)} of your take-home. Above ${pct(habits.payday === "drift" ? LINES.unaccountedDrift : LINES.unaccounted)} we call it a mystery.`);
  } else if (needsShare >= LINES.needs && share.saved < LINES.needsSavedMax) {
    key = "struggler";
    why.push(`Rent, bills and commute take ${pct(needsShare)} of your take-home, which leaves little room for anything else.`);
  } else {
    const scores = {
      ghar: share.family / LINES.family + (habits.payday === "family" ? 0.4 : 0),
      dildaar: habits.plan === "payforall" ? (share.food + share.fun) / LINES.gang + 0.5 : 0,
      weekend: share.food / LINES.food,
      showstopper: share.shopping / LINES.shopping,
      ghumakkad: share.fun / LINES.fun + (habits.plan === "in" ? 0.2 : 0),
      saver: share.saved / LINES.saved + (habits.payday === "save" ? 0.3 : 0) + (habits.plan === "skip" ? 0.2 : 0),
    };
    const [bestKey, best] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    key = best >= 1 ? bestKey : "allrounder";
    const reasons = {
      ghar: `Family support is ${pct(share.family)} of your take-home (our line is ${pct(LINES.family)}).`,
      dildaar: `You usually pay for others, and eating out plus outings are ${pct(share.food + share.fun)} of your take-home.`,
      weekend: `Eating out and ordering is ${pct(share.food)} of your take-home (our line is ${pct(LINES.food)}).`,
      showstopper: `Shopping is ${pct(share.shopping)} of your take-home (our line is ${pct(LINES.shopping)}).`,
      ghumakkad: `Trips, outings and subscriptions are ${pct(share.fun)} of your take-home (our line is ${pct(LINES.fun)}).`,
      saver: `You save or invest ${pct(share.saved)} of your take-home (our line is ${pct(LINES.saved)}).`,
      allrounder: "Nothing crosses its line, so no single habit runs the show.",
    };
    why.push(reasons[key]);
  }

  // Villain: the leak worth naming
  let villain = null;
  if (key === "udhaar") {
    villain = { key: "overspend", label: "Spending beyond income", monthly: -gap };
  } else if (key === "whodunit") {
    villain = { key: "unaccounted", label: "Money you can't place", monthly: gap };
  } else {
    const top = BUCKETS.filter((b) => b.group === "wants").map((b) => ({ ...b, monthly: spend[b.key] })).sort((a, b) => b.monthly - a.monthly)[0];
    if (top.monthly / income >= LINES.villainMin) villain = { key: top.key, label: top.label, monthly: top.monthly };
  }
  if (villain) {
    villain.yearly = villain.monthly * 12;
    villain.share = villain.monthly / income;
    villain.trim = Math.round(villain.monthly / 4);
    villain.trimTenYears = Math.round(sipFutureValue(villain.trim, returnRate, 10));
    villain.trimTenYearsFlat = villain.trim * 120;
  }

  // Plot twist: what the user didn't expect to see
  let twist;
  if (gapShare < -LINES.overspend) twist = { key: "overspent", amount: -gap };
  else if (gapShare >= 0.05) twist = { key: "unplaced", amount: gap };
  else twist = { key: "clean", amount: Math.max(gap, 0) };

  // Sequel: emergency fund pace
  const essentials = needs + spend.family;
  const target = essentials * EMERGENCY_MONTHS;
  const extra = villain && villain.key !== "overspend" ? villain.trim : 0;
  const sequel = {
    essentials,
    target,
    monthsNow: spend.saved > 0 ? Math.ceil(target / spend.saved) : null,
    monthsWithTrim: spend.saved + extra > 0 ? Math.ceil(target / (spend.saved + extra)) : null,
    extra,
  };

  return { key, income, spend, share, accounted, gap, gapShare, needsShare, villain, twist, sequel, why, returnRate };
}
