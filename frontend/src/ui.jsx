import React, {useEffect, useRef, useState} from 'react'
import {Link} from 'react-router-dom'
import {api, inr} from './api.js'
import {CFG} from './extra.jsx'
export const Stars = ({v = 0, n = 0}) => n ? <span className="stars" aria-label={`${v} out of 5 stars`}>{'★'.repeat(Math.round(v))}{'☆'.repeat(5 - Math.round(v))} <small>({n})</small></span> : <span className="stars"><small>New</small></span>
export const Skel = () => <div className="grid">{[1,2,3,4].map(i => <div className="card sk" key={i}><div className="img"/><div className="body"><i/><i style={{width:'50%'}}/></div></div>)}</div>
export const ShipBar = ({total}) => <div className="ship"><p>{CFG.free - total > 0 ? `Add ${inr(CFG.free - total)} more for free shipping` : 'You have free shipping'}</p><div><i style={{width: Math.min(100, total / CFG.free * 100) + '%'}}/></div></div>
export const CartLines = ({cart, setQty}) => cart.map(c => <div className="row" key={c.id}><div className="grow"><b>{c.name}</b><br/>{inr(c.price)}</div>
  <div className="step"><button aria-label="Less" onClick={() => setQty(c.id, c.qty - 1)}>−</button><span>{c.qty}</span><button aria-label="More" onClick={() => setQty(c.id, c.qty + 1)}>+</button></div></div>)
export function Drawer({open, onClose, cart, setQty, total}) {
  useEffect(() => { const k = e => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])
  return <><div className={'scrim' + (open ? ' on' : '')} onClick={onClose}/><aside className={'drawer' + (open ? ' on' : '')} aria-hidden={!open} aria-label="Shopping bag">
    <div className="dh"><h3>Your bag</h3><button className="icon" aria-label="Close bag" onClick={onClose}>✕</button></div>
    {cart.length ? <><ShipBar total={total}/><div className="dl"><CartLines cart={cart} setQty={setQty}/></div>
      <div className="df"><b>Subtotal {inr(total)}</b><Link to="/checkout" className="btn" onClick={onClose}>Checkout</Link></div></> : <p style={{padding:24}}>Your bag is empty.</p>}</aside></>
}
const STEPS = ['Placed', 'Packed', 'Shipped', 'Delivered']
export const Timeline = ({status}) => status === 'Cancelled' ? <p className="err">Cancelled</p> : <ol className="tl">{STEPS.map((s, i) => <li key={s} className={i <= STEPS.indexOf(status) ? 'on' : ''}>{s}</li>)}</ol>
const QA = [['How long does delivery take?', 'Orders ship in 1–2 working days and usually arrive in 3–6 days across India.'],
  ['Which products are fragrance-free?', 'The Cooling Mist and the Barrier Repair Cream. Look for the Fragrance-free badge on product cards.'],
  ['Can I return a product?', 'Unopened products can be returned within 7 days of delivery.'],
  ['Do MenoGlow products treat menopause symptoms?', 'No. They are cosmetic products for skin comfort and hydration. Please speak to a doctor about health concerns.'],
  ['Should I patch-test?', 'Yes. Apply a small amount to your inner arm and wait 24 hours before first use.']]
