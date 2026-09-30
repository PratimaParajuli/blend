# blend

A small full-stack blogging journal built with React, Vite, and Node.js. Visitors can browse and search stories; registered authors can publish, edit, and delete their own posts, and signed-in readers can leave comments.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). The development command starts the REST API on `http://127.0.0.1:3001` and proxies `/api` requests through Vite. The API creates `api/data.json` on first launch with sample stories. New accounts, posts, and comments are saved there.

For the production frontend, run `npm run build`. Run `npm run api` to start the API separately; serve the built frontend and configure your web server to proxy `/api` to the API process.

## REST API

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/posts`, `POST /api/posts`, `PUT /api/posts/:id`, `DELETE /api/posts/:id`
- `GET /api/posts/:id/comments`, `POST /api/posts/:id/comments` (send `parentId` to reply)
- `PUT /api/comments/:id/likes`, `DELETE /api/comments/:id/likes`, `DELETE /api/comments/:id` (comment author only)
- `GET /api/health`

Authentication uses an HTTP-only, same-site session cookie. Passwords are hashed with Node's built-in scrypt implementation. Set `API_PORT` to change the API port; set `BLEND_DATABASE_PATH` to use a different JSON database file.

The included JSON store keeps local setup dependency-free. For a public production deployment, use a managed database and durable session storage, enable HTTPS, and add operational protections such as rate limiting and backups.