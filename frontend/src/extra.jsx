import React, {useCallback, useEffect, useRef, useState} from 'react'
import {Link, useParams} from 'react-router-dom'
import {api, inr} from './api.js'
export const CFG = {free: 999, fee: 49, announce: 'Free shipping over ₹999. Use code GLOW10 for 10% off.'}
export function useGet(path, dep = 0) {
  const [d, setD] = useState(null), load = useCallback(() => api(path).then(setD).catch(() => setD([])), [path])
  useEffect(() => { load() }, [path, dep]); return [d, load]
}
const dl = (n, t) => Object.assign(document.createElement('a'), {href: URL.createObjectURL(new Blob([t])), download: n}).click()
const toCSV = r => r.length ? [Object.keys(r[0]).join(','), ...r.map(x => Object.values(x).map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','))].join('\n') : ''

/* ---------- customer features ---------- */
export const Crumbs = ({items}) => <div className="crumbs">{items.map(([l, to], i) => <span key={l}>{to ? <Link to={to}>{l}</Link> : l}{i < items.length - 1 && ' / '}</span>)}</div>
export const Banners = () => { const [b] = useGet('/banners'); return (b || []).length ? <div className="promo">{b.map(x => <span key={x.id}>{x.text}</span>)}</div> : null }
export function SearchBox({q, setQ, names}) {
  const [open, setOpen] = useState(false), sug = q ? names.filter(n => n.toLowerCase().includes(q.toLowerCase()) && n.toLowerCase() !== q.toLowerCase()).slice(0, 5) : []
  const voice = () => { const R = window.SpeechRecognition || window.webkitSpeechRecognition; if (!R) return alert('Voice search is not supported in this browser'); const r = new R(); r.onresult = e => setQ(e.results[0][0].transcript); r.start() }
  return <div className="sbox"><input id="search" placeholder="Search products  ( / )" value={q} onChange={e => {setQ(e.target.value); setOpen(true)}} onBlur={() => setTimeout(() => setOpen(false), 150)} aria-label="Search"/>
    <button className="icon" aria-label="Voice search" onClick={voice}>🎙</button>
    {open && sug.length > 0 && <ul className="sug">{sug.map(n => <li key={n}><button onClick={() => setQ(n)}>{n}</button></li>)}</ul>}</div>
}
export const NotifyBtn = ({id}) => <button className="btn ghost sm" onClick={() => api('/alerts', {method:'POST', body:{product_id:id}}).then(() => alert('We will notify you when it is back')).catch(e => alert(e.message))}>Notify me</button>
export function Pincode() {
  const [pin, setPin] = useState(''), [m, setM] = useState('')
  const go = () => { if (!/^[1-9]\d{5}$/.test(pin)) return setM('Enter a valid 6-digit pincode'); const d = n => new Date(Date.now() + n * 864e5).toLocaleDateString('en-IN', {day:'numeric', month:'short'}); setM(`Estimated delivery ${d(3)} – ${d(6)}`) }
  return <div className="tools" style={{margin:'16px 0 0'}}><input placeholder="Pincode" maxLength="6" value={pin} onChange={e => setPin(e.target.value)} aria-label="Pincode"/><button className="btn ghost sm" onClick={go}>Check delivery</button><span className="note">{m}</span></div>
}
export function QA({pid, user}) {
  const [qs, load] = useGet('/questions/' + pid), [t, setT] = useState('')
  return <div style={{maxWidth:640}}>{(qs || []).map(x => <div className="row" key={x.id} style={{display:'block'}}><b>Q: {x.q}</b><br/>{x.a ? 'A: ' + x.a : <i>Awaiting an answer</i>}</div>)}
    {user ? <div className="tools"><input placeholder="Ask a question about this product" value={t} onChange={e => setT(e.target.value)} style={{flex:1}}/><button className="btn sm" onClick={() => t && api('/questions', {method:'POST', body:{product_id:+pid, q:t}}).then(() => {setT(''); load()})}>Ask</button></div> : <p className="note">Log in to ask a question.</p>}</div>
}
export function Offers({pick}) {
  const [o] = useGet('/offers')
  return (o || []).length ? <div className="offers">{o.map(c => <button key={c.code} className="chip" onClick={() => pick(c.code)}>{c.code} · {c.percent}% off{c.min_order ? ` over ${inr(c.min_order)}` : ''}</button>)}</div> : null
}
export function Bell() {
  const [n, load] = useGet('/notifications'), [o, setO] = useState(false), un = (n || []).filter(x => !x.seen).length
  return <span className="bell"><button className="icon" aria-label="Notifications" onClick={() => {setO(!o); if (!o && un) api('/notifications/read', {method:'POST'}).then(load)}}>🔔{un > 0 && <b>{un}</b>}</button>
    {o && <div className="pop">{(n || []).length ? n.map(x => <p key={x.id}>{x.text}</p>) : <p>No notifications yet</p>}</div>}</span>
}
export function Rewards() {
  const [p, load] = useGet('/points'), [r] = useGet('/referral'), [c, setC] = useState(''), [m, setM] = useState('')
  return <div className="ocard"><h3>Rewards</h3><p><b>{p?.balance ?? 0}</b> points. 1 point = ₹1 at checkout. Earn 1 point per ₹10 spent.</p>
    <p className="note">Your referral code: <b>{r?.code}</b>. A friend who redeems it gets 50 points, and so do you.</p>
    <div className="tools"><input placeholder="Have a referral code?" value={c} onChange={e => setC(e.target.value)}/><button className="btn ghost sm" onClick={() => api('/referral/redeem', {method:'POST', body:{code:c}}).then(() => {setM('50 points added'); load()}).catch(e => setM(e.message))}>Redeem</button></div><p className="note">{m}</p></div>
}
export function Addresses({pick}) {
  const [a, load] = useGet('/addresses'), [t, setT] = useState('')
  return <div className="ocard"><h3>Address book</h3>{(a || []).map(x => <div className="row" key={x.id}><div className="grow">{x.text}</div>{pick && <button className="btn ghost sm" onClick={() => pick(x.text)}>Use</button>}<button className="icon" aria-label="Delete address" onClick={() => api('/addresses/' + x.id, {method:'DELETE'}).then(load)}>✕</button></div>)}
    <div className="tools"><input placeholder="Add a new address" value={t} onChange={e => setT(e.target.value)} style={{flex:1}}/><button className="btn sm" onClick={() => t && api('/addresses', {method:'POST', body:{text:t}}).then(() => {setT(''); load()})}>Save</button></div></div>
}
export function Password() {
  const [o, setO] = useState(''), [n, setN] = useState(''), [m, setM] = useState('')
  return <div className="ocard"><h3>Change password</h3><div className="tools"><input type="password" placeholder="Current" value={o} onChange={e => setO(e.target.value)}/><input type="password" placeholder="New (6+ characters)" value={n} onChange={e => setN(e.target.value)}/>
    <button className="btn sm" onClick={() => api('/me/password', {method:'POST', body:{old:o, new:n}}).then(() => {setM('Password changed'); setO(''); setN('')}).catch(e => setM(e.message))}>Update</button></div><p className="note">{m}</p></div>
}
export function ReturnBtn({id}) {
  const [m, setM] = useState('')
  return m ? <span className="note">{m}</span> : <button className="btn ghost sm" onClick={() => { const r = prompt('Reason for return or exchange?'); r && api('/returns', {method:'POST', body:{order_id:id, reason:r}}).then(() => setM('Return requested')).catch(e => setM(e.message)) }}>Return / exchange</button>
}
export function Invoice() {
  const {id} = useParams(), [o] = useGet('/orders/mine'), [all] = useGet('/products?all=1'), x = (o || []).find(v => v.id === +id)
  if (!x) return <div className="wrap page"><p>Loading…</p></div>
  const pr = i => (all || []).find(p => p.id === i) || {}
  return <div className="wrap page" style={{maxWidth:640}}><h1>Invoice #{x.id}</h1><p>MenoGlow · {new Date(x.created).toLocaleDateString()}</p><p style={{whiteSpace:'pre-line',margin:'12px 0'}}>{x.address}</p>
    <table><tbody>{x.items.map(i => <tr key={i.id}><td>{pr(i.id).name || 'Item #' + i.id}</td><td>× {i.qty}</td><td>{inr((pr(i.id).price || 0) * i.qty)}</td></tr>)}</tbody></table>
    <h2 style={{margin:'20px 0 4px'}}>Total paid {inr(x.total)}</h2><p className="note">Prices include 18% GST.</p><button className="btn no-print" style={{marginTop:16}} onClick={() => print()}>Print / save as PDF</button></div>
}
export function Compare({all, cmp}) {
  const list = (all || []).filter(p => cmp.includes(p.id))
  return <div className="wrap page"><h1>Compare</h1>{list.length < 2 ? <p>Tick "Compare" on at least two products in the shop (up to three).</p> :
    <div style={{overflowX:'auto'}}><table><thead><tr><th/>{list.map(p => <th key={p.id}>{p.name}</th>)}</tr></thead><tbody>
    {[['Price', p => inr(p.price)], ['Category', p => p.category], ['Rating', p => p.reviews ? p.rating + ' (' + p.reviews + ')' : 'New'], ['Fragrance-free', p => (p.tags || '').includes('fragrance-free') ? 'Yes' : 'No'], ['Ingredients', p => p.ingredients]].map(([l, f]) => <tr key={l}><td><b>{l}</b></td>{list.map(p => <td key={p.id}>{f(p)}</td>)}</tr>)}</tbody></table></div>}</div>
}
export function Diary() {
  const [e, setE] = useState(JSON.parse(localStorage.getItem('mg_diary') || '[]')), [t, setT] = useState(''), [f, setF] = useState('Calm')
  const save = n => { setE(n); localStorage.setItem('mg_diary', JSON.stringify(n)) }
  return <div className="wrap page" style={{maxWidth:680}}><h1>Skin diary</h1><p>Note how your skin feels each day. Entries stay on this device only.</p>
    <div className="tools"><select value={f} onChange={x => setF(x.target.value)} aria-label="Mood">{['Calm','Dry','Warm','Irritated','Glowing'].map(m => <option key={m}>{m}</option>)}</select>
    <input placeholder="Products used, sleep, weather…" value={t} onChange={x => setT(x.target.value)} style={{flex:1}}/><button className="btn sm" onClick={() => {save([{d:new Date().toLocaleDateString(), f, t}, ...e]); setT('')}}>Add</button></div>
    {e.map((x, i) => <div className="row" key={i}><b>{x.d}</b><span className="stars">{x.f}</span><div className="grow">{x.t}</div><button className="icon" aria-label="Delete entry" onClick={() => save(e.filter((_, j) => j !== i))}>✕</button></div>)}</div>
}
export function Cookie() {
  const [s, setS] = useState(localStorage.getItem('mg_ck'))
  return s ? null : <div className="cookie"><span>We only store what your bag and preferences need.</span><button className="btn sm" onClick={() => {localStorage.setItem('mg_ck', 1); setS(1)}}>OK</button></div>
}
export function BackTop() {
  const [v, setV] = useState(false)
  useEffect(() => { const f = () => setV(scrollY > 600); addEventListener('scroll', f); return () => removeEventListener('scroll', f) }, [])
  return v ? <button className="top" aria-label="Back to top" onClick={() => scrollTo({top:0, behavior:'smooth'})}>↑</button> : null
}

