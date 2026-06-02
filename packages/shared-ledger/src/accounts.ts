/**
 * CrownX Jewel ledger account catalog.
 *
 * These are the **logical** accounts every monetary flow must post to. Wave 3
 * runs them as in-memory rows in ledger-payout-service; Wave 4 introduces a
 * proper double-entry posting daemon.
 *
 *   buyer_payment_clearing  Credit on capture, debit on settlement.
 *   platform_revenue        Credit when a fee is earned.
 *   seller_payable          Credit until the seller is paid out.
 *   royalty_payable         Credit until each beneficiary is paid out.
 *   payout_clearing         Debit/credit during the payout cycle.
 *   platform_cash_clearing  Internal sweep account.
 */
export const LedgerAccounts = {
  BuyerPaymentClearing: "buyer_payment_clearing",
  PlatformRevenue: "platform_revenue",
  SellerPayable: "seller_payable",
  RoyaltyPayable: "royalty_payable",
  PayoutClearing: "payout_clearing",
  PlatformCashClearing: "platform_cash_clearing"
} as const;

export type LedgerAccountId = (typeof LedgerAccounts)[keyof typeof LedgerAccounts];

export const LEDGER_ACCOUNT_IDS: LedgerAccountId[] = Object.values(LedgerAccounts);
