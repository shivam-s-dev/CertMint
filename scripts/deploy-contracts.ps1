param(
    [string]$Network = "testnet",
    [switch]$Deploy
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
Set-Location $root

if (-not (Get-Command soroban -ErrorAction SilentlyContinue)) {
    Write-Error "Soroban CLI not found. Install from https://soroban.stellar.org/docs/getting-started/cli."
    exit 1
}

Write-Host "Building NFT certificate contract..."
Set-Location "contracts"
cargo build --release --target wasm32v1-none -p nft_certificate

Write-Host "Building verifier contract..."
cargo build --release --target wasm32v1-none -p verifier

if ($Deploy) {
    Write-Host "Deploying NFT certificate contract to $Network..."
    soroban contract deploy --wasm target/wasm32v1-none/release/nft_certificate.wasm --network $Network

    Write-Host "Deploying verifier contract to $Network..."
    soroban contract deploy --wasm target/wasm32v1-none/release/verifier.wasm --network $Network
}

Write-Host "Done. Build artifacts are available in contracts/target/wasm32v1-none/release/."
Write-Host "Run with -Deploy to perform on-chain deployment once you have Soroban CLI configured."
