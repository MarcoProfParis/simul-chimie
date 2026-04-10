-- Migration 001 : Table exercices_cielab + sécurité RLS
-- Projet : simul-chimie
-- Date   : 2026-04-10

CREATE TABLE IF NOT EXISTS exercices_cielab (
  id         uuid             DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz      DEFAULT now(),
  type       text             NOT NULL CHECK (type IN ('simple', 'cmc', 'ch')),
  data       jsonb            NOT NULL,   -- { std, formules, deMax, dCmax, dhMax, okIdx }
  answers    jsonb,                       -- { inputs, rowValid, rowCorr, choix, q3 }
  completed  boolean          DEFAULT false,
  score      integer          DEFAULT 0 CHECK (score BETWEEN 0 AND 100)
);

-- Index pour accélérer les requêtes par utilisateur
CREATE INDEX IF NOT EXISTS idx_exercices_cielab_user_id
  ON exercices_cielab (user_id, created_at DESC);

-- Sécurité : Row Level Security
ALTER TABLE exercices_cielab ENABLE ROW LEVEL SECURITY;

-- Politique : chaque utilisateur ne voit et ne modifie que ses propres exercices
CREATE POLICY "utilisateur_own_data"
  ON exercices_cielab
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
