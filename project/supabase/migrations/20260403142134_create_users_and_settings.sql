/*
  # Sistema de Geração de Minutas com IA
  
  1. Novas Tabelas
    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, referência ao auth.users)
      - `openai_api_key` (text, criptografado)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, referência ao auth.users)
      - `name` (text)
      - `content` (text)
      - `is_default` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, referência ao auth.users)
      - `original_filename` (text)
      - `output_filename` (text)
      - `status` (text)
      - `created_at` (timestamp)
  
  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para usuários autenticados acessarem apenas seus próprios dados
*/

-- Tabela de configurações do usuário
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  openai_api_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tabela de templates de minuta
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tabela de histórico de documentos processados
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_filename text NOT NULL,
  output_filename text NOT NULL,
  status text DEFAULT 'processing',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
