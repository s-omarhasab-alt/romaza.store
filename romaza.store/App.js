/**
 * app.js — Romaza.Store
 * Vanilla JS: rendering, filtering, modal state, admin CRUD, WhatsApp ordering.
 *
 * State model:
 *   `products` (in-memory array, mirrored to localStorage via storage.js)
 *   is the single source of truth for rendering. Every mutation goes
 *   through `setProducts()` so the grid, best-sellers, and admin list
 *   stay in sync without a framework.
 */

(function () {
  "use strict";

  const WHATSAPP_NUMBER = "201124213122";
  const ADMIN_PASSWORD = "mazen 555";
  const BEST_SELLERS_COUNT = 8;

  // ---------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------

  let products = RomazaStorage.seedProductsIfEmpty(SEED_PRODUCTS);
  let activeFilter = "all";
  let currentModalProduct = null; // product shown in the product detail modal
  let orderModalProduct = null;   // product the WhatsApp order form is for
  let editingProductId = null;    // id being edited in the admin form, or null when adding
  let confirmDeleteId = null;     // row currently showing "Confirm delete?" state

  // ---------------------------------------------------------------
  // DOM REFS
  // ---------------------------------------------------------------

  const $ = (sel) => document.querySelector(sel);
  const $all = (sel) => Array.from(document.querySelectorAll(sel));

  const navbar = $("#navbar");
  const menuToggle = $("#menuToggle");
  const categoryPills = $("#categoryPills");

  const gridSections = {
    perfumes: $("#grid-perfumes"),
    makeup: $("#grid-makeup"),
    bags: $("#grid-bags"),
    offers: $("#grid-offers"),
    bestsellers: $("#grid-bestsellers")
  };

  const productModalOverlay = $("#productModalOverlay");
  const productModalBadges = $("#productModalBadges");
  const productModalName = $("#productModalName");
  const productModalDesc = $("#productModalDesc");
  const productModalPrice = $("#productModalPrice");
  const productModalOrderBtn = $("#productModalOrderBtn");

  const orderModalOverlay = $("#orderModalOverlay");
  const orderModalProductLine = $("#orderModalProductLine");
  const orderForm = $("#orderForm");
  const orderNameInput = $("#orderName");
  const orderPhoneInput = $("#orderPhone");
  const orderAddressInput = $("#orderAddress");

  const adminLoginOverlay = $("#adminLoginOverlay");
  const adminLoginForm = $("#adminLoginForm");
  const adminPasswordInput = $("#adminPassword");
  const adminLoginError = $("#adminLoginError");

  const adminOverlay = $("#adminOverlay");
  const adminProductList = $("#adminProductList");

  const productFormOverlay = $("#productFormOverlay");
  const productForm = $("#productForm");
  const productFormTitle = $("#productFormTitle");
  const productFormId = $("#productFormId");
  const productFormImage = $("#productFormImage");
  const productFormPreview = $("#productFormPreview");
  const productFormName = $("#productFormName");
  const productFormPrice = $("#productFormPrice");
  const productFormDesc = $("#productFormDesc");
  const catPerfumes = $("#catPerfumes");
  const catMakeup = $("#catMakeup");
  const catBags = $("#catBags");
  const offerActive = $("#offerActive");
  const offerPriceWrap = $("#offerPriceWrap");
  const offerPrice = $("#offerPrice");
  const productFormClickCount = $("#productFormClickCount");
  const productFormClickValue = $("#productFormClickValue");

  const toast = $("#toast");

  // ---------------------------------------------------------------
  // UTILITIES
  // ---------------------------------------------------------------

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function formatPrice(n) {
    return `EGP ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2400);
  }

  function setProducts(next) {
    products = next;
    RomazaStorage.saveProducts(products);
    renderAll();
  }

  function findProduct(id) {
    return products.find((p) => p.id === id) || null;
  }

  function getBestSellers() {
    return products
      .map((p) => ({ product: p, clicks: RomazaStorage.getClickCount(p.id) }))
      .filter((entry) => entry.clicks > 0)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, BEST_SELLERS_COUNT)
      .map((entry) => entry.product);
  }

  function categoryLabel(cat) {
    switch (cat) {
      case "perfumes": return "🌸 Perfumes";
      case "makeup": return "💄 Makeup";
      case "bags": return "👜 Bags";
      case "offers": return "🔥 Offer";
      default: return cat;
    }
  }

  // ---------------------------------------------------------------
  // IMAGE FALLBACK (equivalent of the React <ProductImage /> component)
  // ---------------------------------------------------------------
  // Any <img> rendered from product/editorial data gets a data-fallback
  // wrapper so a dead URL degrades to a quiet placeholder instead of a
  // broken-image icon. This mirrors the reliability layer from the
  // React build, adapted to plain DOM (onerror handler + swap).

  const FALLBACK_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;

  function attachImageFallback(imgEl, label) {
    imgEl.addEventListener("error", function onError() {
      imgEl.removeEventListener("error", onError);
      const wrap = imgEl.parentElement;
      if (!wrap) return;
      const fallback = document.createElement("div");
      fallback.className = "img-fallback";
      fallback.innerHTML = `${FALLBACK_ICON_SVG}<span>${escapeHtml(label || "Image unavailable")}</span>`;
      imgEl.replaceWith(fallback);
    }, { once: true });
  }

  function attachEditorialFallback(sectionEl) {
    const probe = new Image();
    probe.onerror = function () {
      sectionEl.classList.add("is-fallback");
      sectionEl.style.backgroundImage = "none";
    };
    // Extract the URL from the CSS var set inline via style="--editorial-img: url('...')"
    const raw = sectionEl.style.getPropertyValue("--editorial-img") || "";
    const match = raw.match(/url\((['"]?)(.*?)\1\)/);
    if (match && match[2]) {
      probe.src = match[2];
    }
  }

  // ---------------------------------------------------------------
  // RENDERING — product cards & grids
  // ---------------------------------------------------------------

  function buildBadgesHtml(product, { includeBestSeller }) {
    const badges = [];
    product.categories
      .filter((c) => c !== "offers")
      .forEach((c) => badges.push(`<span class="badge">${categoryLabel(c)}</span>`));
    if (product.offer && product.offer.active) {
      badges.push(`<span class="badge badge--offer">🔥 Offer</span>`);
    }
    if (includeBestSeller) {
      badges.push(`<span class="badge badge--best">⭐ Best Seller</span>`);
    }
    return badges.join("");
  }

  function buildPriceHtml(product) {
    if (product.offer && product.offer.active && product.offer.price != null) {
      return `<span>${formatPrice(product.offer.price)}</span><span class="strike">${formatPrice(product.price)}</span>`;
    }
    return `<span>${formatPrice(product.price)}</span>`;
  }

  function createProductCard(product, { isBestSeller }) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = product.id;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `View details for ${product.name}`);

    card.innerHTML = `
      <div class="product-card__media">
        <div class="product-card__badges">${buildBadgesHtml(product, { includeBestSeller: isBestSeller })}</div>
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
        <div class="product-card__price">${buildPriceHtml(product)}</div>
      </div>
    `;

    const img = card.querySelector("img");
    attachImageFallback(img, product.name);

    const openHandler = () => openProductModal(product.id);
    card.addEventListener("click", openHandler);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openHandler();
      }
    });

    return card;
  }

  function renderGrid(container, list, { isBestSellerGrid }) {
    container.innerHTML = "";
    list.forEach((product) => {
      container.appendChild(createProductCard(product, { isBestSeller: !!isBestSellerGrid }));
    });
  }

  function matchesFilter(product, filter) {
    if (filter === "all") return true;
    if (filter === "bestsellers") return getBestSellers().some((p) => p.id === product.id);
    return product.categories.includes(filter);
  }

  function renderAll() {
    const bestSellers = getBestSellers();
    const byCategory = {
      perfumes: products.filter((p) => p.categories.includes("perfumes")),
      makeup: products.filter((p) => p.categories.includes("makeup")),
      bags: products.filter((p) => p.categories.includes("bags")),
      offers: products.filter((p) => p.categories.includes("offers") && p.offer && p.offer.active)
    };

    // When a filter other than "all" is active, only that section's grid
    // is populated with matching products; the others are cleared so the
    // page reads as "showing this category" rather than "showing everything
    // plus a filter that did nothing." Section headings stay visible so
    // the page structure doesn't jump.
    if (activeFilter === "all") {
      renderGrid(gridSections.bestsellers, bestSellers, { isBestSellerGrid: true });
      renderGrid(gridSections.perfumes, byCategory.perfumes, {});
      renderGrid(gridSections.makeup, byCategory.makeup, {});
      renderGrid(gridSections.bags, byCategory.bags, {});
      renderGrid(gridSections.offers, byCategory.offers, {});
    } else {
      const filtered = products.filter((p) => matchesFilter(p, activeFilter));
      Object.keys(gridSections).forEach((key) => {
        if (key === activeFilter) {
          renderGrid(gridSections[key], key === "bestsellers" ? bestSellers : filtered, { isBestSellerGrid: key === "bestsellers" });
        } else {
          gridSections[key].innerHTML = "";
        }
      });
    }

    $all(".product-section[data-section]").forEach((section) => {
      const key = section.dataset.section;
      section.style.display = activeFilter === "all" || activeFilter === key ? "" : "none";
    });

    renderAdminList();
  }

  // ---------------------------------------------------------------
  // CATEGORY FILTER
  // ---------------------------------------------------------------

  function setActiveFilter(filter) {
    activeFilter = filter;
    $all(".pill").forEach((pill) => {
      const isActive = pill.dataset.filter === filter;
      pill.classList.toggle("is-active", isActive);
      pill.setAttribute("aria-selected", String(isActive));
    });
    renderAll();
  }

  categoryPills.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
    setActiveFilter(pill.dataset.filter);
    const targetId = pill.dataset.filter === "all" ? "top" : pill.dataset.filter;
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      window.setTimeout(() => targetEl.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
    }
  });

  // Navbar links also drive the same filter state, so clicking "Perfumes"
  // in the nav both scrolls AND filters the page to that category.
  $all("[data-category]").forEach((link) => {
    link.addEventListener("click", () => {
      setActiveFilter(link.dataset.category);
      closeMobileMenu();
    });
  });

  // ---------------------------------------------------------------
  // GENERIC MODAL OPEN/CLOSE HELPERS
  // ---------------------------------------------------------------

  function openOverlay(overlay) {
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeOverlay(overlay) {
    overlay.classList.remove("is-open");
    // Only restore scroll if no other overlay is currently open.
    const anyOpen = $all(".modal-overlay.is-open, .admin-overlay.is-open").length > 0;
    if (!anyOpen) document.body.style.overflow = "";
  }

  $all(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay(overlay);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    $all(".modal-overlay.is-open").forEach((overlay) => closeOverlay(overlay));
  });

  // ---------------------------------------------------------------
  // PRODUCT DETAIL MODAL
  // ---------------------------------------------------------------

  function openProductModal(productId) {
    const product = findProduct(productId);
    if (!product) return;
    currentModalProduct = product;

    // Reset the image element fresh each open so a previous fallback swap
    // (from a different product) can't leak into this one. Note: we look
    // up the wrapper by its own stable selector rather than via
    // `productModalImg.parentElement` — once a fallback has fired even
    // once, `replaceWith()` detaches that original <img> node permanently,
    // so its `.parentElement` would be null forever after. `.product-modal__media`
    // never gets replaced, only the <img> inside it does, so it's a safe anchor.
    const mediaWrap = $(".product-modal__media");
    if (!$("#productModalImg")) {
      // Fallback had replaced the <img> last time it was opened; rebuild it.
      const freshImg = document.createElement("img");
      freshImg.id = "productModalImg";
      mediaWrap.appendChild(freshImg);
    }
    const imgEl = $("#productModalImg");
    imgEl.src = product.image;
    imgEl.alt = product.name;
    attachImageFallback(imgEl, product.name);

    const isBestSeller = getBestSellers().some((p) => p.id === product.id);
    productModalBadges.innerHTML = buildBadgesHtml(product, { includeBestSeller: isBestSeller });
    productModalName.textContent = product.name;
    productModalDesc.textContent = product.description;
    productModalPrice.innerHTML = buildPriceHtml(product);

    openOverlay(productModalOverlay);
  }

  $("#productModalClose").addEventListener("click", () => closeOverlay(productModalOverlay));

  productModalOrderBtn.addEventListener("click", () => {
    if (!currentModalProduct) return;
    closeOverlay(productModalOverlay);
    openOrderModal(currentModalProduct);
  });

  // ---------------------------------------------------------------
  // WHATSAPP ORDER FORM
  // ---------------------------------------------------------------
  // Customer data (name/phone/address) lives ONLY in these local `const`
  // bindings created at submit time, and in the three <input> elements
  // between open and submit. Nothing here is ever passed to storage.js,
  // assigned to a module-level variable, or written anywhere persistent.
  // The form is reset and the values fall out of scope immediately after
  // the WhatsApp tab opens.

  function openOrderModal(product) {
    orderModalProduct = product;
    orderModalProductLine.textContent = `${product.name} — ${formatPrice(
      product.offer && product.offer.active && product.offer.price != null ? product.offer.price : product.price
    )}`;
    orderForm.reset();
    openOverlay(orderModalOverlay);
    window.setTimeout(() => orderNameInput.focus(), 150);
  }

  $("#orderModalClose").addEventListener("click", () => {
    orderForm.reset();
    orderModalProduct = null;
    closeOverlay(orderModalOverlay);
  });

  function buildWhatsAppOrderMessage(product, fullName, phone, address) {
    const effectivePrice =
      product.offer && product.offer.active && product.offer.price != null ? product.offer.price : product.price;

    const lines = [
      `Hello Romaza.Store, I'd like to order:`,
      ``,
      `Product: ${product.name}`,
      `Price: ${formatPrice(effectivePrice)}`,
      ``,
      `Full Name: ${fullName}`,
      `Phone: ${phone}`,
      `Address: ${address}`
    ];
    return encodeURIComponent(lines.join("\n"));
  }

  orderForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!orderModalProduct) return;

    // These three values exist only in this function's local scope.
    const fullName = orderNameInput.value.trim();
    const phone = orderPhoneInput.value.trim();
    const address = orderAddressInput.value.trim();

    if (!fullName || !phone || !address) return; // required attrs already guard this; defensive no-op otherwise

    // Increment the (non-personal) best-seller counter for this product —
    // this is the ONLY localStorage write triggered by this flow, and it
    // stores an id + integer, nothing derived from fullName/phone/address.
    RomazaStorage.incrementClick(orderModalProduct.id);

    const messageText = buildWhatsAppOrderMessage(orderModalProduct, fullName, phone, address);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${messageText}`;

    // Immediate handoff — no confirmation screen, no success state that
    // could hold onto these values.
    window.open(url, "_blank", "noopener,noreferrer");

    orderForm.reset();
    orderModalProduct = null;
    closeOverlay(orderModalOverlay);

    renderAll(); // reflect the updated best-seller ordering right away
    showToast("Opening WhatsApp…");
  });

  // ---------------------------------------------------------------
  // ADMIN LOGIN
  // ---------------------------------------------------------------

  $("#adminLinkBtn").addEventListener("click", () => {
    adminLoginForm.reset();
    adminLoginError.hidden = true;
    openOverlay(adminLoginOverlay);
    window.setTimeout(() => adminPasswordInput.focus(), 150);
  });

  $("#adminLoginClose").addEventListener("click", () => closeOverlay(adminLoginOverlay));

  adminLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = adminPasswordInput.value;
    if (value === ADMIN_PASSWORD) {
      adminLoginError.hidden = true;
      adminLoginForm.reset();
      closeOverlay(adminLoginOverlay);
      openAdminPanel();
    } else {
      adminLoginError.hidden = false;
      adminPasswordInput.select();
    }
  });

  // ---------------------------------------------------------------
  // ADMIN PANEL — list + CRUD
  // ---------------------------------------------------------------

  function openAdminPanel() {
    confirmDeleteId = null;
    renderAdminList();
    adminOverlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeAdminPanel() {
    confirmDeleteId = null;
    adminOverlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  $("#adminLogoutBtn").addEventListener("click", closeAdminPanel);

  function renderAdminList() {
    // Only render when the panel is actually open — avoids wasted work
    // on every product mutation triggered elsewhere on the page.
    if (!adminOverlay.classList.contains("is-open")) return;

    adminProductList.innerHTML = "";

    if (products.length === 0) {
      adminProductList.innerHTML = `<p class="admin-panel__empty">No products yet — add your first one.</p>`;
      return;
    }

    products.forEach((product) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      row.dataset.productId = product.id;

      const clickCount = RomazaStorage.getClickCount(product.id);
      const isConfirming = confirmDeleteId === product.id;

      row.innerHTML = `
        <div class="admin-row__media"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" /></div>
        <div class="admin-row__info">
          <div class="admin-row__name">${escapeHtml(product.name)}</div>
          <div class="admin-row__meta">
            ${buildBadgesHtml(product, { includeBestSeller: false })}
            <span>${formatPrice(product.price)}</span> · <span>⭐ ${clickCount} clicks</span>
          </div>
        </div>
        <div class="admin-row__actions">
          ${
            isConfirming
              ? `
                <button class="btn btn--ghost btn--sm" data-action="cancel-delete">Cancel</button>
                <button class="btn btn--danger btn--sm" data-action="confirm-delete">Confirm?</button>
              `
              : `
                <button class="btn btn--outline btn--sm" data-action="edit">Edit</button>
                <button class="btn btn--ghost btn--sm" data-action="delete">Delete</button>
              `
          }
        </div>
      `;

      const img = row.querySelector(".admin-row__media img");
      attachImageFallback(img, product.name);

      adminProductList.appendChild(row);
    });
  }

  // Event delegation on the list — rows are re-rendered often (on every
  // products/clicks change), so binding once on the container avoids
  // re-attaching listeners per row.
  adminProductList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = btn.closest(".admin-row");
    const productId = row.dataset.productId;
    const action = btn.dataset.action;

    // Deliberately explicit confirm/cancel buttons rather than an
    // onBlur-based confirm: on touch devices, blur-vs-click ordering
    // across two buttons is unreliable, so state here only changes on
    // a genuine click on one of these two buttons.
    if (action === "delete") {
      confirmDeleteId = productId;
      renderAdminList();
    } else if (action === "cancel-delete") {
      confirmDeleteId = null;
      renderAdminList();
    } else if (action === "confirm-delete") {
      confirmDeleteId = null;
      setProducts(products.filter((p) => p.id !== productId)); // renderAll() inside setProducts already re-renders this list
      showToast("Product deleted.");
    } else if (action === "edit") {
      confirmDeleteId = null;
      openProductForm(productId);
    }
  });

  $("#adminAddBtn").addEventListener("click", () => openProductForm(null));

  // ---------------------------------------------------------------
  // ADMIN — ADD/EDIT PRODUCT FORM
  // ---------------------------------------------------------------

  const emptyProductDefaults = {
    name: "",
    description: "",
    price: "",
    image: "",
    categories: [],
    offer: { active: false, price: null }
  };

  function openProductForm(productId) {
    editingProductId = productId;
    const isEditing = !!productId;
    const source = isEditing ? findProduct(productId) : emptyProductDefaults;

    productFormTitle.textContent = isEditing ? "Edit Product" : "Add Product";
    productFormId.value = isEditing ? source.id : "";
    productFormImage.value = source.image || "";
    productFormName.value = source.name || "";
    productFormPrice.value = source.price === "" ? "" : source.price;
    productFormDesc.value = source.description || "";

    const cats = source.categories || [];
    catPerfumes.checked = cats.includes("perfumes");
    catMakeup.checked = cats.includes("makeup");
    catBags.checked = cats.includes("bags");

    const offer = source.offer || { active: false, price: null };
    offerActive.checked = !!offer.active;
    offerPrice.value = offer.price != null ? offer.price : "";
    offerPriceWrap.hidden = !offer.active;

    if (isEditing) {
      productFormClickCount.hidden = false;
      productFormClickValue.textContent = String(RomazaStorage.getClickCount(source.id));
    } else {
      productFormClickCount.hidden = true;
    }

    updateProductFormPreview();
    openOverlay(productFormOverlay);
  }

  function updateProductFormPreview() {
    const url = productFormImage.value.trim();
    const wrap = $("#productFormPreviewWrap");
    if (!url) {
      wrap.innerHTML = `<img id="productFormPreview" alt="Preview" />`;
      return;
    }
    // Rebuild the <img> each time so a prior error-fade state never
    // carries over to a new URL.
    wrap.innerHTML = `<img id="productFormPreview" alt="Preview" />`;
    const img = $("#productFormPreview");
    img.src = url;
    img.style.opacity = "1";
    img.addEventListener("error", () => { img.style.opacity = "0.25"; }, { once: true });
  }

  productFormImage.addEventListener("input", updateProductFormPreview);

  offerActive.addEventListener("change", () => {
    offerPriceWrap.hidden = !offerActive.checked;
    if (!offerActive.checked) offerPrice.value = "";
  });

  $("#productFormClose").addEventListener("click", () => closeOverlay(productFormOverlay));
  $("#productFormCancel").addEventListener("click", () => closeOverlay(productFormOverlay));

  productForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = productFormName.value.trim();
    const image = productFormImage.value.trim();
    const description = productFormDesc.value.trim();
    const price = parseFloat(productFormPrice.value);

    if (!name || !image || !description || Number.isNaN(price)) {
      showToast("Please fill in all required fields.");
      return;
    }

    // Rebuild categories from the checkboxes, then re-add/remove 'offers'
    // based solely on the offer toggle — this mirrors the React version's
    // submit logic exactly: strip any 'offers' tag first, then re-add it
    // only if the toggle is currently on, so a stale tag can never survive
    // a toggle-off and there's no path to double-representation.
    const categories = [];
    if (catPerfumes.checked) categories.push("perfumes");
    if (catMakeup.checked) categories.push("makeup");
    if (catBags.checked) categories.push("bags");

    const isOfferActive = offerActive.checked;
    if (isOfferActive) categories.push("offers");

    const offerPriceValue = isOfferActive && offerPrice.value !== "" ? parseFloat(offerPrice.value) : null;

    const productData = {
      name,
      image,
      description,
      price,
      categories,
      offer: { active: isOfferActive, price: offerPriceValue }
    };

    if (editingProductId) {
      // Re-pin id last so nothing in productData (which never contains an
      // id field) can accidentally clobber it.
      const updated = products.map((p) =>
        p.id === editingProductId ? { ...p, ...productData, id: p.id } : p
      );
      setProducts(updated);
      showToast("Product updated.");
    } else {
      const newProduct = { id: "p-" + Date.now().toString(36), ...productData };
      setProducts([...products, newProduct]);
      showToast("Product added.");
    }

    closeOverlay(productFormOverlay); // setProducts() above already re-rendered the list
  });

  // ---------------------------------------------------------------
  // NAVBAR — mobile menu
  // ---------------------------------------------------------------

  function closeMobileMenu() {
    navbar.classList.remove("is-mobile-open");
    menuToggle.setAttribute("aria-expanded", "false");
  }

  menuToggle.addEventListener("click", () => {
    const isOpen = navbar.classList.toggle("is-mobile-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  // ---------------------------------------------------------------
  // SCROLL-SYNCED ACTIVE PILL
  // ---------------------------------------------------------------
  // Purely a visual nicety layered on top of the click-driven filter:
  // as the visitor scrolls past a section under "All", highlight the
  // matching pill without actually engaging the filter (so scrolling
  // never hides other sections out from under someone casually browsing).

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      if (activeFilter !== "all") return; // don't fight an explicit filter choice
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const key = entry.target.dataset.section;
        $all(".pill").forEach((pill) => {
          pill.classList.toggle("is-active", pill.dataset.filter === key);
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );

  $all(".product-section[data-section]").forEach((section) => sectionObserver.observe(section));

  // Restore the "All" pill highlight once scrolled back to the very top.
  window.addEventListener("scroll", () => {
    if (activeFilter !== "all") return;
    if (window.scrollY < 80) {
      $all(".pill").forEach((pill) => pill.classList.toggle("is-active", pill.dataset.filter === "all"));
    }
  }, { passive: true });

  // ---------------------------------------------------------------
  // EDITORIAL IMAGE FALLBACK WIRING
  // ---------------------------------------------------------------

  $all(".editorial").forEach((section) => attachEditorialFallback(section));

  // ---------------------------------------------------------------
  // FOOTER YEAR
  // ---------------------------------------------------------------

  $("#footerYear").textContent = String(new Date().getFullYear());

  // ---------------------------------------------------------------
  // HERO IMAGE FALLBACK
  // ---------------------------------------------------------------

  attachImageFallback($("#heroImage"), "Romaza.Store");

  // ---------------------------------------------------------------
  // INITIAL RENDER
  // ---------------------------------------------------------------

  renderAll();
})();