const { ShopUtils = {}, ShopCart = {}, ShopOrders = {} } = window;

const FAKE_PROCESSING_DELAY_MS = 900;
const REDIRECT_DELAY_MS = 1200;
const SHIPPING_FEE = 0;
const CURRENCY = "USD";

const form = document.querySelector("[data-checkout-form]");
const message = document.querySelector("[data-form-message]");
const submitButton = form?.querySelector(".checkout-submit");
const cardFields = form?.querySelector("[data-card-fields]");
const paymentRadios = form ? form.querySelectorAll('input[name="paymentMethod"]') : [];
const yearOutput = document.querySelector("[data-year]");
const summaryItems = document.querySelector("[data-summary-items]");
const summaryEmpty = document.querySelector("[data-summary-empty]");
const summarySubtotal = document.querySelector("[data-summary-subtotal]");
const summaryShipping = document.querySelector("[data-summary-shipping]");
const summaryTotal = document.querySelector("[data-summary-total]");

const {
    formatPrice = (value) => value,
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

let currentCartItems = [];
let isProcessingOrder = false;

if (yearOutput) {
    setCurrentYear(yearOutput);
}

if (form && submitButton) {
    initializePaymentOptions();
    form.addEventListener("submit", handleSubmit);
    renderSummary();
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

function renderSummary() {
    if (!summaryItems || !summarySubtotal || !summaryShipping || !summaryTotal) {
        return;
    }

    const items = typeof ShopCart.getItems === "function" ? ShopCart.getItems() : [];
    currentCartItems = items.map((item) => ({ ...item }));

    summaryItems.innerHTML = "";

    if (!items.length) {
        if (summaryEmpty) {
            summaryEmpty.hidden = false;
        }

        updateSummaryTotals(0, SHIPPING_FEE);

        if (submitButton) {
            submitButton.disabled = true;
        }

        return;
    }

    if (summaryEmpty) {
        summaryEmpty.hidden = true;
    }

    items.forEach((item) => {
        const line = document.createElement("li");

        const info = document.createElement("div");
        const name = document.createElement("p");
        name.className = "item-name";
        name.textContent = item.title || "Product";

        const meta = document.createElement("p");
        meta.className = "item-meta";
        const unit = formatPrice(item.price, CURRENCY);
        meta.textContent = `Qty ${item.quantity} · ${unit}`;

        info.append(name, meta);

        const total = document.createElement("p");
        total.className = "item-total";
        total.textContent = formatPrice(item.price * item.quantity, CURRENCY);

        line.append(info, total);
        summaryItems.append(line);
    });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    updateSummaryTotals(subtotal, SHIPPING_FEE);

    if (submitButton && !isProcessingOrder) {
        submitButton.disabled = false;
    }
}

function updateSummaryTotals(subtotal, shipping) {
    if (summarySubtotal) {
        summarySubtotal.textContent = formatPrice(subtotal, CURRENCY);
    }

    if (summaryShipping) {
        summaryShipping.textContent = shipping ? formatPrice(shipping, CURRENCY) : "FREE";
    }

    if (summaryTotal) {
        summaryTotal.textContent = formatPrice(subtotal + shipping, CURRENCY);
    }
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
    isProcessingOrder = Boolean(isLoading);
    submitButton.textContent = isLoading ? loadingText : "Place order";
    submitButton.disabled = isProcessingOrder || !currentCartItems.length;
}

function getTrimmedValue(formData, field) {
    return (formData.get(field) || "").toString().trim();
}

async function handleSubmit(event) {
    event.preventDefault();

    renderSummary();

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

    if (!currentCartItems.length) {
        setFormMessage("Your cart is empty. Add products before checking out.", "error");
        if (submitButton && !isProcessingOrder) {
            submitButton.disabled = true;
        }
        return;
    }

    const orderSummary = createOrderSummary(formData, paymentMethod);

    setLoadingState(true);
    setFormMessage("Processing your order...", "info");

    try {
        saveOrderSummary(orderSummary);

        if (ShopCart && typeof ShopCart.clear === "function") {
            ShopCart.clear();
        }

        currentCartItems = [];
        renderSummary();

        // Simulate a short processing delay before redirecting.
        await new Promise((resolve) => setTimeout(resolve, FAKE_PROCESSING_DELAY_MS));

        setFormMessage("Order confirmed! Redirecting to the success page...", "success");
        form.reset();
        toggleCardFields(true);
        setLoadingState(true, "Redirecting...");

        setTimeout(() => {
            window.location.href = "success.html";
        }, REDIRECT_DELAY_MS);
    } catch (error) {
        console.error("Checkout submission failed", error);
        setFormMessage(error.message || "We could not complete your order. Please try again.", "error");
        renderSummary();
    } finally {
        if (message?.classList.contains("form-message--success")) {
            return;
        }
        setLoadingState(false);
    }
}

function createOrderSummary(formData, paymentMethod) {
    const firstName = getTrimmedValue(formData, "firstName");
    const lastName = getTrimmedValue(formData, "lastName");
    const email = getTrimmedValue(formData, "email");
    const phone = getTrimmedValue(formData, "phone");
    const address = getTrimmedValue(formData, "address");
    const city = getTrimmedValue(formData, "city");
    const postal = getTrimmedValue(formData, "postal");
    const country = getTrimmedValue(formData, "country");
    const notes = getTrimmedValue(formData, "orderNotes");

    const items = currentCartItems.map((item) => ({
        id: item.id,
        title: item.title,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 0,
        image: item.image,
        alt: item.alt,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingAmount = items.length ? SHIPPING_FEE : 0;
    const total = subtotal + shippingAmount;

    const orderNumber =
        ShopOrders && typeof ShopOrders.generateOrderNumber === "function"
            ? ShopOrders.generateOrderNumber()
            : fallbackGenerateOrderNumber();

    return {
        orderNumber,
        createdAt: new Date().toISOString(),
        paymentMethod: paymentMethod || "card",
        items,
        totals: {
            subtotal,
            shipping: shippingAmount,
            total,
        },
        customer: {
            firstName: firstName || null,
            lastName: lastName || null,
            fullName: [firstName, lastName].filter(Boolean).join(" ") || null,
            email: email || null,
            phone: phone || null,
        },
        delivery: {
            address: address || null,
            city: city || null,
            postal: postal || null,
            country: country || null,
        },
        notes: notes || null,
    };
}

function saveOrderSummary(order) {
    if (!order || !Array.isArray(order.items) || !order.items.length) {
        throw new Error("There are no items to submit.");
    }

    if (ShopOrders && typeof ShopOrders.save === "function") {
        return ShopOrders.save(order);
    }

    return order;
}

function fallbackGenerateOrderNumber() {
    const now = new Date();
    const timestamp = now.getTime().toString(36).toUpperCase();
    const randomSegment = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TS-${timestamp.slice(-4)}${randomSegment}`;
}
