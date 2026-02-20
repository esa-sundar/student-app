(() => {
  const SA = (window.SA = window.SA || {});

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const els = {
    subtitle: $("#appSubtitle"),
    menuBtn: $("#menuBtn"),
    drawer: $("#drawer"),
    closeDrawerBtn: $("#closeDrawerBtn"),
    backdrop: $("#backdrop"),
    quickAddBtn: $("#quickAddBtn"),
    toast: $("#toast"),
  };

  let currentRoute = "students";

  function todayISO() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function monthISO() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }

  function toast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.remove("hidden");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => els.toast.classList.add("hidden"), 2400);
  }

  function openDrawer() {
    els.drawer?.classList.remove("hidden");
    els.backdrop?.classList.remove("hidden");
    els.menuBtn?.setAttribute("aria-expanded", "true");
  }

  function closeDrawer() {
    els.drawer?.classList.add("hidden");
    els.backdrop?.classList.add("hidden");
    els.menuBtn?.setAttribute("aria-expanded", "false");
  }

  function setRoute(route) {
    const viewId = `#view-${route}`;
    const view = $(viewId);
    if (!view) return;

    currentRoute = route;

    $$(".view").forEach((v) => v.classList.add("hidden"));
    view.classList.remove("hidden");

    $$(".nav-link").forEach((b) => b.classList.toggle("active", b.dataset.route === route));

    if (els.subtitle) {
      const label = route === "fees" ? "Fees / Payments" : route === "reports" ? "Fees Report" : route.charAt(0).toUpperCase() + route.slice(1);
      els.subtitle.textContent = label;
    }

    closeDrawer();

    const refreshers = {
      students: () => SA.students?.refresh?.(),
      attendance: () => SA.attendance?.refresh?.(),
      fees: () => SA.fees?.refresh?.(),
      receipts: () => SA.receipts?.refresh?.(),
      reports: () => SA.reports?.refresh?.(),
      settings: () => SA.settings?.refresh?.(),
    };
    refreshers[route]?.();
  }

  function initDefaults() {
    const attDate = $("#attendanceDate");
    if (attDate && !attDate.value) attDate.value = todayISO();

    const payDate = $("#payDate");
    if (payDate && !payDate.value) payDate.value = todayISO();

    const payMonth = $("#payMonth");
    if (payMonth && !payMonth.value) payMonth.value = monthISO();

    const reportMonth = $("#reportMonth");
    if (reportMonth && !reportMonth.value) reportMonth.value = monthISO();
  }

  function initNav() {
    els.menuBtn?.addEventListener("click", () => openDrawer());
    els.closeDrawerBtn?.addEventListener("click", () => closeDrawer());
    els.backdrop?.addEventListener("click", () => closeDrawer());

    $$(".nav-link").forEach((btn) => {
      btn.addEventListener("click", () => setRoute(btn.dataset.route));
    });

    els.quickAddBtn?.addEventListener("click", () => {
      if (currentRoute === "students") {
        SA.students?.openAddDialog?.();
        return;
      }
      setRoute("students");
      SA.students?.openAddDialog?.();
    });
  }

  function init() {
    SA.ui = { toast, setRoute, todayISO, monthISO };

    initDefaults();
    initNav();

    try {
      SA.storage?.init?.();
    } catch (e) {
      // ignore; storage layer will display errors later if needed
    }

    SA.students?.init?.();
    SA.attendance?.init?.();
    SA.fees?.init?.();
    SA.receipts?.init?.();
    SA.reports?.init?.();
    SA.settings?.init?.();

    setRoute("students");
    toast("Ready");
  }

  window.addEventListener("DOMContentLoaded", init);
})();

