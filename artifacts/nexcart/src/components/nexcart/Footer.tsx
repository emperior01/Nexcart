import { Truck, ShieldCheck, RefreshCw, MessageCircle } from "lucide-react";

const trustBadges = [
  { icon: Truck, label: "Free shipping", sub: "On orders over $50" },
  { icon: ShieldCheck, label: "Secure checkout", sub: "Encrypted payments" },
  { icon: RefreshCw, label: "30-day returns", sub: "No-fuss policy" },
  { icon: MessageCircle, label: "Real support", sub: "Humans, not bots" },
];

const footerLinks = [
  {
    title: "Shop",
    links: ["All products", "Electronics", "Beauty", "Fashion", "Home", "Fitness"],
  },
  {
    title: "Account",
    links: ["Your account", "Your orders", "Cart", "Wishlist"],
  },
  {
    title: "Help",
    links: ["Shipping", "Returns", "Contact us", "FAQ"],
  },
];

export function Footer() {
  return (
    <footer>
      {/* Trust strip */}
      <div className="bg-white overflow-x-auto py-5 px-4 border-t border-[#EFEFEF]" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-3 min-w-max px-2 mx-auto max-w-7xl">
          {trustBadges.map((b) => (
            <div key={b.label} className="flex items-center gap-2.5 bg-[#F4F4F4] rounded-xl px-4 py-3 min-w-[148px]">
              <div className="w-9 h-9 bg-[#FEF0E8] rounded-lg flex items-center justify-center flex-shrink-0">
                <b.icon className="h-[18px] w-[18px] text-[#E8611A]" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#0D0D0D] leading-tight">{b.label}</p>
                <p className="text-[11px] text-[#6B6B6B]">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main footer */}
      <div className="bg-[#0D0D0D] text-white px-6 pt-10 pb-8">
        <div className="mx-auto max-w-7xl">
          {/* Logo + tagline */}
          <div
            className="text-[24px] font-extrabold tracking-[-0.03em] mb-2"
            style={{ fontFamily: "'Inter', sans-serif", color: "#E8611A" }}
          >
            Nexcart
          </div>
          <p className="text-[13px] text-white/45 mb-7 leading-relaxed max-w-[240px]">
            Curated essentials across electronics, beauty, fashion, home, and fitness.
          </p>

          {/* Link grid */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {footerLinks.map((col) => (
              <div key={col.title}>
                <h4 className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/40 mb-3">
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-[13px] text-white/70 hover:text-[#E8611A] transition-colors">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/8 pt-5 flex flex-wrap justify-between items-center gap-3">
            <span className="text-[12px] text-white/30">© {new Date().getFullYear()} Nexcart. All rights reserved.</span>
            <span className="text-[12px] text-white/30">Crafted with care · Free shipping on $50+</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
