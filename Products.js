/**
 * Seed product data for Romaza.Store.
 *
 * Shape:
 *   id            string  — stable unique id
 *   name          string
 *   description   string
 *   price         number  — base price (EGP)
 *   image         string  — image URL
 *   categories    string[] — any of 'perfumes' | 'makeup' | 'bags' | 'offers'
 *                            ('bestsellers' is NEVER stored here — it's derived
 *                            at render time from the click counter in storage.js)
 *   offer         { active: boolean, price: number|null }
 *
 * NOTE: this file only seeds localStorage on first load (see storage.js).
 * After that, the admin panel's data (in localStorage) is the source of truth.
 */

const SEED_PRODUCTS = [
  {
    id: "p-001",
    name: "Velours Noir",
    description: "A smoky oud and dark vanilla eau de parfum, built for evenings that linger. Long-lasting and unmistakably confident.",
    price: 2450,
    image: "img/img1.jpg",
    categories: ["perfumes"],
    offer: { active: false, price: null }
  },
  {
    id: "p-002",
    name: "Aube Blanche",
    description: "Fresh neroli and white musk for daylight hours — light on the skin, quietly memorable.",
    price: 1980,
    image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=900&auto=format&fit=crop",
    categories: ["perfumes", "offers"],
    offer: { active: true, price: 1590 }
  },
  {
    id: "p-003",
    name: "Ambre Royale",
    description: "Warm amber, cedarwood and a whisper of saffron. A signature scent that fills a room gently.",
    price: 2890,
    image: "https://images.unsplash.com/photo-1615368144592-04a26956db9b?q=80&w=900&auto=format&fit=crop",
    categories: ["perfumes"],
    offer: { active: false, price: null }
  },
  {
    id: "p-004",
    name: "Rose de Nuit",
    description: "Turkish rose absolute over a soft leather base. Elegant, grounded, unforgettable.",
    price: 2650,
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=900&auto=format&fit=crop",
    categories: ["perfumes"],
    offer: { active: false, price: null }
  },
  {
    id: "p-005",
    name: "Velvet Matte Lipstick — Terracotta",
    description: "A weightless matte formula in a warm terracotta shade. Eight hours of wear, zero touch-ups.",
    price: 420,
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=900&auto=format&fit=crop",
    categories: ["makeup"],
    offer: { active: false, price: null }
  },
  {
    id: "p-006",
    name: "Silk Foundation — Warm Beige",
    description: "Buildable, breathable coverage that mimics skin rather than masking it. All-day comfort.",
    price: 890,
    image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?q=80&w=900&auto=format&fit=crop",
    categories: ["makeup", "offers"],
    offer: { active: true, price: 690 }
  },
  {
    id: "p-007",
    name: "Golden Hour Eyeshadow Palette",
    description: "Nine warm, blendable shades from soft champagne to deep bronze. One palette, endless looks.",
    price: 1150,
    image: "https://images.unsplash.com/photo-1583241800698-9b8b03be0234?q=80&w=900&auto=format&fit=crop",
    categories: ["makeup"],
    offer: { active: false, price: null }
  },
  {
    id: "p-008",
    name: "Featherlight Setting Powder",
    description: "A near-invisible finishing powder that blurs and holds without ever looking cakey.",
    price: 560,
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=900&auto=format&fit=crop",
    categories: ["makeup"],
    offer: { active: false, price: null }
  },
  {
    id: "p-009",
    name: "Atelier Tote — Camel",
    description: "Full-grain leather, hand-stitched edges, room for everything you actually carry. Ages beautifully.",
    price: 3200,
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=900&auto=format&fit=crop",
    categories: ["bags"],
    offer: { active: false, price: null }
  },
  {
    id: "p-010",
    name: "Soirée Clutch — Ivory",
    description: "A minimal evening clutch with a hidden magnetic clasp. Structured enough to hold its shape all night.",
    price: 1780,
    image: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?q=80&w=900&auto=format&fit=crop",
    categories: ["bags", "offers"],
    offer: { active: true, price: 1390 }
  },
  {
    id: "p-011",
    name: "Everyday Crossbody — Black",
    description: "Compact, adjustable strap, three internal pockets. Designed for days that move fast.",
    price: 2100,
    image: "https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=900&auto=format&fit=crop",
    categories: ["bags"],
    offer: { active: false, price: null }
  },
  {
    id: "p-012",
    name: "Satin Lip Gloss — Rosewood",
    description: "A non-sticky, high-shine gloss with a hint of natural tint. Comfortable for all-day wear.",
    price: 340,
    image: "https://images.unsplash.com/photo-1571646750134-8e7d19b7db78?q=80&w=900&auto=format&fit=crop",
    categories: ["makeup"],
    offer: { active: false, price: null }
  }
];


// Editorial / hero fallback images (used only if the primary URL fails to load)
const FALLBACK_EDITORIAL_GRADIENT_ONLY = true; // signals app.js to use CSS gradient fallback, not another photo