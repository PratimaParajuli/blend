import { createServer } from 'node:http'
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const currentDirectory = dirname(fileURLToPath(import.meta.url))
const databasePath = resolve(process.env.BLEND_DATABASE_PATH || resolve(currentDirectory, 'data.json'))
const port = Number(process.env.API_PORT || 3001)
const sessions = new Map()
const categories = ['Little moments', 'Style notes', 'At home', 'Good things']

const seed = {
  users: [],
  posts: [
    {
      id: 'seed-sunday-rituals', authorId: 'seed-june', authorName: 'June Harper',
      title: 'The gentle art of a Sunday that asks for nothing',
      excerpt: 'Lately, I have been practicing a different kind of Sunday. One with nowhere to be and absolutely nothing to prove.',
      content: 'Lately, I have been practicing a different kind of Sunday. One with nowhere to be and absolutely nothing to prove.\n\nThe coffee takes its sweet time. The flowers get fresh water. I leave the laundry in its basket until I feel like folding it, and the world keeps spinning just fine.\n\nSomewhere between the second cup and the afternoon light, I remember that rest is not a reward for getting everything done. It is simply one of the things that makes us human.',
      coverImage: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1100&q=85',
      category: 'Little moments', createdAt: '2026-09-24T10:00:00.000Z', featured: true,
    },
    {
      id: 'seed-blue-hour', authorId: 'seed-margot', authorName: 'Margot Ellis',
      title: 'A tiny love letter to the blue hour',
      excerpt: 'That in-between bit of the evening when the sky turns the color of a secret. I think it might be my favorite time.',
      content: 'That in-between bit of the evening when the sky turns the color of a secret. I think it might be my favorite time.\n\nThe neighbors walk their dogs a little slower. A few windows glow gold. I take the long way home even when my hands are full of groceries, because the light is doing that thing again.\n\nHere is your reminder to look up on the way home. The sky has been saving something lovely for you.',
      coverImage: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85',
      category: 'Little moments', createdAt: '2026-09-21T16:00:00.000Z',
    },
    {
      id: 'seed-thrifted-ceramics', authorId: 'seed-clara', authorName: 'Clara Rose',
      title: 'The things we keep because they feel like us',
      excerpt: 'A chipped blue bowl, a very lopsided vase, and the small joy of making a home feel a little more like your own.',
      content: 'A chipped blue bowl, a very lopsided vase, and the small joy of making a home feel a little more like your own.\n\nI found the bowl in a charity shop on a rainy Tuesday. It was a little too expensive for something that is not quite a bowl anymore, but I could not leave it there. It lives on my kitchen shelf now and holds the lemons.\n\nI think a home becomes ours through these little accidents. The things we keep for no good reason, except that they make us smile when we pass.',
      coverImage: 'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1000&q=85',
      category: 'At home', createdAt: '2026-09-18T11:30:00.000Z',
    },
    {
      id: 'seed-getting-dressed', authorId: 'seed-wren', authorName: 'Wren Parker',
      title: 'Getting dressed for the person I am today',
      excerpt: 'Less getting it right. More putting on the cardigan that feels like being gently looked after.',
      content: 'Less getting it right. More putting on the cardigan that feels like being gently looked after.\n\nI used to save my favorite things for a more special day. The good earrings, the softest sweater, the lipstick I like best. Turns out Tuesday is a very good day for all of that.\n\nNow I get dressed for the person I am today, instead of the imaginary person I might be someday. It is a small thing, and it is changing a lot.',
      coverImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85',
      category: 'Style notes', createdAt: '2026-09-14T08:45:00.000Z',
    },
    {
      id: 'seed-small-brave', authorId: 'seed-june', authorName: 'June Harper',
      title: 'On doing one small brave thing',
      excerpt: 'It does not have to be a grand gesture. Sometimes bravery looks like sending the message and making the tea.',
      content: 'It does not have to be a grand gesture. Sometimes bravery looks like sending the message and making the tea.\n\nI made the phone call I had been putting off for three weeks. Then I sat down on the kitchen floor and let the kettle do the hard part.\n\nIf nobody has said it lately: it counts even if it was small, even if your hands shook, even if it took you a while. I am proud of you. I mean it.',
      coverImage: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85',
      category: 'Good things', createdAt: '2026-09-10T12:10:00.000Z',
    },
  ],
  comments: [],
}

function loadDatabase() {
  if (!existsSync(databasePath)) {
    mkdirSync(dirname(databasePath), { recursive: true })
    writeFileSync(databasePath, JSON.stringify(seed, null, 2))
  }

  try {
    const database = JSON.parse(readFileSync(databasePath, 'utf8'))
    if (!Array.isArray(database.users) || !Array.isArray(database.posts) || !Array.isArray(database.comments)) throw new Error('Invalid database shape.')
    return database
  } catch (error) {
    console.error(`Could not read ${databasePath}:`, error.message)
    process.exit(1)
  }
}

