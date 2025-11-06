const { ShopConfig = {}, ShopServices = {}, ShopUtils = {} } = window;

const API_URL = ShopServices.getOnlineShopUrl ? ShopServices.getOnlineShopUrl() : "https://api.noroff.dev/api/v1/online-shop";
const productGrid = document.querySelector("[data-product-grid]");
const productsStatus = document.querySelector("[data-products-status]");
const carouselTrack = document.querySelector("[data-carousel-track]");
const carouselStatus = document.querySelector("[data-carousel-status]");
const prevButton = document.querySelector("[data-carousel-prev]");
const nextButton = document.querySelector("[data-carousel-next]");
const yearOutput = document.querySelector("[data-year]");

const CURRENCY = "USD";
const carouselState = { slides: [], index: 0 };

const {
    formatPrice = (value) => value,
    getImageUrl = () => "",
    getImageAlt = ({ title }) => title || "",
    formatTags = () => "",
    setStatus = () => {},
    setCurrentYear = (target) => {
        if (target) {
            target.textContent = new Date().getFullYear();
        }
    },
} = ShopUtils;

const fetchJson = ShopServices.fetchJson || (async (url, options) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json();
});

if (yearOutput) {
    setCurrentYear(yearOutput);
}

if (prevButton && nextButton) {
    prevButton.addEventListener("click", () => moveCarousel(-1));
    nextButton.addEventListener("click", () => moveCarousel(1));
}

init();

async function init() {
    setStatus(productsStatus, "Loading products...");
    setStatus(carouselStatus, "Loading featured products...");

    try {
        const products = await fetchProducts(12);
        if (!products.length) {
            setStatus(productsStatus, "No products available right now.");
            setStatus(carouselStatus, "No featured products to show.");
            toggleCarouselControls(true);
            return;
        }

        renderProductGrid(products);
        setupCarousel(products.slice(0, 3));
    } catch (error) {
        console.error(error);
        setStatus(productsStatus, "We could not load products. Please try again soon.");
        setStatus(carouselStatus, "Carousel is unavailable right now.");
        toggleCarouselControls(true);
    }
}

async function fetchProducts(limit) {
    const endpoints = [
        `${API_URL}?sort=created&sortOrder=desc&limit=${limit}`,
        `${API_URL}?limit=${limit}`,
        API_URL,
    ];

    let lastError;

    for (const url of endpoints) {
        try {
            const result = await fetchJson(url);
            if (Array.isArray(result) && result.length) {
                return result;
            }

            if (result && typeof result === "object" && Array.isArray(result.data) && result.data.length) {
                return result.data;
            }
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("The product list is empty.");
}

function renderProductGrid(products) {
    if (!productGrid) return;

    productGrid.innerHTML = "";
    const template = document.querySelector("#product-card-template");

    products.slice(0, 12).forEach((product) => {
        const { id, title, image, imageUrl, discountedPrice, price } = product;
        if (!template || !id) return;

        const node = template.content.cloneNode(true);
        const card = node.querySelector("[data-product-card]");
        const cardImage = node.querySelector(".product-card__image");
        const cardTitle = node.querySelector(".product-card__title");
        const cardPrice = node.querySelector("[data-card-price]");

        if (card) {
            card.href = `product.html?id=${id}`;
        }

        if (cardImage) {
            cardImage.src = getImageUrl({ image, imageUrl }) || "https://placehold.co/600x400?text=No+image";
            cardImage.alt = getImageAlt({ image, title }) || "Product image";
            cardImage.loading = "lazy";
        }

        if (cardTitle) {
            cardTitle.textContent = title || "Untitled product";
        }

        if (cardPrice) {
            cardPrice.textContent = formatPrice(discountedPrice ?? price ?? 0, CURRENCY);
        }

        productGrid.appendChild(node);
    });

    setStatus(productsStatus, "");
}

function setupCarousel(items) {
    if (!carouselTrack) return;

    carouselTrack.innerHTML = "";
    const template = document.querySelector("#carousel-slide-template");

    if (!items.length || !template) {
        setStatus(carouselStatus, "No featured products to show.");
        toggleCarouselControls(true);
        return;
    }

    items.forEach((product) => {
        const { id, title, tags, image, imageUrl, discountedPrice, price } = product;
        const node = template.content.cloneNode(true);
        const slide = node.querySelector("[data-slide]");
        const slideImage = node.querySelector(".carousel__image");
        const slideTitle = node.querySelector(".carousel__title");
        const slideTags = node.querySelector("[data-product-tags]");
        const priceNow = node.querySelector("[data-price-current]");
        const priceOriginal = node.querySelector("[data-price-original]");
        const link = node.querySelector("[data-product-link]");

        if (slideImage) {
            slideImage.src = getImageUrl({ image, imageUrl }) || "https://placehold.co/900x600?text=No+image";
            slideImage.alt = getImageAlt({ image, title }) || "Product";
        }

        if (slideTitle) {
            slideTitle.textContent = title || "Featured product";
        }

        if (slideTags) {
            slideTags.textContent = formatTags(tags);
        }

        if (priceNow) {
            const currentPrice = discountedPrice ?? price ?? 0;
            priceNow.textContent = formatPrice(currentPrice, CURRENCY);
        }

        if (priceOriginal) {
            const hasDiscount = typeof discountedPrice === "number" && typeof price === "number" && discountedPrice < price;
            priceOriginal.textContent = hasDiscount ? formatPrice(price, CURRENCY) : "";
            priceOriginal.hidden = !hasDiscount;
        }

        if (link && id) {
            link.href = `product.html?id=${id}`;
        }

        if (slide) {
            carouselTrack.appendChild(node);
        }
    });

    carouselState.slides = Array.from(carouselTrack.querySelectorAll("[data-slide]"));
    carouselState.index = 0;

    toggleCarouselControls(carouselState.slides.length <= 1);
    updateCarouselStatus();
}

function moveCarousel(step) {
    if (!carouselState.slides.length) return;
    carouselState.index = (carouselState.index + step + carouselState.slides.length) % carouselState.slides.length;
    updateCarouselStatus();
}

function updateCarouselStatus() {
    carouselState.slides.forEach((slide, index) => {
        slide.hidden = index !== carouselState.index;
    });

    const activeSlide = carouselState.slides[carouselState.index];
    const title = activeSlide?.querySelector(".carousel__title")?.textContent || "Featured product";
    const label = `${title} (${carouselState.index + 1} of ${carouselState.slides.length})`;
    setStatus(carouselStatus, label);
}

function toggleCarouselControls(disabled) {
    if (prevButton) prevButton.disabled = disabled;
    if (nextButton) nextButton.disabled = disabled;
}
