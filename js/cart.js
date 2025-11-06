const CART_STORAGE_KEY = "the-shop-cart";
const CURRENCY = "USD";

const statusNode = document.querySelector("[data-cart-status]");
const cartView = document.querySelector("[data-cart-view]");
const cartEmpty = document.querySelector("[data-cart-empty]");
const cartList = document.querySelector("[data-cart-list]");
const subtotalNode = document.querySelector("[data-cart-subtotal]");
const totalNode = document.querySelector("[data-cart-total]");
const yearNode = document.querySelector("[data-year]");

const utils = window.ShopUtils || {};
const {
    formatPrice = (value) => value,
    setStatus: setStatusMessage = () => {},
} = utils;

init();

function init() {
    if (yearNode) {
        yearNode.textContent = new Date().getFullYear();
    }

    renderCart();
}

function renderCart() {
    const items = getCartItems();

    if (!items.length) {
        toggleCartView(false);
        setStatusMessage(statusNode, "Your cart is empty.");
        return;
    }

    if (!cartList || !subtotalNode || !totalNode) {
        return;
    }

    cartList.innerHTML = "";

    const template = document.querySelector("#cart-item-template");
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (!template) {
        return;
    }

    items.forEach((item) => {
        const node = template.content.cloneNode(true);
        const image = node.querySelector(".cart-item__image");
        const title = node.querySelector(".cart-item__title");
        const price = node.querySelector("[data-item-price]");
        const quantity = node.querySelector("[data-item-quantity]");
        const total = node.querySelector("[data-item-total]");

        if (image) {
            image.src = item.image || "https://placehold.co/160x160?text=No+image";
            image.alt = item.alt || item.title || "Cart item";
        }

        if (title) {
            title.textContent = item.title || "Product";
        }

        if (price) {
            price.textContent = formatPrice(item.price, CURRENCY);
        }

        if (quantity) {
            quantity.textContent = `Qty: ${item.quantity}`;
        }

        if (total) {
            const lineTotal = item.price * item.quantity;
            total.textContent = formatPrice(lineTotal, CURRENCY);
        }

        cartList.appendChild(node);
    });

    subtotalNode.textContent = formatPrice(subtotal, CURRENCY);
    totalNode.textContent = formatPrice(subtotal, CURRENCY);

    toggleCartView(true);
    setStatusMessage(statusNode, `${items.length} item${items.length === 1 ? "" : "s"} in your cart.`);
}

function getCartItems() {
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (!stored) {
            return [];
        }

        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((item) => ({
                id: item.id,
                title: item.title,
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 0,
                image: item.image,
                alt: item.alt,
            }))
            .filter((item) => item.id && item.quantity > 0);
    } catch (error) {
        console.error("Failed to parse cart items", error);
        return [];
    }
}

function toggleCartView(show) {
    if (cartView) {
        cartView.hidden = !show;
    }

    if (cartEmpty) {
        cartEmpty.hidden = show;
    }
}
