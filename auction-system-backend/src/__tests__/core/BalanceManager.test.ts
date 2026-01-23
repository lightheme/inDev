import { BalanceManager } from '../../core/BalanceManager';
import { TestHelpers } from '../helpers/test-helpers';
import { LedgerRefType } from '../../types/ledger.types';
import { LedgerEntryTypes } from '../../types/ledger.types';
import mongoose from 'mongoose';
import { UserRepository } from '../../repositories/UserRepository';
import { LedgerRepository } from '../../repositories/LedgerRepository';

describe('BalanceManager', () => {
  let balanceManager: BalanceManager;
  let userRepository: UserRepository;
  let ledgerRepository: LedgerRepository;

  beforeEach(() => {
    balanceManager = new BalanceManager();
    userRepository = new UserRepository();
    ledgerRepository = new LedgerRepository();
  });

  describe('reserve', () => {
    it('should reserve balance correctly', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 12,
        balance: 1000,
        reservedBalance: 0,
      });
      const auctionId = new mongoose.Types.ObjectId();
      const commandId = TestHelpers.generateIdempotencyKey();
      await balanceManager.reserve({
        userId: user._id.toString(),
        amount: 100,
        refType: LedgerRefType.AUCTION,
        refId: auctionId.toString(),
        commandId,
      });

      const updatedUser = await userRepository.findById(user._id.toString());
      expect(updatedUser!.balance).toBe(1000);
      expect(updatedUser!.reservedBalance).toBe(100);
      expect(updatedUser!.availableBalance).toBe(900);

      // Verify ledger entry
      const ledgerEntry = await ledgerRepository.findByCommandId(commandId);
      expect(ledgerEntry).toBeTruthy();
      expect(ledgerEntry!.type).toBe(LedgerEntryTypes.RESERVE);
      expect(ledgerEntry!.amount).toBe(100);
    });

    it('should throw error if insufficient balance', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 100,
        reservedBalance: 0,
      });

      const auctionId = new mongoose.Types.ObjectId();
      const commandId = TestHelpers.generateIdempotencyKey();
      await expect(
        balanceManager.reserve({
          userId: user._id.toString(),
          amount: 200,
          refType: LedgerRefType.AUCTION,
          refId: auctionId.toString(),
          commandId,
        }),
      ).rejects.toThrow('Insufficient balance');
    });

    it('should be idempotent - same commandId should not reserve twice', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 1000,
        reservedBalance: 0,
      });

      const auctionId = new mongoose.Types.ObjectId();
      const commandId = 'test-idempotent-key';

      // First call
      await balanceManager.reserve({
        userId: user._id.toString(),
        amount: 100,
        refType: LedgerRefType.AUCTION,
        refId: auctionId.toString(),
        commandId,
      });

      const afterFirst = await userRepository.findById(user._id.toString());
      expect(afterFirst!.reservedBalance).toBe(100);

      // Second call with same commandId (should be idempotent)
      await balanceManager.reserve({
        userId: user._id.toString(),
        amount: 100,
        refType: LedgerRefType.AUCTION,
        refId: auctionId.toString(),
        commandId,
      });

      const afterSecond = await userRepository.findById(user._id.toString());
      expect(afterSecond!.reservedBalance).toBe(100); // Should still be 100, not 200
    });

    it('should throw error if amount is zero or negative', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 1000,
      });

      const auctionId = new mongoose.Types.ObjectId();
      const commandId = TestHelpers.generateIdempotencyKey();
      await expect(
        balanceManager.reserve({
          userId: user._id.toString(),
          amount: 0,
          refType: LedgerRefType.AUCTION,
          refId: auctionId.toString(),
          commandId,
        }),
      ).rejects.toThrow('Amount must be positive');
    });
  });

  describe('charge', () => {
    it('should charge reserved balance correctly', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 1000,
        reservedBalance: 200,
      });

      const bidId = new mongoose.Types.ObjectId();
      const commandId = TestHelpers.generateIdempotencyKey();
      await balanceManager.charge({
        userId: user._id.toString(),
        amount: 150,
        refType: LedgerRefType.BID,
        refId: bidId.toString(),
        commandId,
      });

      const updatedUser = await userRepository.findById(user._id.toString());
      expect(updatedUser!.balance).toBe(850); // 1000 - 150
      expect(updatedUser!.reservedBalance).toBe(50); // 200 - 150
      expect(updatedUser!.availableBalance).toBe(800); // 850 - 50

      // Verify ledger entry
      const ledgerEntry = await ledgerRepository.findByCommandId(commandId);
      expect(ledgerEntry).toBeTruthy();
      expect(ledgerEntry!.type).toBe(LedgerEntryTypes.CHARGE);
      expect(ledgerEntry!.amount).toBe(150);
    });

    it('should throw error if insufficient reserved balance', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 1000,
        reservedBalance: 100,
      });

      const bidId = new mongoose.Types.ObjectId();
      const commandId = TestHelpers.generateIdempotencyKey();
      await expect(
        balanceManager.charge({
          userId: user._id.toString(),
          amount: 200,
          refType: LedgerRefType.BID,
          refId: bidId.toString(),
          commandId,
        }),
      ).rejects.toThrow('Insufficient reserved balance');
    });

    it('should throw error if insufficient total balance', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 50,
        reservedBalance: 100,
      });

      const bidId = new mongoose.Types.ObjectId();
      const commandId = TestHelpers.generateIdempotencyKey();
      await expect(
        balanceManager.charge({
          userId: user._id.toString(),
          amount: 100,
          refType: LedgerRefType.BID,
          refId: bidId.toString(),
          commandId,
        }),
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('release', () => {
    it('should release reserved balance correctly', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 1000,
        reservedBalance: 200,
      });

      const bidId = new mongoose.Types.ObjectId();
      const commandId = TestHelpers.generateIdempotencyKey();
      await balanceManager.release({
        userId: user._id.toString(),
        amount: 150,
        refType: LedgerRefType.BID,
        refId: bidId.toString(),
        commandId,
      });

      const updatedUser = await userRepository.findById(user._id.toString());
      expect(updatedUser!.balance).toBe(1000); // Unchanged
      expect(updatedUser!.reservedBalance).toBe(50); // 200 - 150
      expect(updatedUser!.availableBalance).toBe(950); // 1000 - 50

      // Verify ledger entry
      const ledgerEntry = await ledgerRepository.findByCommandId(commandId);
      expect(ledgerEntry).toBeTruthy();
      expect(ledgerEntry!.type).toBe(LedgerEntryTypes.REFUND);
      expect(ledgerEntry!.amount).toBe(150);
    });

    it('should throw error if insufficient reserved balance to release', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 1000,
        reservedBalance: 100,
      });

      const bidId = new mongoose.Types.ObjectId();
      const commandId = TestHelpers.generateIdempotencyKey();
      await expect(
        balanceManager.release({
          userId: user._id.toString(),
          amount: 200,
          refType: LedgerRefType.BID,
          refId: bidId.toString(),
          commandId,
        }),
      ).rejects.toThrow('Insufficient reserved balance to release');
    });
  });

  describe('topup', () => {
    it('should topup balance correctly', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 1000,
        reservedBalance: 200,
      });

      const commandId = TestHelpers.generateIdempotencyKey();
      await balanceManager.topup({
        userId: user._id.toString(),
        amount: 500,
        refType: LedgerRefType.USER,
        refId: user._id.toString(),
        commandId,
      });

      const updatedUser = await userRepository.findById(user._id.toString());
      expect(updatedUser!.balance).toBe(1500); // 1000 + 500
      expect(updatedUser!.reservedBalance).toBe(200); // Unchanged
      expect(updatedUser!.availableBalance).toBe(1300); // 1500 - 200

      // Verify ledger entry
      const ledgerEntry = await ledgerRepository.findByCommandId(commandId);
      expect(ledgerEntry).toBeTruthy();
      expect(ledgerEntry!.type).toBe(LedgerEntryTypes.TOPUP);
      expect(ledgerEntry!.amount).toBe(500);
    });
  });

  describe('hasAvailableBalance', () => {
    it('should return true if user has sufficient available balance', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 1000,
        reservedBalance: 200,
      });

      const hasBalance = await balanceManager.hasAvailableBalance(user._id.toString(), 500);
      expect(hasBalance).toBe(true);
    });

    it('should return false if user has insufficient available balance', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 1000,
        reservedBalance: 800,
      });

      const hasBalance = await balanceManager.hasAvailableBalance(user._id.toString(), 500);
      expect(hasBalance).toBe(false);
    });

    it('should return false if user does not exist', async () => {
      const hasBalance = await balanceManager.hasAvailableBalance('507f1f77bcf86cd799439011', 100);
      expect(hasBalance).toBe(false);
    });
  });

  describe('Financial correctness - complex scenarios', () => {
    it('should maintain balance integrity through reserve -> charge flow', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 1000,
        reservedBalance: 0,
      });

      // Reserve 200
      const auctionId = new mongoose.Types.ObjectId();
      const bidId = new mongoose.Types.ObjectId();
      const reserveCommandId = TestHelpers.generateIdempotencyKey();
      await balanceManager.reserve({
        userId: user._id.toString(),
        amount: 200,
        refType: LedgerRefType.AUCTION,
        refId: auctionId.toString(),
        commandId: reserveCommandId,
      });

      let updatedUser = await userRepository.findById(user._id.toString());
      expect(updatedUser!.balance).toBe(1000);
      expect(updatedUser!.reservedBalance).toBe(200);

      // Charge 150
      const chargeCommandId = TestHelpers.generateIdempotencyKey();
      await balanceManager.charge({
        userId: user._id.toString(),
        amount: 150,
        refType: LedgerRefType.BID,
        refId: bidId.toString(),
        commandId: chargeCommandId,
      });

      updatedUser = await userRepository.findById(user._id.toString());
      expect(updatedUser!.balance).toBe(850); // 1000 - 150
      expect(updatedUser!.reservedBalance).toBe(50); // 200 - 150
      expect(updatedUser!.availableBalance).toBe(800); // 850 - 50

      // Verify sum: balance + reservedBalance should equal original balance - charged amount
      expect(updatedUser!.balance + updatedUser!.reservedBalance).toBe(900); // 1000 - 100 (difference)
    });

    it('should maintain balance integrity through reserve -> release flow', async () => {
      const user = await TestHelpers.createUser({
        telegramId: 123,
        balance: 1000,
        reservedBalance: 0,
      });
      const auctionId = new mongoose.Types.ObjectId();

      // Reserve 200
      const reserveCommandId = TestHelpers.generateIdempotencyKey();
      await balanceManager.reserve({
        userId: user._id.toString(),
        amount: 200,
        refType: LedgerRefType.AUCTION,
        refId: auctionId.toString(),
        commandId: reserveCommandId,
      });

      // Release 200
      const releaseCommandId = TestHelpers.generateIdempotencyKey();
      await balanceManager.release({
        userId: user._id.toString(),
        amount: 200,
        refType: LedgerRefType.AUCTION,
        refId: auctionId.toString(),
        commandId: releaseCommandId,
      });

      const updatedUser = await userRepository.findById(user._id.toString());
      expect(updatedUser!.balance).toBe(1000); // Unchanged
      expect(updatedUser!.reservedBalance).toBe(0); // Back to 0
      expect(updatedUser!.availableBalance).toBe(1000); // Full balance available
    });
  });
});
