# Social Provider Integrations

## Architecture

Use `SocialProvider` adapters in `packages/social`. LinkedIn, X, Facebook, and Instagram are registered. Memory is the test/default adapter. Official API adapters run when `SOCIAL_ADAPTER=official`. Official OAuth install and token refresh need `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`, `X_CLIENT_ID` / `X_CLIENT_SECRET`, or `META_APP_ID` / `META_APP_SECRET`. The Control callback is `${CONTROL_ORIGIN}/social/oauth/callback`, overridable with `SOCIAL_OAUTH_REDIRECT_URI`. Official LinkedIn, X, and Facebook adapters upload approved C0 image bytes. Official Instagram Graph publish requires media plus a short-lived signed fetch URL and fails closed for text-only. `SOCIAL_PUBLISHING_PAUSED` disables outbound publish but still allows validate, refresh, OAuth, and metrics through the inner adapter.

## Initial priority

Implement only platforms required by active clients. Do not build every network in advance.

## Required adapter capabilities

Connection validation, publish, scheduled publish if supported, metrics, token refresh, normalized failures.

## Security

OAuth tokens encrypted at rest and never given to the model or browser. Official install uses PKCE S256 and an encrypted pending-state blob. Authorization codes are exchanged on the server. Facebook and Instagram may require a Page pick; the pending user token stays encrypted and Page tokens never enter Control or API JSON. Paste-token upsert remains a fallback.

## Official app setup and tokens

Operators should use Control **Connect with official OAuth**. Do not paste production tokens into the browser unless official OAuth cannot run. Register each provider app with redirect URI `${CONTROL_ORIGIN}/social/oauth/callback` (or `SOCIAL_OAUTH_REDIRECT_URI`), then set the matching env vars and `SOCIAL_ADAPTER=official`.

### LinkedIn

1. Create an app at [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps).
2. Add the **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn** products.
3. Auth → authorized redirect URL: `http://localhost:5183/social/oauth/callback` locally, or the production Control callback.
4. Copy **Client ID** and **Client Secret** into `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`.
5. Vector scopes: `openid profile w_member_social offline_access`.
6. In Control, connect LinkedIn. Vector stores the member access token as `urn:li:person:{sub}`.

### X

1. Create a project/app at [X Developer Portal](https://developer.x.com/).
2. Enable **User authentication settings** with OAuth 2.0. Type: web app. Callback: the same Control `/social/oauth/callback`.
3. Copy **Client ID** and **Client Secret** into `X_CLIENT_ID` / `X_CLIENT_SECRET`.
4. Vector uses PKCE S256. Scopes: `tweet.read tweet.write users.read offline.access`.
5. In Control, connect X. Vector stores the user token and `/2/users/me` account id.

### Facebook

1. Create an app at [Meta for Developers](https://developers.facebook.com/apps/). Type: Business.
2. Add **Facebook Login** and **pages_show_list**, **pages_read_engagement**, **pages_manage_posts**, **business_management**.
3. Facebook Login → Valid OAuth Redirect URIs: the Control callback.
4. Copy **App ID** and **App Secret** into `META_APP_ID` / `META_APP_SECRET`.
5. In Control, connect Facebook. If you admin more than one Page, pick the Page. Vector stores that **Page** token, not the user token.

### Instagram

1. Use the same Meta app. The Instagram account must be a **professional** account linked to a Facebook Page.
2. Add Instagram permissions: `instagram_basic`, `instagram_content_publish`, plus the Page scopes above.
3. Same App ID / App Secret and Control callback as Facebook.
4. In Control, connect Instagram. Vector lists only Pages that already have an Instagram professional account. It stores that Page token and the IG user id.
5. Instagram Graph publish needs an approved C0 image. Text-only official publish fails closed.

### Advanced paste fallback

Use **Save connection** only for lab tokens. Required fields: platform, handle, display name, external account id (LinkedIn person URN, X user id, Facebook Page id, Instagram user id), access token, optional refresh token. Tokens are encrypted immediately and are never shown again.

## Lifecycle

Idea → Draft → Reviewed → Approved → Scheduled → Publishing → Published or Failed → Archived.

## Guardrails

Posting frequency limits, similarity checks, asset validation, client content policy, official APIs only.

Social receives already approved, channel-ready creative derivatives from the Creative Engine (`docs/29`). It must not become an independent image-generation system. Phase 5 may publish text-only or operator-uploaded approved assets until later Creative slices exist. C0 general asset storage is required before Social stores media blobs.

Social performance should support post → click → lead → qualified → sale where data exists (`docs/30`). Engagement is not automatically business success. Phase 5 Slice 2 persists social → lead when a lead is captured with `utm_medium=social` and `utm_content=post:{social_post_id}` on the existing `lead_sources` / attribution path. That is not the publish exit.
