if (!customElements.get("m-product-inventory")) {
  class productInventory extends HTMLElement {
    constructor() {
      super();
      this.selectors = {
        inventoryQuantity: ".m-product-inventory__quantity",
        inventoryStatus: ".m-product-inventory__status",
        inventoryMessage: ".m-product-inventory__message",
        indicatorBar: ".m-product-inventory__indicator-bar",
      };

      this.domNodes = queryDomNodes(this.selectors, this);
    }

    connectedCallback() {
      this.productId = this.dataset.productId;
      this.inventoryVisibility = this.dataset.inventoryVisibility;
      this.hideStockBackordered = this.dataset.hideStockBackordered === "true";

      this.handleVariantChange();

      this.updateInventoryStatus(
        parseInt(this.dataset.inventoryQuantity),
        this.dataset.variantAvailable === "true",
        this.dataset.inventoryPolicy
      );
    }

    handleVariantChange() {
      window.MinimogEvents.subscribe(`${this.productId}__VARIANT_CHANGE`, (variant) => {
        if (variant) {
          const inventoryData = JSON.parse(this.querySelector('[type="application/json"]').textContent);
          const variantInventoryObject = inventoryData.filter((v) => v.id === variant.id)[0];

          this.updateInventoryStatus(
            parseInt(variantInventoryObject.inventory_quantity),
            variantInventoryObject.available,
            variantInventoryObject.inventory_policy
          );
        } else {
          this.updateInventoryStatus(0, false);
        }
      });
    }

    updateInventoryStatus(count, available, inventoryPolicy) {
      let status;
      let show = false;

      if (count <= 0) {
        if (inventoryPolicy === "continue") {
          status = "backordered";
        } else if (available) {
          status = "instock";
        } else {
          status = "outofstock";
        }
      } else if (count <= this.dataset.inventoryThreshold) {
        status = "low";
      } else {
        status = "normal";
      }

      this.setAttribute("data-status", status);

      if (this.inventoryVisibility == "always") {
        show = true;
        if (status == "backordered" && this.hideStockBackordered) {
          show = false;
        }
      } else {
        // low inventory
        if (status == "low") {
          show = true;
        }
      }

      if (show) {
        this.classList.remove("m:hidden");
        this.domNodes.inventoryMessage.innerHTML = this.getInventoryText()[status].message;

        if (this.getInventoryText()[status].show_count) {
          if (this.getInventoryText()[status].text_html) {
            let text = this.getInventoryText()[status].text_html.replace("{{ quantity }}", count);
            this.domNodes.inventoryStatus.classList.remove("m:hidden");
            this.domNodes.inventoryStatus.innerHTML = text;
          } else {
            this.domNodes.inventoryStatus.innerHTML = "";
            this.domNodes.inventoryStatus.classList.add("m:hidden");
          }
        } else {
          if (this.getInventoryText()[status].text) {
            this.domNodes.inventoryStatus.classList.remove("m:hidden");
            this.domNodes.inventoryStatus.innerHTML = this.getInventoryText()[status].text;
          } else {
            this.domNodes.inventoryStatus.innerHTML = "";
            this.domNodes.inventoryStatus.classList.add("m:hidden");
          }
        }

        this.handleIndicatorBar(status, count);
      } else {
        this.classList.add("m:hidden");
      }
    }

    handleIndicatorBar(status, count) {
      if (this.domNodes.indicatorBar) {
        const total = this.dataset.total;
        let width;

        if (status == "backordered" || status == "outofstock") {
          width = 0;
        } else if (status != "backordered" && (count >= total || status == "instock")) {
          width = 100;
        } else {
          width = ((count / total) * 100).toFixed(1);
          width = width < 5 ? 5 : width;
        }

        this.domNodes.indicatorBar.querySelector("span").style.width = `${width}%`;
      }
    }

    getInventoryText() {
      const { inStock, outOfStock, lowStock, inventoryQuantityHtml, inventoryLowQuantityHtml } = window.MinimogStrings;
      const show_count = this.dataset.showInventoryCount;

      return {
        normal: {
          text: inStock,
          text_html: inventoryQuantityHtml,
          message: this.dataset.normalText,
          show_count: show_count == "always" ? true : false,
        },
        instock: {
          text: inStock,
          message: this.dataset.normalText,
          show_count: false,
        },
        low: {
          text: lowStock,
          text_html: inventoryLowQuantityHtml,
          message: this.dataset.lowText,
          show_count: show_count != "never" ? true : false,
        },
        outofstock: {
          text: outOfStock,
          message: this.dataset.outofstockText,
          show_count: false,
        },
        backordered: {
          text: "",
          message: this.dataset.backorderedText,
          show_count: false,
        },
      };
    }
  }

  customElements.define("m-product-inventory", productInventory);
}
