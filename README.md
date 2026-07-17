# minibot-main — Telegram Mini App (CTV & Admin)

## URL GitHub Pages (sau khi bật Pages)

```
https://xuanson501123.github.io/324325443545425qcxzxczxcq234/minibot-main/
```

## Cách tích hợp vào main.py

### 1. Bật GitHub Pages
- Vào repo → **Settings** → **Pages**
- Source: **Deploy from a branch** → branch `main`, folder `/` (root)
- Save → đợi ~1 phút → URL trên sẽ hoạt động

### 2. Thêm biến môi trường `.env`
```env
MINIAPP_URL=https://xuanson501123.github.io/324325443545425qcxzxczxcq234/minibot-main/
```

### 3. Thêm nút mở Mini App trong main.py

Trong hàm `_show_start_menu` (hoặc `start`), thêm nút **Web App**:

```python
from telegram import WebAppInfo

MINIAPP_URL = os.getenv("MINIAPP_URL", "")
MINIAPP_API = os.getenv("MINIAPP_API", "")  # URL tunnel ngrok/cloudflare trỏ vào port WEBHOOK_PORT

def miniapp_url_for(user_id):
    role = "admin" if is_authorized(user_id) else "ctv"
    url  = MINIAPP_URL
    if MINIAPP_API:
        url += f"?api={MINIAPP_API}&s=role:{role}"
    return url

# Thêm vào reply_keyboard của admin/ctv:
KeyboardButton("☰ Mini App", web_app=WebAppInfo(url=miniapp_url_for(user_id)))
```

### 4. Expose API ra internet

Bot cần tunnel để Mini App gọi được `/api/*`:

**Cloudflare Tunnel (miễn phí, khuyên dùng):**
```bash
cloudflared tunnel --url http://localhost:8080
# copy URL dạng https://xxx.trycloudflare.com
# set MINIAPP_API=https://xxx.trycloudflare.com trong .env
```

**Ngrok:**
```bash
ngrok http 8080
# copy URL https://xxx.ngrok.io
```

### 5. Kiểm tra

Mở URL này trong trình duyệt để test giao diện:
```
https://xuanson501123.github.io/324325443545425qcxzxczxcq234/minibot-main/
```

Để test đầy đủ (có initData), mở **trong Telegram** qua nút bàn phím.

---

## API Endpoints (main.py port 8080)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/health` | Kiểm tra bot đang chạy |
| GET | `/api/poll?after=N&initData=...` | Lấy tin nhắn mới |
| POST | `/api/cmd` | Gửi lệnh (xem bên dưới) |

**Các lệnh POST `/api/cmd`:**

| type | Mô tả | Quyền |
|------|-------|-------|
| `userinfo` | Lấy thông tin user, số dư, giá | Tất cả |
| `vip1` | Duyệt Vip1 (trừ tiền CTV) | Admin/CTV |
| `vip2` | Duyệt Vip2 | Admin/CTV |
| `delete` | Xóa UDID | Admin/CTV |
| `replace` | Thay UDID cũ → mới | Admin/CTV |
| `nangvip` | Nâng Vip1 → Vip2 | Admin/CTV |
| `thongke` | Thống kê UDID | Admin |
| `addctv` | Thêm CTV | Admin |
| `removectv` | Xóa CTV | Admin |
| `nap_ctv` | Nạp tiền cho CTV | Admin |
| `broadcast` | Gửi thông báo tất cả CTV | Admin |
| `setprice` | Đặt giá vip1/vip2 | Admin |
