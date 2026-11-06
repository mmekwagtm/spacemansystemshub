import "@testing-library/jest-dom/vitest";

// jsdom has no layout; route changes scroll to the top in the browser only.
window.scrollTo = (() => undefined) as typeof window.scrollTo;
