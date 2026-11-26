/** Anchor + "load now" signal shared by the header rating link and the lazy reviews mount. */

export const PRODUCT_REVIEWS_ANCHOR_ID = 'reviews';

/** Fired by the header rating link to load the section before scrolling to it. */
export const REVIEWS_REQUEST_EVENT = 'allura:reviews-request-load';

export const scrollToProductReviews = () => {
  window.dispatchEvent(new Event(REVIEWS_REQUEST_EVENT));
  requestAnimationFrame(() => {
    document.getElementById(PRODUCT_REVIEWS_ANCHOR_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
};
