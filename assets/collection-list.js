if (!customElements.get("m-collection-list")) {
  class MCollectionList extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.selectors = {
        slideControls: ".m-slider-controls",
        slideContainer: ".m-mixed-layout__wrapper", // slideContainer
      };
      this.domNodes = queryDomNodes(this.selectors, this);

      this.enableSlider = this.dataset.enableSlider === "true";
      this.items = this.dataset.items;
      this.total = this.dataset.total;
      this.autoplay = this.dataset.autoplay === "true";
      this.autoplaySpeed = this.dataset.autoplaySpeed;
      this.paginationType = this.dataset.paginationType;
      this.expanded = this.dataset.expanded === "true";
      this.mobileDisableSlider = this.dataset.mobileDisableSlider === "true";

      this.initByScreenSize();
      document.addEventListener("matchMobile", () => {
        this.initByScreenSize();
      });
      document.addEventListener("unmatchMobile", () => {
        this.initByScreenSize();
      });
    }

    initByScreenSize() {
      if (!this.enableSlider) return;
      const { slideContainer, slideControls } = queryDomNodes(this.selectors, this);

      if (MinimogTheme.config.mqlMobile && this.mobileDisableSlider) {
        slideControls?.classList.add("m:hidden");
        slideContainer.classList.remove("swiper-container");
        if (this.swiper) this.swiper.destroy(false, true);
      } else {
        slideControls?.classList.remove("m:hidden");
        this.initSlider();
      }
    }

    initSlider() {
      const { slideContainer } = queryDomNodes(this.selectors, this);

      slideContainer?.classList.add("swiper-container");

      const paginationIcon = `<svg width="65px" height="65px" viewBox="0 0 72 72" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><circle class="time" stroke-width="5" fill="none" stroke-linecap="round" cx="33" cy="33" r="28"></circle></svg>`;
      this.slider = new MinimogLibs.Swiper(slideContainer, {
        slidesPerView: 2,
        loop: true,
        slidesPerGroup: 1,
        showNavigation: true,
        showPagination: true,
        parallax: true,
        autoplay: this.autoplay
          ? {
              delay: parseInt(this.autoplaySpeed) * 1000,
            }
          : false,
        pagination:
          this.paginationType == "fraction"
            ? {
                el: this.querySelector(".swiper-pagination"),
                clickable: true,
                type: "fraction",
              }
            : {
                el: this.querySelector(".swiper-pagination"),
                clickable: true,
                bulletClass: "m-dot",
                bulletActiveClass: "m-dot--active",
                renderBullet: function (index, className) {
                  return '<span class="' + className + '">' + paginationIcon + "</span>";
                },
              },
        autoHeight: true,
        breakpoints: {
          480: {
            slidesPerView: 3,
          },
          768: {
            slidesPerView: parseInt(this.items) >= 3 ? 3 : parseInt(this.items),
          },
          1280: {
            slidesPerView: this.expanded && this.total > this.items ? parseInt(this.items) + 1 : parseInt(this.items),
          },
        },
        on: {
          init() {
            setTimeout(() => {
              window.dispatchEvent(new Event("resize"));
            }, 100);
          },
        },
      });

      const controlsContainer = this.querySelector(".m-slider-controls");
      const prevButton = controlsContainer && controlsContainer.querySelector(".m-slider-controls__button-prev");
      const nextButton = controlsContainer && controlsContainer.querySelector(".m-slider-controls__button-next");

      if (this.slider && prevButton && nextButton) {
        prevButton && prevButton.addEventListener("click", () => this.slider.slidePrev());
        nextButton && nextButton.addEventListener("click", () => this.slider.slideNext());
      }

      this.swiper = slideContainer?.swiper;
    }
  }

  customElements.define("m-collection-list", MCollectionList);
}
