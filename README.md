# Dragon Delivery App

Dragon Delivery App is a web-based logistics management tool built with Firebase. It helps manage shipping, packing and delivery tasks.

## Features

- Firebase Authentication for user login
- Role-based interfaces for Admin, Operator and Supervisor
- Order creation and QR code scanning using html5-qrcode
- Dashboard with statistics rendered via Chart.js
- Tracking and packing pages for daily operations

## Getting Started

1. Copy `js/config.example.js` to `js/config.js`.
2. Provide your Firebase project credentials in `js/config.js`.
3. Use `firebase serve` to run a local development server.

## How to Use

### English
1. Log in with your account.
2. Create and manage orders via the dashboard.
3. Scan QR codes on the tracking page when packing parcels.
4. Monitor delivery status and reports in the admin panel.

### คู่มือภาษาไทยแบบละเอียด
1. เข้าสู่ระบบผ่านหน้า **Login** ด้วยบัญชี Firebase ของคุณ
2. ไปที่เมนู **สร้างคำสั่งซื้อ** เพื่อกรอกข้อมูลสินค้าและที่อยู่จัดส่ง
3. เปิดหน้า **จัดเตรียมพัสดุ** แล้วสแกน QR Code บนกล่องเมื่อเริ่มแพ็กสินค้า
4. ตรวจสอบรายการในหน้า **ติดตามพัสดุ** และอัปเดตสถานะของแต่ละชิ้น
5. เมื่อจัดส่งแล้วให้บันทึกเลขพัสดุและอัปเดตสถานะการจัดส่ง
6. เปิดหน้า **แดชบอร์ด** เพื่อดูสถิติและรายงานการจัดส่ง

## Deployment

1. Install the Firebase CLI: `npm install -g firebase-tools`
2. Sign in to Firebase with `firebase login`
3. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

After deployment your site will be available on your Firebase Hosting URL.

## Development Notes

All source code lives in plain HTML, CSS and JavaScript under the `js/` directory. Modules are used throughout so a modern browser is required.

## License

This repository is released under the terms of the MIT License. See [LICENSE](LICENSE) for details.
