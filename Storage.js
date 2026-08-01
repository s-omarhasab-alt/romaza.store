/**
 * storage.js
 * ---------------------------------------------------------------
 * This is the ONLY file in the project that touches localStorage.
 *
 * It stores exactly two things, both non-personal:
 *   1. Product catalog data (name, price, description, image, categories, offer)
 *   2. Best-Seller click counts, keyed by product id (a plain integer)
 *
 * It NEVER receives, and has no code path capable of receiving,
 * customer order data (Full Name / Phone / Address). That data lives
 * only in the WhatsApp order form's local variables in app.js and is
 * discarded the moment the WhatsApp redirect happens. Search app.js
 * for `buildWhatsAppOrderMessage` to see the only place that data is
 * read, and note it is never passed to any function in this file.
 * ---------------------------------------------------------------
 */

const STORAGE_KEYS = {
  PRODUCTS: "romaza_products_v1",
  CLICKS: "romaza_bestseller_clicks_v1"
};

const RomazaStorage = (function () {

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      // Private browsing / storage disabled — fail quietly, app still works
      // in-memory for this session.
      console.warn("Romaza: localStorage unavailable for read:", err);
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.warn("Romaza: localStorage unavailable for write:", err);
      return false;
    }
  }

  // ---------- Products ----------

  function loadProducts() {
    const raw = safeGet(STORAGE_KEYS.PRODUCTS);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch (err) {
      console.warn("Romaza: corrupted product data in localStorage, ignoring.", err);
      return null;
    }
  }

  function saveProducts(products) {
    return safeSet(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }

  function seedProductsIfEmpty(seedArray) {
    const existing = loadProducts();
    if (existing && existing.length > 0) return existing;
    saveProducts(seedArray);
    return seedArray;
  }

  // ---------- Best-seller click counts ----------
  // Stored as a flat { [productId]: number } map. This map holds ONLY
  // an id and an integer — no name, no phone, no address, no timestamp
  // tied to a person. It cannot be traced back to any visitor.

  function loadClicks() {
    const raw = safeGet(STORAGE_KEYS.CLICKS);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
      return parsed;
    } catch (err) {
      return {};
    }
  }

  function incrementClick(productId) {
    const clicks = loadClicks();
    clicks[productId] = (clicks[productId] || 0) + 1;
    safeSet(STORAGE_KEYS.CLICKS, JSON.stringify(clicks));
    return clicks[productId];
  }

  function getClickCount(productId) {
    const clicks = loadClicks();
    return clicks[productId] || 0;
  }

  return {
    loadProducts,
    saveProducts,
    seedProductsIfEmpty,
    loadClicks,
    incrementClick,
    getClickCount
  };
})();