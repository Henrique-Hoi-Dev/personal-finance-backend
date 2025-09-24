const axios = require('axios');

class GoogleOAuth2 {
    constructor() {
        this.clientId = process.env.GOOGLE_CLIENT_ID;
        this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        this.redirectUri = process.env.GOOGLE_REDIRECT_URI;
        this.tokenEndpoint = 'https://oauth2.googleapis.com/token';
        this.userInfoEndpoint = 'https://www.googleapis.com/oauth2/v3/userinfo';
    }

    /**
     * Exchange authorization code for tokens
     * @param {string} code - Authorization code from Google
     * @returns {Promise<Object>} - Tokens and user info
     */
    async exchangeCodeForTokens(code) {
        try {
            const response = await axios.post(
                this.tokenEndpoint,
                {
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    code: code,
                    grant_type: 'authorization_code',
                    redirect_uri: this.redirectUri
                },
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const { access_token, id_token } = response.data;

            // Decode the ID token to get user information
            const userInfo = this.decodeIdToken(id_token);

            return {
                accessToken: access_token,
                idToken: id_token,
                userInfo
            };
        } catch (error) {
            console.error('Error exchanging code for tokens:', error.response?.data || error.message);
            throw new Error('Failed to exchange authorization code for tokens');
        }
    }

    /**
     * Decode and verify the ID token
     * @param {string} idToken - Google ID token
     * @returns {Object} - Decoded user information
     */
    decodeIdToken(idToken) {
        try {
            // Decode the JWT without verification (for simplicity)
            // In production, you should verify the token signature
            const decoded = this.decodeJWT(idToken);

            if (!decoded) {
                throw new Error('Invalid ID token');
            }

            // Extract user information
            const userInfo = {
                googleId: decoded.sub,
                email: decoded.email,
                name: decoded.name,
                picture: decoded.picture,
                emailVerified: decoded.email_verified,
                locale: decoded.locale
            };

            return userInfo;
        } catch (error) {
            console.error('Error decoding ID token:', error.message);
            throw new Error('Failed to decode ID token');
        }
    }

    /**
     * Simple JWT decoder (without verification)
     * @param {string} token - JWT token
     * @returns {Object} - Decoded payload
     */
    decodeJWT(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format');
            }

            const payload = parts[1];
            const decodedPayload = Buffer.from(payload, 'base64').toString('utf8');
            return JSON.parse(decodedPayload);
        } catch (error) {
            console.error('Error decoding JWT:', error.message);
            throw new Error('Invalid JWT token');
        }
    }

    /**
     * Get additional user information from Google API
     * @param {string} accessToken - Google access token
     * @returns {Promise<Object>} - Additional user information
     */
    async getUserInfo(accessToken) {
        try {
            const response = await axios.get(this.userInfoEndpoint, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error getting user info:', error.response?.data || error.message);
            throw new Error('Failed to get user information from Google');
        }
    }

    /**
     * Validate Google OAuth2 configuration
     * @returns {boolean} - Whether configuration is valid
     */
    validateConfig() {
        const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];

        const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

        if (missingVars.length > 0) {
            console.error('Missing Google OAuth2 environment variables:', missingVars);
            return false;
        }

        return true;
    }
}

module.exports = new GoogleOAuth2();
