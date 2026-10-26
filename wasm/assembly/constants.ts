/** Number of Int32 values that describe one market update in a batch. */
export const FIELDS_PER_UPDATE: i32 = 7;

/** Offsets of each field inside one update record. */
export const FIELD_INSTRUMENT_ID: i32 = 0;
export const FIELD_TRADE_PRICE_CENTS: i32 = 1;
export const FIELD_TRADE_QUANTITY: i32 = 2;
export const FIELD_BID_PRICE_CENTS: i32 = 3;
export const FIELD_ASK_PRICE_CENTS: i32 = 4;
export const FIELD_BID_QUANTITY: i32 = 5;
export const FIELD_ASK_QUANTITY: i32 = 6;

export const MIN_INSTRUMENTS: i32 = 1;
export const MAX_INSTRUMENTS: i32 = 50;

export const MIN_BATCH_SIZE: i32 = 1;
export const MAX_BATCH_SIZE: i32 = 1000;

/** Bid prices are kept inside [MIN_PRICE_CENTS, MAX_PRICE_CENTS]. */
export const MIN_PRICE_CENTS: i32 = 1;
export const MAX_PRICE_CENTS: i32 = 10000000;

/** Starting bid of every instrument is drawn from [$10.00, $1,000.00). */
export const INITIAL_PRICE_MIN_CENTS: i32 = 1000;
export const INITIAL_PRICE_RANGE_CENTS: i32 = 99000;

/** One random-walk step may move the bid by at most 1 + bid / PRICE_STEP_DIVISOR cents. */
export const PRICE_STEP_DIVISOR: i32 = 2000;

/** The spread is between 1 and 1 + bid / SPREAD_DIVISOR cents. */
export const SPREAD_DIVISOR: i32 = 5000;

/** Trade quantities are drawn from [1, MAX_TRADE_QUANTITY]. */
export const MAX_TRADE_QUANTITY: i32 = 100;

/** Book quantities are drawn from [0, MAX_BOOK_QUANTITY]. */
export const MAX_BOOK_QUANTITY: i32 = 1000;
