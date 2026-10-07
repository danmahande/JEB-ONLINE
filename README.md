# MERIDIAN SUPPLY CO.

A cross-border e-commerce storefront for a Ugandan exporter of grain and hardware equipment — built to make regional trade feel as solid and physical as the goods being sold.

The catalog tiles read as painted-steel cabinet faces: every tile carries weight-pack switches, live stock and a **BUY** button that opens a spec-sheet dialog where the pack and quantity are chosen before adding to the cart. Behind the storefront sits a region-aware pricing engine that estimates duties, VAT and freight for every East African Community (EAC) destination before checkout.

## Screenshots

| Shop | Catalog |
|---|---|
| ![Shop hero](docs/screenshots/01-shop-hero.png) | ![Catalog tiles](docs/screenshots/02-catalog.png) |
| *Living-sky hero with live search and EAC ticker* | *Steel tiles with weight-pack switches and BUY* |

| Quick view | Cart |
|---|---|
| ![Quick view](docs/screenshots/03-quick-view.png) | ![Cart drawer](docs/screenshots/04-cart.png) |
| *BUY opens the spec sheet: pack selector + quantity stepper* | *Duty, VAT and freight quoted live in the cart* |

| Checkout |
|---|
| ![Checkout](docs/screenshots/05-checkout.png) |
| *Destination-aware totals and regional payment methods* |

---

## Features

**Catalog**
- Product grid (2–6 columns, responsive) of painted-steel tiles with weight-pack switches, live stock counts and a BUY button per tile
- Weight-pack switcher on every card (e.g. 25 KG / 50 KG bags) — the tile price updates instantly
- BUY opens the quick-view spec sheet: full product details, pack selection and a quantity stepper before adding to cart
- Live search from the hero section

**Cross-border pricing**
- Region selector in the header (Uganda, Kenya, Tanzania, Rwanda, …)
- Prices convert through stored FX rates and display in the destination currency
- Duties, VAT and per-kg freight are estimated per destination before payment — EAC-origin goods benefit from preferential tariff handling
- Shipping estimates based on shipment base + weight (base + per-kg)

**Commerce**
- Cart drawer with fly-to-cart animation and live badge
- Full checkout flow: customer details → order placement → confirmation
- Order tracking by order number (order events timeline)
- Restock alert signup on out-of-stock products
- Kampala clock and a day-part "living sky" — the light (dawn / golden hour / night) follows real time of day across the whole page, not just the hero

**Store administration**
- Private owner sign-in and a product catalog for adding, editing, searching, and hiding products
- Product pricing, variants, origin/customs details, opening stock, and low-stock thresholds
- Product edits cannot change current stock; audited stock receipts and adjustments are a separate workflow

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui (Radix primitives), custom design system in `globals.css` |
| State | Zustand (cart, region), TanStack Query (catalog fetching) |
| Data | Prisma 6 + PostgreSQL (Neon serverless adapter) |
| Validation | Zod |
| Motion | Framer Motion + CSS keyframes |
| Icons | Lucide |

## Getting started

**Prerequisites:** Node.js 20+ with npm — that is what the deployment uses (`vercel.json` runs `npm run build`). `pnpm` works the same.

```bash
# 1. install dependencies
npm install

# 2. configure PostgreSQL in the project-root .env
# DATABASE_URL is the pooled/runtime URL; DATABASE_URL_UNPOOLED is for Prisma migrations.

# 3. apply committed migrations and seed the initial catalog/regions
npm run db:deploy
npm run db:seed

# 4. start the dev server
npm run dev
```

Open http://localhost:3000. The seed script inserts the 14 catalog products and 6 destination regions. It does not create customers or orders. Run it once for an empty database; it resets seeded product stock to the seed values when re-run.

> **Windows:** everything above runs the same in PowerShell.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build (standalone output) |
| `npm run start` | Serve the standalone production build |
| `npm run lint` | ESLint |
| `npm run db:push` | Push the Prisma schema directly (development only; prefer migrations) |
| `npm run db:deploy` | Apply committed PostgreSQL migrations |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:seed` | Seed catalog and region configuration into an empty database |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:reset` | Reset the database |
| `npm run admin:hash` | Generate a hidden-input scrypt hash for the single admin password |
| `npm run test:admin` | Test admin authentication and product input validation |

