# Teraminiapp modular monolith

Teraminiapp remains one Next.js application, one Git repository, and one deployed unit. Its business capabilities are separated by code boundaries rather than by network services.

## Module boundaries

- `src/modules/documents/` — document proxy and document-specific application rules.
- `src/modules/conversations/` — Michelle conversations and message persistence.
- `src/modules/profiles/` — profile, presence, and branding persistence.
- `src/modules/administration/` — admin directory, admin sessions, and dashboard persistence.
- `src/modules/media/` — uploads and attachment persistence.
- `src/modules/shared/` — deliberately cross-cutting infrastructure such as persistent rate limiting.

The existing `src/lib/storage.ts` is the storage kernel during this migration. API routes must access it only through the adapter owned by the relevant module. This lets us move queries into module-owned infrastructure incrementally without changing public API contracts or database tables.

## Dependency rules

1. API routes may depend on module server adapters and shared policy utilities.
2. A module may depend on its own adapter and approved shared infrastructure, not another module's storage implementation.
3. `src/lib/storage.ts` is an infrastructure detail; new route imports from it are forbidden.
4. Keep the current Turso schema and deployment topology unchanged during boundary extraction.
5. Every extraction must preserve route status codes, ownership checks, signed downstream requests, and existing tests.

## Migration sequence and current state

1. ✅ Establish adapters and import-boundary tests.
2. ✅ Move conversation queries into `modules/conversations/server/infrastructure.ts`.
3. ✅ Move administration queries into `modules/administration/server/infrastructure.ts`.
4. ✅ Move profile read/update queries into `modules/profiles/server/infrastructure.ts`.
5. ✅ Move media uploads into `modules/media/server/infrastructure.ts`.
6. ✅ Move persistent rate limits into `modules/shared/server/rate-limit-infrastructure.ts`.
7. Keep the Turso query/cache kernel and shared object-storage primitives in `src/lib/storage.ts` as infrastructure seams.
8. Move the remaining profile bootstrap/logo-upload primitives only when a dedicated shared object-storage/database adapter is ready.

Each completed extraction preserves the existing API contracts, ownership checks, schema, and deployment topology. The remaining `storage.ts` exports are infrastructure primitives or bootstrap operations deliberately shared by the module adapters; it is no longer the business-query hub.
