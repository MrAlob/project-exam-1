const { ShopConfig = {}, ShopUtils = {}, ShopCart = {} } = window;
const CART_STORAGE_KEY = ShopConfig.storageKeys?.cart || "the-shop-cart";
const CURRENCY = "USD";

const statusNode = document.querySelector("[data-cart-status]");
const cartView = document.querySelector("[data-cart-view]");
const cartEmpty = document.querySelector("[data-cart-empty]");
const cartList = document.querySelector("[data-cart-list]");
const subtotalNode = document.querySelector("[data-cart-subtotal]");
const totalNode = document.querySelector("[data-cart-total]");
const yearNode = document.querySelector("[data-year]");

const {
    formatPrice = (value) => value,
    setStatus: setStatusMessage = () => {},
    setCurrentYear = (target) => {
        if (target) {
            target.textContent = new Date().getFullYear();
        }
    },
} = ShopUtils;

init();

function init() {
    if (yearNode) {
        setCurrentYear(yearNode);
    }

    if (cartList) {
        cartList.addEventListener("click", handleCartListClick);
    }

    renderCart();
}

function renderCart() {
    const items = getCartItems();

    if (!items.length) {
        if (cartList) {
            cartList.innerHTML = "";
        }
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
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    if (!template) {
        return;
    }

    items.forEach((item) => {
        const node = template.content.cloneNode(true);
        const article = node.querySelector(".cart-item");
        const image = node.querySelector(".cart-item__image");
        const title = node.querySelector(".cart-item__title");
        const price = node.querySelector("[data-item-price]");
        const quantity = node.querySelector("[data-item-quantity]");
        const total = node.querySelector("[data-item-total]");

        if (article && item.id) {
            article.dataset.itemId = item.id;
        }

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
            quantity.textContent = item.quantity;
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
    setStatusMessage(statusNode, `${totalQuantity} item${totalQuantity === 1 ? "" : "s"} in your cart.`);
}

function getCartItems() {
    if (ShopCart && typeof ShopCart.getItems === "function") {
        return ShopCart.getItems();
    }

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

function handleCartListClick(event) {
    const control = event.target.closest("[data-item-action]");
    if (!control) {
        return;
    }

    const action = control.dataset.itemAction;
    if (!action) {
        return;
    }

    const lineItem = control.closest("[data-line-item]");
    const itemId = lineItem?.dataset.itemId;
    if (!itemId) {
        return;
    }

    event.preventDefault();

    if (action === "increase") {
        adjustCartItemQuantity(itemId, 1);
    } else if (action === "decrease") {
        adjustCartItemQuantity(itemId, -1);
    } else if (action === "remove") {
        removeCartItem(itemId);
    }
}

function adjustCartItemQuantity(itemId, change) {
    if (!itemId || !Number.isFinite(change)) {
        return;
    }

    const items = getCartItems();
    const target = items.find((line) => line.id === itemId);
    if (!target) {
        return;
    }

    const nextQuantity = target.quantity + change;

    try {
        if (nextQuantity <= 0) {
            removeCartItemValue(itemId);
        } else {
            updateCartItemQuantityValue(itemId, nextQuantity);
        }

        renderCart();
    } catch (error) {
        console.error("Failed to update cart quantity", error);
        setStatusMessage(statusNode, error.message || "We could not update your cart. Please try again.");
    }
}

function removeCartItem(itemId) {
    if (!itemId) {
        return;
    }

    try {
        removeCartItemValue(itemId);
        renderCart();
    } catch (error) {
        console.error("Failed to remove cart item", error);
        setStatusMessage(statusNode, error.message || "We could not update your cart. Please try again.");
    }
}

function updateCartItemQuantityValue(id, quantity) {
    if (!id) {
        return;
    }

    if (ShopCart && typeof ShopCart.setItemQuantity === "function") {
        ShopCart.setItemQuantity(id, quantity);
        return;
    }

    const items = getCartItems();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
        return;
    }

    if (quantity <= 0) {
        items.splice(index, 1);
    } else {
        items[index] = { ...items[index], quantity };
    }

    persistCartItems(items);
}

function removeCartItemValue(id) {
    if (!id) {
        return;
    }

    if (ShopCart && typeof ShopCart.removeItem === "function") {
        ShopCart.removeItem(id);
        return;
    }

    const items = getCartItems().filter((item) => item.id !== id);
    persistCartItems(items);
}

function persistCartItems(items) {
    try {
        const normalized = Array.isArray(items)
            ? items
                  .map((item) => ({
                      id: item.id,
                      title: item.title || "Product",
                      price: Number(item.price) || 0,
                      quantity: Math.max(0, Number(item.quantity) || 0),
                      image: typeof item.image === "string" ? item.image : null,
                      alt: typeof item.alt === "string" ? item.alt : item.title || "Cart item",
                  }))
                  .filter((item) => item.id && item.quantity > 0)
            : [];

        window.localStorage?.setItem(CART_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
        console.error("Failed to persist cart items", error);
        throw new Error("We could not update your cart. Please try again.");
    }
}
