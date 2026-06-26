# Deployment Guide

Step-by-step instructions for deploying the Vesting Cliff Drip Stream contract to Stellar Testnet from a fresh account.

---

## Prerequisites

Install Rust with the WASM target and the Stellar CLI:

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Stellar CLI (v21+)
cargo install --locked stellar-cli --features opt
```

Verify both are available:

```bash
rustc --version
# rustc 1.78.0 (or later)

stellar --version
# stellar 21.x.x
```

---

## Step 1 – Fund a Testnet Account

Generate a new key and fund it with Friendbot:

```bash
stellar keys generate default --network testnet --fund
```

Expected output:

```
Generating key for default...
Account funded on testnet: GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Confirm the balance:

```bash
stellar keys address default
# GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

stellar account balance --source default --network testnet
```

Expected output (two native XLM entries):

```
100.0000000 XLM
```

> The `--fund` flag calls Friendbot automatically. It only works on testnet/futurenet, not mainnet.

---

## Step 2 – Build the Contract

Compile to WASM and optimize the binary:

```bash
make build
make optimize
```

Expected output for `make build`:

```
   Compiling vesting_cliff_drip_stream v0.1.0
    Finished release [optimized] target(s) in 12.34s
```

Expected output for `make optimize`:

```
Optimized: target/vesting_cliff_drip_stream.optimized.wasm
-rwxr-xr-x 1 user user 7.2K target/vesting_cliff_drip_stream.optimized.wasm
```

---

## Step 3 – Deploy to Testnet

Run the deploy script, passing your key name as the source account:

```bash
./scripts/deploy.sh default
```

Expected output:

```
▶  Building contract...
▶  Optimizing WASM...
▶  Deploying to testnet...

✅  Contract deployed!
   Contract ID : CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   Network     : testnet

   Save this ID to interact with the contract:
   export VESTING_CONTRACT=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Export the contract ID for the remaining steps:

```bash
export VESTING_CONTRACT=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Step 4 – Verify the Contract

Fetch the on-chain contract spec to confirm the deployment succeeded:

```bash
stellar contract info --id "$VESTING_CONTRACT" --network testnet
```

Expected output (abbreviated):

```
Contract: CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Wasm hash: <sha256>
Functions:
  create_vesting_stream
  claim_vested
  cancel_stream
  get_schedule
  claimable_amount
  is_cliff_passed
```

If you see all six functions the contract is live and ready.

---

## Step 5 – Create a Vesting Stream

You need a SAC token contract address for `TOKEN`. For testnet you can wrap the native XLM asset:

```bash
stellar contract asset deploy \
  --asset native \
  --source default \
  --network testnet
# prints: CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  (the XLM SAC address)
```

Set your environment variables:

```bash
export SPONSOR=default          # stellar key name for the sponsor
export RECIPIENT=GYYY...        # beneficiary Stellar address
export TOKEN=CYYY...            # SAC token contract address
export RATE=10                  # tokens per ledger
export CLIFF_DURATION=17280     # ~1 day at 5 s/ledger
export TOTAL_DURATION=172800    # ~10 days
```

Create the stream:

```bash
./scripts/invoke_create.sh
```

Expected output:

```
null
```

A `null` return value means the transaction was accepted and `create_vesting_stream` returned `Ok(())`.

Confirm the schedule was stored:

```bash
stellar contract invoke \
  --id "$VESTING_CONTRACT" \
  --source default \
  --network testnet \
  -- \
  get_schedule \
  --recipient "$RECIPIENT"
```

Expected output:

```json
{
  "sponsor": "GXXX...",
  "recipient": "GYYY...",
  "token": "CYYY...",
  "rate": 10,
  "start_ledger": 123456,
  "cliff_ledger": 140736,
  "end_ledger": 296256
}
```

---

## Step 6 – Claim Vested Tokens

After `cliff_ledger` is reached (~1 day with the example values), claim from the recipient account:

```bash
export RECIPIENT=default        # key name, not address, for --source
./scripts/invoke_claim.sh
```

Expected output (tokens transferred):

```
1234
```

The number shown is the claimable amount transferred to the recipient.

---

## Common Errors and Fixes

| Error | Cause | Fix |
|---|---|---|
| `error: no such key: default` | Key not generated yet | Run `stellar keys generate default --network testnet --fund` |
| `HostError: Error(Contract, #2)` | Cliff not reached yet | Wait until the current ledger exceeds `cliff_ledger`; check with `stellar ledger --network testnet` |
| `HostError: Error(Contract, #6)` | Stream already exists for this recipient | Use a different recipient address or cancel the existing stream first |
| `HostError: Error(Contract, #7)` | Nothing to claim | The stream may already be fully claimed, or no tokens have accrued since last claim |
| `HostError: Error(Contract, #3)` | `total_duration` ≤ `cliff_duration` | Ensure `TOTAL_DURATION` is strictly greater than `CLIFF_DURATION` |
| `HostError: Error(Contract, #4)` | `rate` is zero or negative | Set `RATE` to a positive integer |
| `HostError: Error(Contract, #5)` | Deposit overflow | Lower `RATE` or `TOTAL_DURATION`; max safe rate is `i128::MAX / total_duration` |
| `InsufficientFunds` during deploy | Account not funded | Re-run `stellar keys generate default --network testnet --fund` or check Friendbot manually at `https://friendbot.stellar.org/?addr=<address>` |
| `WASM file not found` | Build not run before deploy | Run `make build` then `make optimize` before `deploy.sh` |
| `wasm-opt: command not found` during optimize | `wasm-opt` not installed | Install via `cargo install wasm-opt` or the `binaryen` system package |

---

## Using a Different Network

To deploy to a custom network, set `SOROBAN_NETWORK` before running any script:

```bash
export SOROBAN_NETWORK=futurenet
./scripts/deploy.sh mykey
```

All three scripts (`deploy.sh`, `invoke_create.sh`, `invoke_claim.sh`) respect the `SOROBAN_NETWORK` environment variable and default to `testnet` when it is not set.
