import { useEffect, useRef, useState } from 'react'
import './App.css'

const heroImage = 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=85'
const postFiles = import.meta.glob('../content/posts/*.json', { eager: true, import: 'default' })
const posts = Object.entries(postFiles)
  .filter(([, post]) => !post.draft)
  .map(([path, post]) => ({ ...post, image: typeof post.image === 'string' ? post.image.trim() : '', id: path, time: `${Math.max(1, Math.ceil(post.body.split(/\s+/).length / 200))} min read` }))
  .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
const categories = ['All the good stuff', 'Recipes', 'Kitchen notes', 'Something sweet']
function App() {
  const [category, setCategory] = useState(categories[0])
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const dialog = useRef(null)
  useEffect(() => { if (selected) dialog.current?.showModal(); else dialog.current?.close() }, [selected])
  const filtered = posts.filter(p => (category === categories[0] || p.category === category) && `${p.title} ${p.excerpt}`.toLowerCase().includes(query.toLowerCase()))
  const date = value => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return <>
    <div className="announcement">A little messy. A little magical. Always made with love. <span>✧</span></div>
    <header><a className="brand" href="#" aria-label="Maria LaMarca Cooking home">maria lamarca<span>COOKING & A LITTLE EVERYDAY MAGIC</span></a><nav aria-label="Main navigation"><a href="#journal" onClick={() => setCategory(categories[0])}>The journal</a><a href="#journal" onClick={() => setCategory('Recipes')}>Recipes</a><a href="#about">Meet Maria <span>♡</span></a></nav><button className="search-toggle" aria-label="Search posts" onClick={() => setSearchOpen(!searchOpen)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/></svg></button></header>
    <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow">FROM MY KITCHEN, WITH LOVE <span>✳</span></div><h1>A pinch of joy.<br/>A spoonful of <em>magic.</em></h1><p>Recipes, little experiments, and everyday stories<br className="desktop"/> from a kitchen that’s always making something.</p><a className="button" href="#journal">See what’s cooking <span>↗</span></a><div className="handwritten">Good food. Happy hearts. <span>⤴</span></div></div><div className="hero-photo"><img src={heroImage} alt="Fresh pasta with tomatoes and basil"/><span className="photo-note">made with love<br/><b>…and extra basil ♡</b></span><span className="round-stamp">IN SEASON<br/><strong>made<br/>slowly</strong><br/>SAVORED ALWAYS</span></div><span className="hero-spark" aria-hidden="true">✧</span></section>
      <div className="ribbon"><span>✳</span> A kitchen journal <span>✳</span> A little inspiration <span>✳</span> Something delicious <span>✳</span> Room at the table <span>✳</span></div>
      <section className="journal" id="journal"><div className="section-heading"><div><span className="eyebrow">FRESH FROM THE COUNTER</span><h2>Lately in the kitchen <span>↴</span></h2></div><p>A few things I’ve been making,<br/>loving, and figuring out along the way.</p></div><div className="journal-controls"><div className="filters">{categories.map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div><a className="new-post" href="/admin/">＋ Write a kitchen note</a></div>{searchOpen && <label className="search-field">Find something delicious<input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the journal…" type="search"/></label>}<div className="posts">{filtered.map((post, i) => <article key={post.id} className={`post${i === 0 ? ' featured' : ''}${!post.image ? ' without-image' : ''}`}>{post.image && <button className="post-image" onClick={() => setSelected(post)} aria-label={`Read ${post.title}`}><img src={post.image} alt={post.title} loading="lazy"/><span className="category-label">{post.category}</span>{i === 0 && <span className="latest-label">the latest ♡</span>}</button>}<div className="post-content">{!post.image && <div className="text-post-labels"><span className="category-label">{post.category}</span>{i === 0 && <span className="text-latest">the latest ♡</span>}</div>}<div className="post-meta">{date(post.date)} <span>·</span> {post.time}</div><button className="title-button" onClick={() => setSelected(post)}><h3>{post.title}</h3></button><p>{post.excerpt}</p><button className="read-link" onClick={() => setSelected(post)}>Pull up a chair <span>↗</span></button></div></article>)}</div>{!filtered.length && <p className="empty">Nothing on the counter just yet. Try another category or search.</p>}</section>
      <section className="about" id="about"><div className="about-art" aria-hidden="true">♡<span>there’s always<br/>room for one more</span></div><div><span className="eyebrow">HELLO, I’M MARIA</span><h2>Welcome to my little<br/>corner of the kitchen.</h2><p>This is a place for the things we make, the recipes we keep, and the happy little accidents along the way. Grab a cup of something warm and stay a while.</p><span className="handwritten">Let’s make something lovely. ♡</span></div></section>
    </main><footer><a className="brand" href="#">maria lamarca<span>A LITTLE EVERYDAY MAGIC</span></a><p>Made with love, and probably a little flour.</p><a href="/admin/">Kitchen notebook ↗</a><small>Sample journal content · Make this space your own.</small></footer>
    <dialog ref={dialog} onCancel={() => { setSelected(null) }} onClick={e => { if (e.target === e.currentTarget) { setSelected(null) } }}><button className="close" aria-label="Close" onClick={() => { setSelected(null) }}>×</button>{selected && <article className="reading">{selected.image && <img src={selected.image} alt={selected.title}/>}<span className="eyebrow">{selected.category} · {date(selected.date)}</span><h2>{selected.title}</h2>{selected.body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}<span className="handwritten">With love, Maria ♡</span></article>}</dialog>
  </>
}
export default App
