/* =========================================
   R-EX HOME PAGE
========================================= */

function initHome() {
  const heroSection = document.getElementById("heroSection");
  const ascendBtn = document.getElementById("ascendBtn");
  const menSection = document.getElementById("menSection");
  const productGrid = document.getElementById("homeProductGrid");
  const pageSections = document.querySelectorAll(".page-section");

  /*
   * إذا الصفحة الحالية ليست Home، لا تشغّل الكود.
   */
  if (!heroSection) return;

  /*
   * PRODUCTS يتم تحميلها من products.js.
   */
  const productsDatabase =
    typeof PRODUCTS !== "undefined"
      ? PRODUCTS
      : window.PRODUCTS;

  const WISHLIST_KEY = "rexWishlist";
  const HOME_PRODUCTS_LIMIT = 3;


  /* =========================================
     STORAGE HELPERS
  ========================================= */

  function readStorage(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key));

      return Array.isArray(value)
        ? value
        : [];
    } catch (error) {
      console.warn(`[R-EX] Invalid localStorage data: ${key}`);
      return [];
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`[R-EX] Could not save ${key}:`, error);
      return false;
    }
  }

  function getProductSku(product) {
    return String(
      product?.sku ||
      product?.id ||
      ""
    )
      .trim()
      .toUpperCase();
  }

  function isProductInWishlist(productSku) {
    const wishlist = readStorage(WISHLIST_KEY);

    return wishlist.some(item => {
      const itemSku = String(
        item.sku ||
        item.id ||
        ""
      )
        .trim()
        .toUpperCase();

      return itemSku === productSku;
    });
  }


  /* =========================================
     ASCEND BUTTON
  ========================================= */

  if (ascendBtn && menSection) {
    ascendBtn.addEventListener("click", function () {
      menSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }


  /* =========================================
     SECTION REVEAL
  ========================================= */

  function initSectionReveal() {
    if (!pageSections.length) return;

    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      pageSections.forEach(section => {
        section.classList.add("is-visible");
      });

      return;
    }

    if (!("IntersectionObserver" in window)) {
      pageSections.forEach(section => {
        section.classList.add("is-visible");
      });

      return;
    }

    const observer = new IntersectionObserver(
      function (entries, sectionObserver) {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          sectionObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -50px 0px"
      }
    );

    pageSections.forEach(section => {
      observer.observe(section);
    });
  }


  /* =========================================
     WISHLIST
  ========================================= */

  function toggleWishlist(product, button) {
    const productSku = getProductSku(product);

    if (!productSku) return;

    let wishlist = readStorage(WISHLIST_KEY);

    const existingIndex = wishlist.findIndex(item => {
      const itemSku = String(
        item.sku ||
        item.id ||
        ""
      )
        .trim()
        .toUpperCase();

      return itemSku === productSku;
    });

    let isActive = false;

    if (existingIndex >= 0) {
      wishlist.splice(existingIndex, 1);
    } else {
      wishlist.push({
        id: productSku,
        sku: productSku,
        name: product.name || productSku,
        price: Number(product.price || 0),
        image:
          Array.isArray(product.images)
            ? product.images[0] || ""
            : ""
      });

      isActive = true;
    }

    if (!writeStorage(WISHLIST_KEY, wishlist)) return;

    button.classList.toggle("active", isActive);
    button.textContent = isActive ? "♥" : "♡";

    button.setAttribute(
      "aria-label",
      isActive
        ? `Remove ${product.name} from wishlist`
        : `Add ${product.name} to wishlist`
    );

    window.dispatchEvent(
      new CustomEvent("rex:wishlist-updated", {
        detail: { wishlist }
      })
    );
  }


  /* =========================================
     PRODUCT CARD
  ========================================= */

  function createHomeProductCard(product) {
    const productSku = getProductSku(product);

    const productImage =
      Array.isArray(product.images)
        ? product.images[0] || ""
        : "";

    const wishlistActive =
      isProductInWishlist(productSku);

    const card = document.createElement("article");

    card.className = "product-card";
    card.dataset.sku = productSku;
    card.tabIndex = 0;

    card.setAttribute(
      "aria-label",
      `View ${product.name || productSku}`
    );

    card.innerHTML = `
      <button
        type="button"
        class="wishlist-btn${wishlistActive ? " active" : ""}"
        aria-label="${
          wishlistActive
            ? `Remove ${product.name} from wishlist`
            : `Add ${product.name} to wishlist`
        }">
        ${wishlistActive ? "♥" : "♡"}
      </button>

      <img
        src="${productImage}"
        alt="${product.name || productSku}"
        loading="lazy"
      >

      <h3>${product.name || productSku}</h3>

      <p>
        AED ${Number(product.price || 0).toFixed(0)}
      </p>

      <span class="product-explore">
        EXPLORE →
      </span>
    `;

    function openProduct() {
      window.location.href =
        `/product?sku=${encodeURIComponent(productSku)}`;
    }

    card.addEventListener("click", openProduct);

    card.addEventListener("keydown", function (event) {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        openProduct();
      }
    });

    const wishlistButton =
      card.querySelector(".wishlist-btn");

    wishlistButton.addEventListener(
      "click",
      function (event) {
        event.preventDefault();
        event.stopPropagation();

        toggleWishlist(product, wishlistButton);
      }
    );

    return card;
  }


  /* =========================================
     NEW ARRIVALS
  ========================================= */

  function renderHomeProducts() {
    if (!productGrid) return;

    productGrid.innerHTML = "";

    if (!productsDatabase) {
      console.warn(
        "[R-EX] PRODUCTS database was not loaded on Home."
      );

      return;
    }

    const products = Object
      .values(productsDatabase)
      .filter(product => {
        return product && getProductSku(product);
      })
      .slice(0, HOME_PRODUCTS_LIMIT);

    if (!products.length) {
      const emptyMessage = document.createElement("p");

      emptyMessage.className = "home-products-empty";
      emptyMessage.textContent =
        "New products will be available soon.";

      productGrid.appendChild(emptyMessage);
      return;
    }

    products.forEach(product => {
      productGrid.appendChild(
        createHomeProductCard(product)
      );
    });
  }


  /* =========================================
     SYNC WISHLIST BUTTONS
  ========================================= */

  function syncWishlistButtons() {
    if (!productGrid || !productsDatabase) return;

    productGrid
      .querySelectorAll(".product-card")
      .forEach(card => {
        const sku = String(
          card.dataset.sku || ""
        ).toUpperCase();

        const product = productsDatabase[sku];
        const button =
          card.querySelector(".wishlist-btn");

        if (!product || !button) return;

        const active =
          isProductInWishlist(sku);

        button.classList.toggle("active", active);
        button.textContent = active ? "♥" : "♡";

        button.setAttribute(
          "aria-label",
          active
            ? `Remove ${product.name} from wishlist`
            : `Add ${product.name} to wishlist`
        );
      });
  }

  window.addEventListener(
    "rex:wishlist-updated",
    syncWishlistButtons
  );

  window.addEventListener(
    "storage",
    function (event) {
      if (event.key === WISHLIST_KEY) {
        syncWishlistButtons();
      }
    }
  );


  /* =========================================
     INITIALIZE HOME
  ========================================= */

  renderHomeProducts();
  initSectionReveal();
}