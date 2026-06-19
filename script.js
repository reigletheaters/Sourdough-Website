/* =========================================================
   Mariah's Sourdough Co. — cart + checkout logic
   Cart state persists in localStorage so it survives page
   navigation and browser refreshes.
   ========================================================= */

const PRICE_PER_LOAF = 14;
const CART_KEY = 'mariahs_cart_v1';

// Product catalog
const PRODUCTS = {
  classic: {
    id: 'classic',
    name: 'Classic Sourdough',
    price: PRICE_PER_LOAF,
    img: 'classic.jpg'
  },
  olive: {
    id: 'olive',
    name: 'Olive & Rosemary Sourdough',
    price: PRICE_PER_LOAF,
    img: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=600&q=80'
  },
  chocolate: {
    id: 'chocolate',
    name: 'Chocolate Chip Sourdough',
    price: PRICE_PER_LOAF,
    img: 'chocolate.jpg'
  },
  cinnamon: {
    id: 'cinnamon',
    name: 'Cinnamon Raisin Sourdough',
    price: PRICE_PER_LOAF,
    img: 'cinnamon.webp'
  }
};

// ---------- Cart persistence ----------
// Try localStorage first; if unavailable (e.g. private mode or
// file:// with restrictions) fall back to an in-memory object.
const _memoryCart = {};
let _useMemory = false;

function loadCart() {
  if (_useMemory) return { ..._memoryCart };
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    _useMemory = true;
    return { ..._memoryCart };
  }
}

function saveCart(cart) {
  if (_useMemory) {
    Object.keys(_memoryCart).forEach(k => delete _memoryCart[k]);
    Object.assign(_memoryCart, cart);
    return;
  }
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {
    _useMemory = true;
    Object.assign(_memoryCart, cart);
  }
}

function getCart() {
  return loadCart();
}

function totalLoaves(cart) {
  cart = cart || getCart();
  return Object.values(cart).reduce((s, q) => s + q, 0);
}

/**
 * Discount logic:
 *   2 or 3 loaves => 10% off
 *   4+ loaves    => 20% off
 */
function discountRate(count) {
  if (count >= 4) return 0.20;
  if (count >= 2) return 0.10;
  return 0;
}

function cartTotals(cart) {
  cart = cart || getCart();
  let subtotal = 0;
  Object.keys(cart).forEach(id => {
    const p = PRODUCTS[id];
    if (!p) return;
    subtotal += p.price * cart[id];
  });
  const count = totalLoaves(cart);
  const rate = discountRate(count);
  const discount = subtotal * rate;
  const total = subtotal - discount;
  return { count, subtotal, rate, discount, total };
}

// ---------- Cart mutations ----------
function addToCart(productId) {
  if (!PRODUCTS[productId]) return;
  const cart = getCart();
  cart[productId] = (cart[productId] || 0) + 1;
  saveCart(cart);
  updateCartBadge();
  showToast(`${PRODUCTS[productId].name} added to cart`);
}

function removeFromCart(productId) {
  const cart = getCart();
  delete cart[productId];
  saveCart(cart);
  renderCart();
  updateCartBadge();
}

function setQty(productId, qty) {
  const cart = getCart();
  if (qty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = qty;
  }
  saveCart(cart);
  renderCart();
  updateCartBadge();
}

function clearCart() {
  saveCart({});
  updateCartBadge();
}

function updateCartBadge() {
  const count = totalLoaves();
  document.querySelectorAll('[data-cart-count]').forEach(el => {
    el.textContent = count > 0 ? ` (${count})` : '';
  });
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ---------- "Add to cart" button wiring ----------
function wireAddButtons() {
  document.querySelectorAll('.add-btn[data-product]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.product;
      addToCart(id);
      const original = btn.textContent;
      btn.textContent = 'Added!';
      btn.classList.add('added');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('added');
      }, 1100);
    });
  });
}

