class Product {
  constructor() {
    this.acc = [];
    this.container = document.querySelector(".m-main-product");
    MinimogTheme.CompareProduct && MinimogTheme.CompareProduct.setCompareButtonsState();
    MinimogTheme.Wishlist && MinimogTheme.Wishlist.setWishlistButtonsState();
    this.addRecentViewedProduct();

    addEventDelegate({
      context: this.container,
      selector: (window.__minimog_review_selector || '') + '.m-product-collapsible .jdgm-widget-actions-wrapper, .m-product-collapsible .spr-summary-actions-newreview',
      handler: (e) => {
      const index = e.target.closest('.m-product-collapsible').dataset.index
      setTimeout(() => {
        this.acc[Number(index)].setContentHeight()
      }, 300)},
      capture: true
    })
  }

  addRecentViewedProduct() {
    const cookies = getCookie('m-recent-viewed-products')
    let products = cookies ? JSON.parse(cookies) : []
    if (products.indexOf(MinimogSettings.productHandle) === -1) {
      products.unshift(MinimogSettings.productHandle)
      products = products.slice(0, 20)
      setCookie('m-recent-viewed-products', JSON.stringify(products));
    }
  }
}

// new Product();
