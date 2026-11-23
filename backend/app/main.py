import os, hmac, hashlib, datetime as dt
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, ForeignKey, DateTime, JSON, func
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from passlib.context import CryptContext
from jose import jwt, JWTError

SECRET = os.getenv("JWT_SECRET", "dev-secret")
engine = create_engine(os.getenv("DATABASE_URL", "sqlite:///./menoglow.db"), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
pwd = CryptContext(schemes=["bcrypt"])
oauth = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True); name = Column(String(100)); email = Column(String(150), unique=True)
    password = Column(String(200)); role = Column(String(20), default="customer"); address = Column(Text, default="")
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True); name = Column(String(150)); category = Column(String(60))
    price = Column(Float); stock = Column(Integer, default=50); description = Column(Text); ingredients = Column(Text)
    tags = Column(String(200), default=""); image_url = Column(String(500), default="")
class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True); user_id = Column(Integer, ForeignKey("users.id"))
    items = Column(JSON); total = Column(Float); address = Column(Text); status = Column(String(30), default="Placed")
    paid = Column(Integer, default=0); rzp_order_id = Column(String(80), default=""); created = Column(DateTime, default=dt.datetime.utcnow)
class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True); product_id = Column(Integer, ForeignKey("products.id"))
    user_name = Column(String(100)); rating = Column(Integer); text = Column(Text)
class Coupon(Base):
    __tablename__ = "coupons"
    id = Column(Integer, primary_key=True); code = Column(String(30), unique=True); percent = Column(Integer)

class Subscriber(Base):
    __tablename__ = "subscribers"
    id = Column(Integer, primary_key=True); email = Column(String(150), unique=True)

def db():
    s = SessionLocal()
    try: yield s
    finally: s.close()
def user(tok: str = Depends(oauth), s: Session = Depends(db)):
    try: u = s.get(User, int(jwt.decode(tok, SECRET, algorithms=["HS256"])["sub"]))
    except Exception: u = None
    if not u: raise HTTPException(401, "Please log in")
    return u
def admin(u: User = Depends(user)):
    if u.role != "admin": raise HTTPException(403, "Admin only")
    return u
def row(o): return {c.name: getattr(o, c.name) for c in o.__table__.columns}

app = FastAPI(title="MenoGlow API")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "*").split(","), allow_methods=["*"], allow_headers=["*"])

SEED = [
 ("MenoGlow Cooling Mist", "Mist", 499, "Refreshing facial and body spray for moments of warmth.", "Aloe vera, cucumber extract, glycerin, rose water", "cooling,fragrance-free,hot"),
 ("MenoGlow Hydrating Balm", "Balm", 649, "Intensive moisturising balm for dry, tight-feeling skin.", "Shea butter, squalane, ceramides, vitamin E", "dry,balm"),
 ("MenoGlow Barrier Repair Cream", "Cream", 799, "Comforting moisturiser for sensitive skin.", "Ceramide NP, niacinamide, panthenol, oat extract", "sensitive,fragrance-free"),
 ("MenoGlow Body Lotion", "Body", 549, "Daily hydration for dry skin from neck to toe.", "Glycerin, jojoba oil, hyaluronic acid, allantoin", "dry,body"),
 ("MenoGlow Night Recovery Cream", "Cream", 899, "Overnight moisturising care that leaves skin soft by morning.", "Squalane, peptides, shea butter, bisabolol", "sleep,night,dry"),
]
@app.on_event("startup")
def start():
    Base.metadata.create_all(engine); s = SessionLocal()
    if not s.query(Product).count():
        for n, c, p, d, i, t in SEED: s.add(Product(name=n, category=c, price=p, description=d, ingredients=i, tags=t))
        s.add(User(name="Admin", email="admin@menoglow.com", password=pwd.hash(os.getenv("ADMIN_PASSWORD", "admin123")), role="admin"))
        s.add(Coupon(code="GLOW10", percent=10)); s.commit()
    s.close()

