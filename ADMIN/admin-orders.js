

/* ==========================================
   R-EX ADMIN ORDERS
========================================== */

function initAdminOrders() {
  const page = document.getElementById("adminPage");
  if (!page) return;

  const refreshButton =
    document.getElementById("adminOrdersRefreshBtn");

  const totalCount =
    document.getElementById("adminOrdersTotalCount");

  const pendingCount =
    document.getElementById("adminOrdersPendingCount");

  const paidCount =
    document.getElementById("adminOrdersPaidCount");

  const cancelledCount =
    document.getElementById("adminOrdersCancelledCount");

  const searchInput =
    document.getElementById("adminOrdersSearchInput");

  const paymentFilter =
    document.getElementById("adminOrdersPaymentFilter");

  const shippingFilter =
    document.getElementById("adminOrdersShippingFilter");

  const loadingState =
    document.getElementById("adminOrdersLoading");

  const errorState =
    document.getElementById("adminOrdersError");

  const errorMessage =
    document.getElementById("adminOrdersErrorMessage");

  const retryButton =
    document.getElementById("adminOrdersRetryBtn");

  const emptyState =
    document.getElementById("adminOrdersEmpty");

  const ordersList =
    document.getElementById("adminOrdersList");

  const dashboardOrdersCount =
    document.getElementById("adminOrdersCount");

  const dashboardRevenue =
    document.getElementById("adminRevenue");

  const requiredElements = [
    refreshButton,
    totalCount,
    pendingCount,
    paidCount,
    cancelledCount,
    searchInput,
    paymentFilter,
    shippingFilter,
    loadingState,
    errorState,
    errorMessage,
    retryButton,
    emptyState,
    ordersList,
    dashboardOrdersCount,
    dashboardRevenue
  ];

  if (requiredElements.some(element => !element)) {
    console.error("[R-EX] Admin Orders HTML is incomplete.");
    return;
  }

  if (
    typeof rexSupabase === "undefined" ||
    !rexSupabase?.from ||
    !rexSupabase?.rpc
  ) {
    console.error("[R-EX] Supabase is unavailable for Admin Orders.");
    showError("The order service is currently unavailable.");
    return;
  }

  let orders = [];
  let filteredOrders = [];
  let loadedOnce = false;


  /* ==========================================
     HELPERS
  ========================================== */

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function normalizeStatus(value) {
    return normalize(value)
      .replace(/[^a-z0-9_-]/g, "");
  }

  function formatPrice(value) {
    return `AED ${Number(value || 0).toFixed(0)}`;
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("en-AE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function getOrderItems(order) {
    return Array.isArray(order.order_items)
      ? order.order_items
      : [];
  }

  function formatAddress(address) {
    if (!address) return [];

    let parsedAddress = address;

    if (typeof address === "string") {
      try {
        parsedAddress = JSON.parse(address);
      } catch (error) {
        return [address];
      }
    }

    if (!parsedAddress || typeof parsedAddress !== "object") {
      return [];
    }

    return [
      parsedAddress.address,
      parsedAddress.apartment,
      parsedAddress.city,
      parsedAddress.emirate,
      parsedAddress.country,
      parsedAddress.postalCode
    ]
      .map(value => String(value || "").trim())
      .filter(Boolean);
  }


  /* ==========================================
     PAGE STATES
  ========================================== */

  function hideStates() {
    loadingState.hidden = true;
    errorState.hidden = true;
    emptyState.hidden = true;
    ordersList.hidden = true;
  }

  function showLoading() {
    hideStates();
    loadingState.hidden = false;
  }

  function showError(message) {
    hideStates();
    errorMessage.textContent =
      message || "Could not load orders.";
    errorState.hidden = false;
  }

  function showEmpty() {
    hideStates();
    emptyState.hidden = false;
  }

  function showList() {
    hideStates();
    ordersList.hidden = false;
  }


  /* ==========================================
     COUNTERS
  ========================================== */

  function renderCounters() {
    const pendingOrders = orders.filter(
      order =>
        normalizeStatus(order.payment_status) === "pending"
    );

    const paidOrders = orders.filter(
      order =>
        normalizeStatus(order.payment_status) === "paid"
    );

    const cancelledOrders = orders.filter(order => {
      const paymentStatus =
        normalizeStatus(order.payment_status);

      const shippingStatus =
        normalizeStatus(order.shipping_status);

      return [
        "expired",
        "cancelled",
        "failed",
        "refunded"
      ].includes(paymentStatus) ||
      shippingStatus === "cancelled";
    });

    const paidRevenue = paidOrders.reduce(
      (total, order) =>
        total + Number(order.total_amount || 0),
      0
    );

    totalCount.textContent = String(orders.length);
    pendingCount.textContent = String(pendingOrders.length);
    paidCount.textContent = String(paidOrders.length);
    cancelledCount.textContent = String(cancelledOrders.length);

    dashboardOrdersCount.textContent =
      String(orders.length);

    dashboardRevenue.textContent =
      formatPrice(paidRevenue);
  }


  /* ==========================================
     FILTERS
  ========================================== */

  function applyFilters() {
    const query = normalize(searchInput.value);
    const selectedPayment =
      normalizeStatus(paymentFilter.value);

    const selectedShipping =
      normalizeStatus(shippingFilter.value);

    filteredOrders = orders.filter(function (order) {
      const paymentStatus =
        normalizeStatus(order.payment_status);

      const shippingStatus =
        normalizeStatus(order.shipping_status);

      const haystack = normalize([
        order.order_number,
        order.customer_name,
        order.customer_email,
        order.customer_phone,
        order.id
      ].join(" "));

      const matchesSearch =
        !query || haystack.includes(query);

      const matchesPayment =
        selectedPayment === "all" ||
        paymentStatus === selectedPayment;

      const matchesShipping =
        selectedShipping === "all" ||
        shippingStatus === selectedShipping;

      return (
        matchesSearch &&
        matchesPayment &&
        matchesShipping
      );
    });

    renderOrders();
  }


  /* ==========================================
     ORDER CARD
  ========================================== */

  function createOrderCard(order) {
    const card = document.createElement("article");
    card.className = "admin-order-card";

    const paymentStatus =
      normalizeStatus(order.payment_status);

    const shippingStatus =
      normalizeStatus(order.shipping_status);

    const orderItems = getOrderItems(order);
    const addressLines =
      formatAddress(order.shipping_address);

    const itemsHtml = orderItems.length
      ? orderItems.map(function (item) {
          const quantity =
            Math.max(1, Number(item.quantity || 1));

          const itemTotal =
            Number(item.price || 0) * quantity;

          return `
            <div class="admin-order-item">
              <div>
                <strong>
                  ${escapeHtml(
                    item.product_name ||
                    item.sku ||
                    "R-EX Product"
                  )}
                </strong>

                <small>
                  SIZE: ${escapeHtml(item.size || "—")}
                  · QTY: ${quantity}
                  · SKU: ${escapeHtml(item.sku || "—")}
                </small>
              </div>

              <strong class="admin-order-item-price">
                ${formatPrice(itemTotal)}
              </strong>
            </div>
          `;
        }).join("")
      : `<p>No order items were found.</p>`;

    const addressHtml = addressLines.length
      ? addressLines
          .map(line => `<p>${escapeHtml(line)}</p>`)
          .join("")
      : `<p>Shipping address unavailable.</p>`;

    card.innerHTML = `
      <div class="admin-order-card-header">

        <div class="admin-order-field">
          <span>ORDER</span>
          <strong class="admin-order-number">
            ${escapeHtml(order.order_number || order.id)}
          </strong>
        </div>

        <div class="admin-order-field admin-order-customer">
          <span>CUSTOMER</span>
          <strong>
            ${escapeHtml(order.customer_name || "Guest")}
          </strong>
          <small>
            ${escapeHtml(order.customer_email || "—")}
            <br>
            ${escapeHtml(order.customer_phone || "—")}
          </small>
        </div>

        <div class="admin-order-field">
          <span>TOTAL</span>
          <strong>
            ${formatPrice(order.total_amount)}
          </strong>
        </div>

        <div class="admin-order-field">
          <span>PAYMENT</span>
          <strong class="admin-order-status ${paymentStatus}">
            ${escapeHtml(paymentStatus)}
          </strong>
        </div>

        <button
          type="button"
          class="admin-order-open-btn">
          OPEN
        </button>

      </div>

      <div class="admin-order-details">

        <div class="admin-order-details-grid">

          <section class="admin-order-panel">
            <h3>ORDER ITEMS</h3>

            <div class="admin-order-items">
              ${itemsHtml}
            </div>
          </section>

          <section class="admin-order-panel">
            <h3>CUSTOMER & SHIPPING</h3>

            <div class="admin-order-info-list">
              <p>
                <strong>Name:</strong>
                ${escapeHtml(order.customer_name || "—")}
              </p>

              <p>
                <strong>Email:</strong>
                ${escapeHtml(order.customer_email || "—")}
              </p>

              <p>
                <strong>Phone:</strong>
                ${escapeHtml(order.customer_phone || "—")}
              </p>

              <p>
                <strong>Created:</strong>
                ${escapeHtml(formatDate(order.created_at))}
              </p>

              <p>
                <strong>Delivery:</strong>
                ${escapeHtml(order.delivery_method || "Standard")}
              </p>


              <p class="admin-order-shipping-price">
                <strong>Shipping:</strong>

                <span class="rex-shipping-old-price">
                  ${formatPrice(
                    order.shipping_original ?? 20
                  )}
                </span>

                <span class="rex-shipping-free-price">
                  FREE
                </span>
              </p>

              <p>
                <strong>Shipping discount:</strong>
                -${formatPrice(
                  order.shipping_discount ?? 20
                )}
              </p>

              <p>
                <strong>Charged shipping:</strong>
                ${formatPrice(
                  order.shipping_amount ?? 0
                )}
              </p>

              ${addressHtml}

              ${
                order.notes
                  ? `
                    <p>
                      <strong>Notes:</strong>
                      ${escapeHtml(order.notes)}
                    </p>
                  `
                  : ""
              }

              ${
                order.expires_at &&
                paymentStatus === "pending"
                  ? `
                    <p class="admin-order-expiry">
                      Reservation expires:
                      ${escapeHtml(
                        formatDate(order.expires_at)
                      )}
                    </p>
                  `
                  : ""
              }
            </div>

            <div class="admin-order-controls">

              <label class="admin-order-control">
                <span>PAYMENT STATUS</span>

                <select class="admin-order-payment-select">
                  ${[
                    "pending",
                    "paid",
                    "failed",
                    "expired",
                    "refunded"
                  ].map(status => `
                    <option
                      value="${status}"
                      ${
                        status === paymentStatus
                          ? "selected"
                          : ""
                      }>
                      ${status.toUpperCase()}
                    </option>
                  `).join("")}
                </select>
              </label>

              <label class="admin-order-control">
                <span>SHIPPING STATUS</span>

                <select class="admin-order-shipping-select">
                  ${[
                    "pending",
                    "processing",
                    "packed",
                    "shipped",
                    "delivered",
                    "cancelled"
                  ].map(status => `
                    <option
                      value="${status}"
                      ${
                        status === shippingStatus
                          ? "selected"
                          : ""
                      }>
                      ${status.toUpperCase()}
                    </option>
                  `).join("")}
                </select>
              </label>

              <button
                type="button"
                class="admin-primary-btn admin-order-save-btn">
                SAVE ORDER STATUS
              </button>

              <p class="admin-order-action-message"></p>

            </div>
          </section>

        </div>
      </div>
    `;

    const openButton =
      card.querySelector(".admin-order-open-btn");

    const details =
      card.querySelector(".admin-order-details");

    const paymentSelect =
      card.querySelector(".admin-order-payment-select");

    const shippingSelect =
      card.querySelector(".admin-order-shipping-select");

    const saveButton =
      card.querySelector(".admin-order-save-btn");

    const actionMessage =
      card.querySelector(".admin-order-action-message");

    openButton.addEventListener("click", function () {
      const active =
        details.classList.toggle("active");

      openButton.classList.toggle(
        "active",
        active
      );

      openButton.textContent =
        active ? "CLOSE" : "OPEN";
    });

    saveButton.addEventListener(
      "click",
      async function () {
        const nextPaymentStatus =
          normalizeStatus(paymentSelect.value);

        const nextShippingStatus =
          normalizeStatus(shippingSelect.value);

        saveButton.disabled = true;
        saveButton.textContent = "SAVING...";

        actionMessage.textContent =
          "Updating order...";

        actionMessage.className =
          "admin-order-action-message";

        try {
          const {
            data,
            error
          } = await rexSupabase.rpc(
            "admin_update_order_status",
            {
              p_order_id: order.id,
              p_payment_status:
                nextPaymentStatus,
              p_shipping_status:
                nextShippingStatus
            }
          );

          if (error) {
            throw error;
          }

          actionMessage.textContent =
            "Order updated successfully.";

          actionMessage.classList.add(
            "success"
          );

          window.dispatchEvent(
            new CustomEvent(
              "rex:admin-orders-refresh"
            )
          );

          console.info(
            "[R-EX] Order status updated:",
            data
          );
        } catch (error) {
          console.error(
            "[R-EX] Could not update order:",
            error
          );

          actionMessage.textContent =
            error?.message ||
            "Could not update the order.";

          actionMessage.classList.add(
            "error"
          );
        } finally {
          saveButton.disabled = false;
          saveButton.textContent =
            "SAVE ORDER STATUS";
        }
      }
    );

    return card;
  }


  /* ==========================================
     RENDER
  ========================================== */

  function renderOrders() {
    ordersList.innerHTML = "";

    if (!filteredOrders.length) {
      showEmpty();
      return;
    }

    filteredOrders.forEach(function (order) {
      ordersList.appendChild(
        createOrderCard(order)
      );
    });

    showList();
  }


  /* ==========================================
     LOAD ORDERS
  ========================================== */

  async function loadOrders() {
    showLoading();

    try {
      const {
        data,
        error
      } = await rexSupabase
        .from("orders")
        .select(`
          id,
          order_number,
          user_id,
          total_amount,
          shipping_original,
          shipping_discount,
          shipping_amount,
          currency,
          payment_status,
          shipping_status,
          customer_email,
          customer_name,
          customer_phone,
          shipping_address,
          delivery_method,
          notes,
          expires_at,
          created_at,

          order_items (
            id,
            product_id,
            variant_id,
            sku,
            product_name,
            size,
            quantity,
            price
          )
        `)
        .order("created_at", {
          ascending: false
        });

      if (error) {
        throw error;
      }

      orders =
        Array.isArray(data)
          ? data
          : [];

      loadedOnce = true;

      renderCounters();
      applyFilters();
    } catch (error) {
      console.error(
        "[R-EX] Could not load admin orders:",
        error
      );

      showError(
        error?.message ||
        "Could not load orders."
      );
    }
  }


  /* ==========================================
     EVENTS
  ========================================== */

  refreshButton.addEventListener(
    "click",
    loadOrders
  );

  retryButton.addEventListener(
    "click",
    loadOrders
  );

  searchInput.addEventListener(
    "input",
    applyFilters
  );

  paymentFilter.addEventListener(
    "change",
    applyFilters
  );

  shippingFilter.addEventListener(
    "change",
    applyFilters
  );

  window.addEventListener(
    "rex:admin-ready",
    loadOrders,
    {
      once: true
    }
  );

  window.addEventListener(
    "rex:admin-orders-refresh",
    loadOrders
  );

  window.addEventListener(
    "rex:admin-view-changed",
    function (event) {
      if (
        event.detail?.view === "orders" &&
        !loadedOnce
      ) {
        loadOrders();
      }
    }
  );
}


