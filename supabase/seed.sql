-- Optional production seed data for ThanConnect Ebook Library
-- Run after supabase/schema.sql if you want starter books.
-- Replace cover_url and flipbook_url with your real assets before production launch.

insert into public.books (title, author, description, category, language, pages, cover_url, flipbook_url, is_active)
values
  ('AI for Education', 'ThanConnect Research Team', 'แนวคิดและตัวอย่างการใช้ AI เพื่อออกแบบการเรียนรู้ยุคใหม่', 'Technology', 'th', 120, null, '/sample-books/ai-for-education'),
  ('Digital Library Playbook', 'Library Innovation Unit', 'คู่มือออกแบบคลังหนังสือดิจิทัลและประสบการณ์ผู้อ่าน', 'Library', 'th', 96, null, '/sample-books/digital-library-playbook'),
  ('Learning Design Toolkit', 'TEG Learning Lab', 'เครื่องมือสำหรับออกแบบบทเรียน กิจกรรม และการประเมินผล', 'Education', 'th', 144, null, '/sample-books/learning-design-toolkit')
on conflict do nothing;
