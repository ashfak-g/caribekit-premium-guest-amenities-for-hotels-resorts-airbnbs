if (!customElements.get("media-gallery")) {
  customElements.define(
    "media-gallery",
    class MediaGallery extends HTMLElement {
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

        this.productSlideCommonConfigs = {
          loop: true,
        };

        this.productSlideConfigs = {
          mobile: {
            autoHeight: true,
            loop: true,
          },
          "quick-view": {
            autoHeight: true,
          },
          "layout-5": {
            ...this.productSlideCommonConfigs,
            slidesPerView: 1,
            slidesPerGroup: 1,
            watchSlidesProgress: true,
            watchSlidesVisibility: true,
            breakpoints: {
              768: {
                slidesPerView: 2,
                slidesPerGroup: 1,
                spaceBetween: 10,
              },
            },
          },
          "layout-7": {
            ...this.productSlideCommonConfigs,
            slidesPerView: 3,
            speed: 500,
            centeredSlides: true,
          },
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
        this.fetchProductData();
      }

      getProductSliderConfig(layout) {
        const conf = this.productSlideConfigs[layout] || this.productSlideConfigs["layout-4"];
        return { ...this.productSlideCommonConfigs, ...conf };
      }

      async fetchProductData() {
        try {
          const product = await this.getProductJson(); // Wait for the promise to resolve
          if (product) {
            this.productData = product;
            this.setupData();
          }
        } catch (error) {
          console.error("Error fetching product:", error);
        }
      }

      setupData() {
        // Assign dataset properties directly
        this.productHandle = this.dataset.productHandle;
        this.productUrl = this.dataset.productUrl;
        // Destructure for easier access
        const { variants } = this.productData || {};

        // Early return if productData or variants are not available
        if (!this.productData || !variants) return;

        const variantIdNode = this.container.querySelector(this.selectors.variantIdNode);
        // Early return if variantIdNode is not found
        if (!variantIdNode) return;

        // Determine currentVariantId either from the input or the first available variant
        let currentVariantId = Number(variantIdNode.value) || this.productData.selected_or_first_available_variant.id;
        // Find the current variant in the list of variants
        const currentVariant = variants.find((v) => v.id === currentVariantId) || variants[0];
        // Assign the found variant as the initialVariant
        this.productData.initialVariant = currentVariant;

        // Check for a selected variant in the dataset and assign if not already set
        if (!this.productData.selected_variant && variantIdNode.dataset.selectedVariant) {
          const selectedVariantId = Number(variantIdNode.dataset.selectedVariant);
          this.productData.selected_variant = variants.find((v) => v.id === selectedVariantId);
        }

        // Initialize further setup
        this.init();
      }

      init() {
        const variantPicker = this.container.querySelector("variant-picker");

        // Common actions for all cases
        const commonInit = () => {
          this.handleAutoplayVideo();
          if (!variantPicker) {
            this.initPhotoswipe();
            this.handleSlideChange();
            this.removeAttribute("data-media-loading");
            this.firstElementChild.style.opacity = 1;
          }
        };

        // Set media mode and initialize components based on the view
        switch (this.view) {
          case "product-template":
            this.mediaMode = "grid-column";
            this.handlePhotoswipe();
            this.initPhotoswipe();
            this.initSlider();
            break;
          case "featured-product":
            this.initSlider();
            break;
          case "card":
          case "sticky-atc":
          case "quick-view":
            this.mediaMode = "featured-image";
            if (this.view === "quick-view") {
              this.initSlider();
            }
            break;
          default:
            console.warn("Unknown product view: ", this, this.view);
        }

        commonInit();
      }

      initSlider() {
        if (!this.domNodes.slider) return;

        this.mediaMode = "slider";
        const { slider, sliderPagination, navSlider, sliderNextEl: nextEl, sliderPrevEl: prevEl } = this.domNodes;

        // Determine the initial slide based on the product's initial variant
        const initialSlide =
          (this.productData.initialVariant &&
            this.productData.initialVariant.featured_media &&
            this.productData.initialVariant.featured_media.position - 1) ||
          0;

        // Configure navigation slider
        const configNav = this.getNavSliderConfig(initialSlide);

        // Initialize navigation slider if navSlider exists
        this.navSlider = navSlider ? new MinimogLibs.Swiper(navSlider, configNav) : null;

        // Main slider configuration
        const config = this.getMainSliderConfig(initialSlide, {
          nextEl,
          prevEl,
          sliderPagination,
        });

        // Initialize the main slider
        this.slider = new MinimogLibs.Swiper(slider, config);

        // Handle slide change for variant group images
        if (!this.enableVariantGroupImages) this.handleSlideChange();
      }

      getNavSliderConfig(initialSlide) {
        return {
          loop: false,
          initialSlide,
          slidesPerView: 5,
          freeMode: true,
          spaceBetween: this.layout === "layout-6" ? 5 : 10,
          threshold: 2,
          watchSlidesVisibility: true,
          watchSlidesProgress: true,
          breakpoints: {
            1024: {
              direction: this.layout === "layout-6" ? "vertical" : "horizontal",
            },
          },
          on: {
            init: () => (this.domNodes.navSlider.style.opacity = 1),
          },
        };
      }

      getMainSliderConfig(initialSlide, { nextEl, prevEl, sliderPagination }) {
        const thumbsConfig = this.navSlider ? { thumbs: { swiper: this.navSlider } } : {};
        return {
          ...this.getProductSliderConfig(this.layout),
          initialSlide,
          autoHeight: true,
          navigation: { nextEl, prevEl },
          threshold: 2,
          loop: !this.enableVariantGroupImages,
          pagination: {
            el: sliderPagination,
            clickable: true,
            type: "bullets",
          },
          ...thumbsConfig,
          on: {
            init: () => {
              this.domNodes.slider.style.opacity = 1;
              this.domNodes = queryDomNodes(this.selectors, this.container);
              requestAnimationFrame(() => {
                window.dispatchEvent(new Event("resize"));
              });
            },
          },
        };
      }

      handleSlideChange() {
        if (!this.slider) return;

        this.slider.on("slideChange", (swiper) => {
          window.pauseAllMedia(this);

          const { slides, activeIndex } = swiper;
          const activeSlide = slides[activeIndex];
          if (activeSlide) this.playActiveMedia(activeSlide);

          // Determine visible slides based on layout
          const visibleSlides = [activeIndex];
          if (["layout-5", "layout-7"].includes(this.layout)) {
            visibleSlides.push(activeIndex + 1);
          }

          // Check if any of the visible slides have a model media type
          const hasModelMediaType = visibleSlides.some((index) => {
            const slide = slides[index];
            return slide && slide.dataset.mediaType === "model";
          });

          // Toggle slider's draggable state based on media type
          this.toggleSliderDraggableState(!hasModelMediaType);
        });
      }

      toggleSliderDraggableState(isDraggable) {
        if (this.slider.allowTouchMove !== isDraggable) {
          this.slider.allowTouchMove = isDraggable;
        }
      }

      handleAutoplayVideo() {
        const playVideo = (mediaElement) => {
          const mediaType = mediaElement.dataset.mediaType;
          if (mediaType === "video" || mediaType === "external_video") {
            const deferredMedia = mediaElement.querySelector("deferred-media");
            const autoplay = deferredMedia && deferredMedia.dataset.autoPlay === "true";
            if (autoplay) deferredMedia.loadContent(false);
          }
        };

        if (this.mediaMode === "slider") {
          const { slides, activeIndex } = this.slider;
          const activeSlide = slides[activeIndex];
          if (activeSlide) playVideo(activeSlide);
        } else {
          const allMedia = this.querySelectorAll(".m-product-media--item");
          allMedia.forEach(playVideo);
        }
      }

      playActiveMedia(selected) {
        const deferredMedia = selected.querySelector("deferred-media");
        if (!deferredMedia || deferredMedia.dataset.autoPlay !== "true") return;

        const playMedia = (element) => {
          if (element.classList.contains("js-youtube") || element.classList.contains("js-vimeo")) {
            const platform = element.classList.contains("js-youtube") ? "youtube" : "vimeo";
            const param = platform === "youtube" ? "mute=1" : "muted=1";
            const symbol = element.src.includes("?") ? "&" : "?";
            element.src += `${symbol}autoplay=1&${param}`;
          } else {
            element.play();
          }
        };

        if (!deferredMedia.hasAttribute("loaded")) {
          deferredMedia.loadContent(false);
        }

        const deferredElement = deferredMedia.querySelector("video, model-viewer, iframe");
        playMedia(deferredElement);
      }

      handlePhotoswipe(customData = []) {
        if (!this.enableImageZoom) return;

        const medias = [...this.querySelectorAll(".m-product-media--item:not(.swiper-slide-duplicate)")];

        const data = medias.map((media) => {
          const { mediaType, index: id } = media.dataset;

          if (mediaType === "image") {
            const {
              mediaSrc: src,
              mediaWidth,
              mediaHeight,
              mediaAlt: alt,
            } = media.querySelector(".m-product-media").dataset;
            return {
              src,
              width: parseInt(mediaWidth),
              height: parseInt(mediaHeight),
              alt,
              id,
            };
          } else {
            return {
              html: `<div class="pswp__${mediaType}">${media.innerHTML}</div>`,
              type: mediaType,
              id,
            };
          }
        });

        const options = {
          dataSource: customData.length ? customData : data,
          bgOpacity: 1,
          close: false,
          zoom: false,
          arrowNext: false,
          arrowPrev: false,
          counter: false,
          preloader: false,
          pswpModule: MinimogLibs.PhotoSwipeLightbox.PhotoSwipe,
        };
        this.lightbox = new MinimogLibs.PhotoSwipeLightbox(options);

        this.lightbox.addFilter("thumbEl", (thumbEl, { id }, index) => {
          return this.querySelector(`[data-index="${id}"]:not(.swiper-slide-duplicate) img`) || thumbEl;
        });

        this.lightbox.addFilter("placeholderSrc", (placeholderSrc, { data: { id } }) => {
          const el = this.querySelector(`[data-index="${id}"]:not(.swiper-slide-duplicate) img`);
          return el ? el.src : placeholderSrc;
        });

        this.lightbox.on("change", () => {
          window.pauseAllMedia(this);
          if (this.slider) {
            const { currIndex } = this.lightbox.pswp;
            const slideMethod = this.enableVariantGroupImages ? "slideTo" : "slideToLoop";
            this.slider[slideMethod](currIndex, 100, false);
          }
        });

        this.lightbox.on("pointerDown", (e) => {
          if (this.lightbox.pswp.currSlide.data.type === "model") {
            e.preventDefault();
          }
        });

        // UI elements
        const uiElements = [
          {
            name: "m-close",
            order: 11,
            isButton: true,
            html: '<svg class="m-svg-icon--large" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
            onClick: (event, el, pswp) => pswp.close(),
          },
          {
            name: "m-arrowNext",
            order: 12,
            isButton: true,
            html: '<svg fill="currentColor" width="14px" height="14px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M218.101 38.101L198.302 57.9c-4.686 4.686-4.686 12.284 0 16.971L353.432 230H12c-6.627 0-12 5.373-12 12v28c0 6.627 5.373 12 12 12h341.432l-155.13 155.13c-4.686 4.686-4.686 12.284 0 16.971l19.799 19.799c4.686 4.686 12.284 4.686 16.971 0l209.414-209.414c4.686-4.686 4.686-12.284 0-16.971L235.071 38.101c-4.686-4.687-12.284-4.687-16.97 0z"></path></svg>',
            onClick: (event, el, pswp) => pswp.next(),
          },
          {
            name: "m-arrowPrev",
            order: 10,
            isButton: true,
            html: '<svg width="14px" height="14px" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M229.9 473.899l19.799-19.799c4.686-4.686 4.686-12.284 0-16.971L94.569 282H436c6.627 0 12-5.373 12-12v-28c0-6.627-5.373-12-12-12H94.569l155.13-155.13c4.686-4.686 4.686-12.284 0-16.971L229.9 38.101c-4.686-4.686-12.284-4.686-16.971 0L3.515 247.515c-4.686 4.686-4.686 12.284 0 16.971L212.929 473.9c4.686 4.686 12.284 4.686 16.971-.001z"></path></svg>',
            onClick: (event, el, pswp) => pswp.prev(),
          },
        ];

        this.lightbox.on("uiRegister", () => {
          this.lightbox.pswp.ui.registerElement(uiElements[0]);
          if (!this.onlyMedia) {
            uiElements.slice(1).forEach((element) => this.lightbox.pswp.ui.registerElement(element));
          }
        });
      }

      initPhotoswipe() {
        if (!this.enableImageZoom) return;

        this.lightbox.init();

        const handleMediaClick = (e, media) => {
          e.preventDefault();
          const isImage = media.classList.contains("media-type-image");
          const isZoomButton = e.target.closest(this.selectors.mediaZoomIns[0]);

          if (isImage || isZoomButton) {
            const index = Number(media.dataset.index) || 0;
            this.lightbox.loadAndOpen(index);
          }
        };

        addEventDelegate({
          selector: this.selectors.medias[0],
          context: this,
          handler: handleMediaClick,
        });
      }

      setActiveMedia(variant) {
        if (!variant) return;

        switch (this.mediaMode) {
          case "slider":
            this.setActiveMediaForSlider(variant);
            break;
          case "featured-image":
            this.setActiveMediaForFeaturedImage(variant);
            break;
          default:
            this.handleGalleryMode(variant);
        }
      }

      setActiveMediaForSlider(variant) {
        if (variant.featured_media && this.slider && this.slider.wrapperEl) {
          const slideIndex = variant.featured_media.position || 0;
          this.slider.slideToLoop(slideIndex - 1);
        }
      }

      setActiveMediaForFeaturedImage(variant) {
        if (variant.featured_image) {
          const src = variant.featured_image.src;
          const { featuredImage } = this.domNodes;
          const img = featuredImage.querySelector("img");
          if (img && src) img.src = src;
        }
      }

      handleGalleryMode(variant) {
        if (this.view !== "featured-product" && variant && variant.featured_media) {
          const selectedMedia = this.querySelector(`[data-media-id="${variant.featured_media.id}"]`);
          if (selectedMedia) {
            this.scrollIntoView(selectedMedia);
          }
        }
      }

      scrollIntoView(selectedMedia) {
        selectedMedia.scrollIntoView({
          behavior: "smooth",
        });
      }

      getProductJson() {
        return fetch(window.Shopify.routes.root + `products/${this.dataset.productHandle}.js`)
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.json();
          })
          .then((product) => {
            return product;
          })
          .catch((error) => {
            console.error("There has been a problem with your fetch operation:", error);
          });
      }
    }
  );
}
