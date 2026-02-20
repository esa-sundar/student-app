(() => {
  const SA = (window.SA = window.SA || {});

  const $ = (sel, root = document) => root.querySelector(sel);

  const els = {
    date: $("#attendanceDate"),
    saveBtn: $("#saveAttendanceBtn"),
    list: $("#attendanceList"),
    empty: $("#attendanceEmpty"),
    filterClass: $("#attFilterClass"),
    filterTiming: $("#attFilterTiming"),
    filterMachine: $("#attFilterMachine"),
  };

  let statusMap = new Map(); // studentId -> "P"|"A"

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

  function fillFilters() {
    fillStaticSelect(els.filterClass, SA.students?.CLASSES || [], "All classes");
    fillStaticSelect(els.filterTiming, SA.students?.TIMINGS || [], "All timings");
    fillStaticSelect(els.filterMachine, SA.students?.MACHINES || [], "All machines");
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function loadForDate(dateISO) {
    statusMap = new Map();
    const d = SA.storage.getData();
    for (const a of d.attendance) {
      if (a?.dateISO === dateISO && (a.status === "P" || a.status === "A") && a.studentId) {
        statusMap.set(a.studentId, a.status);
      }
    }
  }

  function filteredStudents() {
    const all = SA.storage.getStudents();
    const fClass = els.filterClass?.value || "";
    const fTiming = els.filterTiming?.value || "";
    const fMachine = els.filterMachine?.value || "";
    return all.filter((s) => {
      if (!s.active) return false;
      if (fClass && s.className !== fClass) return false;
      if (fTiming && s.timing !== fTiming) return false;
      if (fMachine && String(s.machineNo) !== String(fMachine)) return false;
      return true;
    });
  }

  function setStatus(studentId, status) {
    if (status === "P" || status === "A") statusMap.set(studentId, status);
    render();
  }

  function render() {
    if (!els.list) return;
    const dateISO = els.date?.value || "";
    const students = filteredStudents();

    if (els.empty) els.empty.classList.toggle("hidden", students.length !== 0);
    if (!dateISO) {
      els.list.innerHTML = `<div class="card muted">Select a date to mark attendance.</div>`;
      return;
    }

    els.list.innerHTML = students
      .map((s) => {
        const st = statusMap.get(s.id) || "";
        const name = escapeHtml(s.name);
        const sub = escapeHtml(`${s.className} • ${s.timing} • Machine ${s.machineNo}`);
        return `
          <div class="card att-row" data-student-id="${escapeHtml(s.id)}">
            <div>
              <div class="student-name">${name}</div>
              <div class="student-sub">${sub}</div>
            </div>
            <div class="att-actions">
              <button class="att-btn ${st === "P" ? "active" : ""}" type="button" data-status="P">Present</button>
              <button class="att-btn ${st === "A" ? "active" : ""}" type="button" data-status="A">Absent</button>
            </div>
          </div>
        `;
      })
      .join("");

    els.list.querySelectorAll("[data-status]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest("[data-student-id]");
        const studentId = card?.getAttribute("data-student-id");
        const status = btn.getAttribute("data-status");
        if (!studentId || !status) return;
        setStatus(studentId, status);
      });
    });
  }

  function save() {
    const dateISO = els.date?.value || "";
    if (!dateISO) {
      SA.ui?.toast?.("Select a date");
      return;
    }

    const entries = Array.from(statusMap.entries());
    SA.storage.setData((d) => {
      const keep = d.attendance.filter((a) => a?.dateISO !== dateISO);
      const next = entries.map(([studentId, status]) => ({
        id: SA.storage.uuid(),
        dateISO,
        studentId,
        status,
        createdAt: SA.storage.nowISO(),
      }));
      d.attendance = keep.concat(next);
      return d;
    });

    SA.ui?.toast?.("Attendance saved");
  }

  function onDateChanged() {
    const dateISO = els.date?.value || "";
    if (!dateISO) {
      statusMap = new Map();
      render();
      return;
    }
    loadForDate(dateISO);
    render();
  }

  function initHandlers() {
    els.date?.addEventListener("change", onDateChanged);
    els.saveBtn?.addEventListener("click", save);
    els.filterClass?.addEventListener("change", render);
    els.filterTiming?.addEventListener("change", render);
    els.filterMachine?.addEventListener("change", render);
  }

  function init() {
    fillFilters();
    initHandlers();
    onDateChanged();
  }

  function refresh() {
    fillFilters();
    onDateChanged();
  }

  SA.attendance = { init, refresh };
})();

