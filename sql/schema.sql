-- ================================================================
-- CertMint — Unified Database Schema & RLS Policies
-- Consolidated for clean deployment to GitHub.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------
-- 2. Utility Functions
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------
-- 3. Tables
-- ----------------------------------------------------------------

-- Table: user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  role text NOT NULL DEFAULT 'issuer',
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id bigint UNIQUE,
  owner_wallet text, -- Made nullable as per updated requirements (can claim later)
  issuer_wallet text NOT NULL,
  title text NOT NULL,
  description text,
  cert_type text CHECK (cert_type IN ('HACKATHON', 'COURSE', 'EVENT', 'ACHIEVEMENT')),
  image_url text,
  tx_hash text,
  contract_id text,
  is_revoked boolean NOT NULL DEFAULT false,
  workflow_type text NOT NULL DEFAULT 'standard' CHECK (workflow_type IN ('standard', 'academic')),
  approval_status text NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_stage text NOT NULL DEFAULT 'approved' CHECK (approval_stage IN ('pending_admin', 'pending_hod', 'pending_registrar', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_id uuid REFERENCES public.certificates(id) ON DELETE SET NULL,
  wallet text,
  action text, -- Removed strict check constraint to allow varied action names like MINT_CERTIFICATE
  tx_hash text,
  status text, -- Removed strict check constraint to avoid case-sensitivity issues (e.g., SUCCESS vs success)
  error_msg text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: admin_logs
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text,
  performed_by text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 4. Indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_approval_status ON public.user_profiles(approval_status);

CREATE INDEX IF NOT EXISTS idx_certificates_owner_wallet ON public.certificates(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_certificates_issuer_wallet ON public.certificates(issuer_wallet);
CREATE INDEX IF NOT EXISTS idx_certificates_cert_type ON public.certificates(cert_type);
CREATE INDEX IF NOT EXISTS idx_certificates_created_at ON public.certificates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_tx_hash ON public.certificates(tx_hash);

CREATE INDEX IF NOT EXISTS idx_transactions_cert_id ON public.transactions(cert_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.transactions(wallet);
CREATE INDEX IF NOT EXISTS idx_transactions_action ON public.transactions(action);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON public.transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_performed_by ON public.admin_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

-- ----------------------------------------------------------------
-- 5. Triggers
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------
-- 6. Row Level Security (RLS)
-- ----------------------------------------------------------------

ALTER TABLE public.certificates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs    ENABLE ROW LEVEL SECURITY;

-- Helper Function for Admin Check
CREATE OR REPLACE FUNCTION is_certmint_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email') = 'souvikmandal2406@gmail.com';
END;
$$;

-- Policies for: certificates
DROP POLICY IF EXISTS "Public can read certificates" ON public.certificates;
CREATE POLICY "Public can read certificates" ON public.certificates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated minters can insert certs" ON public.certificates;
CREATE POLICY "Authenticated minters can insert certs" ON public.certificates FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can update certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admin and approvers can update certificates" ON public.certificates;
CREATE POLICY "Admin and approvers can update certificates" ON public.certificates FOR UPDATE TO authenticated USING (
  is_certmint_admin() OR
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND (
      (role = 'hod' AND certificates.approval_stage = 'pending_hod') OR
      (role = 'registrar' AND certificates.approval_stage = 'pending_registrar')
    )
  ) OR
  (
    certificates.issuer_wallet = (auth.jwt() ->> 'email') AND
    certificates.approval_stage = 'approved'
  )
);

DROP POLICY IF EXISTS "Nobody can delete certificates" ON public.certificates;
CREATE POLICY "Nobody can delete certificates" ON public.certificates FOR DELETE USING (false);

-- Policies for: transactions
DROP POLICY IF EXISTS "Admin can read all transactions" ON public.transactions;
CREATE POLICY "Admin can read all transactions" ON public.transactions FOR SELECT TO authenticated USING (is_certmint_admin());

DROP POLICY IF EXISTS "Minter can read own transactions" ON public.transactions;
CREATE POLICY "Minter can read own transactions" ON public.transactions FOR SELECT TO authenticated USING (wallet = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Authenticated users can log transactions" ON public.transactions;
CREATE POLICY "Authenticated users can log transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can update transactions" ON public.transactions;
CREATE POLICY "Admin can update transactions" ON public.transactions FOR UPDATE TO authenticated USING (is_certmint_admin());

DROP POLICY IF EXISTS "Nobody can delete transactions" ON public.transactions;
CREATE POLICY "Nobody can delete transactions" ON public.transactions FOR DELETE USING (false);

-- Policies for: user_profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admin can read all profiles" ON public.user_profiles;
CREATE POLICY "Admin can read all profiles" ON public.user_profiles FOR SELECT TO authenticated USING (is_certmint_admin());

DROP POLICY IF EXISTS "Admin can update all profiles" ON public.user_profiles;
CREATE POLICY "Admin can update all profiles" ON public.user_profiles FOR UPDATE TO authenticated USING (is_certmint_admin());

DROP POLICY IF EXISTS "Nobody can delete profiles" ON public.user_profiles;
CREATE POLICY "Nobody can delete profiles" ON public.user_profiles FOR DELETE USING (false);

-- Policies for: admin_logs
DROP POLICY IF EXISTS "Admin can read admin logs" ON public.admin_logs;
CREATE POLICY "Admin can read admin logs" ON public.admin_logs FOR SELECT TO authenticated USING (is_certmint_admin());

DROP POLICY IF EXISTS "Admin can insert admin logs" ON public.admin_logs;
CREATE POLICY "Admin can insert admin logs" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (is_certmint_admin());

DROP POLICY IF EXISTS "Nobody can update admin logs" ON public.admin_logs;
CREATE POLICY "Nobody can update admin logs" ON public.admin_logs FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Nobody can delete admin logs" ON public.admin_logs;
CREATE POLICY "Nobody can delete admin logs" ON public.admin_logs FOR DELETE USING (false);
