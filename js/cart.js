// Cart module - manages shopping cart state and UI
(function (global) {
    const ShopConfig = global.ShopConfig || {};
    const ShopUtils = global.ShopUtils || {};
    const storageKey = ShopConfig.storageKeys?.cart || "the-shop-cart";
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

    // ===== Cart State Management =====

    function sanitizeLineItem(item) {
        if (!item || !item.id) {
            return null;
        }

        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            return null;
        }

        return {
            id: item.id,
            title: item.title || "Product",
            price: Number(item.price) || 0,
            quantity,
            image: typeof item.image === "string" ? item.image : null,
            alt: typeof item.alt === "string" ? item.alt : item.title || "Cart item",
        };
    }

    function readCart() {
        try {
            const stored = global.localStorage?.getItem(storageKey);
            if (!stored) {
                return [];
            }

            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed
                .map(sanitizeLineItem)
                .filter(Boolean)
                .map((item) => ({ ...item }));
        } catch (error) {
            console.error("Failed to read the cart from storage", error);
            return [];
        }
    }

    function writeCart(items) {
        try {
            const normalized = Array.isArray(items)
                ? items.map(sanitizeLineItem).filter(Boolean)
                : [];
            global.localStorage?.setItem(storageKey, JSON.stringify(normalized));
            return true;
        } catch (error) {
            console.error("Failed to update the cart", error);
            return false;
        }
    }

    function getItems() {
        return readCart();
    }

    function addItem(item, quantity = 1) {
        if (!item || !item.id) {
            throw new Error("Cart items must include an id.");
        }

        const items = readCart();
        const normalizedQuantity = Number(quantity);
        const increment = Number.isFinite(normalizedQuantity) && normalizedQuantity > 0 ? normalizedQuantity : 1;

        const baseItem = sanitizeLineItem({ ...item, quantity: increment });
        if (!baseItem) {
            throw new Error("Cart item could not be normalized.");
        }

        const existingIndex = items.findIndex((line) => line.id === baseItem.id);
        let updatedLine;

        if (existingIndex >= 0) {
            const nextQuantity = items[existingIndex].quantity + increment;
            updatedLine = { ...items[existingIndex], quantity: nextQuantity };
            items[existingIndex] = updatedLine;
        } else {
            updatedLine = { ...baseItem };
            items.push(updatedLine);
        }

        if (!writeCart(items)) {
            throw new Error("We could not update your cart. Please try again.");
        }

        return {
            items: items.map((line) => ({ ...line })),
            item: { ...updatedLine },
            isNew: existingIndex === -1,
        };
    }

    function setItemQuantity(id, quantity) {
        if (!id) {
            throw new Error("An id is required to update cart items.");
        }

        const normalizedQuantity = Number(quantity);
        if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 0) {
            throw new Error("Quantity must be zero or a positive number.");
        }

        const items = readCart();
        const index = items.findIndex((line) => line.id === id);

        if (index === -1) {
            return { items: items.map((line) => ({ ...line })), item: null };
        }

        if (normalizedQuantity === 0) {
            items.splice(index, 1);
        } else {
            items[index] = { ...items[index], quantity: normalizedQuantity };
        }

        if (!writeCart(items)) {
            throw new Error("We could not update your cart. Please try again.");
        }

        const item = items[index] ? { ...items[index] } : null;
        return { items: items.map((line) => ({ ...line })), item };
    }

    function removeItem(id) {
        return setItemQuantity(id, 0);
    }

    function clearCart() {
        try {
            global.localStorage?.removeItem(storageKey);
        } catch (error) {
            console.error("Failed to clear the cart", error);
        }
    }

    function getTotalQuantity() {
        return readCart().reduce((total, item) => total + item.quantity, 0);
    }

    function getSubtotal() {
        return readCart().reduce((total, item) => total + item.price * item.quantity, 0);
    }

    // Expose cart API globally
    global.ShopCart = Object.freeze({
        getItems,
        addItem,
        setItemQuantity,
        removeItem,
        clear: clearCart,
        getTotalQuantity,
        getSubtotal,
    });

    // ===== Cart Page UI =====

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
        const items = getItems();

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
        return getItems();
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

        const items = getItems();
        const target = items.find((line) => line.id === itemId);
        if (!target) {
            return;
        }

        const nextQuantity = target.quantity + change;

        try {
            if (nextQuantity <= 0) {
                removeItem(itemId);
            } else {
                setItemQuantity(itemId, nextQuantity);
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
            removeItem(itemId);
            renderCart();
        } catch (error) {
            console.error("Failed to remove cart item", error);
            setStatusMessage(statusNode, error.message || "We could not update your cart. Please try again.");
        }
    }

})(window);
