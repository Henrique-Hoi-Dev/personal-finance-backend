# Personal Finance Backend

API REST completa para gerenciamento de finanças pessoais com sistema avançado de contas, parcelas, transações e
relatórios.

## 🚀 Funcionalidades Principais

### 👤 **Gestão de Usuários**

- ✅ Registro e autenticação com JWT
- ✅ Perfil do usuário com dados pessoais
- ✅ Validação de CPF e email únicos
- ✅ Sistema de senhas seguras com bcrypt

### 💰 **Gestão de Contas**

- ✅ **6 Tipos de Conta**: FIXED, FIXED_PREVIEW, LOAN, CREDIT_CARD, SUBSCRIPTION, OTHER
- ✅ Criação automática de parcelas
- ✅ Cálculo automático de juros para empréstimos
- ✅ Gestão temporal com referência mensal/anual
- ✅ Contas fixas vs variáveis (preview)
- ✅ Pagamento completo ou por parcelas

### 📊 **Sistema de Parcelas**

- ✅ Geração automática de parcelas
- ✅ Pagamento individual ou em lote
- ✅ Cálculo de juros compostos
- ✅ Controle de vencimentos
- ✅ Status de pagamento em tempo real

### 💳 **Transações Financeiras**

- ✅ **Receitas e Despesas** categorizadas
- ✅ **12+ Categorias**: Alimentação, Transporte, Entretenimento, Moradia, Saúde, etc.
- ✅ Sistema de cores por categoria
- ✅ Vinculação automática com contas/parcelas
- ✅ Cálculo automático de saldo

### 📈 **Dashboard e Relatórios**

- ✅ Dashboard completo com métricas mensais
- ✅ Comparativo mensal (até 12 meses)
- ✅ Estatísticas por período
- ✅ Análise de gastos por categoria
- ✅ Resumos mensais automáticos
- ✅ Status financeiro (GOOD/ATTENTION/CRITICAL)

### 🔍 **Consultas Avançadas**

- ✅ Contas por período específico
- ✅ Contas em aberto por período
- ✅ Filtros por tipo de conta
- ✅ Paginação otimizada
- ✅ Busca temporal flexível

## 📋 Endpoints Completos

### 👤 **Usuários** (`/users`)

- `POST /users/register` - Criar usuário
- `POST /users/login` - Login (retorna JWT)
- `GET /users/profile` - Ver perfil logado

### 💰 **Contas** (`/accounts`)

- `POST /accounts` - Criar conta (gera parcelas automaticamente)
- `GET /accounts` - Listar contas paginadas
- `GET /accounts/:id` - Detalhar conta + parcelas
- `PATCH /accounts/:id` - Atualizar conta
- `PATCH /accounts/:id/pay` - Pagar conta inteira (marca como paga + cria transação)
- `DELETE /accounts/:id` - Deletar conta e parcelas
- `GET /accounts/:id/installments` - Listar parcelas da conta

### 📊 **Parcelas** (`/accounts/installments`)

- `GET /accounts/installments/:id` - Detalhar parcela
- `PATCH /accounts/installments/:id/pay` - Marcar como paga (gera transação)
- `DELETE /accounts/installments/:id` - Deletar parcela

### 💳 **Transações** (`/transactions`)

- `GET /transactions` - Listar transações paginadas
- `POST /transactions/income` - Criar receita
- `POST /transactions/expense` - Criar despesa
- `GET /transactions/balance` - Retornar saldo
- `GET /transactions/categories` - Listar categorias disponíveis
- `GET /transactions/expenses-by-category` - Gastos por categoria
- `DELETE /transactions/:id` - Deletar transação

### 📈 **Dashboard e Relatórios** (`/accounts`)

- `GET /accounts/dashboard/all` - Dashboard completo com métricas
- `GET /accounts/reports/monthly-summary` - Comparativo mensal
- `GET /accounts/period/accounts` - Contas por período
- `GET /accounts/period/unpaid-accounts` - Contas em aberto por período
- `GET /accounts/period/statistics` - Estatísticas do período
- `PUT /accounts/:id/temporal-reference` - Atualizar referência temporal

### 🏥 **Health Check**

- `GET /health` - Status da aplicação

## 🛠️ **Tecnologias e Arquitetura**

### **Backend Stack**

- **Node.js 18+** com Express.js
- **PostgreSQL** com Sequelize ORM
- **JWT** para autenticação
- **bcrypt** para hash de senhas
- **Joi** para validação de dados
- **Pino** para logging estruturado

### **Arquitetura**

- **Microsserviços** com separação clara de responsabilidades
- **MVC Pattern** (Models, Views, Controllers)
- **Repository Pattern** com Services
- **Middleware** para autenticação e validação
- **Migrations** organizadas por contexto
- **Seeds** para dados iniciais

### **Segurança**

- **Helmet** para headers de segurança
- **CORS** configurado
- **HPP** (HTTP Parameter Pollution) protection
- **Validação** rigorosa de entrada
- **Soft Delete** para auditoria

