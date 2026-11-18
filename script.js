const $ = s => document.querySelector(s);
let role = "student", name = "";
const grades = [["Математика","5","18.11"],["Русский язык","4","17.11"],["История","5","16.11"],["Английский язык","4","14.11"]];
const tasks = [["Математика","Стр. 42, № 5–8","20 ноября"],["Русский язык","Упражнение 116","19 ноября"],["История","Подготовить доклад","21 ноября"]];
const classes = {
  "5 «А»":["Алексей Смирнов","Мария Иванова","Даниил Петров"],
  "6 «Б»":["Анна Кузнецова","Максим Соколов","Егор Волков"],
  "7 «В»":["София Морозова","Артём Орлов","Полина Васильева"]
};
const menus = {
  student:["Главная","Мои оценки","Домашние задания","Расписание"],
  teacher:["Главная","Мои классы","Журнал оценок","Итоговые оценки","Домашние задания","Расписание","Посещаемость"]
};
const readFinalGrades = () => {
  try { return JSON.parse(localStorage.getItem("diaryFinalGrades") || "[]"); }
  catch { return []; }
};
const safe = value => String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
function enter() {
  name = $("#name").value.trim();
  role = $("#role").value;
  if (!name) return;
  $("#login").classList.add("hidden");
  $("#cabinet").classList.remove("hidden");
  $("#who").textContent = name + " · " + (role === "teacher" ? "Учитель" : "Ученик");
  $("#nav").innerHTML = menus[role].map(x => '<button data-page="' + x + '">' + x + "</button>").join("");
  document.querySelectorAll("#nav button").forEach(b => b.onclick = () => page(b.dataset.page));
  page("Главная");
}
function table() {
  return '<div class="card"><h3>Последние оценки</h3>' + grades.map(g =>
    '<div class="row">' + g[0] + ' <b class="grade">' + g[1] + '</b> <span class="muted">' + g[2] + "</span></div>"
  ).join("") + "</div>";
}
function homework() {
  return '<div class="card"><h3>Домашние задания</h3>' + tasks.map(t =>
    '<div class="row"><b>' + t[0] + "</b><br>" + t[1] + ' <span class="muted">· ' + t[2] + "</span></div>"
  ).join("") + "</div>";
}
function finalGradesPage() {
  const saved = readFinalGrades();
  return '<div class="card"><h3>Выставить итоговую оценку</h3><p class="muted">Выберите класс, ученика, предмет и период. Оценка сохранится в этом браузере.</p>' +
    '<form id="finalGradeForm"><div class="form-grid">' +
    '<div><label for="finalClass">Класс</label><select id="finalClass">' + Object.keys(classes).map(c => '<option>' + c + "</option>").join("") + "</select></div>" +
    '<div><label for="finalStudent">Ученик</label><select id="finalStudent">' + classes["5 «А»"].map(s => '<option>' + s + "</option>").join("") + "</select></div>" +
    '<div><label for="finalSubject">Предмет</label><select id="finalSubject"><option>Математика</option><option>Русский язык</option><option>История</option><option>Английский язык</option><option>Биология</option><option>География</option></select></div>' +
    '<div><label for="finalPeriod">Период</label><select id="finalPeriod"><option>1 четверть</option><option>2 четверть</option><option>3 четверть</option><option>4 четверть</option><option>1 полугодие</option><option>2 полугодие</option><option>Годовая</option></select></div>' +
    '<div><label for="finalMark">Итоговая оценка</label><select id="finalMark"><option value="5">5 — отлично</option><option value="4">4 — хорошо</option><option value="3">3 — удовлетворительно</option><option value="2">2 — неудовлетворительно</option></select></div>' +
    '<div><label for="finalComment">Комментарий (необязательно)</label><input id="finalComment" placeholder="Например, за четверть"></div></div>' +
    '<button class="save" type="submit">Сохранить итоговую оценку</button></form></div>' +
    '<div class="card"><h3>Выставленные итоговые оценки</h3>' +
    (saved.length ? '<div class="table-wrap"><table class="grade-table"><thead><tr><th>Класс</th><th>Ученик</th><th>Предмет</th><th>Период</th><th>Оценка</th></tr></thead><tbody>' +
      saved.map(g => '<tr><td>' + safe(g.className) + '</td><td>' + safe(g.student) + '</td><td>' + safe(g.subject) + '</td><td>' + safe(g.period) + '</td><td class="grade">' + safe(g.mark) + '</td></tr>').join("") +
      "</tbody></table></div>" : '<div class="empty"><strong>Итоговых оценок пока нет</strong>Когда учитель выставит оценки, они появятся здесь.</div>') + "</div>";
}
function bindFinalGradeForm() {
  const form = $("#finalGradeForm");
  if (!form) return;
  const classSelect = $("#finalClass"), studentSelect = $("#finalStudent");
  classSelect.onchange = () => {
    studentSelect.innerHTML = classes[classSelect.value].map(s => "<option>" + safe(s) + "</option>").join("");
  };
  form.onsubmit = e => {
    e.preventDefault();
    const saved = readFinalGrades();
    saved.unshift({
      className:classSelect.value,
      student:studentSelect.value,
      subject:$("#finalSubject").value,
      period:$("#finalPeriod").value,
      mark:$("#finalMark").value,
      comment:$("#finalComment").value.trim()
    });
    localStorage.setItem("diaryFinalGrades", JSON.stringify(saved));
    page("Итоговые оценки");
  };
}
function page(p) {
  $("#title").textContent = p;
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("active", b.dataset.page === p));
  let out = "";
  if (p === "Главная") {
    out = '<div class="card"><h3>Здравствуйте, ' + safe(name) + '!</h3><p class="muted">Добро пожаловать в электронный дневник.</p></div>';
    if (role === "teacher") {
      const count = readFinalGrades().length;
      out += '<div class="stats"><div class="card">Мои классы<strong>3</strong></div><div class="card">Итоговых оценок<strong>' + count + '</strong></div><div class="card">Расписание<strong>—</strong></div></div><div class="notice">Расписание пока не заполнено. Оно появится здесь, когда учитель его составит.</div>';
    } else {
      out += '<div class="stats"><div class="card">Средний балл<strong>4,5</strong></div><div class="card">Оценок<strong>8</strong></div><div class="card">Заданий<strong>3</strong></div></div>' + table();
    }
  } else if (p === "Мои оценки" || p === "Журнал оценок") {
    out = role === "teacher"
      ? '<div class="empty"><strong>Журнал оценок</strong>Выставление текущих оценок добавим отдельно. Итоговые оценки можно выставлять в соответствующем разделе.</div>'
      : table();
  } else if (p === "Итоговые оценки") {
    out = finalGradesPage();
  } else if (p === "Домашние задания") {
    out = homework();
  } else if (p === "Мои классы") {
    out = '<div class="card"><h3>Мои классы</h3>' + Object.entries(classes).map(([c, students]) =>
      '<div class="row"><b>' + c + '</b><span class="muted"> · ' + students.length + ' ученика в демо-списке</span></div>'
    ).join("") + "</div>";
  } else if (p === "Расписание") {
    out = role === "teacher"
      ? '<div class="empty"><strong>Расписание пока не составлено</strong>Здесь появятся уроки, когда учитель добавит расписание.</div>'
      : '<div class="card"><h3>Расписание на сегодня</h3><p>08:30 — Математика</p><p>09:25 — Русский язык</p><p>10:20 — История</p><p>11:25 — Английский язык</p></div>';
  } else if (p === "Посещаемость") {
    out = '<div class="empty"><strong>Данные о посещаемости пока не внесены</strong>Здесь будет отображаться посещаемость классов.</div>';
  }
  $("#content").innerHTML = out;
  if (p === "Итоговые оценки") bindFinalGradeForm();
}
$("#form").onsubmit = e => { e.preventDefault(); enter(); };
$("#exit").onclick = () => {
  $("#cabinet").classList.add("hidden");
  $("#login").classList.remove("hidden");
};
$("#theme").onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("diaryTheme", document.body.classList.contains("dark") ? "dark" : "light");
};
if (localStorage.getItem("diaryTheme") === "dark") document.body.classList.add("dark");
