# Backend, accounts and content publication implementation plan

**Goal:** Adapt the existing JY FITNESS ATLAS frontend to a persistent backend with Google authentication, private user plans, administrator permissions and published media.

**Architecture:** Supabase Postgres, Auth and a private Storage bucket are the production backend. Keep the existing static frontend and visual style. Browser requests use the public project key and authenticated session; database RLS and restricted SQL functions enforce authorization. Secrets are confined to provisioning scripts. A local Postgres-compatible PGlite catalogue supports development and automated policy tests, never a fake production login.

**Scope:** Google sign-in and sign-out, profile, personal plans with ordered days/items, content/media publication, user suspension and roles, access summaries and audit events. Three existing 3D prototypes are imported as published samples with professional-review-pending labels. Actual training performance logging is outside this iteration.

## Tasks

1. Create the Tokyo Supabase project in the user's account. The user completes login, terms and database-password setup. Configure Google OAuth using the user's Google Cloud project; keep credentials out of chat and Git.
2. Add versioned SQL migrations for profiles, private roles, contents, media, plans, days/items, activity and audit events. Revoke default privileges; explicitly grant permitted reads/writes. Test anonymous, two members, active admin and suspended-user cases in real Postgres semantics.
3. Add atomic plan save with optimistic revision checks, safe content publish checks, admin-only user/role functions, and a service-role-only first-admin bootstrap.
4. Import the three GLBs and GIFs to private object storage. Register metadata and publish status in Postgres. Serve only published assets to anonymous visitors; allow drafts only to admins.
5. Bundle the official Supabase browser client locally. Add runtime public configuration and an API adapter. Render API-provided content in the existing library, theme pages, detail pages and Motion Lab.
6. Add account/Google sign-in, profile and private plan editor; add an admin screen for content, media, accounts and activity. Preserve current navigation, responsive layout, filtering and history behavior.
7. Verify actual public content, Google OAuth callback, session recovery, cross-user isolation, role enforcement, publication/unpublication, plan saving and media retrieval. Account for any user-owned configuration still pending, without pretending it has been activated.
8. Publish the adapted frontend to the current public Site using its source workflow, preserve the existing audience, and synchronize the implementation and migration sources to the user's GitHub repository.

## Acceptance

- Public browsing reads only published database content; three samples remain clearly labelled prototypes.
- Private user data is authorized by verified server-side identity and RLS, not an editable browser role.
- A member cannot promote themselves or read another member's plans. A content admin does not gain access to other members' private plans.
- New content is uploaded, registered and published through the backend; changing content does not require rebuilding the frontend.
- Production Google login is reported working only after a real provider flow completes.
