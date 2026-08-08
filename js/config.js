// ============================================
// CONFIGURATION
// Garena Account Manager Pro v1.5.0
// ============================================

export const CONFIG = {
    // Firebase
    firebase: {
        apiKey: "AIzaSyCYkHYveuBZAnbZt_qZD2iWWy8BkS49dsU",
        authDomain: "garena-auto-register-pro.firebaseapp.com",
        projectId: "garena-auto-register-pro",
        storageBucket: "garena-auto-register-pro.firebasestorage.app",
        messagingSenderId: "306207796959",
        appId: "1:306207796959:web:a7037aba8234f8f357c36a"
    },

    // Telegram
    telegram: {
        botToken: "8262952652:AAGtMZ0Zq5A7Gm2z2UFEbFSDj8PjpVewmOI"
    },

    // Gemini Models
    gemini: {
        apiKey: "AQ.Ab8RN6KSVvygX6BjDogYlSE3VtsklQwfzhplwqIYjZgGJaPxAg",
        defaultModel: "gemini-2.5-flash",
        availableModels: [
            { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Cân bằng tốc độ và chất lượng" },
            { id: "gemini-flash-latest", name: "Gemini Flash Latest", description: "Phiên bản mới nhất của Flash" },
            { id: "gemini-flash-lite-latest", name: "Gemini Flash-Lite Latest", description: "Nhẹ và nhanh" },
            { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite", description: "Phiên bản Lite của 2.5" },
            { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview", description: "Preview của Gemini 3" },
            { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite Preview", description: "Preview Lite 3.1" },
            { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", description: "Lite của 3.1" },
            { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", description: "Phiên bản 3.5" },
            { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", description: "Lite của 3.5" },
            { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", description: "Phiên bản 3.6" },
            { id: "gemini-robotics-er-1.6-preview", name: "Robotics-ER 1.6 Preview", description: "Preview Robotics ER 1.6" },
            { id: "gemini-robotics-er-2-preview", name: "Robotics-ER 2 Preview", description: "Preview Robotics ER 2" }
        ]
    },

    // App Settings
    app: {
        version: "1.5.0",
        name: "Garena Account Manager Pro",
        adminEmail: "tuquangnamht2007@gmail.com",
        cacheTTL: 60000,
        pageSize: 15,
        reportHour: 19,
        reportMinute: 0
    },

    // Time slots
    timeSlots: [
        { start: 10, end: 13 },
        { start: 19, end: 21 }
    ],

    // Users (từ danh sách của bạn)
    users: [
        "hoangpho@gmail.com",
        "kieenedau@gmail.com",
        "manhcuongsteven@gmail.com",
        "mndzaicuti@gmail.com",
        "nguyenanhtuan001@gmail.com",
        "qkhanh530494@gmail.com",
        "tuanpath06170@gmail.com",
        "tuquangnamht2007@gmail.com",
        "yeahvi129058@gmail.com"
    ]
};

export default CONFIG;