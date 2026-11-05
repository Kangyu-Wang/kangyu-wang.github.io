// The fragment links handle opening and closing. Add keyboard and focus support.
(() => {
  const viewer = document.getElementById("photo-view");
  const trigger = document.getElementById("portrait-trigger");
  const closeLink = viewer.querySelector(".photo-close");
  const page = document.querySelector(".spread");

  function syncFocus() {
    const open = viewer.matches(":target");
    page.inert = open;
    if (open) closeLink.focus({ preventScroll: true });
    else if (location.hash === "#portrait-trigger") trigger.focus({ preventScroll: true });
  }

  viewer.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLink.click();
    } else if (event.key === "Tab") {
      event.preventDefault();
      closeLink.focus();
    }
  });
  window.addEventListener("hashchange", syncFocus);
  window.addEventListener("pageshow", syncFocus);
})();
