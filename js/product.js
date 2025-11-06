const { ShopServices = {}, ShopUtils = {}, ShopCart = {}, ShopConfig = {} } = window;

const API_URL = ShopServices.getOnlineShopUrl ? ShopServices.getOnlineShopUrl() : "https://api.noroff.dev/api/v1/online-shop";
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
const ratingContainer = document.querySelector("[data-product-rating]");
const ratingValueNode = document.querySelector("[data-product-rating-value]");
const ratingCountNode = document.querySelector("[data-product-rating-count]");
const reviewsSection = document.querySelector("[data-product-reviews]");
const reviewSummaryNode = document.querySelector("[data-product-review-summary]");
const reviewEmptyNode = document.querySelector("[data-product-review-empty]");
const reviewListNode = document.querySelector("[data-product-review-list]");
const addToCartButton = document.querySelector("[data-add-to-cart]");
const shareButton = document.querySelector("[data-product-share]");
const shareStatusNode = document.querySelector("[data-product-share-status]");
const actionsContainer = document.querySelector("[data-product-actions]");
const proceedToCartLink = document.querySelector("[data-proceed-to-cart]");
const authNoteNode = document.querySelector("[data-product-auth-note]");
const cartNoteNode = document.querySelector("[data-product-cart-note]");
const yearNode = document.querySelector("[data-year]");

const CURRENCY = "USD";
const TOKEN_STORAGE_KEY = ShopConfig.storageKeys?.token || "theShopToken";
let currentProduct = null;
let statusResetTimer = null;
let shareStatusResetTimer = null;
let currentShareUrl = "";

