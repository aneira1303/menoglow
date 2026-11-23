import React, {createContext, useContext, useEffect, useState} from 'react'
import {Routes, Route, Link, NavLink, useParams, useNavigate, useLocation} from 'react-router-dom'
import {api, auth, inr, B} from './api.js'
import {Stars, Skel, ShipBar, CartLines, Drawer, Timeline, FAQ, Newsletter, Chatbot, PRow} from './ui.jsx'
import {CFG, useGet, SearchBox, NotifyBtn, Offers, Pincode, Compare, QA, Bell, Rewards, Addresses, ReturnBtn, Invoice, Diary, Cookie, BackTop, Crumbs, Password, Banners, AdminPlus} from './extra.jsx'

const Ctx = createContext()
const useStore = () => useContext(Ctx)
const load = (k, d) => JSON.parse(localStorage.getItem(k) || d)
const FALLBACK = [1,2,3,4,5].map(i => ({id:i, price:[499,649,799,549,899][i-1], category:['Mist','Balm','Cream','Body','Cream'][i-1],
  name:['Cooling Mist','Hydrating Balm','Barrier Repair Cream','Body Lotion','Night Recovery Cream'][i-1].replace(/^/, 'MenoGlow '), description:'Start the API to load live products.', ingredients:'', stock:10}))

