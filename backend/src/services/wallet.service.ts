import { query, transaction } from '../config/database';
import { PoolClient } from 'pg';

export class WalletError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'WalletError';
  }
}

export interface WalletKYCData {
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  citizenId: string;
  bankName: string;
  bankAccountNumber: string;
}

export async function getWalletByUserId(userId: string) {
  const { rows } = await query(
    `SELECT id, user_id AS "userId", full_name AS "fullName", date_of_birth AS "dateOfBirth", 
            citizen_id AS "citizenId", bank_name AS "bankName", bank_account_number AS "bankAccountNumber", 
            balance, status, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM user_wallets WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

export async function registerWallet(userId: string, data: WalletKYCData) {
  if (
    !data.fullName ||
    !data.dateOfBirth ||
    !data.citizenId ||
    !data.bankName ||
    !data.bankAccountNumber
  ) {
    throw new WalletError(
      400,
      'Vui lòng cung cấp đầy đủ thông tin: Họ tên, Ngày sinh, Căn cước công dân, Tên ngân hàng và Số tài khoản.'
    );
  }

  return await transaction(async client => {
    // Check if wallet exists
    const { rows: existing } = await client.query(
      `SELECT id, balance FROM user_wallets WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    let walletId: string;
    if (existing.length > 0) {
      walletId = existing[0].id;
      await client.query(
        `UPDATE user_wallets 
         SET full_name = $1, date_of_birth = $2, citizen_id = $3, bank_name = $4, bank_account_number = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [
          data.fullName,
          data.dateOfBirth,
          data.citizenId,
          data.bankName,
          data.bankAccountNumber,
          walletId,
        ]
      );
    } else {
      const { rows: created } = await client.query(
        `INSERT INTO user_wallets (user_id, full_name, date_of_birth, citizen_id, bank_name, bank_account_number, balance)
         VALUES ($1, $2, $3, $4, $5, $6, 0.00)
         RETURNING id`,
        [
          userId,
          data.fullName,
          data.dateOfBirth,
          data.citizenId,
          data.bankName,
          data.bankAccountNumber,
        ]
      );
      walletId = created[0].id;
    }

    const { rows: updatedWallet } = await client.query(
      `SELECT id, user_id AS "userId", full_name AS "fullName", date_of_birth AS "dateOfBirth", 
              citizen_id AS "citizenId", bank_name AS "bankName", bank_account_number AS "bankAccountNumber", 
              balance, status, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM user_wallets WHERE id = $1`,
      [walletId]
    );

    return updatedWallet[0];
  });
}

export async function getTransactionHistory(userId: string) {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) return [];

  const { rows } = await query(
    `SELECT id, wallet_id AS "walletId", type, amount, balance_before AS "balanceBefore", 
            balance_after AS "balanceAfter", reference_id AS "referenceId", description, created_at AS "createdAt"
     FROM wallet_transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [wallet.id]
  );
  return rows;
}

export async function topupWallet(
  userId: string,
  amount: number,
  description = 'Nạp tiền vào ví mô phỏng'
) {
  if (amount <= 0) {
    throw new WalletError(400, 'Số tiền nạp phải lớn hơn 0.');
  }

  return await transaction(async client => {
    const { rows: wallets } = await client.query(
      `SELECT id, balance FROM user_wallets WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    if (wallets.length === 0) {
      throw new WalletError(
        404,
        'Bạn chưa đăng ký ví điện tử. Vui lòng đăng ký thông tin ví trước.'
      );
    }

    const wallet = wallets[0];
    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore + Number(amount);

    await client.query(
      `UPDATE user_wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [balanceAfter, wallet.id]
    );

    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, description)
       VALUES ($1, 'TOPUP', $2, $3, $4, $5)`,
      [wallet.id, amount, balanceBefore, balanceAfter, description]
    );

    return { balanceBefore, balanceAfter, amount };
  });
}

export async function creditRefundToWallet(
  client: PoolClient,
  userId: string,
  amount: number,
  referenceId: string,
  description: string
): Promise<boolean> {
  const { rows: wallets } = await client.query(
    `SELECT id, balance FROM user_wallets WHERE user_id = $1 FOR UPDATE`,
    [userId]
  );
  if (wallets.length === 0) {
    return false; // User has no wallet, fallback to external refund
  }

  const wallet = wallets[0];
  const balanceBefore = Number(wallet.balance);
  const balanceAfter = balanceBefore + Number(amount);

  await client.query(
    `UPDATE user_wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [balanceAfter, wallet.id]
  );

  await client.query(
    `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, reference_id, description)
     VALUES ($1, 'REFUND', $2, $3, $4, $5, $6)`,
    [wallet.id, amount, balanceBefore, balanceAfter, referenceId, description]
  );

  return true;
}
