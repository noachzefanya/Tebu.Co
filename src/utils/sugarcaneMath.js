/**
 * sugarcaneMath.js — Tebu.Co Agronomy Engine
 * ============================================
 * Models sucrose degradation kinetics for Situbondo sugarcane
 * based on empirical "Tunda Giling" (harvest-to-mill delay) data.
 *
 * Model parameters (calibrated for Situbondo KPTR):
 *  - BASE_RENDEMEN       : 8.50%   fresh-cut maximum
 *  - GRACE_PERIOD_H      : 6h      no decay before this threshold
 *  - DECAY_RATE          : 0.05%/h linear decay after grace period
 *  - CRITICAL_THRESHOLD_H: 24h     warning: significant quality loss
 *  - CANE_PRICE_PER_TON  : Rp 55.000 / ton (KPTR reference price)
 *  - FACTORY_CAPACITY_TON: 120 ton (Noach's harvest area estimate)
 */

// ── Constants ──────────────────────────────────────────────────────────────
export const BASE_RENDEMEN        = 8.50;   // %
export const GRACE_PERIOD_H       = 6;      // hours (no decay)
export const DECAY_RATE_PER_HOUR  = 0.05;   // % per hour after grace period
export const CRITICAL_THRESHOLD_H = 24;     // hours → critical warning
export const MIN_RENDEMEN         = 5.00;   // floor — cane is unusable below this
export const CANE_PRICE_PER_TON   = 55_000; // IDR per ton per 1% rendemen
export const HARVEST_TONS         = 120;    // estimated tons for Noach's field

/**
 * getElapsedHours(harvestTimestamp)
 * ──────────────────────────────────
 * Returns decimal hours elapsed since the given ISO timestamp
 * (or Date object / epoch ms).
 *
 * @param  {Date|string|number} harvestTimestamp
 * @returns {number} hours elapsed (≥ 0)
 */
export function getElapsedHours(harvestTimestamp) {
  const harvestMs = harvestTimestamp instanceof Date
    ? harvestTimestamp.getTime()
    : new Date(harvestTimestamp).getTime();

  if (isNaN(harvestMs)) {
    throw new Error('[sugarcaneMath] Invalid harvestTimestamp: ' + harvestTimestamp);
  }

  const elapsedMs = Date.now() - harvestMs;
  return Math.max(0, elapsedMs / 3_600_000); // ms → hours
}

/**
 * calcRendemen(elapsedHours, baseRendemen?)
 * ──────────────────────────────────────────
 * Calculates current sucrose rendemen (%) after `elapsedHours`
 * using a piecewise linear decay model:
 *
 *   rendemen = baseRendemen                              if elapsedHours ≤ GRACE_PERIOD_H
 *   rendemen = baseRendemen - (h - GRACE_PERIOD_H)
 *              × DECAY_RATE_PER_HOUR                     if elapsedHours >  GRACE_PERIOD_H
 *   rendemen = max(rendemen, MIN_RENDEMEN)               floor applied
 *
 * @param  {number} elapsedHours   hours since harvest
 * @param  {number} [baseRendemen] override base (default 8.5%)
 * @returns {number} rendemen in %
 */
export function calcRendemen(elapsedHours, baseRendemen = BASE_RENDEMEN) {
  let rendemen = baseRendemen;
  if (elapsedHours > 6) {
    if (elapsedHours <= 18) {
      rendemen -= (elapsedHours - 6) * 0.12;
    } else {
      rendemen -= (12 * 0.12);
      rendemen -= (elapsedHours - 18) * 0.35;
    }
  }
  return Math.max(MIN_RENDEMEN, parseFloat(rendemen.toFixed(4)));
}

/**
 * calcRendemenAtHour(targetHour, baseRendemen?)
 * ──────────────────────────────────────────────
 * Returns rendemen at a *specific* hour mark (for chart points).
 * Identical to calcRendemen but semantically named for chart use.
 *
 * @param  {number} targetHour   0 | 6 | 12 | 18 | 24 | …
 * @param  {number} [baseRendemen]
 * @returns {number} rendemen %
 */
export function calcRendemenAtHour(targetHour, baseRendemen = BASE_RENDEMEN) {
  return calcRendemen(targetHour, baseRendemen);
}

/**
 * buildDecayCurve(checkpoints?, baseRendemen?)
 * ─────────────────────────────────────────────
 * Returns an array of { hour, rendemen, heightPct } objects
 * for visualising the decay curve across time checkpoints.
 *
 * heightPct is normalised 0–100 relative to baseRendemen
 * (so the 0h bar is always 100% height).
 *
 * @param  {number[]} [checkpoints] default: [0, 6, 12, 18, 24]
 * @param  {number}   [baseRendemen]
 * @returns {{ hour: number, rendemen: number, heightPct: number }[]}
 */
