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

## Migration sequence

1. Establish adapters and import-boundary tests.
2. Move conversation and profile queries behind module-owned repositories.
3. Move administration and media queries behind their repositories.
4. Split the storage kernel into module infrastructure files without changing the public routes.
5. Introduce domain/application services only where business rules are duplicated or hard to test.

This is intentionally incremental: each stage can be reviewed, tested, committed, and reverted independently.
