const { ShopConfig = {}, ShopServices = {}, ShopUtils = {} } = window;

const TOKEN_STORAGE_KEY = ShopConfig.storageKeys?.token || "theShopToken";
const PROFILE_STORAGE_KEY = ShopConfig.storageKeys?.profile || "theShopUser";
const NOROFF_EMAIL_PATTERN = /@(stud\.)?noroff\.no$/i;
const LOGIN_ENDPOINTS = resolveAuthEndpoints("login");

const form = document.querySelector("[data-login-form]");
const message = document.querySelector("[data-form-message]");
const statusBanner = document.querySelector("[data-auth-status]");
const statusText = document.querySelector("[data-auth-status-text]");
const logoutButton = document.querySelector("[data-logout]");
const fieldErrors = {
    email: document.querySelector('[data-error-for="email"]'),
    password: document.querySelector('[data-error-for="password"]'),
};
const yearOutput = document.querySelector("[data-year]");

const {
    setCurrentYear = (target) => {
        if (target) {
            target.textContent = new Date().getFullYear();
        }
    },
} = ShopUtils;

if (yearOutput) {
    setCurrentYear(yearOutput);
}

if (form) {
    form.addEventListener("submit", handleSubmit);
}

if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
}

window.addEventListener("storage", handleStorageUpdate);

initializeAuthView();

function validate(credentials) {
    let isValid = true;

    clearFieldError("email");
    clearFieldError("password");

    if (!credentials.email) {
        setFieldError("email", "Enter your email address.");
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
        setFieldError("email", "Email must be in a valid format.");
        isValid = false;
    } else if (!NOROFF_EMAIL_PATTERN.test(credentials.email)) {
        setFieldError("email", "Use your @stud.noroff.no or @noroff.no email address.");
        isValid = false;
    }

    if (!credentials.password) {
        setFieldError("password", "Enter your password.");
        isValid = false;
    } else if (credentials.password.length < 8) {
        setFieldError("password", "Password must be at least 8 characters long.");
        isValid = false;
    }

    return isValid;
}

async function handleSubmit(event) {
    event.preventDefault();

    if (!form) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const credentials = {
        email: form.email.value.trim().toLowerCase(),
        password: form.password.value.trim(),
    };

    if (!validate(credentials)) {
        setFormMessage("Please fix the fields highlighted above.", "error");
        return;
    }

    setLoadingState(submitButton, true);
    setFormMessage("Signing you in...", "info");

    try {
        const result = await postJsonWithFallback(LOGIN_ENDPOINTS, credentials, "login");

        if (typeof result?.accessToken !== "string") {
            throw new Error("The server did not return a valid access token.");
        }

        localStorage.setItem(TOKEN_STORAGE_KEY, result.accessToken);

        const profile = {
            name: result.name ?? "",
            email: result.email ?? credentials.email,
            avatar: result.avatar ?? null,
        };
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));

        setFormMessage("Signed in successfully. Redirecting...", "success");
        form.reset();
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Redirecting...";
        }

        setTimeout(() => {
            window.location.href = "/index.html";
        }, 1200);
    } catch (error) {
        setFormMessage(error.message, "error");
    } finally {
        if (submitButton && submitButton.textContent !== "Redirecting...") {
            setLoadingState(submitButton, false);
        }
    }
}

function handleLogout() {
    try {
        clearStoredSession();
        if (window?.ShopCart && typeof window.ShopCart.clear === "function") {
            window.ShopCart.clear();
        }
    } catch (error) {
        // Silent fail
    }

    initializeAuthView({ preserveMessage: true });
    if (form) {
        form.reset();
    }
    setFormMessage("You have been signed out. Sign in again below.", "success");
}

function resolveAuthEndpoints(path) {
    const urls = new Set();

    if (ShopServices.getAuthUrlList) {
        const candidates = ShopServices.getAuthUrlList(path);
        if (Array.isArray(candidates)) {
            candidates.filter(Boolean).forEach((candidate) => urls.add(candidate));
        }
    } else if (ShopServices.getAuthUrl) {
        urls.add(ShopServices.getAuthUrl(path));
    }

    const fallbacks = [
        `https://v2.api.noroff.dev/auth/${path}`,
        `https://api.noroff.dev/auth/${path}`,
        `https://api.noroff.dev/api/v1/auth/${path}`,
    ];

    fallbacks.filter(Boolean).forEach((candidate) => urls.add(candidate));

    return Array.from(urls);
}

