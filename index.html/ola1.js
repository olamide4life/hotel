// ola.js — cleaned & merged single-file script (keep alongside your HTML)
// preserves behavior from your original, with fixes: single DOMContentLoaded, no duplicate modal wiring,
// delegated cart controls, robust guards, and consistent event patterns.

"use strict";


(function () {
  // Helper safe-get
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));

  // Format numbers (no decimals)
  function formatN(amount) {
    return Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  // Small utility: closest ancestor matching selector (safe)
  function closest(el, selector) {
    return el ? el.closest(selector) : null;
  }

  document.addEventListener("DOMContentLoaded", () => {
    /* ---------------- AOS (if loaded) ---------------- */
    if (window.AOS) {
      try { AOS.init(); } catch (e) { /* ignore */ }
    }

    /* ---------------- Back to Top ---------------- */
    const backToTopBtn = $("#backToTop");
    if (backToTopBtn) {
      const toggleBackBtn = () => {
        backToTopBtn.style.display = (window.scrollY > 300 ? "block" : "none");
      };
      toggleBackBtn();
      window.addEventListener("scroll", toggleBackBtn, { passive: true });
      backToTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    }

    /* ---------------- Mobile Nav + Smooth Links ---------------- */
    const mobileToggle = $("#mobileMenuToggle");
    const navLinks = $("#navLinks");
    if (mobileToggle && navLinks) {
      mobileToggle.addEventListener("click", () => {
        navLinks.classList.toggle("active");
        mobileToggle.addEventListener("click", () => {
  navLinks.classList.toggle("active");

  if (navLinks.classList.contains("active")) {
    lockScroll();
  } else {
    unlockScroll();
  }

  const icon = mobileToggle.querySelector("i");
  if (icon) {
    if (icon.classList.contains("fa-bars")) icon.classList.replace("fa-bars", "fa-times");
    else icon.classList.replace("fa-times", "fa-bars");
  }
});

        const icon = mobileToggle.querySelector("i");
        if (icon) {
          if (icon.classList.contains("fa-bars")) icon.classList.replace("fa-bars", "fa-times");
          else icon.classList.replace("fa-times", "fa-bars");
        }
      });

      // delegate clicks inside navLinks for anchors
      navLinks.addEventListener("click", (e) => {
        const a = closest(e.target, "a");
        if (!a) return;
        const href = a.getAttribute("href");
        if (href && href.startsWith("#")) {
          e.preventDefault();
          const id = href.slice(1);
          const target = document.getElementById(id);
          if (target) target.scrollIntoView({ behavior: "smooth" });
        }
        navLinks.classList.remove("active");
        const icon = mobileToggle.querySelector("i");
        if (icon && icon.classList.contains("fa-times")) icon.classList.replace("fa-times", "fa-bars");
      });
    }

    /* ---------------- Popup Ad ---------------- */
    const popup = $("#popup-ad");
    const popupCloseBtn = $("#popupCloseBtn");
    if (popup) {
      if (popupCloseBtn) popupCloseBtn.addEventListener("click", () => popup.style.display = "none");
      popup.addEventListener("click", (e) => { if (e.target === popup) popup.style.display = "none"; });
    }

    /* ---------------- Calculator (global functions used by inline onclick) ---------------- */
    // Keep these as window functions so your HTML inline onclicks continue to work
    window.toggleCalculator = function () {
      const calc = document.getElementById("menuCalculator");
      if (!calc) return;
      calc.style.display = (calc.style.display === "block") ? "none" : "block";
    };
    window.append = function (v) {
      const display = document.getElementById("display");
      if (!display) return;
      display.value += v;
    };
    window.clearDisplay = function () {
      const display = document.getElementById("display");
      if (!display) return;
      display.value = "";
    };
    window.backspace = function () {
      const display = document.getElementById("display");
      if (!display) return;
      display.value = display.value.slice(0, -1);
    };
    window.calculate = function () {
      const display = document.getElementById("display");
      if (!display) return;
      try {
        // eslint-disable-next-line no-eval
        const result = eval(display.value);
        display.value = (result === undefined || result === null) ? "" : String(result);
      } catch {
        display.value = "Error";
      }
    };

    /* ---------------- Category open/close ---------------- */
    // Existing markup uses .category-header and .category-items
    $$(".category-header").forEach(header => {
      header.addEventListener("click", () => {
        const items = header.nextElementSibling;
        const arrow = header.querySelector(".arrow");
        const currentlyOpen = items && getComputedStyle(items).display !== "none";

        // close all first
        $$(".category-items").forEach(div => div.style.display = "none");
        $$(".category-header .arrow").forEach(a => a.textContent = "▶");

        // then open only if it wasn’t open already
        if (items && !currentlyOpen) {
          items.style.display = "block";
          if (arrow) arrow.textContent = "▼";
        }
      });
    });

    /* ---------------- Floating cart button visibility (menu in view) ---------------- */
    const cartBtnFloat = $("#toggleCartBtn");
    const menuSection = $("#menu");
    if (cartBtnFloat && menuSection) {
      const checkMenuInView = () => {
        const rect = menuSection.getBoundingClientRect();
        const inView = rect.top < window.innerHeight && rect.bottom > 0;
        cartBtnFloat.classList.toggle("show", inView);
      };
      checkMenuInView();
      window.addEventListener("scroll", checkMenuInView, { passive: true });
      window.addEventListener("resize", checkMenuInView);
    }

    /* ================== CART SYSTEM ================== */
    const TAX_RATE = 0.05;
    const cart = []; // { name, price, qty, img }

    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
cart.push(...savedCart);

    const cartPanel = $("#cart-panel") || $(".cart-panel") || document.querySelector(".cart-panel");
    const toggleCartBtnEl = $("#toggleCartBtn");
    const closeCartBtn = $("#closeCartBtn");
    const cartList = $("#cart-list");
    const cartSummary = $("#cart-summary");
    const cartCount = $("#cartCount");

    function updateCart() {
      if (!cartList || !cartSummary || !cartCount) return { subtotal: 0, tax: 0, total: 0 };

      cartList.innerHTML = "";
      cart.forEach((item, idx) => {
        const li = document.createElement("li");
        li.className = "cart-item";
        li.innerHTML = `
          <img src="${item.img || 'any.jpg'}" alt="${item.name}" style="width:40px;height:40px;border-radius:5px;margin-right:8px;object-fit:cover;">
          <div style="flex:1;">
            <div style="font-weight:600;color:#fff;">${item.name}</div>
            <div style="font-size:13px;color:#ddd;">₦${formatN(item.price)} × ${item.qty}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <div>
              <button class="qty-btn" data-action="inc" data-index="${idx}">➕</button>
              <button class="qty-btn" data-action="dec" data-index="${idx}">➖</button>
            </div>
            <button class="delete-btn" data-action="del" data-index="${idx}">❌</button>
          </div>
        `;
        cartList.appendChild(li);
      });

      const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
      const tax = Math.round(subtotal * TAX_RATE);
      const total = subtotal + tax;

      cartSummary.innerHTML = `
        <p>Subtotal: ₦${formatN(subtotal)}</p>
        <p>Tax (5%): ₦${formatN(tax)}</p>
        <p><strong>Total: ₦${formatN(total)}</strong></p>
      `;

      const count = cart.reduce((s, it) => s + it.qty, 0);
      if (cartCount) {
        cartCount.style.display = count > 0 ? "inline-block" : "none";
        cartCount.textContent = count;
      }

      localStorage.setItem("cart", JSON.stringify(cart));


      return { subtotal, tax, total };
    }

    // Add to cart: delegate from document (works even if items are added later)
    document.addEventListener("click", (e) => {
      const addBtn = closest(e.target, ".add-btn");
      if (!addBtn) return;
      const name = addBtn.dataset.name || "Item";
      const price = Number(addBtn.dataset.price) || 0;
      const img = addBtn.dataset.img || (closest(addBtn, ".menu-item")?.querySelector("img")?.src) || "any.jpg";

      const existing = cart.find(i => i.name === name);
      if (existing) existing.qty += 1;
      else cart.push({ name, price, qty: 1, img });

      if (toggleCartBtnEl) {
        toggleCartBtnEl.classList.remove("wiggle");
        void toggleCartBtnEl.offsetWidth;
        toggleCartBtnEl.classList.add("wiggle");
        setTimeout(() => toggleCartBtnEl.classList.remove("wiggle"), 700);
      }

      updateCart();
    

      
    });

    // Cart panel open/close
    if (toggleCartBtnEl && cartPanel) {
      toggleCartBtnEl.addEventListener("click", () => {
  cartPanel.classList.toggle("show");
  cartPanel.classList.contains("show") ? lockScroll() : unlockScroll();
});

    }
    if (closeCartBtn && cartPanel) {
     closeCartBtn.addEventListener("click", () => {
  cartPanel.classList.remove("show");
  unlockScroll();
});

    }

    // Cart list actions (use delegation on cartList)
    if (cartList) {
      cartList.addEventListener("click", (e) => {
        const btn = closest(e.target, "button[data-action]");
        if (!btn) return;
        const idx = Number(btn.dataset.index);
        if (!Number.isFinite(idx) || !cart[idx]) return;
        const action = btn.dataset.action;
        if (action === "inc") cart[idx].qty += 1;
        else if (action === "dec") {
          cart[idx].qty -= 1;
          if (cart[idx].qty <= 0) cart.splice(idx, 1);
        } else if (action === "del") cart.splice(idx, 1);
        updateCart();
      });
    }

    // initial wiggle (non-blocking)
    if (cartBtnFloat) {
      cartBtnFloat.classList.remove("shake");
      void cartBtnFloat.offsetWidth;
      cartBtnFloat.classList.add("shake");
    }

    /* ---------------- Order modal (populate & send to WhatsApp) ---------------- */
    const sendWhatsAppBtn = $("#send-whatsapp");
    const orderModal = $("#orderModal");
    const closeOrderModal = $("#closeOrderModal");
    const orderItemsEl = $("#orderItems");
    const orderTotalsEl = $("#orderTotals");
    const copyAccountBtn = $("#copyAccountBtn");
    const accountNumberEl = $("#accountNumber");
    const orderForm = $("#orderForm");

    function openOrderModal() {
      if (!orderModal || !orderItemsEl || !orderTotalsEl) return;
      if (cart.length === 0) {
        alert("⚠️ Your cart is empty!");
        return;
      }

      orderItemsEl.innerHTML = "";
      cart.forEach((it, i) => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.padding = "6px 0";
        li.innerHTML = `<span>${i+1}. ${it.name}</span><span>₦${formatN(it.price)} × ${it.qty}</span>`;
        orderItemsEl.appendChild(li);
      });

      const { subtotal, tax, total } = updateCart();
      orderTotalsEl.innerHTML = `
        <p>Subtotal: ₦${formatN(subtotal)}</p>
        <p>Tax (5%): ₦${formatN(tax)}</p>
        <p><strong>Total: ₦${formatN(total)}</strong></p>
      `;

      orderModal.style.display = "block";
      lockScroll();
    }

    if (sendWhatsAppBtn) sendWhatsAppBtn.addEventListener("click", openOrderModal);
    if (closeOrderModal) closeOrderModal.addEventListener("click", () => { if (orderModal) orderModal.style.display = "none"; });

    if (orderForm) {
      orderForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (cart.length === 0) {
          alert("Your cart is empty!");
          return;
        }
        const name = $("#custName")?.value || "";
        const email = $("#custEmail")?.value || "";
        const phone = $("#custPhone")?.value || "";
        const table = $("#tableNo")?.value || "";
        const { subtotal, tax, total } = updateCart();

        let orderText = `🛒 *New Order*\n\n`;
        orderText += `👤 Name: ${name}\n📧 Email: ${email}\n📞 Phone: ${phone}\n🪑 Table: ${table}\n\n`;
        orderText += `📦 Items:\n`;
        cart.forEach((it, i) => orderText += `${i+1}. ${it.name} - ₦${formatN(it.price)} × ${it.qty}\n`);
        orderText += `\nSubtotal: ₦${formatN(subtotal)}\nTax (5%): ₦${formatN(tax)}\n*Total: ₦${formatN(total)}*`;

        sendToWhatsApp(orderText);

        orderModal.style.display = "none";
        unlockScroll();

      cart.length = 0;
localStorage.removeItem("cart");
updateCart();

      });
    }

    // Copy account number
    if (copyAccountBtn && accountNumberEl) {
      copyAccountBtn.addEventListener("click", () => {
        navigator.clipboard?.writeText(accountNumberEl.textContent.trim())
          .then(() => alert("Account number copied!"))
          .catch(() => alert("Failed to copy"));
      });
    }

    /* ---------------- IMAGE modals (item images) ---------------- */
    /* ---------------- SCROLL LOCK HELPERS ---------------- */
