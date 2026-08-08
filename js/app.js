// ============================================
// MAIN APPLICATION
// Garena Account Manager Pro v1.5.0
// ============================================

import CONFIG from './config.js';
import FirebaseHelper from './firebase.js';
import GeminiHandler from './gemini.js';
import TelegramBotHandler from './telegram.js';

export default class App {
    constructor() {
        // Core
        this.firebase = new FirebaseHelper();
        this.gemini = new GeminiHandler();
        this.telegram = new TelegramBotHandler(this.gemini);
        
        // State
        this.currentUser = null;
        this.allAccounts = [];
        this.filteredAccounts = [];
        this.currentPage = 1;
        this.selectedAccounts = new Set();
        this.editingRow = null;
        this.isLoading = false;
        this.notificationShown = false;
        this.cache = { data: null, timestamp: 0, userEmail: null };
        
        // DOM refs
        this.dom = {};
        
        // Khởi tạo
        this.init();
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        this.initDOM();
        this.initEventListeners();
        this.initTheme();
        this.initUser();
        this.initTimeCheck();
        this.initDailyReport();
        this.initGeminiModels();
        
        console.log(`🎮 ${CONFIG.app.name} v${CONFIG.app.version} loaded!`);
        console.log(`📌 Gemini models available: ${this.gemini.getAvailableModels().length}`);
        console.log('🤖 Telegram bot ready');
    }

    initDOM() {
        this.dom = {
            loginPage: document.getElementById('loginPage'),
            dashboard: document.getElementById('dashboard'),
            loginEmail: document.getElementById('loginEmail'),
            loginPassword: document.getElementById('loginPassword'),
            loginBtn: document.getElementById('loginBtn'),
            loginError: document.getElementById('loginError'),
            timeRestriction: document.getElementById('timeRestriction'),
            timeStatus: document.getElementById('timeStatus'),
            
            userEmailDisplay: document.getElementById('userEmailDisplay'),
            adminBadge: document.getElementById('adminBadge'),
            totalCount: document.getElementById('totalCount'),
            successCount: document.getElementById('successCount'),
            pendingCount: document.getElementById('pendingCount'),
            lockedCount: document.getElementById('lockedCount'),
            
            tableBody: document.getElementById('tableBody'),
            searchInput: document.getElementById('searchInput'),
            statusFilter: document.getElementById('statusFilter'),
            dateFrom: document.getElementById('dateFrom'),
            dateTo: document.getElementById('dateTo'),
            dateFilterBtn: document.getElementById('dateFilterBtn'),
            clearDateBtn: document.getElementById('clearDateBtn'),
            
            refreshBtn: document.getElementById('refreshBtn'),
            exportBtn: document.getElementById('exportBtn'),
            exportTxtBtn: document.getElementById('exportTxtBtn'),
            importBtn: document.getElementById('importBtn'),
            logoutBtn: document.getElementById('logoutBtn'),
            themeToggle: document.getElementById('themeToggle'),
            telegramBtn: document.getElementById('telegramBtn'),
            geminiBtn: document.getElementById('geminiBtn'),
            
            startIndex: document.getElementById('startIndex'),
            endIndex: document.getElementById('endIndex'),
            totalItems: document.getElementById('totalItems'),
            prevPage: document.getElementById('prevPage'),
            nextPage: document.getElementById('nextPage'),
            selectAll: document.getElementById('selectAll'),
            
            batchToolbar: document.getElementById('batchToolbar'),
            selectedCount: document.getElementById('selectedCount'),
            
            modalOverlay: document.getElementById('modalOverlay'),
            modalTitle: document.getElementById('modalTitle'),
            modalBody: document.getElementById('modalBody'),
            modalConfirm: document.getElementById('modalConfirm'),
            modalCancel: document.getElementById('modalCancel'),
            
            popupNotification: document.getElementById('popupNotification'),
            popupContent: document.getElementById('popupContent'),
            popupTime: document.getElementById('popupTime'),
            popupCloseBtn: document.getElementById('popupCloseBtn'),
            popupConfirmBtn: document.getElementById('popupConfirmBtn'),
            
            telegramModal: document.getElementById('telegramModal'),
            telegramStatus: document.getElementById('telegramStatus'),
            telegramBotToken: document.getElementById('telegramBotToken'),
            telegramChatId: document.getElementById('telegramChatId'),
            telegramEnabled: document.getElementById('telegramEnabled'),
            
            geminiModal: document.getElementById('geminiModal'),
            geminiModelSelect: document.getElementById('geminiModelSelect'),
            geminiChatContainer: document.getElementById('geminiChatContainer'),
            geminiInput: document.getElementById('geminiInput'),
            geminiSendBtn: document.getElementById('geminiSendBtn'),
            geminiResetBtn: document.getElementById('geminiResetBtn'),
            geminiCloseBtn: document.getElementById('geminiCloseBtn'),
            
            notificationContainer: document.getElementById('notificationContainer'),
            batchCopyBtn: document.getElementById('batchCopyBtn'),
            batchLockBtn: document.getElementById('batchLockBtn'),
            batchUnlockBtn: document.getElementById('batchUnlockBtn'),
            batchDeleteBtn: document.getElementById('batchDeleteBtn'),
            batchDeleteDateBtn: document.getElementById('batchDeleteDateBtn'),
            batchDeleteAllBtn: document.getElementById('batchDeleteAllBtn'),
            testTelegramBtn: document.getElementById('testTelegramBtn'),
            testDataTelegramBtn: document.getElementById('testDataTelegramBtn'),
            telegramCancelBtn: document.getElementById('telegramCancelBtn'),
            telegramSaveBtn: document.getElementById('telegramSaveBtn')
        };
    }

