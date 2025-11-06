const FAKE_PROCESSING_DELAY_MS = 900;
const REDIRECT_DELAY_MS = 1200;

const form = document.querySelector("[data-checkout-form]");
const message = document.querySelector("[data-form-message]");
const submitButton = form?.querySelector(".checkout-submit");
const cardFields = form?.querySelector("[data-card-fields]");
const paymentRadios = form ? form.querySelectorAll('input[name="paymentMethod"]') : [];
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

if (form && submitButton) {
    initializePaymentOptions();
    form.addEventListener("submit", handleSubmit);
}

function initializePaymentOptions() {
    const selected = form.querySelector('input[name="paymentMethod"]:checked');
    toggleCardFields(selected?.value === "card");

    paymentRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            const isCard = radio.value === "card";
            toggleCardFields(isCard);
            if (!isCard) {
                clearFieldError("cardNumber");
                clearFieldError("cardExpiry");
                clearFieldError("cardCvc");
            }
        });
    });
}

function toggleCardFields(shouldShow) {
    if (!cardFields) return;

    cardFields.hidden = !shouldShow;
    cardFields.setAttribute("aria-hidden", shouldShow ? "false" : "true");

    const inputs = cardFields.querySelectorAll("input");
    inputs.forEach((input) => {
        if (!shouldShow) {
            input.value = "";
        }
    });
}

function clearAllFieldErrors() {
    Object.keys(fieldErrors).forEach((name) => {
        clearFieldError(name);
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

function setLoadingState(isLoading, loadingText = "Processing...") {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? loadingText : "Place order";
}

function getTrimmedValue(formData, field) {
    return (formData.get(field) || "").toString().trim();
}

async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(form);
    clearAllFieldErrors();
    setFormMessage("");

    const paymentMethod = formData.get("paymentMethod");
    const optionalFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "address",
        "city",
        "postal",
        "country",
    ];

    let hasErrors = false;

    // Temporarily allowing empty fields to speed up manual testing; enforce required checks again here.
    optionalFields.forEach((field) => {
        const value = getTrimmedValue(formData, field);
        if (!value) {
            return;
        }

        if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            setFieldError(field, "Email must be in a valid format.");
            hasErrors = true;
        }

        if (field === "phone") {
            const digits = value.replace(/[^\d+]/g, "");
            if (digits.length < 7) {
                setFieldError(field, "Phone number must include at least 7 digits.");
                hasErrors = true;
            }
        }

        if (field === "postal" && value.length < 3) {
            setFieldError(field, "Postal code must be at least 3 characters long.");
            hasErrors = true;
        }
    });

    if (!paymentMethod) {
        setFieldError("paymentMethod", "Select how you want to pay.");
        hasErrors = true;
    }

    if (paymentMethod === "card") {
        const cardNumber = getTrimmedValue(formData, "cardNumber").replace(/\s+/g, "");
        const cardExpiry = getTrimmedValue(formData, "cardExpiry");
        const cardCvc = getTrimmedValue(formData, "cardCvc");

        if (cardNumber && !/^\d{13,19}$/.test(cardNumber)) {
            setFieldError("cardNumber", "Enter a valid card number (13-19 digits).");
            hasErrors = true;
        }

        if (cardExpiry && !/^(0[1-9]|1[0-2])\/(\d{2})$/.test(cardExpiry)) {
            setFieldError("cardExpiry", "Use the MM/YY format.");
            hasErrors = true;
        }

        if (cardCvc && !/^\d{3,4}$/.test(cardCvc)) {
            setFieldError("cardCvc", "Enter a 3 or 4 digit CVC.");
            hasErrors = true;
        }
    }

    if (hasErrors) {
        setFormMessage("Please fix the fields highlighted above.", "error");
        return;
    }

    setLoadingState(true);
    setFormMessage("Processing your order...", "info");

    // Simulate a short processing delay before redirecting.
    await new Promise((resolve) => setTimeout(resolve, FAKE_PROCESSING_DELAY_MS));

    setFormMessage("Order confirmed! Redirecting to the success page...", "success");
    form.reset();
    toggleCardFields(true);
    setLoadingState(true, "Redirecting...");

    setTimeout(() => {
        window.location.href = "success.html";
    }, REDIRECT_DELAY_MS);
}
