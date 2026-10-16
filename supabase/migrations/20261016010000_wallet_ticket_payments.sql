ALTER TABLE payment_transactions DROP CONSTRAINT payment_transactions_payment_method_check;
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_payment_method_check
 CHECK(payment_method IN ('MOMO','VNPAY','QR','ZALOPAY','BANK_TRANSFER','WALLET'));