function lockScroll() {
  document.body.style.overflow = "hidden";
}

function unlockScroll() {
  document.body.style.overflow = "";
}

/* ---------------- IMAGE modals (item images) ---------------- */
const imgModal = $("#imgModal");
const imgModalContent = $("#imgModalContent");
const imgCaption = $("#imgCaption");
const closeImgModalBtn = imgModal ? imgModal.querySelector(".close-modal") : null;

if (imgModal && imgModalContent) {
  $$(".item-img").forEach(img => {
    img.addEventListener("click", () => {
      imgModal.style.display = "block";
      lockScroll();

      imgModalContent.src = img.src || "";
      imgCaption.textContent = img.alt || "";
      imgModalContent.style.maxWidth = "90%";
      imgModalContent.style.maxHeight = "85vh";
      imgModalContent.style.objectFit = "contain";
    });
  });

  if (closeImgModalBtn) {
    closeImgModalBtn.addEventListener("click", () => {
      imgModal.style.display = "none";
      unlockScroll();
    });
  }
}

/* ---------------- Gallery (gallery-specific modal) ---------------- */
const gallerySection = $("#gallery");
let gallerySectionModal = null;
let gallerySectionModalImg = null;

if (gallerySection) {
  gallerySectionModal = gallerySection.querySelector("#imageModal") || $("#imageModal");
  if (gallerySectionModal) {
    gallerySectionModalImg =
      gallerySectionModal.querySelector("#modalImage") ||
      gallerySectionModal.querySelector("img");

    const galleryClose = gallerySectionModal.querySelector(".close");
    if (galleryClose) {
      galleryClose.textContent = "←";
      galleryClose.style.position = "absolute";
      galleryClose.style.left = "18px";
      galleryClose.style.top = "18px";
      galleryClose.style.cursor = "pointer";
      galleryClose.addEventListener("click", () => {
        gallerySectionModal.style.display = "none";
        unlockScroll();
      });
    }

    if (gallerySectionModalImg) {
      gallerySectionModalImg.style.maxWidth = "95%";
      gallerySectionModalImg.style.maxHeight = "85vh";
      gallerySectionModalImg.style.objectFit = "contain";
      gallerySectionModalImg.style.display = "block";
    }

    $$(".gallery-images img", gallerySection).forEach(img => {
      img.addEventListener("click", () => {
        if (gallerySectionModalImg) {
          gallerySectionModalImg.src = img.src || "";
        }
        gallerySectionModal.style.display = "flex";
        lockScroll();
      });
    });
  } else {
    /* fallback to global #imageModal if exists */
    const fallbackModal = $("#imageModal");
    const fallbackImg = fallbackModal ? fallbackModal.querySelector("#modalImage") : null;
    const fallbackClose = fallbackModal ? fallbackModal.querySelector(".close") : null;

    if (fallbackModal && fallbackImg) {
      if (fallbackClose) {
        fallbackClose.addEventListener("click", () => {
          fallbackModal.style.display = "none";
          unlockScroll();
        });
      }

      $$(".gallery-images img", gallerySection).forEach(img => {
        img.addEventListener("click", () => {
          fallbackImg.src = img.src || "";
          fallbackImg.style.objectFit = "contain";
          fallbackImg.style.maxWidth = "95%";
          fallbackImg.style.maxHeight = "85vh";
          fallbackModal.style.display = "flex";
          lockScroll();
        });
      });
    }
  }
}