class Reg(BaseModel): name: str = ""; email: str; password: str
@app.post("/auth/register")
def register(b: Reg, s: Session = Depends(db)):
    if s.query(User).filter_by(email=b.email).first(): raise HTTPException(400, "Email already registered")
    u = User(name=b.name, email=b.email, password=pwd.hash(b.password)); s.add(u); s.commit()
    return token(u)
def token(u): return {"access_token": jwt.encode({"sub": str(u.id)}, SECRET, "HS256"), "name": u.name, "role": u.role}
class Login(BaseModel): email: str; password: str
@app.post("/auth/login")
def login(b: Login, s: Session = Depends(db)):
    u = s.query(User).filter_by(email=b.email).first()
    if not u or not pwd.verify(b.password, u.password): raise HTTPException(401, "Wrong email or password")
    if s.get(Blocked, u.id): raise HTTPException(403, "This account has been disabled")
    return token(u)
class Profile(BaseModel): name: str; address: str = ""
@app.put("/me")
def me(b: Profile, u: User = Depends(user), s: Session = Depends(db)):
    u.name, u.address = b.name, b.address; s.commit(); return {"ok": True}

@app.get("/me")
def get_me(u: User = Depends(user)): return {"name": u.name, "email": u.email, "address": u.address or ""}

@app.get("/products")
def products(q: str = "", category: str = "", sort: str = "", all: int = 0, s: Session = Depends(db)):
    qs = s.query(Product)
    if not all: qs = qs.filter(~Product.tags.contains("hidden"))
    if q: qs = qs.filter(Product.name.contains(q) | Product.description.contains(q))
    if category: qs = qs.filter_by(category=category)
    if sort == "price_asc": qs = qs.order_by(Product.price)
    if sort == "price_desc": qs = qs.order_by(Product.price.desc())
    st = {pid: (round(float(a or 0), 1), c) for pid, a, c in s.query(Review.product_id, func.avg(Review.rating), func.count()).group_by(Review.product_id)}
    return [{**row(p), "rating": st.get(p.id, (0, 0))[0], "reviews": st.get(p.id, (0, 0))[1]} for p in qs]
@app.get("/products/{pid}")
def product(pid: int, s: Session = Depends(db)):
    p = s.get(Product, pid)
    if not p: raise HTTPException(404, "Product not found")
    r = s.query(Review).filter_by(product_id=pid).all()
    return {**row(p), "reviews": [row(x) for x in r]}
class PIn(BaseModel):
    name: str; category: str; price: float; stock: int = 50; description: str = ""; ingredients: str = ""; tags: str = ""; image_url: str = ""
@app.post("/admin/products")
def add_p(b: PIn, _=Depends(admin), s: Session = Depends(db)):
    p = Product(**b.dict()); s.add(p); s.commit(); return row(p)
@app.put("/admin/products/{pid}")
def edit_p(pid: int, b: PIn, _=Depends(admin), s: Session = Depends(db)):
    p = s.get(Product, pid); was = p.stock
    for k, v in b.dict().items(): setattr(p, k, v)
    if was < 1 and p.stock > 0:
        for a in s.query(Alert).filter_by(product_id=pid): s.add(Notice(user_id=a.user_id, text=f"{p.name} is back in stock")); s.delete(a)
    s.commit(); return row(p)
@app.delete("/admin/products/{pid}")
def del_p(pid: int, _=Depends(admin), s: Session = Depends(db)):
    s.delete(s.get(Product, pid)); s.commit(); return {"ok": True}
@app.post("/admin/upload")
async def upload(f: UploadFile = File(...), _=Depends(admin)):
    import cloudinary.uploader  # needs CLOUDINARY_URL
    return {"url": cloudinary.uploader.upload(await f.read())["secure_url"]}

class Rev(BaseModel): product_id: int; rating: int; text: str = ""
@app.post("/reviews")
def review(b: Rev, u: User = Depends(user), s: Session = Depends(db)):
    s.add(Review(product_id=b.product_id, user_name=u.name, rating=min(5, max(1, b.rating)), text=b.text)); s.commit(); return {"ok": True}
