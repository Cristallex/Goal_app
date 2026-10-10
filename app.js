const LS_KEY = "dayplan.v2";
const LS_KEY_OLD = "dayplan.v1";

const dateEl = document.getElementById("date");
const addForm = document.getElementById("addForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const successCard = document.getElementById("successCard");
const doneToggle = document.getElementById("doneToggle");
const doneWrap = document.getElementById("doneWrap");
const doneList = document.getElementById("doneList");
const doneCount = document.getElementById("doneCount");
const settingsBtn = document.getElementById("settingsBtn");
const themePanel = document.getElementById("themePanel");
const navBtn = document.getElementById("navBtn");

const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayKey = () => dayKey(new Date());
const tomorrowKey = () => dayKey(new Date(Date.now() + 864e5));

const shiftKey = (key, days) => {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + days);
  return dayKey(d);
};

const dayLabel = (key) => {
  if (key === todayKey()) return "Сегодня";
  if (key === tomorrowKey()) return "Завтра";
  return new Date(key + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
};

function migrateTask(t) {
  return {
    id: t.id || crypto.randomUUID(),
    text: t.text,
    done: !!t.done,
    date: t.date || todayKey(),
    doneDate: t.done ? t.doneDate || todayKey() : null,
  };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (s && Array.isArray(s.tasks)) {
      return { tasks: s.tasks.map(migrateTask) };
    }
    const old = JSON.parse(localStorage.getItem(LS_KEY_OLD));
    if (old && Array.isArray(old.tasks)) {
      return { tasks: old.tasks.map(migrateTask) };
    }
  } catch {}
  return { tasks: [] };
}

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

let state = load();
let viewDate = todayKey(); // какой день смотрим

// ---------- Темы ----------

const THEME_KEY = "dayplan.theme";

function applyTheme(name) {
  document.body.dataset.theme = name;
  localStorage.setItem(THEME_KEY, name);
  themePanel
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("active", b.dataset.theme === name));
}

applyTheme(localStorage.getItem(THEME_KEY) || "base");

settingsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  themePanel.hidden = !themePanel.hidden;
});

themePanel.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-theme]");
  if (!btn) return;
  applyTheme(btn.dataset.theme);
  themePanel.hidden = true;
});

document.addEventListener("click", (e) => {
  if (!themePanel.hidden && !e.target.closest(".theme-panel, .settings-btn")) {
    themePanel.hidden = true;
  }
});

// ---------- Рендер ----------

function makeTaskEl(task) {
  const li = document.createElement("li");
  li.className = "task";
  li.dataset.id = task.id;

  const hintR = document.createElement("div");
  hintR.className = "swipe-hint right";
  hintR.textContent = "→ " + dayLabel(shiftKey(viewDate, 1));

  const hintL = document.createElement("div");
  hintL.className = "swipe-hint left";
  hintL.textContent = "← " + dayLabel(shiftKey(viewDate, -1));

  const inner = document.createElement("div");
  inner.className = "task-inner";

  const check = document.createElement("button");
  check.className = "check";
  check.type = "button";
  check.setAttribute("aria-label", "Выполнить задачу");
  check.innerHTML = '<svg viewBox="0 0 16 16"><path d="M3 8.5l3.5 3.5L13 4"/></svg>';
  check.addEventListener("click", () => completeTask(task.id, li));

  const span = document.createElement("span");
  span.className = "task-text";
  span.textContent = task.text;

  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn";
  editBtn.type = "button";
  editBtn.setAttribute("aria-label", "Редактировать задачу");
  editBtn.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
  editBtn.addEventListener("click", () => startEdit(task.id, li));

  const delBtn = document.createElement("button");
  delBtn.className = "del-btn";
  delBtn.type = "button";
  delBtn.setAttribute("aria-label", "Удалить задачу");
  delBtn.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
  delBtn.addEventListener("click", () => deleteTask(task.id, li));

  inner.append(check, span, editBtn, delBtn);
  li.append(hintR, hintL, inner);
  attachSwipe(li, inner, task.id);
  return li;
}

function render() {
  const today = todayKey();
  const viewingToday = viewDate === today;
  // сегодня показываем всё невыполненное (включая перенесённое с прошлых дней),
  // на будущих днях — только задачи этого дня
  const active = state.tasks.filter(
    (t) => !t.done && (viewingToday ? t.date <= today : t.date === viewDate)
  );
  const done = viewingToday
    ? state.tasks.filter((t) => t.done && t.doneDate === today)
    : [];

  taskList.innerHTML = "";
  for (const t of active) taskList.appendChild(makeTaskEl(t));

  doneList.innerHTML = "";
  for (const t of done) {
    const li = document.createElement("li");
    li.textContent = t.text;
    doneList.appendChild(li);
  }
  doneCount.textContent = done.length;

  successCard.hidden = !viewingToday || active.length > 0 || done.length === 0;

  const d = new Date(viewDate + "T00:00:00");
  dateEl.textContent =
    d.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }) + (viewingToday ? "" : " · завтра");
  navBtn.textContent = viewingToday ? "Следующий день →" : "← Сегодня";
}