## 🔧 **Instalação e Configuração**

### **Pré-requisitos**

- Node.js 18.20.0+ ou 20.12.1+
- PostgreSQL 12+
- npm ou yarn

### **Configuração**

```bash
# Clone o repositório
git clone <repository-url>
cd personal-finance-backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp env.sample .env
# Edite o .env com suas configurações

# Configurar banco de dados
npm run db:create
npm run migrate
npm run seed

# Iniciar aplicação
npm run dev  # Desenvolvimento
npm start    # Produção
```

### **Variáveis de Ambiente**

```env
NODE_ENV=development
PORT_SERVER=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=henrique_store
DB_USER=postgres
DB_PASS=postgres
DB_DIALECT=postgres
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 🧪 **Testes**

### **Executar Testes**

```bash
# Todos os testes
npm test

# Apenas testes unitários
npm run test:unit

# Apenas testes de integração
npm run test:integration

# Com cobertura
npm run coverage
```

### **Estrutura de Testes**

- **Unit Tests**: Services, Controllers, Utils
- **Integration Tests**: Endpoints, Database, Auth
- **Coverage**: Relatórios detalhados em `tests/coverage/`

## 🐳 **Docker**

### **Executar com Docker**

```bash
# Build da imagem
docker build -t personal-finance-backend .

# Executar container
docker run -p 3000:8081 personal-finance-backend

# Com docker-compose
docker-compose up -d
```

### **Health Check**

- Endpoint: `GET /health`
- Porta: 8081 (produção)
- Timeout: 3s, Interval: 30s

## 🔐 **Autenticação e Segurança**

### **JWT Authentication**

Todos os endpoints (exceto register/login/health) requerem JWT:

```
Authorization: Bearer <token>
```

### **Validação de Dados**

- **Joi** para validação de schemas
- **Express-validation** para middleware
- **Validação** de UUIDs, emails, CPFs
- **Sanitização** de entrada

### **Headers de Segurança**

- **Helmet** configurado
- **CORS** restritivo
- **HPP** protection
- **XSS** protection

## 📊 **Estrutura de Dados**

### **Tipos de Conta**

- **FIXED**: Contas fixas (água, luz, internet)
- **FIXED_PREVIEW**: Contas variáveis (estimativa)
- **LOAN**: Empréstimos e financiamentos
- **CREDIT_CARD**: Cartão de crédito
- **SUBSCRIPTION**: Assinaturas recorrentes
- **OTHER**: Outros tipos

### **Categorias de Transação**

- **FOOD**: Alimentação
- **TRANSPORT**: Transporte
- **ENTERTAINMENT**: Entretenimento
- **RENT**: Moradia
- **HEALTH**: Saúde
- **UTILITIES**: Utilidades
- **EDUCATION**: Educação
- **SHOPPING**: Compras
- **ACCOUNT_PAYMENT**: Pagamento de contas
- **INSTALLMENT_PAYMENT**: Pagamento de parcelas
- **OTHER**: Outros

## 🚀 **Scripts Disponíveis**

```bash
# Desenvolvimento
npm run dev              # Modo desenvolvimento com nodemon
npm run dev:debug        # Modo debug

# Produção
npm start                # Modo produção

# Testes
npm test                 # Todos os testes
npm run test:unit        # Testes unitários
npm run test:integration # Testes de integração
npm run coverage         # Cobertura de testes

# Qualidade de Código
npm run lint             # ESLint
npm run lint:fix         # ESLint com correção
npm run style:check      # Prettier check
npm run style:fix        # Prettier fix

# Banco de Dados
npm run migrate          # Executar migrations
npm run migrate:status   # Status das migrations
npm run migrate:undo     # Desfazer última migration
npm run seed             # Executar seeds
npm run db:create        # Criar banco
npm run db:drop          # Dropar banco
npm run db:reset         # Reset completo do banco
```

## 📈 **Métricas e Monitoramento**

### **Logs Estruturados**

- **Pino** para logging de alta performance
- **Níveis**: error, warn, info, debug
- **Formato JSON** para análise
- **Correlação** de requests

### **Health Checks**

- **Endpoint**: `/health`
- **Métricas**: Status, timestamp, versão
- **Docker**: Health check integrado

## 🤝 **Contribuição**

### **Padrões de Código**

- **ESLint + Prettier** configurados
- **Husky** para pre-commit hooks
- **Conventional Commits**
- **Testes obrigatórios**

### **Estrutura do Projeto**

```
app/
├── api/v1/business/     # Módulos de negócio
│   ├── user/           # Gestão de usuários
│   ├── account/        # Gestão de contas
│   ├── transaction/    # Transações
│   ├── installment/    # Parcelas
│   └── monthly_summary/ # Resumos mensais
├── main/               # Configuração principal
└── utils/              # Utilitários
```

## 📄 **Licença**

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 👨‍💻 **Autor**

**Henrique Hoinacki** - Desenvolvedor Full Stack