// ---------- Cart page rendering ----------
function renderCart() {
  const container = document.getElementById('cart-container');
  if (!container) return;

  const cart = getCart();
  const ids = Object.keys(cart);
  if (ids.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <h2>Your cart is empty</h2>
        <p>Pick up a loaf (or four — that's 20% off!) from our shop.</p>
        <a class="btn" href="shop.html">Browse loaves</a>
      </div>`;
    return;
  }

  let rowsHtml = '';
  ids.forEach(id => {
    const p = PRODUCTS[id];
    if (!p) return;
    const qty = cart[id];
    const lineTotal = p.price * qty;
    rowsHtml += `
      <tr>
        <td><img class="cart-thumb" src="${p.img}" alt="${p.name}"></td>
        <td><strong>${p.name}</strong></td>
        <td>$${p.price.toFixed(2)}</td>
        <td>
          <div class="qty-ctrl">
            <button onclick="setQty('${id}', ${qty - 1})" aria-label="Decrease">−</button>
            <span>${qty}</span>
            <button onclick="setQty('${id}', ${qty + 1})" aria-label="Increase">+</button>
          </div>
        </td>
        <td>$${lineTotal.toFixed(2)}</td>
        <td><button class="remove-btn" onclick="removeFromCart('${id}')">Remove</button></td>
      </tr>`;
  });

  const { count, subtotal, rate, discount, total } = cartTotals(cart);

  let dealMsg = '';
  if (count === 1) {
    dealMsg = `<p class="discount">Add 1 more loaf to unlock 10% off!</p>`;
  } else if (count === 2 || count === 3) {
    dealMsg = `<p class="discount">You're saving 10%! Add ${4 - count} more for 20% off.</p>`;
  } else if (count >= 4) {
    dealMsg = `<p class="discount">You're saving 20% — nice haul!</p>`;
  }

  container.innerHTML = `
    <table class="cart-table">
      <thead>
        <tr><th></th><th>Loaf</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="cart-summary">
      <div class="row"><span>Loaves</span><span>${count}</span></div>
      <div class="row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
      ${rate > 0
        ? `<div class="row discount"><span>Discount (${(rate * 100).toFixed(0)}% off)</span><span>−$${discount.toFixed(2)}</span></div>`
        : ''}
      <div class="row total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
      ${dealMsg}
      <a class="btn" style="display:block; text-align:center; margin-top:14px;" href="checkout.html">Checkout</a>
    </div>`;
}

// ---------- Checkout page rendering ----------
function renderCheckout() {
  const summaryEl = document.getElementById('checkout-summary');
  if (!summaryEl) return;

  const cart = getCart();
  const ids = Object.keys(cart);
  if (ids.length === 0) {
    summaryEl.innerHTML = `
      <div class="empty-cart">
        <h2>Your cart is empty</h2>
        <p>Nothing to check out yet!</p>
        <a class="btn" href="shop.html">Browse loaves</a>
      </div>`;
    const formEl = document.getElementById('checkout-form');
    if (formEl) formEl.style.display = 'none';
    return;
  }

  let itemsHtml = '';
  ids.forEach(id => {
    const p = PRODUCTS[id];
    if (!p) return;
    const qty = cart[id];
    itemsHtml += `
      <div class="co-line">
        <img src="${p.img}" alt="${p.name}">
        <div class="co-line-body">
          <div class="co-line-name">${p.name}</div>
          <div class="co-line-qty">Qty ${qty} × $${p.price.toFixed(2)}</div>
        </div>
        <div class="co-line-total">$${(p.price * qty).toFixed(2)}</div>
      </div>`;
  });

  const { count, subtotal, rate, discount, total } = cartTotals(cart);

  summaryEl.innerHTML = `
    <h2>Order Summary</h2>
    <div class="co-lines">${itemsHtml}</div>
    <div class="co-totals">
      <div class="row"><span>Loaves</span><span>${count}</span></div>
      <div class="row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
      ${rate > 0
        ? `<div class="row discount"><span>Discount (${(rate * 100).toFixed(0)}% off)</span><span>−$${discount.toFixed(2)}</span></div>`
        : ''}
      <div class="row"><span>Shipping</span><span>$0.00</span></div>
      <div class="row total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
    </div>`;
}

// ---------- Checkout form handling ----------
function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + ' / ' + digits.slice(2);
}

function wireCheckoutForm() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  const cardInput = form.querySelector('[name="card"]');
  const expInput = form.querySelector('[name="expiry"]');
  const cvcInput = form.querySelector('[name="cvc"]');

  if (cardInput) {
    cardInput.addEventListener('input', (e) => {
      e.target.value = formatCardNumber(e.target.value);
    });
  }
  if (expInput) {
    expInput.addEventListener('input', (e) => {
      e.target.value = formatExpiry(e.target.value);
    });
  }
  if (cvcInput) {
    cvcInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    placeOrder(form);
  });
}

function placeOrder(form) {
  const cart = getCart();
  if (totalLoaves(cart) === 0) return;

  const btn = form.querySelector('button[type="submit"]');
  const originalBtnText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Processing…';
  }

  const data = new FormData(form);
  const orderNum = 'MSC-' + Date.now().toString().slice(-7);
  const { total, count } = cartTotals(cart);

  // UI-only simulation: on a real site this is where you'd POST
  // to your backend or redirect to Stripe Checkout.
  setTimeout(() => {
    clearCart();

    const main = document.getElementById('checkout-main');
    if (main) {
      main.innerHTML = `
        <div class="co-success">
          <div class="co-success-icon">✓</div>
          <h1>Order confirmed!</h1>
          <p class="co-success-sub">Thank you, ${escapeHtml(data.get('firstName') || 'friend')}. Your order for
            <strong>${count} loaf${count > 1 ? 'es' : ''}</strong> totaling
            <strong>$${total.toFixed(2)}</strong> has been received.</p>
          <div class="co-order-num">Order number: <strong>${orderNum}</strong></div>
          <p>We'll email a confirmation to <strong>${escapeHtml(data.get('email') || '')}</strong> shortly.
             Loaves are baked the day they ship — expect your order within 2–3 business days.</p>
          <a class="btn" href="index.html">Back to home</a>
          &nbsp;
          <a class="btn secondary" href="shop.html">Keep shopping</a>
        </div>`;
    }
    updateCartBadge();
  }, 900);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  wireAddButtons();
  updateCartBadge();
  renderCart();
  renderCheckout();
  wireCheckoutForm();
});