/* ---------------- Generic outside click & Esc close for modals we control ---------------- */
window.addEventListener("click", (e) => {
  const t = e.target;

  if (t === orderModal) orderModal.style.display = "none";

  if (t === imgModal) {
    imgModal.style.display = "none";
    unlockScroll();
  }

  if (gallerySectionModal && t === gallerySectionModal) {
    gallerySectionModal.style.display = "none";
    unlockScroll();
  }

  if (t === popup) popup.style.display = "none";
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (orderModal) orderModal.style.display = "none";

    if (imgModal) {
      imgModal.style.display = "none";
      unlockScroll();
    }

    if (gallerySectionModal) {
      gallerySectionModal.style.display = "none";
      unlockScroll();
    }

    if (cartPanel) cartPanel.classList.remove("show");
    if (popup) popup.style.display = "none";

    const rgm = $("#roomGalleryModal");
    if (rgm) rgm.style.display = "none";
  }
});

    /* ---------------- Paystack (optional) ---------------- */
    const paystackBtn = $("#paystackBtn");
    if (paystackBtn) {
      paystackBtn.addEventListener("click", () => {
        if (cart.length === 0) {
          alert("⚠️ Your cart is empty!");
          return;
        }
        const { total } = updateCart();
        if (typeof PaystackPop === "undefined") {
          alert("Paystack not loaded.");
          return;
        }
        const handler = PaystackPop.setup({
          key: 'pk_test_e89c27e4de02ef906121f4b64e9c3a501733954c', // replace with real key
          email: "customer@example.com",
          amount: total * 100,
          currency: "NGN",
          ref: 'ORDER-' + Date.now(),
          callback: function (response) {
            alert('✅ Payment successful! Ref: ' + response.reference);
            cart.length = 0;
            updateCart();
          },
          onClose: function () {
            alert('❌ Transaction canceled.');
          }
        });
        handler.openIframe();
      });
    }

    /* ---------------- ROOM BOOKING + ROOM VIEW GALLERY ---------------- */
    const roomGalleryModal = $("#roomGalleryModal");
    const roomGalleryImage = $("#roomGalleryImage");
    const closeGalleryBtn = roomGalleryModal ? roomGalleryModal.querySelector(".close-gallery") : null;

    let galleryImages = [];
    let galleryIndex = 0;

    function updateGalleryImage() {
      if (!roomGalleryImage || galleryImages.length === 0) return;
      roomGalleryImage.src = galleryImages[galleryIndex];
      // indicators
      let indicatorWrap = document.querySelector(".gallery-indicators");
      if (!indicatorWrap && roomGalleryModal) {
        indicatorWrap = document.createElement("div");
        indicatorWrap.className = "gallery-indicators";
        indicatorWrap.style.position = "absolute";
        indicatorWrap.style.bottom = "15px";
        indicatorWrap.style.left = "50%";
        indicatorWrap.style.transform = "translateX(-50%)";
        indicatorWrap.style.display = "flex";
        indicatorWrap.style.gap = "8px";
        indicatorWrap.style.zIndex = "100";
        roomGalleryModal.appendChild(indicatorWrap);
      }
      if (!indicatorWrap) return;
      indicatorWrap.innerHTML = "";
      galleryImages.forEach((_, i) => {
        const dot = document.createElement("div");
        dot.style.width = "10px";
        dot.style.height = "10px";
        dot.style.borderRadius = "50%";
        dot.style.background = i === galleryIndex ? "#f39c12" : "#999";
        dot.style.cursor = "pointer";
        dot.addEventListener("click", () => {
          galleryIndex = i;
          updateGalleryImage();
        });
        indicatorWrap.appendChild(dot);
      });
    }

    function openRoomGallery(images = []) {
      if (!roomGalleryModal) return;
      galleryImages = images.slice();
      galleryIndex = 0;
      updateGalleryImage();
      roomGalleryModal.style.display = "flex";
      lockScroll();
    }
    function closeRoomGallery() {
      if (!roomGalleryModal) return;
      roomGalleryModal.style.display = "none";
      unlockScroll();
    }
    if (closeGalleryBtn) closeGalleryBtn.addEventListener("click", closeRoomGallery);

    // Wire .view-btn elements
    $$(".view-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const arr = (btn.dataset.images || "").split(",").map(s => s.trim()).filter(Boolean);
        const imgs = arr.length ? arr : [ (btn.closest(".room")?.querySelector("img")?.src || "") ];
        openRoomGallery(imgs);
      });
    });

    // touch + pointer navigation for room gallery
    if (roomGalleryImage) {
      let touchStartX = null;
      roomGalleryImage.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].clientX;
      }, { passive: true });

      roomGalleryImage.addEventListener("touchend", (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const delta = touchEndX - (touchStartX || 0);
        if (Math.abs(delta) > 40) {
          if (delta < 0) galleryIndex = (galleryIndex + 1) % Math.max(1, galleryImages.length);
          else galleryIndex = (galleryIndex - 1 + galleryImages.length) % Math.max(1, galleryImages.length);
          updateGalleryImage();
        }
        touchStartX = null;
      }, { passive: true });

      // pointer fallback
      let isDown = false; let startX = 0;
      roomGalleryImage.addEventListener("pointerdown", e => { isDown = true; startX = e.clientX; });
      window.addEventListener("pointerup", e => {
        if (!isDown) return;
        isDown = false;
        const delta = e.clientX - startX;
        if (Math.abs(delta) > 40) {
          if (delta < 0) galleryIndex = (galleryIndex + 1) % Math.max(1, galleryImages.length);
          else galleryIndex = (galleryIndex - 1 + galleryImages.length) % Math.max(1, galleryImages.length);
          updateGalleryImage();
        }
      });

      // keyboard left/right when modal open
      window.addEventListener("keydown", e => {
        if (roomGalleryModal && roomGalleryModal.style.display === "flex") {
          if (e.key === "ArrowLeft") {
            galleryIndex = (galleryIndex - 1 + galleryImages.length) % Math.max(1, galleryImages.length);
            updateGalleryImage();
          } else if (e.key === "ArrowRight") {
            galleryIndex = (galleryIndex + 1) % Math.max(1, galleryImages.length);
            updateGalleryImage();
          } else if (e.key === "Escape") {
            closeRoomGallery();
          }
        }
      });
    }

    /* ---------------- ROOM BOOKING (price only, send WhatsApp) ---------------- */
    const bookBtns = $$(".book-btn");
    const bookingModalEl = $("#bookingModal");
    const bookingRoomNameEl = $("#bookingRoomName");
    const bookingTotalEl = $("#bookingTotal");
    const bookingForm = $("#bookingForm");
    const durationSelect = $("#duration");
    const closeBooking = $(".close-booking") || (bookingModalEl ? bookingModalEl.querySelector(".close-booking") : null);

    let selectedRoom = "";
    let selectedPrice = 0;

    bookBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        selectedRoom = btn.dataset.room || (btn.closest(".room")?.querySelector("h3")?.textContent) || "Room";
        selectedPrice = Number(btn.dataset.price) || Number(btn.closest(".room")?.dataset?.price) || 0;
        if (bookingRoomNameEl) bookingRoomNameEl.textContent = selectedRoom;
        if (bookingTotalEl) bookingTotalEl.textContent = formatN(selectedPrice);
        if (durationSelect) durationSelect.value = "1";
        if (bookingModalEl) bookingModalEl.style.display = "flex"; lockScroll();

        if (bookingModalEl) bookingModalEl.dataset.price = String(selectedPrice || 0);
      });
    });

    if (closeBooking) closeBooking.addEventListener("click", () => { if (bookingModalEl) bookingModalEl.style.display = "none";
unlockScroll();
 });

    if (durationSelect) {
      durationSelect.addEventListener("change", () => {
        const basePrice = Number(bookingModalEl?.dataset?.price || selectedPrice || 0);
        const val = Number(durationSelect.value || 1);
        let total = basePrice;
        if (val >= 24) total = basePrice;
        else total = Math.round(basePrice * (val / 24));
        if (bookingTotalEl) bookingTotalEl.textContent = formatN(total);
      });
    }

    if (bookingForm) {
      bookingForm.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const guestName = $("#guestName")?.value || "";
        const guestPhone = $("#guestPhone")?.value || "";
        const guestEmail = $("#guestEmail")?.value || "";
        const dur = durationSelect?.value || "1";
        const totalPriceText = bookingTotalEl?.textContent || formatN(selectedPrice);

        const durationLabel = (Number(dur) >= 24) ? "Full Day" : `${dur} Hour(s)`;
        let message = `🏨 *Room Booking Request*\n\n`;
        message += `👤 Name: ${guestName}\n`;
        message += `📞 Phone: ${guestPhone}\n`;
        if (guestEmail) message += `📧 Email: ${guestEmail}\n`;
        message += `🏷 Room: ${selectedRoom}\n`;
        message += `⏱ Duration: ${durationLabel}\n`;
        message += `💰 Total: ₦${totalPriceText}\n\n`;
        message += `Please confirm availability.`;

        const businessPhone = "2347057229893";
        const url = `https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");

        if (bookingModalEl) bookingModalEl.style.display = "none";
        if (bookingForm) bookingForm.reset();
      });
    }

    /* ---------------- Menu pagination & Rooms pagination (if present) ---------------- */
    // Rooms pagination (if .rooms-grid present)
    (function initRoomsPagination() {
      const roomsPerPage = 4;
      const roomsGrid = document.querySelector(".rooms-grid");
      if (!roomsGrid) return;
      const rooms = Array.from(roomsGrid.querySelectorAll(".room"));
      const paginationContainer = document.getElementById("rooms-pagination");
      if (!paginationContainer) return;
      const totalPages = Math.max(1, Math.ceil(rooms.length / roomsPerPage));
      let currentPage = 1;

      function showPage(page) {
        currentPage = Math.max(1, Math.min(page, totalPages));
        const start = (currentPage - 1) * roomsPerPage;
        const end = start + roomsPerPage;
        rooms.forEach((room, index) => {
          room.style.display = index >= start && index < end ? "block" : "none";
        });
        const circles = paginationContainer.querySelectorAll(".circle");
        circles.forEach((circle, i) => circle.classList.toggle("active", i === currentPage - 1));
      }

      paginationContainer.innerHTML = "";
      for (let i = 1; i <= totalPages; i++) {
        const circle = document.createElement("span");
        circle.classList.add("circle");
        if (i === 1) circle.classList.add("active");
        circle.addEventListener("click", () => showPage(i));
        paginationContainer.appendChild(circle);
      }
      showPage(1);
    })();

    // Menu categories pagination
    (function initMenuPagination() {
      const categories = Array.from(document.querySelectorAll("#menu .category-header"));
      const paginationContainer = document.getElementById("menu-pagination");
      if (!paginationContainer || categories.length === 0) return;

      const categoriesPerPage = 6;
      const totalPages = Math.max(1, Math.ceil(categories.length / categoriesPerPage));
      let currentPage = 1;
      paginationContainer.innerHTML = "";

      const prevBtn = document.createElement("button");
      prevBtn.textContent = "← Prev";
      prevBtn.classList.add("page-btn");

      const circlesWrapper = document.createElement("div");
      circlesWrapper.classList.add("circles-wrapper");

      const nextBtn = document.createElement("button");
      nextBtn.textContent = "Next →";
      nextBtn.classList.add("page-btn");

      paginationContainer.appendChild(prevBtn);
      paginationContainer.appendChild(circlesWrapper);
      paginationContainer.appendChild(nextBtn);

      function showPage(page) {
        currentPage = Math.max(1, Math.min(page, totalPages));
        const start = (currentPage - 1) * categoriesPerPage;
        const end = start + categoriesPerPage;

        const menuSection = document.querySelector("#menu");
        if (menuSection) {
          menuSection.style.transition = "opacity 0.4s ease";
          menuSection.style.opacity = "0";
        }

        setTimeout(() => {
          categories.forEach((cat, index) => {
            const visible = index >= start && index < end;
            cat.style.display = visible ? "block" : "none";

            const items = cat.nextElementSibling;
            if (items && items.classList.contains("category-items")) {
              items.style.display = "none";
            }
            const arrow = cat.querySelector(".arrow");
            if (arrow) arrow.textContent = "▶";
          });

          circlesWrapper.querySelectorAll(".circle").forEach((circle, i) => {
            circle.classList.toggle("active", i === currentPage - 1);
          });

          if (menuSection) menuSection.style.opacity = "1";
        }, 200);
      }

      for (let i = 1; i <= totalPages; i++) {
        const dot = document.createElement("span");
        dot.classList.add("circle");
        if (i === 1) dot.classList.add("active");
        dot.addEventListener("click", () => showPage(i));
        circlesWrapper.appendChild(dot);
      }

      prevBtn.addEventListener("click", () => showPage(currentPage - 1));
      nextBtn.addEventListener("click", () => showPage(currentPage + 1));

      showPage(1);
    })();

    /* ---------------- Read More toggle ---------------- */
    const readMoreBtn = document.getElementById("readMoreBtn");
    const moreContent = document.getElementById("moreContent");
    if (readMoreBtn && moreContent) {
      readMoreBtn.addEventListener("click", () => {
        moreContent.classList.toggle("show");
        readMoreBtn.textContent = moreContent.classList.contains("show") ? "Read Less" : "Read More";
      });
    }

    // Final initial update
    updateCart();
  }); // DOMContentLoaded end

  /* ---------- helper to send to WhatsApp (opens external WA) ---------- */
  function sendToWhatsApp(orderText) {
    const phoneNumber = "2349162809649"; // default business number (replace as needed)
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(orderText)}`;
    window.open(url, "_blank");
  }

})();


