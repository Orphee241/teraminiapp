# Security configuration and deployment notes

## Admin password migration

Production no longer accepts `TERAMINI_ADMIN_PASSWORD`. Before deploying this revision, generate a scrypt hash in a trusted interactive terminal:

```sh
node scripts/hash-admin-password.mjs
```

Copy the single `scrypt$...` output into Dokploy as `TERAMINI_ADMIN_PASSWORD_HASH` (store it as a literal value; do not include shell quotes). Keep `TERAMINI_ADMIN_SESSION_SECRET` configured independently. The old plaintext variable must be removed after successful Admin login verification.

A missing/invalid hash intentionally disables Admin password login in production. Do not deploy until the hashed value is set and the Admin login has been verified in a safe test window.

## Public origin

Set `PUBLIC_APP_ORIGIN=https://app.terainterface.com` to the canonical public origin. Production falls back to this known origin if the variable is omitted; do not rely on reverse-proxy `X-Forwarded-*` headers for CSRF validation.

## Service URLs and document downloads

Service base URLs must be absolute HTTPS URLs without credentials, query, or fragment. Set `DOCUMENT_DOWNLOAD_ALLOWED_HOSTS` to a comma-separated list of the legitimate object-storage hostnames if presigned downloads use a different host from `INVOICE_API_URL`.

## Dependency posture

The production dependency audit currently reports zero vulnerabilities. The development/build dependency audit still reports five high-severity advisories through `picomatch` in the Vite/Vitest toolchain. The current npm registry reports `picomatch@4.0.7` as latest while the advisory marks versions through 4.0.7 affected; do not suppress or force an untested version. Re-run `npm audit` regularly and update this chain as soon as a fixed release is published.

## Deployment gate

After setting the hash and allowed storage hostnames in Dokploy, deploy the exact reviewed commit. Verify the active revision, Admin login, Telegram Mini App rendering (including Telegram Web), document create/update, payment initiation/status, and PDF download before calling the security remediation live. A local build is not production verification.
