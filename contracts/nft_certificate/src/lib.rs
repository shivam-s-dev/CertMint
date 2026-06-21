#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Issuer {
    pub total_issued: u32,
    pub revoked: u32,
    pub reputation: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub enum DataKey {
    Owner(u64),           // token_id -> Address
    Certificate(u64),     // token_id -> CertificateData
    Balance(Address),     // Address -> u32
    TotalSupply,          // u64
    Admin,                // Address
    IssuerReputation(Address), // Address -> Issuer struct
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct CertificateData {
    pub token_id: u64,
    pub issuer: Address,
    pub cert_type: Symbol,
    pub title: String,
    pub issue_date: u64,
}

#[contract]
pub struct NFTCertificateContract;

#[contractimpl]
impl NFTCertificateContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TotalSupply, &0u64);
    }

    pub fn mint(
        env: Env,
        to: Address,
        token_id: u64,
        cert_type: Symbol,
        title: String,
    ) {
        // Allow the minter to authorize their own mint transaction
        to.require_auth();

        if env.storage().persistent().has(&DataKey::Owner(token_id)) {
            panic!("token already exists");
        }

        // Save Owner
        env.storage().persistent().set(&DataKey::Owner(token_id), &to);

        // Save Certificate Data (issuer is the minter)
        let cert_data = CertificateData {
            token_id,
            issuer: to.clone(),
            cert_type,
            title,
            issue_date: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::Certificate(token_id), &cert_data);

        // Update Issuer Reputation
        let rep_key = DataKey::IssuerReputation(to.clone());
        let mut issuer_info: Issuer = env.storage().persistent().get(&rep_key).unwrap_or(Issuer {
            total_issued: 0,
            revoked: 0,
            reputation: 100,
        });
        issuer_info.total_issued = issuer_info.total_issued.saturating_add(1);
        issuer_info.reputation = issuer_info.reputation.saturating_add(1);
        env.storage().persistent().set(&rep_key, &issuer_info);

        // Update Balance
        let mut balance: u32 = env.storage().persistent().get(&DataKey::Balance(to.clone())).unwrap_or(0);
        balance += 1;
        env.storage().persistent().set(&DataKey::Balance(to.clone()), &balance);

        // Update Total Supply
        let mut total_supply: u64 = env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0);
        total_supply += 1;
        env.storage().instance().set(&DataKey::TotalSupply, &total_supply);

        // Emit Event
        env.events().publish((Symbol::new(&env, "mint"), token_id), to);
    }

    pub fn burn(env: Env, token_id: u64) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let cert_data: CertificateData = env.storage().persistent().get(&DataKey::Certificate(token_id)).expect("token does not exist");
        let issuer_address = cert_data.issuer;

        // Update Issuer Reputation
        let rep_key = DataKey::IssuerReputation(issuer_address.clone());
        if let Some(mut issuer_info) = env.storage().persistent().get::<_, Issuer>(&rep_key) {
            issuer_info.revoked = issuer_info.revoked.saturating_add(1);
            issuer_info.reputation = issuer_info.reputation.saturating_sub(1);
            env.storage().persistent().set(&rep_key, &issuer_info);
        }

        let owner: Address = env.storage().persistent().get(&DataKey::Owner(token_id)).expect("token does not exist");
        
        env.storage().persistent().remove(&DataKey::Owner(token_id));
        env.storage().persistent().remove(&DataKey::Certificate(token_id));

        let mut balance: u32 = env.storage().persistent().get(&DataKey::Balance(owner.clone())).unwrap_or(0);
        if balance > 0 {
            balance -= 1;
            env.storage().persistent().set(&DataKey::Balance(owner.clone()), &balance);
        }

        let mut total_supply: u64 = env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0);
        if total_supply > 0 {
            total_supply -= 1;
            env.storage().instance().set(&DataKey::TotalSupply, &total_supply);
        }

        env.events().publish((Symbol::new(&env, "burn"), token_id), owner);
    }

    pub fn transfer(env: Env, from: Address, to: Address, token_id: u64) {
        from.require_auth();

        let owner: Address = env.storage().persistent().get(&DataKey::Owner(token_id)).expect("token does not exist");
        if owner != from {
            panic!("not the owner");
        }

        env.storage().persistent().set(&DataKey::Owner(token_id), &to);

        let mut from_balance: u32 = env.storage().persistent().get(&DataKey::Balance(from.clone())).unwrap_or(0);
        if from_balance > 0 {
            from_balance -= 1;
            env.storage().persistent().set(&DataKey::Balance(from.clone()), &from_balance);
        }

        let mut to_balance: u32 = env.storage().persistent().get(&DataKey::Balance(to.clone())).unwrap_or(0);
        to_balance += 1;
        env.storage().persistent().set(&DataKey::Balance(to.clone()), &to_balance);

        env.events().publish((Symbol::new(&env, "transfer"), token_id), (from, to));
    }

    pub fn get_certificate(env: Env, token_id: u64) -> CertificateData {
        env.storage().persistent().get(&DataKey::Certificate(token_id)).expect("token does not exist")
    }

    pub fn get_owner(env: Env, token_id: u64) -> Address {
        env.storage().persistent().get(&DataKey::Owner(token_id)).expect("token does not exist")
    }

    pub fn get_balance(env: Env, owner: Address) -> u32 {
        env.storage().persistent().get(&DataKey::Balance(owner)).unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0)
    }

    pub fn get_issuer(env: Env, issuer: Address) -> Option<Issuer> {
        env.storage().persistent().get(&DataKey::IssuerReputation(issuer))
    }
}

#[cfg(test)]
mod test;