const toggleBtn = document.getElementById("toggleGameBtn");
const panel = document.getElementById("memoryGamePanel");
const gameGrid = document.getElementById("gameGrid");
const scoreBoard = document.getElementById("scoreBoard");
const highScoreBoard = document.getElementById("highScoreBoard");
const winMessage = document.getElementById("winMessage");
const confettiContainer = document.getElementById("confetti");

let score = 0, flipped = [], lockBoard = false, matchedPairs = 0;
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
updateHighScore();

const images = [
  "room.jpg", "jack.jpg", "view.jpg", "shirah.jpg",
  "spw.jpg", "lord.jpg", "", "",
  "", ""
];

// Toggle panel
toggleBtn.addEventListener("click", () => {
  const isOpen = panel.classList.toggle("open");
  toggleBtn.textContent = isOpen ? "❌ Close Game" : "🎮 Open Game";
  if (isOpen) setupGame();
  else hideWinMessage();
});

function setupGame() {
  gameGrid.innerHTML = "";
  confettiContainer.innerHTML = "";
  winMessage.style.display = "none";
  score = 0; matchedPairs = 0; flipped = [];
  updateScore();

  const cards = [...images, ...images].sort(() => Math.random() - 0.5);
  cards.forEach(img => {
    const card = document.createElement("div");
    card.className = "memory-card";
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-front"></div>
        <div class="card-back" style="background-image: url('${img}')"></div>
      </div>`;
    gameGrid.appendChild(card);
  });

  addCardListeners();
}

function addCardListeners() {
  document.querySelectorAll(".memory-card").forEach(card => {
    card.addEventListener("click", () => {
      if (lockBoard || card.classList.contains("flipped")) return;

      card.classList.add("flipped");
      flipped.push(card);

      if (flipped.length === 2) checkMatch();
    });
  });
}

function checkMatch() {
  const [first, second] = flipped;
  const img1 = first.querySelector(".card-back").style.backgroundImage;
  const img2 = second.querySelector(".card-back").style.backgroundImage;

  if (img1 === img2) {
    score++;
    matchedPairs++;
    updateScore();
    flipped = [];

    if (score > highScore) {
      highScore = score;
      localStorage.setItem("highScore", highScore);
      updateHighScore();
    }

    if (matchedPairs === images.length) showWinMessage();
  } else {
    lockBoard = true;
    setTimeout(() => {
      first.classList.remove("flipped");
      second.classList.remove("flipped");
      flipped = [];
      lockBoard = false;
      resetGame(); // restart if wrong
    }, 800);
  }
}

function resetGame() { setupGame(); }
function updateScore() { scoreBoard.textContent = `Score: ${score}`; }
function updateHighScore() { highScoreBoard.textContent = `High Score: ${highScore}`; }

function showWinMessage() {
  winMessage.style.display = "block";
  launchConfetti();
}
function hideWinMessage() {
  winMessage.style.display = "none";
  confettiContainer.innerHTML = "";
}

// Confetti launcher with themed colors
function launchConfetti() {
  const colors = ["#ff007f", "#ff4d4d", "#ff9900", "#ffcc00", "#ff66b2"];
  for (let i = 0; i < 80; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.setProperty("--confetti-color", colors[Math.floor(Math.random() * colors.length)]);
    confetti.style.left = Math.random() * 100 + "%";
    confetti.style.animationDuration = (2 + Math.random() * 2) + "s";
    confetti.style.width = confetti.style.height = (5 + Math.random() * 8) + "px";
    confettiContainer.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3000);
  }
}

// MENY SCROLL
gsap.registerPlugin(ScrollTrigger);

const menuSection = document.querySelector("#menu");
const menuVideo = document.getElementById("menuVideo");

function safePlay(video) {
  if (!video || !video.paused) return;
  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => {
      if (err.name !== "AbortError") {
        console.error(err);
      }
    });
  }
}

function safePause(video) {
  if (!video || video.paused) return;
  video.pause();
}

if (menuSection && menuVideo) {

  ScrollTrigger.create({
    trigger: menuSection,
    start: "top 90%",
    end: "bottom top",

    onEnter: () => {
      safePlay(menuVideo);

      gsap.to(menuVideo, {
        opacity: 0.7,
        scale: 1,
        filter: "blur(0px)",
        duration: 1.8,
        ease: "power2.out"
      });

      gsap.to(menuSection, {
        backgroundColor: "rgba(0,0,0,0.15)",
        duration: 1.5
      });
    },

    onLeave: () => {
      safePause(menuVideo);

      gsap.to(menuVideo, {
        opacity: 0,
        filter: "blur(10px)",
        duration: 1.2
      });

      gsap.to(menuSection, {
        backgroundColor: "#000",
        duration: 1.5
      });
    },

    onEnterBack: () => {
      safePlay(menuVideo);

      gsap.to(menuVideo, {
        opacity: 0.7,
        filter: "blur(0px)",
        duration: 1
      });

      gsap.to(menuSection, {
        backgroundColor: "rgba(0,0,0,0.15)",
        duration: 1.2
      });
    },

    onLeaveBack: () => {
      safePause(menuVideo);

      gsap.to(menuVideo, {
        opacity: 0,
        filter: "blur(10px)",
        duration: 1
      });

      gsap.to(menuSection, {
        backgroundColor: "#000",
        duration: 1.2
      });
    }
  });

  // Parallax scroll
  gsap.to(menuVideo, {
    yPercent: 20,
    ease: "none",
    scrollTrigger: {
      trigger: menuSection,
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  // Mobile fallback
  if (window.innerWidth < 768) {
    safePause(menuVideo);
    menuVideo.style.opacity = "0.3";
    menuVideo.style.filter = "blur(4px)";
  }
}



gsap.registerPlugin(ScrollTrigger);

const atmCard = document.querySelector("#atmCard");

if (atmCard) {
  // Give the container some 3D perspective
  gsap.set(atmCard, { perspective: 1200 });

  // Entry animation: 3D spin + slide in + pop-up
  gsap.fromTo(
    ".atm-card-inner",
    {
      rotateY: -720,
      rotateX: 120,
      rotateZ: 30,
      x: 300,
      y: 100,
      opacity: 0,
      scale: 0.6,
    },
    {
      rotateY: 0,
      rotateX: 0,
      rotateZ: 0,
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 2.2,
      ease: "power4.out",
      scrollTrigger: {
        trigger: "#menu",
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
    }
  );

  // Optional continuous floating + spinning effect
  gsap.to(".atm-card-inner", {
    rotateY: 360,
    rotateX: 10,
    duration: 6,
    ease: "none",
    repeat: -1,
    scrollTrigger: {
      trigger: atmCard,
      start: "top 80%",
      toggleActions: "play pause resume reset",
    },
  });
}


 let lastScrollY = window.scrollY;
  const navbar = document.querySelector(".navbar");

  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY && currentScrollY > 80) {
      // scrolling down
      navbar.classList.add("hide");
    } else {
      // scrolling up
      navbar.classList.remove("hide");
    }

    lastScrollY = currentScrollY;
  });