const API_URL = "https://api.noroff.dev/api/v1/online-shop";
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const statusNode = document.querySelector("[data-product-status]");
const productView = document.querySelector("[data-product-view]");
const titleNode = document.querySelector("[data-product-title]");
const descriptionNode = document.querySelector("[data-product-description]");
const tagsNode = document.querySelector("[data-product-tags]");
const priceNode = document.querySelector("[data-product-price]");
const originalPriceNode = document.querySelector("[data-product-price-original]");
const imageNode = document.querySelector("[data-product-image]");
const addToCartButton = document.querySelector("[data-add-to-cart]");
const yearNode = document.querySelector("[data-year]");

const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });

if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
}

if (addToCartButton) {
    addToCartButton.addEventListener("click", () => {
        alert("The cart will be available soon. Thanks for testing the button!");
    });
}

if (!productId) {
    setStatus("We could not find a product. Please return to the home page and try again.");
} else {
    loadProduct(productId);
}

async function loadProduct(id) {
    setStatus("Loading product details...");

    try {
        const product = await fetchProduct(id);
        if (!product) {
            setStatus("This product is not available right now.");
            return;
        }

        renderProduct(product);
        setStatus("");
    } catch (error) {
        console.error(error);
        setStatus("We could not load this product. Please try again later.");
    }
}

async function fetchProduct(id) {
    const response = await fetch(`${API_URL}/${id}`);

    if (!response.ok) {
        throw new Error(`Failed to load product: ${response.status}`);
    }

    const result = await response.json();
    if (result && typeof result === "object") {
        if (result.data && typeof result.data === "object") {
            return result.data;
        }

        return result;
    }

    throw new Error("Unexpected response shape");
}

function renderProduct(product) {
    if (!productView) {
        return;
    }

    const { title, description, tags, price, discountedPrice, image, imageUrl } = product;

    productView.hidden = false;

    if (titleNode) {
        titleNode.textContent = title || "Product";
    }

    if (descriptionNode) {
        descriptionNode.textContent = description || "We are collecting more details about this product.";
    }

    if (tagsNode) {
        tagsNode.textContent = formatTags(tags);
    }

    const currentPrice = typeof discountedPrice === "number" ? discountedPrice : price;
    if (priceNode) {
        priceNode.textContent = formatPrice(currentPrice);
    }

    const showOriginal = typeof discountedPrice === "number" && typeof price === "number" && discountedPrice < price;
    if (originalPriceNode) {
        originalPriceNode.textContent = showOriginal ? formatPrice(price) : "";
        originalPriceNode.hidden = !showOriginal;
    }

    if (imageNode) {
        imageNode.src = getImageUrl({ image, imageUrl }) || "https://placehold.co/600x400?text=No+image";
        imageNode.alt = getImageAlt({ image, title });
    }
}

function setStatus(message) {
    if (statusNode) {
        statusNode.textContent = message;
    }
}

function formatPrice(value) {
    if (Number.isFinite(value)) {
        return currency.format(value);
    }

    return currency.format(0);
}

function formatTags(tags) {
    if (!Array.isArray(tags) || !tags.length) {
        return "New arrival";
    }

    return tags.slice(0, 3).map((tag) => `#${tag}`).join(" · ");
}

function getImageUrl({ image, imageUrl }) {
    if (typeof imageUrl === "string" && imageUrl.trim()) {
        return imageUrl;
    }

    if (typeof image === "string" && image.trim()) {
        return image;
    }

    if (image && typeof image === "object" && typeof image.url === "string") {
        return image.url;
    }

    return "";
}

function getImageAlt({ image, title }) {
    if (image && typeof image === "object" && typeof image.alt === "string" && image.alt.trim()) {
        return image.alt;
    }

    return title || "Product image";
}
