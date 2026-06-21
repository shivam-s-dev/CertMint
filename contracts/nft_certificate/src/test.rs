#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Symbol};

#[test]
fn test_init_success() {
    let env = Env::default();
    let contract_id = env.register(NFTCertificateContract, ());
    let client = NFTCertificateContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    assert_eq!(client.total_supply(), 0);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_init_panics() {
    let env = Env::default();
    let contract_id = env.register(NFTCertificateContract, ());
    let client = NFTCertificateContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);
    client.initialize(&admin);
}

#[test]
fn test_mint_success() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NFTCertificateContract, ());
    let client = NFTCertificateContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let to = Address::generate(&env);
    let token_id = 1;
    let cert_type = Symbol::new(&env, "cert");
    let title = String::from_str(&env, "Test Certificate");

    client.mint(&to, &token_id, &cert_type, &title);

    assert_eq!(client.total_supply(), 1);
    assert_eq!(client.get_balance(&to), 1);
    assert_eq!(client.get_owner(&token_id), to);
    
    let cert = client.get_certificate(&token_id);
    assert_eq!(cert.token_id, token_id);
    assert_eq!(cert.issuer, to);
    assert_eq!(cert.cert_type, cert_type);
    assert_eq!(cert.title, title);
}

#[test]
#[should_panic(expected = "token already exists")]
fn test_mint_already_exists_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NFTCertificateContract, ());
    let client = NFTCertificateContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let to = Address::generate(&env);
    let token_id = 1;
    let cert_type = Symbol::new(&env, "cert");
    let title = String::from_str(&env, "Test Certificate");

    client.mint(&to, &token_id, &cert_type, &title);
    client.mint(&to, &token_id, &cert_type, &title);
}

#[test]
fn test_transfer_success() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NFTCertificateContract, ());
    let client = NFTCertificateContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let from = Address::generate(&env);
    let token_id = 1;
    let cert_type = Symbol::new(&env, "cert");
    let title = String::from_str(&env, "Test Certificate");

    client.mint(&from, &token_id, &cert_type, &title);
    
    let to = Address::generate(&env);
    client.transfer(&from, &to, &token_id);

    assert_eq!(client.get_owner(&token_id), to);
    assert_eq!(client.get_balance(&from), 0);
    assert_eq!(client.get_balance(&to), 1);
}

#[test]
#[should_panic(expected = "not the owner")]
fn test_transfer_not_owner_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NFTCertificateContract, ());
    let client = NFTCertificateContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let owner = Address::generate(&env);
    let token_id = 1;
    let cert_type = Symbol::new(&env, "cert");
    let title = String::from_str(&env, "Test Certificate");

    client.mint(&owner, &token_id, &cert_type, &title);
    
    let not_owner = Address::generate(&env);
    let to = Address::generate(&env);
    client.transfer(&not_owner, &to, &token_id);
}

#[test]
fn test_burn_success() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NFTCertificateContract, ());
    let client = NFTCertificateContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let to = Address::generate(&env);
    let token_id = 1;
    let cert_type = Symbol::new(&env, "cert");
    let title = String::from_str(&env, "Test Certificate");

    client.mint(&to, &token_id, &cert_type, &title);
    
    client.burn(&token_id);

    assert_eq!(client.total_supply(), 0);
    assert_eq!(client.get_balance(&to), 0);
}

#[test]
fn test_reputation_tracking() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NFTCertificateContract, ());
    let client = NFTCertificateContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let to = Address::generate(&env);
    let token_id = 1;
    let cert_type = Symbol::new(&env, "cert");
    let title = String::from_str(&env, "Test Certificate");

    // Initially reputation doesn't exist
    assert!(client.get_issuer(&to).is_none());

    // Mint increases total_issued and reputation
    client.mint(&to, &token_id, &cert_type, &title);

    let issuer_info = client.get_issuer(&to).unwrap();
    assert_eq!(issuer_info.total_issued, 1);
    assert_eq!(issuer_info.revoked, 0);
    assert_eq!(issuer_info.reputation, 101); // starts at 100 + 1 = 101

    // Burn increments revoked and decrements reputation
    client.burn(&token_id);

    let issuer_info_after = client.get_issuer(&to).unwrap();
    assert_eq!(issuer_info_after.total_issued, 1);
    assert_eq!(issuer_info_after.revoked, 1);
    assert_eq!(issuer_info_after.reputation, 100); // 101 - 1 = 100
}
