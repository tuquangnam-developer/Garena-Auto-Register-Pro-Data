// ============================================
// TELEGRAM BOT HANDLER
// ============================================

import CONFIG from './config.js';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${CONFIG.telegram.botToken}`;

export class TelegramBotHandler {
    constructor(geminiHandler = null) {
        this.geminiHandler = geminiHandler;
        this.userSessions = {};
        this.pendingConfirmations = {};
        this.commands = this.initCommands();
    }

    initCommands() {
        return {
            '/start': this.handleStart.bind(this),
            '/help': this.handleHelp.bind(this),
            '/stats': this.handleStats.bind(this),
            '/list': this.handleList.bind(this),
            '/add': this.handleAdd.bind(this),
            '/delete': this.handleDelete.bind(this),
            '/delete_all_data': this.handleDeleteAll.bind(this),
            '/export': this.handleExport.bind(this),
            '/chat': this.handleChat.bind(this),
            '/gemini': this.handleChat.bind(this),
            '/reset': this.handleReset.bind(this),
            '/model': this.handleModel.bind(this),
            '/models': this.handleModels.bind(this),
            '/about': this.handleAbout.bind(this)
        };
    }

    setGeminiHandler(handler) {
        this.geminiHandler = handler;
    }

    async handleMessage(message) {
        try {
            const chatId = message.chat.id;
            const text = message.text || '';
            
            if (!this.userSessions[chatId]) {
                this.userSessions[chatId] = {
                    userId: message.from?.id || chatId,
                    username: message.from?.username || 'Unknown',
                    firstName: message.from?.first_name || 'User',
                    lastInteraction: Date.now(),
                    geminiHistory: [],
                    model: CONFIG.gemini.defaultModel,
                    email: null
                };
            }

            // Xử lý xác nhận
            if (this.pendingConfirmations[chatId]) {
                return await this.handleConfirmation(message);
            }

            // Xử lý lệnh
            if (text.startsWith('/')) {
                const command = text.split(' ')[0].toLowerCase();
                if (this.commands[command]) {
                    return await this.commands[command](message);
                }
                return await this.handleUnknownCommand(message);
            }

            // Chat tự do
            return await this.handleFreeChat(message);

        } catch (error) {
            console.error('❌ Lỗi xử lý tin nhắn:', error);
            return `❌ Lỗi: ${error.message}`;
        }
    }

    async sendMessage(chatId, text, options = {}) {
        try {
            const url = `${TELEGRAM_API_URL}/sendMessage`;
            const payload = {
                chat_id: chatId,
                text: text,
                parse_mode: options.parse_mode || 'HTML',
                disable_web_page_preview: options.disable_web_page_preview || true
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.description || 'Lỗi gửi tin nhắn');
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Lỗi gửi tin nhắn:', error);
            return null;
        }
    }

    async sendFile(chatId, content, filename, caption = '') {
        try {
            const url = `${TELEGRAM_API_URL}/sendDocument`;
            const formData = new FormData();
            const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
            formData.append('chat_id', chatId);
            formData.append('document', blob, filename);
            if (caption) {
                formData.append('caption', caption);
            }

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.description || 'Lỗi gửi file');
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Lỗi gửi file:', error);
            return null;
        }
    }

    // ===== COMMAND HANDLERS =====

    async handleStart(message) {
        const chatId = message.chat.id;
        const name = message.from?.first_name || 'User';

        const reply = `
🤖 <b>Chào ${name}!</b>

Tôi là trợ lý ảo của <b>Garena Account Manager Pro</b> 🎮
Sử dụng <b>Gemini AI</b> để giải đáp mọi thắc mắc!

📋 <b>Các lệnh có sẵn:</b>

<b>📊 Quản lý tài khoản:</b>
/stats - Xem thống kê
/list - Danh sách (20)
/add <i>username password [email]</i> - Thêm
/delete <i>username</i> - Xóa
/delete_all_data - Xóa TOÀN BỘ
/export - Xuất file txt

<b>🤖 AI & Hỗ trợ:</b>
/chat <i>câu hỏi</i> - Hỏi Gemini AI
/gemini <i>câu hỏi</i> - Alias của /chat
/model <i>tên_model</i> - Đổi model
/models - Danh sách model
/reset - Reset lịch sử chat

