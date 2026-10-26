import {
  FIELD_ASK_PRICE_CENTS,
  FIELD_ASK_QUANTITY,
  FIELD_BID_PRICE_CENTS,
  FIELD_BID_QUANTITY,
  FIELD_INSTRUMENT_ID,
  FIELD_TRADE_PRICE_CENTS,
  FIELD_TRADE_QUANTITY,
  INITIAL_PRICE_MIN_CENTS,
  INITIAL_PRICE_RANGE_CENTS,
  MAX_BOOK_QUANTITY,
  MAX_PRICE_CENTS,
  MAX_TRADE_QUANTITY,
  MIN_PRICE_CENTS,
  PRICE_STEP_DIVISOR,
  SPREAD_DIVISOR,
} from './constants';
import { nextBool, nextInt } from './random';

/** Latest bid of every instrument; this is the state kept between batches. */
let bids: Int32Array = new Int32Array(0);

export function instrumentCount(): i32 {
  return bids.length;
}

/** Drops all previous state and gives every instrument a fresh starting bid. */
export function resetMarket(count: i32): void {
  bids = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    bids[i] = INITIAL_PRICE_MIN_CENTS + nextInt(INITIAL_PRICE_RANGE_CENTS);
  }
}

export function clampPrice(cents: i32): i32 {
  if (cents < MIN_PRICE_CENTS) return MIN_PRICE_CENTS;
  if (cents > MAX_PRICE_CENTS) return MAX_PRICE_CENTS;
  return cents;
}

/** Largest move of one random-walk step, roughly 0.05% of the price. */
export function maxStepCents(bidCents: i32): i32 {
  return 1 + i32(bidCents / PRICE_STEP_DIVISOR);
}

/** Widest allowed spread, roughly 0.02% of the price and never below 1 cent. */
export function maxSpreadCents(bidCents: i32): i32 {
  return 1 + i32(bidCents / SPREAD_DIVISOR);
}

/**
 * Generates one update for a random instrument and writes its 7 fields into
 * `out` starting at `offset`. The instrument's bid moves from its previous value.
 */
export function writeUpdate(out: Int32Array, offset: i32): void {
  const id = nextInt(bids.length);

  const step = maxStepCents(bids[id]);
  const bid = clampPrice(bids[id] + nextInt(2 * step + 1) - step);
  const ask = bid + 1 + nextInt(maxSpreadCents(bid));
  bids[id] = bid;

  out[offset + FIELD_INSTRUMENT_ID] = id;
  out[offset + FIELD_TRADE_PRICE_CENTS] = nextBool() ? ask : bid;
  out[offset + FIELD_TRADE_QUANTITY] = 1 + nextInt(MAX_TRADE_QUANTITY);
  out[offset + FIELD_BID_PRICE_CENTS] = bid;
  out[offset + FIELD_ASK_PRICE_CENTS] = ask;
  out[offset + FIELD_BID_QUANTITY] = nextInt(MAX_BOOK_QUANTITY + 1);
  out[offset + FIELD_ASK_QUANTITY] = nextInt(MAX_BOOK_QUANTITY + 1);
}
