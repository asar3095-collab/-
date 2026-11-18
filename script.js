const $ = s => document.querySelector(s);
let role = "student", name = "", teacherType = "", teacherSubjects = [];
const get = key => { try { return JSON.parse(localStorage.getItem("diary_" + key) || "[]"); } catch { return []; } };
const put = (key, value) => localStorage.setItem("diary_" + key, JSON.stringify(value));
const safe = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const classes = () => get("classes");
const grades = () => get("grades");
const finals = () => get("finals");
const tasks = () => get("tasks");
const lessons = () => get("lessons");
const tests = () => get("tests");
const saveSession = () => localStorage.setItem("diary_session", JSON.stringify({role,name,teacherType,teacherSubjects,username:role==="teacher"?localStorage.getItem("diary_activeTeacherUsername")||"":""}));
const normClass = c => ({...c, groups:Array.isArray(c.groups)&&c.groups.length?c.groups:["Общая"], students:(c.students||[]).map(s=>typeof s==="string"?{name:s,group:"Общая"}:s)});
const allClasses = () => classes().map(normClass);
const teacherUsername = () => localStorage.getItem("diary_activeTeacherUsername") || "";
const teacherClasses = () => allClasses().filter(c => {
 const members=Array.isArray(c.teacherUsernames)?c.teacherUsernames:[];
 return members.includes(teacherUsername()) || c.teacherUsername===teacherUsername() ||
  (!c.teacherUsernames && !c.teacherUsername && c.teacher===name && c.teacherType===teacherType);
});
const classOptions = (selected="") => (role==="teacher"?teacherClasses():allClasses()).map(c=>'<option value="'+safe(c.name)+'"'+(c.name===selected?" selected":"")+'>'+safe(c.name)+'</option>').join("");
const myTeacherRecord = item => item.teacherUsername ? item.teacherUsername===teacherUsername() : item.teacher === name && (!item.teacherType || item.teacherType === teacherType);
const currentStudent = () => allClasses().flatMap(c=>c.students.map(s=>({...s,className:c.name}))).find(s=>s.name.toLowerCase()===name.toLowerCase());
const studentMatches = item => { const s=currentStudent(); if(!s) return false; return item.className===s.className && (!item.group || item.group==="Весь класс" || item.group===s.group) && (!item.student || item.student.toLowerCase()===name.toLowerCase()); };
function openCabinet() {
 $("#login").classList.add("hidden"); $("#cabinet").classList.remove("hidden");
 $("#who").textContent=name+" · "+(role==="teacher"?teacherType:"Ученик");
 const menus=role==="teacher"?["Главная","Мои классы","Журнал оценок","Итоговые оценки","Домашние задания","Расписание","Контрольные"]:["Главная","Мои оценки","Итоговые оценки","Домашние задания","Расписание","Контрольные"];
 $("#nav").innerHTML=menus.map(x=>'<button data-page="'+x+'">'+x+"</button>").join("");
 document.querySelectorAll("#nav button").forEach(btn=>btn.onclick=()=>page(btn.dataset.page)); page("Главная");
}
async function passwordHash(value) {
 const data=new TextEncoder().encode(value);
 const digest=await crypto.subtle.digest("SHA-256",data);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
}
async function handleAuth() {
 role=$("#role").value;
 if(role!=="teacher") {
  name=$("#studentName").value.trim(); teacherType=""; teacherSubjects=[];
  if(!name)return alert("Введите имя ученика.");
  localStorage.removeItem("diary_activeTeacherUsername"); saveSession();
  openCabinet(); return;
 }
 const username=$("#accountUsername").value.trim().toLowerCase();
 const password=$("#accountPassword").value;
 const mode=$("#teacherMode").value;
 if(username.length<3)return alert("Логин должен содержать не менее 3 символов.");
 if(password.length<6)return alert("Пароль должен содержать не менее 6 символов.");
 if(!window.crypto?.subtle)return alert("Безопасная проверка пароля не поддерживается этим браузером. Обновите браузер.");
 const accounts=get("teacherAccounts");
 if(mode==="register") {
  const fullName=$("#teacherFullName").value.trim();
  if(!fullName)return alert("Введите имя и фамилию учителя.");
  if(accounts.some(x=>x.username===username))return alert("Такой логин уже занят. Выберите другой.");
  teacherType=$("#teacherType").value;
  teacherSubjects=$("#teacherSubjects").value.split(",").map(x=>x.trim()).filter(Boolean);
  const account={username,passwordHash:await passwordHash(password),name:fullName,teacherType,teacherSubjects};
  accounts.push(account); put("teacherAccounts",accounts);
  name=account.name;
  localStorage.setItem("diary_activeTeacherUsername",username);
  alert("Регистрация завершена. Теперь можно входить по логину и паролю.");
 } else {
  const account=accounts.find(x=>x.username===username);
  if(!account||account.passwordHash!==await passwordHash(password))return alert("Неверный логин или пароль.");
  name=account.name; teacherType=account.teacherType; teacherSubjects=account.teacherSubjects||[];
  localStorage.setItem("diary_activeTeacherUsername",username);
 }
 saveSession();
 openCabinet();
}
function empty(title,message){return '<div class="empty"><strong>'+safe(title)+'</strong>'+safe(message)+"</div>";}
function groupOptions(className, includeAll=false) {
 const c=allClasses().find(x=>x.name===className); const groups=c?c.groups:["Общая"];
 return (includeAll?'<option>Весь класс</option>':"")+groups.map(g=>'<option>'+safe(g)+'</option>').join("");
}
function studentOptions(classId,studentId,groupId) {
 const c=$("#"+classId), s=$("#"+studentId), g=groupId?$("#"+groupId):null; if(!c||!s)return;
 const fill=()=>{const item=allClasses().find(x=>x.name===c.value); if(g)g.innerHTML=groupOptions(c.value,true); const grp=g?g.value:"Весь класс"; const people=item?item.students.filter(x=>!g||grp==="Весь класс"||x.group===grp):[]; s.innerHTML=people.length?people.map(x=>'<option>'+safe(x.name)+'</option>').join(""):'<option value="">Нет учеников в выбранной группе</option>';};
 c.onchange=fill; if(g)g.onchange=fill; fill();
}
function gradeTable(list) {
 if(!list.length)return empty("Оценок пока нет","Учитель ещё не добавил оценки.");
 return '<div class="card"><div class="table-wrap"><table class="grade-table"><thead><tr><th>Класс</th><th>Ученик</th><th>Предмет</th><th>Оценка</th><th>Кто поставил</th><th>Дата</th></tr></thead><tbody>'+list.map(g=>'<tr><td>'+safe(g.className)+'</td><td>'+safe(g.student)+'</td><td>'+safe(g.subject)+'</td><td class="grade">'+safe(g.mark)+'</td><td>'+safe(g.teacher||"Не указано")+'</td><td>'+safe(g.date||"")+'</td></tr>').join("")+"</tbody></table></div></div>";
}
function homeworkList(list) {
 if(!list.length)return empty("Заданий пока нет","Для вашего класса и группы заданий пока нет.");
 return '<div class="card">'+list.map(t=>'<div class="row"><b>'+safe(t.subject)+'</b> · '+safe(t.className)+' · '+safe(t.group||"Весь класс")+'<br>'+safe(t.description)+'<br><span class="muted">Срок: '+safe(t.due||"не указан")+' · Учитель: '+safe(t.teacher)+'</span></div>').join("")+"</div>";
}
function scheduleList(list) {
 if(!list.length)return empty("Расписание пока не составлено","Для вашего класса и группы уроков пока нет.");
 return '<div class="card">'+list.map(l=>'<div class="row"><b>'+safe(l.day)+' · '+safe(l.time)+'</b><br>'+safe(l.className)+' · '+safe(l.group||"Весь класс")+' — '+safe(l.subject)+'<br><span class="muted">Учитель: '+safe(l.teacher||"Не указан")+'</span></div>').join("")+"</div>";
}
function finalForm() {
 if(!teacherClasses().length)return empty("Сначала добавьте класс","Создайте класс и внесите список учеников.");
 return '<div class="card"><h3>Выставить итоговую оценку</h3><form id="finalForm"><label>Класс</label><select id="fClass">'+classOptions()+'</select><label>Ученик</label><select id="fStudent"></select><label>Предмет</label><input id="fSubject" required placeholder="Например, математика"><label>Период</label><select id="fPeriod"><option>1 четверть</option><option>2 четверть</option><option>3 четверть</option><option>4 четверть</option><option>1 полугодие</option><option>2 полугодие</option><option>Годовая</option></select><label>Оценка</label><select id="fMark"><option>5</option><option>4</option><option>3</option><option>2</option></select><button class="save" type="submit">Сохранить</button></form></div>';
}
function page(p) {
 $("#title").textContent=p; document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===p));
 let out=""; const mine=currentStudent();
 if(p==="Главная") out='<div class="card"><h3>Здравствуйте, '+safe(name)+'!</h3><p class="muted">'+(role==="teacher"?"Профиль: "+safe(teacherType)+". Ваши записи отображаются отдельно от записей других учителей. Предметы: "+safe(teacherSubjects.join(", ")||"не указаны"):mine?"Ваш класс: "+safe(mine.className)+", группа: "+safe(mine.group)+".":"Ваше имя пока не найдено в списках учеников. Попросите учителя добавить вас в свой класс.")+'</p></div>';
 else if(p==="Мои классы"&&role==="teacher") {
  out='<div class="card"><h3>Создать общий класс</h3><p class="muted">Создайте класс, добавьте учеников и поделитесь кодом приглашения с другими учителями.</p><form id="classForm"><label>Название класса</label><input id="className" required placeholder="Например, 1 А"><label>Названия групп (через запятую)</label><input id="groupNames" placeholder="1 группа, 2 группа"><label>Ученики (каждый с новой строки; формат: Имя Фамилия | группа)</label><textarea id="studentNames" rows="6" placeholder="Анна Иванова | 1 группа&#10;Иван Петров | 2 группа"></textarea><button class="save">Создать класс</button></form></div><div class="card"><h3>Подключиться к классу</h3><p class="muted">Введите код, который выдал учитель, создавший класс.</p><form id="joinClassForm"><label>Код приглашения</label><input id="joinClassCode" required placeholder="Например, A7K9Q2"><button class="save">Подключиться</button></form></div>';
  out+=teacherClasses().map(c=>'<div class="card"><b>'+safe(c.name)+'</b><p>Код для коллег: <b>'+safe(c.inviteCode||"Нет кода")+'</b></p><p class="muted">Поделитесь этим кодом с другими учителями. Учителей подключено: '+(c.teacherUsernames||[c.teacherUsername].filter(Boolean)).length+'</p><p>Группы: '+c.groups.map(safe).join(", ")+'</p>'+c.students.map(s=>'<div class="row">'+safe(s.name)+' <span class="muted">— '+safe(s.group)+'</span></div>').join("")+'</div>').join("")||empty("Классов пока нет","Создайте первый класс или подключитесь по коду.");
 } else if(p==="Журнал оценок"||p==="Мои оценки") {
  if(role==="teacher") out=(teacherClasses().length?'<div class="card"><h3>Выставить оценку</h3><form id="gradeForm"><label>Класс</label><select id="gClass">'+classOptions()+'</select><label>Группа</label><select id="gGroup"></select><label>Ученик</label><select id="gStudent"></select><label>Предмет</label><input id="gSubject" required><label>Оценка</label><select id="gMark"><option>5</option><option>4</option><option>3</option><option>2</option></select><button class="save">Выставить оценку</button></form></div>':empty("Нет классов","Сначала добавьте класс."))+gradeTable(grades().filter(myTeacherRecord));
  else out=gradeTable(grades().filter(studentMatches));
 } else if(p==="Итоговые оценки") {
  if(role==="teacher")out=finalForm();
  const list=role==="teacher"?finals().filter(myTeacherRecord):finals().filter(studentMatches);
  out+=(list.length?'<div class="card"><h3>Итоговые оценки</h3>'+list.map(g=>'<div class="row">'+safe(g.className)+' · '+safe(g.student)+' · '+safe(g.subject)+' · '+safe(g.period)+' <b>'+safe(g.mark)+'</b><br><span class="muted">Выставил: '+safe(g.teacher)+'</span></div>').join("")+'</div>':empty("Итоговых оценок пока нет","Пока нет оценок для отображения."));
 } else if(p==="Домашние задания") {
  if(role==="teacher")out='<div class="card"><h3>Добавить домашнее задание</h3><form id="taskForm"><label>Класс</label><select id="tClass">'+classOptions()+'</select><label>Группа</label><select id="tGroup"></select><label>Предмет</label><input id="tSubject" required><label>Задание</label><textarea id="tDescription" rows="3" required></textarea><label>Срок сдачи</label><input id="tDue" placeholder="Например, 25 ноября"><button class="save">Добавить задание</button></form></div>';
  const list=role==="teacher"?tasks().filter(myTeacherRecord):tasks().filter(studentMatches); out+=homeworkList(list);
 } else if(p==="Контрольные") {
  if(role==="teacher") {
   out=teacherClasses().length?'<div class="card"><h3>Добавить контрольную</h3><form id="testForm"><label>Класс</label><select id="xClass">'+classOptions()+'</select><label>Группа</label><select id="xGroup"></select><label>Предмет</label><input id="xSubject" required placeholder="Например, математика"><label>Тема контрольной</label><input id="xTopic" required placeholder="Например, дроби"><label>Дата проведения</label><input id="xDate" type="date" required><label>Формат</label><select id="xFormat"><option>Письменная работа</option><option>Тест</option><option>Самостоятельная работа</option><option>Устный опрос</option></select><button class="save">Добавить в список</button></form></div>':empty("Нет классов","Сначала добавьте класс.");
  }
  const list=role==="teacher"?tests().filter(myTeacherRecord):tests().filter(studentMatches);
  out+='<div class="card"><h3>Список контрольных</h3>'+(list.length?list.map(t=>'<div class="row"><b>'+safe(t.date)+' · '+safe(t.subject)+'</b><br>'+safe(t.className)+' · '+safe(t.group||"Весь класс")+'<br>Тема: '+safe(t.topic)+'<br>Формат: '+safe(t.format)+'<br><span class="muted">Учитель: '+safe(t.teacher)+'</span></div>').join(""):'<p class="muted">Контрольные пока не добавлены.</p>')+'</div>';
 } else if(p==="Расписание") {
  if(role==="teacher")out='<div class="card"><h3>Добавить урок</h3><form id="lessonForm"><label>День недели</label><select id="lDay"><option>Понедельник</option><option>Вторник</option><option>Среда</option><option>Четверг</option><option>Пятница</option><option>Суббота</option></select><label>Время</label><input id="lTime" required placeholder="08:30"><label>Класс</label><select id="lClass">'+classOptions()+'</select><label>Группа</label><select id="lGroup"></select><label>Предмет</label><input id="lSubject" required><button class="save">Добавить урок</button></form></div>';
  const visibleClassNames=role==="teacher"?teacherClasses().map(c=>c.name):[mine?.className].filter(Boolean); const list=lessons().filter(l=>visibleClassNames.includes(l.className)&&(role==="teacher"||studentMatches(l))); out+=scheduleList(list);
 }
 $("#content").innerHTML=out;
 if(p==="Мои классы"&&role==="teacher") {
  $("#classForm").onsubmit=e=>{e.preventDefault();const nameClass=$("#className").value.trim();const gs=$("#groupNames").value.split(",").map(x=>x.trim()).filter(Boolean);const groups=gs.length?gs:["Общая"];const students=$("#studentNames").value.split("\n").map(line=>{const parts=line.split("|").map(x=>x.trim());return parts[0]?{name:parts[0],group:groups.includes(parts[1])?parts[1]:groups[0]}:null;}).filter(Boolean);const cs=classes();if(cs.some(c=>c.name.toLowerCase()===nameClass.toLowerCase()&&teacherClasses().some(tc=>tc.name===c.name)))return alert("Такой класс у вас уже есть.");const code=Array.from(crypto.getRandomValues(new Uint8Array(4)),b=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b%32]).join("");cs.push({name:nameClass,groups,students,teacher:name,teacherType,teacherUsername:teacherUsername(),teacherUsernames:[teacherUsername()],inviteCode:code});put("classes",cs);page(p);};
  $("#joinClassForm").onsubmit=e=>{e.preventDefault();const code=$("#joinClassCode").value.trim().toUpperCase();const cs=classes();const c=cs.find(x=>x.inviteCode&&x.inviteCode.toUpperCase()===code);if(!c)return alert("Класс с таким кодом не найден в этом браузере.");c.teacherUsernames=Array.isArray(c.teacherUsernames)?c.teacherUsernames:[c.teacherUsername].filter(Boolean);if(!c.teacherUsernames.includes(teacherUsername()))c.teacherUsernames.push(teacherUsername());put("classes",cs);alert("Вы подключились к классу "+c.name+". Теперь вам доступны ученики и общее расписание.");page(p);};
 }
 if(p==="Журнал оценок"&&role==="teacher"&&$("#gradeForm")){studentOptions("gClass","gStudent","gGroup");$("#gradeForm").onsubmit=e=>{e.preventDefault();if(!$("#gStudent").value)return;const a=grades();a.unshift({className:$("#gClass").value,group:$("#gGroup").value,student:$("#gStudent").value,subject:$("#gSubject").value.trim(),mark:$("#gMark").value,teacher:name,teacherType,teacherUsername:teacherUsername(),teacherSubjects,date:new Date().toLocaleDateString("ru-RU")});put("grades",a);page(p);};}
 if(p==="Итоговые оценки"&&role==="teacher"&&$("#finalForm")){studentOptions("fClass","fStudent");$("#finalForm").onsubmit=e=>{e.preventDefault();if(!$("#fStudent").value)return;const a=finals();a.unshift({className:$("#fClass").value,student:$("#fStudent").value,subject:$("#fSubject").value.trim(),period:$("#fPeriod").value,mark:$("#fMark").value,teacher:name,teacherType,teacherUsername:teacherUsername(),teacherSubjects});put("finals",a);page(p);};}
 if(p==="Домашние задания"&&role==="teacher"&&$("#taskForm")){const c=$("#tClass"),g=$("#tGroup");const fill=()=>g.innerHTML=groupOptions(c.value,true);c.onchange=fill;fill();$("#taskForm").onsubmit=e=>{e.preventDefault();const subject=$("#tSubject").value.trim(),description=$("#tDescription").value.trim();if(!c.value||!subject||!description)return alert("Выберите класс и заполните предмет и задание.");const a=tasks();a.unshift({className:c.value,group:g.value||"Весь класс",subject,description,due:$("#tDue").value.trim(),teacher:name,teacherType,teacherUsername:teacherUsername(),teacherSubjects});put("tasks",a);page(p);};}
 if(p==="Контрольные"&&role==="teacher"&&$("#testForm")){const c=$("#xClass"),g=$("#xGroup");const fill=()=>g.innerHTML=groupOptions(c.value,true);c.onchange=fill;fill();$("#testForm").onsubmit=e=>{e.preventDefault();const a=tests();a.unshift({className:c.value,group:g.value,subject:$("#xSubject").value.trim(),topic:$("#xTopic").value.trim(),date:$("#xDate").value,format:$("#xFormat").value,teacher:name,teacherType,teacherUsername:teacherUsername()});put("tests",a);page(p);};}
 if(p==="Расписание"&&role==="teacher"&&$("#lessonForm")){const c=$("#lClass"),g=$("#lGroup");const fill=()=>g.innerHTML=groupOptions(c.value);c.onchange=fill;fill();$("#lessonForm").onsubmit=e=>{e.preventDefault();const a=lessons();a.push({day:$("#lDay").value,time:$("#lTime").value.trim(),className:c.value,group:g.value,subject:$("#lSubject").value.trim(),teacher:name,teacherType,teacherSubjects});put("lessons",a);page(p);};}
}
function updateAuthFields() {
 const isTeacher=$("#role").value==="teacher";
 $("#teacherFields").classList.toggle("hidden",!isTeacher);
 $("#studentFields").classList.toggle("hidden",isTeacher);
 if(isTeacher) $("#teacherRegisterFields").classList.toggle("hidden",$("#teacherMode").value!=="register");
}
$("#role").onchange=updateAuthFields;
$("#teacherMode").onchange=updateAuthFields;
$("#form").onsubmit=async e=>{e.preventDefault();try{await handleAuth();}catch(err){console.error(err);alert("Не удалось выполнить вход. Проверьте данные и попробуйте ещё раз.");}};
$("#exit").onclick=()=>{localStorage.removeItem("diary_session");localStorage.removeItem("diary_activeTeacherUsername");$("#cabinet").classList.add("hidden");$("#login").classList.remove("hidden");};
$("#theme").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("diaryTheme",document.body.classList.contains("dark")?"dark":"light");};
updateAuthFields();
if(localStorage.getItem("diaryTheme")==="dark")document.body.classList.add("dark");
try {
 const session=JSON.parse(localStorage.getItem("diary_session")||"null");
 if(session&&session.role==="teacher"&&session.username){
  const account=get("teacherAccounts").find(a=>a.username===session.username);
  if(account){role="teacher";name=account.name;teacherType=account.teacherType;teacherSubjects=account.teacherSubjects||[];localStorage.setItem("diary_activeTeacherUsername",account.username);openCabinet();}
  else localStorage.removeItem("diary_session");
 } else if(session&&session.role==="student"&&session.name){role="student";name=session.name;openCabinet();}
} catch(error){localStorage.removeItem("diary_session");}
