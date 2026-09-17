-- Bucket untuk gambar Syarat & Ketentuan yang diunggah admin
-- (RULES_BUCKET di src/lib/app-data.ts, dipakai src/routes/admin.tsx).
--
-- Policy-nya sudah dibuat di 20260903075139, tapi bucket-nya sendiri dulu dibuat
-- manual lewat dashboard, jadi project Supabase baru tidak punya baris ini dan
-- upload akan gagal dengan "Bucket not found".
--
-- public = false karena kode mengaksesnya lewat createSignedUrls, bukan URL publik.
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', false)
on conflict (id) do nothing;
