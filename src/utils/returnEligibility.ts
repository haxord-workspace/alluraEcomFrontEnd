/**
 * @deprecated Returns are no longer offered (exchange-only policy). Kept so older imports keep
 * compiling; use `./exchangeEligibility` instead.
 */
export {
  EXCHANGE_WINDOW_DAYS as RETURN_WINDOW_DAYS,
  getDeliveredAt,
  getExchangeEligibility as getReturnEligibility,
  type ExchangeEligibility as ReturnEligibility,
} from './exchangeEligibility';
