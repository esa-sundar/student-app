(() => {
  const SA = (window.SA = window.SA || {});

  const CLASSES = ["Junior", "Senior"];
  const TIMINGS = [
    "6.30 am - 7.30 am",
    "7.30 am - 8.30 am",
    "8.30 am - 9.30 am",
    "5.00 pm - 6.00 pm",
    "6.00 pm - 7.00 pm",
    "7.00 pm - 8.00 pm",
    "8.00 pm - 9.00 pm",
  ];
  const MACHINES = [1, 2, 3, 4, 5];

  const $ = (sel, root = document) => root.querySelector(sel);

  const els = {
    list: $("#studentsList"),
    empty: $("#studentsEmpty"),
    search: $("#studentSearch"),
    filterClass: $("#filterClass"),
    filterTiming: $("#filterTiming"),
    filterMachine: $("#filterMachine"),

    dialog: $("#studentDialog"),
    form: $("#studentForm"),
    dialogTitle: $("#studentDialogTitle"),
    closeBtn: $("#closeStudentDialogBtn"),
    cancelBtn: $("#cancelStudentBtn"),

    id: $("#studentId"),
    name: $("#studentName"),
    mobile: $("#studentMobile"),
    className: $("#studentClass"),
    timing: $("#studentTiming"),
    machine: $("#studentMachine"),
    doj: $("#studentDoj"),
    fee: $("#studentFee"),
  };

  function opt(value, label) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label ?? value;
    return o;
  }

  function fillStaticSelect(selectEl, items, placeholder) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    if (placeholder != null) selectEl.append(opt("", placeholder));
    for (const it of items) selectEl.append(opt(String(it), String(it)));
  }

  function fillStudentFormSelects() {
    fillStaticSelect(els.className, CLASSES, null);
    fillStaticSelect(els.timing, TIMINGS, null);
    fillStaticSelect(els.machine, MACHINES, null);
  }

  function fillFilterSelects() {
    fillStaticSelect(els.filterClass, CLASSES, "All classes");
    fillStaticSelect(els.filterTiming, TIMINGS, "All timings");
    fillStaticSelect(els.filterMachine, MACHINES, "All machines");
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatMoney(n) {
    try {
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(n) || 0);
    } catch {
      return String(n);
    }
  }

  function matches(student, q) {
    if (!q) return true;
    const hay = `${student.name} ${student.className} ${student.timing} ${student.machineNo} ${student.mobile || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function filteredStudents() {
    const all = SA.storage.getStudents();
    const q = (els.search?.value || "").trim();
    const fClass = els.filterClass?.value || "";
    const fTiming = els.filterTiming?.value || "";
    const fMachine = els.filterMachine?.value || "";

    return all.filter((s) => {
      if (!s.active) return false;
      if (fClass && s.className !== fClass) return false;
      if (fTiming && s.timing !== fTiming) return false;
      if (fMachine && String(s.machineNo) !== String(fMachine)) return false;
      if (!matches(s, q)) return false;
      return true;
    });
  }

  function render() {
    const students = filteredStudents();
    if (els.empty) els.empty.classList.toggle("hidden", students.length !== 0);
    if (!els.list) return;

    els.list.innerHTML = students
      .map((s) => {
        const name = escapeHtml(s.name);
        const sub = escapeHtml(`${s.className} • ${s.timing}`);
        const fee = formatMoney(s.monthlyFee);
        const mobileDisplay = s.mobile ? escapeHtml(s.mobile) : "";
        return `
          <div class="card student-card" data-student-id="${escapeHtml(s.id)}">
            <div class="student-top">
              <div>
                <div class="student-name">${name}</div>
                <div class="student-sub">${sub}</div>
                <div class="row" style="margin-top:10px; gap:8px; flex-wrap:wrap;">
                  <span class="pill">Machine ${escapeHtml(s.machineNo)}</span>
                  <span class="pill">₹ ${escapeHtml(fee)}/month</span>
                  ${mobileDisplay ? `<span class="pill">${mobileDisplay}</span>` : ""}
                </div>
              </div>
              <div class="student-actions">
                <button class="btn" type="button" data-action="edit">Edit</button>
                <button class="btn btn-danger" type="button" data-action="delete">Delete</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    els.list.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        const card = btn.closest("[data-student-id]");
        const id = card?.getAttribute("data-student-id");
        if (!id) return;
        if (action === "edit") openEditDialog(id);
        if (action === "delete") onDelete(id);
      });
    });
  }

  function resetForm() {
    if (els.id) els.id.value = "";
    if (els.name) els.name.value = "";
    if (els.mobile) els.mobile.value = "";
    if (els.className) els.className.value = CLASSES[0];
    if (els.timing) els.timing.value = TIMINGS[0];
    if (els.machine) els.machine.value = String(MACHINES[0]);
    if (els.doj && !els.doj.value) els.doj.value = SA.ui?.todayISO?.() || "";
    if (els.fee) els.fee.value = "450";
  }

  function openAddDialog() {
    fillStudentFormSelects();
    if (els.dialogTitle) els.dialogTitle.textContent = "Add student";
    resetForm();
    els.dialog?.showModal?.();
  }

  function openEditDialog(studentId) {
    fillStudentFormSelects();
    const s = SA.storage.getStudentById(studentId);
    if (!s) {
      SA.ui?.toast?.("Student not found");
      return;
    }
    if (els.dialogTitle) els.dialogTitle.textContent = "Edit student";
    if (els.id) els.id.value = s.id;
    if (els.name) els.name.value = s.name || "";
    if (els.mobile) els.mobile.value = s.mobile || "";
    if (els.className) els.className.value = s.className || CLASSES[0];
    if (els.timing) els.timing.value = s.timing || TIMINGS[0];
    if (els.machine) els.machine.value = String(s.machineNo ?? MACHINES[0]);
    if (els.doj) els.doj.value = s.dateOfJoining || "";
    if (els.fee) els.fee.value = String(s.monthlyFee ?? 450);
    els.dialog?.showModal?.();
  }

  function closeDialog() {
    try {
      els.dialog?.close?.();
    } catch {
      // ignore
    }
  }

  function onDelete(studentId) {
    const s = SA.storage.getStudentById(studentId);
    const ok = confirm(`Delete ${s?.name || "this student"}?\n\nThis also removes their attendance and payments.`);
    if (!ok) return;
    SA.storage.deleteStudent(studentId);
    SA.ui?.toast?.("Deleted");
    render();
    SA.attendance?.refresh?.();
    SA.fees?.refresh?.();
    SA.receipts?.refresh?.();
    SA.reports?.refresh?.();
  }

  function onSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        id: (els.id?.value || "").trim() || undefined,
        name: els.name?.value,
        mobile: (els.mobile?.value || "").trim(),
        className: els.className?.value,
        timing: els.timing?.value,
        machineNo: Number(els.machine?.value),
        dateOfJoining: els.doj?.value,
        monthlyFee: Number(els.fee?.value),
      };
      SA.storage.upsertStudent(payload);
      SA.ui?.toast?.("Saved");
      closeDialog();
      render();
      SA.attendance?.refresh?.();
      SA.fees?.refresh?.();
      SA.reports?.refresh?.();
    } catch (err) {
      SA.ui?.toast?.(err?.message || "Could not save student");
    }
  }

  function initHandlers() {
    els.search?.addEventListener("input", render);
    els.filterClass?.addEventListener("change", render);
    els.filterTiming?.addEventListener("change", render);
    els.filterMachine?.addEventListener("change", render);

    els.closeBtn?.addEventListener("click", closeDialog);
    els.cancelBtn?.addEventListener("click", closeDialog);
    els.form?.addEventListener("submit", onSubmit);
  }

  function init() {
    fillFilterSelects();
    initHandlers();
    render();
  }

  function refresh() {
    fillFilterSelects();
    render();
  }

  SA.students = {
    init,
    refresh,
    openAddDialog,
    CLASSES,
    TIMINGS,
    MACHINES,
  };
})();

