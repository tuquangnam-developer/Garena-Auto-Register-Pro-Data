// ============================================
// FIREBASE HELPER
// Authentication & Firestore operations
// ============================================

import CONFIG from './config.js';

const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${CONFIG.firebase.projectId}/databases/(default)/documents`;

export class FirebaseHelper {
    constructor() {
        this.currentUser = null;
        this._token = null;
    }

    /**
     * Đăng nhập
     */
    async signIn(email, password) {
        const url = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${CONFIG.firebase.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Đăng nhập thất bại');
        }

        const data = await response.json();
        this.currentUser = {
            email: data.email,
            localId: data.localId,
            idToken: data.idToken,
            refreshToken: data.refreshToken,
            expiresIn: data.expiresIn,
            loginTime: Date.now()
        };

        this._token = data.idToken;
        localStorage.setItem('garena_user', JSON.stringify(this.currentUser));
        localStorage.setItem('garena_user_token', data.idToken);
        return this.currentUser;
    }

    /**
     * Lấy user hiện tại
     */
    getCurrentUser() {
        if (this.currentUser) return this.currentUser;

        const stored = localStorage.getItem('garena_user');
        if (stored) {
            try {
                const user = JSON.parse(stored);
                const expiresAt = user.loginTime + (parseInt(user.expiresIn) * 1000);
                if (Date.now() < expiresAt) {
                    this.currentUser = user;
                    this._token = user.idToken;
                    return user;
                }
                this.logout();
            } catch (e) {
                this.logout();
            }
        }
        return null;
    }

    /**
     * Đăng xuất
     */
    logout() {
        this.currentUser = null;
        this._token = null;
        localStorage.removeItem('garena_user');
        localStorage.removeItem('garena_user_token');
        sessionStorage.clear();
    }

    /**
     * Lấy token
     */
    getToken() {
        if (this._token) return this._token;
        
        const user = this.getCurrentUser();
        if (!user) return null;
        
        const expiresAt = user.loginTime + (parseInt(user.expiresIn) * 1000);
        if (Date.now() >= expiresAt) {
            this.logout();
            return null;
        }
        return user.idToken;
    }

    /**
     * Đổi mật khẩu
     */
    async changePassword(newPassword) {
        const token = this.getToken();
        if (!token) {
            this.logout();
            throw new Error('Vui lòng đăng nhập lại');
        }

        const url = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccountInfo?key=${CONFIG.firebase.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idToken: token,
                password: newPassword,
                returnSecureToken: true
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Đổi mật khẩu thất bại');
        }

        const data = await response.json();
        this.currentUser.idToken = data.idToken;
        this.currentUser.loginTime = Date.now();
        this._token = data.idToken;
        localStorage.setItem('garena_user', JSON.stringify(this.currentUser));
        localStorage.setItem('garena_user_token', data.idToken);
        return data;
    }

    /**
     * Lấy collection của user
     */
    getUserCollection(email) {
        let sanitized = email
            .replace(/@/g, '_at_')
            .replace(/\./g, '_dot_')
            .replace(/[^a-zA-Z0-9_]/g, '_');

        if (sanitized.match(/^[0-9]/)) {
            sanitized = '_' + sanitized;
        }
        if (sanitized.length > 100) {
            sanitized = sanitized.substring(0, 100);
        }
        return `account_garena_${sanitized}`;
    }

    /**
     * Tạo doc ID
     */
    generateDocId() {
        return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    /**
     * Lấy dữ liệu từ Firestore
     */
    async fetchData(collection, pageSize = 300, pageToken = null) {
        const token = this.getToken();
        if (!token) {
            this.logout();
            return null;
        }

        let url = `${FIRESTORE_URL}/${collection}?pageSize=${pageSize}`;
        if (pageToken) {
            url += `&pageToken=${pageToken}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) return null;
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    }

    /**
     * Lưu dữ liệu vào Firestore
     */
    async saveData(collection, docId, data) {
        const token = this.getToken();
        if (!token) {
            this.logout();
            return null;
        }

        const url = `${FIRESTORE_URL}/${collection}/${docId}?key=${CONFIG.firebase.apiKey}`;
        const fields = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                fields[key] = { stringValue: value };
            } else if (typeof value === 'boolean') {
                fields[key] = { booleanValue: value };
            } else if (typeof value === 'number') {
                fields[key] = { integerValue: value };
            } else if (value === null || value === undefined) {
                fields[key] = { nullValue: null };
            }
        }

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        return await response.json();
    }

    /**
     * Xóa dữ liệu từ Firestore
     */
    async deleteData(collection, docId) {
        const token = this.getToken();
        if (!token) {
            this.logout();
            return null;
        }

        const url = `${FIRESTORE_URL}/${collection}/${docId}?key=${CONFIG.firebase.apiKey}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        return true;
    }

    /**
     * Lấy tất cả documents từ collection
     */
    async fetchAllDocuments(collection, maxDocs = 2000) {
        const token = this.getToken();
        if (!token) {
            this.logout();
            return null;
        }

        let allDocs = [];
        let pageToken = null;
        let hasMore = true;
        const BATCH_SIZE = 300;

        while (hasMore && allDocs.length < maxDocs) {
            let url = `${FIRESTORE_URL}/${collection}?pageSize=${BATCH_SIZE}`;
            if (pageToken) {
                url += `&pageToken=${pageToken}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) break;
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const docs = data.documents || [];

            for (const doc of docs) {
                const fields = doc.fields || {};
                const docData = {
                    docId: doc.name.split('/').pop()
                };
                for (const [key, value] of Object.entries(fields)) {
                    const val = Object.values(value)[0];
                    docData[key] = val || '';
                }
                allDocs.push(docData);
            }

            pageToken = data.nextPageToken || null;
            hasMore = !!pageToken && allDocs.length < maxDocs;
            
            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 150));
            }
        }

        return allDocs;
    }
}

export default FirebaseHelper;