<b>ℹ️ Thông tin:</b>
/help - Hướng dẫn chi tiết
/about - Thông tin bot

💡 <b>Mẹo:</b> Bạn có thể chat tự do với tôi!
📌 Báo cáo tự động lúc <b>19:00</b> mỗi ngày
        `;

        return await this.sendMessage(chatId, reply);
    }

    async handleHelp(message) {
        const chatId = message.chat.id;

        const reply = `
📖 <b>HƯỚNG DẪN CHI TIẾT</b>

<b>📊 Quản lý tài khoản:</b>

• <b>/stats</b> - Xem thống kê
• <b>/list</b> - Hiển thị 20 tài khoản
• <b>/add</b> - <code>/add username password [email]</code>
• <b>/delete</b> - <code>/delete username</code>
• <b>/delete_all_data</b> - Xóa TOÀN BỘ
• <b>/export</b> - Xuất file txt

<b>🤖 AI & Hỗ trợ (Gemini):</b>

• <b>/chat</b> - <code>/chat Làm sao để bảo mật?</code>
• <b>/gemini</b> - Alias của /chat
• <b>/model</b> - <code>/model gemini-3.5-flash</code>
• <b>/models</b> - Xem danh sách model
• <b>/reset</b> - Reset lịch sử chat

<b>📌 Lưu ý:</b>
• Dữ liệu của bạn được bảo mật
• Bot báo cáo lúc 19:00 hàng ngày
• Mọi thắc mắc: @tuquangnam
        `;

        return await this.sendMessage(chatId, reply);
    }

    async handleStats(message) {
        const chatId = message.chat.id;
        const email = await this.getUserEmail(chatId);
        
        if (!email) {
            return await this.sendMessage(chatId, 
                '❌ Chưa liên kết email. Vui lòng đăng nhập website trước.'
            );
        }

        const accounts = await this.fetchAccounts(email);
        if (!accounts) {
            return await this.sendMessage(chatId, '❌ Không thể lấy dữ liệu.');
        }

        const total = accounts.length;
        const success = accounts.filter(a => a.status === 'success').length;
        const pending = accounts.filter(a => a.status === 'pending').length;
        const locked = accounts.filter(a => a.status === 'locked').length;
        const failed = accounts.filter(a => a.status === 'failed').length;

        const reply = `
📊 <b>THỐNG KÊ TÀI KHOẢN</b>
📅 ${new Date().toLocaleDateString('vi-VN')}
🕐 ${new Date().toLocaleTimeString('vi-VN')}

📦 <b>Tổng:</b> ${total}
✅ Thành công: ${success} (${total > 0 ? Math.round(success/total*100) : 0}%)
⏳ Pending: ${pending}
🔒 Đã khóa: ${locked}
❌ Thất bại: ${failed}

📈 <b>Tỷ lệ thành công:</b> ${total > 0 ? Math.round(success/total*100) : 0}%

