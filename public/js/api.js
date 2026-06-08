// API Helper Functions

const API_BASE_URL = '/api';

/**
 * Gets the stored JWT token.
 * @returns {string|null} The token or null if not found.
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Sets the JWT token in storage.
 * @param {string} token - The token to store.
 */
function setToken(token) {
    localStorage.setItem('token', token);
}

/**
 * Gets the stored user data.
 * @returns {Object|null} The user object or null.
 */
function getUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
}

/**
 * Sets the user data in storage.
 * @param {Object} user - The user object to store.
 */
function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Clears all authentication data and redirects to login.
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

/**
 * Wrapper for the native fetch API that automatically adds the Authorization header.
 * @param {string} endpoint - The API endpoint relative to API_BASE_URL (e.g., '/auth/login').
 * @param {Object} options - Standard fetch options (method, headers, body, etc.).
 * @returns {Promise<Response>} The fetch response.
 */
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();

    const headers = {
        ...options.headers,
    };
    
    // Only set Content-Type to application/json if not explicitly provided and body is not FormData
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Handle token expiration/unauthorized globally if needed
        if (response.status === 401 && endpoint !== '/auth/login') {
            logout();
        }

        return response;
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
}
