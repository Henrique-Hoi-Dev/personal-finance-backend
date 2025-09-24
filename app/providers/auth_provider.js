const BaseIntegration = require('../api/v1/base/base_integration');

class AuthProvider extends BaseIntegration {
    constructor() {
        super('auth');
        this.client = this.httpClient;
    }

    async generateTokens(userData) {
        try {
            const payload = {
                userId: userData.dataValues.id,
                email: userData.dataValues.email,
                role: userData.dataValues.role
            };

            const response = await this.httpClient.post('/auth/generate-tokens', payload);
            return response.data.data;
        } catch (error) {
            this.logger.error('Erro ao gerar tokens via ms_auth:', error);
            throw new Error('TOKEN_GENERATION_FAILED');
        }
    }

    async verifyToken(token) {
        try {
            const response = await this.httpClient.get('/auth/verify-token', {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                timeout: 5000
            });
            return response.data.data;
        } catch (error) {
            this.logger.error('Erro ao verificar token via ms_auth:', error);
            throw error;
        }
    }

    async logout(token) {
        try {
            const response = await this.httpClient.post('/auth/logout', {
                token
            });
            return response.data.data;
        } catch (error) {
            this.logger.error('Erro ao fazer logout via ms_auth:', error);
            throw new Error('LOGOUT_FAILED');
        }
    }

    async forgotPassword(userData) {
        try {
            const response = await this.httpClient.post('/auth/forgot-password', {
                email: userData.email,
                userId: userData.id
            });
            return response.data.data;
        } catch (error) {
            this.logger.error('Erro ao gerar reset token via ms_auth:', error);
            throw new Error('RESET_TOKEN_GENERATION_FAILED');
        }
    }

    async verifyResetToken(token) {
        try {
            const response = await this.httpClient.post('/auth/verify-reset-token', {
                token
            });
            return response.data.data;
        } catch (error) {
            this.logger.error('Erro ao verificar reset token via ms_auth:', error);
            throw error;
        }
    }

    async confirmPasswordReset(token, userId) {
        try {
            const response = await this.httpClient.post('/auth/confirm-password-reset', {
                token,
                userId
            });
            return response.data.data;
        } catch (error) {
            this.logger.error('Erro ao confirmar reset de senha via ms_auth:', error);
            throw new Error('PASSWORD_RESET_CONFIRMATION_FAILED');
        }
    }

    async verifyEmailToken(token) {
        try {
            const response = await this.httpClient.post('/auth/verify-email-token', {
                token
            });
            return response.data.data;
        } catch (error) {
            this.logger.error('Erro ao verificar token de email via ms_auth:', error);
            throw error;
        }
    }

    async resendVerification(userData) {
        try {
            const response = await this.httpClient.post('/auth/resend-verification', {
                email: userData.email,
                userId: userData.id
            });
            return response.data.data;
        } catch (error) {
            this.logger.error('Erro ao reenviar verificação via ms_auth:', error);
            throw new Error('VERIFICATION_RESEND_FAILED');
        }
    }
}

module.exports = AuthProvider;
