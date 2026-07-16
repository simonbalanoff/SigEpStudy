<div align="center">
  <img src="docs/brand/crest.png" alt="Colorado Gamma crest" width="88" />
  
  # Colorado Gamma Study Bank

  An invite-only academic resource platform for Sigma Phi Epsilon's Colorado Gamma chapter.

  [View the live site](https://sig-ep-study.vercel.app)
</div>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB Atlas" />
  <img src="https://img.shields.io/badge/Cloudflare-R2-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare R2" />
</p>

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Colorado Gamma Study Bank dashboard" width="100%" />
</p>

## Overview

Colorado Gamma Study Bank gives chapter members one secure place to upload, discover, preview, save, and manage academic resources. The platform is organized around courses and professors, with invitation-based registration and role-specific moderation tools.

## Features

- Search and filter resources by course, professor, type, topic, and relevance
- Upload PDFs and generate first-page preview images automatically
- Store private files and previews in Cloudflare R2
- Save useful resources and mark submissions as helpful
- Track personal submissions and moderation status
- Invite-only registration with secure cookie-based sessions
- Moderator review queue with approval and revision workflows
- Administrative tools for users, invitations, roles, and audit history
- Responsive interface for desktop and mobile use

## Screenshots

<table>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/library.png" alt="Searchable resource library" />
    </td>
    <td width="50%">
      <img src="docs/screenshots/resource.png" alt="Resource details and PDF preview" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>Resource library</strong></td>
    <td align="center"><strong>Resource preview</strong></td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/submit.png" alt="Resource submission form" />
    </td>
    <td width="50%">
      <img src="docs/screenshots/moderation.png" alt="Moderation dashboard" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>Resource submission</strong></td>
    <td align="center"><strong>Moderation workflow</strong></td>
  </tr>
</table>

## Architecture

```text
React + Vite client
        |
        | HTTPS / authenticated API requests
        v
Express + TypeScript API
        |
        +---- MongoDB Atlas
        |       users, sessions, courses, resources, invitations
        |
        +---- Cloudflare R2
                private PDFs and generated preview images
```

The frontend is deployed on Vercel, the API is hosted on Render, MongoDB Atlas stores application data, and Cloudflare R2 stores uploaded documents.

## Technology

| Area | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router, TanStack Query |
| Forms and validation | React Hook Form, Zod |
| Backend | Node.js, Express, TypeScript |
| Authentication | Signed HTTP-only cookies, persisted sessions, role-based authorization |
| Database | MongoDB Atlas, Mongoose |
| File storage | Cloudflare R2 |
| Deployment | Vercel, Render |

## Project structure

```text
SigEpStudy/
├── client/                 React frontend
│   ├── public/
│   └── src/
├── server/                 Express API
│   └── src/
│       ├── config/
│       ├── middleware/
│       ├── modules/
│       ├── scripts/
│       └── services/
└── docs/
    ├── brand/
    └── screenshots/
```

## Local development

### Prerequisites

- Node.js 22 or newer
- MongoDB database
- Cloudflare R2 bucket and API credentials

### Install dependencies

```bash
git clone https://github.com/simonbalanoff/SigEpStudy.git
cd SigEpStudy

cd server
npm install

cd ../client
npm install
```

### Configure the server

Create `server/.env`:

```env
NODE_ENV=development
PORT=4000

MONGODB_URI=
CLIENT_ORIGINS=http://localhost:5173
COOKIE_SECRET=
SESSION_DAYS=30

APP_URL=http://localhost:5173
MAX_UPLOAD_MB=25

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:4000/api/v1
```

### Run the application

In one terminal:

```bash
cd server
npm run dev
```

In another terminal:

```bash
cd client
npm run dev
```

The client will be available at `http://localhost:5173`.

## Access model

The platform is intentionally invite-only. Members can browse and submit resources, moderators can review submissions, and administrators can manage accounts, invitations, and chapter-wide settings.

Uploaded PDFs remain private and are served only through authenticated API routes.

## Author

Built by [Simon Balanoff](https://github.com/simonbalanoff).
