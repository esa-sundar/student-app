(() => {
  const SA = (window.SA = window.SA || {});

  const $ = (sel, root = document) => root.querySelector(sel);

  // Reports
  const rep = {
    month: $("#reportMonth"),
    refreshBtn: $("#refreshReportsBtn"),
    total: $("#reportTotal"),
    paidCount: $("#reportPaidCount"),
    unpaidCount: $("#reportUnpaidCount"),
    paidList: $("#reportPaidList"),
    unpaidList: $("#reportUnpaidList"),
  };

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const FEE_PER_MONTH = 450;

  function formatMoney(n) {
    const v = Number(n) || 0;
    try {
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v);
    } catch {
      return String(v);
    }
  }

  function monthsFromJoinToReport(dateOfJoining, reportYyyyMm) {
    if (!dateOfJoining || !reportYyyyMm) return 0;
    const [ry, rm] = reportYyyyMm.split("-").map(Number);
    const join = new Date(dateOfJoining);
    const jy = join.getFullYear();
    const jm = join.getMonth() + 1;
    return Math.max(0, (ry - jy) * 12 + (rm - jm) + 1);
  }

  function refreshReports() {
    const reportMonth = rep.month?.value || "";
    const students = SA.storage.getStudents().filter((s) => s.active);
    const d = SA.storage.getData();

    const totalCollected = d.payments
      .filter((p) => p?.month === reportMonth)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const paidThisMonthIds = new Set(
      d.payments.filter((p) => p?.month === reportMonth).map((p) => p.studentId)
    );
    const paidThisMonthStudents = students.filter((s) => paidThisMonthIds.has(s.id));

    const studentsWithDues = [];
    students.forEach((s) => {
      const totalMonths = monthsFromJoinToReport(s.dateOfJoining, reportMonth);
      const paidMonths = d.payments
        .filter((p) => p?.studentId === s.id && p?.month <= reportMonth)
        .reduce((sum, p) => sum + Math.max(0, Math.floor((Number(p.amount) || 0) / FEE_PER_MONTH)), 0);
      const unpaidMonths = Math.max(0, totalMonths - paidMonths);
      const dueAmount = unpaidMonths * FEE_PER_MONTH;
      if (unpaidMonths > 0) studentsWithDues.push({ ...s, unpaidMonths, dueAmount });
    });

    if (rep.total) rep.total.textContent = `₹ ${formatMoney(totalCollected)}`;
    if (rep.paidCount) rep.paidCount.textContent = String(paidThisMonthStudents.length);
    if (rep.unpaidCount) rep.unpaidCount.textContent = String(studentsWithDues.length);

    if (rep.paidList) {
      rep.paidList.innerHTML =
        paidThisMonthStudents.length === 0
          ? `<div class="muted">No payments for this month.</div>`
          : paidThisMonthStudents
              .map((s) => `<div class="card" style="padding:10px;">${escapeHtml(s.name)} <span class="muted">• Machine ${escapeHtml(s.machineNo)}</span></div>`)
              .join("");
    }

    if (rep.unpaidList) {
      rep.unpaidList.innerHTML =
        studentsWithDues.length === 0
          ? `<div class="muted">No dues.</div>`
          : studentsWithDues
              .map((s) => `<div class="card" style="padding:10px;">${escapeHtml(s.name)} <span class="muted">• Machine ${s.machineNo}</span> <strong>• Due: ₹${formatMoney(s.dueAmount)} (${s.unpaidMonths} month${s.unpaidMonths !== 1 ? "s" : ""})</strong></div>`)
              .join("");
    }
  }

  function initReports() {
    rep.refreshBtn?.addEventListener("click", refreshReports);
    rep.month?.addEventListener("change", refreshReports);
    refreshReports();
  }

  SA.reports = {
    init: initReports,
    refresh: refreshReports,
  };

  // Settings (backup/restore)
  const set = {
    exportBtn: $("#exportBtn"),
    downloadBtn: $("#downloadBackupBtn"),
    importBtn: $("#importBtn"),
    clearBtn: $("#clearBackupTextBtn"),
    resetBtn: $("#resetBtn"),
    text: $("#backupText"),
  };

  function setText(v) {
    if (!set.text) return;
    set.text.value = v;
  }

  function getText() {
    return set.text?.value || "";
  }

  function exportData() {
    const data = SA.storage.getData();
    setText(JSON.stringify(data, null, 2));
    SA.ui?.toast?.("Exported");
  }

  function downloadBackup() {
    const text = getText().trim() || JSON.stringify(SA.storage.getData(), null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
    a.href = url;
    a.download = `student-attendance-fees-backup-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importData() {
    const text = getText().trim();
    if (!text) return SA.ui?.toast?.("Paste backup JSON first");
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      return SA.ui?.toast?.("Invalid JSON");
    }
    if (!parsed || typeof parsed !== "object") return SA.ui?.toast?.("Invalid backup format");

    SA.storage.setData(() => parsed);
    SA.storage.init();
    SA.ui?.toast?.("Imported");

    SA.students?.refresh?.();
    SA.attendance?.refresh?.();
    SA.fees?.refresh?.();
    SA.receipts?.refresh?.();
    SA.reports?.refresh?.();
  }

  function resetAll() {
    const ok = confirm("Reset all data?\n\nThis deletes students, attendance, and payments from this browser.");
    if (!ok) return;
    localStorage.removeItem(SA.storage.KEY);
    SA.storage.init();
    setText("");
    SA.ui?.toast?.("Reset done");

    SA.students?.refresh?.();
    SA.attendance?.refresh?.();
    SA.fees?.refresh?.();
    SA.receipts?.refresh?.();
    SA.reports?.refresh?.();
  }

  function initSettings() {
    set.exportBtn?.addEventListener("click", exportData);
    set.downloadBtn?.addEventListener("click", downloadBackup);
    set.importBtn?.addEventListener("click", importData);
    set.clearBtn?.addEventListener("click", () => setText(""));
    set.resetBtn?.addEventListener("click", resetAll);
  }

  SA.settings = {
    init: initSettings,
    refresh() {},
  };
})();

