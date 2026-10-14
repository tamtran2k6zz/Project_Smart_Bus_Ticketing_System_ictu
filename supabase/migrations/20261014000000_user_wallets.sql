-- Migration for Virtual Wallet and Instant Refund System
-- Created: 2026-10-14

CREATE TABLE IF NOT EXISTS user_wallets (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  citizen_id VARCHAR(20) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  bank_account_number VARCHAR(50) NOT NULL,
  balance DECIMAL(12,2) DEFAULT 0.00 CHECK (balance >= 0),
  status TEXT CHECK (status IN ('ACTIVE', 'LOCKED')) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  wallet_id text NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('TOPUP', 'REFUND', 'PAYMENT', 'WITHDRAWAL')) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  reference_id TEXT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
