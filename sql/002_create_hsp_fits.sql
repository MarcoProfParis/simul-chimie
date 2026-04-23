-- Migration 002 : Table hsp_fits + sécurité RLS
-- Projet : simul-chimie
-- Date   : 2026-04-21

CREATE TABLE IF NOT EXISTS hsp_fits (
  id         uuid             DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz      DEFAULT now(),
  name       text             NOT NULL,
  data       jsonb            NOT NULL   -- { solvents: [...], insideLimit, result: {hsp, datafit, ...} }
);

CREATE INDEX IF NOT EXISTS idx_hsp_fits_user_id
  ON hsp_fits (user_id, created_at DESC);

ALTER TABLE hsp_fits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utilisateur_own_hsp_fits"
  ON hsp_fits
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