### Environment

`.env` at the project root (not committed — create it once after cloning). Use a PostgreSQL database locally; Vercel's Neon integration supplies the production values:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
```

`DATABASE_URL` is the pooled connection for application queries. `DATABASE_URL_UNPOOLED` is the direct connection used by Prisma Migrate; keep both out of source control.

`.env.example` lists every variable the code reads, with a note on each. The two that are easy to miss and break something visible:

- `NEXT_PUBLIC_SITE_URL` — the canonical origin. Unset, it falls back to `http://localhost:3000`, so the sitemap, `robots.txt` and every canonical/OG URL advertise localhost. Set it to the deployed origin.
- `NEXT_PUBLIC_CONTACT_EMAIL` — the address shown on the contact page, footer and legal pages. Defaults to `sales@<host of NEXT_PUBLIC_SITE_URL>`, so it can never point at a domain the deployment does not control. Set it once a real domain with working mail exists.

### Owner admin login

The private product manager is at `/admin`. It uses the existing NextAuth dependency with one configured owner account; no separate backend repository or admin-user table is needed. Five failed sign-in attempts are allowed in a 15-minute window; the attempt counter is a single database row and stores no email or IP address.

1. Choose an admin email and a password of at least 14 characters.
2. In a local terminal run `npm run admin:hash` and enter the password when prompted. Input is hidden; copy the printed `ADMIN_PASSWORD_HASH` value into Vercel, not into this repository.
3. Generate a session secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`.
4. In the Vercel project, add `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `NEXTAUTH_SECRET` to the Production environment (and Development/Preview only if you will use admin there). Keep them private and redeploy after saving.
5. Open `https://jeb-online.vercel.app/admin` and sign in. Sessions expire after eight hours.

Customer accounts are optional; guests can continue browsing and checking out. Customers can create an account and sign in immediately (email verification is not configured). Orders appear in account history only when the customer was signed in at checkout; older guest orders remain available through the existing order-number tracking flow. There is no password-reset email flow yet, so customers should use an address they can access and keep their password safe.

To enable product-image uploads, create a **public** Vercel Blob store from the Vercel project's Storage section and connect it to this project. Include the generated `BLOB_READ_WRITE_TOKEN` in Production and any Preview/Development environments where image uploads are needed, then redeploy. The admin product form can crop and preview JPEG, PNG, or WebP files before uploading them; original files must be under 10 MB and cropped uploads under 4.5 MB. Uploaded product images are converted to WebP and their Blob URL is saved in the product form. Existing `/products/...` paths continue to work. Opening stock can be set only when a product is created. It is deliberately read-only while editing, so inventory changes cannot bypass a future stock-movement audit trail.

---

## Project structure

```
src/
  app/
    page.tsx              # storefront shell: shop / checkout / confirmation / track views
    layout.tsx            # fonts (Space Grotesk + Inter), global chrome
    globals.css           # design system (steel-tile catalog, motion, labels)
    admin/                # private owner product manager
    api/
      products/route.ts   # GET   catalog with variants + stock
      admin/products/     # owner-only product CRUD and soft deactivation
      admin/product-images/ # owner-authenticated Vercel Blob image upload
      account/register/   # create customer account
      auth/[...nextauth]/ # owner and customer credentials sessions
      fx/route.ts         # GET   region configs: currency, FX rate, duty, VAT, freight
      orders/route.ts     # GET   track order (by number) · POST place order
  components/storefront/
    header.tsx            # brand, region selector, cart badge, navigation
    hero.tsx              # living-sky hero with search
    product-grid.tsx      # steel tiles, weight-pack toggles, BUY -> quick view
    quick-view.tsx        # spec sheet dialog: pack selector + quantity stepper
    cart-drawer.tsx       # cart panel
    checkout.tsx          # customer + delivery details, price breakdown
    confirmation.tsx      # order confirmation
    track-order.tsx       # order tracking by number
    fly-dot.tsx           # fly-to-cart dot animation
    kampala-clock.tsx     # live Kampala time
    footer.tsx
  components/ui/          # shadcn/ui primitives
  lib/                    # store (zustand), types, pricing helpers
prisma/schema.prisma      # data model
public/products/          # product imagery
scripts/seed.ts           # catalog seed data
```

