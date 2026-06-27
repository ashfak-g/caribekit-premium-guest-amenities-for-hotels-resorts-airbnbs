if (!customElements.get("m-product-bundle")) {
  class MProductBundle extends HTMLElement {
    constructor() {
      super();
      this.selectors = {
        bundleError: ".product-bundles__error",
        productVariantSelects: ".m-product-option--dropdown-select",
        totalPrice: "[data-total-price]",
        submitBundle: "[data-add-bundle]",
        errorWrapper: ".product-bundles__error",
        cartDrawer: "m-cart-drawer",
      };

      this.domNodes = queryDomNodes(this.selectors, this);
    }

    connectedCallback() {
      this.initProductBundles();
    }

    initProductBundles() {
      let allProducts = [],
        productVariants = [];
      const products = this.querySelectorAll(".product-bundles__item");

      for (let product of products) {
        let variants = product.nextElementSibling;
        if (variants && variants.hasAttribute("data-product-variants")) {
          variants = JSON.parse(variants.innerHTML);

          productVariants.push(variants);
          allProducts.push(product);

          addEventDelegate({
            context: product,
            event: "change",
            selector: this.selectors.productVariantSelects,
            handler: (e) => this._handleChangePrice(e, product, variants, allProducts),
          });
        }
      }

      addEventDelegate({
        context: this,
        selector: this.selectors.submitBundle,
        handler: (e) => this._handleAddItems(e, this),
      });
    }

    _handleChangePrice(evt, product, variants, products) {
      const regularPrice = product.querySelector("[data-regular-price]");
      let comparePrice = product.querySelector("[data-compare-price]");
      let savedPrice = product.querySelector("[data-saved-price]");
      let savedPriceWrapper = product.querySelector(".product-bundles__save-price");

      const selectedVariant = evt.target.value;
      const variant = variants.find((v) => v.id === parseInt(selectedVariant));

      regularPrice.innerHTML = formatMoney(variant.price, MinimogSettings.money_format);
      regularPrice.dataset.price = variant.price;

      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        if (comparePrice) {
          comparePrice.classList.remove("m:hidden");
          comparePrice.innerHTML = formatMoney(variant.compare_at_price, MinimogSettings.money_format);
        }
        if (savedPriceWrapper) {
          savedPriceWrapper.classList.remove("m:hidden");
        }
        if (savedPrice) {
          savedPrice.classList.remove("m:hidden");
          savedPrice.innerHTML = formatMoney(variant.compare_at_price - variant.price, MinimogSettings.money_format);
        }
      } else {
        if (comparePrice) {
          comparePrice.classList.add("m:hidden");
        }
        if (savedPriceWrapper) {
          savedPriceWrapper.classList.add("m:hidden");
        }
        if (savedPrice) {
          savedPrice.classList.add("m:hidden");
        }
      }

      // Calculate total price
      const selectedVariants = products
        .map((product) => {
          let variants = product.nextElementSibling.innerHTML;
          variants = JSON.parse(variants);

          let select = product.querySelector('[name="id"]');
          if (variants && select) {
            return variants.find((v) => v.id === Number(select.value));
          }
        })
        .filter(Boolean);

      const totalPrice = selectedVariants.reduce((s, v) => s + v.price, 0);
      const container = product.closest(".product-bundles");
      container.querySelector(this.selectors.totalPrice).innerHTML = formatMoney(
        totalPrice,
        MinimogSettings.money_format
      );
    }

    _handleAddItems(e, bundle) {
      e.preventDefault();
      const inputIds = bundle.querySelectorAll('[name="id"]');
      const errorWrapper = bundle.querySelector(this.selectors.errorWrapper);
      const button = bundle.querySelector(this.selectors.submitBundle);
      const cartDrawrer = document.querySelector(this.selectors.cartDrawer);

      const ids = [...inputIds].map((input) => input.value);
      let data = { items: ids.map((id) => ({ id, quantity: 1 })) };
      if (cartDrawrer) {
        data = {
          ...data,
          sections: cartDrawrer.getSectionsToRender().map((section) => section.id),
          sections_url: window.location.pathname,
        };
      }
      const config = fetchConfig("javascript");
      config.method = "POST";
      config.body = JSON.stringify(data);

      this._toggleLoading(true, button);
      const { MinimogSettings, MinimogStrings } = window;
      fetch(`${MinimogSettings.routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            this._showError(response.description || "Failed to add all items to cart!", errorWrapper);
            return;
          }
          if (MinimogSettings.use_ajax_atc) {
            if (!MinimogSettings.enable_cart_drawer) {
              window.MinimogTheme.Notification.show({
                target: errorWrapper ? errorWrapper : document.body,
                method: "appendChild",
                type: "success",
                message: MinimogStrings.itemAdded,
                last: 3000,
                sticky: !this.domNodes.errorWrapper,
              });
            } else {
              cartDrawrer && cartDrawrer.renderContents(response);
              MinimogTheme.Notification.show({
                target: cartDrawrer.querySelector("m-cart-drawer-items"),
                method: "prepend",
                type: "success",
                message: MinimogStrings.itemAdded,
                delay: 400,
              });
            }
            window.MinimogEvents.emit(MinimogTheme.pubSubEvents.cartUpdate, response);
          } else {
            window.location = MinimogSettings.routes.cart;
          }
        })
        .catch((err) => {
          console.log(err);
        })
        .finally(() => {
          this._toggleLoading(false, button);
          if (cartDrawrer) {
            const cartDrawerItems = cartDrawrer.querySelector("m-cart-drawer-items");
            if (cartDrawrer.classList.contains("m-cart--empty")) cartDrawrer.classList.remove("m-cart--empty");
            if (cartDrawerItems && cartDrawerItems.classList.contains("m-cart--empty"))
              cartDrawerItems.classList.remove("m-cart--empty");
          }
        });
    }

    _showError(err, errorWrapper) {
      MinimogTheme.Notification.show({
        target: errorWrapper,
        method: "appendChild",
        type: "warning",
        message: err,
      });
    }
    _toggleLoading(loading, button) {
      if (loading) {
        button.classList.add("m-spinner-loading");
      } else {
        button.classList.remove("m-spinner-loading");
      }
    }
  }
  customElements.define("m-product-bundle", MProductBundle);
}
