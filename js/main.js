// ============================================
// MAIN ENTRY POINT
// Garena Account Manager Pro v1.5.0
// ============================================

import App from './app.js';

// Khởi tạo ứng dụng
const app = new App();

// Export ra global để sử dụng trong console (debug)
window.app = app;

console.log('🚀 Application initialized!');
console.log(`📦 ${app.constructor.name} v1.5.0`);