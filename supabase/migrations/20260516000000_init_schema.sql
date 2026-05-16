-- Migração inicial do Guardião Estudantil
-- Criação da tabela de dados do usuário

-- 1. Criação da tabela de Dados do Usuário (Para Grade Horária, Notas e Tarefas)
CREATE TABLE user_data (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  schedule_data JSONB DEFAULT '[]'::jsonb,
  grades_data JSONB DEFAULT '{}'::jsonb,
  tasks_data JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Configuração do RLS (Row Level Security)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança para 'user_data'
CREATE POLICY "Usuários podem ver seus próprios dados" 
  ON user_data FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios dados" 
  ON user_data FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios dados" 
  ON user_data FOR UPDATE 
  USING (auth.uid() = user_id);

