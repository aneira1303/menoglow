# MenoGlow – Menopause Skin & Body Care (React + FastAPI + MySQL)
## Backend
cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
cp .env.example .env   # set DATABASE_URL (MySQL), Razorpay test keys, Cloudinary URL; unset DATABASE_URL = SQLite
set -a; source .env; set +a; uvicorn app.main:app --reload   # docs at :8000/docs
Seeds 5 products, coupon GLOW10, admin: admin@menoglow.com / admin123 (change it).
## Frontend
cd frontend && cp .env.example .env && npm install && npm run dev
## Design
Ivory #FBF8F4, blush #F4E9E7, charcoal #302A28, muted rose #A76F79. Playfair Display / DM Sans / Manrope.
Without Razorpay keys, checkout marks orders paid for local testing.
## v3 additions
New tables (points, addresses, alerts, notifications, returns, Q&A, shipments, coupon rules, banners, posts, settings, audit, blocked) are created automatically on backend start. Existing tables are unchanged.
## Deploy (one platform: Render)
Push to GitHub, then Render -> New -> Blueprint. render.yaml builds one Docker service (React + FastAPI) and a free Postgres database.
Set ADMIN_PASSWORD (before first start), RAZORPAY_* and CLOUDINARY_URL when asked.