export function buildDecayCurve(
  checkpoints = [0, 6, 12, 18, 24],
  baseRendemen = BASE_RENDEMEN
) {
  return checkpoints.map((hour) => {
    const rendemen   = calcRendemenAtHour(hour, baseRendemen);
    const heightPct  = parseFloat(((rendemen / baseRendemen) * 100).toFixed(1));
    return { hour, rendemen, heightPct };
  });
}

/**
 * isCriticalDelay(elapsedHours)
 * ──────────────────────────────
 * Returns true when elapsed time exceeds the critical 24h threshold.
 *
 * @param  {number} elapsedHours
 * @returns {boolean}
 */
export function isCriticalDelay(elapsedHours) {
  return elapsedHours >= CRITICAL_THRESHOLD_H;
}

/**
 * getDelayUrgency(elapsedHours)
 * ──────────────────────────────
 * Returns a severity level string for UI theming.
 *
 * @param  {number} elapsedHours
 * @returns {'safe'|'warning'|'critical'}
 */
export function getDelayUrgency(elapsedHours) {
  if (elapsedHours < GRACE_PERIOD_H)        return 'safe';
  if (elapsedHours < CRITICAL_THRESHOLD_H)  return 'warning';
  return 'critical';
}

/**
 * formatCountdown(elapsedHours, thresholdHours?)
 * ───────────────────────────────────────────────
 * Returns a human-readable countdown string showing time *remaining*
 * before the critical threshold.
 *
 * Examples:
 *   elapsed=14.37h, threshold=24h → "9j 37m"
 *   elapsed=25h                   → "MELEWATI BATAS"
 *
 * @param  {number} elapsedHours
 * @param  {number} [thresholdHours] default 24
 * @returns {string}
 */
export function formatCountdown(elapsedHours, thresholdHours = CRITICAL_THRESHOLD_H) {
  const remaining = thresholdHours - elapsedHours;
  if (remaining <= 0) return 'MELEWATI BATAS';
  const h = Math.floor(remaining);
  const m = Math.floor((remaining - h) * 60);
  return `${h}j ${String(m).padStart(2, '0')}m`;
}

/**
 * formatElapsed(elapsedHours)
 * ────────────────────────────
 * Returns how long ago harvest happened: "14j 22m"
 *
 * @param  {number} elapsedHours
 * @returns {string}
 */
export function formatElapsed(elapsedHours) {
  const h = Math.floor(elapsedHours);
  const m = Math.floor((elapsedHours - h) * 60);
  return `${h}j ${String(m).padStart(2, '0')}m`;
}

/**
 * calcFinancialLoss(elapsedHours, tons?, pricePerTon?)
 * ──────────────────────────────────────────────────────
 * Estimates financial loss (IDR) caused by sucrose degradation.
 *
 * Loss = (baseRendemen - currentRendemen) / 100
 *        × tons
 *        × tonSugar * sugarPricePerKg
 *
 * Simplified model:
 *   revenue = rendemen% × tons × CANE_PRICE_PER_TON
 *   loss    = (baseRendemen - currentRendemen) × tons × CANE_PRICE_PER_TON / 100
 *
 * @param  {number} elapsedHours
 * @param  {number} [tons]         default: HARVEST_TONS (120t)
 * @param  {number} [pricePerTon]  default: CANE_PRICE_PER_TON
 * @returns {{ loss: number, lossFormatted: string, currentRevenue: number, potentialRevenue: number }}
 */
export function calcFinancialLoss(
  elapsedHours,
  tons         = HARVEST_TONS,
  pricePerTon  = CANE_PRICE_PER_TON
) {
  const currentRendemen  = calcRendemen(elapsedHours);
  const potentialRevenue = (BASE_RENDEMEN  / 100) * tons * pricePerTon * 1000; // × 1000 for per-kg factor
  const currentRevenue   = (currentRendemen / 100) * tons * pricePerTon * 1000;
  const loss             = potentialRevenue - currentRevenue;

  return {
    loss,
    lossFormatted:     formatIDR(loss),
    currentRevenue,
    currentFormatted:  formatIDR(currentRevenue),
    potentialRevenue,
    potentialFormatted: formatIDR(potentialRevenue),
    currentRendemen,
    rendemenLoss: parseFloat((BASE_RENDEMEN - currentRendemen).toFixed(4)),
  };
}