function Img({p}) { return <div className="img">{p.image_url ? <img src={p.image_url} alt={p.name}/> : <div className="bottle" role="img" aria-label={p.name}/>}</div> }
function Card({p}) {
  const {add, wish, toggleWish, cmp, toggleCmp} = useStore()
  const out = p.stock < 1, ff = (p.tags || '').includes('fragrance-free')
  return <div className="card"><Link to={'/product/' + p.id}><Img p={p}/></Link>
    <div className="badges">{out ? <span>Sold out</span> : p.stock < 10 && <span className="warn">Only {p.stock} left</span>}{ff && <span>Fragrance-free</span>}</div>
    <button className="heart" aria-label="Save to wishlist" onClick={() => toggleWish(p.id)}>{wish.includes(p.id) ? '♥' : '♡'}</button>
    <div className="body"><h3>{p.name}</h3><Stars v={p.rating} n={p.reviews}/><p className="price">{inr(p.price)}</p>
    <div style={{display:'flex',gap:10,alignItems:'center',marginTop:10}}>{out ? <NotifyBtn id={p.id}/> : <button className="btn sm" onClick={() => add(p)}>Add to bag</button>}<label className="cmp"><input type="checkbox" checked={cmp.includes(p.id)} onChange={() => toggleCmp(p.id)}/> Compare</label></div></div></div>
}
function useProducts(params = '') {
  const [list, set] = useState(null)
  useEffect(() => { api('/products' + params).then(set).catch(() => set(FALLBACK)) }, [params])
  return list
}
function RecentRow() {
  const {recent} = useStore()
  return recent.length ? <div className="wrap" style={{marginTop:56}}><h2 style={{marginBottom:24}}>Recently viewed</h2><div className="grid">{recent.map(p => <Card key={p.id} p={p}/>)}</div></div> : null
}
function Nav() {
  const {cart, user, logout, theme, setTheme, setDrawer, wish, cmp, big, setBig} = useStore(), [m, setM] = useState(false)
  return <><div className="announce">{CFG.announce}</div>
    <header className="glass"><nav onClick={e => e.target.closest('a') && setM(false)}><Link to="/" className="logo">MenoGlow</Link>
      <button className="icon menu" aria-label="Menu" onClick={() => setM(!m)}>☰</button>
      <div className={'links' + (m ? ' open' : '')}><NavLink to="/shop">Shop</NavLink><NavLink to="/quiz">Skin quiz</NavLink><NavLink to="/blog">Learn</NavLink><NavLink to="/diary">Diary</NavLink><NavLink to="/contact">Contact</NavLink>
      {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
      {user ? <><NavLink to="/account">{user.name || 'Account'}</NavLink><a href="#" onClick={e => {e.preventDefault(); logout()}}>Log out</a></> : <NavLink to="/login">Log in</NavLink>}
      <NavLink to="/wishlist" aria-label="Wishlist">♡ {wish.length}</NavLink><NavLink to="/compare">Compare ({cmp.length})</NavLink>{user && <Bell/>}<button className="icon" aria-label="Change text size" onClick={() => setBig(!big)}>A{big ? "−" : "+"}</button>
      <button className="icon" aria-label="Toggle dark mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀' : '☾'}</button>
      <button className="btn sm" onClick={() => setDrawer(true)}>Bag ({cart.reduce((a, c) => a + c.qty, 0)})</button></div></nav></header></>
}

function Home() {
  const all = useProducts(), featured = [...(all || [])].sort((a, b) => (b.tags || '').includes('featured') - (a.tags || '').includes('featured')).slice(0, 4)
  return <>
    <Banners/>
    <div className="wrap hero"><div><h1>Skin care that keeps pace with your changes.</h1>
      <p>Gentle, hydration-first formulas for perimenopause and menopause. Clear ingredients, fragrance-free options, fair prices.</p>
      <Link to="/shop" className="btn">Shop the collection</Link> <Link to="/quiz" className="btn ghost">Take the skin quiz</Link></div>
      <div className="orb" aria-hidden="true"><i className="b1"/><i className="b2"/><i className="b3"/></div></div>
    <div className="wrap trust">{['Fragrance-free options', 'Every ingredient listed', 'Free shipping over ₹999', '7-day returns'].map(t => <span key={t}>{t}</span>)}</div>
    <div className="band"><div className="wrap">
      <div><h3>Comfort</h3><p>Formulas for skin that runs warm, dry or sensitive.</p></div>
      <div><h3>Trust</h3><p>Every ingredient listed. Every price stated plainly.</p></div>
      <div><h3>Self-care</h3><p>A small daily ritual, made to feel generous.</p></div></div></div>
    <div className="wrap"><h2 style={{marginBottom:24}}>Featured</h2>{all === null ? <Skel/> : <div className="grid">{featured.map(p => <Card key={p.id} p={p}/>)}</div>}</div>
    <RecentRow/><Newsletter/></>
}

function Shop() {
  const [q, setQ] = useState(''), [cat, setCat] = useState(''), [sort, setSort] = useState(''), [max, setMax] = useState(2000), [tag, setTag] = useState('')
  const raw = useProducts(`?q=${encodeURIComponent(q)}&category=${cat}&sort=${sort === 'rating' ? '' : sort}`)
  const list = raw && raw.filter(p => p.price <= max && (!tag || (p.tags || '').includes(tag))).sort((a, b) => sort === 'rating' ? (b.rating || 0) - (a.rating || 0) : 0)
  return <div className="wrap page"><h1>Shop</h1>
    <div className="tools"><SearchBox q={q} setQ={setQ} names={(raw || []).map(p => p.name)}/>
      <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{['Mist','Balm','Cream','Body'].map(c => <option key={c}>{c}</option>)}</select>
      <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort"><option value="">Featured</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="rating">Top rated</option></select>
      <label>Up to {inr(max)} <input type="range" min="300" max="2000" step="50" value={max} onChange={e => setMax(+e.target.value)}/></label></div>
    <div className="opt">{[['', 'All'], ['dry', 'Dry skin'], ['sensitive', 'Sensitive'], ['hot', 'Cooling'], ['sleep', 'Night care'], ['fragrance-free', 'Fragrance-free']].map(([v, t]) => <button key={t} className={tag === v ? 'on' : ''} onClick={() => setTag(v)}>{t}</button>)}</div>
    {list === null ? <Skel/> : list.length ? <div className="grid">{list.map(p => <Card key={p.id} p={p}/>)}</div> : <p>No products match. Try a different search or raise the price limit.</p>}</div>
}

const HOW = 'Apply to clean skin morning and night, or whenever skin feels dry. Patch-test on your inner arm first. Avoid the eye area. Stop use if irritation occurs.'
function Product() {
  const {id} = useParams(), {add, user, seen, notify} = useStore(), all = useProducts()
  const [p, setP] = useState(), [rating, setRating] = useState(5), [text, setText] = useState(''), [msg, setMsg] = useState(''), [tab, setTab] = useState('Details'), [qty, setQty] = useState(1), [rsort, setRsort] = useState('new')
  const get = () => api('/products/' + id).then(setP).catch(() => setP({...FALLBACK[0], reviews: []}))
  useEffect(() => { get(); setTab('Details'); setQty(1); window.scrollTo(0, 0) }, [id])
  useEffect(() => { if (p) seen(p) }, [p?.id])
  if (!p) return null
  const rs = p.reviews || [], avg = rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : 0, out = p.stock < 1
  const send = async () => { try { await api('/reviews', {method:'POST', body:{product_id:+id, rating, text}}); setText(''); get() } catch (e) { setMsg(e.message) } }
  return <div className="wrap page"><Crumbs items={[['Home', '/'], ['Shop', '/shop'], [p.name]]}/><div className="two"><Img p={p}/><div>
    <h1>{p.name}</h1><Stars v={avg} n={rs.length}/><p className="price" style={{fontSize:22,margin:'8px 0'}}>{inr(p.price)}</p><p style={{margin:'12px 0 20px'}}>{p.description}</p>
    <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}><div className="step"><button aria-label="Less" onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span>{qty}</span><button aria-label="More" onClick={() => setQty(qty + 1)}>+</button></div>
      <button className="btn" disabled={out} onClick={() => add(p, qty)}>{out ? 'Sold out' : 'Add to bag'}</button>
      <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(location.href).then(() => notify('Link copied'))}>Copy link</button></div>
    <Pincode/><a className="btn ghost sm" style={{marginTop:12}} target="_blank" rel="noreferrer" href={'https://wa.me/?text=' + encodeURIComponent(p.name + ' ' + location.href)}>Share on WhatsApp</a><p className="note">Cosmetic product. Not intended to diagnose or treat any medical condition.</p></div></div>
    <div className="tabs" style={{marginTop:48}}>{['Details','Ingredients','How to use','Q&A','Reviews'].map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t === 'Reviews' ? `Reviews (${rs.length})` : t}</button>)}</div>
    {tab === 'Details' && <p style={{maxWidth:640}}>{p.description}</p>}
    {tab === 'Ingredients' && <p style={{maxWidth:640}}>{p.ingredients || 'Listed on pack.'}</p>}
    {tab === 'How to use' && <p style={{maxWidth:640}}>{HOW}</p>}
    {tab === 'Q&A' && <QA pid={id} user={user}/>}
    {tab === 'Reviews' && <div><select value={rsort} onChange={e => setRsort(e.target.value)} aria-label="Sort reviews" style={{marginBottom:12}}><option value="new">Newest</option><option value="high">Highest rated</option><option value="low">Lowest rated</option></select>{[...rs].sort((a, b) => rsort === 'high' ? b.rating - a.rating : rsort === 'low' ? a.rating - b.rating : b.id - a.id).map(r => <div className="row" key={r.id}><b>{'★'.repeat(r.rating)}</b><div className="grow"><b>{r.user_name}</b><br/>{r.text}</div></div>)}
      {!rs.length && <p>No reviews yet. Be the first to share how it felt.</p>}
      {user ? <div style={{maxWidth:480,marginTop:20}}><select value={rating} onChange={e => setRating(+e.target.value)}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} stars</option>)}</select>
        <textarea rows="3" placeholder="Your review" value={text} onChange={e => setText(e.target.value)} style={{margin:'10px 0'}}/><button className="btn sm" onClick={send}>Post review</button><p className="err">{msg}</p></div>
        : <p className="note"><Link to="/login">Log in</Link> to write a review.</p>}</div>}
    <h2 style={{margin:'56px 0 24px'}}>You may also like</h2><div className="grid">{(all || []).filter(x => x.id !== +id).slice(0, 4).map(x => <Card key={x.id} p={x}/>)}</div>
    <RecentRow/><div className="sticky-add"><b>{p.name} · {inr(p.price)}</b><button className="btn sm" disabled={out} onClick={() => add(p, qty)}>Add to bag</button></div></div>
}
function Wishlist() {
  const {wish} = useStore(), all = useProducts(), list = (all || []).filter(p => wish.includes(p.id))
  return <div className="wrap page"><h1>Wishlist</h1>{all === null ? <Skel/> : list.length ? <div className="grid">{list.map(p => <Card key={p.id} p={p}/>)}</div> : <p>Nothing saved yet. Tap the heart on any product to keep it here.</p>}</div>
}

