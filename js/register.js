const { ShopConfig = {}, ShopServices = {}, ShopUtils = {} } = window;

const TOKEN_STORAGE_KEY = ShopConfig.storageKeys?.token || "theShopToken";
const PROFILE_STORAGE_KEY = ShopConfig.storageKeys?.profile || "theShopUser";
const NOROFF_EMAIL_PATTERN = /@(stud\.)?noroff\.no$/i;
const REGISTER_ENDPOINTS = resolveAuthEndpoints("register");
const LOGIN_ENDPOINTS = resolveAuthEndpoints("login");

const form = document.querySelector("[data-register-form]");
const message = document.querySelector("[data-form-message]");
const yearOutput = document.querySelector("[data-year]");

const {
    setCurrentYear = (target) => {
        if (target) {
            target.textContent = new Date().getFullYear();
        }
    },
} = ShopUtils;

const fieldErrors = {};
document.querySelectorAll("[data-error-for]").forEach((element) => {
    const field = element.getAttribute("data-error-for");
    if (!field) return;
    fieldErrors[field] = element;
});

if (yearOutput) {
    setCurrentYear(yearOutput);
}

if (form) {
    form.addEventListener("submit", handleSubmit);
}

function clearAllFieldErrors() {
    Object.keys(fieldErrors).forEach((field) => {
        fieldErrors[field].textContent = "";
    });
}

function setFieldError(field, text) {
    const target = fieldErrors[field];
    if (target) {
        target.textContent = text;
    }
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

function setLoadingState(isLoading) {
    const submitButton = form?.querySelector('button[type="submit"]');
    if (!submitButton) return;

    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? "Creating account..." : "Create account";
}

function validate({ name, email, password, confirmPassword }) {
    let isValid = true;
    clearAllFieldErrors();

    if (!name) {
        setFieldError("name", "Enter the name you want to display.");
        isValid = false;
    }

    if (!email) {
        setFieldError("email", "Enter your email address.");
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError("email", "Email must be in a valid format.");
        isValid = false;
    } else if (!NOROFF_EMAIL_PATTERN.test(email)) {
        setFieldError("email", "Use your @stud.noroff.no or @noroff.no email address.");
        isValid = false;
    }

    if (!password) {
        setFieldError("password", "Create a password with at least 8 characters.");
        isValid = false;
    } else if (password.length < 8) {
        setFieldError("password", "Password must be at least 8 characters long.");
        isValid = false;
    }

    if (!confirmPassword) {
        setFieldError("confirmPassword", "Confirm your password.");
        isValid = false;
    } else if (confirmPassword !== password) {
        setFieldError("confirmPassword", "Passwords do not match.");
        isValid = false;
    }

    return isValid;
}

async function handleSubmit(event) {
    event.preventDefault();
    if (!form) return;

    const formData = new FormData(form);
    const payload = {
        name: (formData.get("name") || "").toString().trim(),
        email: (formData.get("email") || "").toString().trim().toLowerCase(),
        password: (formData.get("password") || "").toString(),
        confirmPassword: (formData.get("confirmPassword") || "").toString(),
    };

    if (!validate(payload)) {
        setFormMessage("Please fix the highlighted fields.", "error");
        return;
    }

    setLoadingState(true);
    setFormMessage("Creating your account...", "info");

    try {
    await registerUser({ name: payload.name, email: payload.email, password: payload.password });
    const authResult = await loginUser({ email: payload.email, password: payload.password, name: payload.name });

        setFormMessage("Account created successfully! Redirecting...", "success");
        form.reset();

        if (authResult.token) {
            localStorage.setItem(TOKEN_STORAGE_KEY, authResult.token);
        }

        if (authResult.profile) {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(authResult.profile));
        }

        setLoadingState(true);
        setTimeout(() => {
            window.location.href = "/index.html";
        }, 1200);
    } catch (error) {
        setFormMessage(error.message || "We could not create your account.", "error");
    } finally {
        if (message?.classList.contains("form-message--success")) {
            return;
        }
        setLoadingState(false);
    }
}

async function registerUser(payload) {
    return postJsonWithFallback(REGISTER_ENDPOINTS, payload, "registration");
}

async function loginUser({ email, password, name }) {
    const result = await postJsonWithFallback(LOGIN_ENDPOINTS, { email, password }, "login");

    if (typeof result?.accessToken !== "string") {
        throw new Error("The server did not return a valid access token.");
    }

    const profile = {
        name: result.name ?? name ?? "",
        email: result.email ?? email,
        avatar: result.avatar ?? null,
    };

    return {
        token: result.accessToken,
        profile,
    };
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
