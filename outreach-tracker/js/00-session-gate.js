    /* ============================================================
       PART 0 — Boot gate
       Inside the Operating System the tracker has no login of its own:
       it is shown in a frame on the Creative Outreach page and keeps its
       data in the OS's Firebase project (see the module script in
       index.html, which sets up window.crmStore). bootApp() (which loads
       data and renders the first view) is invoked exactly once, after
       every script has loaded.
       ============================================================ */
    const authGateEl = document.getElementById("auth-gate");
    const crmShellEl = document.getElementById("crm-shell");
    const authLoadingEl = document.getElementById("auth-loading");

    let appBooted = false;
    (async function initSession() {
      // This file loads first; bootApp() and everything it needs live in the
      // later js/ files. DOMContentLoaded fires only after every classic
      // <script> and the Firebase module script have executed, so waiting
      // for it guarantees the whole app and window.crmStore are defined.
      if (document.readyState === "loading") {
        await new Promise(resolve =>
          document.addEventListener("DOMContentLoaded", resolve, { once: true }));
      }
      authGateEl.style.display = "none";
      crmShellEl.style.display = "";
      if (!appBooted) {
        try {
          await bootApp();
          appBooted = true;
        } catch (err) {
          console.error("Failed to load Outreach Tracker data:", err);
          crmShellEl.style.display = "none";
          authGateEl.style.display = "flex";
          authLoadingEl.style.display = "";
          authLoadingEl.textContent = `Couldn't load your data (${err.message || err}). Reload this page to try again.`;
        }
      }
    })();