@app.get("/admin/reviews")
def reviews(_=Depends(admin), s: Session = Depends(db)): return [row(r) for r in s.query(Review)]

@app.get("/coupons/{code}")
def coupon(code: str, sub: float = 0, s: Session = Depends(db)):
    c = s.query(Coupon).filter_by(code=code.upper()).first()
    if not c: raise HTTPException(404, "Invalid coupon")
    check_rule(s, c.code, sub)
    return row(c)
class CIn(BaseModel): code: str; percent: int
@app.post("/admin/coupons")
def add_c(b: CIn, _=Depends(admin), s: Session = Depends(db)):
    s.add(Coupon(code=b.code.upper(), percent=b.percent)); s.commit(); return {"ok": True}
@app.get("/admin/coupons")
def list_c(_=Depends(admin), s: Session = Depends(db)): return [row(c) for c in s.query(Coupon)]

class OIn(BaseModel): items: list; address: str; coupon: str = ""; points: int = 0
@app.post("/orders")
def order(b: OIn, u: User = Depends(user), s: Session = Depends(db)):
    total = 0
    for i in b.items:
        p = s.get(Product, i["id"])
        if p.stock < i["qty"]: raise HTTPException(400, f"{p.name} is out of stock")
        total += p.price * i["qty"]; p.stock -= i["qty"]
    sub = total
    if len(b.items) >= 3: total *= 0.95  # bundle saving
    c = s.query(Coupon).filter_by(code=b.coupon.upper()).first()
    if c:
        check_rule(s, c.code, sub); total *= 1 - c.percent / 100
        rl = s.query(Rule).filter_by(code=c.code).first()
        if rl: rl.uses += 1
    pts = min(max(b.points, 0), balance(s, u.id), int(total))
    if pts: total -= pts; s.add(Ledger(user_id=u.id, delta=-pts, note="Redeemed"))
    if total < float(setting(s, "free_ship", 999)): total += float(setting(s, "ship_fee", 49))
    o = Order(user_id=u.id, items=b.items, total=round(total, 2), address=b.address); s.add(o); s.commit()
    rid = ""
    if os.getenv("RAZORPAY_KEY_ID"):
        import razorpay
        rid = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))).order.create(
            {"amount": int(o.total * 100), "currency": "INR", "receipt": f"mg{o.id}"})["id"]
        o.rzp_order_id = rid; s.commit()
    return {"order_id": o.id, "total": o.total, "razorpay_order_id": rid, "key": os.getenv("RAZORPAY_KEY_ID", "")}
