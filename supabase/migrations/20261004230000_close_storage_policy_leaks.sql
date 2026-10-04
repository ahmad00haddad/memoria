-- Storage policies are OR'ed, so these broad ones overrode the scoped ones:
--  * deposit_proofs_photographer_read: any signed-in user could read every
--    client's deposit receipt.
--  * payment_proofs_service_read: any signed-in user could read every
--    subscription payment proof.
--  * deposit_proofs_anon_upload: anyone could upload under public-tokens/
--    without a valid booking token.
-- The scoped policies ("deposit parties read", "deposit read public-token
-- proofs", "owner read own proof", "anon upload deposit proof via token")
-- and the service role still cover every path the app uses.

DROP POLICY IF EXISTS "deposit_proofs_photographer_read" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_service_read" ON storage.objects;
DROP POLICY IF EXISTS "deposit_proofs_anon_upload" ON storage.objects;
