#!/usr/bin/env python3
"""
Adds a "View My Store" link to the seller sidebar.
Run from ~/nexcart_scott:
    python3 fix_seller_store_link.py
"""
import os, re

path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "artifacts/nexcart/src/pages/seller/Layout.tsx"
)

with open(path, "r", encoding="utf-8") as f:
    src = f.read()

# ── 1. Make sure Store icon is imported ──────────────────────────────────────
if "Store," not in src and "Store " not in src:
    src = src.replace(
        "LayoutDashboard, Package, ShoppingBag, TrendingUp, Wallet,\n  Star, Settings, Bell, LogOut, Home, Menu, X, ShieldCheck,",
        "LayoutDashboard, Package, ShoppingBag, TrendingUp, Wallet,\n  Star, Settings, Bell, LogOut, Home, Menu, X, ShieldCheck, Store,"
    )
    # fallback: add to whatever lucide import line exists
    if "Store," not in src:
        src = src.replace(
            "} from \"lucide-react\";",
            "  Store,\n} from \"lucide-react\";"
        )

# ── 2. SidebarContent needs sellerId prop ────────────────────────────────────
# Add sellerId to the prop destructure and type
src = src.replace(
    "function SidebarContent({ onClose, signOut, storeName, sellerStatus }: {\n  onClose: () => void;\n  signOut: () => void;\n  storeName: string;\n  sellerStatus: string;\n})",
    "function SidebarContent({ onClose, signOut, storeName, sellerStatus, sellerId }: {\n  onClose: () => void;\n  signOut: () => void;\n  storeName: string;\n  sellerStatus: string;\n  sellerId: string;\n})"
)

# ── 3. Add "View My Store" link just before the "Storefront" link ─────────────
old_storefront = '''<Link
          to="/"
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#6B7280", textDecoration: "none" }}
        >
          <Home style={{ width: 16, height: 16 }} /> Storefront
        </Link>'''

new_storefront = '''<Link
          to="/store/$sellerId"
          params={{ sellerId }}
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#E8611A", textDecoration: "none", background: "rgba(232,97,26,0.06)", borderRadius: 10 }}
        >
          <Store style={{ width: 16, height: 16 }} /> View My Store
        </Link>
        <Link
          to="/"
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#6B7280", textDecoration: "none" }}
        >
          <Home style={{ width: 16, height: 16 }} /> Storefront
        </Link>'''

if old_storefront in src:
    src = src.replace(old_storefront, new_storefront)
    print("✓ Added 'View My Store' link in sidebar bottom section")
else:
    # fallback: insert before signOut button
    old_signout = '''<button
          onClick={signOut}'''
    new_signout = '''<Link
          to="/store/$sellerId"
          params={{ sellerId }}
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#E8611A", textDecoration: "none", background: "rgba(232,97,26,0.06)" }}
        >
          <Store style={{ width: 16, height: 16 }} /> View My Store
        </Link>
        <button
          onClick={signOut}'''
    src = src.replace(old_signout, new_signout, 1)
    print("✓ Added 'View My Store' link via fallback (before Sign Out)")

# ── 4. Pass sellerId to both SidebarContent usages ───────────────────────────
# Desktop sidebar call
src = src.replace(
    "<SidebarContent onClose={() => {}} signOut={signOut} storeName={storeName} sellerStatus={sellerStatus} />",
    "<SidebarContent onClose={() => {}} signOut={signOut} storeName={storeName} sellerStatus={sellerStatus} sellerId={seller?.id ?? \"\"} />"
)
# Mobile sidebar call
src = src.replace(
    "<SidebarContent onClose={() => setSidebarOpen(false)} signOut={signOut} storeName={storeName} sellerStatus={sellerStatus} />",
    "<SidebarContent onClose={() => setSidebarOpen(false)} signOut={signOut} storeName={storeName} sellerStatus={sellerStatus} sellerId={seller?.id ?? \"\"} />"
)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"✅ Done: artifacts/nexcart/src/pages/seller/Layout.tsx")
print("""
Now run:
  cd ~/nexcart_scott
  git add artifacts/nexcart/src/pages/seller/Layout.tsx
  git commit -m "feat: add View My Store link in seller sidebar"
  git push
""")
