import { registerWallet, WalletError } from './wallet.service';

describe('registerWallet', () => {
  it('validates mandatory KYC fields', async () => {
    await expect(
      registerWallet('test-user-id', {
        fullName: '',
        dateOfBirth: '2000-01-01',
        citizenId: '123456789012',
        bankName: 'VCB',
        bankAccountNumber: '123456789',
      })
    ).rejects.toBeInstanceOf(WalletError);
  });
});
