# Safwah AI proxy — opt-in, authenticated

This Edge Function is a separate endpoint named `safwah-advisor` on the existing Safwah Supabase project. It does not change the `finance-access` function, company records or customer data.

**Before use:**
- Add `GEMINI_API_KEY` as an encrypted secret in Supabase Edge Functions settings. Never commit the key.
- Optional `GEMINI_MODEL` defaults to `gemini-3.5-flash`. Confirm access and prices with the provider.
- Add other verified users to `SAFWAH_AI_ALLOWED_EMAILS` (comma-separated). The platform's GitHub owner email is pre-authorized *only after verified Supabase Auth login*.
- Ensure email OTP and redirect URL `https://safwah-investment.github.io/partnerships/` are configured in Supabase Auth.
- Test authenticated end to end and configure durable global rate limiting/billing alerts before broad rollout. In-memory 8/hour safeguard is per instance, not a billing limit.

`verify_jwt = true` and `@supabase/server` user auth are enabled. The browser sends only an anonymized portfolio/partnership summary after the user selects cloud mode and checks consent. Local advisory remains fully functional without these settings.

The system does NOT support shared client-file storage yet; do not send names, IDs, contracts or private links to the model.