// ---------- Логика ----------

function addTask(text) {
  const task = {
    id: crypto.randomUUID(),
    text,
    done: false,
    date: viewDate,
    doneDate: null,
  };
  state.tasks.push(task);
  save();

  const today = todayKey();
  const viewingToday = viewDate === today;
  const visible = state.tasks.filter(
    (t) => !t.done && (viewingToday ? t.date <= today : t.date === viewDate)
  ).length;

  if (visible === 1) {
    render(); // чтобы скрыть карточку успеха
  } else {
    const li = makeTaskEl(task);
    li.classList.add("enter");
    taskList.appendChild(li);
  }
}

function startEdit(id, li) {
  if (li.classList.contains("completing") || li.querySelector("input")) return;

  const span = li.querySelector(".task-text");
  const input = document.createElement("input");
  input.className = "edit-input";
  input.type = "text";
  input.value = span.textContent;
  input.maxLength = 200;
  span.replaceWith(input);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  let done = false;
  const finish = (saveIt) => {
    if (done) return;
    done = true;
    const task = state.tasks.find((t) => t.id === id);
    const text = input.value.trim();
    if (saveIt && task && text) {
      task.text = text;
      save();
    }
    render();
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
}

function completeTask(id, li) {
  if (li.classList.contains("completing")) return;
  li.classList.add("completing"); // галочка + зачёркивание (0.5s)

  setTimeout(() => {
    // схлопывание высоты -> соседние элементы плавно подъезжают вверх
    li.style.height = li.offsetHeight + "px";
    li.offsetHeight; // reflow
    li.classList.add("leaving");

    setTimeout(() => {
      const task = state.tasks.find((t) => t.id === id);
      if (task) {
        task.done = true;
        task.doneDate = viewDate;
      }
      save();
      render();
    }, 420);
  }, 500);
}

function moveTask(id, li, targetDate) {
  // та же анимация схлопывания, что и при выполнении
  li.style.height = li.offsetHeight + "px";
  li.offsetHeight;
  li.classList.add("leaving");

  setTimeout(() => {
    const task = state.tasks.find((t) => t.id === id);
    if (task) task.date = targetDate;
    save();
    render();
  }, 420);
}

function deleteTask(id, li) {
  li.style.height = li.offsetHeight + "px";
  li.offsetHeight;
  li.classList.add("leaving");

  setTimeout(() => {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    save();
    render();
  }, 420);
}

// свайп: вправо -> день вперёд, влево -> день назад (pointer events: палец и мышь)
function attachSwipe(li, inner, id) {
  let startX = 0,
    startY = 0,
    dx = 0,
    dragging = false,
    decided = false;

  li.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, input")) return;
    if (li.classList.contains("completing")) return;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    dragging = true;
    decided = false;
  });

  li.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const mx = e.clientX - startX;
    const my = e.clientY - startY;
    if (!decided) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      if (Math.abs(mx) > Math.abs(my)) {
        decided = true;
        li.setPointerCapture(e.pointerId);
        li.classList.add("swiping", "dragging");
      } else {
        dragging = false;
        return;
      }
    }
    dx = mx;
    inner.style.transform = `translateX(${dx}px)`;
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    li.classList.remove("dragging");
    if (decided && Math.abs(dx) > li.offsetWidth * 0.35) {
      const days = dx > 0 ? 1 : -1;
      const target = shiftKey(viewDate, days);
      const viewingToday = viewDate === todayKey();
      // если после переноса задача останется видимой на этом экране — просто вернуть
      const stillVisible = viewingToday
        ? target <= viewDate
        : target === viewDate;
      if (stillVisible) {
        const task = state.tasks.find((t) => t.id === id);
        if (task) {
          task.date = target;
          save();
        }
        inner.style.transform = "";
        li.classList.remove("swiping");
      } else {
        inner.style.transform = `translateX(${(dx > 0 ? 1 : -1) * (li.offsetWidth + 30)}px)`;
        inner.style.opacity = "0";
        setTimeout(() => moveTask(id, li, target), 260);
      }
    } else {
      inner.style.transform = "";
      li.classList.remove("swiping");
    }
    dx = 0;
    decided = false;
  };

  li.addEventListener("pointerup", endDrag);
  li.addEventListener("pointercancel", endDrag);
}

// ---------- События ----------

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  addTask(text);
  taskInput.value = "";
  taskInput.focus();
});

navBtn.addEventListener("click", () => {
  viewDate = viewDate === todayKey() ? tomorrowKey() : todayKey();
  render();
});

doneToggle.addEventListener("click", () => {
  const open = doneWrap.classList.toggle("open");
  doneToggle.classList.toggle("open", open);
  doneToggle.setAttribute("aria-expanded", String(open));
});

render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js", { updateViaCache: "none" })
    .then((reg) => reg.update());
}

// iOS игнорирует user-scalable=no — блокируем жесты зума
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());
document.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false }
);
