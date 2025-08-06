# ✅ Authentication Test Checklist

## 🎯 Sau khi sửa lỗi code

### Lỗi đã sửa:
- ✅ Fixed import errors từ `useAuthStore` → `authStore` 
- ✅ Fixed displayName undefined issues
- ✅ Removed unused fetchUserProfile variable
- ✅ Development server đã chạy thành công

---

## 🧪 Testing Steps

### 1. **Test Email/Password Authentication**

#### Đăng ký mới:
- [ ] Vào `/register` hoặc click "Sign Up"
- [ ] Nhập email mới (vd: `test123@example.com`)
- [ ] Nhập username (vd: `testuser123`)
- [ ] Nhập password (ít nhất 6 ký tự)
- [ ] Click "Sign Up"
- [ ] **Expected**: Thành công và redirect về trang chủ

#### Đăng nhập:
- [ ] Vào `/login` hoặc click "Log In"
- [ ] Nhập email đã đăng ký
- [ ] Nhập password
- [ ] Click "Log In"
- [ ] **Expected**: Thành công và thấy user menu ở header

### 2. **Test Google Authentication**

#### Đăng nhập Google:
- [ ] Click "Continue with Google"
- [ ] **Expected**: Popup Google login xuất hiện
- [ ] Chọn Google account
- [ ] **Expected**: Thành công và redirect về trang chủ

⚠️ **Nếu Google Auth lỗi**:
- Kiểm tra popup blocker
- Kiểm tra authorized domains trong Firebase Console

### 3. **Test Authentication States**

#### Khi đã đăng nhập:
- [ ] Thấy user avatar/username ở header
- [ ] Click user menu → thấy "Profile", "Settings", "Log Out"
- [ ] Click "Create" → có thể tạo post
- [ ] Vào `/submit` → có thể tạo post

#### Test đăng xuất:
- [ ] Click user menu → "Log Out"
- [ ] **Expected**: Về trang chủ, header thay đổi thành "Log In"/"Sign Up"

### 4. **Test Protected Routes**

#### Khi chưa đăng nhập:
- [ ] Vào `/submit` → redirect về `/login`
- [ ] Vào `/profile` → redirect về `/login`
- [ ] Vào protected route khác → redirect về `/login`

---

## 🐛 Common Issues & Solutions

### Issue 1: "Popup blocked" (Google Auth)
**Solution**: 
- Disable popup blocker cho localhost
- Try different browser

### Issue 2: "Domain not authorized"
**Solution**: 
- Vào Firebase Console → Authentication → Settings
- Add `localhost` vào authorized domains

### Issue 3: Email/Password không hoạt động
**Solution**:
- Kiểm tra Firebase Console → Authentication → Sign-in method
- Đảm bảo Email/Password provider enabled

### Issue 4: Network errors
**Solution**:
- Kiểm tra internet connection
- Kiểm tra firewall settings

---

## 🔧 Debug Tools

### Browser Console:
1. F12 → Console tab
2. Xem error messages khi login
3. Common error codes:
   - `auth/user-not-found`
   - `auth/wrong-password`
   - `auth/popup-blocked`
   - `auth/unauthorized-domain`

### Test File:
1. Mở `src/test-auth.html` trong browser
2. Test từng function riêng biệt
3. Isolate vấn đề Firebase vs App

---

## ✅ Success Criteria

Authentication được coi là **HOẠT ĐỘNG** khi:

- [ ] Có thể đăng ký email/password
- [ ] Có thể đăng nhập email/password  
- [ ] Có thể đăng nhập Google (hoặc hiểu tại sao không được)
- [ ] User state được persist qua page refresh
- [ ] Protected routes hoạt động đúng
- [ ] Đăng xuất hoạt động đúng

---

## 📞 Next Steps

Nếu authentication hoạt động:
- ✅ Test tạo posts
- ✅ Test join communities  
- ✅ Test user profile

Nếu vẫn có lỗi:
- 📋 Copy error message từ console
- 📸 Screenshot của Firebase Console settings
- 🔄 Test với browser khác 