// ============================================
// MAIN APPLICATION
// Garena Account Manager Pro v1.5.0
// ============================================

import CONFIG from './config.js';
import FirebaseHelper from './firebase.js';
import GeminiHandler from './gemini.js';
import TelegramBotHandler from './telegram.js';

class App {
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
        this.cache = { data: null, timestamp: 0, userEmail: null };
        
        // DOM refs will be initialized in init()
        this.dom = {};
        
        // Init
        this.init();
    }

    init() {
        this.initDOM();
        this.initEventListeners();
        this.initTheme();
        this.initUser();
        this.initTimeCheck();
        this.initDailyReport();
        
        console.log(`🎮 ${CONFIG.app.name} v${CONFIG.app.version} loaded!`);
        console.log('📌 Gemini models available:', this.gemini.getAvailableModels().length);
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
            
            notificationContainer: document.getElementById('notificationContainer')
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
        document.getElementById('dateFilterBtn').addEventListener('click', () => this.applyFilters());
        document.getElementById('clearDateBtn').addEventListener('click', () => {
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

        // Gemini
        this.dom.geminiBtn.addEventListener('click', () => this.showGeminiChat());

        // Export
        this.dom.exportBtn.addEventListener('click', () => this.exportCSV());
        this.dom.exportTxtBtn.addEventListener('click', () => this.exportTXT());
        this.dom.importBtn.addEventListener('click', () => this.importAccounts());

        // Theme
        this.dom.themeToggle.addEventListener('click', () => this.toggleTheme());

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
                if (this.editingRow) this.cancelEdit();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.showAddModal();
            }
        });

        // Batch operations
        document.getElementById('batchCopyBtn').addEventListener('click', () => this.batchCopy());
        document.getElementById('batchLockBtn').addEventListener('click', () => this.batchLock());
        document.getElementById('batchUnlockBtn').addEventListener('click', () => this.batchUnlock());
        document.getElementById('batchDeleteBtn').addEventListener('click', () => this.batchDelete());
        document.getElementById('batchDeleteDateBtn').addEventListener('click', () => this.showDeleteByDateModal());
        document.getElementById('batchDeleteAllBtn').addEventListener('click', () => this.batchDeleteAll());

        // Telegram modal
        document.getElementById('telegramBotToken').addEventListener('input', () => this.updateTelegramStatus());
        document.getElementById('telegramChatId').addEventListener('input', () => this.updateTelegramStatus());
        document.getElementById('telegramEnabled').addEventListener('change', () => this.updateTelegramStatus());
    }

    // ... (các phương thức khác sẽ được viết tiếp)
}

// Khởi tạo app
const app = new App();
export default app;