const { MinimogThemeStyles, MinimogThemeScripts } = window;
class QuickView {
  constructor() {
    this.modal = new MinimogTheme.Modal();
		this.isOpen = false

    addEventDelegate({
      selector: ".m-product-quickview-button",
      handler: (e, target) => {
        e.preventDefault();
        this.target = target;
        this.toggleLoading(this.target, true);
        const productHandle = target.dataset.productHandle;
        if (productHandle) this.fetchHtml(productHandle);
      },
    });

    window.MinimogEvents.subscribe(MinimogTheme.pubSubEvents.cartUpdate, () => {
      if (this.modal) MinimogTheme.ProductQuickView.close()
    });
  }

  fetchHtml(productHandle) {
    loadAssetsNew([MinimogThemeStyles.product, MinimogThemeStyles.productInventory], "quick-view-assets");
    fetchSection("product-quickview", { url: `${window.MinimogSettings.base_url}products/${productHandle}` })
      .then((html) => {
        this.modalContent = html.querySelector(".m-product-quickview");
        const firstModel = html.querySelector("product-model");
        this.mediaGallery = this.modalContent.querySelector("media-gallery");
        loadAssetsNew([MinimogThemeScripts.productMedia, MinimogThemeScripts.variantsPicker, MinimogThemeScripts.productInventory], "variants-picker", () => {
          const colorScheme = this.modalContent.dataset.colorScheme;
          this.modal.appendChild(this.modalContent);
          this.modal.setWidth("960px");
          this.modal.open();
          this.modal.setSizes(`m-gradient ${colorScheme}`);
					this.toggleLoading(this.target, false)
					this.isOpen = true
        });
        if (firstModel) {
          loadAssetsNew(
            [
              MinimogThemeScripts.productModel,
              "https://cdn.shopify.com/shopifycloud/model-viewer-ui/assets/v1.0/model-viewer-ui.css",
            ],
            "product-model-assets"
          );
        }
      })
      .catch(console.error);
  }

  close(e) {
    this.modal.close(e)
    this.isOpen = false
  }

  toggleLoading(target, loading) {
    if (loading) {
      target.classList.add("m-spinner-loading");
    } else {
      target.classList.remove("m-spinner-loading");
    }
  }
}

MinimogTheme.ProductQuickView = new QuickView();
