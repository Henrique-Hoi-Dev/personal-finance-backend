# Henrique Store - Microserviço de Usuários

Microserviço de usuários para o e-commerce Henrique Store, responsável por autenticação, gestão de perfis e administração de usuários.

## 🚀 Funcionalidades

- ✅ Registro e login de usuários
- ✅ Gestão de perfis e endereços
- ✅ Recuperação de senha
- ✅ Administração de usuários
- ✅ Autenticação delegada ao ms_auth
- ✅ Validação de dados
- ✅ Testes unitários e de integração

## 📋 Endpoints

### Autenticação
- `POST /v1/user/register` - Registro de usuário
- `POST /v1/user/login` - Login
- `POST /v1/user/forgot-password` - Esqueci minha senha
- `POST /v1/user/reset-password` - Reset de senha

### Perfil
- `GET /v1/user/profile` - Obter perfil
- `PUT /v1/user/profile` - Atualizar perfil
- `PUT /v1/user/change-password` - Alterar senha

### Administração
- `GET /v1/user/` - Listar usuários
- `GET /v1/user/:id` - Obter usuário por ID
- `PUT /v1/user/:id` - Atualizar usuário
- `DELETE /v1/user/:id` - Desativar usuário

## 🔧 Instalação

```bash
npm install
cp env.sample .env
npm run migrate
npm run seed
npm run dev
```

## 📚 Documentação

Veja a documentação completa em [README_USER_SERVICE.md](README_USER_SERVICE.md) e exemplos de uso em [API_EXAMPLES.md](API_EXAMPLES.md).