const BaseIntegration = require('../../api/v1/base/base_integration');
const logger = require('../../utils/logger');

/**
 * Client para integração com a API Pluggy
 * Estende BaseIntegration e adiciona lógica de autenticação com cache de API key
 */
class PluggyClient extends BaseIntegration {
    constructor() {
        super('PLUGGY');
        this.clientId = process.env.PLUGGY_CLIENT_ID;
        this.clientSecret = process.env.PLUGGY_CLIENT_SECRET;
        this.apiKeyCache = null;
        this.apiKeyExpiresAt = null;
        this.cacheExpirationTime = 2 * 60 * 60 * 1000; // 2 horas em milissegundos

        if (!this.clientId || !this.clientSecret) {
            logger.warn('PLUGGY_CLIENT_ID ou PLUGGY_CLIENT_SECRET não configurados');
        }

        // Interceptor para adicionar API key automaticamente
        this.httpClient.interceptors.request.use(
            async (config) => {
                // Não adicionar API key para o endpoint de autenticação
                if (!config.url.includes('/auth')) {
                    const apiKey = await this.getApiKey();
                    if (apiKey) {
                        config.headers['X-API-KEY'] = apiKey;
                    }
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
    }

    /**
     * Obtém ou renova a API key do Pluggy
     * Usa cache em memória para evitar chamadas desnecessárias
     * @returns {Promise<string>} API key
     */
    async getApiKey() {
        // Verificar se há cache válido
        if (this.apiKeyCache && this.apiKeyExpiresAt && Date.now() < this.apiKeyExpiresAt) {
            return this.apiKeyCache;
        }

        if (!this.clientId || !this.clientSecret) {
            throw new Error('PLUGGY_CREDENTIALS_NOT_CONFIGURED');
        }

        try {
            const response = await this.httpClient.post('/auth', {
                clientId: this.clientId,
                clientSecret: this.clientSecret
            });

            const apiKey = response.data.apiKey;
            if (!apiKey) {
                throw new Error('PLUGGY_API_KEY_NOT_RECEIVED');
            }

            // Armazenar no cache
            this.apiKeyCache = apiKey;
            this.apiKeyExpiresAt = Date.now() + this.cacheExpirationTime;

            logger.info('Pluggy API key obtida e armazenada em cache');

            return apiKey;
        } catch (error) {
            logger.error({ error: error.message }, 'Erro ao obter API key do Pluggy');
            throw error;
        }
    }

    /**
     * POST /connect_token
     * Cria um Connect Token para o widget Pluggy Connect
     */
    async createConnectToken(payload) {
        return await this.httpClient.post('/connect_token', payload);
    }

    /**
     * GET /accounts
     * Lista contas de um item do Pluggy
     */
    async getAccounts(params) {
        return await this.httpClient.get('/accounts', { params });
    }

    /**
     * GET /transactions
     * Lista transações de uma conta ou item do Pluggy
     */
    async getTransactions(params) {
        return await this.httpClient.get('/transactions', { params });
    }

    /**
     * GET /items/:itemId
     * Obtém informações de um item específico
     */
    async getItem(itemId) {
        return await this.httpClient.get(`/items/${itemId}`);
    }
}

module.exports = PluggyClient;
