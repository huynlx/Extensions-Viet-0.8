# 🌏 Extensions Việt 0.8

<p align="center">
  <img src="https://img.shields.io/badge/Paperback-0.8-blueviolet?style=for-the-badge" alt="Paperback 0.8" />
  <img src="https://img.shields.io/badge/Vietnamese-Source-success?style=for-the-badge" alt="Vietnamese Source" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/Status-Active-22c55e?style=for-the-badge" alt="Active" />
</p>

<p align="center">
  <strong>Source extensions đọc truyện tiếng Việt cho Paperback 0.8</strong>
</p>

---

## ✨ Tổng quan

Dự án này tập hợp nhiều source extension cho nền tảng Paperback, giúp người dùng truy cập và đọc truyện từ các website tiếng Việt phổ biến trong một giao diện thống nhất.

Mỗi source được xây dựng riêng với parser, homepage, tìm kiếm, chi tiết truyện và chapter tương ứng. Mục tiêu là mang đến trải nghiệm đọc nhanh, mượt, thân thiện và dễ mở rộng cho cộng đồng người dùng Việt Nam.

---

## 🚀 Tính năng chính

- Hỗ trợ nhiều nguồn truyện tiếng Việt khác nhau
- Tích hợp tìm kiếm và danh sách truyện theo từng nguồn
- Cập nhật homepage và section nổi bật
- Hỗ trợ hiển thị chapter, metadata và ảnh bìa
- Dễ mở rộng thêm source mới
- Tương thích với Paperback 0.8
- Hỗ trợ môi trường local và GitHub Pages riêng biệt

---

## 📚 Các source đang hỗ trợ

| Source     | Website          | Trạng thái         |
| ---------- | ---------------- | ------------------ |
| BuonDua    | `buondua.com`    | ✅ Hoạt động       |
| CuuTruyen  | `cuutruyen.moe`  | ✅ Hoạt động       |
| FoxTruyen  | `foxtruyen2.com` | ✅ Hoạt động       |
| HentaiCube | `hentaicube.xyz` | ✅ Hoạt động       |
| HentaiVN   | `hentaivn.com`   | ✅ Hoạt động       |
| HentaiVNX  | `hentaivnx.com`  | ✅ Hoạt động       |
| HotGirl    | `hotgirl.biz`    | ✅ Hoạt động       |
| MauLon     | `maulon.com`     | ✅ Hoạt động       |
| MiMiHentai | `mimihentai.com` | ✅ Hoạt động       |
| Misskon    | `misskon.com`    | ✅ Hoạt động       |
| NetTruyen  | `nettruyen.*`    | ⚠️ Có thể giới hạn |
| NhatTruyen | `nhattruyen.*`   | ⚠️ Có thể giới hạn |
| NudeBird   | `nudebird.com`   | ✅ Hoạt động       |
| SayHentai  | `sayhentai.com`  | ✅ Hoạt động       |
| TComic     | `tcomic.com`     | ✅ Hoạt động       |
| TruyenQQ   | `truyenqq.com`   | ✅ Hoạt động       |
| ViHentai   | `vihentai.com`   | ✅ Hoạt động       |
| VinaHentai | `vinahentai.com` | ✅ Hoạt động       |

> Một số source có thể phụ thuộc vào thay đổi bên website gốc, do đó cần theo dõi cập nhật thường xuyên.

---

## ⚡ Bắt đầu nhanh

### 1) Clone project

```bash
git clone https://github.com/huynlx/Extensions-Viet-0.8.git
cd Extensions-Viet-0.8
```

### 2) Cài đặt dependencies

```bash
npm install
```

### 3) Chạy môi trường local

```bash
npm run serve
```

### 4) Build bundle

```bash
npm run bundle
```

---

## 🧩 Script có sẵn

| Lệnh                | Mô tả                              |
| ------------------- | ---------------------------------- |
| `npm run base-url`  | Cập nhật `baseURL` theo môi trường |
| `npm run serve`     | Chạy local dev server              |
| `npm run bundle`    | Build source bundle cho Paperback  |
| `npm run test`      | Chạy kiểm thử                      |
| `npm run predeploy` | Chuẩn bị build cho GitHub Pages    |
| `npm run deploy`    | Deploy lên GitHub Pages            |

---

## 🌐 Môi trường: local và GitHub Pages

Project hỗ trợ hai mode environment riêng biệt:

- `.env` → dùng cho GitHub Pages
- `.env.local` → dùng cho local development

Ví dụ:

```env
# .env
GH_PAGES=true
BASE_URL=https://huynlx.github.io/Extensions-Viet-0.8/
```

```env
# .env.local
GH_PAGES=false
BASE_URL=http://192.168.1.3:8080/
```

Script cập nhật URL sẽ tự động chọn đúng base URL theo môi trường đang chạy.

---

## 🗂️ Cấu trúc dự án

```text
.
├── bundles/                 # Output build và versioning
├── common/                 # Shared utils và helper
├── draft/                  # Source đang thử nghiệm / draft
├── scripts/                # Script hỗ trợ build và base URL
├── src/                    # Source extensions chính
│   ├── BuonDua/
│   ├── CuuTruyen/
│   ├── FoxTruyen/
│   ├── HentaiCube/
│   ├── ...
│   └── VinaHentai/
├── tests/                  # Unit test và kiểm thử môi trường
├── .env                    # Env production / GitHub Pages
├── .env.local              # Env local development
├── package.json            # Cấu hình project và scripts
├── jest.config.js          # Cấu hình Jest
├── tsconfig.json           # TypeScript config
├── LICENSE                 # Giấy phép
├── README.md               # Tài liệu dự án
└── mockup.html             # Mockup giao diện mẫu
```

---

## 🤝 Đóng góp

Chúng tôi luôn hoan nghênh sự đóng góp từ cộng đồng, đặc biệt là:

- thêm source mới
- sửa lỗi parser / homepage
- tối ưu performance
- cải thiện UX và trải nghiệm người dùng
- viết test cho các nguồn mới

### Quy trình đóng góp

1. Fork repository
2. Tạo branch mới cho feature hoặc fix
3. Commit thay đổi rõ ràng
4. Push và mở Pull Request

---

## 📌 Ghi chú

- Dự án này tập trung vào source extension cho miền đọc truyện tiếng Việt.
- Tính ổn định của mỗi source phụ thuộc vào chính sách thay đổi của website gốc.
- Cập nhật và kiểm thử nên được thực hiện định kỳ để đảm bảo source vẫn hoạt động tốt.

---

## 📝 License

Dự án được phân phối theo giấy phép [MIT](LICENSE).

---

<p align="center">
  <strong>Made with 💙 for the Vietnamese manga & webtoon community</strong>
</p>
