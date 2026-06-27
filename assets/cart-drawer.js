class MCartDrawer extends HTMLElement {
  constructor() {
    super();
    this.cartDrawerInner = this.querySelector(".m-cart-drawer__inner");
    this.cartDrawerCloseIcon = this.querySelector(".m-cart-drawer__close");
    this.cartOverlay = this.querySelector(".m-cart__overlay");
    this.rootUrl = window.Shopify.routes.root;

    this.setHeaderCartIconAccessibility();
    this.cartDrawerCloseIcon.addEventListener("click", this.close.bind(this));
    this.addEventListener("click", (event) => {
      if (event.target.closest(".m-cart-drawer__inner") !== this.cartDrawerInner) {
        this.close();
      }
    });
  }

  setHeaderCartIconAccessibility() {
    const cartLinks = document.querySelectorAll(".m-cart-icon-bubble");
    cartLinks.forEach((cartLink) => {
      cartLink.setAttribute("role", "button");
      cartLink.setAttribute("aria-haspopup", "dialog");
      cartLink.addEventListener("click", (event) => {
        if (MinimogSettings.enable_cart_drawer) {
          event.preventDefault();
          this.open(cartLink);
        }
      });
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    this.classList.add("m-cart-drawer--active");
    requestAnimationFrame(() => {
      this.style.setProperty("--m-bg-opacity", "0.5");
      this.cartDrawerInner.style.setProperty("--translate-x", "0");
    });
    window.MinimogEvents.emit(MinimogTheme.pubSubEvents.openCartDrawer);
    document.documentElement.classList.add("prevent-scroll");
  }

  close() {
    this.style.setProperty("--m-bg-opacity", "0");
    this.cartDrawerInner.style.setProperty("--translate-x", "100%");
    setTimeout(() => {
      this.classList.remove("m-cart-drawer--active");
      document.documentElement.classList.remove("prevent-scroll");
    }, 300);
  }

  renderContents(parsedState) {
    this.classList.contains("m-cart--empty") && this.classList.remove("m-cart--empty");
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });
    setTimeout(() => {
      this.open();
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

  onCartDrawerUpdate(updateFooter = true) {
    fetch(`${MinimogSettings.routes.cart}?section_id=cart-drawer`)
      .then((response) => response.text())
      .then((responseText) => {
        this.getSectionsToRender().forEach((section) => {
          if (section.block === "cart-items") {
            const sectionElement = section.selector
              ? document.querySelector(section.selector)
              : document.getElementById(section.id);
            sectionElement.innerHTML = this.getSectionInnerHTML(responseText, section.selector);
          } else {
            if (updateFooter) {
              const sectionElement = section.selector
                ? document.querySelector(section.selector)
                : document.getElementById(section.id);
              sectionElement.innerHTML = this.getSectionInnerHTML(responseText, section.selector);
            }
          }
        });
      })
      .catch((e) => {
        console.error(e);
      });
    this.getCart().then((cart) => {
      this.classList.toggle("m-cart--empty", cart.item_count === 0);
      this.updateCartCount(cart.item_count);
    });
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser().parseFromString(html, "text/html").querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: "cart-drawer",
        selector: "[data-minimog-cart-items]",
        block: "cart-items",
      },
      {
        id: "cart-drawer",
        selector: "[data-minimog-cart-discounts]",
        block: "cart-footer",
      },
      {
        id: "cart-drawer",
        selector: "[data-cart-subtotal]",
        block: "cart-footer",
      },
      {
        id: "cart-drawer",
        selector: "[data-minimog-gift-wrapping]",
        block: "cart-footer",
      },
    ];
  }

  getSectionDOM(html, selector = ".shopify-section") {
    return new DOMParser().parseFromString(html, "text/html").querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define("m-cart-drawer", MCartDrawer);

class MCartDrawerItems extends MCartTemplate {
  getSectionsToRender() {
    return [
      {
        id: "MinimogCartDrawer",
        section: "cart-drawer",
        selector: "[data-minimog-cart-items]",
      },
      {
        id: "MinimogCartDrawer",
        section: "cart-drawer",
        selector: "[data-minimog-cart-discounts]",
      },
      {
        id: "MinimogCartDrawer",
        section: "cart-drawer",
        selector: "[data-cart-subtotal]",
      },
      {
        id: "MinimogCartDrawer",
        section: "cart-drawer",
        selector: "[data-minimog-gift-wrapping]",
      },
    ];
  }
}

customElements.define("m-cart-drawer-items", MCartDrawerItems);
