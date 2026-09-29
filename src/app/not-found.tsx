import Link from "next/link";

export default function NotFound() {
  return (
    <main className="ms-root min-h-screen flex items-center justify-center bg-mist px-4">
      <div className="max-w-md w-full text-center rounded-lg border border-line bg-white p-10">
        <p className="ms-label text-hush mb-2">404 — NOT ON ANY SHELF</p>
        <h1 className="ms-display text-3xl tracking-tight mb-4">
          SHELF DOESN&apos;T EXIST
        </h1>
        <p className="text-sm text-hush mb-8 leading-relaxed">
          The page you asked for isn&apos;t stocked here — it may have moved or
          the address is off. The catalog, though, is full.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/?view=shop" className="ms-label ms-key inline-block px-8 py-4">
            ← BACK TO THE SHOP
          </Link>
          <Link href="/" className="ms-label border border-line inline-block px-8 py-4 hover:bg-ink hover:text-white transition-colors">
            HOME
          </Link>
        </div>
      </div>
    </main>
  );
}