const {
    formatPrice = (value) => value,
    formatTags = () => "",
    getImageUrl = () => "",
    getImageAlt = ({ title }) => title || "Product image",
    setStatus: setStatusMessage = () => {},
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

if (yearNode) {
    setCurrentYear(yearNode);
}

if (addToCartButton) {
    addToCartButton.addEventListener("click", handleAddToCart);
}

if (shareButton) {
    shareButton.disabled = true;
    shareButton.addEventListener("click", handleShareClick);
}

toggleOwnerActions(isOwnerAuthenticated());
window.addEventListener("storage", handleAuthStorageChange);

if (!productId) {
    updateStatus("We could not find a product. Please return to the home page and try again.");
} else {
    loadProduct(productId);
}

async function loadProduct(id) {
    updateStatus("Loading product details...");

    try {
        const product = await fetchProduct(id);
        if (!product) {
            updateStatus("This product is not available right now.");
            return;
        }

        renderProduct(product);
        updateStatus("");
    } catch (error) {
        console.error(error);
        updateStatus("We could not load this product. Please try again later.");
    }
}

async function fetchProduct(id) {
    const endpoint = ShopServices.getOnlineShopUrl ? ShopServices.getOnlineShopUrl(id) : `${API_URL}/${id}`;
    const result = await fetchJson(endpoint);

    if (result && typeof result === "object" && !Array.isArray(result)) {
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
    currentProduct = { ...product };
    prepareShare(product);
    toggleOwnerActions(isOwnerAuthenticated());

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
        priceNode.textContent = formatPrice(currentPrice, CURRENCY);
    }

    const showOriginal = typeof discountedPrice === "number" && typeof price === "number" && discountedPrice < price;
    if (originalPriceNode) {
        originalPriceNode.textContent = showOriginal ? formatPrice(price, CURRENCY) : "";
        originalPriceNode.hidden = !showOriginal;
    }

    if (imageNode) {
        imageNode.src = getImageUrl({ image, imageUrl }) || "https://placehold.co/600x400?text=No+image";
        imageNode.alt = getImageAlt({ image, title });
    }

    renderRating(product);
    renderReviews(product.reviews);
}

function updateStatus(message) {
    setStatusMessage(statusNode, message);
}

function handleAddToCart() {
    if (!currentProduct || !currentProduct.id) {
        updateStatus("We are still loading this product. Please try again in a moment.");
        return;
    }

    if (!isOwnerAuthenticated()) {
        updateStatus("Sign in to add items to your cart.");
        scheduleStatusReset();
        return;
    }

    if (!ShopCart || typeof ShopCart.addItem !== "function") {
        updateStatus("The cart is unavailable right now. Please refresh and try again.");
        return;
    }

    const cartItem = buildCartItem(currentProduct);

    try {
        const result = ShopCart.addItem(cartItem, 1);
        const quantityInCart = result?.item?.quantity ?? 1;
        const productName = cartItem.title || "Product";

        updateStatus(`${productName} added to your cart. Quantity in cart: ${quantityInCart}.`);
        scheduleStatusReset();

        if (addToCartButton) {
            addToCartButton.textContent = "Add another to cart";
            addToCartButton.setAttribute("data-added", "true");
        }
    } catch (error) {
        console.error("Failed to add product to cart", error);
        updateStatus("We could not add this product to your cart. Please try again.");
    }
}

function buildCartItem(product) {
    const unitPrice = typeof product.discountedPrice === "number" ? product.discountedPrice : Number(product.price) || 0;
    const imageSource = getImageUrl({ image: product.image, imageUrl: product.imageUrl });

    return {
        id: product.id,
        title: product.title || "Product",
        price: unitPrice,
        image: imageSource || "https://placehold.co/160x160?text=No+image",
        alt: getImageAlt({ image: product.image, title: product.title }),
    };
}

function scheduleStatusReset(delay = 4000) {
    if (!statusNode) {
        return;
    }

    if (statusResetTimer) {
        clearTimeout(statusResetTimer);
    }

    statusResetTimer = window.setTimeout(() => {
        updateStatus("");
        statusResetTimer = null;
    }, delay);
}

function isOwnerAuthenticated() {
    try {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        return typeof token === "string" && token.length > 0;
    } catch (error) {
        console.error("Unable to read authentication token", error);
        return false;
    }
}

function toggleOwnerActions(isAuthenticated) {
    if (addToCartButton) {
        addToCartButton.hidden = !isAuthenticated;
        addToCartButton.disabled = !isAuthenticated;

        if (!isAuthenticated) {
            addToCartButton.textContent = "Add to cart";
            addToCartButton.removeAttribute("data-added");
        }
    }

    if (proceedToCartLink) {
        proceedToCartLink.hidden = !isAuthenticated;
    }

    if (cartNoteNode) {
        cartNoteNode.hidden = !isAuthenticated;
    }

    if (authNoteNode) {
        authNoteNode.hidden = isAuthenticated;
    }

    if (actionsContainer) {
        actionsContainer.classList.toggle("product-detail__actions--locked", !isAuthenticated);
    }
}

function renderRating(product = {}) {
    if (!ratingContainer) {
        return;
    }

    const ratingValue = Number(product.rating);
    const hasRatingValue = Number.isFinite(ratingValue);
    const reviews = Array.isArray(product.reviews) ? product.reviews : [];

    if (ratingValueNode) {
        ratingValueNode.textContent = hasRatingValue ? `${ratingValue.toFixed(1)} / 5` : "Not rated yet";
    }

    if (ratingCountNode) {
        ratingCountNode.textContent = reviews.length
            ? `(${reviews.length} review${reviews.length === 1 ? "" : "s"})`
            : "";
    }
}

function renderReviews(reviews) {
    if (!reviewsSection) {
        return;
    }

    const reviewItems = Array.isArray(reviews) ? [...reviews] : [];
    const hasReviews = reviewItems.length > 0;

    reviewsSection.hidden = false;

    if (reviewSummaryNode) {
        reviewSummaryNode.textContent = hasReviews
            ? `${reviewItems.length} review${reviewItems.length === 1 ? "" : "s"}`
            : "No reviews yet.";
    }

    if (reviewEmptyNode) {
        reviewEmptyNode.hidden = hasReviews;
    }

    if (!reviewListNode) {
        return;
    }

    reviewListNode.innerHTML = "";
    reviewListNode.hidden = !hasReviews;

    if (!hasReviews) {
        return;
    }

    const sortedReviews = reviewItems.sort((a, b) => {
        const aTime = Date.parse(a?.created || "");
        const bTime = Date.parse(b?.created || "");
        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;
        return bTime - aTime;
    });

    sortedReviews.forEach((review) => {
        const item = document.createElement("li");
        item.className = "product-reviews__item";

        const header = document.createElement("div");
        header.className = "product-reviews__item-header";

        const author = document.createElement("p");
        author.className = "product-reviews__author";
        author.textContent = review?.username?.trim() || "Anonymous customer";
        header.appendChild(author);

        const reviewRatingValue = Number(review?.rating);
        if (Number.isFinite(reviewRatingValue)) {
            const ratingText = document.createElement("p");
            ratingText.className = "product-reviews__rating";
            ratingText.textContent = `Rated ${reviewRatingValue.toFixed(1)} / 5`;
            header.appendChild(ratingText);
        }

        item.appendChild(header);

        const createdText = formatReviewDate(review?.created);
        if (createdText) {
            const dateNode = document.createElement("p");
            dateNode.className = "product-reviews__date";
            dateNode.textContent = createdText;
            item.appendChild(dateNode);
        }

        const description = typeof review?.description === "string" ? review.description.trim() : "";
        if (description) {
            const body = document.createElement("p");
            body.className = "product-reviews__body";
            body.textContent = description;
            item.appendChild(body);
        }

        reviewListNode.appendChild(item);
    });
}

function formatReviewDate(value) {
    if (!value) {
        return "";
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
        return "";
    }

    try {
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        }).format(new Date(timestamp));
    } catch (error) {
        console.error("Failed to format review date", error);
        return "";
    }
}