export const FAQ = () => { const [o, setO] = useState(-1); return <div className="faq">{QA.map(([q, a], i) => <div key={q}><button aria-expanded={o === i} onClick={() => setO(o === i ? -1 : i)}>{q}<span>{o === i ? '−' : '+'}</span></button>{o === i && <p>{a}</p>}</div>)}</div> }
export function Newsletter() {
  const [e, setE] = useState(''), [m, setM] = useState('')
  return <div className="news"><h2>Skin notes, once a month</h2><p>Routine tips and new arrivals. No spam.</p>
    <div className="tools" style={{justifyContent:'center'}}><input type="email" placeholder="Your email" aria-label="Email" value={e} onChange={x => setE(x.target.value)}/>
    <button className="btn" onClick={() => api('/newsletter', {method:'POST', body:{email:e}}).then(() => {setM('You are subscribed.'); setE('')}).catch(x => setM(x.message))}>Subscribe</button></div><p className="note">{m}</p></div>
}
const KB = [[/doctor|medic|treat|cure|diagnos|hormone|symptom|hrt/, 'I cannot give medical advice or say a product treats a symptom. Please speak to a doctor about health concerns. I can help with products and routines.'],
  [/hot|warm|flush|cool|mist/, 'The Cooling Mist is a fragrance-free spray for face and body. Keep it in the fridge for an extra cool feel.'],
  [/dry|tight|hydrat|balm|lotion/, 'For dryness, try the Hydrating Balm on face and rough areas, and the Body Lotion daily after bathing.'],
  [/sensitive|irritat|redness|barrier/, 'The Barrier Repair Cream has ceramides and niacinamide and is fragrance-free. Patch-test first.'],
  [/night|sleep|evening/, 'The Night Recovery Cream is made for your evening routine. Apply after cleansing.'],
  [/fragrance|scent|perfume/, 'The Cooling Mist and the Barrier Repair Cream are fragrance-free.'],
  [/ship|deliver/, 'Shipping is free over ₹999, otherwise ₹49. Orders ship in 1–2 working days.'],
  [/return|refund/, 'Unopened products can be returned within 7 days.'],
  [/ingredient/, 'Each product page lists the full ingredients under the Ingredients tab.'],
  [/coupon|discount|code/, 'Use code GLOW10 for 10% off at checkout.']]
export function Chatbot() {
  const [open, setOpen] = useState(false), [t, setT] = useState(''), [log, setLog] = useState([['bot', 'Hi! Ask me about products, routines, shipping or returns.']]), end = useRef()
  useEffect(() => { end.current?.scrollIntoView() }, [log])
  const send = e => { e.preventDefault(); if (!t.trim()) return; const hit = KB.find(([r]) => r.test(t.toLowerCase()))
    setLog(l => [...l, ['me', t], ['bot', hit ? hit[1] : 'I am not sure about that. Try asking about dryness, sensitivity, shipping or returns, or take the skin quiz.']]); setT('') }
  return <>{open && <div className="chat" role="dialog" aria-label="Skincare assistant"><div className="dh"><h3>Skincare assistant</h3><button className="icon" aria-label="Close chat" onClick={() => setOpen(false)}>✕</button></div>
    <div className="cl">{log.map(([w, m], i) => <p key={i} className={w}>{m}</p>)}<div ref={end}/></div><form onSubmit={send}><input value={t} onChange={e => setT(e.target.value)} placeholder="Ask a question" aria-label="Message"/></form></div>}
    <button className="fab btn" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Ask us'}</button></>
}
export function PRow({p, done}) {
  const [price, setPrice] = useState(p.price), [stock, setStock] = useState(p.stock)
  const has = t => (p.tags || '').split(',').includes(t)
  const put = b => api('/admin/products/' + p.id, {method:'PUT', body:{...p, ...b}}).then(done)
  const tog = t => { const a = (p.tags || '').split(',').filter(Boolean); put({tags: (has(t) ? a.filter(x => x !== t) : [...a, t]).join(',')}) }
  return <tr style={has('hidden') ? {opacity:.5} : {}}><td>{p.name}</td><td><input type="number" value={price} onChange={e => setPrice(e.target.value)} style={{width:90}}/></td><td><input type="number" value={stock} onChange={e => setStock(e.target.value)} style={{width:80}}/></td>
    <td><button className="btn sm" onClick={() => put({price:+price, stock:+stock})}>Save</button> <button className="btn ghost sm" onClick={() => tog('hidden')}>{has('hidden') ? 'Show' : 'Hide'}</button> <button className="btn ghost sm" onClick={() => tog('featured')}>{has('featured') ? 'Unpin' : 'Pin'}</button>
    <button className="btn ghost sm" onClick={() => api('/admin/products', {method:'POST', body:{...p, name:p.name + ' (copy)', tags:'hidden'}}).then(done)}>Clone</button> <button className="btn ghost sm" onClick={() => api('/admin/products/' + p.id, {method:'DELETE'}).then(done)}>Delete</button></td></tr>
}