class Pay(BaseModel): order_id: int; razorpay_payment_id: str = ""; razorpay_signature: str = ""
@app.post("/payments/verify")
def verify(b: Pay, u: User = Depends(user), s: Session = Depends(db)):
    o = s.get(Order, b.order_id)
    if o.user_id != u.id: raise HTTPException(403, "Not your order")
    if o.rzp_order_id:
        mac = hmac.new(os.getenv("RAZORPAY_KEY_SECRET", "").encode(), f"{o.rzp_order_id}|{b.razorpay_payment_id}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(mac, b.razorpay_signature): raise HTTPException(400, "Payment verification failed")
    if not o.paid:
        s.add(Ledger(user_id=u.id, delta=int(o.total // 10), note=f"Order #{o.id}")); s.add(Notice(user_id=u.id, text=f"Order #{o.id} confirmed. Thank you!"))
    o.paid = 1; s.commit(); return {"ok": True}
@app.get("/orders/mine")
def mine(u: User = Depends(user), s: Session = Depends(db)):
    return [row(o) for o in s.query(Order).filter_by(user_id=u.id).order_by(Order.id.desc())]
@app.get("/admin/orders")
def all_orders(_=Depends(admin), s: Session = Depends(db)):
    return [{**row(o), "customer": (s.get(User, o.user_id).email)} for o in s.query(Order).order_by(Order.id.desc())]
class St(BaseModel): status: str
@app.patch("/admin/orders/{oid}")
def status(oid: int, b: St, a: User = Depends(admin), s: Session = Depends(db)):
    o = s.get(Order, oid); o.status = b.status; s.add(Notice(user_id=o.user_id, text=f"Order #{oid} is now {b.status}")); audit(s, a, f"Order {oid} -> {b.status}"); return {"ok": True}
@app.get("/admin/customers")
def customers(_=Depends(admin), s: Session = Depends(db)):
    return [{"id": u.id, "name": u.name, "email": u.email} for u in s.query(User).filter_by(role="customer")]
@app.get("/admin/stats")
def stats(_=Depends(admin), s: Session = Depends(db)):
    return {"revenue": s.query(func.coalesce(func.sum(Order.total), 0)).filter(Order.paid == 1).scalar(),
            "orders": s.query(Order).count(), "customers": s.query(User).filter_by(role="customer").count(),
            "low_stock": [p.name for p in s.query(Product).filter(Product.stock < 10)]}

class Quiz(BaseModel): skin: str = ""; concern: str = ""; fragrance_free: bool = False
@app.post("/quiz/recommend")
def recommend(b: Quiz, s: Session = Depends(db)):
    want = {b.skin, b.concern} | ({"fragrance-free"} if b.fragrance_free else set())
    ranked = sorted(s.query(Product), key=lambda p: -len(want & set(p.tags.split(","))))[:3]
    return {"products": [row(p) for p in ranked],
            "note": "These are cosmetic suggestions based on your preferences. They are not medical advice and do not treat menopause symptoms."}

@app.post("/orders/{oid}/cancel")
def cancel(oid: int, u: User = Depends(user), s: Session = Depends(db)):
    o = s.get(Order, oid)
    if not o or o.user_id != u.id: raise HTTPException(404, "Order not found")
    if o.status != "Placed": raise HTTPException(400, "Only new orders can be cancelled")
    for i in o.items: s.get(Product, i["id"]).stock += i["qty"]
    o.status = "Cancelled"; s.commit(); return {"ok": True}
class Sub(BaseModel): email: str
@app.post("/newsletter")
def newsletter(b: Sub, s: Session = Depends(db)):
    if "@" not in b.email: raise HTTPException(400, "Enter a valid email")
    if not s.query(Subscriber).filter_by(email=b.email).first(): s.add(Subscriber(email=b.email)); s.commit()
    return {"ok": True}

# ===================== v3 extensions (new tables only) =====================
class Ledger(Base):
    __tablename__ = "points_ledger"
    id = Column(Integer, primary_key=True); user_id = Column(Integer, index=True); delta = Column(Integer); note = Column(String(100))
class Addr(Base):
    __tablename__ = "addresses"
    id = Column(Integer, primary_key=True); user_id = Column(Integer, index=True); text = Column(Text)
class Alert(Base):
    __tablename__ = "stock_alerts"
    id = Column(Integer, primary_key=True); user_id = Column(Integer); product_id = Column(Integer)
class Notice(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True); user_id = Column(Integer, index=True); text = Column(String(250)); seen = Column(Integer, default=0); created = Column(DateTime, default=dt.datetime.utcnow)
class Ret(Base):
    __tablename__ = "returns"
    id = Column(Integer, primary_key=True); order_id = Column(Integer); user_id = Column(Integer); reason = Column(Text); status = Column(String(20), default="Requested")
class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True); product_id = Column(Integer, index=True); user_name = Column(String(100)); q = Column(Text); a = Column(Text, default="")
class Ship(Base):
    __tablename__ = "shipments"
    id = Column(Integer, primary_key=True); order_id = Column(Integer, unique=True); courier = Column(String(60)); tracking = Column(String(80))
class Rule(Base):
    __tablename__ = "coupon_rules"
    id = Column(Integer, primary_key=True); code = Column(String(30), unique=True); min_order = Column(Float, default=0); expires = Column(String(10), default=""); max_uses = Column(Integer, default=0); uses = Column(Integer, default=0)
class Banner(Base):
    __tablename__ = "banners"
    id = Column(Integer, primary_key=True); text = Column(String(250)); active = Column(Integer, default=1)
class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True); title = Column(String(200)); body = Column(Text); created = Column(DateTime, default=dt.datetime.utcnow)
class Setting(Base):
    __tablename__ = "settings"
    skey = Column(String(50), primary_key=True); val = Column(String(300))
class Audit(Base):
    __tablename__ = "audit"
    id = Column(Integer, primary_key=True); actor = Column(String(150)); action = Column(String(250)); created = Column(DateTime, default=dt.datetime.utcnow)
class Blocked(Base):
    __tablename__ = "blocked"
    user_id = Column(Integer, primary_key=True)

DEFAULTS = {"announcement": "Free shipping over ₹999. Use code GLOW10 for 10% off.", "free_ship": "999", "ship_fee": "49"}
def audit(s, a, act): s.add(Audit(actor=a.email, action=act)); s.commit()
def setting(s, k, d): r = s.get(Setting, k); return r.val if r else d
def balance(s, uid): return int(s.query(func.coalesce(func.sum(Ledger.delta), 0)).filter(Ledger.user_id == uid).scalar())
def check_rule(s, code, sub):
    r = s.query(Rule).filter_by(code=code).first()
    if not r: return
    if r.expires and r.expires < dt.date.today().isoformat(): raise HTTPException(400, "Coupon expired")
    if r.max_uses and r.uses >= r.max_uses: raise HTTPException(400, "Coupon usage limit reached")
    if sub < r.min_order: raise HTTPException(400, f"Minimum order of ₹{int(r.min_order)} required")
def rows(q): return [row(x) for x in q]

# ---- public / customer
@app.get("/settings")
def settings(s: Session = Depends(db)): return {k: setting(s, k, v) for k, v in DEFAULTS.items()}
@app.get("/posts")
def posts(s: Session = Depends(db)): return rows(s.query(Post).order_by(Post.id.desc()))
@app.get("/banners")
def banners(s: Session = Depends(db)): return rows(s.query(Banner).filter_by(active=1))
@app.get("/offers")
def offers(s: Session = Depends(db)):
    out = []
    for c in s.query(Coupon):
        r = s.query(Rule).filter_by(code=c.code).first()
        if r and ((r.expires and r.expires < dt.date.today().isoformat()) or (r.max_uses and r.uses >= r.max_uses)): continue
        out.append({"code": c.code, "percent": c.percent, "min_order": r.min_order if r else 0})
    return out
@app.get("/points")
def points(u: User = Depends(user), s: Session = Depends(db)): return {"balance": balance(s, u.id)}
@app.get("/referral")
def referral(u: User = Depends(user)): return {"code": f"MGR{u.id}"}
class Code(BaseModel): code: str
@app.post("/referral/redeem")
def redeem(b: Code, u: User = Depends(user), s: Session = Depends(db)):
    if s.query(Ledger).filter_by(user_id=u.id, note="Referral bonus").first(): raise HTTPException(400, "Referral already used")
    c = b.code.strip().upper(); ref = s.get(User, int(c[3:])) if c.startswith("MGR") and c[3:].isdigit() else None
    if not ref or ref.id == u.id: raise HTTPException(400, "Invalid referral code")
    s.add(Ledger(user_id=u.id, delta=50, note="Referral bonus")); s.add(Ledger(user_id=ref.id, delta=50, note="Referral reward")); s.commit(); return {"ok": True}
class AIn(BaseModel): text: str
@app.get("/addresses")
def addrs(u: User = Depends(user), s: Session = Depends(db)): return rows(s.query(Addr).filter_by(user_id=u.id))
@app.post("/addresses")
def add_addr(b: AIn, u: User = Depends(user), s: Session = Depends(db)): s.add(Addr(user_id=u.id, text=b.text)); s.commit(); return {"ok": True}
@app.delete("/addresses/{aid}")
def del_addr(aid: int, u: User = Depends(user), s: Session = Depends(db)):
    a = s.get(Addr, aid)
    if a and a.user_id == u.id: s.delete(a); s.commit()
    return {"ok": True}
class PID(BaseModel): product_id: int
@app.post("/alerts")
def alert(b: PID, u: User = Depends(user), s: Session = Depends(db)):
    if not s.query(Alert).filter_by(user_id=u.id, product_id=b.product_id).first(): s.add(Alert(user_id=u.id, product_id=b.product_id)); s.commit()
    return {"ok": True}
@app.get("/notifications")
def notes(u: User = Depends(user), s: Session = Depends(db)): return rows(s.query(Notice).filter_by(user_id=u.id).order_by(Notice.id.desc()).limit(15))
@app.post("/notifications/read")
def read_notes(u: User = Depends(user), s: Session = Depends(db)): s.query(Notice).filter_by(user_id=u.id).update({"seen": 1}); s.commit(); return {"ok": True}
class RIn(BaseModel): order_id: int; reason: str
@app.post("/returns")
def ret(b: RIn, u: User = Depends(user), s: Session = Depends(db)):
    o = s.get(Order, b.order_id)
    if not o or o.user_id != u.id or o.status != "Delivered": raise HTTPException(400, "Only delivered orders can be returned")
    if s.query(Ret).filter_by(order_id=o.id).first(): raise HTTPException(400, "Return already requested")
    s.add(Ret(order_id=o.id, user_id=u.id, reason=b.reason)); s.commit(); return {"ok": True}
@app.get("/shipments")
def shipments(u: User = Depends(user), s: Session = Depends(db)):
    ids = [o.id for o in s.query(Order).filter_by(user_id=u.id)]
    return {x.order_id: {"courier": x.courier, "tracking": x.tracking} for x in s.query(Ship).filter(Ship.order_id.in_(ids))}
class QIn(BaseModel): product_id: int; q: str
@app.get("/questions/{pid}")
def questions(pid: int, s: Session = Depends(db)): return rows(s.query(Question).filter_by(product_id=pid).order_by(Question.id.desc()))
@app.post("/questions")
def ask(b: QIn, u: User = Depends(user), s: Session = Depends(db)): s.add(Question(product_id=b.product_id, user_name=u.name or "Customer", q=b.q)); s.commit(); return {"ok": True}
class PW(BaseModel): old: str; new: str
@app.post("/me/password")
def chpw(b: PW, u: User = Depends(user), s: Session = Depends(db)):
    if not pwd.verify(b.old, u.password) or len(b.new) < 6: raise HTTPException(400, "Check your current password. The new one needs 6+ characters")
    u.password = pwd.hash(b.new); s.commit(); return {"ok": True}

# ---- admin
class KV(BaseModel): key: str; value: str
@app.put("/admin/settings")
def put_setting(b: KV, a: User = Depends(admin), s: Session = Depends(db)):
    if b.key not in DEFAULTS: raise HTTPException(400, "Unknown setting")
    r = s.get(Setting, b.key) or Setting(skey=b.key); r.val = b.value; s.add(r); audit(s, a, f"Setting {b.key} changed"); return {"ok": True}
@app.get("/admin/analytics")
def analytics(_=Depends(admin), s: Session = Depends(db)):
    today = dt.date.today(); allo = s.query(Order).all(); paid = [o for o in allo if o.paid]; day = lambda o: o.created.date()
    daily = [((today - dt.timedelta(d)).strftime("%d %b"), int(sum(o.total for o in paid if day(o) == today - dt.timedelta(d)))) for d in range(6, -1, -1)]
    prods = {p.id: p for p in s.query(Product)}; qty, cat = {}, {}
    for o in paid:
        for i in o.items:
            p = prods.get(i["id"])
            if p: qty[p.name] = qty.get(p.name, 0) + i["qty"]; cat[p.category] = cat.get(p.category, 0) + int(p.price * i["qty"])
    return {"kpi": {"Revenue today": int(sum(o.total for o in paid if day(o) == today)), "Orders today": len([o for o in allo if day(o) == today]),
            "Avg order value": int(sum(o.total for o in paid) / len(paid)) if paid else 0, "Pending orders": len([o for o in allo if o.status in ("Placed", "Packed")]),
            "Customers": s.query(User).filter(User.role == "customer").count()},
            "daily": daily, "top": sorted(qty.items(), key=lambda x: -x[1])[:5], "cat": list(cat.items()),
            "low": [{"id": p.id, "name": p.name, "stock": p.stock} for p in prods.values() if p.stock < 10]}
class Amt(BaseModel): amount: int
@app.post("/admin/restock")
def restock(b: Amt, a: User = Depends(admin), s: Session = Depends(db)):
    for p in s.query(Product).filter(Product.stock < 10): p.stock += b.amount
    audit(s, a, f"Restocked low items +{b.amount}"); return {"ok": True}
@app.get("/admin/customers2")
def customers2(_=Depends(admin), s: Session = Depends(db)):
    out = []
    for u in s.query(User):
        os_ = [o for o in s.query(Order).filter_by(user_id=u.id) if o.paid]; spent = int(sum(o.total for o in os_))
        out.append({"id": u.id, "name": u.name, "email": u.email, "role": u.role, "orders": len(os_), "spent": spent, "points": balance(s, u.id),
                    "blocked": bool(s.get(Blocked, u.id)), "segment": "VIP" if spent >= 5000 else "Repeat" if len(os_) > 1 else "New" if os_ else "Prospect"})
    return out
@app.post("/admin/customers/{uid}/block")
def block(uid: int, a: User = Depends(admin), s: Session = Depends(db)):
    if uid == a.id: raise HTTPException(400, "You cannot block yourself")
    b = s.get(Blocked, uid)
    if b: s.delete(b)
    else: s.add(Blocked(user_id=uid))
    audit(s, a, f"Toggled block on user {uid}"); return {"ok": True}
@app.post("/admin/customers/{uid}/role")
def role(uid: int, a: User = Depends(admin), s: Session = Depends(db)):
    if uid == a.id: raise HTTPException(400, "You cannot change your own role")
    u = s.get(User, uid); u.role = "customer" if u.role == "admin" else "admin"; audit(s, a, f"User {uid} role -> {u.role}"); return {"ok": True}
class PWIn(BaseModel): password: str
@app.post("/admin/customers/{uid}/reset")
def reset(uid: int, b: PWIn, a: User = Depends(admin), s: Session = Depends(db)):
    if len(b.password) < 6: raise HTTPException(400, "Password needs 6+ characters")
    s.get(User, uid).password = pwd.hash(b.password); audit(s, a, f"Password reset for user {uid}"); return {"ok": True}
@app.get("/admin/coupons2")
def coupons2(_=Depends(admin), s: Session = Depends(db)):
    out = []
    for c in s.query(Coupon):
        r = s.query(Rule).filter_by(code=c.code).first()
        out.append({"id": c.id, "code": c.code, "percent": c.percent, "min_order": r.min_order if r else 0, "expires": r.expires if r else "", "max_uses": r.max_uses if r else 0, "uses": r.uses if r else 0})
    return out
class CR(BaseModel): code: str; percent: int; min_order: float = 0; expires: str = ""; max_uses: int = 0
@app.post("/admin/coupon-rules")
def coupon_rule(b: CR, a: User = Depends(admin), s: Session = Depends(db)):
    code = b.code.strip().upper(); c = s.query(Coupon).filter_by(code=code).first()
    if c: c.percent = b.percent
    else: s.add(Coupon(code=code, percent=b.percent))
    r = s.query(Rule).filter_by(code=code).first() or Rule(code=code, uses=0)
    r.min_order, r.expires, r.max_uses = b.min_order, b.expires, b.max_uses; s.add(r); audit(s, a, f"Coupon {code} saved"); return {"ok": True}
@app.delete("/admin/coupons/{cid}")
def del_coupon(cid: int, a: User = Depends(admin), s: Session = Depends(db)):
    c = s.get(Coupon, cid); s.query(Rule).filter_by(code=c.code).delete(); s.delete(c); audit(s, a, f"Coupon {c.code} deleted"); return {"ok": True}
class BIn(BaseModel): text: str
@app.get("/admin/banners")
def a_banners(_=Depends(admin), s: Session = Depends(db)): return rows(s.query(Banner))
@app.post("/admin/banners")
def add_banner(b: BIn, a: User = Depends(admin), s: Session = Depends(db)): s.add(Banner(text=b.text)); audit(s, a, "Banner added"); return {"ok": True}
@app.post("/admin/banners/{bid}/toggle")
def tog_banner(bid: int, _=Depends(admin), s: Session = Depends(db)): b = s.get(Banner, bid); b.active = 0 if b.active else 1; s.commit(); return {"ok": True}
@app.delete("/admin/banners/{bid}")
def del_banner(bid: int, _=Depends(admin), s: Session = Depends(db)): s.delete(s.get(Banner, bid)); s.commit(); return {"ok": True}
class PostIn(BaseModel): title: str; body: str
@app.post("/admin/posts")
def add_post(b: PostIn, a: User = Depends(admin), s: Session = Depends(db)): s.add(Post(title=b.title, body=b.body)); audit(s, a, f"Post published: {b.title}"); return {"ok": True}
@app.delete("/admin/posts/{pid}")
def del_post(pid: int, _=Depends(admin), s: Session = Depends(db)): s.delete(s.get(Post, pid)); s.commit(); return {"ok": True}
@app.delete("/admin/reviews/{rid}")
def del_review(rid: int, a: User = Depends(admin), s: Session = Depends(db)): s.delete(s.get(Review, rid)); audit(s, a, f"Review {rid} removed"); return {"ok": True}
@app.get("/admin/questions")
def a_questions(_=Depends(admin), s: Session = Depends(db)): return rows(s.query(Question).order_by(Question.id.desc()))
class AnsIn(BaseModel): a: str
@app.post("/admin/questions/{qid}")
def answer(qid: int, b: AnsIn, _=Depends(admin), s: Session = Depends(db)): s.get(Question, qid).a = b.a; s.commit(); return {"ok": True}
@app.get("/admin/returns")
def a_returns(_=Depends(admin), s: Session = Depends(db)): return rows(s.query(Ret).order_by(Ret.id.desc()))
@app.patch("/admin/returns/{rid}")
def set_return(rid: int, b: St, a: User = Depends(admin), s: Session = Depends(db)):
    r = s.get(Ret, rid); r.status = b.status; s.add(Notice(user_id=r.user_id, text=f"Your return for order #{r.order_id} was {b.status.lower()}")); audit(s, a, f"Return {rid} {b.status}"); return {"ok": True}
class ShipIn(BaseModel): courier: str; tracking: str
@app.post("/admin/orders/{oid}/ship")
def ship(oid: int, b: ShipIn, a: User = Depends(admin), s: Session = Depends(db)):
    o = s.get(Order, oid); x = s.query(Ship).filter_by(order_id=oid).first() or Ship(order_id=oid)
    x.courier, x.tracking = b.courier, b.tracking; s.add(x)
    if o.status in ("Placed", "Packed"): o.status = "Shipped"
    s.add(Notice(user_id=o.user_id, text=f"Order #{oid} shipped via {b.courier}, tracking {b.tracking}")); audit(s, a, f"Order {oid} shipped"); return {"ok": True}
@app.get("/admin/audit")
def a_audit(_=Depends(admin), s: Session = Depends(db)): return rows(s.query(Audit).order_by(Audit.id.desc()).limit(100))
@app.get("/admin/subscribers")
def subscribers(_=Depends(admin), s: Session = Depends(db)): return rows(s.query(Subscriber))
@app.get("/admin/export")
def export(_=Depends(admin), s: Session = Depends(db)):
    return {"products": rows(s.query(Product)), "orders": rows(s.query(Order)), "reviews": rows(s.query(Review)), "coupons": rows(s.query(Coupon)), "posts": rows(s.query(Post)),
            "customers": [{"id": u.id, "name": u.name, "email": u.email, "role": u.role} for u in s.query(User)], "subscribers": rows(s.query(Subscriber))}

@app.get("/health")
def health(): return {"status": "ok"}
