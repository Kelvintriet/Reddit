# Hướng Dẫn Khắc Phục Lỗi Authentication

## Vấn Đề Hiện Tại
Bạn không thể đăng nhập bằng Google và Email/Password trong ứng dụng Reddit clone.

## Đã Sửa Trong Session Này

### 1. **Sửa lỗi function names không khớp**
- Đã thay đổi `login`/`loginWithGoogle` thành `signIn`/`signInWithGoogle` trong tất cả components
- Đã thêm import `useLocation` bị thiếu
- Đã xóa file `useAuthStore.ts` cũ chứa mock data

### 2. **Cải thiện error handling**
- Đã thêm thông báo lỗi tiếng Việt chi tiết cho các trường hợp:
  - Email không tồn tại
  - Mật khẩu sai
  - Popup bị chặn
  - Lỗi network
  - Và nhiều lỗi khác

### 3. **Cải thiện Google Auth configuration**
- Đã thêm scopes cho email và profile
- Đã cấu hình `prompt: 'select_account'`

## Cần Kiểm Tra Trong Firebase Console

### 1. **Authentication Settings**
1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project "xredread"
3. Vào "Authentication" > "Sign-in method"
4. Kiểm tra:
   - ✅ Email/Password provider đã enabled
   - ✅ Google provider đã enabled và cấu hình đúng

### 2. **Google OAuth Configuration**
1. Trong Google sign-in settings:
   - **Project support email**: Phải được thiết lập
   - **Authorized domains**: Thêm domain bạn đang test
     - `localhost` (cho development)
     - Domain production của bạn
   - **OAuth client ID**: Phải được tạo và cấu hình

### 3. **Firestore Rules**
Kiểm tra rules trong "Firestore Database" > "Rules":
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Cách Test Authentication

### Phương Pháp 1: Sử dụng Test File
1. Mở file `src/test-auth.html` trong browser
2. Test từng function:
   - Đăng ký email/password
   - Đăng nhập email/password  
   - Đăng nhập Google
   - Đăng xuất

### Phương Pháp 2: Chạy Development Server
```bash
npm run dev
```
Sau đó test trực tiếp trong ứng dụng.

## Các Lỗi Thường Gặp và Cách Sửa

### 1. **Google Auth Popup bị chặn**
- **Nguyên nhân**: Browser block popup
- **Giải pháp**: 
  - Cho phép popup cho domain
  - Thử disable popup blocker

### 2. **Domain không được authorize**
- **Nguyên nhân**: Domain chưa được thêm vào authorized domains
- **Giải pháp**: Thêm domain vào Firebase Console > Authentication > Settings

### 3. **Email/Password không hoạt động**
- **Nguyên nhân**: Provider chưa enabled hoặc Firestore rules
- **Giải pháp**: Enable Email/Password provider trong Firebase Console

### 4. **Network errors**
- **Nguyên nhân**: Firewall hoặc network restrictions
- **Giải pháp**: Kiểm tra internet connection và firewall

## Kiểm Tra Browser Console
Mở Developer Tools và xem Console để xem error messages chi tiết:

```javascript
// Các error codes thường gặp:
// auth/user-not-found
// auth/wrong-password  
// auth/popup-blocked
// auth/popup-closed-by-user
// auth/unauthorized-domain
// auth/network-request-failed
```

## Bước Tiếp Theo

1. **Kiểm tra Firebase Console** theo hướng dẫn trên
2. **Test bằng file test-auth.html** để isolate vấn đề
3. **Kiểm tra browser console** để xem error messages
4. **Thử trên browser khác** để loại trừ browser-specific issues

## Nếu Vẫn Gặp Lỗi

Hãy chạy lệnh sau và gửi kết quả:

```bash
npm run build
```

Và check browser console khi test authentication để xem error messages cụ thể. 