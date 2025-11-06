(function (global) {
    const config = global.ShopConfig || {};

    function appendPath(base, path = "") {
        if (!base) return path;
        if (!path) return base;
        if (path.startsWith("http")) return path;
        const separator = path.startsWith("/") ? "" : "/";
        return `${base}${separator}${path}`;
    }

    function getOnlineShopUrl(path = "") {
        return appendPath(config.onlineShopBase, path);
    }

    function getAuthUrl(path = "", options = {}) {
        const normalizedOptions = options && typeof options === "object" ? options : {};
        const useLegacy = Boolean(normalizedOptions.legacy);

        const bases = [];
        if (!useLegacy && config.authBase) {
            bases.push(config.authBase);
        }

        if (useLegacy && config.authLegacyBase) {
            bases.push(config.authLegacyBase);
        }

        if (!bases.length) {
            if (config.authBase) {
                bases.push(config.authBase);
            } else if (config.authLegacyBase) {
                bases.push(config.authLegacyBase);
            }
        }

        const base = bases[0] || "";
        return appendPath(base, path);
    }

    function getAuthUrlList(path = "") {
        const urls = [];

        if (config.authBase) {
            const primary = getAuthUrl(path);
            if (primary) {
                urls.push(primary);
            }
        }

        if (config.authLegacyBase) {
            const legacy = getAuthUrl(path, { legacy: true });
            if (legacy && !urls.includes(legacy)) {
                urls.push(legacy);
            }
        }

        return urls.length ? urls : [getAuthUrl(path)];
    }

    async function fetchJson(url, options = {}) {
        if (!url) {
            throw new Error("fetchJson requires a URL");
        }

        const mergedOptions = {
            headers: {
                Accept: "application/json",
                ...(options.headers || {}),
            },
            ...options,
        };

        // Ensure body payloads default to JSON when appropriate.
        if (mergedOptions.body && !mergedOptions.headers["Content-Type"]) {
            mergedOptions.headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, mergedOptions);
        const contentType = response.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");

        let payload = null;
        if (isJson) {
            try {
                payload = await response.json();
            } catch (error) {
                throw new Error("The server returned invalid JSON.");
            }
        }

        if (!response.ok) {
            const apiMessage = payload?.errors?.[0]?.message || payload?.message || `Request failed with status ${response.status}`;
            const requestError = new Error(apiMessage);
            requestError.status = response.status;
            requestError.payload = payload;
            throw requestError;
        }

        if (payload && typeof payload === "object" && "data" in payload && payload.data !== null && payload.data !== undefined) {
            return payload.data;
        }

        return payload ?? null;
    }

    global.ShopServices = {
        fetchJson,
        getOnlineShopUrl,
        getAuthUrl,
        getAuthUrlList,
    };
})(window);