💡 Gõ <code>/list</code> để xem danh sách
        `;

        return await this.sendMessage(chatId, reply);
    }

    async handleList(message) {
        const chatId = message.chat.id;
        const email = await this.getUserEmail(chatId);
        
        if (!email) {
            return await this.sendMessage(chatId, '❌ Chưa liên kết email.');
        }

        const accounts = await this.fetchAccounts(email);
        if (!accounts || accounts.length === 0) {
            return await this.sendMessage(chatId, '📭 Chưa có tài khoản nào.');
        }

        let reply = `📋 <b>DANH SÁCH (${accounts.length})</b>\n\n`;
        const list = accounts.slice(0, 20);
        list.forEach((acc, i) => {
            const emoji = this.getStatusEmoji(acc.status);
            reply += `${i+1}. ${emoji} <b>${acc.username}</b> - ${acc.email || 'N/A'}\n`;
        });

        if (accounts.length > 20) {
            reply += `\n... và ${accounts.length - 20} tài khoản khác`;
        }

        reply += `\n\n💡 <code>/export</code> để xuất file`;

        return await this.sendMessage(chatId, reply);
    }

    async handleAdd(message) {
        const chatId = message.chat.id;
        const parts = message.text.split(' ');
        
        if (parts.length < 3) {
            return await this.sendMessage(chatId, 
                `⚠️ Cú pháp: <code>/add username password [email]</code>`
            );
        }

        const email = await this.getUserEmail(chatId);
        if (!email) {
            return await this.sendMessage(chatId, '❌ Chưa liên kết email.');
        }

        const username = parts[1];
        const password = parts[2];
        const userEmail = parts[3] || '';

        const result = await this.addAccount(email, { username, password, email: userEmail });
        return await this.sendMessage(chatId, result);
    }

    async handleDelete(message) {
        const chatId = message.chat.id;
        const parts = message.text.split(' ');
        
        if (parts.length < 2) {
            return await this.sendMessage(chatId, 
                `⚠️ Cú pháp: <code>/delete username</code>`
            );
        }

        const email = await this.getUserEmail(chatId);
        if (!email) {
            return await this.sendMessage(chatId, '❌ Chưa liên kết email.');
        }

        const result = await this.deleteAccount(email, parts[1]);
        return await this.sendMessage(chatId, result);
    }

    async handleDeleteAll(message) {
        const chatId = message.chat.id;
        const email = await this.getUserEmail(chatId);
        
        if (!email) {
            return await this.sendMessage(chatId, '❌ Chưa liên kết email.');
        }

        const accounts = await this.fetchAccounts(email);
        if (!accounts || accounts.length === 0) {
            return await this.sendMessage(chatId, '📭 Không có tài khoản nào để xóa.');
        }

        this.pendingConfirmations[chatId] = {
            action: 'delete_all',
            email: email,
            timestamp: Date.now()
        };

        return await this.sendMessage(chatId, `
🔴 <b>CẢNH BÁO: XÓA TOÀN BỘ</b>

Bạn đang yêu cầu xóa <b>${accounts.length}</b> tài khoản.
Hành động này <b>KHÔNG THỂ HOÀN TÁC</b>!

Để xác nhận, gửi: <code>XÁC NHẬN XÓA TẤT CẢ</code>
        `);
    }

    async handleExport(message) {
        const chatId = message.chat.id;
        const email = await this.getUserEmail(chatId);
        
        if (!email) {
            return await this.sendMessage(chatId, '❌ Chưa liên kết email.');
        }

        const accounts = await this.fetchAccounts(email);
        if (!accounts || accounts.length === 0) {
            return await this.sendMessage(chatId, '📭 Không có tài khoản nào.');
        }

        let content = '';
        accounts.forEach(acc => {
            content += `${acc.username}|${acc.password}\n`;
        });

        const result = await this.sendFile(
            chatId,
            content,
            `accounts_${Date.now()}.txt`,
            `📦 ${accounts.length} tài khoản`
        );

        if (result && result.ok) {
            return await this.sendMessage(chatId, `✅ Đã gửi ${accounts.length} tài khoản!`);
        }
        return await this.sendMessage(chatId, '❌ Lỗi gửi file.');
    }

    async handleChat(message) {
        const chatId = message.chat.id;
        const query = message.text.replace(/^\/chat\s*|\/gemini\s*/, '').trim();

        if (!this.geminiHandler) {
            return await this.sendMessage(chatId, '❌ Gemini chưa sẵn sàng.');
        }

        if (!query) {
            return await this.sendMessage(chatId, 
                `🤖 <b>Chat với Gemini AI</b>\n\n` +
                `Ví dụ: <code>/chat Làm sao để bảo mật tài khoản?</code>`
            );
        }

        const session = this.userSessions[chatId];
        const model = session?.model || CONFIG.gemini.defaultModel;

        try {
            const result = await this.geminiHandler.chat(query, model);

            if (result.success) {
                if (session) {
                    session.geminiHistory = this.geminiHandler.getHistory();
                    this.userSessions[chatId] = session;
                }

                const reply = `🤖 <b>Gemini AI (${model})</b>\n\n${result.message}`;
                return await this.sendMessage(chatId, reply);
            }
            return await this.sendMessage(chatId, `❌ Lỗi: ${result.error}`);
        } catch (error) {
            return await this.sendMessage(chatId, `❌ Lỗi: ${error.message}`);
        }
    }

    async handleReset(message) {
        const chatId = message.chat.id;
        
        if (this.geminiHandler) {
            this.geminiHandler.resetHistory();
        }

        const session = this.userSessions[chatId];
        if (session) {
            session.geminiHistory = [];
            this.userSessions[chatId] = session;
        }

        return await this.sendMessage(chatId, '✅ Đã reset lịch sử chat!');
    }

    async handleModel(message) {
        const chatId = message.chat.id;
        const parts = message.text.split(' ');
        
        if (parts.length < 2) {
            const current = this.geminiHandler?.getCurrentModel() || CONFIG.gemini.defaultModel;
            return await this.sendMessage(chatId, 
                `📌 Model hiện tại: <b>${current}</b>\n\n` +
                `📋 Danh sách model: <code>/models</code>\n` +
                `💡 Đổi model: <code>/model tên_model</code>`
            );
        }

        const modelId = parts[1];
        try {
            this.geminiHandler.setModel(modelId);
            
            const session = this.userSessions[chatId];
            if (session) {
                session.model = modelId;
                this.userSessions[chatId] = session;
            }

            return await this.sendMessage(chatId, 
                `✅ Đã chuyển sang model: <b>${modelId}</b>`
            );
        } catch (error) {
            return await this.sendMessage(chatId, `❌ ${error.message}`);
        }
    }

    async handleModels(message) {
        const chatId = message.chat.id;
        const models = CONFIG.gemini.availableModels;
        const current = this.geminiHandler?.getCurrentModel() || CONFIG.gemini.defaultModel;

        let reply = `📋 <b>DANH SÁCH MODEL GEMINI</b>\n\n`;
        models.forEach(m => {
            const marker = m.id === current ? '✅ ' : '   ';
            reply += `${marker}<b>${m.id}</b>\n   ${m.description}\n\n`;
        });

        reply += `💡 Đổi model: <code>/model tên_model</code>`;

        return await this.sendMessage(chatId, reply);
    }

    async handleAbout(message) {
        const chatId = message.chat.id;

        const reply = `
