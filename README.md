# Personal Finance Backend

API REST para gerenciamento de finanças pessoais com contas, parcelas e transações.

## 🚀 Funcionalidades

- ✅ **Usuários**: Registro, login e perfil
- ✅ **Contas**: Criação com parcelas automáticas
- ✅ **Parcelas**: Gerenciamento e pagamento
- ✅ **Transações**: Controle de receitas e despesas
- ✅ **Autenticação JWT**: Segurança em todos os endpoints
- ✅ **Paginação**: Listagens otimizadas
- ✅ **Saldo**: Cálculo automático de receitas - despesas

## 📋 Endpoints Principais

### Usuários (`/users`)

- `POST /users/register` - Criar usuário
- `POST /users/login` - Login (retorna JWT)
- `GET /users/profile` - Ver perfil logado

### Contas (`/accounts`)

- `POST /accounts` - Criar conta (gera parcelas automaticamente)
- `GET /accounts` - Listar contas paginadas
- `GET /accounts/:id` - Detalhar conta + parcelas
- `PATCH /accounts/:id/pay` - Pagar conta inteira (marca como paga + cria transação)
- `DELETE /accounts/:id` - Deletar conta e parcelas
- `GET /accounts/:id/installments` - Listar parcelas da conta

### Parcelas (`/accounts/installments`)

- `GET /accounts/installments/:id` - Detalhar parcela
- `PATCH /accounts/installments/:id/pay` - Marcar como paga (gera transação)
- `DELETE /accounts/installments/:id` - Deletar parcela

### Transações (`/transactions`)

- `GET /transactions` - Listar transações paginadas
- `DELETE /transactions/:id` - Deletar transação
- `GET /transactions/balance` - Retornar saldo

## 🔧 Instalação

```bash
npm install
cp env.sample .env
npm run migrate
npm run seed
npm start
```

## 🧪 Testes com Postman

### Arquivos Incluídos

- `postman/Personal-Finance-API.postman_collection.json` - Coleção completa
- `postman/Personal-Finance-Environment.postman_environment.json` - Ambiente
- `postman/Personal-Finance-Tests.postman_collection.json` - Testes automatizados
- `postman/test-data.json` - Dados de exemplo
- `postman/README.md` - Instruções detalhadas

### Como Usar

1. Importe a coleção e ambiente no Postman
2. Execute `POST /users/register` para criar usuário
3. Execute `POST /users/login` e copie o token JWT
4. Cole o token na variável `jwt_token` do ambiente
5. Teste todos os endpoints!

## 📚 Documentação

- [API Endpoints](docs/API_ENDPOINTS.md) - Documentação completa da API
- [Postman Collection](postman/README.md) - Guia de uso do Postman
- [Finance Module](docs/FINANCE_MODULE.md) - Documentação do módulo financeiro
- [Installment Usage](docs/INSTALLMENT_USAGE.md) - Guia de uso de parcelas

## 🔐 Autenticação

Todos os endpoints (exceto register/login) requerem JWT:

```
Authorization: Bearer <token>
```

## 🏃‍♂️ Execução

```bash
# Desenvolvimento
npm run dev

# Produção
npm start

# Testes
npm test
```
