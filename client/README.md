# Colorado Gamma Study Bank Client

A simple React and TypeScript frontend for the private Colorado Gamma Study Bank at Colorado State University.

## Requirements

- Node.js 24 LTS recommended
- The matching Express backend running on port 4000 during local development

## Setup

```bash
nvm use
cp .env.example .env
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Access

There is no public account creation page. Administrators create a private single-use invitation link from:

```text
Administrator tools → Invite links
```

The invited member opens the link and creates an account at `/register/<token>`.

## Member pages

- Home
- Library
- Submit
- Saved
- Profile
- Your submissions

Resources use only a course and an optional professor. Any exam, year, or class-section details can be included in the resource title.

## Moderator pages

The Moderation Center contains only:

- Resource queue
- Professor queue
- Reports

## Administrator pages

Administrator Tools contains only:

- Invite links
- Members
- Audit log

Courses are imported from the backend terminal and are not managed in this frontend.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run check
npm run preview
```

## Production

The production build is written to `dist`. Configure the host to serve `index.html` for unknown frontend routes and proxy `/api` to the Express server.