/**
 * calcEstimatedIncome(rendemen, tons?, pricePerTon?)
 * ───────────────────────────────────────────────────
 * Quick helper used by HomeScreen for the "Est. Income" stat.
 *
 * @param  {number} rendemen     current rendemen %
 * @param  {number} [tons]
 * @param  {number} [pricePerTon]
 * @returns {{ raw: number, millions: string, full: string }}
 */
export function calcEstimatedIncome(
  rendemen,
  tons        = HARVEST_TONS,
  pricePerTon = CANE_PRICE_PER_TON
) {
  // income = rendemen% × tons × price_per_ton (simplified KPTR formula)
  const raw     = (rendemen / 100) * tons * pricePerTon;
  const millions = (raw / 1_000_000).toFixed(2);
  return {
    raw,
    millions,          // e.g. "5.61" (displayed as "5.61 M")
    full: formatIDR(raw),
  };
}

// ── Internal helpers ───────────────────────────────────────────────────────

/**
 * formatIDR(amount)
 * ──────────────────
 * Formats a number as Indonesian Rupiah string.
 * e.g. 5610000 → "Rp 5.610.000"
 */
export function formatIDR(amount) {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

/**
 * calculateFinancials
 * ────────────────────
 * Supports transparent farmer financial calculation based on empirical pricing.
 */
export function calculateFinancials({
  grossTonnage,
  rendemenPct,
  trashPct = 4.5,
  sugarHapPrice = 14500,
  farmerShareRatio = 0.66
}) {
  const netCaneWeight = grossTonnage * (1 - trashPct / 100);
  const totalSugarYield = netCaneWeight * 1000 * (rendemenPct / 100);
  const grossSugarValue = Math.round(totalSugarYield * sugarHapPrice);
  const farmerNetIncome = Math.round(grossSugarValue * farmerShareRatio);
  const deductions = grossSugarValue - farmerNetIncome;

  return {
    netCaneWeight,
    totalSugarYield,
    grossSugarValue,
    farmerNetIncome,
    deductions
  };
}

/**
 * calculateDepartureSchedule
 * ───────────────────────────
 * Menghitung jadwal wajib berangkat, sisa waktu hitung mundur,
 * dan status ketepatan kedatangan truk di Pabrik Gula.
 */
export function calculateDepartureSchedule({
  targetSlotTime,
  travelDurationMinutes = 45,
  gracePeriodMinutes = 30,
  currentTime = new Date()
}) {
  const slotDate = new Date(targetSlotTime);
  const now = new Date(currentTime);

  // 1. Rekomendasi Waktu Berangkat = Slot PG - Durasi Perjalanan
  const departureDate = new Date(slotDate.getTime() - travelDurationMinutes * 60 * 1000);

  // 2. Batas Akhir Toleransi (Grace Period) = Slot PG + Grace Period
  const lateThresholdDate = new Date(slotDate.getTime() + gracePeriodMinutes * 60 * 1000);

  // 3. Sisa Waktu Menuju Jam Berangkat (dalam menit)
  const diffMs = departureDate.getTime() - now.getTime();
  const minutesToDepart = Math.round(diffMs / (60 * 1000));

  // 4. Evaluasi Status Keberangkatan / Kedatangan
  let status = 'ON_TRACK';
  let statusLabel = 'Wajib Berangkat';
  let statusColor = 'green';

  const nowMs = now.getTime();
  const departureMs = departureDate.getTime();
  const slotMs = slotDate.getTime();
  const lateThresholdMs = lateThresholdDate.getTime();

  if (nowMs < departureMs) {
    status = 'EARLY';
    statusLabel = 'Siap Berangkat';
    statusColor = 'blue';
  } else if (nowMs >= departureMs && nowMs <= slotMs) {
    status = 'ON_TRACK';
    statusLabel = 'Wajib Berangkat';
    statusColor = 'green';
  } else if (nowMs > slotMs && nowMs <= lateThresholdMs) {
    status = 'GRACE_PERIOD';
    statusLabel = 'Masa Toleransi';
    statusColor = 'amber';
  } else {
    status = 'LATE_BUFFER';
    statusLabel = 'Slot Hangus';
    statusColor = 'red';
  }

  return {
    departureTimeISO: departureDate.toISOString(),
    departureTimeFormatted: departureDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    targetSlotFormatted: slotDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    lateThresholdISO: lateThresholdDate.toISOString(),
    minutesToDepart,
    status,
    statusLabel,
    statusColor
  };
}