function prepareShare(product = {}) {
    if (!shareButton) {
        return;
    }

    if (!product.id) {
        shareButton.disabled = true;
        currentShareUrl = "";
        updateShareStatus("");
        return;
    }

    shareButton.disabled = false;
    currentShareUrl = buildShareUrl(product.id);

    const label = product.title ? `Share ${product.title}` : "Share this product";
    shareButton.setAttribute("aria-label", label);
    shareButton.title = label;

    updateShareStatus("");
}

function handleShareClick(event) {
    event.preventDefault();

    if (!currentProduct || !currentProduct.id || !currentShareUrl) {
        updateShareStatus("We could not prepare the share link.", "error");
        return;
    }

    const shareData = {
        title: currentProduct.title || "The Shop",
        url: currentShareUrl,
        text: currentProduct.description ? `Take a look at ${currentProduct.title} on The Shop.` : undefined,
    };

    if (navigator.share) {
        navigator
            .share(shareData)
            .then(() => {
                updateShareStatus("Thanks for sharing!");
            })
            .catch((error) => {
                if (error && error.name === "AbortError") {
                    return;
                }
                console.error("Share failed", error);
                updateShareStatus("We could not share the link.", "error");
            });
        return;
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard
            .writeText(currentShareUrl)
            .then(() => {
                updateShareStatus("Link copied to your clipboard.");
            })
            .catch((error) => {
                console.error("Clipboard copy failed", error);
                fallbackCopyShareLink(currentShareUrl);
            });
        return;
    }

    fallbackCopyShareLink(currentShareUrl);
}

function fallbackCopyShareLink(url) {
    const success = copyTextUsingInput(url);
    if (success) {
        updateShareStatus("Link copied to your clipboard.");
    } else {
        updateShareStatus("Copy this link: " + url, "error");
    }
}

function copyTextUsingInput(text) {
    let input;
    try {
        input = document.createElement("input");
        input.type = "text";
        input.value = text;
        input.setAttribute("readonly", "readonly");
        input.style.position = "absolute";
        input.style.opacity = "0";
        input.style.pointerEvents = "none";
        document.body.appendChild(input);
        input.select();
        const result = document.execCommand("copy");
        return result;
    } catch (error) {
        console.error("execCommand copy failed", error);
        return false;
    } finally {
        if (input && input.parentNode) {
            input.parentNode.removeChild(input);
        }
    }
}

function buildShareUrl(id) {
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("id", id);
    return shareUrl.toString();
}

function updateShareStatus(message, type = "info") {
    if (!shareStatusNode) {
        return;
    }

    shareStatusNode.textContent = message;
    shareStatusNode.classList.toggle("product-detail__share-status--error", type === "error");

    if (shareStatusResetTimer) {
        clearTimeout(shareStatusResetTimer);
        shareStatusResetTimer = null;
    }

    if (message) {
        shareStatusResetTimer = window.setTimeout(() => {
            shareStatusNode.textContent = "";
            shareStatusNode.classList.remove("product-detail__share-status--error");
            shareStatusResetTimer = null;
        }, 4000);
    }
}

function handleAuthStorageChange(event) {
    if (!event || (event.key && event.key !== TOKEN_STORAGE_KEY)) {
        return;
    }

    toggleOwnerActions(isOwnerAuthenticated());
}
