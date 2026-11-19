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
const remarks = () => get("remarks");
const saveSession = () => localStorage.setItem("diary_session", JSON.stringify({role,name,teacherType,teacherSubjects,username:role==="teacher"?localStorage.getItem("diary_activeTeacherUsername")||"":""}));
const normClass = c => ({...c, groups:Array.isArray(c.groups)&&c.groups.length?c.groups:["Общая"], students:(c.students||[]).map(s=>typeof s==="string"?{name:s,group:"Общая"}:s)});
const allClasses = () => classes().map(normClass);
const teacherUsername = () => localStorage.getItem("diary_activeTeacherUsername") || "";
const teacherClasses = () => {
 const raw=classes(), username=teacherUsername();
 let changed=false;
 const owned=raw.filter(c=>{
  const members=Array.isArray(c.teacherUsernames)?c.teacherUsernames:[];
  return members.includes(username) || c.teacherUsername===username ||
   ((!c.teacherUsername || members.length===0) && c.teacher===name && c.teacherType===teacherType);
 });
 owned.forEach(c=>{
  if(!Array.isArray(c.teacherUsernames)){c.teacherUsernames=[];changed=true;}
  if(username&&!c.teacherUsernames.includes(username)){c.teacherUsernames.push(username);changed=true;}
  if(!c.teacherUsername&&username){c.teacherUsername=username;changed=true;}
  if(!c.inviteCode){c.inviteCode=Array.from(crypto.getRandomValues(new Uint8Array(4)),b=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b%32]).join("");changed=true;}
 });
 if(changed)put("classes",raw);
 return owned.map(normClass);
};
const classOptions = (selected="") => (role==="teacher"?teacherClasses():allClasses()).map(c=>'<option value="'+safe(c.name)+'"'+(c.name===selected?" selected":"")+'>'+safe(c.name)+'</option>').join("");
const myTeacherRecord = item => item.teacherUsername ? item.teacherUsername===teacherUsername() : item.teacher === name && (!item.teacherType || item.teacherType === teacherType);
const currentStudent = () => allClasses().flatMap(c=>c.students.map(s=>({...s,className:c.name}))).find(s=>s.name.toLowerCase()===name.toLowerCase());
const studentMatches = item => { const s=currentStudent(); if(!s || !item.student) return false; return item.className===s.className && (!item.group || item.group==="Весь класс" || item.group===s.group) && item.student.trim().toLowerCase()===name.trim().toLowerCase(); };
const homeworkMatchesStudent = item => { const student=currentStudent(); if(!student) return false; return item.className===student.className && (!item.group || item.group==="Весь класс" || item.group===student.group); };
const scheduleMatchesStudent = item => { const student=currentStudent(); if(!student) return false; return item.className===student.className && (!item.group || item.group==="Весь класс" || item.group===student.group); };
function openCabinet() {
 $("#login").classList.add("hidden"); $("#cabinet").classList.remove("hidden");
 $("#who").textContent=name+" · "+(role==="teacher"?teacherType:"Ученик");
 const menus=role==="teacher"?["Главная","Мои классы","Журнал оценок","Итоговые оценки","Замечания","Домашние задания","Расписание","Контрольные","Библиотека учителя"]:["Главная","Мои оценки","Итоговые оценки","Замечания","Домашние задания","Расписание","Контрольные"];
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
function classSource() { return role==="teacher" ? teacherClasses() : allClasses(); }
function groupOptions(className, includeAll=false) {
 const c=classSource().find(x=>x.name===className); const groups=c?c.groups:["Общая"];
 return (includeAll?'<option value="Весь класс">Весь класс</option>':"")+groups.map(g=>'<option value="'+safe(g)+'">'+safe(g)+'</option>').join("");
}
function studentOptions(classId,studentId,groupId) {
 const c=$("#"+classId), s=$("#"+studentId), g=groupId?$("#"+groupId):null; if(!c||!s)return;
 const fill=()=>{
  const item=classSource().find(x=>x.name===c.value);
  if(g)g.innerHTML=groupOptions(c.value,true);
  const grp=g?g.value:"Весь класс";
  const people=item?item.students.filter(x=>!g||grp==="Весь класс"||grp==="Все"||x.group===grp):[];
  s.innerHTML=people.length?people.map(x=>'<option value="'+safe(x.name)+'">'+safe(x.name)+'</option>').join(""):'<option value="">Нет учеников в выбранной группе</option>';
 };
 c.onchange=fill; if(g)g.onchange=fill; fill();
}
function gradeTable(list) {
 if(!list.length)return empty("Оценок пока нет","Учитель ещё не добавил оценки.");
 const actions=role==="teacher";
 return '<div class="card"><div class="table-wrap"><table class="grade-table"><thead><tr><th>Класс</th><th>Ученик</th><th>Предмет</th><th>Оценка</th><th>Кто поставил</th><th>Дата</th>'+(actions?'<th>Действия</th>':"")+'</tr></thead><tbody>'+list.map(g=>{const index=Number.isInteger(g._index)?g._index:grades().findIndex(x=>x===g);return '<tr><td>'+safe(g.className)+'</td><td>'+safe(g.student)+'</td><td>'+safe(g.subject)+'</td><td class="grade">'+safe(g.mark)+'</td><td>'+safe(g.teacher||"Не указано")+'</td><td>'+safe(g.date||"")+'</td>'+(actions?'<td><button type="button" class="small" data-edit-grade="'+index+'">Изменить</button> <button type="button" class="small danger" data-delete-grade="'+index+'">Удалить</button></td>':"")+'</tr>';}).join("")+"</tbody></table></div></div>";
}
function homeworkList(list) {
 if(!list.length)return empty("Заданий пока нет","Для вашего класса и группы заданий пока нет.");
 return '<div class="card">'+list.map(t=>'<div class="row"><b>'+safe(t.subject)+'</b> · '+safe(t.className)+' · '+safe(t.group||"Весь класс")+'<br>'+safe(t.description)+'<br><span class="muted">Срок: '+safe(t.due||"не указан")+' · Учитель: '+safe(t.teacher)+'</span></div>').join("")+"</div>";
}
function scheduleList(list) {
 if(!list.length)return empty("Расписание пока не составлено","Для вашего класса и группы уроков пока нет.");
 return '<div class="card">'+list.map(l=>'<div class="row"><b>'+safe(l.day)+' · '+safe(l.time)+'</b><br>'+safe(l.className)+' · '+safe(l.group||"Весь класс")+' — '+safe(l.subject)+'<br><span class="muted">Учитель: '+safe(l.teacher||"Не указан")+'</span></div>').join("")+"</div>";
}
function markFromPoints(points) { return Number(points); }
function finalForm() {
 if(!teacherClasses().length)return empty("Сначала добавьте класс","Создайте класс и внесите список учеников.");
 return '<div class="card"><h3>Выставить итоговую оценку</h3><form id="finalForm"><label>Класс</label><select id="fClass">'+classOptions()+'</select><label>Ученик</label><select id="fStudent"></select><label>Предмет</label><input id="fSubject" required placeholder="Например, математика"><label>Период</label><select id="fPeriod"><option>1 четверть</option><option>2 четверть</option><option>3 четверть</option><option>4 четверть</option><option>1 полугодие</option><option>2 полугодие</option><option>Годовая</option></select><label>Итоговая оценка (от 0 до 100)</label><input id="fPoints" type="number" min="0" max="100" step="1" required placeholder="Например, 85"><p id="fGradePreview" class="muted">Введите итоговый результат от 0 до 100 баллов.</p><button class="save" type="submit">Сохранить итог</button></form></div>';
}
const curriculum = {"1":{"Математика":["Числа до 10","Состав числа","Сложение и вычитание","Числа до 20","Задачи","Длина и геометрические фигуры"],"Русский язык":["Звуки и буквы","Алфавит","Гласные и согласные","Слоги и перенос","Ударение","Предложение и текст"],"Литературное чтение":["Народные сказки","Авторские сказки","Стихи о природе","Рассказы о детях","Загадки и пословицы"],"Окружающий мир":["Школа и семья","Природа вокруг нас","Растения и животные","Времена года","Здоровье и безопасность"],"Английский язык":["Приветствие","Цвета и числа","Семья","Школьные предметы","Животные","Еда"]},"2":{"Математика":["Числа до 100","Сложение и вычитание","Таблица умножения","Деление","Периметр","Задачи в два действия"],"Русский язык":["Корень слова","Однокоренные слова","Безударные гласные","Парные согласные","Имя существительное","Глагол и прилагательное"],"Литературное чтение":["Сказки народов мира","Басни","Рассказы о природе","Стихи","Главная мысль","Характер героя"],"Окружающий мир":["Живая и неживая природа","Растения","Животные","Стороны горизонта","Россия на карте","Здоровый образ жизни"],"Английский язык":["Алфавит","Моя семья","Мой день","Дом","Еда","Одежда"]},"3":{"Математика":["Таблица умножения и деления","Порядок действий","Письменные вычисления","Доли","Площадь и периметр","Уравнения и задачи"],"Русский язык":["Состав слова","Орфограммы в корне","Имя существительное и падежи","Имя прилагательное","Времена глагола","Однородные члены"],"Литературное чтение":["Былины","Сказки Пушкина","Басни Крылова","Рассказы о дружбе","Поэзия о природе","Пересказ"],"Окружающий мир":["Организм человека","Разнообразие растений","Грибы и бактерии","Группы животных","Экосистемы","Полезные ископаемые"],"Английский язык":["Семья и друзья","Распорядок дня","Школа","Дом","Покупки","Спорт и увлечения"]},"4":{"Математика":["Многозначные числа","Письменные вычисления","Дроби","Величины","Скорость и расстояние","Уравнения и задачи"],"Русский язык":["Склонение существительных","Падежные окончания","Местоимения","Спряжение глаголов","Члены предложения","Прямая речь"],"Литературное чтение":["Фольклор","Былины","Исторические рассказы","Классическая детская литература","Зарубежные сказки","Сочинение"],"Окружающий мир":["Природные зоны России","Материки и океаны","Экология","История Руси","Города России","Экономика"],"Английский язык":["Страны и города","Профессии","Путешествия","Здоровье","Прошедшее время","Планы"]},"5":{"Математика":["Натуральные числа","Действия с натуральными числами","Делимость","Обыкновенные дроби","Десятичные дроби","Проценты","Углы и площади"],"Русский язык":["Морфемика","Орфограммы корня","Части речи","Существительное","Прилагательное","Глагол","Синтаксис и пунктуация"],"Литература":["Мифы","Фольклор","Народные сказки","Басни","Литературная сказка","Сюжет и композиция"],"История":["Исторические источники","Первобытность","Древний Восток","Древняя Греция","Древний Рим","Античная культура"],"Биология":["Биология и методы","Клетка","Бактерии и грибы","Растения","Животные","Среды обитания"],"География":["Земля и география","Глобус и карта","Масштаб","Литосфера","Гидросфера","Атмосфера"],"Английский язык":["Семья","Школа","Дом","Досуг","Еда","Город"]},"6":{"Математика":["Делимость","Обыкновенные дроби","Действия с дробями","Отношения и пропорции","Проценты","Отрицательные числа","Рациональные числа"],"Русский язык":["Существительное","Прилагательное","Числительное","Местоимение","Глагол","Причастие","Наречие","Словообразование"],"Литература":["Мифы и эпос","Былины","Древнерусская литература","Произведения о природе","Рассказ и повесть","Лирический герой"],"История":["Древнейшие люди","Египет","Месопотамия","Индия и Китай","Греция","Рим","Раннее Средневековье"],"Биология":["Строение растений","Фотосинтез","Размножение растений","Грибы","Бактерии","Одноклеточные","Группы животных"],"География":["План местности","Координаты","Рельеф","Климат","Мировой океан","Воды суши","Природные зоны"],"Обществознание":["Человек и деятельность","Общение","Семья","Образование","Нормы поведения","Права ребёнка"],"Английский язык":["Времена глагола","Путешествия","Покупки","Здоровье","Культура","Модальные глаголы"]},"7":{"Алгебра":["Линейные уравнения","Степень","Одночлены и многочлены","Формулы сокращённого умножения","Разложение на множители","Функции и графики","Системы уравнений"],"Геометрия":["Углы","Треугольники","Равенство треугольников","Параллельные прямые","Сумма углов","Геометрические построения"],"Русский язык":["Причастие","Причастный оборот","Деепричастие","Наречие","Предлог и союз","Частица","Орфография"],"Литература":["Древнерусская литература","Литература XVIII века","Русская классика","Героизм и честь","Сатира","Лирика","Литература XX века"],"История":["Средневековые государства","Византия","Исламский мир","Крестовые походы","Города Средневековья","Русь XIII–XV веков"],"Биология":["Клетка и ткани","Беспозвоночные","Позвоночные","Опорно-двигательная система","Пищеварение","Дыхание","Кровообращение"],"География":["Африка","Австралия","Антарктида","Южная Америка","Северная Америка","Евразия","Население мира"],"Физика":["Физические величины","Движение","Скорость","Масса и плотность","Силы","Давление","Работа и мощность"],"Английский язык":["Школьная жизнь","Хобби","Путешествия","Здоровье","Экология","Известные люди"]},"8":{"Алгебра":["Рациональные дроби","Квадратные корни","Квадратные уравнения","Теорема Виета","Неравенства","Функция y=x²","Степень"],"Геометрия":["Четырёхугольники","Параллелограмм","Прямоугольник и ромб","Площади","Теорема Пифагора","Подобие","Окружность"],"Русский язык":["Словосочетание","Двусоставные предложения","Односоставные предложения","Осложнённое предложение","Обособленные члены","Вводные слова","Сложные предложения"],"Литература":["Русская классика XIX века","Лирика","Нравственный выбор","Роман и повесть","Литература XX века","Зарубежная литература"],"История":["Европа XVI–XVII веков","Реформация","Открытия","Россия XVI века","Смутное время","Первые Романовы","Петровские реформы"],"Биология":["Нервная система","Эндокринная система","Кровь","Кровообращение","Дыхание","Пищеварение","Органы чувств"],"География":["Геология России","Рельеф","Климат","Внутренние воды","Природные зоны","Население","Хозяйство"],"Физика":["Тепловое движение","Температура","Количество теплоты","Агрегатные состояния","Электрический ток","Закон Ома","Мощность тока"],"Химия":["Атомы и молекулы","Химические элементы","Простые и сложные вещества","Формулы","Валентность","Уравнения реакций","Кислород и водород"]},"9":{"Алгебра":["Квадратичная функция","Неравенства","Арифметическая прогрессия","Геометрическая прогрессия","Комбинаторика","Вероятность","Статистика"],"Геометрия":["Векторы","Координаты","Тригонометрические отношения","Правильные многоугольники","Окружность","Преобразования","Стереометрия"],"Русский язык":["Сложносочинённые предложения","Сложноподчинённые предложения","Виды придаточных","Бессоюзные предложения","Сложные конструкции","Синтаксический анализ","Сочинение"],"Литература":["Литература XVIII–XIX веков","Романтизм и реализм","Лирика","Русский роман","Драматургия","Литература XX века","Зарубежная классика"],"История":["Мир XVIII века","Россия XVIII века","Просвещение","Промышленный переворот","Европа XIX века","Реформы России","Общественные движения"],"Биология":["Наследственность","Изменчивость","Генетика","Размножение","Эволюция","Экосистемы","Биосфера"],"География":["Отрасли хозяйства","Энергетика","Промышленность","Сельское хозяйство","Транспорт","Регионы России","Глобальные проблемы"],"Физика":["Законы Ньютона","Импульс","Энергия","Колебания и волны","Электромагнетизм","Свет","Линзы"],"Химия":["Периодический закон","Строение атома","Химическая связь","Неметаллы","Металлы","Растворы","Органические вещества"],"Обществознание":["Человек и общество","Экономика","Рынок","Предпринимательство","Политика","Государство","Право","Социальные отношения"],"Информатика":["Информация","Кодирование","Логика","Таблицы","Алгоритмы","Программирование","Сети","Безопасность"]},"10":{"Алгебра и начала анализа":["Действительные числа","Степенная функция","Показательная функция","Логарифмы","Тригонометрические функции","Уравнения","Производная","Вероятность"],"Геометрия":["Аксиомы стереометрии","Параллельность","Перпендикулярность","Многогранники","Призма и пирамида","Сечения","Векторы в пространстве"],"Русский язык":["Языковые нормы","Орфоэпия","Лексика","Морфология","Синтаксис","Стили речи","Текст","Выразительные средства","Сочинение"],"Литература":["Литература XIX века","Романтизм","Реализм","Пушкин","Лермонтов","Гоголь","Тургенев","Гончаров","Поэзия XIX века"],"История":["Мир начала XX века","Россия начала XX века","Революция 1905 года","Первая мировая война","1917 год","Гражданская война","СССР 1920–1930-х","Межвоенный мир"],"Обществознание":["Человек и общество","Познание","Духовная культура","Мораль и религия","Экономические системы","Рынок","Предпринимательство","Социальные институты"],"Биология":["Молекулярный уровень","Клетка","Обмен веществ","Размножение","Генетика","Наследование","Селекция","Биотехнологии"],"Физика":["Кинематика","Динамика","Законы сохранения","Статика","Молекулярная физика","Термодинамика","Электростатика","Ток"],"Химия":["Строение атома","Периодический закон","Химическая связь","Классификация реакций","Скорость реакций","Равновесие","Растворы","Органическая химия"],"Информатика":["Системы счисления","Логика","Компьютерные системы","Алгоритмы","Программирование","Базы данных","Сети","Кибербезопасность"],"Английский язык":["Образование и карьера","Наука","Глобальные проблемы","Культура","Медиа","Экология","Сложная грамматика","Эссе"]},"11":{"Алгебра и начала анализа":["Предел функции","Производная","Первообразная и интеграл","Показательные уравнения","Логарифмические уравнения","Тригонометрические уравнения","Комбинированные задачи","Вероятность","Повторение"],"Геометрия":["Цилиндр","Конус","Шар","Объёмы тел","Площади поверхностей","Комбинации тел","Координаты","Расстояния в пространстве"],"Русский язык":["Сложная орфография","Пунктуация","Синтаксические нормы","Лексические нормы","Стили речи","Проблема и позиция автора","Аргументация","Итоговое сочинение"],"Литература":["Серебряный век","Символизм","Акмеизм","Футуризм","Литература 1920–1930-х","Военная литература","Литература второй половины XX века","Современная литература"],"История":["Вторая мировая война","Послевоенный мир","СССР второй половины XX века","Холодная война","Перестройка","Распад СССР","Российская Федерация","Современный мир"],"Обществознание":["Философия","Наука и образование","Экономический рост","Финансы","Рынок труда","Политическая система","Гражданское общество","Право","Отрасли права"],"Биология":["Эволюция","Естественный отбор","Возникновение жизни","Развитие органического мира","Экосистемы","Биосфера","Экология","Глобальные проблемы"],"Физика":["Магнитное поле","Электромагнитная индукция","Электромагнитные волны","Оптика","Квантовые явления","Атомная физика","Ядерная физика","Теория относительности"],"Химия":["Углеводороды","Спирты и фенолы","Альдегиды и кислоты","Сложные эфиры","Амины","Полимеры","Химическое производство","Расчётные задачи"],"Информатика":["Моделирование","Алгоритмы","Программирование","Анализ данных","Базы данных и SQL","Компьютерные сети","Искусственный интеллект","Информационная безопасность"],"Английский язык":["Современное общество","Профессиональный выбор","Научный прогресс","Экология","Межкультурное общение","Глобализация","Аргументация","Экзаменационная практика"]}};
function page(p) {
 $("#title").textContent=p; document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===p));
 let out=""; const mine=currentStudent();
 if(p==="Главная") out='<div class="card"><h3>Здравствуйте, '+safe(name)+'!</h3><p class="muted">'+(role==="teacher"?"Профиль: "+safe(teacherType)+". Ваши записи отображаются отдельно от записей других учителей. Предметы: "+safe(teacherSubjects.join(", ")||"не указаны"):mine?"Ваш класс: "+safe(mine.className)+", группа: "+safe(mine.group)+".":"Ваше имя пока не найдено в списках учеников. Попросите учителя добавить вас в свой класс.")+'</p></div>';
 else if(p==="Мои классы"&&role==="teacher") {
  out='<div class="card"><h3>Создать общий класс</h3><p class="muted">Создайте класс, добавьте учеников и поделитесь кодом приглашения с другими учителями.</p><form id="classForm"><label>Название класса</label><input id="className" required placeholder="Например, 1 А"><label>Названия групп (через запятую)</label><input id="groupNames" placeholder="1 группа, 2 группа"><label>Ученики (каждый с новой строки; формат: Имя Фамилия | группа)</label><textarea id="studentNames" rows="6" placeholder="Анна Иванова | 1 группа&#10;Иван Петров | 2 группа"></textarea><button class="save">Создать класс</button></form></div><div class="card"><h3>Подключиться к классу</h3><p class="muted">Введите код, который выдал учитель, создавший класс.</p><form id="joinClassForm"><label>Код приглашения</label><input id="joinClassCode" required placeholder="Например, A7K9Q2"><button class="save">Подключиться</button></form></div>';
  out+=teacherClasses().map(c=>'<div class="card"><b>'+safe(c.name)+'</b><p>Код для коллег: <b>'+safe(c.inviteCode||"Нет кода")+'</b></p><p class="muted">Поделитесь этим кодом с другими учителями. Учителей подключено: '+(c.teacherUsernames||[c.teacherUsername].filter(Boolean)).length+'</p><p>Группы: '+c.groups.map(safe).join(", ")+'</p>'+c.students.map(s=>'<div class="row">'+safe(s.name)+' <span class="muted">— '+safe(s.group)+'</span></div>').join("")+'</div>').join("")||empty("Классов пока нет","Создайте первый класс или подключитесь по коду.");
 } else if(p==="Журнал оценок"||p==="Мои оценки") {
  if(role==="teacher") out=(teacherClasses().length?'<div class="card"><h3>Выставить оценку</h3><form id="gradeForm"><label>Класс</label><select id="gClass">'+classOptions()+'</select><label>Группа</label><select id="gGroup"></select><label>Ученик</label><select id="gStudent"></select><label>Предмет</label><input id="gSubject" required><label>Оценка</label><select id="gMark"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="Н">Н (не был)</option></select><button class="save">Выставить оценку</button></form></div>':empty("Нет классов","Сначала добавьте класс."))+gradeTable(grades().map((g,index)=>({...g,_index:index})).filter(myTeacherRecord));
  else out=gradeTable(grades().filter(studentMatches));
 } else if(p==="Итоговые оценки") {
  if(role==="teacher")out=finalForm();
  const list=role==="teacher"?finals().filter(myTeacherRecord):finals().filter(studentMatches);
  out+=(list.length?'<div class="card"><h3>Итоговые оценки</h3>'+list.map(g=>'<div class="row">'+safe(g.className)+' · '+safe(g.student)+' · '+safe(g.subject)+' · '+safe(g.period)+' <b>'+safe(g.mark)+'</b>'+(g.points!==undefined?' · '+safe(g.points)+'/100 баллов':'')+'<br><span class="muted">Выставил: '+safe(g.teacher)+'</span></div>').join("")+'</div>':empty("Итоговых оценок пока нет","Пока нет оценок для отображения."));
 } else if(p==="Замечания") {
  if(role==="teacher")out=teacherClasses().length?'<div class="card"><h3>Добавить замечание</h3><form id="remarkForm"><label>Класс</label><select id="rClass">'+classOptions()+'</select><label>Группа</label><select id="rGroup"></select><label>Ученик</label><select id="rStudent"></select><label>Текст замечания</label><textarea id="rText" rows="3" required placeholder="Напишите замечание ученику"></textarea><button class="save">Отправить замечание</button></form></div>':empty("Нет классов","Сначала добавьте класс.");
  const list=role==="teacher"?remarks().filter(myTeacherRecord):remarks().filter(studentMatches);
  out+='<div class="card"><h3>Список замечаний</h3>'+(list.length?list.map(r=>'<div class="row"><b>'+safe(r.className)+' · '+safe(r.student)+'</b><br>'+safe(r.text)+'<br><span class="muted">Учитель: '+safe(r.teacher)+' · '+safe(r.date)+'</span></div>').join(""):'<p class="muted">Замечаний пока нет.</p>')+'</div>';
 } else if(p==="Домашние задания") {
  if(role==="teacher")out='<div class="card"><h3>Добавить домашнее задание</h3><form id="taskForm"><label>Класс</label><select id="tClass">'+classOptions()+'</select><label>Группа</label><select id="tGroup"></select><label>Предмет</label><input id="tSubject" required><label>Задание</label><textarea id="tDescription" rows="3" required></textarea><label>Срок сдачи</label><input id="tDue" placeholder="Например, 25 ноября"><button class="save">Добавить задание</button></form></div>';
  const list=role==="teacher"?tasks().filter(myTeacherRecord):tasks().filter(homeworkMatchesStudent); out+=homeworkList(list);
 } else if(p==="Контрольные") {
  if(role==="teacher") {
   out=teacherClasses().length?'<div class="card"><h3>Добавить контрольную</h3><form id="testForm"><label>Класс</label><select id="xClass">'+classOptions()+'</select><label>Группа</label><select id="xGroup"></select><label>Предмет</label><input id="xSubject" required placeholder="Например, математика"><label>Тема контрольной</label><input id="xTopic" required placeholder="Например, дроби"><label>Дата проведения</label><input id="xDate" type="date" required><label>Формат</label><select id="xFormat"><option>Письменная работа</option><option>Тест</option><option>Самостоятельная работа</option><option>Устный опрос</option></select><button class="save">Добавить в список</button></form></div>':empty("Нет классов","Сначала добавьте класс.");
  }
  const list=role==="teacher"?tests().filter(myTeacherRecord):tests().filter(studentMatches);
  out+='<div class="card"><h3>Список контрольных</h3>'+(list.length?list.map(t=>'<div class="row"><b>'+safe(t.date)+' · '+safe(t.subject)+'</b><br>'+safe(t.className)+' · '+safe(t.group||"Весь класс")+'<br>Тема: '+safe(t.topic)+'<br>Формат: '+safe(t.format)+'<br><span class="muted">Учитель: '+safe(t.teacher)+'</span></div>').join(""):'<p class="muted">Контрольные пока не добавлены.</p>')+'</div>';
 } else if(p==="Библиотека учителя"&&role==="teacher") {
  const library=get("teacherLibrary");
  const gradeOptions=Array.from({length:11},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+' класс</option>').join("");
  out='<div class="library-hero"><div><span class="library-kicker">ШКОЛЬНАЯ ПРОГРАММА</span><h2>Библиотека учителя · 1–11 классы</h2><p>Темы по основным школьным предметам. Выберите класс и предмет, чтобы открыть программу и подготовить материал.</p></div><div class="library-mark">✦</div></div>'+
  '<div class="card curriculum-picker"><div class="form-grid"><div><label>Класс</label><select id="currClass">'+gradeOptions+'</select></div><div><label>Предмет</label><select id="currSubject"></select></div></div><div class="curriculum-count" id="currCount"></div><div id="currTopics"></div></div>'+
  '<div class="card library-editor"><div class="library-kicker">МАТЕРИАЛЫ УЧИТЕЛЯ</div><h3>Создать учебный материал</h3><form id="libraryForm"><label>Класс</label><select id="libClass">'+gradeOptions+'</select><label>Предмет</label><select id="libSubject"></select><label>Тема</label><input id="libTitle" required placeholder="Название темы"><label>Тип материала</label><select id="libType"><option>Урок</option><option>Учебник</option><option>Рабочая тетрадь</option><option>Задание</option><option>Контрольная работа</option><option>Памятка</option></select><label>Объяснение и задания</label><textarea id="libBody" rows="5" required placeholder="Добавьте объяснение, примеры и упражнения..."></textarea><button class="save">＋ Сохранить материал</button></form></div>'+
  '<div class="library-list-head"><h3>Мои материалы</h3><span>'+library.length+' всего</span></div>'+
  (library.length?library.map((item,index)=>'<div class="library-material"><div class="library-material-icon">📘</div><div class="library-material-info"><span>'+safe(item.className||"Класс не указан")+' · '+safe(item.subject)+' · '+safe(item.type)+'</span><b>'+safe(item.title)+'</b><p>'+safe(item.body)+'</p></div><button class="small danger" data-delete-library="'+index+'">Удалить</button></div>').join(""):empty("Материалов пока нет","Выберите тему программы или создайте собственный материал."));
 }
 else if(p==="Расписание") {
  if(role==="teacher")out='<div class="card"><h3>Добавить урок</h3><form id="lessonForm"><label>День недели</label><select id="lDay"><option>Понедельник</option><option>Вторник</option><option>Среда</option><option>Четверг</option><option>Пятница</option><option>Суббота</option></select><label>Время</label><input id="lTime" required placeholder="08:30"><label>Класс</label><select id="lClass">'+classOptions()+'</select><label>Группа</label><select id="lGroup"></select><label>Предмет</label><input id="lSubject" required><button class="save">Добавить урок</button></form></div>';
  const visibleClassNames=role==="teacher"?teacherClasses().map(c=>c.name):[mine?.className].filter(Boolean); const list=lessons().filter(l=>visibleClassNames.includes(l.className)&&(role==="teacher"||scheduleMatchesStudent(l))); out+=scheduleList(list);
 }
 $("#content").innerHTML=out;
 if(p==="Мои классы"&&role==="teacher") {
  $("#classForm").onsubmit=e=>{e.preventDefault();const nameClass=$("#className").value.trim();const gs=$("#groupNames").value.split(",").map(x=>x.trim()).filter(Boolean);const groups=gs.length?gs:["Общая"];const students=$("#studentNames").value.split("\n").map(line=>{const parts=line.split("|").map(x=>x.trim());return parts[0]?{name:parts[0],group:groups.includes(parts[1])?parts[1]:groups[0]}:null;}).filter(Boolean);const cs=classes();if(cs.some(c=>c.name.toLowerCase()===nameClass.toLowerCase()&&teacherClasses().some(tc=>tc.name===c.name)))return alert("Такой класс у вас уже есть.");const code=Array.from(crypto.getRandomValues(new Uint8Array(4)),b=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b%32]).join("");cs.push({name:nameClass,groups,students,teacher:name,teacherType,teacherUsername:teacherUsername(),teacherUsernames:[teacherUsername()],inviteCode:code});put("classes",cs);page(p);};
  $("#joinClassForm").onsubmit=e=>{e.preventDefault();const code=$("#joinClassCode").value.trim().toUpperCase();const cs=classes();const c=cs.find(x=>x.inviteCode&&x.inviteCode.toUpperCase()===code);if(!c)return alert("Класс с таким кодом не найден в этом браузере.");c.teacherUsernames=Array.isArray(c.teacherUsernames)?c.teacherUsernames:[c.teacherUsername].filter(Boolean);if(!c.teacherUsernames.includes(teacherUsername()))c.teacherUsernames.push(teacherUsername());put("classes",cs);alert("Вы подключились к классу "+c.name+". Теперь вам доступны ученики и общее расписание.");page(p);};
 }
 if(p==="Журнал оценок"&&role==="teacher"&&$("#gradeForm")){studentOptions("gClass","gStudent","gGroup");$("#gradeForm").onsubmit=e=>{e.preventDefault();if(!$("#gStudent").value)return;const a=grades();a.unshift({className:$("#gClass").value,group:$("#gGroup").value,student:$("#gStudent").value,subject:$("#gSubject").value.trim(),mark:$("#gMark").value,teacher:name,teacherType,teacherUsername:teacherUsername(),teacherSubjects,date:new Date().toLocaleDateString("ru-RU")});put("grades",a);page(p);};}
 if(p==="Журнал оценок"&&role==="teacher"){
  document.querySelectorAll("[data-edit-grade]").forEach(button=>button.onclick=()=>{
   const index=Number(button.dataset.editGrade), a=grades(), item=a[index];
   if(!item||!myTeacherRecord(item))return alert("Можно изменять только свои оценки.");
   const next=prompt("Введите новую оценку: 2, 3, 4, 5 или Н",String(item.mark));
   if(next===null)return;
   const mark=next.trim().toUpperCase();
   if(!["2","3","4","5","Н"].includes(mark))return alert("Допустимые значения: 2, 3, 4, 5 или Н.");
   item.mark=mark; item.editedAt=new Date().toLocaleString("ru-RU"); put("grades",a); page(p);
  });
  document.querySelectorAll("[data-delete-grade]").forEach(button=>button.onclick=()=>{
   const index=Number(button.dataset.deleteGrade), a=grades(), item=a[index];
   if(!item||!myTeacherRecord(item))return alert("Можно удалять только свои оценки.");
   if(!confirm("Удалить эту оценку?"))return;
   a.splice(index,1); put("grades",a); page(p);
  });
 }
 if(p==="Итоговые оценки"&&role==="teacher"&&$("#finalForm")){
  studentOptions("fClass","fStudent");
  const pointsInput=$("#fPoints"), preview=$("#fGradePreview");
  pointsInput.oninput=()=>{const v=pointsInput.value;if(v===""||Number(v)<0||Number(v)>100){preview.textContent="Введите число от 0 до 100.";return;}preview.textContent="Итоговая оценка: "+v+"/100 баллов";};
  $("#finalForm").onsubmit=e=>{
   e.preventDefault();
   const points=Number(pointsInput.value);
   if(!$("#fStudent").value)return alert("Выберите ученика.");
   if(!Number.isInteger(points)||points<0||points>100)return alert("Введите целое число баллов от 0 до 100.");
   const a=finals();
   a.unshift({className:$("#fClass").value,student:$("#fStudent").value,subject:$("#fSubject").value.trim(),period:$("#fPeriod").value,points,maxPoints:100,mark:points,teacher:name,teacherType,teacherUsername:teacherUsername(),teacherSubjects});
   put("finals",a);page(p);
  };
 }
 if(p==="Замечания"&&role==="teacher"&&$("#remarkForm")){studentOptions("rClass","rStudent","rGroup");$("#remarkForm").onsubmit=e=>{e.preventDefault();const student=$("#rStudent").value,textValue=$("#rText").value.trim();if(!student||!textValue)return;const a=remarks();a.unshift({className:$("#rClass").value,group:$("#rGroup").value,student,text:textValue,teacher:name,teacherType,teacherUsername:teacherUsername(),date:new Date().toLocaleDateString("ru-RU")});put("remarks",a);page(p);};}
 if(p==="Домашние задания"&&role==="teacher"&&$("#taskForm")){const c=$("#tClass"),g=$("#tGroup");const fill=()=>g.innerHTML=groupOptions(c.value,true);c.onchange=fill;fill();$("#taskForm").onsubmit=e=>{e.preventDefault();const subject=$("#tSubject").value.trim(),description=$("#tDescription").value.trim();if(!c.value||!subject||!description)return alert("Выберите класс и заполните предмет и задание.");const a=tasks();a.unshift({className:c.value,group:g.value||"Весь класс",subject,description,due:$("#tDue").value.trim(),teacher:name,teacherType,teacherUsername:teacherUsername(),teacherSubjects});put("tasks",a);page(p);};}
 if(p==="Контрольные"&&role==="teacher"&&$("#testForm")){const c=$("#xClass"),g=$("#xGroup");const fill=()=>g.innerHTML=groupOptions(c.value,true);c.onchange=fill;fill();$("#testForm").onsubmit=e=>{e.preventDefault();const a=tests();a.unshift({className:c.value,group:g.value,subject:$("#xSubject").value.trim(),topic:$("#xTopic").value.trim(),date:$("#xDate").value,format:$("#xFormat").value,teacher:name,teacherType,teacherUsername:teacherUsername()});put("tests",a);page(p);};}
 if(p==="Библиотека учителя"&&role==="teacher"&&$("#libraryForm")){
  const cc=$("#currClass"),cs=$("#currSubject"),topics=$("#currTopics"),count=$("#currCount"),lc=$("#libClass"),ls=$("#libSubject");
  const fillSubjects=(classSelect,subjectSelect,selected)=>{const entries=curriculum[classSelect.value]||{};subjectSelect.innerHTML=Object.keys(entries).map(x=>'<option'+(x===selected?' selected':'')+'>'+safe(x)+'</option>').join("");};
  const fillTopics=()=>{const list=(curriculum[cc.value]||{})[cs.value]||[];count.textContent=list.length+" тем · "+cs.value+" · "+cc.value+" класс";topics.innerHTML=list.map((topic,index)=>'<div class="curriculum-topic"><span class="topic-number">'+(index+1)+'</span><div class="topic-title">'+safe(topic)+'</div><button type="button" class="topic-add" data-topic="'+safe(topic)+'">＋ Добавить</button></div>').join("");document.querySelectorAll("[data-topic]").forEach(button=>button.onclick=()=>{lc.value=cc.value;fillSubjects(lc,ls,cs.value);$("#libTitle").value=button.dataset.topic;$("#libBody").value="Цель урока:\n\nОбъяснение:\n\nПримеры и задания:\n1. \n2. \n3. ";$("#libType").value="Урок";$("#libTitle").focus();});};
  cc.onchange=()=>{fillSubjects(cc,cs);fillTopics();};cs.onchange=fillTopics;fillSubjects(cc,cs);fillTopics();
  lc.onchange=()=>fillSubjects(lc,ls);fillSubjects(lc,ls);
  $("#libraryForm").onsubmit=e=>{e.preventDefault();const a=get("teacherLibrary");a.unshift({className:lc.value+" класс",subject:ls.value,type:$("#libType").value,title:$("#libTitle").value.trim(),body:$("#libBody").value.trim(),teacher:name,teacherUsername:teacherUsername(),createdAt:new Date().toLocaleDateString("ru-RU")});put("teacherLibrary",a);page(p);};
  document.querySelectorAll("[data-delete-library]").forEach(button=>button.onclick=()=>{const index=Number(button.dataset.deleteLibrary),a=get("teacherLibrary");if(!confirm("Удалить этот материал из библиотеки?"))return;a.splice(index,1);put("teacherLibrary",a);page(p);});
 }
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
