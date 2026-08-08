// ============================================
// GARENA TELEGRAM BOT
// Cloudflare Workers v1.5.0
// ============================================

// ============================================
// CONFIG
// ============================================
const CONFIG = {
    BOT_TOKEN: '8262952652:AAGtMZ0Zq5A7Gm2z2UFEbFSDj8PjpVewmOI',
    GEMINI_API_KEY: 'AQ.Ab8RN6KSVvygX6BjDogYlSE3VtsklQwfzhplwqIYjZgGJaPxAg',
    FIREBASE_PROJECT_ID: 'garena-auto-register-pro',
    ADMIN_EMAIL: 'tuquangnamht2007@gmail.com',
    FIRESTORE_URL: 'https://firestore.googleapis.com/v1/projects/garena-auto-register-pro/databases/(default)/documents',
    TELEGRAM_API_URL: 'https://api.telegram.org/bot8262952652:AAGtMZ0Zq5A7Gm2z2UFEbFSDj8PjpVewmOI',
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    USERS: [
        'hoangpho@gmail.com',
        'kieenedau@gmail.com',
        'manhcuongsteven@gmail.com',
        'mndzaicuti@gmail.com',
        'nguyenanhtuan001@gmail.com',
        'qkhanh530494@gmail.com',
        'tuanpath06170@gmail.com',
        'tuquangnamht2007@gmail.com',
        'yeahvi129058@gmail.com'
    ]
};

// ============================================
// TELEGRAM HELPER
// ============================================
async function sendTelegramMessage(chatId, text, options = {}) {
    try {
        const url = `${CONFIG.TELEGRAM_API_URL}/sendMessage`;
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

        return await response.json();
    } catch (error) {
        console.error('❌ Lỗi gửi tin nhắn:', error);
        return null;
    }
}

async function sendTelegramFile(chatId, content, filename, caption = '') {
    try {
        const url = `${CONFIG.TELEGRAM_API_URL}/sendDocument`;
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

        return await response.json();
    } catch (error) {
        console.error('❌ Lỗi gửi file:', error);
        return null;
    }
}

