# Test Suite Documentation

## Overview

This test suite provides comprehensive coverage for the auction system, with a focus on **financial correctness** and **idempotency** - the two most critical aspects of the system.

## Test Structure

```
src/__tests__/
├── setup.ts                    # Jest setup with in-memory MongoDB
├── helpers/
│   └── test-helpers.ts         # Test utilities and factories
├── core/
│   ├── BalanceManager.test.ts  # Financial operations tests
│   ├── AuctionEngine.test.ts   # Round management tests
│   └── WinnerCalculator.test.ts # Winner calculation tests
├── commands/
│   ├── PlaceBidCommand.test.ts      # Bid placement tests
│   └── IncreaseBidCommand.test.ts   # Bid increase tests
└── integration/
    └── auction-flow.test.ts    # End-to-end auction flow
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- BalanceManager.test.ts
```

## Test Coverage

### ✅ BalanceManager Tests

- **reserve()**: Balance reservation, idempotency, insufficient balance
- **charge()**: Charging winners, insufficient balance checks
- **release()**: Releasing losers' balances
- **topup()**: Balance top-up operations
- **hasAvailableBalance()**: Balance availability checks
- **Financial correctness**: Complex scenarios (reserve → charge, reserve → release)

### ✅ PlaceBidCommand Tests

- Validation (auction status, active round, balance checks)
- Successful bid placement
- Idempotency (same key returns existing bid)
- Transaction safety (balance release on failure)

### ✅ IncreaseBidCommand Tests

- Validation
- Bid ownership verification
- Bid amount increase
- Balance reservation for increase

### ✅ WinnerCalculator Tests

- Winner selection by total bid amount
- Tie-breaking by earliest bid
- Edge cases (more winners than participants, no bids)
- Only ACTIVE bids considered

### ✅ AuctionEngine Tests

- **endRound()**: Round completion, winner charging, loser refunding
- Round transitions (next round or auction completion)
- Anti-sniping detection
- Error handling (invalid round, inactive round)

### ✅ Integration Tests

- Complete auction flow (create → bid → increase → end → charge)
- Idempotency across retries
- Financial correctness verification

## Key Test Scenarios

### Financial Correctness

All tests verify that:

- Money cannot be lost or duplicated
- Balance + ReservedBalance calculations are correct
- Winners are charged correctly
- Losers are refunded correctly

### Idempotency

All POST operations are tested for:

- Same idempotency key returns same result
- No duplicate operations
- No duplicate ledger entries

### Transaction Safety

Tests verify:

- Operations are atomic
- Rollback on failure
- Compensation logic works correctly

## Test Data

Tests use:

- **In-memory MongoDB** (MongoDB Memory Server) - no external dependencies
- **Test helpers** for creating users, auctions, bids
- **Isolated test data** - each test starts with clean database

## Dependencies

Required test dependencies (already in package.json):

- `jest` - Test framework
- `ts-jest` - TypeScript support for Jest
- `mongodb-memory-server` - In-memory MongoDB for testing
- `@types/jest` - TypeScript types for Jest

## Notes

- All tests run in isolated environment
- Database is cleaned between tests
- Tests use real MongoDB models (not mocks) for integration accuracy
- Financial operations are tested with real transactions
