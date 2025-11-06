const { ShopConfig = {}, ShopUtils = {}, ShopCart = {} } = window;

const TOKEN_STORAGE_KEY = ShopConfig.storageKeys?.token || "theShopToken";
const PROFILE_STORAGE_KEY = ShopConfig.storageKeys?.profile || "theShopUser";

const orderNumberOutput = document.querySelector("[data-order-number]");
const yearOutput = document.querySelector("[data-year]");
const logoutButton = document.querySelector("[data-logout]");
const logoutMessage = document.querySelector("[data-logout-message]");

const {
    setCurrentYear = (target) => {
        if (target) {
            target.textContent = new Date().getFullYear();
        }
    },
} = ShopUtils;

if (orderNumberOutput) {
    const orderNumber = generateOrderNumber();
    orderNumberOutput.textContent = orderNumber;
}

if (yearOutput) {
    setCurrentYear(yearOutput);
}

if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
    updateLogoutButton();

    window.addEventListener("storage", handleStorageUpdate);
}

function handleLogout() {
    clearStoredSession();

    try {
        if (window?.ShopCart && typeof window.ShopCart.clear === "function") {
            window.ShopCart.clear();
        } else if (ShopCart && typeof ShopCart.clear === "function") {
            ShopCart.clear();
        }
    } catch (error) {
        console.error("Failed to clear cart during logout", error);
    }

    updateLogoutButton();
    setLogoutMessage("You have been signed out. Feel free to continue browsing.");
}

function updateLogoutButton() {
    if (!logoutButton) {
        return;
    }

    const hasSession = Boolean(getStoredSession());
    logoutButton.hidden = !hasSession;
    logoutButton.disabled = !hasSession;

    if (!hasSession) {
        setLogoutMessage("");
    }
}

function setLogoutMessage(text) {
    if (!logoutMessage) {
        return;
    }

    if (!text) {
        logoutMessage.hidden = true;
        logoutMessage.textContent = "";
        return;
    }

    logoutMessage.hidden = false;
    logoutMessage.textContent = text;
}

function getStoredSession() {
    try {
        const token = normalizeStoredValue(localStorage.getItem(TOKEN_STORAGE_KEY));
        if (!token || !isLikelyToken(token)) {
            clearStoredSession();
            return null;
        }

        const profileRecord = parseStoredProfile(localStorage.getItem(PROFILE_STORAGE_KEY));
        return {
            token,
            profile: profileRecord,
        };
    } catch (error) {
        console.error("Failed to read stored session", error);
        return null;
    }
}

function clearStoredSession() {
    removeIfExists(TOKEN_STORAGE_KEY);
    removeIfExists(PROFILE_STORAGE_KEY);
}

function normalizeStoredValue(rawValue) {
    if (typeof rawValue !== "string") {
        return "";
    }

    const normalized = rawValue.trim();
    if (!normalized || normalized === "undefined" || normalized === "null" || normalized === "false") {
        return "";
    }

    return normalized;
}

function parseStoredProfile(rawValue) {
    const normalized = normalizeStoredValue(rawValue);
    if (!normalized) {
        return null;
    }

    try {
        return JSON.parse(normalized);
    } catch (error) {
        console.error("Failed to parse stored profile", error);
        return null;
    }
}

function removeIfExists(key) {
    if (!key) {
        return;
    }

    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Failed to remove localStorage key: ${key}`, error);
    }
}

function isLikelyToken(value) {
    if (typeof value !== "string") {
        return false;
    }

    const normalized = value.trim();
    if (!normalized || normalized.length < 20 || /\s/.test(normalized)) {
        return false;
    }

    const parts = normalized.split(".");
    return parts.length === 3 && parts.every((part) => part.length > 0);
}

function handleStorageUpdate(event) {
    if (!event || (event.key && event.key !== TOKEN_STORAGE_KEY)) {
        return;
    }

    updateLogoutButton();
}

function generateOrderNumber() {
    const now = new Date();
    const timestamp = now.getTime().toString(36).toUpperCase();
    const randomSegment = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TS-${timestamp.slice(-4)}${randomSegment}`;
}