🤖 <b>Garena Manager Bot</b>

<b>Phiên bản:</b> v1.5.0
<b>Ngày phát hành:</b> 08/08/2026
<b>Model mặc định:</b> ${CONFIG.gemini.defaultModel}

<b>📌 Tính năng:</b>
• Quản lý tài khoản Garena
• Thống kê và báo cáo
• Tích hợp Gemini AI (12+ models)
• Chat tự do với AI
• Xuất file txt
• Báo cáo tự động 19:00

<b>👤 Phát triển:</b>
@tuquangnam

💡 Gõ <code>/help</code> để xem hướng dẫn
        `;

        return await this.sendMessage(chatId, reply);
    }

    async handleUnknownCommand(message) {
        const chatId = message.chat.id;
        return await this.sendMessage(chatId, 
            `❌ Không hiểu lệnh. Gõ <code>/help</code> để xem danh sách.`
        );
    }

    async handleFreeChat(message) {
        const chatId = message.chat.id;
        const text = message.text || '';

        if (!this.geminiHandler) {
            return await this.sendMessage(chatId, 
                '🤖 Gemini chưa sẵn sàng.\n💡 Dùng <code>/chat</code> để hỏi bất kỳ điều gì.'
            );
        }

        const session = this.userSessions[chatId];
        const model = session?.model || CONFIG.gemini.defaultModel;

        try {
            const result = await this.geminiHandler.chat(text, model);

            if (result.success) {
                if (session) {
                    session.geminiHistory = this.geminiHandler.getHistory();
                    this.userSessions[chatId] = session;
                }

                const reply = `🤖 <b>Gemini AI</b>\n\n${result.message}`;
                return await this.sendMessage(chatId, reply);
            }
            return await this.sendMessage(chatId, `❌ Lỗi: ${result.error}`);
        } catch (error) {
            return await this.sendMessage(chatId, `❌ Lỗi: ${error.message}`);
        }
    }

    async handleConfirmation(message) {
        const chatId = message.chat.id;
        const confirm = this.pendingConfirmations[chatId];
        
        if (!confirm) return null;

        const text = message.text || '';
        if (text.includes('XÁC NHẬN XÓA TẤT CẢ') || text.includes('xác nhận xóa tất cả')) {
            const result = await this.deleteAllAccounts(confirm.email);
            delete this.pendingConfirmations[chatId];
            return await this.sendMessage(chatId, result);
        }
        
        delete this.pendingConfirmations[chatId];
        return await this.sendMessage(chatId, '❌ Đã hủy xóa.');
    }

    // ===== HELPERS =====

    getStatusEmoji(status) {
        const map = { 'success': '✅', 'pending': '⏳', 'locked': '🔒', 'failed': '❌' };
        return map[status] || '❓';
    }

    async getUserEmail(chatId) {
        const session = this.userSessions[chatId];
        if (session?.email) return session.email;
        
        try {
            const stored = localStorage.getItem('garena_user');
            if (stored) {
                const user = JSON.parse(stored);
                if (user?.email) {
                    if (session) {
                        session.email = user.email;
                        this.userSessions[chatId] = session;
                    }
                    return user.email;
                }
            }
        } catch (e) {}
        
        return null;
    }

    async fetchAccounts(email) {
        try {
            const token = localStorage.getItem('garena_user_token');
            if (!token) return null;

            const collection = this.getUserCollection(email);
            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.firebase.projectId}/databases/(default)/documents/${collection}`;
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) return null;

            const data = await response.json();
            const docs = data.documents || [];
            
            return docs.map(doc => {
                const fields = doc.fields || {};
                return {
                    docId: doc.name.split('/').pop(),
                    username: fields.username?.stringValue || '',
                    password: fields.password?.stringValue || '',
                    email: fields.email?.stringValue || '',
                    emailPassword: fields.emailPassword?.stringValue || '',
                    registeredAt: fields.registeredAt?.stringValue || '',
                    status: fields.status?.stringValue || 'success',
                    note: fields.note?.stringValue || ''
                };
            });
        } catch (error) {
            console.error('Lỗi fetch accounts:', error);
            return null;
        }
    }

    getUserCollection(email) {
        let sanitized = email
            .replace(/@/g, '_at_')
            .replace(/\./g, '_dot_')
            .replace(/[^a-zA-Z0-9_]/g, '_');
        if (sanitized.match(/^[0-9]/)) {
            sanitized = '_' + sanitized;
        }
        return `account_garena_${sanitized}`;
    }

    async addAccount(email, account) {
        try {
            const token = localStorage.getItem('garena_user_token');
            if (!token) return '❌ Vui lòng đăng nhập website trước.';

            const collection = this.getUserCollection(email);
            const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.firebase.projectId}/databases/(default)/documents/${collection}/${docId}`;

            const fields = {
                username: { stringValue: account.username },
                password: { stringValue: account.password },
                email: { stringValue: account.email || '' },
                registeredAt: { stringValue: new Date().toISOString() },
                status: { stringValue: 'success' },
                userEmail: { stringValue: email },
                note: { stringValue: '' }
            };

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

            return `✅ Đã thêm: ${account.username}`;
        } catch (error) {
            return `❌ Lỗi: ${error.message}`;
        }
    }

    async deleteAccount(email, username) {
        try {
            const token = localStorage.getItem('garena_user_token');
            if (!token) return '❌ Vui lòng đăng nhập website trước.';

            const accounts = await this.fetchAccounts(email);
            const acc = accounts?.find(a => a.username === username);
            if (!acc) {
                return `❌ Không tìm thấy: ${username}`;
            }

            const collection = this.getUserCollection(email);
            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.firebase.projectId}/databases/(default)/documents/${collection}/${acc.docId}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error);
            }

            return `✅ Đã xóa: ${username}`;
        } catch (error) {
            return `❌ Lỗi: ${error.message}`;
        }
    }

    async deleteAllAccounts(email) {
        try {
            const token = localStorage.getItem('garena_user_token');
            if (!token) return '❌ Vui lòng đăng nhập website trước.';

            const accounts = await this.fetchAccounts(email);
            if (!accounts || accounts.length === 0) {
                return '📭 Không có tài khoản nào.';
            }

            const collection = this.getUserCollection(email);
            let deleted = 0;

            for (const acc of accounts) {
                const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.firebase.projectId}/databases/(default)/documents/${collection}/${acc.docId}`;
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    deleted++;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            return `✅ Đã xóa ${deleted}/${accounts.length} tài khoản!`;
        } catch (error) {
            return `❌ Lỗi: ${error.message}`;
        }
    }
}

export default TelegramBotHandler;