let database = loadDatabase()

function persist() {
  writeFileSync(databasePath, JSON.stringify(database, null, 2))
}

function publicUser(user) {
  return user ? { id: user.id, name: user.name, email: user.email } : null
}

function postAuthor(post) {
  const user = database.users.find((item) => item.id === post.authorId)
  return user ? publicUser(user) : { id: post.authorId, name: post.authorName || 'A friend' }
}

function publicPost(post) {
  const content = post.content || ''
  return {
    ...post,
    author: postAuthor(post),
    excerpt: post.excerpt || content.slice(0, 150),
    readingTime: `${Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200))} min read`,
    commentCount: database.comments.filter((comment) => comment.postId === post.id).length,
  }
}

function publicComment(comment, user) {
  const { likes = [], ...details } = comment
  return {
    ...details,
    parentId: comment.parentId || null,
    author: publicUser(database.users.find((item) => item.id === comment.authorId)) || { name: 'A friend' },
    likeCount: likes.length,
    likedByMe: Boolean(user && likes.includes(user.id)),
  }
}

function currentUser(request) {
  const cookie = request.headers.cookie || ''
  const match = cookie.match(/(?:^|;\s*)blend_session=([^;]+)/)
  return match ? database.users.find((user) => user.id === sessions.get(match[1])) || null : null
}

function send(response, status, value, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
  response.end(JSON.stringify(value))
}

