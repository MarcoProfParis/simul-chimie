-- Migration 003 : Table solvents publique + user_roles + RLS
-- Projet : simul-chimie
-- Date   : 2026-04-23

-- ─── Rôles utilisateurs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  user_id    uuid         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text         NOT NULL CHECK (role IN ('admin', 'prof', 'etudiant')),
  created_at timestamptz  DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own role" ON user_roles;
CREATE POLICY "read own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);
-- Écriture : service_role uniquement (pas de policy côté client)

-- ─── Helper : l'utilisateur courant est-il admin ? ──────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ─── Table publique des solvants ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS solvents (
  id          bigserial     PRIMARY KEY,
  name        text          NOT NULL UNIQUE,
  d           numeric       NOT NULL,
  p           numeric       NOT NULL,
  h           numeric       NOT NULL,
  cas         text,
  mw          numeric,
  bp          numeric,
  viscosity   numeric,
  heat_of_vap numeric,
  mole_vol    numeric,
  smiles      text,
  synonyms    text[]        DEFAULT '{}',
  source      text          DEFAULT 'api' CHECK (source IN ('api', 'admin', 'custom')),
  created_at  timestamptz   DEFAULT now(),
  updated_at  timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solvents_name_lower ON solvents (lower(name));

ALTER TABLE solvents ENABLE ROW LEVEL SECURITY;

-- Lecture : publique (anon inclus) pour que l'app marche sans login
DROP POLICY IF EXISTS "public read solvents" ON solvents;
CREATE POLICY "public read solvents" ON solvents
  FOR SELECT USING (true);

-- Écriture : admin uniquement
DROP POLICY IF EXISTS "admin insert solvents" ON solvents;
CREATE POLICY "admin insert solvents" ON solvents
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin update solvents" ON solvents;
CREATE POLICY "admin update solvents" ON solvents
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin delete solvents" ON solvents;
CREATE POLICY "admin delete solvents" ON solvents
  FOR DELETE USING (is_admin());

-- Trigger pour auto-update de updated_at
CREATE OR REPLACE FUNCTION touch_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS solvents_touch_updated_at ON solvents;
CREATE TRIGGER solvents_touch_updated_at
  BEFORE UPDATE ON solvents
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
