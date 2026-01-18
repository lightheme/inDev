
You are in a TypeScript Node.js codebase using Mongoose + MongoDB.

Goal: enforce "DB access only via repositories":
- No code outside src/repositories may import or reference Mongoose Models (AuctionModel, BidModel, UserModel, LedgerModel).
- All DB queries/updates must be done via repositories.
- Do NOT change business rules/logic. Only refactor data access and wiring.

Step A (if not present yet):
1) Ensure these repositories exist and are complete:
   - src/repositories/AuctionRepository.ts
   - src/repositories/BidRepository.ts
   - src/repositories/LedgerRepository.ts
   - Normalize src/repositories/UserRepository.ts
   Requirements:
   - Every repository method accepts optional mongoose.ClientSession.
   - Keep methods minimal but sufficient for current usages.

Step B (refactor code to use repositories):
2) Refactor these modules to stop importing Models and use repositories instead:
   - src/services/UserService.ts
   - src/services/AuctionService.ts
   - src/core/AuctionEngine.ts
   - src/core/BidProcessor.ts
   - src/core/WinnerCalculator.ts
   - src/core/BalanceManager.ts
   - src/ledger/LedgerService.ts

3) For transactions: ensure session is passed through repository calls where the old code used .session(session) or save({session}).
4) Keep idempotency behavior identical (Ledger commandId checks). Do not remove idempotency checks.

Tests:
5) Prefer leaving tests intact. If tests import Models, refactor tests ONLY if needed to make builds/tests pass.

Execution:
6) Apply changes directly to the working tree (do not output-only diff).
7) Run: npm test
8) If tests fail, fix compile/runtime issues caused by refactor (not business logic changes).
9) At the end, summarize which files changed and confirm that no production files outside repositories import Models anymore.