/* ---------- admin features ---------- */
const ST = ['Placed', 'Packed', 'Shipped', 'Delivered', 'Cancelled']
const Bars = ({data}) => <div className="bars">{data.map(([l, v]) => <div key={l}><span>{v}</span><i style={{height: 8 + v / Math.max(1, ...data.map(d => d[1])) * 110}}/>{l}</div>)}</div>
function Pager({rows, render, n = 10}) {
  const [pg, setPg] = useState(0), max = Math.ceil(rows.length / n)
  return <>{render(rows.slice(pg * n, pg * n + n))}{max > 1 && <div className="tools"><button className="btn ghost sm" disabled={!pg} onClick={() => setPg(pg - 1)}>Prev</button><span>{pg + 1} / {max}</span><button className="btn ghost sm" disabled={pg + 1 >= max} onClick={() => setPg(pg + 1)}>Next</button></div>}</>
}
function Analytics() {
  const [a, load] = useGet('/admin/analytics')
  if (!a?.kpi) return <p>Loading…</p>
  return <><div className="stats4">{Object.entries(a.kpi).map(([k, v]) => <div className="stat" key={k}><b>{/Revenue|value/.test(k) ? inr(v) : v}</b>{k}</div>)}</div>
    <h3>Revenue, last 7 days</h3><Bars data={a.daily}/><h3>Top products (units)</h3><Bars data={a.top.length ? a.top : [['No sales yet', 0]]}/><h3>Revenue by category</h3><Bars data={a.cat.length ? a.cat : [['No sales yet', 0]]}/>
    <h3>Low stock ({a.low.length})</h3>{a.low.map(x => <p key={x.id}>{x.name}: {x.stock} left</p>)}
    {a.low.length > 0 && <button className="btn sm" onClick={() => api('/admin/restock', {method:'POST', body:{amount:50}}).then(load)}>Restock +50 each</button>}</>
}
function Fulfil() {
  const [o, load] = useGet('/admin/orders'), [all] = useGet('/products?all=1'), [sel, setSel] = useState([]), [q, setQ] = useState(''), [st, setSt] = useState('Packed')
  const nm = i => (all || []).find(p => p.id === i)?.name || '#' + i, rows = (o || []).filter(x => (x.id + x.customer + x.status).toLowerCase().includes(q.toLowerCase()))
  const bulk = async () => { for (const id of sel) await api('/admin/orders/' + id, {method:'PATCH', body:{status:st}}); setSel([]); load() }
  const ship = x => { const c = prompt('Courier name?'), t = c && prompt('Tracking number?'); t && api('/admin/orders/' + x.id + '/ship', {method:'POST', body:{courier:c, tracking:t}}).then(load) }
  const slip = x => { const w = open('', '_blank'); w.document.write(`<h2>Packing slip #${x.id}</h2><p>${x.customer}</p><pre>${x.address}</pre><ul>${x.items.map(i => `<li>${nm(i.id)} × ${i.qty}</li>`).join('')}</ul>`); w.print() }
  return <><div className="tools"><input placeholder="Search orders" value={q} onChange={e => setQ(e.target.value)}/><select value={st} onChange={e => setSt(e.target.value)}>{ST.map(s => <option key={s}>{s}</option>)}</select>
    <button className="btn sm" disabled={!sel.length} onClick={bulk}>Set {sel.length} selected to {st}</button></div>
    <Pager rows={rows} render={r => <table><tbody>{r.map(x => <tr key={x.id}><td><input type="checkbox" aria-label="Select order" checked={sel.includes(x.id)} onChange={() => setSel(s => s.includes(x.id) ? s.filter(i => i !== x.id) : [...s, x.id])}/></td>
      <td>#{x.id}</td><td>{x.customer}</td><td>{x.items.map(i => nm(i.id) + ' ×' + i.qty).join(', ')}</td><td>{inr(x.total)}</td><td>{x.status}</td>
      <td><button className="btn ghost sm" onClick={() => ship(x)}>Ship</button> <button className="btn ghost sm" onClick={() => slip(x)}>Slip</button></td></tr>)}</tbody></table>}/></>
}
function CRM() {
  const [c, load] = useGet('/admin/customers2'), [q, setQ] = useState('')
  const act = (id, p, body) => api(`/admin/customers/${id}/${p}`, {method:'POST', body}).then(load).catch(e => alert(e.message))
  const rows = (c || []).filter(x => (x.name + x.email).toLowerCase().includes(q.toLowerCase()))
  return <><input placeholder="Search customers" value={q} onChange={e => setQ(e.target.value)} style={{marginBottom:12}}/>
    <Pager rows={rows} render={r => <table><thead><tr><th>Customer</th><th>Orders</th><th>Spent</th><th>Points</th><th>Segment</th><th/></tr></thead><tbody>{r.map(x => <tr key={x.id}><td>{x.name}<br/><small>{x.email}</small></td><td>{x.orders}</td><td>{inr(x.spent)}</td><td>{x.points}</td><td>{x.segment}{x.blocked ? ' · Blocked' : ''}{x.role === 'admin' ? ' · Admin' : ''}</td>
      <td><button className="btn ghost sm" onClick={() => act(x.id, 'block')}>{x.blocked ? 'Unblock' : 'Block'}</button> <button className="btn ghost sm" onClick={() => act(x.id, 'role')}>{x.role === 'admin' ? 'Remove admin' : 'Make admin'}</button> <button className="btn ghost sm" onClick={() => { const p = prompt('Temporary password (6+ characters)'); p && act(x.id, 'reset', {password:p}) }}>Reset password</button></td></tr>)}</tbody></table>}/></>
}
function Promos() {
  const [c, load] = useGet('/admin/coupons2'), [b, lb] = useGet('/admin/banners'), [f, setF] = useState({code:'', percent:10, min_order:0, expires:'', max_uses:0}), [bt, setBt] = useState('')
  return <><h3>Coupons</h3><div className="tools">{[['code', 'Code'], ['percent', '% off'], ['min_order', 'Min order'], ['expires', 'Expiry YYYY-MM-DD'], ['max_uses', 'Max uses']].map(([k, p]) => <input key={k} placeholder={p} value={f[k]} onChange={e => setF({...f, [k]:e.target.value})} style={{width:k === 'expires' ? 170 : 110}}/>)}
    <button className="btn sm" onClick={() => api('/admin/coupon-rules', {method:'POST', body:{...f, percent:+f.percent, min_order:+f.min_order, max_uses:+f.max_uses}}).then(load)}>Save coupon</button></div>
    <table><tbody>{(c || []).map(x => <tr key={x.id}><td>{x.code}</td><td>{x.percent}%</td><td>Min {inr(x.min_order)}</td><td>{x.expires || 'No expiry'}</td><td>{x.uses}/{x.max_uses || '∞'} used</td><td><button className="btn ghost sm" onClick={() => api('/admin/coupons/' + x.id, {method:'DELETE'}).then(load)}>Delete</button></td></tr>)}</tbody></table>
    <h3 style={{marginTop:32}}>Home banners</h3><div className="tools"><input placeholder="Banner text" value={bt} onChange={e => setBt(e.target.value)} style={{flex:1}}/><button className="btn sm" onClick={() => bt && api('/admin/banners', {method:'POST', body:{text:bt}}).then(() => {setBt(''); lb()})}>Add</button></div>
    {(b || []).map(x => <div className="row" key={x.id}><div className="grow">{x.text}</div><button className="btn ghost sm" onClick={() => api('/admin/banners/' + x.id + '/toggle', {method:'POST'}).then(lb)}>{x.active ? 'Hide' : 'Show'}</button><button className="btn ghost sm" onClick={() => api('/admin/banners/' + x.id, {method:'DELETE'}).then(lb)}>Delete</button></div>)}</>
}
function Content() {
  const [p, load] = useGet('/posts'), [f, setF] = useState({title:'', body:''})
  return <><div className="form" style={{margin:'0 0 24px',maxWidth:560}}><input placeholder="Title" value={f.title} onChange={e => setF({...f, title:e.target.value})}/><textarea rows="4" placeholder="Article text" value={f.body} onChange={e => setF({...f, body:e.target.value})}/>
    <button className="btn sm" onClick={() => f.title && api('/admin/posts', {method:'POST', body:f}).then(() => {setF({title:'', body:''}); load()})}>Publish article</button></div>
    {(p || []).map(x => <div className="row" key={x.id}><div className="grow"><b>{x.title}</b></div><button className="btn ghost sm" onClick={() => api('/admin/posts/' + x.id, {method:'DELETE'}).then(load)}>Delete</button></div>)}</>
}
function Support() {
  const [r, lr] = useGet('/admin/reviews'), [q, lq] = useGet('/admin/questions'), [t, lt] = useGet('/admin/returns')
  return <><h3>Returns</h3>{(t || []).map(x => <div className="row" key={x.id}><div className="grow">Order #{x.order_id}: {x.reason}<br/><small>{x.status}</small></div>{['Approved', 'Rejected', 'Refunded'].map(s => <button key={s} className="btn ghost sm" onClick={() => api('/admin/returns/' + x.id, {method:'PATCH', body:{status:s}}).then(lt)}>{s}</button>)}</div>)}
    <h3 style={{marginTop:32}}>Product questions</h3>{(q || []).map(x => <div className="row" key={x.id}><div className="grow">{x.user_name}: {x.q}<br/><small>{x.a || 'Unanswered'}</small></div><button className="btn sm" onClick={() => { const a = prompt('Your answer'); a && api('/admin/questions/' + x.id, {method:'POST', body:{a}}).then(lq) }}>Answer</button></div>)}
    <h3 style={{marginTop:32}}>Reviews</h3>{(r || []).map(x => <div className="row" key={x.id}><b>{'★'.repeat(x.rating)}</b><div className="grow">{x.user_name}: {x.text}</div><button className="btn ghost sm" onClick={() => api('/admin/reviews/' + x.id, {method:'DELETE'}).then(lr)}>Remove</button></div>)}</>
}
function Settings() {
  const [s] = useGet('/settings'), [f, setF] = useState(null)
  useEffect(() => { if (s && !Array.isArray(s)) setF(s) }, [s])
  if (!f) return null
  return <div className="form" style={{margin:0,maxWidth:560}}>{[['announcement', 'Announcement bar text'], ['free_ship', 'Free shipping above (₹)'], ['ship_fee', 'Shipping fee (₹)']].map(([k, l]) => <label key={k}>{l}<input value={f[k]} onChange={e => setF({...f, [k]:e.target.value})} style={{width:'100%'}}/></label>)}
    <button className="btn" onClick={async () => { for (const k of Object.keys(f)) await api('/admin/settings', {method:'PUT', body:{key:k, value:String(f[k])}}); alert('Saved. Customers see it on their next reload.') }}>Save settings</button></div>
}
function Data() {
  const [subs] = useGet('/admin/subscribers'), [msg, setMsg] = useState('')
  const exp = async (n, p) => dl(n + '.csv', toCSV(await api(p)))
  const imp = async e => { const L = (await e.target.files[0].text()).trim().split('\n').slice(1); let n = 0; for (const l of L) { const [name, category, price, stock, description, ingredients, tags] = l.split(','); await api('/admin/products', {method:'POST', body:{name, category, price:+price, stock:+stock, description, ingredients, tags}}); n++ } setMsg(n + ' products imported') }
  return <div><div className="tools">{[['products', '/products?all=1'], ['orders', '/admin/orders'], ['customers', '/admin/customers2'], ['subscribers', '/admin/subscribers']].map(([n, p]) => <button key={n} className="btn sm" onClick={() => exp(n, p)}>Export {n}</button>)}
    <button className="btn ghost sm" onClick={async () => dl('menoglow-backup.json', JSON.stringify(await api('/admin/export'), null, 2))}>Full JSON backup</button></div>
    <h3 style={{margin:'24px 0 8px'}}>Import products (CSV)</h3><p className="note">Columns: name,category,price,stock,description,ingredients,tags (no commas inside values).</p><input type="file" accept=".csv" onChange={imp}/><p>{msg}</p>
    <h3 style={{margin:'24px 0 8px'}}>Subscribers ({(subs || []).length})</h3>{(subs || []).map(x => <p key={x.id}>{x.email}</p>)}</div>
}
const Audit = () => { const [a] = useGet('/admin/audit'); return <table><tbody>{(a || []).map(x => <tr key={x.id}><td>{new Date(x.created).toLocaleString()}</td><td>{x.actor}</td><td>{x.action}</td></tr>)}</tbody></table> }
function GSearch() {
  const [q, setQ] = useState(''), [o] = useGet('/admin/orders'), [c] = useGet('/admin/customers2'), [p] = useGet('/products?all=1'), t = q.toLowerCase()
  const f = (a, fn) => t.length > 1 ? (a || []).filter(x => fn(x).toLowerCase().includes(t)).slice(0, 8) : []
  return <><input placeholder="Search orders, customers, products" value={q} onChange={e => setQ(e.target.value)} style={{width:'100%',marginBottom:16}}/>
    <h3>Orders</h3>{f(o, x => x.id + x.customer + x.status).map(x => <p key={x.id}>#{x.id} · {x.customer} · {x.status} · {inr(x.total)}</p>)}
    <h3>Customers</h3>{f(c, x => x.name + x.email).map(x => <p key={x.id}>{x.name} · {x.email}</p>)}
    <h3>Products</h3>{f(p, x => x.name + x.category + (x.tags || '')).map(x => <p key={x.id}>{x.name} · {inr(x.price)} · stock {x.stock}</p>)}</>
}
export function AdminPlus({tab}) { const T = {Analytics, Fulfilment:Fulfil, CRM, Promotions:Promos, Content, Support, Settings, Data, Audit, Search:GSearch}[tab]; return T ? <T/> : null }
