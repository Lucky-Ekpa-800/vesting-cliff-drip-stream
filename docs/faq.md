# Frequently Asked Questions

> This document is updated whenever a support question recurs. If your question isn't here, open an issue and it may be added.

---

## Stream lifecycle

**Q: What happens if the cliff ledger is never reached?**  
The tokens stay locked in the contract vault. The sponsor can call `cancel_stream` at any time before the cliff to reclaim the full deposit. The recipient cannot claim anything and receives nothing on cancellation.

**Q: What happens when `end_ledger` passes without a final claim?**  
Accrual stops at `end_ledger` — no new tokens are generated. The already-accrued balance stays in the vault until the recipient calls `claim_vested`, which will transfer everything earned up to `end_ledger`. The stream entry is removed from storage after that final claim.

**Q: Can the rate be changed after a stream is created?**  
No. `rate_per_ledger` is immutable once the stream is created. To change it, the sponsor must cancel the existing stream and create a new one with the desired rate.

**Q: Can the cliff or duration be extended?**  
No. All schedule parameters (`cliff_ledger`, `end_ledger`, `rate_per_ledger`) are fixed at creation time. Cancel and recreate to change any of them.

**Q: Can a recipient have more than one active stream?**  
No. Only one stream per recipient address is allowed. A second `create_vesting_stream` call for the same recipient returns `ScheduleAlreadyExists` (error code 6). If you need multiple streams, use distinct recipient addresses (e.g. separate sub-accounts).

**Q: What happens if the sponsor cancels after the cliff but before the stream ends?**  
Tokens accrued from `start_ledger` up to the current ledger are transferred to the recipient. Any tokens not yet accrued (from now until `end_ledger`) are refunded to the sponsor. The stream is then removed from storage.

**Q: Is there a way to pause a stream?**  
No. The contract has no pause mechanism. Cancel and recreate is the only option.

---

## Claiming

**Q: What does the first claim look like after the cliff?**  
The first claim releases all tokens accrued since `start_ledger` in a single transfer (the "instant catch-up"). Subsequent claims only cover the period since the previous claim.

**Q: Can someone other than the recipient call `claim_vested`?**  
No. `claim_vested` calls `recipient.require_auth()`, so only the recipient (or an authorised delegate) can trigger it.

**Q: Can the recipient claim partial amounts?**  
No. `claim_vested` always transfers the full claimable balance at the time of the call. There is no partial-claim parameter.

**Q: Why did my `claim_vested` call return `NothingToClaim`?**  
Either the cliff hasn't been reached yet (`CliffNotReached` would be returned in that case), or the stream ended and the final claim was already made. It can also happen if `current_ledger == last_claimed_ledger` (e.g. you claimed in the same ledger twice).

---

## Tokens and compatibility

**Q: Which tokens are supported?**  
Any token that implements the [Stellar token interface (SEP-41)](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md). This includes:
- Stellar Asset Contracts (SAC) wrapping classic Stellar assets (XLM, USDC, etc.)
- Custom Soroban tokens that implement the standard `transfer` interface

Tokens that deviate from the standard interface (e.g. fee-on-transfer tokens) may cause unexpected behaviour and are not officially supported.

**Q: Can the streamed token be changed after creation?**  
No. The `token` address is stored in the schedule at creation time and cannot be updated.

---

## Fees and costs

**Q: How much does it cost to create a stream?**  
Approximately **0.05–0.08 XLM** in Soroban resource fees at current mainnet rates (mid-2025, XLM ≈ $0.10). The dominant component is the rent fee for writing a ~250-byte persistent entry with a 60-day TTL. Always run `stellar transaction simulate` for an exact fee before submission.

**Q: How much does claiming cost?**  
A typical `claim_vested` call costs approximately **0.01–0.03 XLM**, covering I/O, CPU, and a conditional TTL bump. If the stream's storage entry TTL has already been refreshed within the last 30 days the rent component is a no-op.

**Q: Who pays the transaction fees?**  
Whoever submits the transaction pays the Soroban resource fees. For `create_vesting_stream` this is typically the sponsor; for `claim_vested` it is the recipient. The contract itself does not charge any protocol fee beyond the on-chain resource costs.

**Q: Does the contract hold XLM as a reserve?**  
No. The contract vault only holds the streamed token (transferred at creation). All on-chain resource fees are paid by the transaction submitter in XLM as standard Soroban fees; the contract has no XLM balance requirement of its own.

---

## Security and administration

**Q: Is there an admin or owner who can rug the contract?**  
No. The contract has no admin key, no upgrade authority, and no backdoor. Only the original sponsor of a given stream can cancel it, and only the recipient can claim from it.

**Q: What if the contract WASM or my stream entry gets archived?**  
Persistent entries that are untouched for more than ~60 days reach TTL 0 and are archived (not deleted). Starting with Protocol 23, archived entries are automatically restored when a transaction that accesses them is simulated via Stellar RPC — the simulation response includes a restoration preamble. Normal rent fees apply on restoration. See [docs/storage.md](storage.md) for details.
