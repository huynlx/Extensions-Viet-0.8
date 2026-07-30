# NhatTruyen — Paperback 0.8 source

Nguồn đọc truyện cho **Paperback 0.8**, viết theo pattern chung của theme NetTruyen/NhatTruyen clone. Có **settings đổi tên miền** (site loại này hay đổi domain).

## Cấu trúc
```
paperback-sources/
├── package.json
├── tsconfig.json
└── src/
    └── NhatTruyen/                # mỗi thư mục con trong src/ = 1 extension
        ├── NhatTruyen.ts          # source class chính + interceptor (Referer)
        ├── NhatTruyenParser.ts    # toàn bộ selector HTML — CHỈNH Ở ĐÂY nếu lệch
        ├── NhatTruyenSettings.ts  # form đổi domain
        └── includes/
            └── icon.png           # bạn tự thêm icon 256x256
```

> `paperback-cli bundle` mặc định quét thư mục `src/` — mỗi folder con là một extension.

## Build & chạy thử
```bash
cd paperback-sources
npm install
npm run serve      # chạy local, add repo http://<ip>:27015 vào Paperback
# hoặc
npm run bundle     # xuất ra ./bundles để host lên GitHub Pages
```

## Điều gần như CHẮC CHẮN phải chỉnh sau lần chạy đầu
Vì mình viết theo pattern chung (chưa soi được HTML thật của `nhattruyenqq.us`), các chỗ dễ lệch nhất:

1. **URL search** — `NhatTruyen.ts` → `getSearchResults`. Mình dùng `/tim-truyen?keyword=`. Site của bạn có thể là `/tim-kiem?q=` hoặc `/search?...`. Mở site search thử 1 từ, xem URL trên thanh địa chỉ.

2. **Selector ảnh trang truyện** — `NhatTruyenParser.ts` → `parseChapterDetails`. Ảnh nằm ở `data-original`/`data-src`/`src` tùy site (lazyload). Đây là chỗ **quan trọng nhất** — sai là không hiện ảnh.

3. **Selector danh sách chương** — `parseChapters`, class `.list-chapter li.row`.

4. **URL trang chủ HOT / mới cập nhật** — `getHomePageSections`.

## Cách debug nhanh
- Trong Paperback, nếu 1 truyện load được detail nhưng **trắng ảnh** → sửa `parseChapterDetails`.
- Nếu **search trắng** → sai URL search hoặc selector list.
- Nếu **mọi thứ lỗi HTTP** → tên miền đổi rồi, vào Settings đổi domain.

Gửi mình View Source (Ctrl+U) của 1 trang đọc chương + 1 trang search, mình khớp selector chính xác cho.
