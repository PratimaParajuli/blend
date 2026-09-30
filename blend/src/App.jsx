import { useDeferredValue, useEffect, useState } from 'react'
import './App.css'

const categories = ['Everything', 'Little moments', 'Style notes', 'At home', 'Good things']
const currentYear = new Date().getFullYear()

const imageFor = (post) => post.coverImage || 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=85'

function Icon({ name }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    heart: <path d="M20.8 8.8c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.6Z" />,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  }

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Modal({ title, eyebrow, onClose, children, size = '' }) {
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal ${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <button className="icon-button modal-close" type="button" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  )
}

function AuthModal({ mode, setMode, onClose, onSuccess, onError }) {
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Something went wrong.')
      onSuccess(data.user)
    } catch (error) {
      onError(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={mode === 'register' ? 'Join the adventure' : 'Pick up where you left off'} eyebrow="PLAYER CHECKPOINT" onClose={onClose}>
      <p className="modal-intro">{mode === 'register' ? 'Create your player profile and find your next favorite story.' : 'Your stories and favorite people are right where you left them.'}</p>
      <form className="stacked-form" onSubmit={submit}>
        {mode === 'register' && <label>Your name<input name="name" placeholder="What should we call you?" required minLength="2" maxLength="48" /></label>}
        <label>Email address<input name="email" type="email" placeholder="you@example.com" required autoComplete="email" /></label>
        <label>Password<input name="password" type="password" placeholder="At least 8 characters" required minLength="8" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></label>
        <button className="button button-primary button-full" disabled={busy} type="submit">{busy ? 'Loading…' : mode === 'register' ? 'Start playing' : 'Continue playing'}</button>
      </form>
      <p className="auth-switch">{mode === 'register' ? 'Already have a player profile?' : 'New player?'} <button type="button" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Continue playing' : 'Join the adventure'}</button></p>
    </Modal>
  )
}

