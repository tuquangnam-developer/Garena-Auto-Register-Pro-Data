markdown
# 🎮 Garena Account Manager Pro v1.5.0

## 📌 Giới thiệu
Ứng dụng quản lý tài khoản Garena với tích hợp Gemini AI và Telegram Bot.

## ✨ Tính năng

### 📊 Quản lý tài khoản
- CRUD tài khoản Garena
- Import/Export CSV, TXT
- Lọc theo status, ngày tạo
- Batch operations (xóa, khóa, mở khóa, copy)

### 🤖 Gemini AI
- 12+ models có thể chọn
- Chat tự do với AI
- Phân tích tài khoản
- Hỗ trợ game

### 📨 Telegram Bot
- Báo cáo hàng ngày lúc 19:00
- Quản lý tài khoản qua Telegram
- Xóa toàn bộ data có xác nhận

### 🔐 Bảo mật
- Firestore Security Rules
- Giới hạn giờ truy cập
- Admin truy cập mọi lúc

## 📁 Cấu trúc
├── index.html
├── css/
│ └── style.css
├── js/
│ ├── app.js
│ ├── config.js
│ ├── firebase.js
│ ├── gemini.js
│ ├── telegram.js
│ └── main.js
└── README.md

text

## 🚀 Cài đặt

1. Clone repository
2. Mở `index.html` trong trình duyệt
3. Đăng nhập bằng tài khoản Firebase

## 📋 Lệnh Telegram

- `/start` - Bắt đầu
- `/help` - Hướng dẫn
- `/stats` - Thống kê
- `/list` - Danh sách
- `/add` - Thêm tài khoản
- `/delete` - Xóa tài khoản
- `/delete_all_data` - Xóa toàn bộ
- `/export` - Xuất file
- `/chat` - Chat với Gemini
- `/model` - Đổi model
- `/models` - Danh sách model
- `/reset` - Reset lịch sử

## 👤 Tác giả
@tuquangnam

## 📄 License
MIT