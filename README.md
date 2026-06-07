# ThanConnect Ebook Library

เว็บคลังหนังสือดิจิทัลสำหรับอ่าน ยืม คืน และบันทึก Bookmark หนังสือ พัฒนาด้วย React, Vite และ Supabase

## Features

- Demo mode ใช้งานได้ทันทีเมื่อยังไม่ได้ตั้งค่า Supabase
- Production mode เชื่อม Supabase Auth และฐานข้อมูลจริง
- ค้นหาหนังสือจากชื่อ ผู้แต่ง หรือหมวดหมู่
- กรองหนังสือตามหมวดหมู่
- ยืม/คืนหนังสือ และเปิดอ่านจาก `flipbook_url`
- Bookmark หนังสือหน้าแรก
- Profile page แสดงจำนวนหนังสือและ Bookmark
- Admin dashboard สำหรับ role `admin` หรือ `librarian`

## Tech Stack

- React
- Vite
- Supabase
- lucide-react

## Run locally

```bash
npm install
npm run dev
```

เปิดเว็บที่ URL ที่ Vite แสดงใน terminal

## Environment variables

คัดลอกไฟล์ตัวอย่างแล้วใส่ค่าจริงจาก Supabase project

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

ถ้าไม่ตั้งค่า env ระบบจะเข้า Demo Mode โดยอัตโนมัติ

## Supabase tables ที่โค้ดใช้งาน

โปรเจกต์เรียกใช้งาน table หลักดังนี้

- `profiles`
- `books`
- `user_library`
- `bookmarks`
- `reader_events`

คอลัมน์สำคัญของ `books` ได้แก่ `title`, `author`, `description`, `category`, `pages`, `cover_url`, `flipbook_url`, `is_active` และ `created_by`

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Development notes

- ไฟล์หลักของแอปอยู่ที่ `src/App.jsx`
- Supabase client อยู่ที่ `src/lib/supabase.js`
- Service layer อยู่ใน `src/services/`
- หน้า `production-status.html` ใช้เป็น fallback สำหรับลิงก์อ่านหนังสือใน Demo Mode
