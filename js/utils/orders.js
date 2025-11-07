(function (global) {
    const config = global.ShopConfig || {};
    const storageKey = config.storageKeys?.order || "the-shop-last-order";

    function generateOrderNumber() {
        const now = new Date();
        const timestamp = now.getTime().toString(36).toUpperCase();
        const randomSegment = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `TS-${timestamp.slice(-4)}${randomSegment}`;
    }

    function save(order) {
        if (!order || typeof order !== "object") {
            throw new Error("An order object is required to save the order summary.");
        }

        const orderNumber = order.orderNumber || generateOrderNumber();
        const payload = {
            ...order,
            orderNumber,
            savedAt: new Date().toISOString(),
        };

        try {
            global.localStorage?.setItem(storageKey, JSON.stringify(payload));
        } catch (error) {
            throw new Error("We could not store your order confirmation. Please try again.");
        }

        return payload;
    }

    function getLast() {
        try {
            const stored = global.localStorage?.getItem(storageKey);
            if (!stored) {
                return null;
            }

            const parsed = JSON.parse(stored);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function clear() {
        try {
            global.localStorage?.removeItem(storageKey);
        } catch (error) {
            // Silent fail
        }
    }

    global.ShopOrders = Object.freeze({
        save,
        getLast,
        clear,
        generateOrderNumber,
    });
})(window);