function PostEditor({ post, onClose, onSave, onError }) {
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    try {
      const response = await fetch(post ? `/api/posts/${post.id}` : '/api/posts', {
        method: post ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Your story could not be saved.')
      onSave(data.post)
    } catch (error) {
      onError(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={post ? 'Edit your story' : 'Start a new quest'} eyebrow="QUEST BUILDER" onClose={onClose} size="modal-wide">
      <p className="modal-intro">Give your tale a name, choose its corner of the map, and write it your way.</p>
      <form className="stacked-form editor-form" onSubmit={submit}>
        <label>Story title<input name="title" placeholder="A title that feels like you…" required minLength="3" maxLength="100" defaultValue={post?.title || ''} /></label>
        <div className="form-row">
          <label>Little corner<select name="category" defaultValue={post?.category || 'Little moments'}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Cover image URL<input name="coverImage" type="url" placeholder="https://…" defaultValue={post?.coverImage || ''} /></label>
        </div>
        <label>Your story<textarea name="content" rows="7" placeholder="Pour yourself a cup of something lovely and start writing…" required minLength="10" maxLength="12000" defaultValue={post?.content || ''} /></label>
        <button className="button button-primary button-full" disabled={busy} type="submit">{busy ? 'Saving your story…' : post ? 'Save my changes' : 'Share with the journal'}</button>
      </form>
    </Modal>
  )
}

function PostCard({ post, onOpen }) {
  return (
    <article className="post-card">
      <button className="post-image-button" type="button" onClick={() => onOpen(post)} aria-label={`Read ${post.title}`}>
        <img className="post-image" src={imageFor(post)} alt={post.imageAlt || post.title} loading="lazy" />
        <span className="image-heart"><Icon name="heart" /></span>
      </button>
      <div className="post-copy">
        <p className="post-category">{post.category}<span>·</span>{post.readingTime || '3 min read'}</p>
        <button className="post-title-button" type="button" onClick={() => onOpen(post)}><h3>{post.title}</h3></button>
        <p className="post-excerpt">{post.excerpt || post.content?.slice(0, 125)}{post.content?.length > 125 ? '…' : ''}</p>
        <div className="post-byline"><span className="avatar avatar-small">{post.author?.name?.[0] || 'J'}</span><span>by <strong>{post.author?.name || 'A friend'}</strong></span><span className="byline-spacer" /><span className="comment-count">♡ {post.commentCount || 0}</span></div>
      </div>
    </article>
  )
}

function StoryModal({ post, user, onClose, onEdit, onDelete, onAuth, onComment, onError }) {
  const [comments, setComments] = useState([])
  const [busy, setBusy] = useState(false)
  const ownsPost = user?.id && user.id === post.author?.id

  useEffect(() => {
    let active = true
    fetch(`/api/posts/${post.id}/comments`).then((response) => response.json()).then((data) => active && setComments(data.comments || [])).catch(() => {})
    return () => { active = false }
  }, [post.id])

  async function submitComment(event) {
    event.preventDefault()
    if (!user) return onAuth()
    setBusy(true)
    const formElement = event.currentTarget
    const content = new FormData(formElement).get('content')
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Your comment could not be posted.')
      setComments((current) => [...current, data.comment])
      formElement.reset()
      onComment(post.id)
    } catch (error) {
      onError(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={post.title} eyebrow={`${post.category}  ·  ${post.readingTime || '3 min read'}`} onClose={onClose} size="modal-story">
      <img className="story-cover" src={imageFor(post)} alt={post.imageAlt || post.title} />
      <div className="story-author"><span className="avatar">{post.author?.name?.[0] || 'J'}</span><span>Written by <strong>{post.author?.name || 'A friend'}</strong><small>{post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Just now'}</small></span></div>
      <div className="story-content">{post.content?.split('\n').filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      {ownsPost && <div className="story-actions"><button className="button button-soft" type="button" onClick={() => onEdit(post)}>Edit story</button><button className="text-button text-danger" type="button" onClick={() => onDelete(post)}>Delete story</button></div>}
      <section className="comments-section">
        <div className="comments-heading"><h3>Campfire notes <span>({comments.length})</span></h3><span>Say something kind ♡</span></div>
        <form className="comment-form" onSubmit={submitComment}><span className="avatar avatar-small">{user?.name?.[0] || '?'}</span><input name="content" maxLength="1200" minLength="2" placeholder={user ? 'Add something kind…' : 'Sign in to leave a little note…'} required /><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post'}</button></form>
        <div className="comment-list">{comments.map((comment) => <article className="comment" key={comment.id}><span className="avatar avatar-small">{comment.author?.name?.[0] || 'J'}</span><div><strong>{comment.author?.name || 'A friend'}</strong><p>{comment.content}</p><small>{new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></div></article>)}{comments.length === 0 && <p className="empty-comments">The first little note is always the sweetest.</p>}</div>
      </section>
    </Modal>
  )
}

function App() {
  const [posts, setPosts] = useState([])
  const [user, setUser] = useState(null)
  const [category, setCategory] = useState('Everything')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [modal, setModal] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [mobileMenu, setMobileMenu] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/posts').then((response) => response.json()),
      fetch('/api/auth/me').then((response) => response.json()),
    ]).then(([postData, userData]) => {
      if (active) {
        setPosts(postData.posts || [])
        setUser(userData.user || null)
      }
    }).catch(() => active && setNotice('The journal is having a little moment. Please refresh in a bit.')).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  function showNotice(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3600)
  }

  function savePost(savedPost) {
    setPosts((current) => [savedPost, ...current.filter((post) => post.id !== savedPost.id)])
    setModal(null)
    showNotice('Your story is tucked safely into the journal.')
  }

  async function deletePost(post) {
    if (!window.confirm('Delete this story? This cannot be undone.')) return
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The story could not be deleted.')
      setPosts((current) => current.filter((item) => item.id !== post.id))
      setModal(null)
      showNotice('Your story has been removed.')
    } catch (error) { showNotice(error.message) }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    showNotice('You have signed out. See you again soon!')
  }

  function openAuth(mode = 'login') {
    setAuthMode(mode)
    setModal('auth')
  }

  const filteredPosts = posts.filter((post) => {
    const matchesCategory = category === 'Everything' || post.category === category
    const searchText = `${post.title} ${post.excerpt || ''} ${post.content || ''} ${post.author?.name || ''}`.toLowerCase()
    return matchesCategory && searchText.includes(deferredQuery.trim().toLowerCase())
  })

  const featuredPost = posts.find((post) => post.featured) || posts[0]

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="blend home"><span className="brand-gem" aria-hidden="true" /><span>blend<small>A journal for the in-between</small></span></a>
        <nav className={`main-nav ${mobileMenu ? 'nav-open' : ''}`} aria-label="Main navigation"><a className="nav-active" href="#journal" onClick={() => setMobileMenu(false)}>Story map</a><a href="#about" onClick={() => setMobileMenu(false)}>Guild hall</a></nav>
        <div className="header-actions"><label className="search-box"><Icon name="search" /><input aria-label="Search stories" placeholder="Find a little something…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>{user ? <div className="user-menu"><span className="avatar avatar-small">{user.name[0]}</span><span className="user-name">Hi, {user.name.split(' ')[0]}</span><button className="text-button sign-out-button" type="button" onClick={signOut}>Sign out</button></div> : <button className="text-button login-button" type="button" onClick={() => openAuth('login')}>Sign in</button>}<button className="button button-primary write-button" type="button" onClick={() => user ? setModal('editor') : openAuth('register')}><Icon name="plus" /><span>Write a story</span></button><button className="icon-button mobile-menu-button" aria-label="Toggle navigation" type="button" onClick={() => setMobileMenu(!mobileMenu)}><Icon name="menu" /></button></div>
      </header>

      <main id="top">
        <section className="welcome-band"><div className="welcome-copy"><p className="eyebrow"><span className="eyebrow-dot" /> PLAYER ONE, YOU'RE HERE</p><h1>Every story<br /><em>is an adventure.</em></h1><p className="welcome-description">Wander through cozy little stories, collect new perspectives, and leave a kind note for the people you meet along the way.</p><a className="scroll-link" href="#journal">Choose your next quest <Icon name="arrow" /></a></div><div className="welcome-art"><img src="https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1100&q=88" alt="A dreamy bunch of blush garden flowers" /><span className="photo-note">A new world<br />is just a page away <b>♡</b></span><span className="art-stamp">SAVE<br />POINT 01</span></div><div className="welcome-side-note"><span>✦ YOUR DAILY QUEST</span><span>Find a story<br />that feels like you.</span></div></section>

        {featuredPost && <section className="featured-strip" aria-label="Quest of the day"><div className="featured-image-wrap"><img src={imageFor(featuredPost)} alt={featuredPost.title} /><span className="featured-badge">✦ QUEST OF THE DAY</span></div><div className="featured-copy"><p className="eyebrow">A STORY WORTH FINDING <span>✳</span></p><h2>{featuredPost.title}</h2><p>{featuredPost.excerpt || featuredPost.content?.slice(0, 145)}{featuredPost.content?.length > 145 ? '…' : ''}</p><button className="text-button featured-link" type="button" onClick={() => setModal({ type: 'story', post: featuredPost })}>Start this story <Icon name="arrow" /></button><div className="featured-byline"><span className="avatar avatar-small">{featuredPost.author?.name?.[0] || 'J'}</span><span>{featuredPost.author?.name || 'A friend'}<small>{featuredPost.readingTime || '3 min read'}</small></span></div></div><div className="featured-mark">✳</div></section>}

        <section id="journal" className="journal-section"><div className="journal-heading"><div><p className="eyebrow">THE STORY MAP</p><h2>Choose your <em>next adventure</em></h2></div><button className="button button-outline" type="button" onClick={() => user ? setModal('editor') : openAuth('register')}><Icon name="plus" /> Write a story</button></div>
          <div className="category-tabs" role="tablist" aria-label="Filter stories by category">{categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} className={category === item ? 'category-tab active' : 'category-tab'} onClick={() => setCategory(item)}>{item}</button>)}<span className="story-total">{filteredPosts.length} {filteredPosts.length === 1 ? 'story discovered' : 'stories discovered'}</span></div>
          {loading ? <div className="loading-state"><span className="loading-flower">✿</span><p>Loading the story map…</p></div> : filteredPosts.length > 0 ? <div className="post-grid">{filteredPosts.map((post) => <PostCard key={post.id} post={post} onOpen={(item) => setModal({ type: 'story', post: item })} />)}</div> : <div className="empty-state"><span>♡</span><h3>No stories discovered</h3><p>{query ? 'Try a different search; another quest might be hiding.' : 'The map is waiting for its first story.'}</p>{user && <button className="button button-primary" type="button" onClick={() => setModal('editor')}>Write the first one</button>}</div>}
        </section>

        <section id="about" className="about-strip"><span className="brand-gem about-gem" aria-hidden="true" /><div><p className="eyebrow">A COZY CORNER OF THE MAP</p><h2>Every player has a story.</h2><p>Meet kind people, trade little notes, and make this world feel a bit more like yours.</p></div><button className="button button-light" type="button" onClick={() => user ? setModal('editor') : openAuth('register')}>Join the party <Icon name="arrow" /></button></section>
      </main>
      <footer className="site-footer"><a className="wordmark footer-wordmark" href="#top"><span className="brand-gem" aria-hidden="true" /><span>blend<small>A journal for the in-between</small></span></a><span>Written with a little love, wherever you are. <b>♡</b></span><span>© {currentYear} blend</span></footer>

      {notice && <div className="toast" role="status">{notice}</div>}
      {modal === 'auth' && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setModal(null)} onSuccess={(loggedInUser) => { setUser(loggedInUser); setModal(null); showNotice(`So glad you're here, ${loggedInUser.name.split(' ')[0]}!`) }} onError={showNotice} />}
      {modal === 'editor' && <PostEditor onClose={() => setModal(null)} onSave={savePost} onError={showNotice} />}
      {modal?.type === 'editor' && <PostEditor post={modal.post} onClose={() => setModal(null)} onSave={savePost} onError={showNotice} />}
      {modal?.type === 'story' && <StoryModal key={modal.post.id} post={modal.post} user={user} onClose={() => setModal(null)} onEdit={(post) => setModal({ type: 'editor', post })} onDelete={deletePost} onAuth={() => openAuth('login')} onComment={(id) => setPosts((current) => current.map((post) => post.id === id ? { ...post, commentCount: (post.commentCount || 0) + 1 } : post))} onError={showNotice} />}
    </div>
  )
}

export default App
