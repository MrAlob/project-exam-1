const AUTH_URL = "https://api.noroff.dev/api/v1/auth/login";
const TOKEN_STORAGE_KEY = "theShopToken";
const PROFILE_STORAGE_KEY = "theShopUser";

const form = document.querySelector("[data-login-form]");
const message = document.querySelector("[data-form-message]");
const fieldErrors = {
    email: document.querySelector('[data-error-for="email"]'),
    password: document.querySelector('[data-error-for="password"]'),
};
const yearOutput = document.querySelector("[data-year]");

if (yearOutput) {
    yearOutput.textContent = new Date().getFullYear();
}

if (form) {
    form.addEventListener("submit", handleSubmit);
}

const existingToken = localStorage.getItem(TOKEN_STORAGE_KEY);
if (existingToken) {
    setFormMessage("You are already signed in.", "success");
}

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
        const response = await fetch(AUTH_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(credentials),
        });

        const result = await response.json();

        if (!response.ok) {
            const apiMessage = result?.errors?.[0]?.message || result?.message || "We could not sign you in.";
            throw new Error(apiMessage);
        }

        if (typeof result.accessToken !== "string") {
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
