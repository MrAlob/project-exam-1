const REGISTER_URL = "https://api.noroff.dev/api/v1/auth/register";
const AUTH_URL = "https://api.noroff.dev/api/v1/auth/login";
const TOKEN_STORAGE_KEY = "theShopToken";
const PROFILE_STORAGE_KEY = "theShopUser";

const form = document.querySelector("[data-register-form]");
const message = document.querySelector("[data-form-message]");
const yearOutput = document.querySelector("[data-year]");

const fieldErrors = {};
document.querySelectorAll("[data-error-for]").forEach((element) => {
    const field = element.getAttribute("data-error-for");
    if (!field) return;
    fieldErrors[field] = element;
});

if (yearOutput) {
    yearOutput.textContent = new Date().getFullYear();
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
        name: formData.get("name").toString().trim(),
        email: formData.get("email").toString().trim().toLowerCase(),
        password: formData.get("password").toString(),
        confirmPassword: formData.get("confirmPassword").toString(),
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
    const response = await fetch(REGISTER_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
        const apiMessage = result?.errors?.[0]?.message || result?.message || "Registration failed.";
        throw new Error(apiMessage);
    }

    return result;
}

async function loginUser({ email, password, name }) {
    const response = await fetch(AUTH_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
        const apiMessage = result?.errors?.[0]?.message || result?.message || "Login failed.";
        throw new Error(apiMessage);
    }

    if (typeof result.accessToken !== "string") {
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
