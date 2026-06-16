#!/usr/bin/env python3
"""
Fix 'Store is not defined' in seller Layout.tsx
Run from ~/nexcart_scott:
    python3 fix_seller_store_import.py
"""
import os, re

path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "artifacts/nexcart/src/pages/seller/Layout.tsx"
)

with open(path, "r", encoding="utf-8") as f:
    src = f.read()

# Check if Store is already imported
if re.search(r'\bStore\b', src.split('from "lucide-react"')[0]):
    print("Store is already imported — checking for other issues...")
else:
    # Add Store to the lucide-react import
    src = re.sub(
        r'(import\s*\{[^}]*)(}\s*from\s*"lucide-react")',
        lambda m: m.group(1).rstrip() + ',\n  Store,\n' + m.group(2),
        src,
        count=1
    )
    print("✓ Added Store to lucide-react imports")

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

# Show the import line to confirm
for line in src.split("\n")[:10]:
    print(line)

print("""
Now run:
  cd ~/nexcart_scott
  git add artifacts/nexcart/src/pages/seller/Layout.tsx
  git commit -m "fix: add missing Store icon import in seller Layout"
  git push
""")
