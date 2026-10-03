const LS_KEY = "dayplan.v1";

const dateEl = document.getElementById("date");
const addForm = document.getElementById("addForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const successCard = document.getElementById("successCard");
const doneToggle = document.getElementById("doneToggle");
const doneWrap = document.getElementById("doneWrap");
const doneList = document.getElementById("doneList");
const doneCount = document.getElementById("doneCount");

const todayKey = () => new Date().toISOString().slice(0, 10);

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (s && s.date === todayKey() && Array.isArray(s.tasks)) return s;
  } catch {}
  return { date: todayKey(), tasks: [] };
}

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

let state = load();

dateEl.textContent = new Date().toLocaleDateString("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

// ---------- Рендер ----------

function makeTaskEl(task) {
  const li = document.createElement("li");
  li.className = "task";
  li.dataset.id = task.id;

  const check = document.createElement("button");
  check.className = "check";
  check.type = "button";
  check.setAttribute("aria-label", "Выполнить задачу");
  check.innerHTML = '<svg viewBox="0 0 16 16"><path d="M3 8.5l3.5 3.5L13 4"/></svg>';
  check.addEventListener("click", () => completeTask(task.id, li));

  const span = document.createElement("span");
  span.className = "task-text";
  span.textContent = task.text;

  li.append(check, span);
  return li;
}

function render() {
  const active = state.tasks.filter((t) => !t.done);
  const done = state.tasks.filter((t) => t.done);

  taskList.innerHTML = "";
  for (const t of active) taskList.appendChild(makeTaskEl(t));

  doneList.innerHTML = "";
  for (const t of done) {
    const li = document.createElement("li");
    li.textContent = t.text;
    doneList.appendChild(li);
  }
  doneCount.textContent = done.length;

  successCard.hidden = active.length > 0 || done.length === 0;
}

// ---------- Логика ----------

function addTask(text) {
  const task = { id: crypto.randomUUID(), text, done: false };
  state.tasks.push(task);
  save();

  if (state.tasks.filter((t) => !t.done).length === 1) {
    render();
  } else {
    const li = makeTaskEl(task);
    li.classList.add("enter");
    taskList.appendChild(li);
  }
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
      if (task) task.done = true;
      save();
      render();
    }, 420);
  }, 500);
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

doneToggle.addEventListener("click", () => {
  const open = doneWrap.classList.toggle("open");
  doneToggle.classList.toggle("open", open);
  doneToggle.setAttribute("aria-expanded", String(open));
});

render();
