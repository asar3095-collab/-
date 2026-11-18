const $ = s => document.querySelector(s);
let role = "student", name = "";
const get = key => {
  try { return JSON.parse(localStorage.getItem("diary_" + key) || "[]"); }
  catch { return []; }
};
const put = (key, value) => localStorage.setItem("diary_" + key, JSON.stringify(value));
const safe = value => String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const classes = () => get("classes");
const grades = () => get("grades");
const finals = () => get("finals");
const tasks = () => get("tasks");
const lessons = () => get("lessons");
const classOptions = selected => classes().map(c => '<option value="' + safe(c.name) + '"' + (c.name === selected ? " selected" : "") + '>' + safe(c.name) + '</option>').join("");
function enter() {
  name = $("#name").value.trim();
  role = $("#role").value;
  if (!name) return;
  $("#login").classList.add("hidden");
  $("#cabinet").classList.remove("hidden");
  $("#who").textContent = name + " · " + (role === "teacher" ? "Учитель" : "Ученик");
  const menus = role === "teacher"
    ? ["Главная","Мои классы","Журнал оценок","Итоговые оценки","Домашние задания","Расписание","Посещаемость"]
    : ["Главная","Мои оценки","Итоговые оценки","Домашние задания","Расписание"];
  $("#nav").innerHTML = menus.map(x => '<button data-page="' + x + '">' + x + "</button>").join("");
  document.querySelectorAll("#nav button").forEach(b => b.onclick = () => page(b.dataset.page));
  page("Главная");
}
function empty(title, message) {
  return '<div class="empty"><strong>' + safe(title) + '</strong>' + safe(message) + "</div>";
}
function gradeTable(list) {
  if (!list.length) return empty("Оценок пока нет", "Учитель ещё не добавил оценки.");
  return '<div class="card"><div class="table-wrap"><table class="grade-table"><thead><tr><th>Класс</th><th>Ученик</th><th>Предмет</th><th>Оценка</th><th>Кто поставил</th><th>Дата</th></tr></thead><tbody>' +
    list.map(g => '<tr><td>' + safe(g.className) + '</td><td>' + safe(g.student) + '</td><td>' + safe(g.subject) + '</td><td class="grade">' + safe(g.mark) + '</td><td>' + safe(g.teacher || "Не указано") + '</td><td>' + safe(g.date || "") + "</td></tr>").join("") +
    "</tbody></table></div></div>";
}
function homeworkList(list) {
  if (!list.length) return empty("Заданий пока нет", "Учитель ещё не добавил домашние задания.");
  return '<div class="card">' + list.map(t => '<div class="row"><b>' + safe(t.subject) + '</b><br>' + safe(t.description) + ' <span class="muted">· ' + safe(t.due || "Срок не указан") + '</span></div>').join("") + "</div>";
}
function scheduleList(list) {
  if (!list.length) return empty("Расписание пока не составлено", "Здесь появятся уроки, когда учитель добавит расписание.");
  return '<div class="card">' + list.map(l => '<div class="row"><b>' + safe(l.day) + " · " + safe(l.time) + '</b><br>' + safe(l.className) + " — " + safe(l.subject) + '<br><span class="muted">Учитель: ' + safe(l.teacher || "Не указан") + "</span></div>").join("") + "</div>";
}
function finalGradeForm() {
  const cs = classes();
  if (!cs.length) return empty("Сначала добавьте класс", "Перейдите в раздел «Мои классы» и создайте класс со списком учеников.");
  return '<div class="card"><h3>Выставить итоговую оценку</h3><form id="finalForm">' +
    '<label>Класс</label><select id="fClass">' + classOptions() + '</select>' +
    '<label>Ученик</label><select id="fStudent"></select>' +
    '<label>Предмет</label><input id="fSubject" required placeholder="Например, математика">' +
    '<label>Период</label><select id="fPeriod"><option>1 четверть</option><option>2 четверть</option><option>3 четверть</option><option>4 четверть</option><option>1 полугодие</option><option>2 полугодие</option><option>Годовая</option></select>' +
    '<label>Оценка</label><select id="fMark"><option>5</option><option>4</option><option>3</option><option>2</option></select>' +
    '<button class="save" type="submit">Сохранить итоговую оценку</button></form></div>';
}
function bindStudentSelect(classId, studentId) {
  const c = $("#" + classId), s = $("#" + studentId);
  if (!c || !s) return;
  const fill = () => {
    const item = classes().find(x => x.name === c.value);
    s.innerHTML = item && item.students.length
      ? item.students.map(n => '<option>' + safe(n) + '</option>').join("")
      : '<option value="">В этом классе пока нет учеников</option>';
  };
  c.onchange = fill;
  fill();
}
function bindFinalForm() {
  bindStudentSelect("fClass", "fStudent");
  const f = $("#finalForm");
  if (!f) return;
  f.onsubmit = e => {
    e.preventDefault();
    if (!$("#fStudent").value) return;
    const all = finals();
    all.unshift({className:$("#fClass").value,student:$("#fStudent").value,subject:$("#fSubject").value.trim(),period:$("#fPeriod").value,mark:$("#fMark").value,teacher:name});
    put("finals", all);
    page("Итоговые оценки");
  };
}
function page(p) {
  $("#title").textContent = p;
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("active", b.dataset.page === p));
  let out = "";
  if (p === "Главная") {
    if (role === "teacher") {
      out = '<div class="card"><h3>Здравствуйте, ' + safe(name) + '!</h3><p class="muted">В вашем дневнике пока нет демонстрационных данных. Добавьте классы, оценки и расписание.</p></div>' +
        '<div class="stats"><div class="card">Классы<strong>' + classes().length + '</strong></div><div class="card">Оценки<strong>' + grades().length + '</strong></div><div class="card">Уроки в расписании<strong>' + lessons().length + '</strong></div></div>';
    } else {
      out = '<div class="card"><h3>Здравствуйте, ' + safe(name) + '!</h3><p class="muted">Здесь будут ваши оценки, задания и расписание после того, как учитель добавит данные.</p></div>' +
        '<div class="stats"><div class="card">Оценки<strong>' + grades().length + '</strong></div><div class="card">Задания<strong>' + tasks().length + '</strong></div><div class="card">Уроки<strong>' + lessons().length + '</strong></div></div>';
    }
  } else if (p === "Мои классы") {
    out = '<div class="card"><h3>Добавить класс</h3><form id="classForm"><label>Название класса</label><input id="className" required placeholder="Например, 5 А"><label>Ученики (каждого с новой строки)</label><textarea id="studentNames" rows="5" placeholder="Имя Фамилия"></textarea><button class="save" type="submit">Добавить класс</button></form></div>';
    const cs = classes();
    out += cs.length ? '<div class="card"><h3>Мои классы</h3>' + cs.map(c => '<div class="row"><b>' + safe(c.name) + '</b><div class="muted">' + c.students.map(safe).join(", ") + '</div></div>').join("") + "</div>" : empty("Классов пока нет", "Создайте первый класс с помощью формы выше.");
  } else if (p === "Журнал оценок" || p === "Мои оценки") {
    if (role === "teacher") {
      const cs = classes();
      out = cs.length ? '<div class="card"><h3>Добавить оценку</h3><form id="gradeForm"><label>Класс</label><select id="gClass">' + classOptions() + '</select><label>Ученик</label><select id="gStudent"></select><label>Предмет</label><input id="gSubject" required placeholder="Предмет"><label>Оценка</label><select id="gMark"><option>5</option><option>4</option><option>3</option><option>2</option></select><button class="save" type="submit">Выставить оценку</button></form></div>' : empty("Нет классов", "Сначала создайте класс в разделе «Мои классы».");
      out += gradeTable(grades());
    } else out = gradeTable(grades());
  } else if (p === "Итоговые оценки") {
    out = role === "teacher" ? finalGradeForm() : "";
    out += finals().length ? '<div class="card"><h3>Итоговые оценки</h3>' + finals().map(g => '<div class="row">' + safe(g.className) + ' · ' + safe(g.student) + ' · ' + safe(g.subject) + ' · ' + safe(g.period) + ' <b class="grade">' + safe(g.mark) + '</b><br><span class="muted">Выставил: ' + safe(g.teacher || "Не указан") + '</span></div>').join("") + "</div>" : empty("Итоговых оценок пока нет", "Учитель ещё не выставил итоговые оценки.");
  } else if (p === "Домашние задания") {
    if (role === "teacher") out = '<div class="card"><h3>Добавить домашнее задание</h3><form id="taskForm"><label>Предмет</label><input id="tSubject" required><label>Задание</label><textarea id="tDescription" rows="3" required></textarea><label>Срок сдачи</label><input id="tDue" placeholder="Например, 25 ноября"><button class="save" type="submit">Добавить задание</button></form></div>';
    out += homeworkList(tasks());
  } else if (p === "Расписание") {
    if (role === "teacher") out = '<div class="card"><h3>Добавить урок в расписание</h3><form id="lessonForm"><label>День недели</label><select id="lDay"><option>Понедельник</option><option>Вторник</option><option>Среда</option><option>Четверг</option><option>Пятница</option><option>Суббота</option></select><label>Время</label><input id="lTime" required placeholder="08:30"><label>Класс</label><select id="lClass">' + classOptions() + '</select><label>Предмет</label><input id="lSubject" required><button class="save" type="submit">Добавить урок</button></form></div>';
    out += scheduleList(lessons());
  } else if (p === "Посещаемость") {
    out = empty("Посещаемость пока не заполнена", "Здесь появятся данные после их внесения.");
  }
  $("#content").innerHTML = out;
  if (p === "Итоговые оценки" && role === "teacher") bindFinalForm();
  if (p === "Мои классы" && role === "teacher") {
    $("#classForm").onsubmit = e => {
      e.preventDefault();
      const all = classes(), className = $("#className").value.trim();
      if (!className || all.some(c => c.name.toLowerCase() === className.toLowerCase())) return;
      all.push({name:className,students:$("#studentNames").value.split("\n").map(x => x.trim()).filter(Boolean)});
      put("classes", all); page("Мои классы");
    };
  }
  if ((p === "Журнал оценок") && role === "teacher" && $("#gradeForm")) {
    bindStudentSelect("gClass","gStudent");
    $("#gradeForm").onsubmit = e => {
      e.preventDefault(); if (!$("#gStudent").value) return;
      const all = grades(); all.unshift({className:$("#gClass").value,student:$("#gStudent").value,subject:$("#gSubject").value.trim(),mark:$("#gMark").value,teacher:name,date:new Date().toLocaleDateString("ru-RU")});
      put("grades", all); page("Журнал оценок");
    };
  }
  if (p === "Домашние задания" && role === "teacher") {
    $("#taskForm").onsubmit = e => { e.preventDefault(); const all=tasks(); all.unshift({subject:$("#tSubject").value.trim(),description:$("#tDescription").value.trim(),due:$("#tDue").value.trim()}); put("tasks",all); page(p); };
  }
  if (p === "Расписание" && role === "teacher" && $("#lessonForm")) {
    const lc = $("#lClass"); if (lc && !classes().length) lc.innerHTML = '<option value="">Сначала добавьте класс</option>';
    $("#lessonForm").onsubmit = e => { e.preventDefault(); if (!$("#lClass").value) return; const all=lessons(); all.push({day:$("#lDay").value,time:$("#lTime").value.trim(),className:$("#lClass").value,subject:$("#lSubject").value.trim(),teacher:name}); put("lessons",all); page(p); };
  }
}
$("#form").onsubmit = e => { e.preventDefault(); enter(); };
$("#exit").onclick = () => { $("#cabinet").classList.add("hidden"); $("#login").classList.remove("hidden"); };
$("#theme").onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("diaryTheme", document.body.classList.contains("dark") ? "dark" : "light");
};
if (localStorage.getItem("diaryTheme") === "dark") document.body.classList.add("dark");