function Cart() {
  const {cart, setQty, total} = useStore()
  return <div className="wrap page" style={{maxWidth:760}}><h1>Your bag</h1>
    {!cart.length ? <p>Your bag is empty. <Link to="/shop">Browse the collection</Link>.</p> : <><ShipBar total={total}/><CartLines cart={cart} setQty={setQty}/>
      <h2 style={{margin:'24px 0'}}>Subtotal {inr(total)}</h2><Link to="/checkout" className="btn">Checkout</Link></>}</div>
}

function Checkout() {
  const {cart, total, clear, user} = useStore(), nav = useNavigate()
  const [address, setAddress] = useState(''), [gift, setGift] = useState(''), [code, setCode] = useState(''), [off, setOff] = useState(0), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [pts, setPts] = useState(0), [bal, setBal] = useState(0)
  useEffect(() => { if (user) { api('/me').then(m => m.address && setAddress(m.address)).catch(() => {}); api('/points').then(p => setBal(p.balance)).catch(() => {}) } }, [])
  if (!user) return <div className="wrap page"><p>Please <Link to="/login">log in</Link> to check out.</p></div>
  const bundle = cart.length >= 3 ? total * 0.05 : 0, afterC = (total - bundle) * (1 - off / 100), usePts = Math.min(pts, bal, Math.floor(afterC)), after = afterC - usePts, ship = after >= CFG.free ? 0 : CFG.fee, grand = after + ship, gst = after * 18 / 118
  const apply = () => api('/coupons/' + code + '?sub=' + total).then(c => {setOff(c.percent); setErr('')}).catch(e => setErr(e.message))
  const pay = async () => {
    setBusy(true)
    try {
      const o = await api('/orders', {method:'POST', body:{items:cart.map(c => ({id:c.id, qty:c.qty})), address: address + (gift ? '\nGift note: ' + gift : ''), coupon: off ? code : '', points: usePts}})
      const done = async (r = {}) => { await api('/payments/verify', {method:'POST', body:{order_id:o.order_id, ...r}}); clear(); nav('/account') }
      if (!o.razorpay_order_id) return done()
      await new Promise(res => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; document.body.appendChild(s) })
      new window.Razorpay({key:o.key, order_id:o.razorpay_order_id, amount:Math.round(o.total * 100), currency:'INR', name:'MenoGlow',
        handler: r => done({razorpay_payment_id:r.razorpay_payment_id, razorpay_signature:r.razorpay_signature})}).open()
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  return <div className="wrap page"><h1>Checkout</h1><div className="form" style={{margin:'24px 0'}}>
    <textarea rows="4" placeholder="Delivery address and phone number" value={address} onChange={e => setAddress(e.target.value)}/>
    <Addresses pick={setAddress}/><input placeholder="Gift note (optional)" value={gift} onChange={e => setGift(e.target.value)}/>
    <div style={{display:'flex',gap:8}}><input placeholder="Coupon code" value={code} onChange={e => setCode(e.target.value)}/><button className="btn ghost sm" onClick={apply}>Apply</button></div><Offers pick={setCode}/>{bal > 0 && <label>Use points (balance {bal}) <input type="number" min="0" max={bal} value={pts} onChange={e => setPts(+e.target.value)} style={{width:100}}/></label>}
    <div className="sum"><p><span>Subtotal</span><span>{inr(total)}</span></p>{bundle > 0 && <p><span>Bundle saving (3+ items)</span><span>−{inr(bundle.toFixed(0))}</span></p>}{off > 0 && <p><span>Coupon ({off}%)</span><span>−{inr(((total - bundle) * off / 100).toFixed(0))}</span></p>}{usePts > 0 && <p><span>Points</span><span>−{inr(usePts)}</span></p>}
      <p><span>Shipping</span><span>{ship ? inr(ship) : 'Free'}</span></p><p className="note"><span>Includes 18% GST</span><span>{inr(gst.toFixed(2))}</span></p><h2><span>Total {inr(grand.toFixed(2))}</span></h2></div>
    <button className="btn" disabled={!address || !cart.length || busy} onClick={pay}>Place order and pay</button><p className="err">{err}</p></div></div>
}

function Login() {
  const {setUser} = useStore(), nav = useNavigate(), [reg, setReg] = useState(false), [f, setF] = useState({name:'', email:'', password:''}), [err, setErr] = useState('')
  const go = async e => { e.preventDefault(); try { const a = await api(reg ? '/auth/register' : '/auth/login', {method:'POST', body:f}); auth.set(a); setUser(a); nav(a.role === 'admin' ? '/admin' : '/') } catch (x) { setErr(x.message) } }
  const set = k => e => setF({...f, [k]: e.target.value})
  return <form className="form" onSubmit={go}><h1>{reg ? 'Create account' : 'Welcome back'}</h1>
    {reg && <input placeholder="Name" value={f.name} onChange={set('name')}/>}
    <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required/><input type="password" placeholder="Password" value={f.password} onChange={set('password')} required/>
    <button className="btn">{reg ? 'Sign up' : 'Log in'}</button><p className="err">{err}</p>
    <a href="#" onClick={e => {e.preventDefault(); setReg(!reg)}}>{reg ? 'Have an account? Log in' : 'New here? Create an account'}</a></form>
}

function Account() {
  const {user, add, notify} = useStore(), [orders, setO] = useState([]), [me, setMe] = useState({name:'', address:''}), [sh] = useGet('/shipments')
  const load = () => api('/orders/mine').then(setO).catch(() => {})
  useEffect(() => { if (user) { load(); api('/me').then(setMe).catch(() => {}) } }, [])
  if (!user) return <div className="wrap page"><Link to="/login">Log in</Link> to see your account.</div>
  const again = async o => { for (const i of o.items) add(await api('/products/' + i.id), i.qty) }
  return <div className="wrap page"><div className="two"><div><h1>Profile</h1><div className="form" style={{margin:'20px 0'}}>
    <input placeholder="Name" value={me.name} onChange={e => setMe({...me, name:e.target.value})}/><textarea rows="4" placeholder="Saved delivery address" value={me.address} onChange={e => setMe({...me, address:e.target.value})}/>
    <button className="btn" onClick={() => api('/me', {method:'PUT', body:{name:me.name, address:me.address}}).then(() => notify('Profile saved'))}>Save profile</button></div><Rewards/><Addresses/><Password/></div>
    <div><h1>Orders</h1>{!orders.length && <p style={{margin:'20px 0'}}>No orders yet.</p>}
    {orders.map(o => <div className="ocard" key={o.id} style={{marginTop:16}}><div style={{display:'flex',justifyContent:'space-between'}}><b>Order #{o.id} · {new Date(o.created).toLocaleDateString()}</b><b>{inr(o.total)}</b></div><Timeline status={o.status}/>{sh?.[o.id] && <p className="note">Shipped via {sh[o.id].courier}, tracking {sh[o.id].tracking}</p>}
      <div style={{display:'flex',gap:8}}><button className="btn ghost sm" onClick={() => again(o)}>Order again</button><Link className="btn ghost sm" to={'/invoice/' + o.id}>Invoice</Link>{o.status === 'Delivered' && <ReturnBtn id={o.id}/>}
      {o.status === 'Placed' && <button className="btn ghost sm" onClick={() => api('/orders/' + o.id + '/cancel', {method:'POST'}).then(load).catch(e => notify(e.message))}>Cancel order</button>}</div></div>)}</div></div></div>
}

function Quiz() {
  const [a, setA] = useState(JSON.parse(localStorage.getItem('mg_quiz') || 'null') || {skin:'', concern:'', fragrance_free:false}), [res, setRes] = useState()
  const Q = ({k, label, opts}) => <><h3>{label}</h3><div className="opt">{opts.map(([v, t]) => <button key={t} className={a[k] === v ? 'on' : ''} onClick={() => setA({...a, [k]:v})}>{t}</button>)}</div></>
  const ps = res?.products || [], am = ps.filter(p => !/sleep|night/.test(p.tags || '')), pm = ps.filter(p => /sleep|night|dry/.test(p.tags || ''))
  return <div className="wrap page" style={{maxWidth:720}}><h1>Find your routine</h1><p style={{marginBottom:28}}>Three quick questions. We will suggest products and a simple routine that suit your preferences.</p>
    <Q k="skin" label="How does your skin usually feel?" opts={[['dry','Dry or tight'],['sensitive','Sensitive'],['','Comfortable']]}/>
    <Q k="concern" label="What would you like more comfort with?" opts={[['hot','Feeling warm'],['sleep','Evening wind-down'],['dry','Dryness all over']]}/>
    <Q k="fragrance_free" label="Fragrance-free only?" opts={[[true,'Yes'],[false,'No preference']]}/>
    <button className="btn" onClick={() => api('/quiz/recommend', {method:'POST', body:a}).then(r => {setRes(r); localStorage.setItem('mg_quiz', JSON.stringify(a))}).catch(() => setRes({products:FALLBACK.slice(0,3), note:'Offline preview.'}))}>Show my picks</button>
    {res && <><div className="grid" style={{marginTop:32}}>{ps.map(p => <Card key={p.id} p={p}/>)}</div>
      <div className="routine"><div><h3>Morning</h3><ol>{am.map(p => <li key={p.id}>{p.name}</li>)}<li>Daily sunscreen</li></ol></div><div><h3>Evening</h3><ol>{(pm.length ? pm : ps).map(p => <li key={p.id}>{p.name}</li>)}</ol></div></div>
      <p className="note">{res.note}</p></>}</div>
}

const POSTS = [['Why skin changes during menopause','Falling oestrogen can leave skin drier and thinner. Gentle cleansing, ceramide moisturisers and daily sunscreen help skin feel comfortable.'],
  ['Building a calm evening routine','Cleanse, apply a barrier cream, and finish with a night cream. Fewer steps, fewer irritants.'],['Reading an ingredient list','Look for humectants (glycerin), emollients (squalane) and barrier lipids (ceramides). Fragrance-free is kinder to reactive skin.']]
const Blog = () => { const [ps] = useGet('/posts'), list = ps?.length ? ps.map(p => [p.title, p.body]) : POSTS
  return <div className="wrap page" style={{maxWidth:720}}><h1>Learn</h1>{list.map(([t, b]) => <div className="row" key={t} style={{display:'block'}}><h3>{t}</h3><p>{b}</p></div>)}<p className="note">Educational content only. Speak to a doctor about health concerns.</p></div> }
const Contact = () => <div className="wrap page" style={{maxWidth:720}}><h1>Contact</h1><p>Questions about an order or ingredient? Write to <b>care@menoglow.example</b> and we will reply within one working day.</p><h2 style={{margin:'40px 0 0'}}>Common questions</h2><FAQ/></div>

function Admin() {
  const [oq, setOq] = useState('')
  const {user} = useStore(), [tab, setTab] = useState('Dashboard'), [d, setD] = useState({}), [np, setNp] = useState({name:'', category:'Cream', price:'', stock:50, description:'', ingredients:'', tags:'', image_url:''}), [cp, setCp] = useState({code:'', percent:10})
  const prods = useProducts('?all=1&x=' + tab) || []
  const refresh = () => { api('/admin/stats').then(s => setD(d => ({...d, stats:s}))); api('/admin/orders').then(o => setD(d => ({...d, orders:o}))); api('/admin/customers').then(c => setD(d => ({...d, customers:c}))); api('/admin/coupons').then(c => setD(d => ({...d, coupons:c}))); api('/admin/reviews').then(r => setD(d => ({...d, reviews:r}))) }
  useEffect(() => { if (user?.role === 'admin') refresh() }, [tab])
  if (user?.role !== 'admin') return <div className="wrap page"><p>Admin access only. <Link to="/login">Log in</Link> (demo: admin@menoglow.com / admin123).</p></div>
  const {stats = {}, orders = [], customers = [], coupons = [], reviews = []} = d
  const upload = async e => { const f = new FormData(); f.append('f', e.target.files[0]); const a = auth.get(); const r = await fetch(B + '/admin/upload', {method:'POST', body:f, headers:{Authorization:'Bearer ' + a.access_token}}); setNp({...np, image_url:(await r.json()).url}) }
  const csv = () => { const t = 'id,customer,total,status\n' + orders.map(o => [o.id, o.customer, o.total, o.status].join(',')).join('\n'); const u = URL.createObjectURL(new Blob([t])); Object.assign(document.createElement('a'), {href:u, download:'sales-report.csv'}).click() }
  return <div className="wrap page"><h1>Admin</h1>
    <div className="tabs">{['Dashboard','Products','Orders','Customers','Coupons','Reviews','Analytics','Fulfilment','CRM','Promotions','Content','Support','Settings','Data','Audit','Search'].map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'Dashboard' && <><div className="stats"><div className="stat"><b>{inr(stats.revenue || 0)}</b>Revenue (paid)</div><div className="stat"><b>{stats.orders || 0}</b>Orders</div><div className="stat"><b>{stats.customers || 0}</b>Customers</div></div>
      <p>{stats.low_stock?.length ? 'Low stock: ' + stats.low_stock.join(', ') : 'All products well stocked.'}</p><div className="bars">{['Placed','Packed','Shipped','Delivered','Cancelled'].map(t => { const n = orders.filter(o => o.status === t).length; return <div key={t}><span>{n}</span><i style={{height:12 + n * 22}}/>{t}</div> })}</div><button className="btn sm" onClick={csv}>Download sales report</button></>}
    {tab === 'Products' && <><div className="form" style={{margin:'0 0 24px',maxWidth:560}}>
      {['name','price','stock','description','ingredients','tags'].map(k => <input key={k} placeholder={k} value={np[k]} onChange={e => setNp({...np, [k]:e.target.value})}/>)}
      <input type="file" accept="image/*" onChange={upload}/><button className="btn sm" onClick={async () => { await api('/admin/products', {method:'POST', body:{...np, price:+np.price, stock:+np.stock}}); setTab('Dashboard'); setTab('Products') }}>Add product</button></div>
      <table><tbody>{prods.map(p => <PRow key={p.id} p={p} done={() => {setTab('Dashboard'); setTab('Products')}}/>)}</tbody></table></>}
    {tab === 'Orders' && <><input placeholder="Search by order or email" value={oq} onChange={e => setOq(e.target.value)} style={{marginBottom:12}}/><table><tbody>{orders.filter(o => (o.id + o.customer).includes(oq)).map(o => <tr key={o.id}><td>#{o.id}</td><td>{o.customer}</td><td>{inr(o.total)}</td><td>{o.paid ? 'Paid' : 'Unpaid'}</td>
      <td><select value={o.status} onChange={async e => { await api('/admin/orders/' + o.id, {method:'PATCH', body:{status:e.target.value}}); refresh() }}>{['Placed','Packed','Shipped','Delivered','Cancelled'].map(s => <option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></>}
    {tab === 'Customers' && <table><tbody>{customers.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.email}</td></tr>)}</tbody></table>}
    {tab === 'Coupons' && <><div className="tools"><input placeholder="CODE" value={cp.code} onChange={e => setCp({...cp, code:e.target.value})}/><input type="number" value={cp.percent} onChange={e => setCp({...cp, percent:+e.target.value})} style={{width:90}}/><button className="btn sm" onClick={async () => { await api('/admin/coupons', {method:'POST', body:cp}); refresh() }}>Add coupon</button></div>
      <table><tbody>{coupons.map(c => <tr key={c.id}><td>{c.code}</td><td>{c.percent}% off</td></tr>)}</tbody></table></>}
    {tab === 'Reviews' && <table><tbody>{reviews.map(r => <tr key={r.id}><td>{'★'.repeat(r.rating)}</td><td>{r.user_name}</td><td>{r.text}</td></tr>)}</tbody></table>}<AdminPlus tab={tab}/></div>
}

function ComparePage() { const {cmp} = useStore(), all = useProducts(); return <Compare all={all} cmp={cmp}/> }
export default function App() {
  const [cart, setCart] = useState(load('mg_cart', '[]')), [wish, setWish] = useState(load('mg_wish', '[]')), [user, setUser] = useState(auth.get()), [recent, setRecent] = useState(load('mg_recent', '[]'))
  const [theme, setTheme] = useState(localStorage.getItem('mg_theme') || 'light'), [drawer, setDrawer] = useState(false), [msg, setMsg] = useState(''), [cmp, setCmp] = useState(load('mg_cmp', '[]')), [big, setBig] = useState(localStorage.getItem('mg_big') === '1'), [, tick] = useState(0), loc = useLocation()
  useEffect(() => localStorage.setItem('mg_cart', JSON.stringify(cart)), [cart])
  useEffect(() => localStorage.setItem('mg_wish', JSON.stringify(wish)), [wish])
  useEffect(() => localStorage.setItem('mg_recent', JSON.stringify(recent)), [recent])
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('mg_theme', theme) }, [theme])
  useEffect(() => { document.documentElement.classList.toggle('big', big); localStorage.setItem('mg_big', big ? '1' : '0') }, [big])
  useEffect(() => localStorage.setItem('mg_cmp', JSON.stringify(cmp)), [cmp])
  useEffect(() => { api('/settings').then(c => { CFG.free = +c.free_ship; CFG.fee = +c.ship_fee; CFG.announce = c.announcement; tick(t => t + 1) }).catch(() => {}) }, [])
  useEffect(() => { const k = e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { const el = document.getElementById('search'); if (el) { e.preventDefault(); el.focus() } } }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])
  useEffect(() => { document.title = 'MenoGlow · ' + ({shop:'Shop', quiz:'Skin quiz', blog:'Learn', contact:'Contact', cart:'Bag', checkout:'Checkout', account:'Account', admin:'Admin', compare:'Compare', diary:'Skin diary'}[loc.pathname.split('/')[1]] || 'Menopause skin & body care') }, [loc.pathname])
  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 2200) }
  const add = (p, q = 1) => { setCart(c => c.find(x => x.id === p.id) ? c.map(x => x.id === p.id ? {...x, qty:x.qty + q} : x) : [...c, {id:p.id, name:p.name, price:p.price, qty:q}]); notify(p.name + ' added to your bag'); setDrawer(true) }
  const setQty = (id, qty) => setCart(c => c.map(x => x.id === id ? {...x, qty} : x).filter(x => x.qty > 0))
  const seen = p => setRecent(r => [{id:p.id, name:p.name, price:p.price, category:p.category, image_url:p.image_url, stock:p.stock, tags:p.tags, rating:p.rating || 0, reviews:Array.isArray(p.reviews) ? p.reviews.length : p.reviews || 0}, ...r.filter(x => x.id !== p.id)].slice(0, 4))
  const total = cart.reduce((a, c) => a + c.price * c.qty, 0)
  const v = {cart, add, setQty, clear:() => setCart([]), total, wish, toggleWish:id => setWish(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]), user, setUser, logout:() => {auth.set(null); setUser(null)}, theme, setTheme, setDrawer, notify, recent, seen, cmp, toggleCmp:id => setCmp(c => c.includes(id) ? c.filter(x => x !== id) : [...c.slice(-2), id]), big, setBig}
  return <Ctx.Provider value={v}><Nav/><Routes><Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/product/:id" element={<Product/>}/><Route path="/wishlist" element={<Wishlist/>}/><Route path="/compare" element={<ComparePage/>}/><Route path="/diary" element={<Diary/>}/><Route path="/invoice/:id" element={<Invoice/>}/>
    <Route path="/cart" element={<Cart/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/login" element={<Login/>}/><Route path="/account" element={<Account/>}/>
    <Route path="/quiz" element={<Quiz/>}/><Route path="/blog" element={<Blog/>}/><Route path="/contact" element={<Contact/>}/><Route path="/admin" element={<Admin/>}/></Routes>
    <Drawer open={drawer} onClose={() => setDrawer(false)} cart={cart} setQty={setQty} total={total}/><Chatbot/><Cookie/><BackTop/><div className={'toast' + (msg ? ' on' : '')} role="status">{msg}</div>
    <footer><div className="wrap">MenoGlow – cosmetic skin and body care. Not a medical product; it does not diagnose or treat any condition.</div></footer></Ctx.Provider>
}
