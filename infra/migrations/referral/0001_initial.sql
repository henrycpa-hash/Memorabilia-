-- CrownX Jewel — referral-service initial migration (Wave 2)
CREATE TABLE IF NOT EXISTS referrals (
  id                TEXT PRIMARY KEY,
  referrer_user_id  TEXT NOT NULL,
  referral_code     TEXT NOT NULL UNIQUE,
  referred_user_id  TEXT,
  status            TEXT NOT NULL DEFAULT 'created',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
