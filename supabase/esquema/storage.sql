-- Buckets y políticas de storage copiados de Forge (las fotos se sirven con getPublicUrl)
insert into storage.buckets (id, name, public) values ('avatares', 'avatares', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('fotos-progreso', 'fotos-progreso', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', true) on conflict (id) do nothing;
CREATE POLICY "avatares_public" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'avatares'::"text"));
CREATE POLICY "avatares_update" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'avatares'::"text") AND ("auth"."uid"() IS NOT NULL)));
CREATE POLICY "avatares_upload" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'avatares'::"text") AND ("auth"."uid"() IS NOT NULL)));
CREATE POLICY "cliente puede subir fotos" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'fotos-progreso'::"text") AND (("storage"."foldername"("name"))[1] IN ( SELECT ("clientes"."id")::"text" AS "id"
   FROM "public"."clientes"
  WHERE ("clientes"."auth_user_id" = "auth"."uid"())))));
CREATE POLICY "cliente_borra_fotos" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'fotos-progreso'::"text") AND ("auth"."role"() = 'authenticated'::"text")));
CREATE POLICY "cliente_sube_fotos" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'fotos-progreso'::"text") AND ("auth"."role"() = 'authenticated'::"text")));
CREATE POLICY "fotos publicas" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'fotos-progreso'::"text"));
CREATE POLICY "fotos_publicas_select" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'fotos-progreso'::"text"));
CREATE POLICY "photos_delete" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'progress-photos'::"text") AND ("auth"."uid"() IS NOT NULL)));
CREATE POLICY "photos_public_select" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'progress-photos'::"text"));
CREATE POLICY "photos_upload" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'progress-photos'::"text") AND ("auth"."uid"() IS NOT NULL)));
CREATE POLICY "progress_photos_public_select" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'progress-photos'::"text"));
