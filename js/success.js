const orderNumberOutput = document.querySelector("[data-order-number]");
const yearOutput = document.querySelector("[data-year]");

if (orderNumberOutput) {
    const orderNumber = generateOrderNumber();
    orderNumberOutput.textContent = orderNumber;
}

if (yearOutput) {
    yearOutput.textContent = new Date().getFullYear();
}

function generateOrderNumber() {
    const now = new Date();
    const timestamp = now.getTime().toString(36).toUpperCase();
    const randomSegment = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TS-${timestamp.slice(-4)}${randomSegment}`;
}
