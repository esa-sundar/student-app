(() => {
  const SA = (window.SA = window.SA || {});

  const $ = (sel, root = document) => root.querySelector(sel);

  const els = {
    list: $("#receiptsList"),
    empty: $("#receiptsEmpty"),
    search: $("#receiptSearch"),
  };

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function monthLabel(yyyyMm) {
    if (!yyyyMm || !yyyyMm.includes("-")) return yyyyMm || "";
    const [y, m] = yyyyMm.split("-");
    const monthIndex = Number(m) - 1;
    const d = new Date(Number(y), monthIndex, 1);
    try {
      return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(d);
    } catch {
      return yyyyMm;
    }
  }

  function filteredPayments() {
    const q = (els.search?.value || "").trim().toLowerCase();
    const d = SA.storage.getData();
    const payments = d.payments.slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    if (!q) return payments;

    return payments.filter((p) => {
      const student = SA.storage.getStudentById(p.studentId);
      const hay = `${p.receiptNo || ""} ${p.month || ""} ${student?.name || ""} ${student?.className || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function view(paymentId, autoPrint) {
    const d = SA.storage.getData();
    const p = d.payments.find((x) => x.id === paymentId);
    if (!p) return SA.ui?.toast?.("Receipt not found");
    const s = SA.storage.getStudentById(p.studentId);
    if (!s) return SA.ui?.toast?.("Student not found");

    const html = SA.fees?.renderReceipt?.(p, s);
    if (!html) return SA.ui?.toast?.("Receipt renderer not ready");
    SA.fees.openPrintWindow(html, p.receiptNo, autoPrint);
  }

  function render() {
    if (!els.list) return;
    const payments = filteredPayments();
    if (els.empty) els.empty.classList.toggle("hidden", payments.length !== 0);

    els.list.innerHTML = payments
      .map((p) => {
        const s = SA.storage.getStudentById(p.studentId);
        const title = `${p.receiptNo || ""}`;
        const sub = `${s?.name || "Unknown"} • ${monthLabel(p.month)} • ₹ ${p.amount || 0}`;
        return `
          <div class="card receipt-item" data-payment-id="${escapeHtml(p.id)}">
            <div>
              <div class="receipt-no">${escapeHtml(title)}</div>
              <div class="receipt-sub">${escapeHtml(sub)}</div>
            </div>
            <div class="row">
              <button class="btn" type="button" data-action="view">View</button>
              <button class="btn btn-primary" type="button" data-action="print">Print</button>
            </div>
          </div>
        `;
      })
      .join("");

    els.list.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        const card = btn.closest("[data-payment-id]");
        const id = card?.getAttribute("data-payment-id");
        if (!id) return;
        if (action === "view") view(id, false);
        if (action === "print") view(id, true);
      });
    });
  }

  function initHandlers() {
    els.search?.addEventListener("input", render);
  }

  function init() {
    initHandlers();
    render();
  }

  function refresh() {
    render();
  }

  SA.receipts = { init, refresh };
})();

