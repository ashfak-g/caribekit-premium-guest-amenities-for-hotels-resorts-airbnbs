class GiftWrappingComponent extends HTMLElement {
	constructor() {
		super()

		this.cartDrawer = document.querySelector('m-cart-drawer')
		this.giftWrapId = this.dataset.giftWrapId;
		this.giftWrapping = this.dataset.giftWrapping;
		this.cartItemsSize = parseInt(this.getAttribute('cart-items-size'));
		this.giftWrapsInCart = parseInt(this.getAttribute('gift-wraps-in-cart'));
		this.itemsInCart = parseInt(this.getAttribute('items-in-cart'));
		this.loadingIcon = this.querySelector(".m-gift-wrapping--loading");
    this.cart = document.querySelector('m-cart-drawer');

		// When the gift-wrapping checkbox is checked or unchecked.
    this.querySelector('[name="attributes[gift-wrapping]"]').addEventListener("change", (event) => {
      event.target.checked ? this.setGiftWrapping() : this.removeGiftWrapping();
    });

		if (this.cartDrawer) return;

		// If we have nothing but gift-wrap items in the cart.
    if (this.cartItemsSize == 1 && this.giftWrapsInCart > 0) {
      this.removeGiftWrapping();
    }
    // If we don't have the right amount of gift-wrap items in the cart.
    else if (this.giftWrapsInCart > 0 & this.giftWrapsInCart != this.itemsInCart) {
      this.setGiftWrapping();
    }
    // If we have a gift-wrap item in the cart but our gift-wrapping cart attribute has not been set.
    else if (this.giftWrapsInCart > 0 && this.giftWrapping === 'false') {
      this.setGiftWrapping();
    }
    // If we have no gift-wrap item in the cart but our gift-wrapping cart attribute has been set.
    else if (this.giftWrapsInCart == 0 && this.giftWrapping === 'true') {
      this.setGiftWrapping();
    }
	}

	setGiftWrapping() {
		this.loadingIcon.classList.add("show")
		const headers = new Headers({ 'Content-Type': 'application/json', 'Accept': 'application/json' });
		const config = {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ 
				updates: {
        	[this.giftWrapId]: this.itemsInCart
      	},
				attributes: { 'gift-wrapping': true }
			})
    }
		this.updateCart(config);
	}

	removeGiftWrapping() {
		this.loadingIcon.classList.add("show")
		const headers = new Headers({ 'Content-Type': 'application/json', 'Accept': 'application/json' });
		const config = {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ 
				updates: {
        	[this.giftWrapId]: 0
      	}, 
				attributes: { 'gift-wrapping': false, 'gift-note': '' }
			})
    }
    this.updateCart(config);
	}

  updateCart(request) {
    return fetch(`${MinimogSettings.routes.cart_update_url}`, request)
      .then((response) => response.json())
      .then((response) => {
        this.loadingIcon.classList.remove("show")
        if (document.body.classList.contains('template-cart')) {
          window.location.href = MinimogSettings.routes.cart;
          return;
        }
        if (this.cartDrawer) {
          this.cart.onCartDrawerUpdate();
          this.cartDrawer.classList.toggle('m-cart--empty', response.item_count === 0);
          MinimogEvents.emit(MinimogTheme.pubSubEvents.cartUpdate, response);
        }
      }).catch((e) => {
        console.error(e);
      });
  }
}
customElements.define('m-gift-wrapping-component', GiftWrappingComponent)

class GiftNoteComponent extends HTMLElement {
	constructor() {
		super()

		this.addEventListener('change', debounce((event) => {
			const headers = new Headers({ 'Content-Type': 'application/json', 'Accept': 'application/json' });
			let request = {
				method: 'POST',
				headers: headers,
				body: JSON.stringify({ 
					attributes: { 'gift-note': event.target.value } 
				})
			}
			fetch(`${MinimogSettings.routes.cart_update_url}`, request);
		}, 300))
	}
}
customElements.define('m-gift-note-component', GiftNoteComponent)

class GiftWrappingQuantityInput extends MQuantityInput {
  constructor() {
    super();
  }

  init() {
    super.init();
    this.giftWrapping = document.querySelector('m-gift-wrapping-component');
    this.cartItemsSize = parseInt(this.getAttribute('cart-items-size'));
    this.giftWrapsInCart = parseInt(this.getAttribute('gift-wraps-in-cart'));
    this.itemsInCart = parseInt(this.getAttribute('items-in-cart'));

    // If we have nothing but gift-wrap items in the cart.
    if (this.cartItemsSize == 1 && this.giftWrapsInCart > 0) {
      
      this.giftWrapping.removeGiftWrapping();
    }
    // If we don't have the right amount of gift-wrap items in the cart.
    else if (this.giftWrapsInCart > 0 & this.giftWrapsInCart != this.itemsInCart) {
      this.update();
    }
    // If we have a gift-wrap item in the cart but our gift-wrapping cart attribute has not been set.
    else if (this.giftWrapsInCart > 0 && this.giftWrapping.length == 0) {
      this.update();
    }
    // If we have no gift-wrap item in the cart but our gift-wrapping cart attribute has been set.
    else if (this.giftWrapsInCart == 0 && this.giftWrapping.length > 0) {
      this.update();
    }
  }

  update() {
    this.input.value = this.itemsInCart;
    this.input.dispatchEvent(this.changeEvent);
  }
}
customElements.define('m-gift-wrapping-input', GiftWrappingQuantityInput)