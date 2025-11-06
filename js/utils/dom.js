(function (global) {
    const currencyCache = new Map();

    function getFormatter(currencyCode) {
        if (currencyCache.has(currencyCode)) {
            return currencyCache.get(currencyCode);
        }

        const formatter = new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: currencyCode,
        });

        currencyCache.set(currencyCode, formatter);
        return formatter;
    }

    function formatPrice(value, currencyCode = "USD") {
        const formatter = getFormatter(currencyCode);
        return formatter.format(Number.isFinite(value) ? value : 0);
    }

    function getImageUrl({ image, imageUrl }) {
        if (typeof imageUrl === "string" && imageUrl.trim()) return imageUrl;
        if (typeof image === "string" && image.trim()) return image;
        if (image && typeof image === "object" && typeof image.url === "string") return image.url;
        return "";
    }

    function getImageAlt({ image, title }) {
        if (image && typeof image === "object" && typeof image.alt === "string" && image.alt.trim()) {
            return image.alt;
        }

        return title || "Product image";
    }

    function formatTags(tags) {
        if (!Array.isArray(tags) || !tags.length) return "New arrival";
        return tags.slice(0, 3).map((tag) => `#${tag}`).join(" · ");
    }

    function setStatus(element, message = "") {
        if (element) {
            element.textContent = message;
        }
    }

    function setCurrentYear(target) {
        if (!target) return;
        const year = new Date().getFullYear();

        if (typeof target === "string") {
            const element = document.querySelector(target);
            if (element) {
                element.textContent = year;
            }
            return;
        }

        if (target instanceof Element) {
            target.textContent = year;
        }
    }

    global.ShopUtils = {
        formatPrice,
        getImageUrl,
        getImageAlt,
        formatTags,
        setStatus,
        setCurrentYear,
    };
})(window);
