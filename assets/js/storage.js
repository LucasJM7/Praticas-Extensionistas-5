const CrecheNowStorage = (() => {
  const { utils } = CrecheNowConfig;
  const QUEUE_KEY = 'crechenow_offline_queue';
  const hashSenha = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i); return (h >>> 0).toString(16); };

  const DEFAULT_SCHOOL_CALENDAR = { schoolDays: [1, 2, 3, 4, 5], overrides: {}, access: 'year' };

  const DEFAULT_PEOPLE = [
    { id: 'p_student_1', type: 'student', name: 'Joãozinho Silva', birthDate: '2022-03-15', class: 'A', allergies: 'Amendoim',
      guardians: [{ relation: 'Pai', name: 'Responsável João Silva', phone: '(11) 99999-1111', email: 'pai@email.com', linkedPersonId: 'p_parent_1' }], parentIds: ['p_parent_1'] },
    { id: 'p_student_2', type: 'student', name: 'Mariazinha Souza', birthDate: '2022-05-20', class: 'A', allergies: '',
      guardians: [{ relation: 'Mãe', name: 'Responsável Maria Souza', phone: '', email: 'mae@email.com', linkedPersonId: 'p_parent_2' }], parentIds: ['p_parent_2'] },
    { id: 'p_student_3', type: 'student', name: 'Pedrinho Santos', birthDate: '2021-11-08', class: 'B', allergies: 'Lactose',
      guardians: [{ relation: 'Pai', name: 'Responsável Pedro Santos', phone: '', email: 'pai2@email.com', linkedPersonId: 'p_parent_3' }], parentIds: ['p_parent_3'] },
    { id: 'p_student_4', type: 'student', name: 'Aninha Oliveira', birthDate: '2022-01-30', class: 'B', allergies: '',
      guardians: [{ relation: 'Mãe', name: 'Responsável Ana Oliveira', phone: '', email: 'mae2@email.com', linkedPersonId: 'p_parent_4' }], parentIds: ['p_parent_4'] },
    { id: 'p_parent_1', type: 'parent', name: 'Responsável João Silva', birthDate: '1985-07-22', phone: '(11) 99999-1111', email: 'pai@email.com', linkedStudentIds: ['p_student_1'] },
    { id: 'p_parent_2', type: 'parent', name: 'Responsável Maria Souza', birthDate: '1988-03-14', phone: '', email: 'mae@email.com', linkedStudentIds: ['p_student_2'] },
    { id: 'p_parent_3', type: 'parent', name: 'Responsável Pedro Santos', birthDate: '1984-09-01', phone: '', email: 'pai2@email.com', linkedStudentIds: ['p_student_3'] },
    { id: 'p_parent_4', type: 'parent', name: 'Responsável Ana Oliveira', birthDate: '1990-12-05', phone: '', email: 'mae2@email.com', linkedStudentIds: ['p_student_4'] },
    { id: 'p_teacher_1', type: 'teacher', name: 'Prof. Ana Costa', birthDate: '1992-04-18', phone: '(11) 98888-1234', email: 'prof@municipal.gov', class: 'A' },
    { id: 'p_teacher_2', type: 'teacher', name: 'Prof. Bruno Lima', birthDate: '1989-08-25', phone: '', email: 'prof2@municipal.gov', class: 'B' },
    { id: 'p_secretary_1', type: 'secretary', name: 'Secretaria Geral', birthDate: '1980-02-10', phone: '(11) 3333-0000', email: 'secretaria@municipal.gov', isJunior: false }
  ];

  const DEFAULT_LOGINS = [
    { personId: 'p_parent_1', email: 'pai@email.com', senha: hashSenha('123456'), role: 'parent' },
    { personId: 'p_parent_2', email: 'mae@email.com', senha: hashSenha('123456'), role: 'parent' },
    { personId: 'p_parent_3', email: 'pai2@email.com', senha: hashSenha('123456'), role: 'parent' },
    { personId: 'p_parent_4', email: 'mae2@email.com', senha: hashSenha('123456'), role: 'parent' },
    { personId: 'p_teacher_1', email: 'prof@municipal.gov', senha: hashSenha('prof123'), role: 'teacher' },
    { personId: 'p_teacher_2', email: 'prof2@municipal.gov', senha: hashSenha('prof123'), role: 'teacher' },
    { personId: 'p_secretary_1', email: 'secretaria@municipal.gov', senha: hashSenha('admin123'), role: 'secretary', isJunior: false }
  ];

  const seedWeek = utils.getWeekDates();
  const DEFAULT_AGENDA = [
    { class: 'A', date: seedWeek[0], icon: '🎵', title: 'Roda de conversa', time: '08:00' },
    { class: 'A', date: seedWeek[1], icon: '🤸', title: 'Psicomotora', time: '10:30' },
    { class: 'A', date: seedWeek[2], icon: '📚', title: 'Soneca & Histórias', time: '14:00' },
    { class: 'A', date: seedWeek[3], icon: '🎨', title: 'Artes e pintura', time: '09:00' },
    { class: 'A', date: seedWeek[4], icon: '👨‍👩‍👧‍👦', title: 'Dia da Família', time: '15:00' },
    { class: 'B', date: seedWeek[0], icon: '📖', title: 'Contação de histórias', time: '08:00' },
    { class: 'B', date: seedWeek[1], icon: '⚽', title: 'Recreio dirigido', time: '10:30' },
    { class: 'B', date: seedWeek[2], icon: '🎨', title: 'Artes e pintura', time: '14:00' },
    { class: 'B', date: seedWeek[3], icon: '🎵', title: 'Musicalização', time: '09:00' },
    { class: 'B', date: seedWeek[4], icon: '🌳', title: 'Passeio ao jardim', time: '15:00' }
  ];
  const DEFAULT_CARDAPIO = [
    { date: seedWeek[0], meal: 'Arroz, feijão, frango grelhado e salada.' },
    { date: seedWeek[1], meal: 'Macarrão ao sugo, carne moída e legumes.' },
    { date: seedWeek[2], meal: 'Arroz, lentilha, peixe assado e brócolis.' },
    { date: seedWeek[3], meal: 'Risoto de legumes com frango desfiado.' },
    { date: seedWeek[4], meal: 'Feijoada light, arroz e couve refogada.' }
  ];

  const get = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  // escrita única: grava + enfileira quando offline (processQueue aplica ao voltar)
  const set = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      if (!navigator.onLine) { const q = get(QUEUE_KEY) || []; q.push({ key, value, timestamp: Date.now() }); localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
      return true;
    } catch { return false; }
  };

  const getSchoolCalendar = () => get('crechenow_school_calendar') || DEFAULT_SCHOOL_CALENDAR;
  const setSchoolCalendar = cal => set('crechenow_school_calendar', cal);
  const isSchoolDay = iso => { const c = getSchoolCalendar(); return (c.overrides && (iso in c.overrides)) ? c.overrides[iso] : c.schoolDays.includes(utils.getWeekdayIndex(iso)); };
  const setSchoolCalendarOverride = (iso, has) => { const c = getSchoolCalendar(); c.overrides = c.overrides || {}; c.overrides[iso] = has; setSchoolCalendar(c); };
  const getCalendarAccess = () => getSchoolCalendar().access || 'year';
  const setCalendarAccess = level => { const c = getSchoolCalendar(); c.access = level; setSchoolCalendar(c); };

  const getPeople = () => get('crechenow_people') || DEFAULT_PEOPLE;
  const setPeople = p => set('crechenow_people', p);
  const getPerson = id => getPeople().find(p => p.id === id);
  const addPerson = person => { const people = getPeople(); person.id = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000); people.push(person); setPeople(people); return person; };
  const updatePerson = (id, patch) => { const people = getPeople(); const i = people.findIndex(p => p.id === id); if (i !== -1) { people[i] = { ...people[i], ...patch }; setPeople(people); } };
  const removePerson = id => {
    getPeople().forEach(p => {
      if (p.type === 'parent' && (p.linkedStudentIds || []).includes(id)) updatePerson(p.id, { linkedStudentIds: p.linkedStudentIds.filter(x => x !== id) });
      if (p.type === 'student' && (p.parentIds || []).includes(id)) updatePerson(p.id, { parentIds: p.parentIds.filter(x => x !== id) });
    });
    setPeople(getPeople().filter(p => p.id !== id));
  };
  const getStudents = () => getPeople().filter(p => p.type === 'student');
  const getParents = () => getPeople().filter(p => p.type === 'parent');
  const getTeachers = () => getPeople().filter(p => p.type === 'teacher');

  const getLogins = () => get('crechenow_logins') || DEFAULT_LOGINS;
  const addLogin = login => { const logins = getLogins(); login.id = 'lg_' + Date.now(); login.senha = hashSenha(login.senha); logins.push(login); set('crechenow_logins', logins); return login; };
  const removeLogin = personId => set('crechenow_logins', getLogins().filter(l => l.personId !== personId));
  const authenticate = (email, senha) => { const l = getLogins().find(x => x.email === email && x.senha === hashSenha(senha)); return l ? { login: l, person: getPerson(l.personId) } : null; };

  const setSession = data => set('crechenow_session', { ...data, createdAt: Date.now() });
  const getSession = () => { const s = get('crechenow_session'); if (!s) return null; if ((Date.now() - s.createdAt) / 3600000 > CrecheNowConfig.SESSION_TTL_HOURS) { set('crechenow_session', null); return null; } return s; };

  const getAgenda = () => get('crechenow_agenda') || DEFAULT_AGENDA;
  const setAgenda = list => set('crechenow_agenda', list);
  const getAgendaForWeek = (cls, week) => getAgenda().filter(a => (!cls || a.class === cls) && week.includes(a.date));
  const setAgendaWeek = (cls, week, items) => setAgenda([...getAgenda().filter(a => !(a.class === cls && week.includes(a.date))), ...items]);

  const getCardapio = () => get('crechenow_cardapio') || DEFAULT_CARDAPIO;
  const setCardapio = c => set('crechenow_cardapio', c);

  const getEvents = () => get('crechenow_events') || [];
  const addEvent = ev => { const list = getEvents(); list.unshift({ ...ev, id: Date.now() }); set('crechenow_events', list); };
  const removeEvent = id => set('crechenow_events', getEvents().filter(e => e.id !== +id));

  const getNotifications = () => get('crechenow_notifications') || [];
  const addNotification = n => { const list = getNotifications(); list.unshift({ ...n, id: Date.now(), readBy: [], date: n.date || utils.nowLocalISO() }); set('crechenow_notifications', list); };
  const markAsRead = (id, personId) => { const list = getNotifications(); const i = list.findIndex(x => x.id === id); if (i !== -1) { list[i].readBy = [...new Set([...(list[i].readBy || []), personId])]; set('crechenow_notifications', list); } };
  const isRead = (n, personId) => (n.readBy || []).includes(personId);

  const getNoticeResponses = () => get('crechenow_notice_responses') || [];
  const addNoticeResponse = r => { const list = getNoticeResponses().filter(x => !(x.noticeId === r.noticeId && x.personId === r.personId)); list.unshift({ ...r, id: Date.now(), date: utils.nowLocalISO() }); set('crechenow_notice_responses', list); };
  const getResponsesForNotice = id => getNoticeResponses().filter(r => r.noticeId === id);
  const getMyResponse = (noticeId, personId) => getNoticeResponses().find(r => r.noticeId === noticeId && r.personId === personId);

  const getMessages = () => get('crechenow_messages') || [];
  const addMessage = m => { const list = getMessages(); list.unshift({ ...m, id: Date.now(), read: false, date: utils.nowLocalISO() }); set('crechenow_messages', list); };
  const markMessageAsRead = id => { const list = getMessages(); const i = list.findIndex(m => m.id === id); if (i !== -1) { list[i].read = true; set('crechenow_messages', list); } };

  const getRoutines = () => get('crechenow_routines') || [];
  const addRoutine = r => { const list = getRoutines(); list.unshift({ ...r, id: Date.now(), date: utils.nowLocalISO() }); set('crechenow_routines', list); };
  const getRoutinesByStudent = id => getRoutines().filter(r => r.studentId === id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const hasRoutineTodayForStudent = id => getRoutines().some(r => r.studentId === id && r.date.startsWith(utils.todayISO()));

  const processQueue = () => {
    const q = get(QUEUE_KEY) || [];
    if (!q.length || !navigator.onLine) return;
    q.forEach(a => localStorage.setItem(a.key, JSON.stringify(a.value))); // re-aplica (idempotente); engate p/ API futura aqui
    set(QUEUE_KEY, []);
    CrecheNowNotifications.showToast(`${q.length} ação(ões) offline sincronizadas.`);
  };
  window.addEventListener('online', processQueue);

  return { get, set, hashSenha, clear: () => localStorage.clear(),
    getSchoolCalendar, setSchoolCalendar, isSchoolDay, setSchoolCalendarOverride, getCalendarAccess, setCalendarAccess,
    getPeople, setPeople, getPerson, addPerson, updatePerson, removePerson, getStudents, getParents, getTeachers,
    getLogins, addLogin, removeLogin, authenticate, setSession, getSession,
    getAgenda, setAgenda, getAgendaForWeek, setAgendaWeek, getCardapio, setCardapio, getEvents, addEvent, removeEvent,
    getNotifications, addNotification, markAsRead, isRead, getNoticeResponses, addNoticeResponse, getResponsesForNotice, getMyResponse,
    getMessages, addMessage, markMessageAsRead, getRoutines, addRoutine, getRoutinesByStudent, hasRoutineTodayForStudent, processQueue };
})();