async function postJsonWithFallback(endpoints, payload, contextLabel = "request") {
    if (!Array.isArray(endpoints) || !endpoints.length) {
        throw new Error("Authentication service is not configured.");
    }

    const requestBody = JSON.stringify(payload);
    const headers = {
        "Content-Type": "application/json",
    };

    let lastError = null;

    for (let index = 0; index < endpoints.length; index += 1) {
        const endpoint = endpoints[index];
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers,
                body: requestBody,
            });

            const rawPayload = await parseAuthJson(response);

            if (!response.ok) {
                const error = buildAuthError(response, rawPayload, contextLabel);
                if (response.status === 404 && index < endpoints.length - 1) {
                    lastError = error;
                    continue;
                }
                throw error;
            }

            return unwrapAuthPayload(rawPayload) || {};
        } catch (error) {
            if ((error?.status === 404 || error?.name === "TypeError") && index < endpoints.length - 1) {
                lastError = error;
                continue;
            }
            throw error;
        }
    }

    throw lastError || new Error(`We could not complete the ${contextLabel}. Please try again later.`);
}

async function parseAuthJson(response) {
    const contentType = response.headers?.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        return null;
    }

    try {
        return await response.json();
    } catch (error) {
        return null;
    }
}

function buildAuthError(response, payload, contextLabel) {
    const message =
        payload?.errors?.[0]?.message || payload?.message || `We could not complete the ${contextLabel}. (Status ${response.status})`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    return error;
}

function unwrapAuthPayload(payload) {
    if (payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "data")) {
        const data = payload.data;
        if (data !== null && data !== undefined) {
            return data;
        }
    }

    return payload;
}

function setLoadingState(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? "Signing in..." : "Sign in";
}

function setFormMessage(text, status) {
    if (!message) return;

    message.textContent = text || "";
    message.classList.remove("form-message--error", "form-message--success");

    if (status === "error") {
        message.classList.add("form-message--error");
    } else if (status === "success") {
        message.classList.add("form-message--success");
    }
}

function initializeAuthView(options = {}) {
    const { preserveMessage = false } = options || {};
    const session = getStoredSession();

    if (session) {
        revealStatusBanner("You are already signed in.");
        toggleFormAvailability(false);
        if (!preserveMessage) {
            setFormMessage("");
        }
        return;
    }

    hideStatusBanner();
    toggleFormAvailability(true);
}

function revealStatusBanner(displayText) {
    if (!statusBanner) {
        return;
    }

    if (statusText && displayText) {
        statusText.textContent = displayText;
    }

    statusBanner.hidden = false;
    statusBanner.style.display = "";
    statusBanner.setAttribute("aria-hidden", "false");
    statusBanner.classList.add("auth-card__notice--visible");

    if (logoutButton) {
        logoutButton.disabled = false;
        logoutButton.removeAttribute("tabindex");
    }
}

function hideStatusBanner() {
    if (!statusBanner) {
        return;
    }

    statusBanner.hidden = true;
    statusBanner.style.display = "none";
    statusBanner.setAttribute("aria-hidden", "true");
    statusBanner.classList.remove("auth-card__notice--visible");

    if (statusText) {
        statusText.textContent = "";
    }

    if (logoutButton) {
        logoutButton.disabled = true;
        logoutButton.setAttribute("tabindex", "-1");
    }
}

function toggleFormAvailability(isEnabled) {
    if (!form) {
        return;
    }

    form.classList.toggle("auth-form--disabled", !isEnabled);
    if (isEnabled) {
        form.removeAttribute("aria-hidden");
    } else {
        form.setAttribute("aria-hidden", "true");
    }

    const controls = form.querySelectorAll("input, button");
    controls.forEach((control) => {
        control.disabled = !isEnabled;
    });
}

function setFieldError(field, text) {
    const target = fieldErrors[field];
    if (target) {
        target.textContent = text;
    }
}

function clearFieldError(field) {
    const target = fieldErrors[field];
    if (target) {
        target.textContent = "";
    }
}

function getStoredSession() {
    const token = normalizeStoredValue(localStorage.getItem(TOKEN_STORAGE_KEY));
    if (!token || !isLikelyToken(token)) {
        removeIfExists(TOKEN_STORAGE_KEY);
        removeIfExists(PROFILE_STORAGE_KEY);
        return null;
    }

    const profileRecord = parseStoredProfile(localStorage.getItem(PROFILE_STORAGE_KEY));
    return {
        token,
        profile: profileRecord,
    };
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
        // Silent fail
    }
}

function isLikelyToken(value) {
    if (typeof value !== "string") {
        return false;
    }

    const normalized = value.trim();
    if (!normalized) {
        return false;
    }

    if (normalized.length < 20 || /\s/.test(normalized)) {
        return false;
    }

    const tokenParts = normalized.split(".");
    return tokenParts.length === 3 && tokenParts.every((part) => typeof part === "string" && part.length > 0);
}

function handleStorageUpdate(event) {
    if (!event || (event.key && event.key !== TOKEN_STORAGE_KEY)) {
        return;
    }

    initializeAuthView();
}
