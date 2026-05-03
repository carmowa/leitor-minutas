# Gerador de Minutas com IA

Sistema completo para transformar documentos (PDF, Word, Imagens) em minutas padronizadas usando Inteligência Artificial (OpenAI GPT-4o).

## Recursos

- **Autenticação Segura**: Sistema de login com email/senha usando Supabase
- **Processamento de Múltiplos Formatos**:
  - PDF
  - DOCX (Word)
  - Imagens (PNG, JPG, JPEG) com OCR via OpenAI Vision
- **Templates Customizáveis**: Crie e gerencie seus próprios modelos de minuta
- **Geração Automática**: Transformação inteligente de conteúdo para formato de minuta
- **Download Direto**: Arquivo DOCX gerado automaticamente

## Pré-requisitos

1. **Conta Supabase** (gratuita)
   - Acesse [supabase.com](https://supabase.com)
   - Crie um novo projeto

2. **API Key da OpenAI**
   - Acesse [platform.openai.com](https://platform.openai.com/api-keys)
   - Crie uma nova API key

## Instalação

### 1. Clone o repositório e instale dependências

```bash
npm install
```

### 2. Configure o Supabase

Edite o arquivo `.env` com suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=sua-url-do-supabase
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

Você encontra essas informações em:
- Supabase Dashboard → Settings → API

### 3. Execute o projeto

```bash
npm run dev
```

## Como Usar

### Primeiro Acesso

1. **Criar Conta**
   - Abra a aplicação
   - Clique em "Criar conta"
   - Insira email e senha

2. **Configurar API Key**
   - Após login, você será direcionado para configurar sua OpenAI API Key
   - Cole sua chave e clique em "Salvar e Continuar"

### Criar Template

1. No painel lateral direito, clique em "Novo"
2. Digite um nome para o template
3. Cole ou escreva o modelo da sua minuta
4. Clique em "Salvar Template"

**Exemplo de Template:**

```
MINUTA DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS

PARTES:
CONTRATANTE: [NOME_CONTRATANTE], inscrito no CNPJ [CNPJ_CONTRATANTE]
CONTRATADO: [NOME_CONTRATADO], inscrito no CPF [CPF_CONTRATADO]

OBJETO:
[DESCRIÇÃO_SERVICOS]

CLÁUSULA PRIMEIRA - DO OBJETO
[DETALHES_OBJETO]

CLÁUSULA SEGUNDA - DO PRAZO
O presente contrato terá vigência de [PRAZO] meses.

CLÁUSULA TERCEIRA - DO VALOR
O valor total é de R$ [VALOR].

CLÁUSULA QUARTA - DO PAGAMENTO
[FORMA_PAGAMENTO]

Local e Data: [CIDADE], [DATA]

_______________________          _______________________
    CONTRATANTE                      CONTRATADO
```

### Gerar Minuta

1. **Upload do Arquivo**
   - Clique em "Choose File" e selecione seu documento
   - Formatos aceitos: PDF, DOCX, PNG, JPG

2. **Nome do Arquivo**
   - Digite o nome desejado para o arquivo final
   - Exemplo: "contrato_prestacao_servicos"
   - O sistema adicionará ".docx" automaticamente

3. **Selecionar Template**
   - Escolha o template desejado no dropdown

4. **Gerar**
   - Clique em "Gerar Minuta"
   - Aguarde o processamento
   - O arquivo será baixado automaticamente

## Estrutura do Projeto

```
/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Auth.tsx        # Tela de autenticação
│   │   ├── ApiKeySetup.tsx # Configuração da API Key
│   │   └── MinutaGenerator.tsx # Interface principal
│   ├── contexts/           # Contextos React
│   │   └── AuthContext.tsx # Gerenciamento de autenticação
│   ├── lib/                # Bibliotecas e utilitários
│   │   └── supabase.ts     # Cliente Supabase
│   └── App.tsx             # Componente principal
├── supabase/
│   └── functions/
│       └── process-minuta/ # Edge Function de processamento
└── .env                    # Variáveis de ambiente
```

## Tecnologias

### Frontend
- **React 18** - Interface de usuário
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones
- **Vite** - Build tool

### Backend
- **Supabase** - Banco de dados e autenticação
- **Supabase Edge Functions** - Processamento serverless

### IA e Processamento
- **OpenAI GPT-4o** - Transformação de texto
- **OpenAI Vision** - OCR para imagens
- **pdf-parse** - Extração de texto de PDFs
- **mammoth** - Extração de texto de DOCX
- **docx** - Geração de arquivos Word

## Segurança

- Todas as API Keys são armazenadas de forma segura no Supabase
- Row Level Security (RLS) habilitado em todas as tabelas
- Usuários só acessam seus próprios dados
- Comunicação criptografada via HTTPS

## Troubleshooting

### Erro: "OpenAI API Key not found"
- Verifique se você configurou a API Key no sistema
- Vá em Configurações e salve novamente

### Erro: "Unsupported file type"
- Apenas PDF, DOCX, PNG e JPG são suportados
- Verifique se o arquivo não está corrompido

### Arquivo não baixa
- Verifique se o pop-up blocker não está ativo
- Tente usar outro navegador

## Próximas Melhorias

- [ ] Preview do texto extraído antes de processar
- [ ] Histórico de documentos processados
- [ ] Barra de progresso durante processamento
- [ ] Drag and drop para upload
- [ ] Suporte a múltiplos arquivos
- [ ] Exportação em outros formatos (PDF, TXT)

## Suporte

Para problemas ou dúvidas:
1. Verifique se todas as configurações estão corretas
2. Confirme que sua API Key da OpenAI está válida e com créditos
3. Verifique o console do navegador para erros

## Licença

MIT License
