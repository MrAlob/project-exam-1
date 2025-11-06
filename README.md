# The Shop Frontend

Single-page storefront prototype built for Project Exam 1. The goal is to demonstrate how to consume the Noroff Online Shop API, render product lists, and show individual product information while keeping accessibility and clean structure in focus.

## Key Features
- Fetches the latest 12 products on the homepage and displays them in both a carousel and card grid.
- Product detail page reads `?id=` from the query string, fetches full data for that product, and shows price, discount, tags, and imagery.
- Shared helpers (`js/utils/dom.js`) manage repeated tasks such as price formatting, tag display, and live status updates for assistive tech.
- Cart page renders stored items, totals, and empty-state messaging (localStorage based).
- Placeholder flows for checkout, login, register, and success pages to outline future expansion.
- Styling kept lightweight and responsive with a single shared stylesheet and BEM-inspired class names.

## Getting Started
1. Install the VS Code Live Server extension (or use any static HTTP server).
2. Open the project folder in VS Code.
3. Right-click `index.html` and choose **Open with Live Server**.
4. Navigate to a product via the homepage to test `product.html?id=...`.

The project talks to `https://api.noroff.dev/api/v1/online-shop`. No additional setup is required while the API is publicly available.

## Accessibility Notes
- Landmarks (`header`, `nav`, `main`, `footer`) and clear heading hierarchy aid screen-reader navigation.
- Carousel and product list use polite live regions plus status text to announce loading states.
- Focus styles rely on browser defaults.
- Run Lighthouse and Firefox DevTools after changes to confirm accessibility.

## Project Structure
```
project-exam-1/
├── css/
│   └── styles.css          # Shared site-wide styles
├── js/
│   ├── home.js             # Homepage carousel + product grid logic
│   ├── product.js          # Product detail page logic
│   ├── cart.js             # Shopping cart rendering and totals
│   └── utils/
│       └── dom.js          # Reusable helpers for price, tags, and DOM updates
├── account/
│   ├── login.html          # Account sign-in placeholder
│   └── register.html       # Account sign-up placeholder
├── index.html              # Homepage showing latest products
├── product.html            # Product detail template (expects ?id= in URL)
├── cart.html               # Placeholder for future cart flow
├── checkout.html           # Placeholder for checkout flow
└── success.html            # Placeholder confirmation page
```


