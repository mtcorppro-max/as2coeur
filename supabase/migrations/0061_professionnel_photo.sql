-- Photo de profil du professionnel (URL publique dans le bucket "avatars").
alter table professionnel add column if not exists photo_url text;