## Data model (Prisma)

| Model | Purpose |
|---|---|
| `Product` | Catalog item: label, category, unit, pricing, stock, HS code, origin country, JSON variants (weight packs) |
| `Customer` | Checkout customers |
| `CustomerAccount` | Optional sign-in profile; account password hashes are stored separately from checkout customer records |
| `OrderProcessing` | Placed orders: destination region, totals, status, and optional signed-in account owner |
| `OrderLineItem` | Per-product order lines (pack, qty, unit price) |
| `OrderEvent` | Order timeline events used by tracking |
| `RegionConfig` | Per-destination trade config: currency, FX rate, duty rate, VAT rate, freight base + per-kg, ETA, EAC flag |

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | Catalog with variants and stock |
| GET | `/api/fx` | Region configs (currency, rates, duties, VAT, freight) |
| GET | `/api/orders` | Track an order by number |
| POST | `/api/orders` | Place an order (creates customer, order, lines, first event) |
| POST | `/api/account/register` | Create a customer account; no email verification is configured |
| GET | `/api/admin/products` | List products for the signed-in admin |
| POST | `/api/admin/products` | Create a product with opening stock |
| PATCH | `/api/admin/products/:id` | Edit product details, publish, or hide (stock is not editable) |

## Design system

- **Palette:** navy ink `#1B2A4A`, brand orange `#E8622C`, paper white, hairline greys
- **Type:** Space Grotesk (display) + Inter (body), uppercase letterspaced labels
- **Interaction contract:** hardware-feel feedback — a cursor spotlight sheen drifts across the steel tiles, every button depresses on press, and adding flies a dot into the cart badge. All depth is drawn with inset shadows; nothing floats; motion respects `prefers-reduced-motion`.

## Deployment

The production build outputs a standalone Node server (`.next/standalone/server.js`).

### Vercel (Neon Postgres)

Install **Neon Postgres** from the Vercel Marketplace and connect it to this project for Development, Preview, and Production. The Vercel-managed integration injects `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) into the selected environments.

On Vercel, the application uses Prisma's Neon serverless adapter with the pooled `DATABASE_URL`; local development uses Prisma's standard driver with a direct PostgreSQL URL. The `DATABASE_URL_UNPOOLED` connection is reserved for Prisma Migrate. The Vercel build command in `vercel.json` applies committed migrations before building. On the first deployment, connect Neon before deploying so both database variables are available. After the first successful deployment, seed the production catalog and destination configuration exactly once by running `npm run db:seed` against the production database. Do not point the seed command at an existing business database: rerunning it resets seeded product stock.

Vercel's free tier and the database's free tier have separate usage limits; review both dashboards before launch. Configure a production backup/restore plan before accepting real orders.

### VPS

The same PostgreSQL schema and migrations can be used on a VPS. Set `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to its pooled and direct PostgreSQL URLs respectively, then run:

```bash
npm ci
npm run db:deploy
npm run db:seed       # once, only when creating an empty database
npm run build
npm run start
```

The previous SQLite schema and initial migration are retained under `prisma/migrations-sqlite/` for reference only. The active schema and migrations now target PostgreSQL. The existing local SQLite database is not modified or copied by these changes.

## Contributing

1. Fork and create a feature branch (`feat/your-change`).
2. `npm install && npm run db:deploy && npm run db:seed && npm run dev`.
3. Keep visual work consistent with the design system (see above): navy ink / brand orange, uppercase letterspaced labels, and the hardware interaction contract — all depth is drawn with inset shadows, nothing floats, and motion must respect `prefers-reduced-motion`.
4. Run `npm run lint` before opening your PR and keep commits small and descriptive.

## Notes

- The seed script is for initializing catalog and region configuration only. It does not seed customer/order records and resets stock values for the products it upserts; run it only against a new database.
- Existing local SQLite data is intentionally not copied during the PostgreSQL migration. The database migration is schema-only; seed the new Neon database with catalog and region configuration after connecting it.
