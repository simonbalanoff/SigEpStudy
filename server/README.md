# Colorado Gamma Study Bank Server

Private Express and MongoDB API for the CSU Sigma Phi Epsilon study bank.

## Features

- Reusable private invitation-link registration
- Secure email/password sessions
- Member, moderator, and administrator roles
- Member management and audit history
- Searchable CSU courses imported from the terminal
- User-submitted professors with moderation
- PDF and external-link resources
- Private Cloudflare R2 storage for PDFs and generated previews
- Resource review, reports, saved resources, and helpful votes
- Password resets

## Setup

```bash
cp .env.example .env
npm ci
npm run seed
npm run dev
```

The API runs at `http://localhost:4000/api/v1`.

Cloudflare R2 configuration and migration instructions are in [`../R2_SETUP.md`](../R2_SETUP.md).

## Initial administrator

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env`, then run:

```bash
npm run seed
```

Sign in as that administrator and create invitation links from the Administration page.

## Invitation links

Accounts can only be created through a link shaped like:

```text
http://localhost:5173/register/<invite-token>
```

A link remains reusable until its optional expiration date or until an administrator deactivates it. The raw token is shown only when the administrator creates the link, and MongoDB stores only its hash.

## Importing courses

Courses are not managed in the website. Import them from a JSON file:

```bash
npm run import:courses -- data/csu-courses.json
```

Re-importing the same course updates it without changing its MongoDB ID or breaking existing resources.

## Storage

Uploaded PDFs and their first-page PNG previews are stored in a private Cloudflare R2 bucket. MongoDB stores resource metadata and private object keys. The API authenticates requests and streams the corresponding R2 object without exposing bucket credentials.

## Commands

```bash
npm run dev
npm run typecheck
npm run build
npm start
npm run seed
npm run import:courses -- data/csu-courses.json
npm run migrate:r2
```

## Main routes

```text
POST  /api/v1/auth/register
POST  /api/v1/auth/login
GET   /api/v1/auth/me
GET   /api/v1/invitations/:token

GET   /api/v1/courses/search
GET   /api/v1/courses/:courseId
GET   /api/v1/courses/:courseId/professors
POST  /api/v1/courses/:courseId/professors

GET   /api/v1/resources
POST  /api/v1/resources
GET   /api/v1/resources/:resourceId
GET   /api/v1/resources/:resourceId/file
GET   /api/v1/resources/:resourceId/preview

GET   /api/v1/admin/invitations
POST  /api/v1/admin/invitations
PATCH /api/v1/admin/invitations/:invitationId/deactivate
GET   /api/v1/admin/users
PATCH /api/v1/admin/users/:userId

GET   /api/v1/moderation/resources
GET   /api/v1/moderation/professors
GET   /api/v1/moderation/reports
GET   /api/v1/moderation/audit
```
