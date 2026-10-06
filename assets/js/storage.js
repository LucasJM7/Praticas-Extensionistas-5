const CrecheNowStorage = (() => {
  const { utils } = CrecheNowConfig;
  const QUEUE_KEY = 'crechenow_offline_queue';

  const DEFAULT_SCHOOL_CALENDAR = { schoolDays: [1, 2, 3, 4, 5] };

  const DEFAULT_PEOPLE = [
    { id: 'p_student_1', type: 'student', name: 'Joãozinho Silva', birthDate: '2022-03-15', parentIds: ['p_parent_1'], phone: '', email: '', allergies: 'Amendoim', class: 'A' },
    { id: 'p_student_2', type: 'student', name: 'Mariazinha Souza', birthDate: '2022-05-20', parentIds: ['p_parent_2'], phone: '', email: '', allergies: '', class: 'A' },
    { id: 'p_student_3', type: 'student', name: 'Pedrinho Santos', birthDate: '2021-11-08', parentIds: ['p_parent_3'], phone: '', email: '', allergies: 'Lactose', class: 'B' },
    { id: 'p_student_4', type: 'student', name: 'Aninha Oliveira', birthDate: '2022-01-30', parentIds: ['p_parent_4'], phone: '', email: '', allergies: '', class: 'B' },
    { id: 'p_parent_1', type: 'parent', name: 'Responsável João Silva', birthDate: '1985-07-22', phone: '(11) 99999-1111', email: 'pai@email.com', linkedStudentIds: ['p_student_1'] },
    { id: 'p_parent_2', type: 'parent', name: 'Responsável Maria Souza', birthDate: '1988-03-14', phone: '', email: 'mae@email.com', linkedStudentIds: ['p_student_2'] },
    { id: 'p_parent_3', type: 'parent', name: 'Responsável Pedro Santos', birthDate: '1984-09-01', phone: '', email: 'pai2@email.com', linkedStudentIds: ['p_student_3'] },
    { id: 'p_parent_4', type: 'parent', name: 'Responsável Ana Oliveira', birthDate: '1990-12-05', phone: '', email: 'mae2@email.com', linkedStudentIds: ['p_student_4'] },
    { id: 'p_teacher_1', type: 'teacher', name: 'Prof. Ana Costa', birthDate: '1992-04-18', phone: '(11) 98888-1234', email: 'prof@municipal.gov', class: 'A' },
    { id: 'p_teacher_2', type: 'teacher', name: 'Prof. Bruno Lima', birthDate: '1989-08-25', phone: '', email: 'prof2@municipal.gov', class: 'B' },
    { id: 'p_secretary_1', type: 'secretary', name: 'Secretaria Geral', birthDate: '1980-02-10', phone: '(11) 3333-0000', email: 'secretaria@municipal.gov', isJunior: false }
  ];

  const DEFAULT_LOGINS = [
    { personId: 'p_parent_1', email: 'pai@email.com', senha: '123456', role: 'parent' },
    { personId: 'p_parent_2', email: 'mae@email.com', senha: '123456', role: 'parent' },
    { personId: 'p_parent_3', email: 'pai2@email.com', senha: '123456', role: 'parent' },
    { personId: 'p_parent_4', email: 'mae2@email.com', senha: '123456', role: 'parent' },
    { personId: 'p_teacher_1', email: 'prof@municipal.gov', senha: 'prof123', role: 'teacher' },
    { personId: 'p_teacher_2', email: 'prof2@municipal.gov', senha: 'prof123', role: 'teacher' },
    { personId: 'p_secretary_1', email: 'secretaria@municipal.gov', senha: 'admin123', role: 'secretary', isJunior: false }
  ];

  const seedWeek = utils.getWeekDates();
  const DEFAULT_AGENDA = [
    { date: seedWeek[0], icon: '🎵', title: 'Roda de conversa', time: '08:00' },
    { date: seedWeek[1], icon: '🤸', title: 'Psicomotora', time: '10:30' },
    { date: seedWeek[2], icon: '📚', title: 'Soneca & Histórias', time: '14:00' },
    { date: seedWeek[3], icon: '🎨', title: 'Artes e pintura', time: '09:00' },
    { date: seedWeek[4], icon: '👩‍👧‍👦', title: 'Dia da Família', time: '15:00' }
  ];
  const DEFAULT_CARDAPIO = [
    { date: seedWeek[0], meal: 'Arroz, feijão, frango grelhado e salada.' },
    { date: seedWeek[1], meal: 'Macarrão ao sugo, carne moída e legumes.' },
    { date: seedWeek[2], meal: 'Arroz, lentilha, peixe assado e brócolis.' },
    { date: seedWeek[3], meal: 'Risoto de legumes com frango desfiado.' },
    { date: seedWeek[4], meal: 'Feijoada light, arroz e couve refogada.' }
  ];

  const get = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const set = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };

  const getSchoolCalendar = () => get('crechenow_school_calendar') || DEFAULT_SCHOOL_CALENDAR;
  const setSchoolCalendar = (cal) => set('crechenow_school_calendar', cal);
  const isSchoolDay = (isoDate) => getSchoolCalendar().schoolDays.includes(utils.getWeekdayIndex(isoDate));

  const getPeople = () => get('crechenow_people') || DEFAULT_PEOPLE;
  const setPeople = (people) => set('crechenow_people', people);
  const getPerson = (id) => getPeople().find(p => p.id === id);
  const addPerson = (person) => {
    const people = getPeople();
    person.id = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    people.push(person);
    setPeople(people);
    return person;
  };
  const updatePerson = (id, patch) => {
    const people = getPeople();
    const i = people.findIndex(p => p.id === id);
    if (i !== -1) { people[i] = { ...people[i], ...patch }; setPeople(people); }
  };
  const removePerson = (id) => setPeople(getPeople().filter(p => p.id !== id));
  const getStudents = () => getPeople().filter(p => p.type === 'student');
  const getParents = () => getPeople().filter(p => p.type === 'parent');
  const getTeachers = () => getPeople().filter(p => p.type === 'teacher');

  const getLogins = () => get('crechenow_logins') || DEFAULT_LOGINS;
  const setLogins = (logins) => set('crechenow_logins', logins);
  const addLogin = (login) => {
    const logins = getLogins();
    login.id = 'lg_' + Date.now();
    logins.push(login);
    setLogins(logins);
    return login;
  };
  const removeLogin = (personId) => setLogins(getLogins().filter(l => l.personId !== personId));
  const authenticate = (email, senha) => {
    const l = getLogins().find(x => x.email === email && x.senha === senha);
    if (!l) return null;
    return { login: l, person: getPerson(l.personId) };
  };

  const setSession = (data) => set('crechenow_session', { ...data, createdAt: Date.now() });
  const getSession = () => {
    const s = get('crechenow_session');
    if (!s) return null;
    if ((Date.now() - s.createdAt) / 3600000 > CrecheNowConfig.SESSION_TTL_HOURS) {
      set('crechenow_session', null);
      return null;
    }
    return s;
  };

  const getAgenda = () => get('crechenow_agenda') || DEFAULT_AGENDA;
  const setAgenda = (a) => set('crechenow_agenda', a);
  const getCardapio = () => get('crechenow_cardapio') || DEFAULT_CARDAPIO;
  const setCardapio = (c) => set('crechenow_cardapio', c);

  const getNotifications = () => get('crechenow_notifications') || [];
  const addNotification = (n) => {
    const list = getNotifications();
    list.unshift({ ...n, id: Date.now(), read: false, date: n.date || utils.nowLocalISO() });
    set('crechenow_notifications', list);
  };
  const markAsRead = (id) => {
    const list = getNotifications();
    const i = list.findIndex(x => x.id === id);
    if (i !== -1) { list[i].read = true; set('crechenow_notifications', list); }
  };

  const getMessages = () => get('crechenow_messages') || [];
  const addMessage = (m) => {
    const list = getMessages();
    list.unshift({ ...m, id: Date.now(), read: false, date: utils.nowLocalISO() });
    set('crechenow_messages', list);
  };
  const markMessageAsRead = (id) => {
    const list = getMessages();
    const i = list.findIndex(x => x.id === id);
    if (i !== -1) { list[i].read = true; set('crechenow_messages', list); }
  };

  const getRoutines = () => get('crechenow_routines') || [];
  const addRoutine = (r) => {
    const list = getRoutines();
    list.unshift({ ...r, id: Date.now(), date: utils.nowLocalISO() });
    set('crechenow_routines', list);
  };
  const getRoutinesByStudent = (studentId) =>
    getRoutines().filter(r => r.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date));
  const hasRoutineTodayForStudent = (studentId) => {
    const today = utils.todayISO();
    return getRoutines().some(r => r.studentId === studentId && r.date.startsWith(today));
  };

  const queueAction = (action) => {
    const q = get(QUEUE_KEY) || [];
    q.push({ ...action, timestamp: Date.now() });
    set(QUEUE_KEY, q);
  };
  const processQueue = () => {
    const q = get(QUEUE_KEY) || [];
    if (!q.length || !navigator.onLine) return;
    console.log('Sincronizando fila offline (stub):', q.length, 'ações');
    set(QUEUE_KEY, []);
  };

  return {
    get, set, clear: () => localStorage.clear(),
    getSchoolCalendar, setSchoolCalendar, isSchoolDay,
    getPeople, setPeople, getPerson, addPerson, updatePerson, removePerson,
    getStudents, getParents, getTeachers,
    getLogins, setLogins, addLogin, removeLogin, authenticate,
    setSession, getSession,
    getAgenda, setAgenda, getCardapio, setCardapio,
    getNotifications, addNotification, markAsRead,
    getMessages, addMessage, markMessageAsRead,
    getRoutines, addRoutine, getRoutinesByStudent, hasRoutineTodayForStudent,
    queueAction, processQueue
  };
})();
