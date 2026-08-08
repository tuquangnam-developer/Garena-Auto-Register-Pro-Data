// ============================================
// GEMINI AI HANDLER
// Supports multiple Gemini models
// ============================================

import CONFIG from './config.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiHandler {
    constructor(apiKey = CONFIG.gemini.apiKey) {
        this.apiKey = apiKey;
        this.currentModel = CONFIG.gemini.defaultModel;
        this.history = [];
        this.maxHistory = 100;
        this.availableModels = CONFIG.gemini.availableModels;
        this.systemPrompt = `Bạn là trợ lý ảo thông minh của Garena Account Manager Pro. 
Bạn có thể giúp người dùng:
1. Quản lý tài khoản Garena
2. Hỗ trợ các vấn đề về đăng nhập, bảo mật
3. Tư vấn về game Garena
4. Hỗ trợ kỹ thuật
5. Giải đáp thắc mắc về game và công nghệ

Hãy trả lời lịch sự, chuyên nghiệp, chi tiết và hữu ích. Nếu không biết, hãy nói thẳng.`;
    }

    /**
     * Đổi model
     */
    setModel(modelId) {
        const available = this.availableModels.map(m => m.id);
        if (!available.includes(modelId)) {
            throw new Error(`Model "${modelId}" không có sẵn.`);
        }
        this.currentModel = modelId;
        return this.currentModel;
    }

    /**
     * Lấy danh sách model
     */
    getAvailableModels() {
        return this.availableModels;
    }

    /**
     * Lấy model hiện tại
     */
    getCurrentModel() {
        return this.currentModel;
    }

    /**
     * Gửi tin nhắn đến Gemini
     */
    async sendMessage(message, context = null, options = {}) {
        try {
            if (context) {
                this.history = context;
            } else {
                this.history.push({ role: 'user', content: message });
            }

            if (this.history.length > this.maxHistory) {
                this.history = this.history.slice(-this.maxHistory);
            }

            // Xây dựng prompt
            const conversation = this.history.map(msg => 
                `${msg.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${msg.content}`
            ).join('\n');

            const fullPrompt = `${this.systemPrompt}\n\nLịch sử hội thoại:\n${conversation}\n\nTrợ lý:`;

            // Gọi API
            const url = `${GEMINI_API_URL}/models/${this.currentModel}:generateContent?key=${this.apiKey}`;
            
            const payload = {
                contents: [{
                    parts: [{ text: fullPrompt }]
                }],
                generationConfig: {
                    temperature: options.temperature || 0.7,
                    maxOutputTokens: options.maxTokens || 2048,
                    topP: options.topP || 0.9,
                    topK: options.topK || 40
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
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không thể xử lý yêu cầu này.';

            this.history.push({ role: 'assistant', content: reply });

            return {
                success: true,
                message: reply,
                model: this.currentModel,
                history: this.history
            };
        } catch (error) {
            console.error('❌ Lỗi Gemini:', error);
            return {
                success: false,
                error: error.message,
                model: this.currentModel
            };
        }
    }

    /**
     * Chat với context
     */
    async chat(message, model = null) {
        if (model) {
            this.setModel(model);
        }
        return await this.sendMessage(message);
    }

    /**
     * Reset lịch sử
     */
    resetHistory() {
        this.history = [];
        return { success: true, message: 'Đã reset lịch sử' };
    }

    /**
     * Lấy lịch sử
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * Set system prompt
     */
    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
    }

    /**
     * Phân tích tài khoản
     */
    async analyzeAccounts(accounts) {
        const total = accounts.length;
        const success = accounts.filter(a => a.status === 'success').length;
        const pending = accounts.filter(a => a.status === 'pending').length;
        const locked = accounts.filter(a => a.status === 'locked').length;
        const failed = accounts.filter(a => a.status === 'failed').length;

        const prompt = `Phân tích tình trạng tài khoản Garena:
- Tổng: ${total}
- Thành công: ${success}
- Pending: ${pending}
- Đã khóa: ${locked}
- Thất bại: ${failed}

Hãy đưa ra nhận xét chi tiết và đề xuất cải thiện.`;

        return await this.sendMessage(prompt);
    }

    /**
     * Hỗ trợ game
     */
    async gameHelp(gameName, question) {
        const prompt = `Người dùng cần hỗ trợ về game "${gameName}": ${question}
        
Hãy đưa ra hướng dẫn chi tiết, mẹo chơi và giải đáp thắc mắc.`;
        return await this.sendMessage(prompt);
    }

    /**
     * Giải đáp thắc mắc chung
     */
    async generalHelp(question) {
        const prompt = `Người dùng hỏi: "${question}"
        
Hãy giải đáp một cách chi tiết, dễ hiểu và hữu ích.`;
        return await this.sendMessage(prompt);
    }
}

export default GeminiHandler;