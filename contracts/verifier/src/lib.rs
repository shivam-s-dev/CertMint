#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal, String, Symbol};

use nft_certificate::CertificateData;

#[contracttype]
#[derive(Clone, Debug)]
pub struct VerificationResult {
    pub is_valid: bool,
    pub token_id: u64,
    pub owner: Address,
    pub issuer: Address,
    pub cert_type: Symbol,
    pub title: String,
    pub issue_date: u64,
}

#[contract]
pub struct VerifierContract;

#[contractimpl]
impl VerifierContract {
    pub fn verify(env: Env, nft_contract_id: Address, token_id: u64) -> VerificationResult {
        // Perform an inter-contract call to the NFT contract's get_certificate function
        // We use env.invoke_contract to call it dynamically
        let cert_data: CertificateData = env.invoke_contract(
            &nft_contract_id,
            &Symbol::new(&env, "get_certificate"),
            soroban_sdk::vec![&env, token_id.into_val(&env)],
        );

        let owner: Address = env.invoke_contract(
            &nft_contract_id,
            &Symbol::new(&env, "get_owner"),
            soroban_sdk::vec![&env, token_id.into_val(&env)],
        );

        VerificationResult {
            is_valid: true,
            token_id: cert_data.token_id,
            owner,
            issuer: cert_data.issuer,
            cert_type: cert_data.cert_type,
            title: cert_data.title,
            issue_date: cert_data.issue_date,
        }
    }
}

#[cfg(test)]
mod test;

