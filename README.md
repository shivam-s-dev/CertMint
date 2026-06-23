<p align="center">
  <img src="public/logo.png" alt="CertMint logo" width="140" />
</p>

<h1 align="center">CertMint</h1>

<p align="center">
  🎓 Web3 certificate minting and verification on Stellar.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img alt="Stellar" src="https://img.shields.io/badge/Stellar-111111?style=for-the-badge&logo=stellar&logoColor=white" />
</p>

<p align="center">
  <strong>Live Production:</strong> <a href="https://cert-mint.vercel.app" target="_blank">https://cert-mint.vercel.app</a>
</p>

<p align="center">
  <strong>Youtube Demo Video :</strong> <a href="https://youtu.be/m4fN9fJSC18" target="_blank">https://youtu.be/m4fN9fJSC18</a>
</p>

## ✨ About The Project

CertMint is a certificate minting platform built on the Stellar network. It lets organizations mint, verify, and manage NFT-backed certificates with public proof, transaction history, and a clean reviewer-friendly audit trail.

The project is focused on real certificate workflows, not generic task farming. The value is in proof, transparency, and verification.

## 🔒 Why It Matters

- 🧾 Certificates are verifiable from IDs or transaction hashes.
- 🛰️ Stellar testnet transaction history provides public proof.
- 🛡️ Verification pages reduce fake credential risk.
- 📊 Admin views help track minting, logs, wallets, and system status.
- 📱 The app is responsive for desktop and mobile review.

## 🖼️ Screenshots

### Landing

![Landing Web](assets/landing/landing-web.png)

### Auth

![Signup Web](assets/landing/sighup-web.png)

### Minting And Management

![Create Certificate](assets/minter/create-certificate.png)
![Manage Certificate](assets/minter/manage-certificate.png)
![Mint Success](assets/minter/minted-sucessfull.png)
![Home Tab](assets/minter/home-tab.png)

### Verification And Admin

![Verify Certificate](assets/verify-certificate.png)
![Admin KYC Approve](assets/admin-kyc-approve.png)

## 📱 Mobile Responsive View

![Landing Mobile](assets/landing/landing-mob.png)
![Signup Mobile](assets/landing/sighup-mob.png)

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Wallet | Freighter |
| Blockchain | Stellar Testnet |
| Smart Contracts | Soroban (Rust) |
| Database / Auth | Supabase |
| E2E Testing | Playwright |
| Contract Testing | cargo test |
| Deployment | Vercel |

## 🔧 Contract Deployment And Verification

### Deployed Contracts

| Contract | Contract ID | Verify Link | Status |
|---|---|---|---|
| NFT Certificate Contract | CCBM2ZDOU3LUDVWNX6TV55YDLRH2EO6LXYL7SRXYI3HXT422MNSWJSUY | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCBM2ZDOU3LUDVWNX6TV55YDLRH2EO6LXYL7SRXYI3HXT422MNSWJSUY) | Verified on testnet |
| Verifier Contract | CBUVPMCNQ33YITCLGQGPRXAMS3C3BYCBLREEXRIFVRJ5LUYJXJTM4NGA | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBUVPMCNQ33YITCLGQGPRXAMS3C3BYCBLREEXRIFVRJ5LUYJXJTM4NGA) | Verified on testnet |

### Deployment Notes

| Item | Value |
|---|---|
| Network | Stellar Testnet |
| RPC | https://soroban-testnet.stellar.org |
| Horizon | https://horizon-testnet.stellar.org |
| Env Key | NEXT_PUBLIC_NFT_CONTRACT_ID |
| Env Key | NEXT_PUBLIC_VERIFIER_CONTRACT_ID |
| Env Key | NEXT_PUBLIC_SOROBAN_RPC_URL |

### Manual Contract Deployment

The repository does not currently automate on-chain deployment in CI. Use the Soroban CLI and a funded deploy account to publish contracts after building artifacts.

```powershell
npm run build:contracts
pwsh ./scripts/deploy-contracts.ps1 -Network testnet -Deploy
```

If you do not want to deploy immediately, build artifacts only with:

```powershell
npm run build:contracts
```

## 🆕 New Smart Contract Feature

- ✅ On-chain issuer reputation tracking for every issued certificate.
- ✅ Endorsement support: certificates can receive on-chain endorsements and endorsement history can be queried.
- ✅ Verifier contract performs cross-contract validation by querying the NFT contract directly.

## 🧪 Test Evidence

### Automated Checks

- ✅ `npm run build`
- ✅ `npm run test:e2e`
- ✅ `cargo test`

### Evidence Images

E2E Test :    

![E2E Evidence](assets/testcase/e2e-verify.png)

Contract Test:

![Contract Verification Evidence](assets/testcase/contract-verify.png)
![Contract Verification Evidence 2](assets/testcase/contracts-verify2.png)

## 🔐 Security And Transparency

CertMint is designed around public proof and controlled access.

- 🔑 Wallet-based identity for signed actions.
- 👮 Admin approval flow for sensitive access.
- ✅ Certificate verification by ID or transaction hash.
- 🧾 On-chain records for minting proof.
- 🧪 Repeatable test evidence for reviewers.

