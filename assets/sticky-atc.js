if (!customElements.get("sticky-atc")) {
  customElements.define(
    "sticky-atc",
    class StickyAtc extends HTMLElement {
      constructor() {
        super();
        this.selectors = {
          prodTitle: ".m-sticky-addtocart--title",
          mainImage: ".m-sticky-addtocart--image",
          addToCart: ".m-add-to-cart",
          buyNowBtn: ".m-product-dynamic-checkout",
          variantIdSelect: '[name="id"]',
          foxkitBtn: ".foxkit-button",
        };
        this.hasCustomFields = !!document.querySelector(".m-main-product--info .m-product-custom-field");
      }

      connectedCallback() {
        this.container = this.closest(".m-sticky-addtocart");
        this.mainProductForm = document.querySelector(".m-product-form--main");
        this.mainProductInfo = document.querySelector(".m-main-product--info");
        this.mainAddToCart = this.mainProductForm.querySelector(".m-add-to-cart");
        this.mainDynamicCheckout = this.mainProductForm.querySelector(this.selectors.buyNowBtn);
        this.productId = this.dataset.productId;
        this.selectedVariantDefault = this.dataset.disableSelectedVariantDefault === "true";

        this.domNodes = queryDomNodes(this.selectors, this.container);

        this.variantData = this.getVariantData();

        const queryString = window.location.search;
        const hasQueryString = queryString.includes("?variant=");
        if (!hasQueryString && this.selectedVariantDefault && this.variantData && this.variantData.length > 1)
          this.disableSelectedVariantDefault();

        this.init();
        this.setStickyAddToCartHeight();

        this.addEventListener("change", () => {
          const selectedVariantId = this.querySelector(this.selectors.variantIdSelect).value;
          this.currentVariant = this.variantData.find((variant) => variant.id === Number(selectedVariantId));

          this.updateButton(true, "", false);
          if (!this.currentVariant) {
            this.updateButton(true, "", true);
          } else {
            this.updateButton(!this.currentVariant.available, window.MinimogStrings.soldOut);
          }
        });

        document.addEventListener("matchMobile", () => {
          this.setStickyAddToCartHeight();
        });
        document.addEventListener("unmatchMobile", () => {
          this.setStickyAddToCartHeight();
        });
      }

      getVariantData() {
        this.variantData =
          this.variantData || JSON.parse(this.container.querySelector('[type="application/json"]').textContent);
        return this.variantData;
      }

      init() {
        if (!this.mainAddToCart) {
          this.container.style.setProperty("--m-translate-y", 0);
          return;
        }
        const { prodTitle, mainImage, addToCart, buyNowBtn, foxkitBtn } = this.domNodes;
        if (buyNowBtn) this.enable_dynamic_checkout = true;
        const headerHeight = MinimogSettings.headerHeight || 66;
        const rootMargin = `${headerHeight}px 0px 0px 0px`;

        if ("IntersectionObserver" in window) {
          this.observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.intersectionRatio !== 1) {
                  this.container.style.setProperty("--m-translate-y", 0);
                } else {
                  this.container.style.setProperty("--m-translate-y", "100%");
                }
                document.documentElement.classList[entry.intersectionRatio !== 1 ? "add" : "remove"]("stick-atc-show");
              });
            },
            { threshold: 1, rootMargin }
          );
        }

        prodTitle.addEventListener("click", () => __scrollToTop());
        mainImage.addEventListener("click", () => __scrollToTop());

        if (this.hasCustomFields) {
          let hasCustomFieldRequired = false;
          const customFields = document.querySelectorAll(".m-main-product--info .m-product-custom-field");
          customFields &&
            customFields.forEach((item) => {
              const field = item.querySelector(".form-field");
              if (field.value == "" && field.hasAttribute("required")) {
                hasCustomFieldRequired = true;
              }
            });
          hasCustomFieldRequired &&
            addToCart.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              __scrollToTop(this.mainProductForm, () => this.mainAddToCart.click());
            });
          if (buyNowBtn) {
            buyNowBtn.addEventListener(
              "click",
              (e) => {
                const missing = validateForm(this.mainProductInfo);
                if (missing.length > 0) {
                  e.preventDefault();
                  e.stopPropagation();
                  __scrollToTop(this.mainProductForm, () => this.mainDynamicCheckout.click());
                }
              },
              true
            );
          }
          if (foxkitBtn) {
            foxkitBtn.addEventListener("click", (e) => {
              e.preventDefault();
              __scrollToTop(this.mainProductForm, () => this.mainAddToCart.click());
            });
          }
        }

        this.setObserveTarget();
        this.syncWithMainProductForm();
      }

      setObserveTarget() {
        if (this.observer) {
          this.observer.observe(this.mainProductForm);
          this.observeTarget = this.mainProductForm;
        }
      }

      checkDevice(e) {
        const sectionHeight = this.clientHeight + "px";
        document.documentElement.style.setProperty("--f-sticky-atc-bar-height", sectionHeight);
      }

      disableSelectedVariantDefault() {
        const pickerSelects = this.querySelector(".m-product-option--dropdown-select");
        if (!pickerSelects) return;
        pickerSelects.value = "";
      }

      updateButton(disable = true, text, modifyClass = true) {
        const productForm = this.querySelector(".sticky-atc-form");
        if (!productForm) return;
        const addButton = productForm.querySelector('[name="add"]');
        const addButtonText = productForm.querySelector('[name="add"] > .m-add-to-cart--text');

        if (!addButton) return;

        if (disable) {
          addButton.setAttribute("disabled", "disabled");
          if (text) addButtonText.textContent = text;
        } else {
          addButton.removeAttribute("disabled");
          addButton.classList.remove("disabled");
          addButtonText.textContent = window.MinimogStrings.addToCart;
        }
      }

      syncWithMainProductForm() {
        const variantInput = this.querySelector('[name="id"]');
        window.MinimogEvents.subscribe(`${this.productId}__VARIANT_CHANGE`, async (variant) => {
          if (variant) variantInput.value = variant.id;
        });
      }

      setStickyAddToCartHeight() {
        document.documentElement.style.setProperty("--f-sticky-atc-bar-height", this.offsetHeight + "px");
        window.MinimogSettings.stickyAddToCartHeight = this.offsetHeight;
      }
    }
  );
}