    initEventListeners() {
        // Login
        this.dom.loginBtn.addEventListener('click', () => this.handleLogin());
        this.dom.loginEmail.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.dom.loginPassword.focus();
        });
        this.dom.loginPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Logout
        this.dom.logoutBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn đăng xuất?')) {
                this.logout();
            }
        });

        // Refresh
        this.dom.refreshBtn.addEventListener('click', () => this.fetchAccounts(true));

        // Filter
        this.dom.searchInput.addEventListener('input', () => this.applyFilters());
        this.dom.statusFilter.addEventListener('change', () => this.applyFilters());
        this.dom.dateFilterBtn.addEventListener('click', () => this.applyFilters());
        this.dom.clearDateBtn.addEventListener('click', () => {
            this.dom.dateFrom.value = '';
            this.dom.dateTo.value = '';
            this.applyFilters();
        });

        // Pagination
        this.dom.prevPage.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTable();
                this.updatePagination();
            }
        });
        this.dom.nextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredAccounts.length / CONFIG.app.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderTable();
                this.updatePagination();
            }
        });

        // Select all
        this.dom.selectAll.addEventListener('change', () => {
            document.querySelectorAll('.row-select').forEach(cb => {
                cb.checked = this.dom.selectAll.checked;
                const row = cb.closest('tr');
                const docId = row.dataset.docid;
                if (this.dom.selectAll.checked) {
                    this.selectedAccounts.add(docId);
                } else {
                    this.selectedAccounts.delete(docId);
                }
            });
            this.updateBatchToolbar();
        });

        // Modal
        this.dom.modalCancel.addEventListener('click', () => this.closeModal());
        this.dom.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.dom.modalOverlay) this.closeModal();
        });

        // Popup
        this.dom.popupCloseBtn.addEventListener('click', () => this.closePopup());
        this.dom.popupConfirmBtn.addEventListener('click', () => this.closePopup());
        this.dom.popupNotification.addEventListener('click', (e) => {
            if (e.target === this.dom.popupNotification) this.closePopup();
        });

        // Telegram
        this.dom.telegramBtn.addEventListener('click', () => this.showTelegramConfig());
        this.dom.telegramCancelBtn.addEventListener('click', () => this.closeTelegramModal());
        this.dom.telegramSaveBtn.addEventListener('click', () => this.saveTelegramConfig());
        this.dom.testTelegramBtn.addEventListener('click', () => this.testTelegramConnection());
        this.dom.testDataTelegramBtn.addEventListener('click', () => this.sendTelegramTestData());

        // Gemini
        this.dom.geminiBtn.addEventListener('click', () => this.showGeminiChat());
        this.dom.geminiCloseBtn.addEventListener('click', () => this.closeGeminiModal());
        this.dom.geminiSendBtn.addEventListener('click', () => this.sendGeminiMessage());
        this.dom.geminiResetBtn.addEventListener('click', () => this.resetGeminiChat());
        this.dom.geminiInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendGeminiMessage();
        });
        this.dom.geminiModelSelect.addEventListener('change', (e) => {
            this.gemini.setModel(e.target.value);
        });

        // Export
        this.dom.exportBtn.addEventListener('click', () => this.exportCSV());
        this.dom.exportTxtBtn.addEventListener('click', () => this.exportTXT());
        this.dom.importBtn.addEventListener('click', () => this.importAccounts());

        // Theme
        this.dom.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Batch operations
        this.dom.batchCopyBtn.addEventListener('click', () => this.batchCopy());
        this.dom.batchLockBtn.addEventListener('click', () => this.batchLock());
        this.dom.batchUnlockBtn.addEventListener('click', () => this.batchUnlock());
        this.dom.batchDeleteBtn.addEventListener('click', () => this.batchDelete());
        this.dom.batchDeleteDateBtn.addEventListener('click', () => this.showDeleteByDateModal());
        this.dom.batchDeleteAllBtn.addEventListener('click', () => this.batchDeleteAll());

        // Telegram inputs
        this.dom.telegramBotToken.addEventListener('input', () => this.updateTelegramStatus());
        this.dom.telegramChatId.addEventListener('input', () => this.updateTelegramStatus());
        this.dom.telegramEnabled.addEventListener('change', () => this.updateTelegramStatus());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                if (this.dom.dashboard.classList.contains('active')) {
                    this.fetchAccounts(true);
                }
            }
            if (e.key === 'Escape') {
                this.closeModal();
                this.closePopup();
                this.closeTelegramModal();
                this.closeGeminiModal();
                if (this.editingRow) this.cancelEdit();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.showAddModal();
            }
        });
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            this.dom.themeToggle.textContent = '☀️ Light';
        }
    }

    initUser() {
        const user = this.firebase.getCurrentUser();
        if (user) {
            if (this.checkTimeRestriction(user.email)) {
                this.currentUser = user;
                this.showDashboard();
            } else {
                this.dom.loginPage.style.display = 'none';
                this.dom.timeRestriction.classList.add('active');
            }
        } else {
            this.dom.loginPage.style.display = 'flex';
            this.dom.dashboard.classList.remove('active');
            this.updateTimeStatus();
        }
    }

    initTimeCheck() {
        setInterval(() => {
            if (this.currentUser) {
                const allowed = this.checkTimeRestriction(this.currentUser.email);
                if (!allowed && this.dom.dashboard.classList.contains('active')) {
                    this.showNotification('⏰ Hết khung giờ hoạt động! Vui lòng quay lại sau.', 'warning');
                    setTimeout(() => {
                        this.logout();
                        this.dom.loginPage.style.display = 'flex';
                    }, 2000);
                }
            }
            this.updateTimeStatus();
        }, 60000);
    }

    initDailyReport() {
        const checkAndSend = () => {
            const now = new Date();
            if (now.getHours() === CONFIG.app.reportHour && now.getMinutes() === CONFIG.app.reportMinute) {
                this.sendDailyReports();
            }
        };
        setInterval(checkAndSend, 60000);
        setTimeout(checkAndSend, 10000);
    }

    initGeminiModels() {
        const select = this.dom.geminiModelSelect;
        const models = this.gemini.getAvailableModels();
        const current = this.gemini.getCurrentModel();
        
        select.innerHTML = '';
        models.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = `${m.name} (${m.id})`;
            if (m.id === current) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    // ============================================
    // TIME RESTRICTION
    // ============================================

    isTimeAllowed(email) {
        if (email === CONFIG.app.adminEmail) return true;

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeInMinutes = hours * 60 + minutes;

        for (const slot of CONFIG.timeSlots) {
            const start = slot.start * 60;
            const end = slot.end * 60;
            if (timeInMinutes >= start && timeInMinutes < end) {
                return true;
            }
        }
        return false;
    }

    updateTimeStatus() {
        const statusEl = this.dom.timeStatus;
        if (!statusEl) return;

        const user = this.firebase.getCurrentUser();
        const email = user ? user.email : '';

        if (email === CONFIG.app.adminEmail) {
            statusEl.textContent = '👑 Admin';
            statusEl.className = 'time-status';
            return;
        }

        const allowed = this.isTimeAllowed(email);
        if (allowed) {
            statusEl.textContent = '🟢 Đang mở';
            statusEl.className = 'time-status';
        } else {
            statusEl.textContent = '🔴 Đang đóng';
            statusEl.className = 'time-status closed';
        }
    }

    checkTimeRestriction(email) {
        if (email === CONFIG.app.adminEmail) return true;

        const allowed = this.isTimeAllowed(email);
        if (!allowed) {
            this.dom.timeRestriction.classList.add('active');
            this.dom.loginPage.style.display = 'none';
            return false;
        } else {
            this.dom.timeRestriction.classList.remove('active');
            this.dom.loginPage.style.display = 'flex';
            return true;
        }
    }

    // ============================================
    // AUTHENTICATION
    // ============================================

    async handleLogin() {
        const email = this.dom.loginEmail.value.trim();
        const password = this.dom.loginPassword.value;

        if (!email || !password) {
            this.showLoginError('Vui lòng nhập email và mật khẩu');
            return;
        }

        if (!this.checkTimeRestriction(email)) {
            this.showLoginError('Hệ thống đang đóng! Vui lòng quay lại trong khung giờ hoạt động.');
            return;
        }

        this.dom.loginBtn.disabled = true;
        this.dom.loginBtn.classList.add('loading');
        this.hideLoginError();

        try {
            await this.firebase.signIn(email, password);
            this.currentUser = this.firebase.currentUser;
            this.dom.loginBtn.textContent = '✅ Thành công!';
            await this.sleep(500);
            this.showDashboard();
            this.showConfetti();
        } catch (error) {
            let msg = 'Đăng nhập thất bại';
            if (error.message.includes('EMAIL_NOT_FOUND')) msg = 'Email không tồn tại';
            else if (error.message.includes('INVALID_PASSWORD')) msg = 'Mật khẩu không đúng';
            else if (error.message.includes('USER_DISABLED')) msg = 'Tài khoản đã bị vô hiệu hóa';
            else if (error.message.includes('TOO_MANY_ATTEMPTS')) msg = 'Quá nhiều lần thử, vui lòng thử lại sau';
            else msg = error.message || 'Đăng nhập thất bại';
            this.showLoginError(msg);
        } finally {
            this.dom.loginBtn.disabled = false;
            this.dom.loginBtn.classList.remove('loading');
            this.dom.loginBtn.textContent = '🔐 Đăng nhập';
        }
    }

    showLoginError(msg) {
        this.dom.loginError.textContent = '❌ ' + msg;
        this.dom.loginError.classList.add('show');
    }

    hideLoginError() {
        this.dom.loginError.classList.remove('show');
    }

    logout() {
        this.firebase.logout();
        this.currentUser = null;
        this.allAccounts = [];
        this.filteredAccounts = [];
        this.selectedAccounts = new Set();
        this.dom.dashboard.classList.remove('active');
        this.dom.loginPage.style.display = 'flex';
        this.dom.timeRestriction.classList.remove('active');
        this.updateTimeStatus();
        this.closePopup();
        this.closeTelegramModal();
        this.closeGeminiModal();
    }

    // ============================================
    // DASHBOARD
    // ============================================

    async showDashboard() {
        this.dom.loginPage.style.display = 'none';
        this.dom.dashboard.classList.add('active');
        this.dom.userEmailDisplay.textContent = this.currentUser.email;

        if (this.currentUser.email === CONFIG.app.adminEmail) {
            this.dom.adminBadge.style.display = 'inline-block';
        } else {
            this.dom.adminBadge.style.display = 'none';
        }

        this.updateTimeStatus();
        await this.fetchAccounts();
        await this.loadAdminNotification();
        await this.checkTelegramStatus();
    }

    // ============================================
    // ACCOUNT OPERATIONS
    // ============================================

    async fetchAccounts(forceRefresh = false) {
        if (!this.currentUser) return;

        const token = this.firebase.getToken();
        if (!token) {
            this.logout();
            return;
        }

        const now = Date.now();
        if (!forceRefresh && this.cache.data && this.cache.userEmail === this.currentUser.email &&
            (now - this.cache.timestamp) < CONFIG.app.cacheTTL) {
            this.allAccounts = this.cache.data;
            this.applyFilters();
            return;
        }

        if (this.isLoading) return;
        this.isLoading = true;
        this.dom.refreshBtn.disabled = true;
        this.showLoading();

        try {
            const collection = this.firebase.getUserCollection(this.currentUser.email);
            const docs = await this.firebase.fetchAllDocuments(collection);
            
            const accounts = (docs || []).map(doc => ({
                docId: doc.docId,
                username: doc.username || '',
                password: doc.password || '',
                email: doc.email || '',
                emailPassword: doc.emailPassword || '',
                proxy: doc.proxy || 'direct',
                registeredAt: doc.registeredAt || '',
                status: doc.status || 'success',
                note: doc.note || ''
            }));

            accounts.sort((a, b) => {
                if (!a.registeredAt) return 1;
                if (!b.registeredAt) return -1;
                return new Date(b.registeredAt) - new Date(a.registeredAt);
            });

            this.allAccounts = accounts;
            this.cache.data = accounts;
            this.cache.timestamp = now;
            this.cache.userEmail = this.currentUser.email;

            this.applyFilters();
        } catch (error) {
            console.error('❌ Lỗi fetch:', error);
            this.showError('Không thể tải dữ liệu: ' + error.message);
            if (this.cache.data && this.cache.userEmail === this.currentUser.email) {
                this.allAccounts = this.cache.data;
                this.applyFilters();
            }
        } finally {
            this.isLoading = false;
            this.dom.refreshBtn.disabled = false;
        }
    }

    applyFilters() {
        const search = this.dom.searchInput.value.toLowerCase().trim();
        const status = this.dom.statusFilter.value;
        const fromDate = this.dom.dateFrom.value;
        const toDate = this.dom.dateTo.value;

        this.filteredAccounts = this.allAccounts.filter(acc => {
            if (search) {
                const username = (acc.username || '').toLowerCase();
                const email = (acc.email || '').toLowerCase();
                if (!username.includes(search) && !email.includes(search)) {
                    return false;
                }
            }

            if (status !== 'all') {
                const accStatus = (acc.status || 'success').toLowerCase();
                if (accStatus !== status.toLowerCase()) {
                    return false;
                }
            }

            if (fromDate && acc.registeredAt) {
                const accDate = acc.registeredAt.split('T')[0];
                if (accDate < fromDate) return false;
            }
            if (toDate && acc.registeredAt) {
                const accDate = acc.registeredAt.split('T')[0];
                if (accDate > toDate) return false;
            }

            return true;
        });

        this.currentPage = 1;
        this.selectedAccounts.clear();
        this.updateBatchToolbar();
        this.renderTable();
        this.updateStats();
        this.updatePagination();
    }

    renderTable() {
        const start = (this.currentPage - 1) * CONFIG.app.pageSize;
        const end = Math.min(start + CONFIG.app.pageSize, this.filteredAccounts.length);
        const pageData = this.filteredAccounts.slice(start, end);

        if (pageData.length === 0) {
            this.dom.tableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="9">
                        ${this.allAccounts.length === 0 ? '📭 Chưa có tài khoản nào được tạo' : '🔍 Không tìm thấy kết quả'}
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        pageData.forEach((acc, index) => {
            const num = start + index + 1;
            const date = acc.registeredAt ? this.formatDate(acc.registeredAt) : '-';
            const isChecked = this.selectedAccounts.has(acc.docId || acc.username);

            html += `
                <tr data-docid="${acc.docId || ''}" data-username="${acc.username}">
                    <td><input type="checkbox" class="row-checkbox row-select" ${isChecked ? 'checked' : ''}></td>
                    <td>${num}</td>
                    <td class="username-cell">${this.escapeHtml(acc.username || '-')}</td>
                    <td class="password-cell">${this.escapeHtml(acc.password || '-')}</td>
                    <td class="email-cell">${this.escapeHtml(acc.email || '-')}</td>
                    <td>${this.escapeHtml(acc.emailPassword || '-')}</td>
                    <td>${date}</td>
                    <td class="note-cell" title="${this.escapeHtml(acc.note || '')}">${this.escapeHtml(acc.note || '')}</td>
                    <td>
                        <button class="edit-btn" onclick="window.app.startEdit('${acc.docId || ''}')">✏️</button>
                        <button class="copy-btn" onclick='window.app.copyText("${this.escapeHtml(acc.username)}:${this.escapeHtml(acc.password)}")'>📋</button>
                        <button class="delete-btn" onclick="window.app.deleteAccount('${acc.docId || ''}', '${this.escapeHtml(acc.username)}')">🗑️</button>
                    </td>
                </tr>
            `;
        });

        this.dom.tableBody.innerHTML = html;

        document.querySelectorAll('.row-select').forEach(cb => {
            cb.addEventListener('change', function() {
                const row = this.closest('tr');
                const docId = row.dataset.docid;
                if (this.checked) {
                    window.app.selectedAccounts.add(docId);
                } else {
                    window.app.selectedAccounts.delete(docId);
                }
                window.app.updateBatchToolbar();
                window.app.updateSelectAll();
            });
        });

        this.updatePaginationInfo();
    }

    updateSelectAll() {
        const checkboxes = document.querySelectorAll('.row-select');
        const checked = document.querySelectorAll('.row-select:checked');
        this.dom.selectAll.checked = checkboxes.length > 0 && checkboxes.length === checked.length;
        this.dom.selectAll.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
    }

    updateBatchToolbar() {
        const count = this.selectedAccounts.size;
        this.dom.selectedCount.textContent = count;
        if (count > 0) {
            this.dom.batchToolbar.classList.add('show');
        } else {
            this.dom.batchToolbar.classList.remove('show');
        }
    }

    getSelectedAccountsData() {
        return this.allAccounts.filter(acc => this.selectedAccounts.has(acc.docId || acc.username));
    }

    updateStats() {
        const total = this.allAccounts.length;
        const success = this.allAccounts.filter(a => (a.status || 'success') === 'success').length;
        const pending = this.allAccounts.filter(a => (a.status || '').toLowerCase() === 'pending').length;
        const locked = this.allAccounts.filter(a => (a.status || '').toLowerCase() === 'locked').length;

        this.dom.totalCount.textContent = total;
        this.dom.successCount.textContent = success;
        this.dom.pendingCount.textContent = pending;
        this.dom.lockedCount.textContent = locked;
    }

    updatePaginationInfo() {
        const total = this.filteredAccounts.length;
        const start = total === 0 ? 0 : (this.currentPage - 1) * CONFIG.app.pageSize + 1;
        const end = Math.min(this.currentPage * CONFIG.app.pageSize, total);
        this.dom.startIndex.textContent = start;
        this.dom.endIndex.textContent = end;
        this.dom.totalItems.textContent = total;
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredAccounts.length / CONFIG.app.pageSize);
        this.dom.prevPage.disabled = this.currentPage <= 1;
        this.dom.nextPage.disabled = this.currentPage >= totalPages || totalPages === 0;
    }

    // ============================================
    // CRUD OPERATIONS
    // ============================================

    startEdit(docId) {
        if (this.editingRow) {
            this.cancelEdit();
        }

        const rows = document.querySelectorAll('tr');
        let targetRow = null;
        let account = null;

        for (const row of rows) {
            if (row.dataset.docid === docId) {
                targetRow = row;
                const data = this.allAccounts.find(a => (a.docId || a.username) === docId);
                if (data) account = data;
                break;
            }
        }

        if (!targetRow || !account) return;

        this.editingRow = targetRow;
        targetRow.classList.add('editing');

        const cells = targetRow.querySelectorAll('td');

        cells[2].innerHTML = `<input class="edit-input" id="editUsername" value="${this.escapeHtml(account.username)}">`;
        cells[3].innerHTML = `<input class="edit-input" id="editPassword" value="${this.escapeHtml(account.password)}">`;
        cells[4].innerHTML = `<input class="edit-input" id="editEmail" value="${this.escapeHtml(account.email)}">`;
        cells[5].innerHTML = `<input class="edit-input" id="editEmailPass" value="${this.escapeHtml(account.emailPassword)}">`;
        cells[6].innerHTML = `<input class="edit-input" id="editDate" value="${account.registeredAt ? account.registeredAt.split('T')[0] : ''}" type="date">`;
        cells[7].innerHTML = `<input class="edit-input" id="editNote" value="${this.escapeHtml(account.note || '')}" placeholder="Ghi chú...">`;
        cells[8].innerHTML = `
            <button class="save-edit-btn" onclick="window.app.saveEdit()">💾 Lưu</button>
            <button class="cancel-edit-btn" onclick="window.app.cancelEdit()">❌</button>
        `;
    }

    async saveEdit() {
        if (!this.editingRow) return;

        const docId = this.editingRow.dataset.docid;
        const newData = {
            username: document.getElementById('editUsername').value.trim(),
            password: document.getElementById('editPassword').value.trim(),
            email: document.getElementById('editEmail').value.trim(),
            emailPassword: document.getElementById('editEmailPass').value.trim(),
            registeredAt: document.getElementById('editDate').value ? 
                new Date(document.getElementById('editDate').value).toISOString() : new Date().toISOString(),
            note: document.getElementById('editNote').value.trim()
        };

        if (!newData.username || !newData.password) {
            this.showNotification('⚠️ Username và Password không được để trống!', 'warning');
            return;
        }

        try {
            const collection = this.firebase.getUserCollection(this.currentUser.email);
            await this.firebase.saveData(collection, docId, newData);
            this.showNotification(`✅ Đã cập nhật tài khoản ${newData.username}!`, 'success');
            await this.fetchAccounts(true);
            this.cancelEdit();
        } catch (error) {
            this.showNotification('❌ Lỗi: ' + error.message, 'error');
        }
    }

    cancelEdit() {
        if (this.editingRow) {
            this.editingRow.classList.remove('editing');
            this.editingRow = null;
        }
        this.renderTable();
    }

    async deleteAccount(docId, username) {
        if (!confirm(`⚠️ Bạn có chắc muốn xóa tài khoản "${username}"?`)) return;

        try {
            const collection = this.firebase.getUserCollection(this.currentUser.email);
            await this.firebase.deleteData(collection, docId);
            this.showNotification(`✅ Đã xóa tài khoản ${username}!`, 'success');
            await this.fetchAccounts(true);
        } catch (error) {
            this.showNotification('❌ Lỗi: ' + error.message, 'error');
        }
    }

    async batchDelete() {
        const selected = this.getSelectedAccountsData();
        if (selected.length === 0) {
            this.showNotification('⚠️ Vui lòng chọn tài khoản để xóa!', 'warning');
            return;
        }

        if (!confirm(`⚠️ Bạn có chắc muốn xóa ${selected.length} tài khoản đã chọn?`)) return;

        try {
            const collection = this.firebase.getUserCollection(this.currentUser.email);
            for (const acc of selected) {
                await this.firebase.deleteData(collection, acc.docId);
            }
            this.showNotification(`✅ Đã xóa ${selected.length} tài khoản!`, 'success');
            this.selectedAccounts.clear();
            await this.fetchAccounts(true);
        } catch (error) {
            this.showNotification('❌ Lỗi: ' + error.message, 'error');
        }
    }

    async batchDeleteAll() {
        if (!confirm(`⚠️ Bạn có chắc muốn XÓA TẤT CẢ ${this.allAccounts.length} tài khoản?`)) return;
        if (!confirm(`🔴 XÁC NHẬN LẦN CUỐI: Xóa tất cả ${this.allAccounts.length} tài khoản?`)) return;

        try {
            const collection = this.firebase.getUserCollection(this.currentUser.email);
            for (const acc of this.allAccounts) {
                await this.firebase.deleteData(collection, acc.docId);
            }
            this.showNotification(`✅ Đã xóa tất cả ${this.allAccounts.length} tài khoản!`, 'success');
            await this.fetchAccounts(true);
        } catch (error) {
            this.showNotification('❌ Lỗi: ' + error.message, 'error');
        }
    }

    async batchLock() {
        const selected = this.getSelectedAccountsData();
        if (selected.length === 0) {
            this.showNotification('⚠️ Vui lòng chọn tài khoản để khóa!', 'warning');
            return;
        }

        try {
            const collection = this.firebase.getUserCollection(this.currentUser.email);
            for (const acc of selected) {
                await this.firebase.saveData(collection, acc.docId, { ...acc, status: 'locked' });
            }
            this.showNotification(`🔒 Đã khóa ${selected.length} tài khoản!`, 'success');
            this.selectedAccounts.clear();
            await this.fetchAccounts(true);
        } catch (error) {
            this.showNotification('❌ Lỗi: ' + error.message, 'error');
        }
    }

    async batchUnlock() {
        const selected = this.getSelectedAccountsData();
        if (selected.length === 0) {
            this.showNotification('⚠️ Vui lòng chọn tài khoản để mở khóa!', 'warning');
            return;
        }

        try {
            const collection = this.firebase.getUserCollection(this.currentUser.email);
            for (const acc of selected) {
                await this.firebase.saveData(collection, acc.docId, { ...acc, status: 'success' });
            }
            this.showNotification(`🔓 Đã mở khóa ${selected.length} tài khoản!`, 'success');
            this.selectedAccounts.clear();
            await this.fetchAccounts(true);
        } catch (error) {
            this.showNotification('❌ Lỗi: ' + error.message, 'error');
        }
    }

    batchCopy() {
        const selected = this.getSelectedAccountsData();
        if (selected.length === 0) {
            this.showNotification('⚠️ Vui lòng chọn tài khoản để copy!', 'warning');
            return;
        }

        const text = selected.map(acc => `${acc.username}:${acc.password}`).join('\n');
        this.copyText(text);
        this.showNotification(`✅ Đã copy ${selected.length} tài khoản!`, 'success');
    }

    // ============================================
    // EXPORT / IMPORT
    // ============================================

    exportTXT() {
        if (this.allAccounts.length === 0) {
            this.showNotification('📭 Không có dữ liệu để xuất!', 'warning');
            return;
        }

        let content = '';
        this.allAccounts.forEach(acc => {
            content += `${acc.username || ''}|${acc.password || ''}\n`;
        });

        this.downloadFile(content, `garena_accounts_${Date.now()}.txt`, 'text/plain');
        this.showNotification(`✅ Đã export ${this.allAccounts.length} tài khoản ra file TXT!`, 'success');
    }

    exportCSV() {
        if (this.allAccounts.length === 0) {
            this.showNotification('📭 Không có dữ liệu để xuất!', 'warning');
            return;
        }

        const headers = ['Username', 'Password', 'Email', 'EmailPassword', 'RegisteredAt', 'Status', 'Note'];
        const rows = this.allAccounts.map(acc => [
            acc.username || '',
            acc.password || '',
            acc.email || '',
            acc.emailPassword || '',
            acc.registeredAt || '',
            acc.status || '',
            acc.note || ''
        ]);

        const content = headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n');
        this.downloadFile(content, `garena_accounts_${Date.now()}.csv`, 'text/csv');
        this.showNotification(`✅ Đã export ${this.allAccounts.length} tài khoản!`, 'success');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    importAccounts() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.json,.txt';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                let accounts = [];

                if (file.name.endsWith('.json')) {
                    accounts = JSON.parse(text);
                } else {
                    const lines = text.split('\n').filter(l => l.trim());
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim());
                        const acc = {};
                        headers.forEach((h, idx) => {
                            acc[h] = values[idx] || '';
                        });
                        if (acc.username && acc.password) {
                            acc.status = acc.status || 'success';
                            acc.registeredAt = acc.registeredAt || new Date().toISOString();
                            accounts.push(acc);
                        }
                    }
                }

                if (accounts.length === 0) {
                    this.showNotification('⚠️ Không tìm thấy dữ liệu hợp lệ!', 'warning');
                    return;
                }

                if (!confirm(`📥 Import ${accounts.length} tài khoản?`)) return;

                let success = 0;
                const collection = this.firebase.getUserCollection(this.currentUser.email);
                for (const acc of accounts) {
                    try {
                        const docId = this.firebase.generateDocId();
                        await this.firebase.saveData(collection, docId, {
                            username: acc.username,
                            password: acc.password,
                            email: acc.email || '',
                            emailPassword: acc.emailPassword || '',
                            registeredAt: acc.registeredAt || new Date().toISOString(),
                            status: acc.status || 'success',
                            note: acc.note || ''
                        });
                        success++;
                    } catch (e) {
                        console.error('Import error:', e);
                    }
                }

                this.showNotification(`✅ Đã import ${success}/${accounts.length} tài khoản!`, 'success');
                await this.fetchAccounts(true);
            } catch (error) {
                this.showNotification('❌ Lỗi import: ' + error.message, 'error');
            }
        };
        input.click();
    }

    // ============================================
    // TELEGRAM
    // ============================================

    async checkTelegramStatus() {
        const config = await this.getUserTelegramConfig(this.currentUser.email);
        if (config && config.enabled) {
            this.dom.telegramBtn.textContent = '🤖 Telegram ✅';
            this.dom.telegramBtn.className = 'btn btn-telegram active';
        } else {
            this.dom.telegramBtn.textContent = '🤖 Telegram';
            this.dom.telegramBtn.className = 'btn btn-telegram';
        }
    }

    async getUserTelegramConfig(email) {
        try {
            const token = this.firebase.getToken();
            if (!token) return null;

            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.firebase.projectId}/databases/(default)/documents/telegram_configs/${email}?key=${CONFIG.firebase.apiKey}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 404) return null;
            if (!response.ok) return null;

            const data = await response.json();
            const fields = data.fields || {};
            return {
                botToken: fields.botToken?.stringValue || '',
                chatId: fields.chatId?.stringValue || '',
                enabled: fields.enabled?.booleanValue || false,
                updatedAt: fields.updatedAt?.stringValue || ''
            };
        } catch (error) {
            console.error('Lỗi lấy Telegram config:', error);
            return null;
        }
    }

    async saveUserTelegramConfig(email, config) {
        try {
            const token = this.firebase.getToken();
            if (!token) return false;

            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.firebase.projectId}/databases/(default)/documents/telegram_configs/${email}?key=${CONFIG.firebase.apiKey}`;
            const fields = {
                botToken: { stringValue: config.botToken || '' },
                chatId: { stringValue: config.chatId || '' },
                enabled: { booleanValue: config.enabled || false },
                updatedAt: { stringValue: new Date().toISOString() },
                userEmail: { stringValue: email }
            };

            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields })
            });

            return response.ok;
        } catch (error) {
            console.error('Lỗi lưu Telegram config:', error);
            return false;
        }
    }

    async sendTelegramMessage(chatId, message) {
        try {
            const url = `https://api.telegram.org/bot${CONFIG.telegram.botToken}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Lỗi gửi Telegram:', error);
            return null;
        }
    }

    async sendTelegramFile(chatId, content, filename) {
        try {
            const url = `https://api.telegram.org/bot${CONFIG.telegram.botToken}/sendDocument`;
            const formData = new FormData();
            const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
            formData.append('chat_id', chatId);
            formData.append('document', blob, filename);
            formData.append('caption', `📦 File xuất: ${filename}`);

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Lỗi gửi file Telegram:', error);
            return null;
        }
    }

    async sendTelegramReportToUser(email) {
        try {
            const config = await this.getUserTelegramConfig(email);
            if (!config || !config.enabled || !config.chatId) {
                console.log(`User ${email} chưa cấu hình Telegram`);
                return;
            }

            // Lấy data của user
            const collection = this.firebase.getUserCollection(email);
            const docs = await this.firebase.fetchAllDocuments(collection);
            const accounts = docs || [];

            const total = accounts.length;
            const success = accounts.filter(a => a.status === 'success').length;
            const pending = accounts.filter(a => a.status === 'pending').length;
            const locked = accounts.filter(a => a.status === 'locked').length;
            const failed = accounts.filter(a => a.status === 'failed').length;

            // Tạo file txt
            let fileContent = '';
            accounts.forEach(acc => {
                fileContent += `${acc.username}|${acc.password}\n`;
            });

            // Gửi báo cáo
            const report = `
📊 <b>BÁO CÁO TÀI KHOẢN</b>
📅 Ngày: ${new Date().toLocaleDateString('vi-VN')}
🕐 Thời gian: ${new Date().toLocaleTimeString('vi-VN')}

📦 <b>Tổng số:</b> ${total} tài khoản
✅ Thành công: ${success}
⏳ Pending: ${pending}
🔒 Đã khóa: ${locked}
❌ Thất bại: ${failed}

📈 <b>Tỷ lệ thành công:</b> ${total > 0 ? Math.round(success/total*100) : 0}%

💡 <b>Lưu ý:</b> File đính kèm chứa danh sách username|password
🔄 Để xóa toàn bộ data, gửi lệnh: <code>/delete_all_data</code>
            `;

            await this.sendTelegramMessage(config.chatId, report);
            await this.sendTelegramFile(config.chatId, fileContent, `accounts_${Date.now()}.txt`);

            console.log(`✅ Đã gửi báo cáo Telegram cho ${email}`);
        } catch (error) {
            console.error('Lỗi gửi báo cáo:', error);
        }
    }

    async sendDailyReports() {
        console.log('📊 Đang gửi báo cáo hàng ngày...');

        for (const email of CONFIG.users) {
            try {
                await this.sendTelegramReportToUser(email);
                await this.sleep(1000);
            } catch (error) {
                console.error(`Lỗi gửi báo cáo cho ${email}:`, error);
            }
        }

        console.log('✅ Đã gửi báo cáo hàng ngày cho tất cả user!');
    }

    showTelegramConfig() {
        this.getUserTelegramConfig(this.currentUser.email).then(config => {
            this.telegramConfig = config || { botToken: '', chatId: '', enabled: false };

            this.dom.telegramBotToken.value = this.telegramConfig.botToken || '';
            this.dom.telegramChatId.value = this.telegramConfig.chatId || '';
            this.dom.telegramEnabled.checked = this.telegramConfig.enabled || false;

            this.updateTelegramStatus();
            this.dom.telegramModal.classList.add('show');
        });
    }

    closeTelegramModal() {
        this.dom.telegramModal.classList.remove('show');
    }

    updateTelegramStatus() {
        const statusEl = this.dom.telegramStatus;
        const enabled = this.dom.telegramEnabled.checked;
        const botToken = this.dom.telegramBotToken.value.trim();
        const chatId = this.dom.telegramChatId.value.trim();

        if (enabled && botToken && chatId) {
            statusEl.className = 'telegram-status active';
            statusEl.innerHTML = `
                <span class="status-icon">✅</span>
                <span>Đã kết nối Telegram! Bạn sẽ nhận báo cáo lúc 19:00 hàng ngày</span>
            `;
        } else if (enabled && (!botToken || !chatId)) {
            statusEl.className = 'telegram-status inactive';
            statusEl.innerHTML = `
                <span class="status-icon">⚠️</span>
                <span>Đã bật nhưng chưa nhập đầy đủ Bot Token và Chat ID</span>
            `;
        } else {
            statusEl.className = 'telegram-status inactive';
            statusEl.innerHTML = `
                <span class="status-icon">⏳</span>
                <span>Chưa cấu hình</span>
            `;
        }
    }

    async saveTelegramConfig() {
        const botToken = this.dom.telegramBotToken.value.trim();
        const chatId = this.dom.telegramChatId.value.trim();
        const enabled = this.dom.telegramEnabled.checked;

        if (enabled && (!botToken || !chatId)) {
            this.showNotification('⚠️ Vui lòng nhập Bot Token và Chat ID!', 'warning');
            return;
        }

        const config = { botToken, chatId, enabled };
        const success = await this.saveUserTelegramConfig(this.currentUser.email, config);

        if (success) {
            this.telegramConfig = config;
            this.closeTelegramModal();
            this.showNotification('✅ Đã lưu cấu hình Telegram!', 'success');
            await this.checkTelegramStatus();

            if (enabled && chatId) {
                const testMsg = `
✅ <b>Kết nối thành công!</b>
👤 User: ${this.currentUser.email}
🕐 Thời gian: ${new Date().toLocaleString()}

📌 Bạn sẽ nhận báo cáo tự động lúc <b>19:00</b> mỗi ngày
💡 Để xóa toàn bộ data, gửi lệnh: <code>/delete_all_data</code>
                `;
                await this.sendTelegramMessage(chatId, testMsg);
            }
        } else {
            this.showNotification('❌ Lỗi lưu cấu hình!', 'error');
        }
    }

    async testTelegramConnection() {
        const botToken = this.dom.telegramBotToken.value.trim();
        const chatId = this.dom.telegramChatId.value.trim();

        if (!botToken || !chatId) {
            this.showNotification('⚠️ Vui lòng nhập Bot Token và Chat ID!', 'warning');
            return;
        }

        try {
            const result = await this.sendTelegramMessage(chatId, '✅ <b>Test kết nối thành công!</b>');
            if (result && result.ok) {
                this.showNotification('✅ Gửi tin nhắn test thành công!', 'success');
            } else {
                this.showNotification('❌ Lỗi: ' + (result?.description || 'Không xác định'), 'error');
            }
        } catch (error) {
            this.showNotification('❌ Lỗi kết nối: ' + error.message, 'error');
        }
    }

    async sendTelegramTestData() {
        const chatId = this.dom.telegramChatId.value.trim();
        if (!chatId) {
            this.showNotification('⚠️ Vui lòng nhập Chat ID trước!', 'warning');
            return;
        }

        if (this.allAccounts.length === 0) {
            this.showNotification('📭 Không có data để gửi!', 'warning');
            return;
        }

        try {
            let content = '';
            this.allAccounts.slice(0, 10).forEach(acc => {
                content += `${acc.username}|${acc.password}\n`;
            });

            if (this.allAccounts.length > 10) {
                content += `\n... và ${this.allAccounts.length - 10} tài khoản khác`;
            }

            await this.sendTelegramFile(chatId, content, `test_data_${Date.now()}.txt`);
            this.showNotification(`✅ Đã gửi ${Math.min(10, this.allAccounts.length)} tài khoản test!`, 'success');
        } catch (error) {
            this.showNotification('❌ Lỗi: ' + error.message, 'error');
        }
    }

    // ============================================
    // GEMINI CHAT
    // ============================================

    showGeminiChat() {
        const container = this.dom.geminiChatContainer;
        container.innerHTML = `
            <div style="text-align:center;color:#8b949e;padding:20px;">
                💬 Hỏi Gemini bất kỳ điều gì về Garena, game, hoặc cuộc sống
            </div>
        `;
        this.dom.geminiInput.value = '';
        this.dom.geminiModal.classList.add('show');
        this.dom.geminiInput.focus();
    }

    closeGeminiModal() {
        this.dom.geminiModal.classList.remove('show');
    }

    async sendGeminiMessage() {
        const input = this.dom.geminiInput;
        const container = this.dom.geminiChatContainer;
        const message = input.value.trim();
        
        if (!message) return;

        // Hiển thị tin nhắn user
        const userMsg = document.createElement('div');
        userMsg.className = 'user-msg';
        userMsg.textContent = message;
        container.appendChild(userMsg);
        container.scrollTop = container.scrollHeight;

        input.value = '';
        input.disabled = true;
        this.dom.geminiSendBtn.disabled = true;

        // Hiển thị loading
        const loading = document.createElement('div');
        loading.className = 'loading-msg';
        loading.innerHTML = '<span class="spinner" style="display:inline-block;width:16px;height:16px;border:2px solid #f0883e;border-radius:50%;border-top-color:transparent;animation:spin 0.8s linear infinite;"></span> Đang suy nghĩ...';
        container.appendChild(loading);
        container.scrollTop = container.scrollHeight;

        try {
            const model = this.dom.geminiModelSelect.value;
            const result = await this.gemini.chat(message, model);

            // Xóa loading
            loading.remove();

            if (result.success) {
                const aiMsg = document.createElement('div');
                aiMsg.className = 'ai-msg';
                aiMsg.textContent = result.message;
                container.appendChild(aiMsg);
                container.scrollTop = container.scrollHeight;
            } else {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'ai-msg';
                errorMsg.style.background = '#da3633';
                errorMsg.textContent = '❌ ' + result.error;
                container.appendChild(errorMsg);
                container.scrollTop = container.scrollHeight;
            }
        } catch (error) {
            loading.innerHTML = `❌ Lỗi: ${error.message}`;
        }

        input.disabled = false;
        this.dom.geminiSendBtn.disabled = false;
        input.focus();
    }

    resetGeminiChat() {
        this.gemini.resetHistory();
        const container = this.dom.geminiChatContainer;
        container.innerHTML = `
            <div style="text-align:center;color:#8b949e;padding:20px;">
                ✅ Đã reset lịch sử hội thoại
            </div>
        `;
        this.showNotification('✅ Đã reset lịch sử chat!', 'success');
    }

    // ============================================
    // ADMIN NOTIFICATION
    // ============================================

    async loadAdminNotification() {
        try {
            const url = 'https://raw.githubusercontent.com/tuquangnam-developer/Garena-Auto-Register-Pro-Data/refs/heads/main/Notification/index.html';
            const response = await fetch(url);
            if (!response.ok) throw new Error('Không thể tải thông báo');

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const content = doc.querySelector('.content') || doc.querySelector('body');
            const time = doc.querySelector('.time') || doc.querySelector('.timestamp');

            let contentText = '';
            let timeText = '';

            if (content) {
                contentText = content.innerHTML || content.textContent;
            } else if (html.trim()) {
                contentText = html.trim();
            }

            if (time) {
                timeText = '📅 ' + (time.textContent || new Date().toLocaleString());
            } else {
                timeText = '📅 ' + new Date().toLocaleString();
            }

            if (!this.notificationShown && contentText) {
                this.dom.popupContent.innerHTML = contentText;
                this.dom.popupTime.textContent = timeText;
                this.dom.popupNotification.classList.add('show');
                this.notificationShown = true;
            }
        } catch (error) {
            console.log('Không thể tải thông báo admin:', error);
        }
    }

    closePopup() {
        this.dom.popupNotification.classList.remove('show');
    }

    // ============================================
    // MODAL HELPERS
    // ============================================

    closeModal() {
        this.dom.modalOverlay.classList.remove('show');
    }

    showAddModal() {
        this.dom.modalTitle.textContent = '➕ Thêm tài khoản mới';
        this.dom.modalBody.innerHTML = `
            <div class="form-group">
                <label>👤 Username *</label>
                <input id="addUsername" placeholder="Tên đăng nhập Garena">
            </div>
            <div class="form-group">
                <label>🔑 Password *</label>
                <input id="addPassword" placeholder="Mật khẩu" type="password">
            </div>
            <div class="form-group">
                <label>📧 Email</label>
                <input id="addEmail" placeholder="Email đăng ký">
            </div>
            <div class="form-group">
                <label>🔐 Email Password</label>
                <input id="addEmailPass" placeholder="Mật khẩu email" type="password">
            </div>
            <div class="form-group">
                <label>📝 Ghi chú</label>
                <input id="addNote" placeholder="Ghi chú...">
            </div>
        `;
        this.dom.modalOverlay.classList.add('show');

        this.dom.modalConfirm.onclick = async () => {
            const newAcc = {
                username: document.getElementById('addUsername').value.trim(),
                password: document.getElementById('addPassword').value.trim(),
                email: document.getElementById('addEmail').value.trim(),
                emailPassword: document.getElementById('addEmailPass').value.trim(),
                note: document.getElementById('addNote').value.trim(),
                status: 'success',
                registeredAt: new Date().toISOString()
            };

            if (!newAcc.username || !newAcc.password) {
                this.showNotification('⚠️ Username và Password không được để trống!', 'warning');
                return;
            }

            try {
                const collection = this.firebase.getUserCollection(this.currentUser.email);
                const docId = this.firebase.generateDocId();
                await this.firebase.saveData(collection, docId, newAcc);
                this.showNotification(`✅ Đã thêm tài khoản ${newAcc.username}!`, 'success');
                this.closeModal();
                this.showConfetti();
                await this.fetchAccounts(true);
            } catch (error) {
                this.showNotification('❌ Lỗi: ' + error.message, 'error');
            }
        };
    }

    showDeleteByDateModal() {
        this.dom.modalTitle.textContent = '🗑️ Xóa tài khoản theo ngày';
        this.dom.modalBody.innerHTML = `
            <div class="form-group">
                <label>📅 Từ ngày</label>
                <input type="date" id="deleteFromDate">
            </div>
            <div class="form-group">
                <label>📅 Đến ngày</label>
                <input type="date" id="deleteToDate">
            </div>
            <div class="form-group">
                <label>📊 Status (tùy chọn)</label>
                <select id="deleteStatus">
                    <option value="all">Tất cả</option>
                    <option value="success">✅ Thành công</option>
                    <option value="pending">⏳ Pending</option>
                    <option value="failed">❌ Thất bại</option>
                    <option value="locked">🔒 Đã khóa</option>
                </select>
            </div>
            <p style="color:#f85149;font-size:13px;">⚠️ Hành động này không thể hoàn tác!</p>
        `;
        this.dom.modalOverlay.classList.add('show');

        this.dom.modalConfirm.onclick = async () => {
            const from = document.getElementById('deleteFromDate').value;
            const to = document.getElementById('deleteToDate').value;
            const status = document.getElementById('deleteStatus').value;

            if (!from && !to) {
                this.showNotification('⚠️ Vui lòng chọn ít nhất một mốc ngày!', 'warning');
                return;
            }

            let toDelete = this.allAccounts.filter(acc => {
                if (!acc.registeredAt) return false;
                const date = acc.registeredAt.split('T')[0];
                if (from && date < from) return false;
                if (to && date > to) return false;
                if (status !== 'all' && (acc.status || 'success') !== status) return false;
                return true;
            });

            if (toDelete.length === 0) {
                this.showNotification('📭 Không tìm thấy tài khoản nào!', 'info');
                this.closeModal();
                return;
            }

            if (!confirm(`⚠️ Xóa ${toDelete.length} tài khoản trong khoảng thời gian này?`)) return;

            try {
                const collection = this.firebase.getUserCollection(this.currentUser.email);
                for (const acc of toDelete) {
                    await this.firebase.deleteData(collection, acc.docId);
                }
                this.showNotification(`✅ Đã xóa ${toDelete.length} tài khoản!`, 'success');
                this.closeModal();
                await this.fetchAccounts(true);
            } catch (error) {
                this.showNotification('❌ Lỗi: ' + error.message, 'error');
            }
        };
    }

    // ============================================
    // THEME
    // ============================================

    toggleTheme() {
        document.body.classList.toggle('light-mode');
        const isDark = !document.body.classList.contains('light-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.dom.themeToggle.textContent = isDark ? '🌙 Dark' : '☀️ Light';
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return dateStr;
        }
    }

    copyText(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('✅ Đã copy!', 'success');
        }).catch(() => {
            const input = document.createElement('input');
            input.value = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            this.showNotification('✅ Đã copy!', 'success');
        });
    }

    showLoading() {
        this.dom.tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <span>Đang tải dữ liệu...</span>
                    </div>
                </td>
            </tr>
        `;
    }

    showError(msg) {
        this.dom.tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9" style="color:#f85149;">
                    ❌ ${msg}
                </td>
            </tr>
        `;
    }

    showNotification(message, type = 'info') {
        const container = this.dom.notificationContainer;
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.innerHTML = `
            <span>${message}</span>
            <button class="notif-close-btn" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notif);

        setTimeout(() => {
            if (notif.parentElement) {
                notif.style.animation = 'slideOutNotif 0.3s ease';
                setTimeout(() => notif.remove(), 300);
            }
        }, 4000);
    }

    showConfetti() {
        const colors = ['#f0883e', '#3fb950', '#58a6ff', '#f85149', '#d29922', '#8b5cf6'];
        for (let i = 0; i < 40; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = Math.random() * 8 + 4 + 'px';
            confetti.style.height = Math.random() * 8 + 4 + 'px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            confetti.style.animationDuration = Math.random() * 2 + 1.5 + 's';
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 4000);
        }
    }
}