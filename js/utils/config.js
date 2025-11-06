(function (global) {
    const API_BASE = "https://api.noroff.dev/api/v1";
    const ONLINE_SHOP_BASE = `${API_BASE}/online-shop`;
    const AUTH_BASE = "https://v2.api.noroff.dev/auth";
    const AUTH_LEGACY_BASE = `${API_BASE}/auth`;

    const storageKeys = Object.freeze({
        token: "theShopToken",
        profile: "theShopUser",
        cart: "the-shop-cart",
        order: "the-shop-last-order",
    });

    const config = Object.freeze({
        apiBase: API_BASE,
        onlineShopBase: ONLINE_SHOP_BASE,
        authBase: AUTH_BASE,
        authLegacyBase: AUTH_LEGACY_BASE,
        storageKeys,
    });

    global.ShopConfig = config;
})(window);
