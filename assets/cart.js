class MCartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener("click", (event) => {
      event.preventDefault();
      const cartItems = this.closest("m-cart") || this.closest("m-cart-drawer-items");
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define("m-cart-remove-button", MCartRemoveButton);

class MCartTemplate extends HTMLElement {
  constructor() {
    super();
    this.cartUpdateUnsubscriber = undefined;
    this.isCartPage = MinimogSettings.templateName === "cart";
    this.cartDrawerWrapper = document.querySelector("m-cart-drawer");
    this.cartDrawerInner = document.querySelector(".m-cart-drawer__inner");
    this.mainCartItems = this.querySelector("[data-minimog-cart-items]");
    this.cartSubTotal = this.querySelector("[data-cart-subtotal]");
    this.cartDiscount = this.querySelector("[data-minimog-cart-discounts]");
    this.giftWrapping = this.querySelector("[data-minimog-gift-wrapping]");
    let loadingTarget = this.cartDrawerInner;
    if (this.isCartPage) loadingTarget = document.body;
    this.loading = new MinimogLibs.AnimateLoading(loadingTarget, { overlay: loadingTarget });

    this.rootUrl = window.Shopify.routes.root;

    const debouncedOnChange = debounce((event) => {
      if (event.target.name !== "id") {
        this.onChange(event);
      }
    }, 300);
    if (this.isCartPage) {
      this.mainCartItems.addEventListener("change", debouncedOnChange.bind(this));
    } else {
      this.addEventListener("change", debouncedOnChange.bind(this));
    }

    MinimogEvents.subscribe(MinimogTheme.pubSubEvents.cartUpdate, (response) => {
      this.getCart().then((cart) => {
        this.updateCartCount(cart.item_count);
      });
    });
  }

  updateCartCount(itemCount) {
    const cartCounts = document.querySelectorAll(".m-cart-count-bubble");
    cartCounts.forEach((cartCount) => {
      if (itemCount > 0) {
        cartCount.textContent = itemCount;
        cartCount.classList.remove("m:hidden");
      } else {
        cartCount.classList.add("m:hidden");
      }
    });
  }

  getCart() {
    return fetchJSON(this.rootUrl + "cart.json");
  }

  connectedCallback() {
    this.cartUpdateUnsubscriber = MinimogEvents.subscribe(MinimogTheme.pubSubEvents.cartUpdate, (event) => {
      if (event.source === "main-cart-items") {
        return;
      }
      this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  onCartUpdate(renderFooter = true) {
    const { routes } = window.MinimogSettings;
    fetch(`${routes.cart}?section_id=cart-template`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, "text/html");
        const cartItems = html.querySelector("[data-minimog-cart-items]");
        const cartSubTotal = html.querySelector("[data-cart-subtotal]");
        const cartDiscount = html.querySelector("[data-minimog-cart-discounts]");
        const giftWrapping = html.querySelector("[data-minimog-gift-wrapping]");
        if (this.isCartPage) {
          this.mainCartItems.innerHTML = cartItems.innerHTML;
          if (renderFooter) {
            this.cartSubTotal.innerHTML = cartSubTotal.innerHTML;
            this.cartDiscount.innerHTML = cartDiscount.innerHTML;
            this.giftWrapping.innerHTML = giftWrapping.innerHTML;
          }
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }

  onChange(event) {
    this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute("name"));
  }

  updateQuantity(line, quantity, name) {
    this.loading.start();
    const { routes } = window.MinimogSettings;

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        let quantityElement = document.getElementById(`MinimogDrawer-quantity-${line}`);
        if (this.isCartPage) {
          if (MinimogTheme.config.mqlMobile) {
            quantityElement = document.querySelector(`.MinimogQuantity-${line}.MinimogQuantity-mobile`);
          } else {
            quantityElement = document.querySelector(`.MinimogQuantity-${line}.MinimogQuantity-desktop`);
          }
        }
        const items = document.querySelectorAll(".m-cart-item");

        if (parsedState.errors) {
          this.loading.finish();
          quantityElement.value = quantityElement.getAttribute("value");
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        this.classList.toggle("m-cart--empty", parsedState.item_count === 0);
        if (this.cartDrawerWrapper)
          this.cartDrawerWrapper.classList.toggle("m-cart--empty", parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section) => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
          elementToReplace.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.section],
            section.selector
          );
        });

        const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
        let message = "";
        if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
          if (typeof updatedValue === "undefined") {
            message = window.MinimogStrings.cartError;
          } else {
            message = window.MinimogStrings.quantityError.replace("{{ quantity }}", updatedValue);
          }
        }
        this.updateLiveRegions(line, message);
        MinimogEvents.emit(MinimogTheme.pubSubEvents.cartUpdate, { ...parsedState, source: "main-cart-items" });
      })
      .catch(() => {})
      .finally(() => {
        this.loading.finish();
      });
  }

  updateLiveRegions(line, message) {
    let lineItemNode = document.getElementById(`MinimogCartDrawer-Item-${line}`);
    if (this.isCartPage) lineItemNode = document.getElementById(`MinimogCart-Item-${line}`);
    if (message !== "" && lineItemNode) {
      MinimogTheme.Notification.show({
        target: lineItemNode,
        type: "warning",
        message: message,
      });
    }
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, "text/html").querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: "MinimogCart",
        section: "cart-template",
        selector: "[data-minimog-cart-items]",
      },
      {
        id: "MinimogCart",
        section: "cart-template",
        selector: "[data-cart-subtotal]",
      },
      {
        id: "MinimogCart",
        section: "cart-template",
        selector: "[data-minimog-cart-discounts]",
      },
      {
        id: "MinimogCart",
        section: "cart-template",
        selector: "[data-minimog-gift-wrapping]",
      },
    ];
  }
}

customElements.define("m-cart", MCartTemplate);
