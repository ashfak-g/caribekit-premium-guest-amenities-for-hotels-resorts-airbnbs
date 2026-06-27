class MScalingLogo extends HTMLElement {
  constructor() {
    super();
    this.logo = this.querySelector(".m-scaling-logo__logo");
    this.logoWrapper = this.querySelector(".m-scaling-logo__logo-wrapper");
    this.content = this.querySelector(".m-scaling-logo__content");
    this.headerDesktop = document.querySelector(".m-header__desktop");
    this.headerMobile = document.querySelector(".m-header__mobile");
    this.headerWrapper = document.querySelector(".m-header__wrapper");
    this.header = document.querySelector(".m-header");
    this.headerStyle = this.header && this.header.dataset.sticky;

    this.init();
    window.addEventListener("resize", () => {
      this.init();
    });
  }

  init() {
    this.logoWidth = window.getComputedStyle(this.logoWrapper).width.replace(/\D/g, "");
    this.scale = window.innerWidth / this.logoWidth;
    if (window.innerWidth > 768) {
      if (this.scale > 14) {
        this.scale = 14;
      }
    } else {
      this.scale = window.innerWidth / this.logoWidth;
    }

    if (window.innerWidth > 768) {
      this.logo.style.transform = "scale(" + (this.scale - 3) + ")";
    } else {
      this.logo.style.transform = "scale(" + (this.scale - 1) + ")";
    }

    if (this.headerStyle !== "none") {
      this.headerDesktop.classList.add("m:fade-out");
      this.headerMobile.classList.add("m:fade-out");
    } else {
      this.classList.add("m-scaling-logo--sticky-none");
    }

    window.addEventListener("scroll", () => {
      window.requestAnimationFrame(() => this.scrollAnimation());
    });
  }

  scrollAnimation() {
    this.scroll = window.pageYOffset;
    this.winH = window.innerHeight - document.querySelector("m-header").offsetHeight - 1;
    if (window.innerWidth > 768) {
      this.percent = 1 + (this.scale - 1 - this.scale * (this.scroll / this.winH)) - 3;
    } else {
      this.percent = 1 + (this.scale - 1 - this.scale * (this.scroll / this.winH) - 1);
    }

    if (this.percent < 1) {
      this.percent = 1;
    }

    this.logo.style.transform = "scale(" + this.percent + ")";

    if (this.scroll > this.winH / 2) {
      this.content.classList.add("m:fade-out");
    } else {
      this.content.classList.remove("m:fade-out");
    }

    if (this.percent == 1) {
      this.headerWrapper.classList.remove("m-unset-shadow");
      this.logo.classList.add("m:hidden");
      if (this.headerStyle !== "none") {
        this.headerDesktop.classList.remove("m:fade-out");
        this.headerMobile.classList.remove("m:fade-out");
      }
    } else {
      this.headerWrapper.classList.add("m-unset-shadow");
      this.logo.classList.remove("m:hidden");
      if (this.headerStyle !== "none") {
        this.headerDesktop.classList.add("m:fade-out");
        this.headerMobile.classList.add("m:fade-out");
      }
    }
  }
}

customElements.define("m-scaling-logo", MScalingLogo);
