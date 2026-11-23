const B = import.meta.env.VITE_API || 'http://localhost:8000'
export const auth = { get: () => JSON.parse(localStorage.getItem('mg_auth') || 'null'), set: v => v ? localStorage.setItem('mg_auth', JSON.stringify(v)) : localStorage.removeItem('mg_auth') }
export async function api(path, { method = 'GET', body } = {}) {
  const a = auth.get()
  const r = await fetch(B + path, { method, body: body && JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(a ? { Authorization: 'Bearer ' + a.access_token } : {}) } })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Something went wrong')
  return r.json()
}
export const inr = n => '₹' + Number(n).toLocaleString('en-IN')
