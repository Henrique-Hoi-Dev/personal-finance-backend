/**
 * 2FA Utilities - Two-Factor Authentication Helper
 *
 * This module provides utilities for implementing TOTP-based 2FA
 * using Google Authenticator, Authy, or similar apps.
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * Generate a new TOTP secret
 * @param {Object} options - Configuration options
 * @param {string} options.name - Service name (e.g., "Henrique Store")
 * @param {string} options.issuer - Issuer name (e.g., "Henrique Store")
 * @param {string} options.account - Account identifier (usually email)
 * @returns {Object} Secret and otpauth URL
 */
const generateSecret = ({ name = 'Henrique Store', issuer = 'Henrique Store', account = '' } = {}) => {
    const secret = speakeasy.generateSecret({
        name: `${issuer}:${account}`,
        issuer: issuer,
        length: 32
    });

    return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url
    };
};

/**
 * Generate QR code for 2FA setup
 * @param {string} otpauthUrl - The otpauth URL
 * @returns {Promise<string>} Base64 encoded QR code image
 */
const generateQRCode = async (otpauthUrl) => {
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1
        });
        return qrCodeDataUrl;
    } catch (error) {
        throw new Error(`Failed to generate QR code: ${error.message}`);
    }
};

/**
 * Verify TOTP token
 * @param {Object} options - Verification options
 * @param {string} options.token - The TOTP token from user
 * @param {string} options.secret - The base32 secret
 * @param {number} options.window - Time window for verification (default: 1)
 * @returns {boolean} Whether the token is valid
 */
const verifyToken = ({ token, secret, window = 1 } = {}) => {
    if (!token || !secret) {
        return false;
    }

    return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: window // Allow 1 time step before and after
    });
};

/**
 * Generate backup codes for 2FA
 * @param {number} count - Number of backup codes to generate (default: 8)
 * @param {number} length - Length of each code (default: 8)
 * @returns {Array<string>} Array of backup codes
 */
const generateBackupCodes = (count = 8, length = 8) => {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const code = speakeasy
            .generateSecret({
                length: length,
                name: `backup-${i}`
            })
            .base32.substring(0, length)
            .toUpperCase();
        codes.push(code);
    }
    return codes;
};

/**
 * Verify backup code
 * @param {string} code - The backup code to verify
 * @param {Array<string>} backupCodes - Array of valid backup codes
 * @returns {boolean} Whether the backup code is valid
 */
const verifyBackupCode = (code, backupCodes) => {
    if (!code || !backupCodes || !Array.isArray(backupCodes)) {
        return false;
    }

    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return backupCodes.includes(normalizedCode);
};

/**
 * Remove used backup code
 * @param {string} code - The backup code that was used
 * @param {Array<string>} backupCodes - Array of backup codes
 * @returns {Array<string>} Updated array without the used code
 */
const removeBackupCode = (code, backupCodes) => {
    if (!code || !backupCodes || !Array.isArray(backupCodes)) {
        return backupCodes;
    }

    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return backupCodes.filter((c) => c !== normalizedCode);
};

/**
 * Get current TOTP token for testing
 * @param {string} secret - The base32 secret
 * @returns {string} Current TOTP token
 */
const getCurrentToken = (secret) => {
    return speakeasy.totp({
        secret: secret,
        encoding: 'base32'
    });
};

module.exports = {
    generateSecret,
    generateQRCode,
    verifyToken,
    generateBackupCodes,
    verifyBackupCode,
    removeBackupCode,
    getCurrentToken
};
