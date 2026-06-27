if (!customElements.get("media-gallery-mobile")) {
  customElements.define(
    "media-gallery-mobile",
    class MediaGalleryMobile extends HTMLElement {
      constructor() {
        super();
        this.selectors = {
          container: ".m-main-product--wrapper",
          slider: ".swiper-container",
          sliderPagination: ".swiper-pagination",
          sliderPrevEl: ".swiper-button-prev",
          sliderNextEl: ".swiper-button-next",
          navSlider: ".nav-swiper-container",
          medias: [".m-product-media--item"],
          mediaWrapper: ".m-product-media--wrapper",
          mediaZoomIns: [".m-product-media__zoom-in"],
          videos: [".media-video"],
          variantIdNode: '[name="id"]',
          featuredImage: ".m-product-media",
        };

        this.container = this.closest(this.selectors.container);
        this.domNodes = queryDomNodes(this.selectors, this);
        this.enableVideoAutoplay = this.dataset.enableVideoAutoplay === "true";
        this.enableImageZoom = this.dataset.enableImageZoom === "true";
        this.enableVariantGroupImages = this.dataset.enableVariantGroupImages === "true";
        this.onlyMedia = this.dataset.onlyMedia === "true";
        if (this.container) {
          this.view = this.container.dataset.view || "product-template";
        }
        this.section = this.closest(`[data-section-id="${this.sectionId}"]`);
        this.layout = this.dataset.layout;
      }

      connectedCallback() {
        this.setupData();
      }

      async setupData() {
        this.productHandle = this.dataset.productHandle;
        this.productUrl = this.dataset.productUrl;
        this.productData = await this.getProductJson(this.productUrl);

        const { productData, productData: { variants } = {} } = this;
        const variantIdNode = this.container.querySelector(this.selectors.variantIdNode);

        if (productData && variantIdNode) {
          let currentVariantId = Number(variantIdNode.value);
          if (!currentVariantId) {
            currentVariantId = productData.selected_or_first_available_variant.id;
          }
          const currentVariant = variants.find((v) => v.id === currentVariantId) || variants[0];
          this.productData.initialVariant = currentVariant;
          if (!this.productData.selected_variant && variantIdNode.dataset.selectedVariant) {
            this.productData.selected_variant = variants.find(
              (v) => v.id === Number(variantIdNode.dataset.selectedVariant)
            );
          }
          this.init();
        }
      }

      init() {
        const variantPicker = this.container.querySelector("variant-picker");
        this.handlePhotoswipe();
        this.initPhotoswipe();
        this.initSlider();

        // Handle autoplay video when video item order first
        this.handleAutoplayVideo();

        // Fix when variant-picker block not add, but enable variant group images
        if (!variantPicker) {
          this.initPhotoswipe();
          this.handleSlideChange();
          this.removeAttribute("data-media-loading");
          this.firstElementChild.style.opacity = 1;
        }
      }

      initSlider() {
        if (!this.domNodes.slider) return;
        this.mediaMode = "slider";
        const {
          domNodes: { slider, sliderPagination, navSlider, sliderNextEl: nextEl, sliderPrevEl: prevEl },
        } = this;
        let initialSlide = 0,
          configNav = {},
          config = {};

        if (
          this.productData.initialVariant &&
          this.productData.selected_variant &&
          this.productData.initialVariant.featured_media
        ) {
          initialSlide = this.productData.initialVariant.featured_media.position - 1 || 0;
        }

        configNav = {
          loop: false,
          initialSlide,
          slidesPerView: 5,
          freeMode: true,
          spaceBetween: 10,
          threshold: 2,
          watchSlidesVisibility: true,
          watchSlidesProgress: true,
          on: {
            init: () => (navSlider.style.opacity = 1),
          },
        };

        this.navSlider = navSlider ? new MinimogLibs.Swiper(navSlider, configNav) : null;
        const thumbs = this.navSlider ? { thumbs: { swiper: this.navSlider } } : {};

        config = {
          initialSlide,
          autoHeight: true,
          navigation: { nextEl, prevEl },
          threshold: 2,
          loop: this.enableVariantGroupImages ? false : true,
          pagination: { el: sliderPagination, clickable: true, type: "bullets" },
          ...thumbs,
          on: {
            init: () => {
              slider.style.opacity = 1;
              this.domNodes = queryDomNodes(this.selectors, this.container);
            },
          },
        };

        this.slider = new MinimogLibs.Swiper(slider, config);

        if (!this.enableVariantGroupImages) this.handleSlideChange();
      }

      handleSlideChange() {
        if (!this.slider) return;
        let draggable = true,
          mediaType = "",
          visibleSlides = [];

        this.slider.on("slideChange", (swiper) => {
          window.pauseAllMedia(this);
          try {
            const { slides, activeIndex } = swiper;
            if (slides[activeIndex]) this.playActiveMedia(slides[activeIndex]);

            visibleSlides = [activeIndex];

            for (let index of visibleSlides) {
              const currSlide = slides[index];
              if (currSlide) {
                mediaType = currSlide.dataset.mediaType;
              }
              if (mediaType === "model") break;
            }

            // Change touchMove state, for making the model inside slide draggable
            if (mediaType === "model") {
              this.slider.allowTouchMove = false;
              draggable = false;
            } else {
              if (!draggable) this.slider.allowTouchMove = true;
              draggable = true;
            }
          } catch (error) {
            console.error("Failed to execute slideChange event.", error);
          }
        });
      }

      handleAutoplayVideo() {
        if (this.slider) {
          const { slides, activeIndex } = this.slider;
          const slideActive = slides[activeIndex];
          const firstElmMediaType = slideActive && slideActive.dataset.mediaType;

          if (firstElmMediaType === "video" || firstElmMediaType == "external_video") {
            const deferredMedia = slideActive.querySelector("deferred-media");
            const autoplay = deferredMedia.dataset.autoPlay === "true";
            if (deferredMedia && autoplay) deferredMedia.loadContent(false);
          }
        } else {
          const allMedia = this.querySelectorAll(".m-product-media--item");
          if (allMedia) {
            allMedia.forEach((media) => {
              const mediaType = media.dataset.mediaType;
              if (mediaType === "video" || mediaType === "external_video") {
                const deferredMedia = media.querySelector("deferred-media");
                const autoplay = deferredMedia.dataset.autoPlay === "true";
                if (deferredMedia && autoplay) deferredMedia.loadContent(false);
              }
            });
          }
        }
      }

      playActiveMedia(selected) {
        const deferredMedia = selected.querySelector("deferred-media");
        if (!deferredMedia) return;
        const autoplay = deferredMedia.dataset.autoPlay === "true";
        if (!autoplay) return;
        if (!deferredMedia.getAttribute("loaded")) {
          deferredMedia.loadContent(false);
          const deferredElement = deferredMedia.querySelector("video, model-viewer, iframe");
          if (deferredElement.classList.contains("js-youtube")) {
            const symbol = deferredElement.src.indexOf("?") > -1 ? "&" : "?";
            deferredElement.src += symbol + "autoplay=1&mute=1";
          } else if (deferredElement.classList.contains("js-vimeo")) {
            const symbol = deferredElement.src.indexOf("?") > -1 ? "&" : "?";
            deferredElement.src += symbol + "autoplay=1&muted=1";
          } else {
            deferredElement.play();
          }
        } else {
          const deferredElement = deferredMedia.querySelector("video, model-viewer, iframe");
          if (deferredElement.classList.contains("js-youtube")) {
            const symbol = deferredElement.src.indexOf("?") > -1 ? "&" : "?";
            deferredElement.src += symbol + "autoplay=1&mute=1";
          } else if (deferredElement.classList.contains("js-vimeo")) {
            const symbol = deferredElement.src.indexOf("?") > -1 ? "&" : "?";
            deferredElement.src += symbol + "autoplay=1&muted=1";
          } else {
            deferredElement.play();
          }
        }
      }

      handlePhotoswipe(customData = []) {
        if (!this.enableImageZoom) return;
        const data = [];
        const medias = this.querySelectorAll(".m-product-media--item:not(.swiper-slide-duplicate)");

        if (medias) {
          medias.forEach((media, index) => {
            if (media.dataset.mediaType === "image") {
              const mediaDataItem = media.querySelector(".m-product-media");
              const mediaData = mediaDataItem.dataset;
              data.push({
                src: mediaData.mediaSrc,
                width: parseInt(mediaData.mediaWidth),
                height: parseInt(mediaData.mediaHeight),
                alt: mediaData.mediaAlt,
                id: media.dataset.index,
              });
            } else {
              data.push({
                html: `<div class="pswp__${media.dataset.mediaType}">${media.innerHTML}</div>`,
                type: media.dataset.mediaType,
                id: media.dataset.index,
              });
            }
          });
        }

        this.lightbox = new MinimogLibs.PhotoSwipeLightbox({
          dataSource: customData.length > 0 ? customData : data,
          bgOpacity: 1,
          close: false,
          zoom: false,
          arrowNext: false,
          arrowPrev: false,
          counter: false,
          preloader: false,
          pswpModule: MinimogLibs.PhotoSwipeLightbox.PhotoSwipe,
        });

        this.lightbox.addFilter("thumbEl", (thumbEl, data, index) => {
          const el = this.querySelector('[data-index="' + data.id + '"]:not(.swiper-slide-duplicate) img');
          if (el) {
            return el;
          }
          return thumbEl;
        });

        this.lightbox.addFilter("placeholderSrc", (placeholderSrc, slide) => {
          const el = this.querySelector('[data-index="' + slide.data.id + '"]:not(.swiper-slide-duplicate) img');
          if (el) {
            return el.src;
          }
          return placeholderSrc;
        });

        this.lightbox.on("change", () => {
          window.pauseAllMedia(this);
          if (this.slider) {
            const currIndex = this.lightbox.pswp.currIndex;
            if (this.enableVariantGroupImages) {
              this.slider.slideTo(currIndex, 100, false);
            } else {
              this.slider.slideToLoop(currIndex, 100, false);
            }
          }
        });

        this.lightbox.on("pointerDown", (e) => {
          const currSlide = this.lightbox.pswp.currSlide.data;
          if (currSlide.type === "model") {
            e.preventDefault();
          }
        });

        // Adding UI elements
        const closeBtn = {
          name: "m-close",
          order: 11,
          isButton: true,
          html: '<svg class="m-svg-icon--large" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
          onClick: (event, el, pswp) => {
            pswp.close();
          },
        };
        const arrowNext = {
          name: "m-arrowNext",
          className: "sf-pswp-button--arrow-next",
          order: 12,
          isButton: true,
          html: '<svg fill="currentColor" width="14px" height="14px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M218.101 38.101L198.302 57.9c-4.686 4.686-4.686 12.284 0 16.971L353.432 230H12c-6.627 0-12 5.373-12 12v28c0 6.627 5.373 12 12 12h341.432l-155.13 155.13c-4.686 4.686-4.686 12.284 0 16.971l19.799 19.799c4.686 4.686 12.284 4.686 16.971 0l209.414-209.414c4.686-4.686 4.686-12.284 0-16.971L235.071 38.101c-4.686-4.687-12.284-4.687-16.97 0z"></path></svg>',
          onClick: (event, el, pswp) => {
            pswp.next();
          },
        };
        const arrowPrev = {
          name: "m-arrowPrev",
          className: "sf-pswp-button--arrow-prev",
          order: 10,
          isButton: true,
          html: '<svg width="14px" height="14px" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M229.9 473.899l19.799-19.799c4.686-4.686 4.686-12.284 0-16.971L94.569 282H436c6.627 0 12-5.373 12-12v-28c0-6.627-5.373-12-12-12H94.569l155.13-155.13c4.686-4.686 4.686-12.284 0-16.971L229.9 38.101c-4.686-4.686-12.284-4.686-16.971 0L3.515 247.515c-4.686 4.686-4.686 12.284 0 16.971L212.929 473.9c4.686 4.686 12.284 4.686 16.971-.001z"></path></svg>',
          onClick: (event, el, pswp) => {
            pswp.prev();
          },
        };

        this.lightbox.on("uiRegister", () => {
          this.lightbox.pswp.ui.registerElement(closeBtn);
          if (!this.onlyMedia) {
            this.lightbox.pswp.ui.registerElement(arrowPrev);
            this.lightbox.pswp.ui.registerElement(arrowNext);
          }
        });
      }

      initPhotoswipe() {
        if (!this.enableImageZoom) return;
        this.lightbox.init();
        addEventDelegate({
          selector: this.selectors.medias[0],
          context: this,
          handler: (e, media) => {
            e.preventDefault();
            const isImage = media.classList.contains("media-type-image");
            const isZoomButton = e.target.closest(this.selectors.mediaZoomIns[0]);
            if (isImage || isZoomButton) {
              const index = Number(media.dataset.index) || 0;
              this.lightbox.loadAndOpen(index);
            }
          },
        });
      }

      setActiveMedia(variant) {
        if (!variant) return;
        if (variant.featured_media) {
          const slideIndex = variant.featured_media.position || 0;
          if (this.slider && this.slider.wrapperEl) {
            this.slider.slideToLoop(slideIndex - 1);
          }
        }
      }

      scrollIntoView(selectedMedia) {
        selectedMedia.scrollIntoView({
          behavior: "smooth",
        });
      }

      getProductJson(productUrl) {
        return fetch(productUrl + ".js")
          .then((response) => {
            if (!response.ok) {
              const productData = JSON.parse(
                this.container.querySelector("#productData[type='application/json']").textContent
              );
              return productData;
            } else {
              return response.json();
            }
          })
          .catch((err) => console.log(err));
      }
    }
  );
}
