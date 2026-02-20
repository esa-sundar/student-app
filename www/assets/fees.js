(() => {
  const SA = (window.SA = window.SA || {});

  const $ = (sel, root = document) => root.querySelector(sel);

  const els = {
    studentId: $("#payStudentId"),
    month: $("#payMonth"),
    amount: $("#payAmount"),
    paidDate: $("#payDate"),
    mode: $("#payMode"),
    notes: $("#payNotes"),
    allowDup: $("#allowDuplicatePayment"),
    saveBtn: $("#savePaymentBtn"),

    receiptCard: $("#paymentReceiptCard"),
    receiptPreview: $("#receiptPreview"),
    printBtn: $("#printReceiptBtn"),
    sendWhatsAppBtn: $("#sendWhatsAppBtn"),
    receiptHint: $("#receiptHint"),
    monthsCoveredHint: $("#monthsCoveredHint"),
  };

  const INSTITUTE_NAME = "Kirthika Technical Institute";
  const INSTITUTE_ADDRESS = "Senthamil Nagar, Pettai.";
  const FEE_PER_MONTH = 450;

  let lastPaymentId = null;

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatMoney(n) {
    const v = Number(n) || 0;
    try {
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v);
    } catch {
      return String(v);
    }
  }

  function monthLabel(yyyyMm) {
    if (!yyyyMm || !yyyyMm.includes("-")) return yyyyMm || "";
    const [y, m] = yyyyMm.split("-");
    const monthIndex = Number(m) - 1;
    const d = new Date(Number(y), monthIndex, 1);
    try {
      return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(d);
    } catch {
      return yyyyMm;
    }
  }

  function getUnpaidMonths(student, upToMonth) {
    if (!student || !student.dateOfJoining || !upToMonth) return [];
    const joinDate = new Date(student.dateOfJoining);
    const joinYear = joinDate.getFullYear();
    const joinMonth = joinDate.getMonth() + 1;
    const [toYear, toMonth] = upToMonth.split("-").map(Number);
    const unpaid = [];
    const d = SA.storage.getData();
    const paidMonths = new Set(
      d.payments
        .filter((p) => p?.studentId === student.id && p?.month <= upToMonth)
        .map((p) => p.month)
    );
    for (let y = joinYear; y <= toYear; y++) {
      const startM = y === joinYear ? joinMonth : 1;
      const endM = y === toYear ? toMonth : 12;
      for (let m = startM; m <= endM; m++) {
        const yyyyMm = `${y}-${String(m).padStart(2, "0")}`;
        if (!paidMonths.has(yyyyMm)) unpaid.push(yyyyMm);
      }
    }
    return unpaid;
  }

  function getMonthsCoveredByAmount(student, selectedMonth, amount) {
    if (!student || !selectedMonth || !amount) return [];
    const unpaid = getUnpaidMonths(student, selectedMonth);
    const monthsCount = Math.floor(amount / FEE_PER_MONTH);
    return unpaid.slice(-monthsCount);
  }

  function renderReceipt(payment, student) {
    let paidFor = monthLabel(payment.month);
    let totalAmount = payment.amount || 0;
    if (payment.monthsCovered && Array.isArray(payment.monthsCovered) && payment.monthsCovered.length > 1) {
      paidFor = payment.monthsCovered.map((m) => monthLabel(m)).join(", ");
      totalAmount = payment.totalAmount || payment.amount || 0;
    } else {
      const monthsCount = Math.floor((payment.amount || 0) / FEE_PER_MONTH);
      if (monthsCount > 1) {
        const [y, m] = payment.month.split("-").map(Number);
        const months = [];
        for (let i = 0; i < monthsCount; i++) {
          const d = new Date(y, m - 1 + i, 1);
          months.push(monthLabel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`));
        }
        paidFor = months.join(", ");
        totalAmount = payment.amount || 0;
      }
    }
    const paidDate = payment.paidDateISO || "";
    return `
      <div class="receipt-header">
        <div>
          <div class="receipt-title">Fee Receipt</div>
          <div class="muted">${escapeHtml(INSTITUTE_NAME)}</div>
          <div class="receipt-address">${escapeHtml(INSTITUTE_ADDRESS)}</div>
        </div>
        <div class="receipt-meta">
          <div><strong>${escapeHtml(payment.receiptNo)}</strong></div>
          <div>${escapeHtml(paidDate)}</div>
        </div>
      </div>

      <div class="receipt-grid">
        <div class="receipt-line">
          <div class="receipt-label">Student name</div>
          <div class="receipt-value">${escapeHtml(student.name)}</div>
        </div>
        <div class="receipt-line">
          <div class="receipt-label">Class</div>
          <div class="receipt-value">${escapeHtml(student.className)}</div>
        </div>
        <div class="receipt-line">
          <div class="receipt-label">Timing</div>
          <div class="receipt-value">${escapeHtml(student.timing)}</div>
        </div>
        <div class="receipt-line">
          <div class="receipt-label">Machine no</div>
          <div class="receipt-value">${escapeHtml(student.machineNo)}</div>
        </div>
        <div class="receipt-line">
          <div class="receipt-label">Fees for</div>
          <div class="receipt-value">${escapeHtml(paidFor)}</div>
        </div>
        <div class="receipt-line">
          <div class="receipt-label">Payment mode</div>
          <div class="receipt-value">${escapeHtml(payment.mode || "")}</div>
        </div>
        <div class="receipt-line">
          <div class="receipt-label">Amount paid</div>
          <div class="receipt-value">₹ ${escapeHtml(formatMoney(totalAmount))}</div>
        </div>
        <div class="receipt-line">
          <div class="receipt-label">Notes</div>
          <div class="receipt-value">${escapeHtml(payment.notes || "-")}</div>
        </div>
      </div>
    `;
  }

  function receiptMessageBody(payment, student) {
    let paidFor = monthLabel(payment.month);
    let totalAmount = payment.amount || 0;
    if (payment.monthsCovered && Array.isArray(payment.monthsCovered) && payment.monthsCovered.length > 1) {
      paidFor = payment.monthsCovered.map((m) => monthLabel(m)).join(", ");
      totalAmount = payment.totalAmount || payment.amount || 0;
    } else {
      const monthsCount = Math.floor((payment.amount || 0) / FEE_PER_MONTH);
      if (monthsCount > 1) {
        const [y, m] = payment.month.split("-").map(Number);
        const months = [];
        for (let i = 0; i < monthsCount; i++) {
          const d = new Date(y, m - 1 + i, 1);
          months.push(monthLabel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`));
        }
        paidFor = months.join(", ");
        totalAmount = payment.amount || 0;
      }
    }
    const amt = formatMoney(totalAmount);
    return `${INSTITUTE_NAME}\n${INSTITUTE_ADDRESS}\n\nFee Receipt: ${payment.receiptNo}\nStudent: ${student.name}\nClass: ${student.className}\nFees for: ${paidFor}\nAmount: ₹${amt}\nPaid on: ${payment.paidDateISO || ""}\nMode: ${payment.mode || ""}`;
  }

  function openPrintWindow(html, title, autoPrint = true) {
    const w = window.open("", "_blank");
    if (!w) {
      SA.ui?.toast?.("Popup blocked. Allow popups to print.");
      return;
    }
    w.document.open();
    w.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>${escapeHtml(title || "Receipt")}</title>
          <link rel="stylesheet" href="assets/styles.css" />
        </head>
        <body>
          <div class="receipt">${html}</div>
          <script>
            window.addEventListener('load', () => {
              ${autoPrint ? "window.print();" : ""}
            });
          </script>
        </body>
      </html>`);
    w.document.close();
  }

  function populateStudentSelect() {
    if (!els.studentId) return;
    const students = SA.storage.getStudents().filter((s) => s.active);
    els.studentId.innerHTML = "";
    if (students.length === 0) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "No students (add students first)";
      els.studentId.append(o);
      els.studentId.disabled = true;
      return;
    }
    els.studentId.disabled = false;
    for (const s of students) {
      const o = document.createElement("option");
      o.value = s.id;
      o.textContent = `${s.name} (${s.className}, Machine ${s.machineNo})`;
      els.studentId.append(o);
    }
  }

  function updateMonthsCoveredHint() {
    const studentId = els.studentId?.value || "";
    const month = els.month?.value || "";
    const amount = Number(els.amount?.value) || 0;
    if (!els.monthsCoveredHint) return;
    if (!studentId || !month || amount < FEE_PER_MONTH) {
      els.monthsCoveredHint.textContent = "";
      return;
    }
    const student = SA.storage.getStudentById(studentId);
    if (!student) {
      els.monthsCoveredHint.textContent = "";
      return;
    }
    const months = getMonthsCoveredByAmount(student, month, amount);
    if (months.length === 0) {
      els.monthsCoveredHint.textContent = "All months up to selected month are already paid.";
      return;
    }
    const labels = months.map((m) => monthLabel(m));
    els.monthsCoveredHint.textContent = `This payment covers: ${labels.join(", ")}`;
  }

  function onStudentChanged() {
    const id = els.studentId?.value || "";
    if (!id) {
      if (els.amount) els.amount.value = String(FEE_PER_MONTH);
      updateMonthsCoveredHint();
      return;
    }
    if (els.amount) els.amount.value = String(FEE_PER_MONTH);
    updateMonthsCoveredHint();
  }

  function findExistingPayment(studentId, month) {
    const d = SA.storage.getData();
    return d.payments.find((p) => p?.studentId === studentId && p?.month === month) || null;
  }

  function savePayment() {
    const studentId = els.studentId?.value || "";
    const month = els.month?.value || "";
    const amount = Number(els.amount?.value);
    const paidDateISO = els.paidDate?.value || "";
    const mode = els.mode?.value || "Cash";
    const notes = (els.notes?.value || "").trim();
    const allowDup = Boolean(els.allowDup?.checked);

    const student = SA.storage.getStudentById(studentId);
    if (!studentId || !student) return SA.ui?.toast?.("Select a student");
    if (!month) return SA.ui?.toast?.("Select a month");
    if (!Number.isFinite(amount) || amount < FEE_PER_MONTH) return SA.ui?.toast?.(`Amount must be at least ₹${FEE_PER_MONTH}`);
    if (!paidDateISO) return SA.ui?.toast?.("Select paid date");

    const monthsToPay = getMonthsCoveredByAmount(student, month, amount);
    if (monthsToPay.length === 0) {
      SA.ui?.toast?.("All months up to selected month are already paid.");
      return;
    }
    const monthsCount = monthsToPay.length;
    const amountPerMonth = FEE_PER_MONTH;

    let saved = null;
    SA.storage.setData((d) => {
      const receiptNo = SA.storage.allocReceiptNoInPlace(d);
      const paymentsToCreate = [];
      for (let i = 0; i < monthsToPay.length; i++) {
        const payMonth = monthsToPay[i];
        const existing = d.payments.find((p) => p?.studentId === studentId && p?.month === payMonth);
        if (existing && !allowDup) {
          SA.ui?.toast?.(`Already paid for ${monthLabel(payMonth)} (enable overwrite)`);
          return d;
        }
        const isFirst = i === 0;
        const payment = {
          id: existing?.id || SA.storage.uuid(),
          studentId,
          month: payMonth,
          amount: amountPerMonth,
          ...(isFirst ? { totalAmount: amount, monthsCovered: monthsToPay } : {}),
          paidDateISO,
          mode,
          notes: isFirst ? notes : `${notes ? notes + " " : ""}(Part of ${monthsCount}-month payment)`,
          receiptNo: isFirst ? receiptNo : `${receiptNo}-${i + 1}`,
          createdAt: existing?.createdAt || SA.storage.nowISO(),
          updatedAt: SA.storage.nowISO(),
        };
        if (existing) {
          const idx = d.payments.findIndex((p) => p.id === existing.id);
          d.payments[idx] = { ...d.payments[idx], ...payment };
        } else {
          paymentsToCreate.push(payment);
        }
        if (isFirst) saved = payment;
      }
      d.payments.unshift(...paymentsToCreate);
      return d;
    });

    lastPaymentId = saved?.id || null;
    showReceipt(saved);
    SA.ui?.toast?.("Payment saved");
    SA.receipts?.refresh?.();
    SA.reports?.refresh?.();
  }

  function showReceipt(payment) {
    if (!payment) return;
    const student = SA.storage.getStudentById(payment.studentId);
    if (!student) return;
    if (els.receiptPreview) els.receiptPreview.innerHTML = renderReceipt(payment, student);
    if (els.receiptHint) els.receiptHint.textContent = `Saved for ${monthLabel(payment.month)}.`;
    els.receiptCard?.classList.remove("hidden");
  }

  function hideReceiptPreview() {
    els.receiptCard?.classList.add("hidden");
  }

  function printLastReceipt() {
    if (!lastPaymentId) {
      SA.ui?.toast?.("No receipt to print");
      return;
    }
    const d = SA.storage.getData();
    const payment = d.payments.find((p) => p.id === lastPaymentId);
    if (!payment) return SA.ui?.toast?.("Receipt not found");
    const student = SA.storage.getStudentById(payment.studentId);
    if (!student) return SA.ui?.toast?.("Student not found");
    openPrintWindow(renderReceipt(payment, student), payment.receiptNo, true);
    hideReceiptPreview();
  }

  function normalizePhoneForApi(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 10 && /^[6-9]/.test(digits)) return "91" + digits;
    if (digits.length === 12 && digits.startsWith("91")) return digits;
    return digits.length >= 10 ? digits : null;
  }

  function initHandlers() {
    els.studentId?.addEventListener("change", onStudentChanged);
    els.month?.addEventListener("change", updateMonthsCoveredHint);
    els.amount?.addEventListener("input", updateMonthsCoveredHint);
    els.saveBtn?.addEventListener("click", savePayment);
    els.printBtn?.addEventListener("click", printLastReceipt);
    els.sendWhatsAppBtn?.addEventListener("click", sendReceiptWhatsApp);
  }

  function openWhatsAppWithReceipt(payment, student) {
    const mobile = (student.mobile || "").trim().replace(/\D/g, "");
    if (!mobile || mobile.length < 10) return;
    const body = receiptMessageBody(payment, student);
    const num = mobile.length === 10 && /^[6-9]/.test(mobile) ? "91" + mobile : mobile.length === 12 && mobile.startsWith("91") ? mobile : mobile;
    const url = `https://wa.me/${num}?text=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
  }

  function sendReceiptWhatsApp() {
    if (!lastPaymentId) {
      SA.ui?.toast?.("No receipt to send");
      return;
    }
    const d = SA.storage.getData();
    const payment = d.payments.find((p) => p.id === lastPaymentId);
    if (!payment) return SA.ui?.toast?.("Receipt not found");
    const student = SA.storage.getStudentById(payment.studentId);
    if (!student) return SA.ui?.toast?.("Student not found");
    const mobile = (student.mobile || "").trim().replace(/\D/g, "");
    if (!mobile) {
      SA.ui?.toast?.("Add mobile number to student to send WhatsApp");
      return;
    }
    openWhatsAppWithReceipt(payment, student);
    SA.ui?.toast?.("Opening WhatsApp – tap Send to deliver");
    hideReceiptPreview();
  }

  function init() {
    populateStudentSelect();
    initHandlers();
    onStudentChanged();
  }

  function refresh() {
    populateStudentSelect();
    onStudentChanged();
  }

  SA.fees = { init, refresh, renderReceipt, openPrintWindow };
})();

