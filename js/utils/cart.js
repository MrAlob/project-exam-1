(function (global) {
    const config = global.ShopConfig || {};
    const storageKey = config.storageKeys?.cart || "the-shop-cart";

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

    function clear() {
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

    global.ShopCart = Object.freeze({
        getItems,
        addItem,
        setItemQuantity,
        removeItem,
        clear,
        getTotalQuantity,
        getSubtotal,
    });
})(window);