## 🧭 Features

| Area | Feature | Status |
|---|---|---|
| Landing | Public product overview | Implemented |
| Auth | Sign in / Sign up flow | Implemented |
| Minting | Certificate mint wizard | Implemented |
| Approvals | Multi-Level Workflows (Standard: Faculty/Issuer → Admin → Mint; Academic: Faculty → HOD → Registrar → Mint) | Implemented |
| Endorsements | On-chain endorsements for issued certificates | Implemented |
| Reputation | Issuer Reputation System (Total Issued, Revoked Count, Reputation Score tracked on-chain) | Implemented |
| Hooks | Shared wallet and mint integration logic | Added |
| Verification | Search by certificate ID or TX hash | Implemented |
| Admin | Logs, wallets, certs, tx pages | Implemented |
| Campaigns | Manage Campaign nav item | Added |

## 🧩 Contract Features

| Contract | Capability | Purpose |
|---|---|---|
| nft_certificate | mint | Create certificate NFTs & increments issuer reputation score |
| nft_certificate | transfer | Move ownership |
| nft_certificate | burn / revoke path | Invalidate issued credentials & decrements issuer reputation score |
| nft_certificate | get_issuer | Query issuer reputation data (total issued, revoked, reputation score) |
| nft_certificate | endorse_certificate | Add on-chain endorsements to a certificate |
| nft_certificate | get_endorsements | Query certificate endorsement history |
| verifier | verify by token | Validate a certificate record |
| verifier | verify by wallet | Check ownership-related proof |

## 🛠️ Error Handling

| Error Type | Where It Appears | User Response |
|---|---|---|
| Invalid reference | Verify page | "Certificate not found" message |
| Missing contract config | Mint flow | Clear configuration error |
| Role / access mismatch | Protected routes | Redirect or block |
| Contract call failure | Blockchain actions | Retry-friendly feedback |

## 📁 Clean File Architecture

```text
app/
  (minter)/
    dashboard/
    manage-campaign/
    manage-minted/
    mint/
    profile-settings/
  admin/
  auth/
  certificate/[id]/
  collection/[wallet]/
hooks/
  use-integration.ts
  verify/
components/
  admin/
  landing/
  minter/
contracts/
  nft_certificate/
  verifier/
lib/
  auth/
  supabase/
public/
assets/
tests/
  e2e/
```

## 🔁 User Workflow

```mermaid
flowchart TD
  A[Open CertMint] --> B[Connect Wallet]
  B --> C[Sign In or Sign Up]
  C --> D[Create Certificate Proposal]
  D --> E{Select Workflow}
  E -->|Standard| F[Pending Admin Approval]
  F --> G[Admin Approves]
  E -->|Academic| H[Pending HOD Approval]
  H --> I[HOD Approves]
  I --> J[Pending Registrar Approval]
  J --> K[Registrar Approves]
  G --> L[Mint Certificate NFT via Freighter]
  K --> L
  L --> M[Update Issuer Reputation on Stellar]
  M --> N[Verify by ID or TX Hash]
  N --> O[View Public Result & On-Chain Reputation]
```

## 🏗️ Project Architecture

```mermaid
flowchart LR
  UI[Next.js UI] --> SA[Server Actions]
  UI --> W[Freighter Wallet]
  UI --> HK[Shared Hooks]
  SA --> DB[Supabase: approval state, roles & audit logs]
  SA --> SC[Soroban Contracts: NFT Certificate & Verifier]
  SC --> ST[Stellar Testnet: on-chain proof & issuer reputation]
  DB --> AD[Admin / Approvals Queue Dashboard]
  HK --> W
  HK --> SA
```

## 🚀 Setup Guide

### 1) Install

```bash
npm install
```

### 2) Configure Environment

Copy `.env.example` to `.env.local` and fill the values.

### 3) Run Locally

```bash
npm run dev
```

### 4) Run Validation

```bash
npm run lint
npm run build
npm run test:e2e
cd contracts
cargo test --all
cargo build --release --target wasm32v1-none
```

### 5) Run with Docker (Recommended)

Ensure you have **Docker** and **Docker Compose** installed, then follow these steps:

1. **Configure environment variables** inside your `.env` file (copied from `.env.example`).
2. **Build and start the container** using Docker Compose:
   ```bash
   docker compose up --build -d
   ```
   *Note: Next.js public environment variables (`NEXT_PUBLIC_*`) are read from `.env` and baked in at build time.*
3. **Access the application** at `http://localhost:3000`.
4. **Stop the container**:
   ```bash
   docker compose down
   ```

## 🧭 Future Improvements

- 📦 IPFS-backed image certificate storage
- 👩‍🎓 Student dashboard for certificate history
- 🏫 Institution onboarding and issuer collaboration
- 🪪 Stronger identity verification integration
- 📈 Better analytics for certificate usage and trust
- 🔔 Email / webhook verification notifications

## 🙌 Salutation

Love doing this amazing project on stellar ecosystem! ❤️
Built for verifiable credentials, public trust, and a cleaner certificate workflow on Stellar.