async function readJson(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 1_000_000) throw Object.assign(new Error('Request body is too large.'), { status: 413 })
  }
  if (!body) return {}
  try { return JSON.parse(body) } catch { throw Object.assign(new Error('Please send valid JSON.'), { status: 400 }) }
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function validatePost(payload) {
  const title = cleanText(payload.title, 100)
  const content = cleanText(payload.content, 12000)
  const category = cleanText(payload.category, 40)
  const coverImage = cleanText(payload.coverImage, 1000)
  if (title.length < 3) throw Object.assign(new Error('Give your story a title of at least 3 characters.'), { status: 400 })
  if (content.length < 10) throw Object.assign(new Error('Your story needs at least 10 characters.'), { status: 400 })
  if (!categories.includes(category)) throw Object.assign(new Error('Please choose one of the journal categories.'), { status: 400 })
  if (coverImage && !/^https?:\/\//i.test(coverImage)) throw Object.assign(new Error('Cover images must use an http or https URL.'), { status: 400 })
  return { title, content, category, coverImage }
}

async function handle(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
  const route = url.pathname.replace(/\/+$/, '') || '/'
  const user = currentUser(request)

  if (request.method === 'GET' && route === '/api/health') return send(response, 200, { ok: true })
  if (request.method === 'GET' && route === '/api/auth/me') return send(response, 200, { user: publicUser(user) })

  if (request.method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(route)) {
    const payload = await readJson(request)
    const email = cleanText(payload.email, 254).toLowerCase()
    const password = typeof payload.password === 'string' ? payload.password : ''
    if (!/^\S+@\S+\.\S+$/.test(email)) return send(response, 400, { error: 'Please enter a valid email address.' })
    if (password.length < 8 || password.length > 128) return send(response, 400, { error: 'Your password must be between 8 and 128 characters.' })

    let account
    if (route.endsWith('/register')) {
      if (database.users.some((item) => item.email === email)) return send(response, 409, { error: 'There is already an account with that email.' })
      const name = cleanText(payload.name, 48)
      if (name.length < 2) return send(response, 400, { error: 'Your name needs at least 2 characters.' })
      const salt = randomBytes(16).toString('hex')
      const passwordHash = (await scrypt(password, salt, 64)).toString('hex')
      account = { id: randomUUID(), name, email, salt, passwordHash, createdAt: new Date().toISOString() }
      database.users.push(account)
      persist()
    } else {
      account = database.users.find((item) => item.email === email)
      if (!account) return send(response, 401, { error: 'That email and password do not match.' })
      const candidate = await scrypt(password, account.salt, 64)
      const stored = Buffer.from(account.passwordHash, 'hex')
      if (stored.length !== candidate.length || !timingSafeEqual(stored, candidate)) return send(response, 401, { error: 'That email and password do not match.' })
    }

    const token = randomBytes(32).toString('hex')
    sessions.set(token, account.id)
    return send(response, 200, { user: publicUser(account) }, { 'Set-Cookie': `blend_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` })
  }

  if (request.method === 'POST' && route === '/api/auth/logout') {
    const cookie = request.headers.cookie || ''
    const match = cookie.match(/(?:^|;\s*)blend_session=([^;]+)/)
    if (match) sessions.delete(match[1])
    return send(response, 200, { ok: true }, { 'Set-Cookie': 'blend_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' })
  }

  if (request.method === 'GET' && route === '/api/posts') {
    const posts = [...database.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(publicPost)
    return send(response, 200, { posts })
  }

  const commentsRoute = route.match(/^\/api\/posts\/([^/]+)\/comments$/)
  const commentLikesRoute = route.match(/^\/api\/comments\/([^/]+)\/likes$/)
  const commentRoute = route.match(/^\/api\/comments\/([^/]+)$/)
  if (commentsRoute && request.method === 'GET') {
    const post = database.posts.find((item) => item.id === commentsRoute[1])
    if (!post) return send(response, 404, { error: 'Story not found.' })
    const comments = database.comments.filter((item) => item.postId === post.id).map((comment) => publicComment(comment, user))
    return send(response, 200, { comments })
  }

  if (commentsRoute && request.method === 'POST') {
    if (!user) return send(response, 401, { error: 'Sign in to leave a little note.' })
    if (!database.posts.some((item) => item.id === commentsRoute[1])) return send(response, 404, { error: 'Story not found.' })
    const payload = await readJson(request)
    const content = cleanText(payload.content, 1200)
    const parentId = cleanText(payload.parentId, 100) || null
    if (content.length < 2) return send(response, 400, { error: 'Your note needs at least 2 characters.' })
    if (parentId && !database.comments.some((item) => item.id === parentId && item.postId === commentsRoute[1])) return send(response, 404, { error: 'The comment you are replying to was not found.' })
    const comment = { id: randomUUID(), postId: commentsRoute[1], parentId, authorId: user.id, content, likes: [], createdAt: new Date().toISOString() }
    database.comments.push(comment)
    persist()
    return send(response, 201, { comment: publicComment(comment, user) })
  }

  if (commentLikesRoute && ['PUT', 'DELETE'].includes(request.method)) {
    if (!user) return send(response, 401, { error: 'Sign in to like a comment.' })
    const comment = database.comments.find((item) => item.id === commentLikesRoute[1])
    if (!comment) return send(response, 404, { error: 'Comment not found.' })
    comment.likes = Array.isArray(comment.likes) ? comment.likes : []
    if (request.method === 'PUT' && !comment.likes.includes(user.id)) comment.likes.push(user.id)
    if (request.method === 'DELETE') comment.likes = comment.likes.filter((id) => id !== user.id)
    persist()
    return send(response, 200, { comment: publicComment(comment, user) })
  }

  if (commentRoute && request.method === 'DELETE') {
    if (!user) return send(response, 401, { error: 'Sign in to delete your comment.' })
    const comment = database.comments.find((item) => item.id === commentRoute[1])
    if (!comment) return send(response, 404, { error: 'Comment not found.' })
    if (comment.authorId !== user.id) return send(response, 403, { error: 'You can only delete your own comment.' })
    for (const reply of database.comments) {
      if (reply.parentId === comment.id) reply.parentId = comment.parentId || null
    }
    database.comments = database.comments.filter((item) => item.id !== comment.id)
    persist()
    return send(response, 200, { ok: true })
  }

  if (request.method === 'POST' && route === '/api/posts') {
    if (!user) return send(response, 401, { error: 'Sign in to share a story.' })
    const fields = validatePost(await readJson(request))
    const post = { id: randomUUID(), ...fields, authorId: user.id, createdAt: new Date().toISOString() }
    database.posts.push(post)
    persist()
    return send(response, 201, { post: publicPost(post) })
  }

  const postRoute = route.match(/^\/api\/posts\/([^/]+)$/)
  if (postRoute && ['PUT', 'DELETE'].includes(request.method)) {
    if (!user) return send(response, 401, { error: 'Sign in to change your story.' })
    const post = database.posts.find((item) => item.id === postRoute[1])
    if (!post) return send(response, 404, { error: 'Story not found.' })
    if (post.authorId !== user.id) return send(response, 403, { error: 'Only the author can change this story.' })
    if (request.method === 'DELETE') {
      database.posts = database.posts.filter((item) => item.id !== post.id)
      database.comments = database.comments.filter((item) => item.postId !== post.id)
      persist()
      return send(response, 200, { ok: true })
    }
    Object.assign(post, validatePost(await readJson(request)), { updatedAt: new Date().toISOString() })
    persist()
    return send(response, 200, { post: publicPost(post) })
  }

  return send(response, 404, { error: 'That little path does not exist.' })
}

createServer((request, response) => {
  handle(request, response).catch((error) => {
    console.error('API request failed:', error)
    if (!response.headersSent) send(response, error.status || 500, { error: error.status ? error.message : 'Something went wrong on our end.' })
    else response.destroy()
  })
}).listen(port, '127.0.0.1', () => {
  console.log(`blend API is listening on http://127.0.0.1:${port}`)
})