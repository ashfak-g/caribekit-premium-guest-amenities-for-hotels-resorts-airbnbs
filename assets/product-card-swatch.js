if (!customElements.get("pcard-swatch")) {
  class PcardColorSwatch extends HTMLElement {
    constructor() {
      super();

      this.selectors = {
        container: "[data-pcard-variant-picker]",
        optionNodes: [".m-product-option--node__label"],
        featuredImage: ".m-product-card__main-image",
        pcard: ".m-product-card",
        variantDropdown: ".m-product-option--dropdown-select",
        priceWrapper: ".m-price",
        salePrice: ".m-price-item--sale",
        compareAtPrice: [".m-price-item--regular"],
        unitPrice: ".m-price__unit",
        soldOutBadge: ".m-product-tag--soldout",
      };
      this.container = this.closest(this.selectors.container);
      this.pcard = this.closest(this.selectors.pcard);
      this.variantIdNode = this.pcard && this.pcard.querySelector('[name="id"]');
      this.featuredImage = this.pcard && this.pcard.querySelector(this.selectors.featuredImage);
      this.domNodes = queryDomNodes(this.selectors, this.pcard);
      this.setupData();
    }

    async setupData() {
      this.variantData = this.getVariantData();
      this.productHandle = this.container.dataset.productHandle;
      this.productData = await this.getProductJson();
      this.activeOptionNodeByPosition = {};
      this.hide_unavailable_product_options = MinimogSettings.hide_unavailable_product_options;

      const { variantIdNode, productData, productData: { variants } = {} } = this;

      if (productData) {
        let currentVariantId = variantIdNode && Number(variantIdNode.value);
        if (!currentVariantId) {
          currentVariantId =
            productData.selected_or_first_available_variant && productData.selected_or_first_available_variant.id;
        }
        const currentVariant = variants.find((v) => v.id === currentVariantId) || variants[0];
        this.productData.initialVariant = currentVariant;
        if (!this.productData.selected_variant && variantIdNode && variantIdNode.dataset.selectedVariant) {
          this.productData.selected_variant = variants.find(
            (v) => v.id === Number(variantIdNode && variantIdNode.dataset.selectedVariant)
          );
        }

        this.updateOptionByVariant(currentVariant);

        window.MinimogEvents.subscribe("m:image-loaded", () => {
          this.changeProductImage(currentVariant);
        });
      }

      this.initOptionSwatches();
      this.domNodes.optionNodes &&
        this.domNodes.optionNodes.forEach((node) =>
          node.addEventListener("click", this.handleSelectVariant.bind(this))
        );
      this.domNodes.variantDropdown &&
        this.domNodes.variantDropdown.addEventListener("change", this.handleSelectVariant.bind(this));
    }

    getVariantData() {
      this.variantData =
        this.variantData ||
        JSON.parse(this.container && this.container.querySelector('[type="application/json"]').textContent);
      return this.variantData;
    }

    getProductJson() {
      let productUrl = `${window.MinimogSettings.routes.root}/products/${this.productHandle}.js`;
      productUrl = productUrl.replace("//", "/");
      return fetch(productUrl).then(function (response) {
        return response.json();
      });
    }

    initOptionSwatches() {
      const { _colorSwatches = [], _imageSwatches = [] } = window.MinimogSettings;

      this.domNodes.optionNodes.forEach((optNode) => {
        const { optionType, optionPosition, value: optionValue } = optNode && optNode.dataset;
        const optionValueLowerCase = optionValue && optionValue.toLowerCase();
        const variantToShowSwatchImage = this.variantData.find((v) => v[`option${optionPosition}`] === optionValue);
        const variantImage =
          variantToShowSwatchImage &&
          variantToShowSwatchImage.featured_image &&
          variantToShowSwatchImage.featured_image.src
            ? getSizedImageUrl(variantToShowSwatchImage.featured_image.src, "60x")
            : null;
        const customImage =
          _imageSwatches.find((i) => i.key === optionValueLowerCase) &&
          _imageSwatches.find((i) => i.key === optionValueLowerCase).value;
        const customColor =
          _colorSwatches.find((c) => c.key === optionValueLowerCase) &&
          _colorSwatches.find((c) => c.key === optionValueLowerCase).value;
        if (variantImage || customImage) optNode.classList.add("has-bg-img");

        switch (optionType) {
          case "default":
            if (customImage || variantImage) {
              optNode.style.backgroundImage = `url(${customImage || variantImage || ""})`;
            }
            break;
          case "image":
            if (variantImage || customImage) {
              optNode.style.backgroundImage = `url(${variantImage || customImage || ""})`;
            }
            break;
          case "color":
            optNode.style.background = `${customColor ? customColor : optionValueLowerCase}`;
            // optNode.style.setProperty('--option-color', customColor ? customColor : optionValueLowerCase)
            if (customImage) optNode.style.backgroundImage = `url(${customImage})`;
            break;
          default:
            break;
        }
      });
    }

    toggleOptionNodeActive(optNode, active) {
      if (!optNode) return;
      if (active) {
        const { optionPosition, value: optionValue } = optNode.dataset;
        this.activeOptionNodeByPosition[optionPosition] = optNode;
        // this.updateOptionLabel(optionPosition, optionValue)

        switch (optNode.tagName) {
          case "INPUT":
            optNode.checked = "checked";
            optNode.dataset.selected = "true";
            break;
          case "OPTION":
            optNode.dataset.selected = "true";
            const select = optNode.closest("select");
            if (select) select.value = optNode.value;
            break;
          case "LABEL":
            optNode.dataset.selected = "true";
            break;
          default:
            if (!optNode.classList.contains("m-product-quickview-button")) {
              console.warn("Unable to activate option node", optNode);
            }
            break;
        }

        this.updateSoldOutBadge(this.getVariantsByActiveOptionValue(optionValue));
      } else {
        if (!["default", "image", "color"].includes(optNode.dataset.optionType)) {
          optNode.style.border = "";
        }
        optNode.checked = false;
        delete optNode.dataset.selected;
        const select = optNode.closest("select");
        if (select) select.value = "";
      }
    }

    updateOptionByVariant(variant) {
      Object.values(this.activeOptionNodeByPosition).forEach((optNode) => this.toggleOptionNodeActive(optNode, false));

      const { optionNodes } = this.domNodes;
      const { options = [] } = variant || {};
      options.forEach((option, index) => {
        const optPosition = index + 1;
        optionNodes.forEach((optNode) => {
          const _optPosition = Number(optNode.dataset.optionPosition);
          const _optValue = optNode.dataset.value;

          if (_optPosition === optPosition && option === _optValue) {
            this.toggleOptionNodeActive(optNode, true);
          }
        });
      });
      this.updatePrice(variant);
    }

    getVariantFromActiveOptions = () => {
      const {
        productData,
        productData: { initialVariant },
        activeOptionNodeByPosition,
      } = this;
      let options;

      const initialVariantOptions = {
        1: initialVariant.option1,
        2: initialVariant.option2,
        3: initialVariant.option3,
      };

      Object.values(activeOptionNodeByPosition).forEach((optNode) => {
        const { optionPosition, value } = optNode.dataset;
        initialVariantOptions[optionPosition] = value;
      });

      options = Object.values(initialVariantOptions);

      options = options.filter(Boolean);
      let variant = getVariantFromOptionArray(productData, options);
      if (!variant && this.hide_unavailable_product_options) {
        options.pop();
        variant = getVariantFromOptionArray(productData, options);
        if (!variant) {
          options.pop();
          variant = getVariantFromOptionArray(productData, options);
        }
      }
      this.currentVariant = variant;
      return variant;
    };

    handleSelectVariant(e) {
      let { target } = e;
      let newVariant;

      if (target.classList.contains("combined-variant")) {
        const variantId = Number(e.target.value);
        newVariant =
          this.productData && this.productData.variants && this.productData.variants.find((v) => v.id === variantId);
      } else {
        if (target.tagName === "SELECT") {
          target = target.querySelectorAll("option")[target.selectedIndex];
        }
        if (!target.classList.contains("m-product-option--node__label")) {
          target = target.closest(".m-product-option--node__label");
          if (!target) console.error("Unable to find option node!");
        }
        const { optionPosition } = target.dataset;

        const currActiveOptNode = this.activeOptionNodeByPosition[optionPosition];
        this.toggleOptionNodeActive(currActiveOptNode, false);
        this.toggleOptionNodeActive(target, true);
        newVariant = this.getVariantFromActiveOptions();
      }

      const { variantIdNode } = this;
      if (variantIdNode) {
        variantIdNode.setAttribute("value", String(newVariant.id));
        variantIdNode.value = String(newVariant.id);
      }

      this.updateBySelectedVariant(newVariant);
    }

    updateBySelectedVariant(variant) {
      if (variant) {
        this.changeProductImage(variant);
        this.updatePrice(variant);
      }
    }

    updateProductCardSoldOutBadge(variant) {
      if (this.domNodes.soldOutBadge) {
        this.domNodes.soldOutBadge.style.display = variant.available ? "none" : "flex";
      }
    }

    updateSoldOutBadge(variants) {
      let soldOut = true;

      for (let i = 0; i < variants.length; i++) {
        if (variants[i].available) {
          soldOut = false;
          break;
        }
      }

      if (this.domNodes.soldOutBadge) {
        this.domNodes.soldOutBadge.style.display = soldOut ? "flex" : "none";
      }
    }
    getVariantsByActiveOptionValue = (value) => {
      const { productData: { variants } = {} } = this;
      return variants.filter((variant) => variant.options.indexOf(value) !== -1);
    };

    changeProductImage(variant) {
      const src = variant && variant.featured_image && variant.featured_image.src;
      const { featuredImage } = this;
      const img = featuredImage && featuredImage.querySelector("img");

      if (img && src) {
        img.src = `${src}&width=533`;
        img.removeAttribute("srcset");
      }
    }

    updatePrice(variant) {
      if (MinimogSettings.pcard_show_lowest_prices) return;
      const classes = {
        onSale: "m-price--on-sale",
        soldOut: "m-price--sold-out",
      };

      const money_format = window.MinimogSettings.money_format;

      const { priceWrapper, salePrice, unitPrice, compareAtPrice } = this.domNodes;

      const { compare_at_price, price, unit_price_measurement } = variant;
      const onSale = compare_at_price && compare_at_price > price;
      const soldOut = !variant.available;

      if (onSale) {
        priceWrapper && priceWrapper.classList.add(classes.onSale);
      } else {
        priceWrapper && priceWrapper.classList.remove(classes.onSale);
      }

      if (soldOut) {
        priceWrapper && priceWrapper.classList.add(classes.soldOut);
      } else {
        priceWrapper && priceWrapper.classList.remove(classes.soldOut);
      }

      if (priceWrapper) priceWrapper.classList.remove("visibility-hidden");
      if (salePrice) salePrice.innerHTML = formatMoney(price, money_format);

      if (compareAtPrice && compareAtPrice.length && compare_at_price > price) {
        compareAtPrice.forEach((item) => (item.innerHTML = formatMoney(compare_at_price, money_format)));
      } else {
        compareAtPrice.forEach((item) => (item.innerHTML = formatMoney(price, money_format)));
      }

      if (unit_price_measurement && unitPrice && this.currentVariant) {
        unitPrice.classList.remove("f-hidden");
        const unitPriceContent = `<span>${formatMoney(
          this.currentVariant.unit_price,
          money_format
        )}</span>/<span data-unit-price-base-unit>${this._getBaseUnit()}</span>`;
        unitPrice.innerHTML = unitPriceContent;
      } else {
        unitPrice && unitPrice.classList.add("f-hidden");
      }
    }

    _getBaseUnit = () => {
      return this.currentVariant.unit_price_measurement.reference_value === 1
        ? this.currentVariant.unit_price_measurement.reference_unit
        : this.currentVariant.unit_price_measurement.reference_value +
            this.currentVariant.unit_price_measurement.reference_unit;
    };
  }

  customElements.define("pcard-swatch", PcardColorSwatch);

  if (!customElements.get("swatch-button")) {
    class PcardVariantButton extends HTMLElement {
      constructor() {
        super();
      }
    }
    customElements.define("swatch-button", PcardVariantButton);

    if (!customElements.get("swatch-dropdown")) {
      class PcardVariantSelect extends PcardVariantButton {
        constructor() {
          super();
        }
      }

      customElements.define("swatch-dropdown", PcardVariantSelect);
    }
    if (!customElements.get("swatch-image")) {
      class PcardVariantImage extends PcardVariantButton {
        constructor() {
          super();
        }
      }

      customElements.define("swatch-image", PcardVariantImage);
    }
    if (!customElements.get("swatch-color")) {
      class PcardVariantColor extends PcardVariantButton {
        constructor() {
          super();
        }
      }
      customElements.define("swatch-color", PcardVariantColor);
    }
  }
}