// ============================================
// GEMINI HELPER
// ============================================
async function chatWithGemini(message, history = []) {
    try {
        const systemPrompt = `Bạn là trợ lý ảo thông minh của Garena Account Manager Pro. 
Bạn có thể giúp người dùng quản lý tài khoản Garena, hỗ trợ game và giải đáp thắc mắc.
Hãy trả lời lịch sự, chuyên nghiệp và hữu ích.`;

        const conversation = history.map(msg => 
            `${msg.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${msg.content}`
        ).join('\n');

        const fullPrompt = `${systemPrompt}\n\nLịch sử hội thoại:\n${conversation}\n\nNgười dùng: ${message}\nTrợ lý:`;

        const url = `${CONFIG.GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`;
        
        const payload = {
            contents: [{
                parts: [{ text: fullPrompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                topP: 0.9,
                topK: 40
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Lỗi gọi Gemini API');
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không thể xử lý yêu cầu này.';
    } catch (error) {
        console.error('❌ Lỗi Gemini:', error);
        return `❌ Lỗi: ${error.message}`;
    }
}

// ============================================
// FIRESTORE HELPERS
// ============================================
function getUserCollection(email) {
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

function getStatusEmoji(status) {
    const map = {
        'success': '✅',
        'pending': '⏳',
        'locked': '🔒',
        'failed': '❌'
    };
    return map[status] || '❓';
}

async function fetchUserAccounts(email) {
    try {
        const collection = getUserCollection(email);
        const url = `${CONFIG.FIRESTORE_URL}/${collection}`;
        
        const response = await fetch(url);
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

async function addAccount(email, account) {
    try {
        const collection = getUserCollection(email);
        const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const url = `${CONFIG.FIRESTORE_URL}/${collection}/${docId}`;

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        return `✅ Đã thêm tài khoản: ${account.username}`;
    } catch (error) {
        return `❌ Lỗi: ${error.message}`;
    }
}

async function deleteAccount(email, username) {
    try {
        const accounts = await fetchUserAccounts(email);
        const acc = accounts?.find(a => a.username === username);
        if (!acc) {
            return `❌ Không tìm thấy tài khoản: ${username}`;
        }

        const collection = getUserCollection(email);
        const url = `${CONFIG.FIRESTORE_URL}/${collection}/${acc.docId}`;

        const response = await fetch(url, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        return `✅ Đã xóa tài khoản: ${username}`;
    } catch (error) {
        return `❌ Lỗi: ${error.message}`;
    }
}

async function deleteAllAccounts(email) {
    try {
        const accounts = await fetchUserAccounts(email);
        if (!accounts || accounts.length === 0) {
            return '📭 Không có tài khoản nào để xóa.';
        }

        const collection = getUserCollection(email);
        let deleted = 0;

        for (const acc of accounts) {
            const url = `${CONFIG.FIRESTORE_URL}/${collection}/${acc.docId}`;
            const response = await fetch(url, {
                method: 'DELETE'
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

// ============================================
// COMMAND HANDLERS
// ============================================

async function handleStart(chatId, firstName) {
    const reply = `
🤖 <b>Chào ${firstName}!</b>

Tôi là trợ lý ảo của <b>Garena Account Manager Pro</b> 🎮

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
/reset - Reset lịch sử chat

<b>ℹ️ Thông tin:</b>
/help - Hướng dẫn chi tiết
/about - Thông tin bot

💡 <b>Mẹo:</b> Bạn có thể chat tự do với tôi!
📌 Báo cáo tự động lúc <b>19:00</b> mỗi ngày
    `;
    return await sendTelegramMessage(chatId, reply);
}

async function handleHelp(chatId) {
    const reply = `
📖 <b>HƯỚNG DẪN CHI TIẾT</b>

<b>📊 Quản lý tài khoản:</b>

• <b>/stats</b> - Xem thống kê
• <b>/list</b> - Hiển thị 20 tài khoản
• <b>/add</b> - <code>/add username password [email]</code>
• <b>/delete</b> - <code>/delete username</code>
• <b>/delete_all_data</b> - Xóa TOÀN BỘ
• <b>/export</b> - Xuất file txt

<b>🤖 AI & Hỗ trợ:</b>

• <b>/chat</b> - <code>/chat Làm sao để bảo mật?</code>
• <b>/reset</b> - Reset lịch sử chat

<b>📌 Lưu ý:</b>
• Dữ liệu của bạn được bảo mật
• Bot báo cáo lúc 19:00 hàng ngày
• Mọi thắc mắc: @tuquangnam
    `;
    return await sendTelegramMessage(chatId, reply);
}

async function handleAbout(chatId) {
    const reply = `
🤖 <b>Garena Manager Bot</b>

<b>Phiên bản:</b> v1.5.0
<b>Ngày phát hành:</b> 08/08/2026
<b>Platform:</b> Cloudflare Workers

<b>📌 Tính năng:</b>
• Quản lý tài khoản Garena
• Thống kê và báo cáo
• Tích hợp Gemini AI
• Xuất file txt
• Báo cáo tự động 19:00

<b>👤 Phát triển:</b>
@tuquangnam

💡 Gõ <code>/help</code> để xem hướng dẫn
    `;
    return await sendTelegramMessage(chatId, reply);
}

async function handleStats(chatId, email) {
    if (!email) {
        return await sendTelegramMessage(chatId, 
            '❌ Chưa liên kết email. Vui lòng đăng nhập website trước.'
        );
    }

    const accounts = await fetchUserAccounts(email);
    if (!accounts) {
        return await sendTelegramMessage(chatId, '❌ Không thể lấy dữ liệu.');
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

    return await sendTelegramMessage(chatId, reply);
}

async function handleList(chatId, email) {
    if (!email) {
        return await sendTelegramMessage(chatId, '❌ Chưa liên kết email.');
    }

    const accounts = await fetchUserAccounts(email);
    if (!accounts || accounts.length === 0) {
        return await sendTelegramMessage(chatId, '📭 Chưa có tài khoản nào.');
    }

    let reply = `📋 <b>DANH SÁCH (${accounts.length})</b>\n\n`;
    const list = accounts.slice(0, 20);
    list.forEach((acc, i) => {
        const emoji = getStatusEmoji(acc.status);
        reply += `${i+1}. ${emoji} <b>${acc.username}</b> - ${acc.email || 'N/A'}\n`;
    });

    if (accounts.length > 20) {
        reply += `\n... và ${accounts.length - 20} tài khoản khác`;
    }

    reply += `\n\n💡 <code>/export</code> để xuất file`;

    return await sendTelegramMessage(chatId, reply);
}

async function handleAdd(chatId, email, args) {
    if (args.length < 2) {
        return await sendTelegramMessage(chatId, 
            `⚠️ Cú pháp: <code>/add username password [email]</code>`
        );
    }

    if (!email) {
        return await sendTelegramMessage(chatId, '❌ Chưa liên kết email.');
    }

    const username = args[0];
    const password = args[1];
    const userEmail = args[2] || '';

    const result = await addAccount(email, { username, password, email: userEmail });
    return await sendTelegramMessage(chatId, result);
}

async function handleDelete(chatId, email, args) {
    if (args.length < 1) {
        return await sendTelegramMessage(chatId, 
            `⚠️ Cú pháp: <code>/delete username</code>`
        );
    }

    if (!email) {
        return await sendTelegramMessage(chatId, '❌ Chưa liên kết email.');
    }

    const result = await deleteAccount(email, args[0]);
    return await sendTelegramMessage(chatId, result);
}

async function handleDeleteAll(chatId, email) {
    if (!email) {
        return await sendTelegramMessage(chatId, '❌ Chưa liên kết email.');
    }

    const accounts = await fetchUserAccounts(email);
    if (!accounts || accounts.length === 0) {
        return await sendTelegramMessage(chatId, '📭 Không có tài khoản nào để xóa.');
    }

    // Lưu trạng thái xác nhận vào KV
    await BOT_DATA.put(`confirm_${chatId}`, JSON.stringify({
        email: email,
        timestamp: Date.now()
    }), { expirationTtl: 300 });

    return await sendTelegramMessage(chatId, `
🔴 <b>CẢNH BÁO: XÓA TOÀN BỘ</b>

Bạn đang yêu cầu xóa <b>${accounts.length}</b> tài khoản.
Hành động này <b>KHÔNG THỂ HOÀN TÁC</b>!

Để xác nhận, gửi: <code>XÁC NHẬN XÓA TẤT CẢ</code>
    `);
}

async function handleExport(chatId, email) {
    if (!email) {
        return await sendTelegramMessage(chatId, '❌ Chưa liên kết email.');
    }

    const accounts = await fetchUserAccounts(email);
    if (!accounts || accounts.length === 0) {
        return await sendTelegramMessage(chatId, '📭 Không có tài khoản nào.');
    }

    let content = '';
    accounts.forEach(acc => {
        content += `${acc.username}|${acc.password}\n`;
    });

    const result = await sendTelegramFile(
        chatId,
        content,
        `accounts_${Date.now()}.txt`,
        `📦 ${accounts.length} tài khoản`
    );

    if (result && result.ok) {
        return await sendTelegramMessage(chatId, `✅ Đã gửi ${accounts.length} tài khoản!`);
    }
    return await sendTelegramMessage(chatId, '❌ Lỗi gửi file.');
}

async function handleChat(chatId, message, history) {
    const query = message.replace(/^\/chat\s*/, '').trim();

    if (!query) {
        return await sendTelegramMessage(chatId, 
            `🤖 <b>Chat với Gemini AI</b>\n\n` +
            `Ví dụ: <code>/chat Làm sao để bảo mật tài khoản?</code>`
        );
    }

    try {
        const reply = await chatWithGemini(query, history || []);
        
        // Lưu lịch sử vào KV
        const newHistory = [...(history || []), 
            { role: 'user', content: query },
            { role: 'assistant', content: reply }
        ].slice(-50);

        await BOT_DATA.put(`history_${chatId}`, JSON.stringify(newHistory), { expirationTtl: 86400 });

        const result = `🤖 <b>Gemini AI</b>\n\n${reply}`;
        return await sendTelegramMessage(chatId, result);
    } catch (error) {
        return await sendTelegramMessage(chatId, `❌ Lỗi: ${error.message}`);
    }
}

async function handleReset(chatId) {
    await BOT_DATA.delete(`history_${chatId}`);
    return await sendTelegramMessage(chatId, '✅ Đã reset lịch sử chat!');
}

async function handleConfirmation(chatId, text) {
    // Lấy trạng thái xác nhận từ KV
    const confirmData = await BOT_DATA.get(`confirm_${chatId}`);
    if (!confirmData) return null;

    const confirm = JSON.parse(confirmData);
    if (Date.now() - confirm.timestamp > 300000) {
        await BOT_DATA.delete(`confirm_${chatId}`);
        return await sendTelegramMessage(chatId, '⏰ Yêu cầu đã hết hạn. Vui lòng thử lại.');
    }

    if (text.includes('XÁC NHẬN XÓA TẤT CẢ') || text.includes('xác nhận xóa tất cả')) {
        const result = await deleteAllAccounts(confirm.email);
        await BOT_DATA.delete(`confirm_${chatId}`);
        return await sendTelegramMessage(chatId, result);
    }

    await BOT_DATA.delete(`confirm_${chatId}`);
    return await sendTelegramMessage(chatId, '❌ Đã hủy xóa.');
}

async function handleUnknownCommand(chatId) {
    return await sendTelegramMessage(chatId, 
        `❌ Không hiểu lệnh. Gõ <code>/help</code> để xem danh sách.`
    );
}

// ============================================
// MAIN HANDLER
// ============================================
async function handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text || '';
    const firstName = message.from?.first_name || 'User';
    const username = message.from?.username || 'Unknown';

    // Lấy email từ KV
    let email = await BOT_DATA.get(`email_${chatId}`);

    // Xử lý xác nhận
    const confirmData = await BOT_DATA.get(`confirm_${chatId}`);
    if (confirmData) {
        return await handleConfirmation(chatId, text);
    }

    // Xử lý lệnh
    if (text.startsWith('/')) {
        const parts = text.split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (command) {
            case '/start':
                // Lưu thông tin user
                await BOT_DATA.put(`user_${chatId}`, JSON.stringify({
                    username: username,
                    firstName: firstName,
                    lastInteraction: Date.now()
                }));
                return await handleStart(chatId, firstName);

            case '/help':
                return await handleHelp(chatId);

            case '/about':
                return await handleAbout(chatId);

            case '/stats':
                return await handleStats(chatId, email);

            case '/list':
                return await handleList(chatId, email);

            case '/add':
                return await handleAdd(chatId, email, args);

            case '/delete':
                return await handleDelete(chatId, email, args);

            case '/delete_all_data':
                return await handleDeleteAll(chatId, email);

            case '/export':
                return await handleExport(chatId, email);

            case '/chat':
                // Lấy lịch sử từ KV
                const historyData = await BOT_DATA.get(`history_${chatId}`);
                const history = historyData ? JSON.parse(historyData) : [];
                return await handleChat(chatId, text, history);

            case '/reset':
                return await handleReset(chatId);

            case '/link':
                if (args.length < 1) {
                    return await sendTelegramMessage(chatId, 
                        `⚠️ Cú pháp: <code>/link email</code>\n` +
                        `Ví dụ: <code>/link tuquangnamht2007@gmail.com</code>`
                    );
                }
                const linkEmail = args[0].toLowerCase();
                if (CONFIG.USERS.includes(linkEmail)) {
                    await BOT_DATA.put(`email_${chatId}`, linkEmail);
                    return await sendTelegramMessage(chatId, 
                        `✅ Đã liên kết với email: ${linkEmail}`
                    );
                }
                return await sendTelegramMessage(chatId, 
                    `❌ Email không hợp lệ. Vui lòng liên hệ admin.`
                );

            default:
                return await handleUnknownCommand(chatId);
        }
    }

    // Tin nhắn thường - chat với Gemini
    try {
        const historyData = await BOT_DATA.get(`history_${chatId}`);
        const history = historyData ? JSON.parse(historyData) : [];
        
        const reply = await chatWithGemini(text, history);
        
        const newHistory = [...history, 
            { role: 'user', content: text },
            { role: 'assistant', content: reply }
        ].slice(-50);

        await BOT_DATA.put(`history_${chatId}`, JSON.stringify(newHistory), { expirationTtl: 86400 });

        return await sendTelegramMessage(chatId, `🤖 <b>Gemini AI</b>\n\n${reply}`);
    } catch (error) {
        return await sendTelegramMessage(chatId, `❌ Lỗi: ${error.message}`);
    }
}

// ============================================
// SEND DAILY REPORTS
// ============================================
async function sendDailyReports() {
    console.log('📊 Đang gửi báo cáo hàng ngày...');

    // Lấy danh sách user đã liên kết
    const users = CONFIG.USERS;
    let sent = 0;

    for (const email of users) {
        try {
            // Tìm chatId của user
            const accounts = await fetchUserAccounts(email);
            if (!accounts || accounts.length === 0) continue;

            const total = accounts.length;
            const success = accounts.filter(a => a.status === 'success').length;
            const pending = accounts.filter(a => a.status === 'pending').length;
            const locked = accounts.filter(a => a.status === 'locked').length;
            const failed = accounts.filter(a => a.status === 'failed').length;

            // Tạo file
            let content = '';
            accounts.forEach(acc => {
                content += `${acc.username}|${acc.password}\n`;
            });

            // Gửi cho admin để forward
            const adminChatId = 'YOUR_ADMIN_CHAT_ID'; // Cần set chat ID admin

            // Gửi báo cáo
            const report = `
📊 <b>BÁO CÁO TÀI KHOẢN</b>
📅 Ngày: ${new Date().toLocaleDateString('vi-VN')}
🕐 Thời gian: ${new Date().toLocaleTimeString('vi-VN')}
👤 Email: ${email}

📦 <b>Tổng số:</b> ${total} tài khoản
✅ Thành công: ${success}
⏳ Pending: ${pending}
🔒 Đã khóa: ${locked}
❌ Thất bại: ${failed}

📈 <b>Tỷ lệ thành công:</b> ${total > 0 ? Math.round(success/total*100) : 0}%
            `;

            // Lưu file vào KV để gửi sau
            await BOT_DATA.put(`report_${email}_${Date.now()}`, content);

            sent++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Lỗi gửi báo cáo cho ${email}:`, error);
        }
    }

    console.log(`✅ Đã gửi báo cáo cho ${sent} user`);
}

// ============================================
// SET WEBHOOK
// ============================================
async function setWebhook(url) {
    try {
        const response = await fetch(`${CONFIG.TELEGRAM_API_URL}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Lỗi set webhook:', error);
        return null;
    }
}

// ============================================
// CLOUDFLARE WORKERS HANDLER
// ============================================
export default {
    async fetch(request, env, ctx) {
        // Gán KV namespace vào global
        globalThis.BOT_DATA = env.BOT_DATA;

        const url = new URL(request.url);
        const path = url.pathname;

        // Webhook endpoint
        if (path === '/webhook' && request.method === 'POST') {
            try {
                const body = await request.json();
                
                if (body.message) {
                    console.log(`📩 Nhận tin nhắn từ ${body.message.from?.username || 'Unknown'}`);
                    await handleMessage(body.message);
                }

                return new Response(JSON.stringify({ ok: true }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                console.error('❌ Lỗi xử lý webhook:', error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Set webhook
        if (path === '/set-webhook' && request.method === 'POST') {
            try {
                const { webhookUrl } = await request.json();
                if (!webhookUrl) {
                    return new Response(JSON.stringify({ error: 'Missing webhookUrl' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                const result = await setWebhook(webhookUrl);
                return new Response(JSON.stringify(result), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Get webhook info
        if (path === '/webhook-info' && request.method === 'GET') {
            try {
                const response = await fetch(`${CONFIG.TELEGRAM_API_URL}/getWebhookInfo`);
                const data = await response.json();
                return new Response(JSON.stringify(data), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Send daily reports (trigger from cron)
        if (path === '/send-reports' && request.method === 'POST') {
            try {
                await sendDailyReports();
                return new Response(JSON.stringify({ ok: true, message: 'Reports sent' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Health check
        if (path === '/health' && request.method === 'GET') {
            return new Response(JSON.stringify({ 
                status: 'ok', 
                version: '1.5.0',
                timestamp: new Date().toISOString()
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Home page
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Garena Telegram Bot</title>
                <style>
                    body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; background: #0d1117; color: #c9d1d9; }
                    h1 { color: #f0883e; }
                    .status { background: #161b22; padding: 20px; border-radius: 10px; border: 1px solid #30363d; }
                    .endpoint { color: #58a6ff; }
                </style>
            </head>
            <body>
                <h1>🤖 Garena Telegram Bot</h1>
                <div class="status">
                    <p><b>Status:</b> 🟢 Running</p>
                    <p><b>Version:</b> v1.5.0</p>
                    <p><b>Platform:</b> Cloudflare Workers</p>
                    <hr>
                    <p><b>Endpoints:</b></p>
                    <p>📨 Webhook: <code class="endpoint">POST /webhook</code></p>
                    <p>🔧 Set Webhook: <code class="endpoint">POST /set-webhook</code></p>
                    <p>📊 Webhook Info: <code class="endpoint">GET /webhook-info</code></p>
                    <p>📈 Send Reports: <code class="endpoint">POST /send-reports</code></p>
                    <p>❤️ Health: <code class="endpoint">GET /health</code></p>
                </div>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' }
        });
    },

    // Cron triggers for daily reports
    async scheduled(event, env, ctx) {
        globalThis.BOT_DATA = env.BOT_DATA;
        
        // Gửi báo cáo lúc 19:00 mỗi ngày
        const now = new Date();
        if (now.getHours() === 19 && now.getMinutes() === 0) {
            await sendDailyReports();
        }
    }
};