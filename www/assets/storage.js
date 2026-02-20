(() => {
  const SA = (window.SA = window.SA || {});

  const KEY = "sa_data_v1";

  function nowISO() {
    return new Date().toISOString();
  }

  function safeParse(json) {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function uuid() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function defaultData() {
    return {
      version: 1,
      students: [],
      attendance: [],
      payments: [],
      counters: {
        nextReceiptNumber: 1,
        receiptYear: new Date().getFullYear(),
      },
    };
  }

  function readRaw() {
    return safeParse(localStorage.getItem(KEY));
  }

  function writeRaw(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function migrate(data) {
    if (!data || typeof data !== "object") return defaultData();

    const out = { ...defaultData(), ...data };
    out.students = Array.isArray(out.students) ? out.students : [];
    out.attendance = Array.isArray(out.attendance) ? out.attendance : [];
    out.payments = Array.isArray(out.payments) ? out.payments : [];
    out.counters = { ...defaultData().counters, ...(out.counters || {}) };

    // student field migration: batch -> machineNo, ensure mobile, old class -> Junior/Senior
    const juniorClasses = ["8th", "9th", "10th"];
    const seniorClasses = ["11th", "12th", "UG", "PG"];
    out.students = out.students.map((s) => {
      if (!s || typeof s !== "object") return s;
      const student = { ...s };
      if (student.batch && !student.machineNo) {
        const n = Number(student.batch);
        if (Number.isFinite(n) && n >= 1 && n <= 5) student.machineNo = n;
      }
      delete student.batch;
      if (student.mobile == null) student.mobile = "";
      if (student.className && juniorClasses.includes(student.className)) student.className = "Junior";
      else if (student.className && seniorClasses.includes(student.className)) student.className = "Senior";
      return student;
    });

    out.version = 1;
    return out;
  }

  function getData() {
    return migrate(readRaw());
  }

  function setData(mutator) {
    const data = getData();
    const clone =
      globalThis.structuredClone ||
      ((x) => {
        return JSON.parse(JSON.stringify(x));
      });
    const next = mutator ? mutator(clone(data)) : data;
    const finalData = migrate(next || data);
    writeRaw(finalData);
    return finalData;
  }

  function formatReceiptNo(year, n) {
    const num = String(n).padStart(6, "0");
    return `R-${year}-${num}`;
  }

  function allocReceiptNoInPlace(d) {
    const yr = new Date().getFullYear();
    if (d.counters.receiptYear !== yr) {
      d.counters.receiptYear = yr;
      d.counters.nextReceiptNumber = 1;
    }
    const receiptNo = formatReceiptNo(d.counters.receiptYear, d.counters.nextReceiptNumber);
    d.counters.nextReceiptNumber += 1;
    return receiptNo;
  }

  function nextReceiptNo() {
    let receiptNo = "";
    setData((d) => {
      receiptNo = allocReceiptNoInPlace(d);
      return d;
    });
    return receiptNo;
  }

  function normalizeStudent(input) {
    const name = String(input.name || "").trim();
    const className = String(input.className || "").trim();
    const timing = String(input.timing || "").trim();
    const dateOfJoining = String(input.dateOfJoining || "").trim();
    const monthlyFee = Number(input.monthlyFee);
    const machineNo = Number(input.machineNo);
    const mobile = String(input.mobile || "").trim();

    if (!name) throw new Error("Student name is required.");
    if (!className) throw new Error("Class is required.");
    if (!timing) throw new Error("Timing is required.");
    if (!dateOfJoining) throw new Error("Date of joining is required.");
    const fee = Number.isFinite(monthlyFee) && monthlyFee > 0 ? monthlyFee : 450;
    if (!Number.isFinite(machineNo) || machineNo < 1 || machineNo > 5) throw new Error("Machine number must be 1 to 5.");

    return {
      id: input.id || uuid(),
      name,
      className,
      timing,
      machineNo,
      mobile,
      dateOfJoining,
      monthlyFee: fee,
      active: input.active ?? true,
      createdAt: input.createdAt || nowISO(),
      updatedAt: nowISO(),
    };
  }

  function upsertStudent(input) {
    let saved = null;
    setData((d) => {
      const student = normalizeStudent(input);
      const idx = d.students.findIndex((s) => s.id === student.id);
      if (idx >= 0) d.students[idx] = { ...d.students[idx], ...student };
      else d.students.unshift(student);
      saved = student;
      return d;
    });
    return saved;
  }

  function deleteStudent(studentId) {
    setData((d) => {
      d.students = d.students.filter((s) => s.id !== studentId);
      d.attendance = d.attendance.filter((a) => a.studentId !== studentId);
      d.payments = d.payments.filter((p) => p.studentId !== studentId);
      return d;
    });
  }

  function getStudents() {
    const d = getData();
    return d.students.slice().sort((a, b) => a.name.localeCompare(b.name));
  }

  function getStudentById(id) {
    return getData().students.find((s) => s.id === id) || null;
  }

  SA.storage = {
    init() {
      const raw = readRaw();
      if (!raw) writeRaw(defaultData());
      else writeRaw(migrate(raw));
    },
    KEY,
    getData,
    setData,
    uuid,
    nowISO,
    nextReceiptNo,
    allocReceiptNoInPlace,
    getStudents,
    getStudentById,
    upsertStudent,
    deleteStudent,
  };
})();

