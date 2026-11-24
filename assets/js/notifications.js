const CrecheNowNotifications = (() => {
  const { utils, NOTICE_TYPES, RESPONSE_TYPES, EVENT_TYPES, WEEKDAYS, WEEKDAYS_LONG, RELATIONSHIPS } = CrecheNowConfig;
  const store = CrecheNowStorage, esc = utils.escapeHtml;
  const el = id => document.getElementById(id);
  const openModal = id => el(id)?.classList.add('active');
  const closeModal = id => el(id)?.classList.remove('active');
  const session = () => store.getSession();
  const ICONS = ['🎵', '🤸', '📚', '🎭', '⚽', '🍎', '🎲', '🎂'];
  const MODES = ['week', 'month', 'year'];
  const MODE_LABEL = { week: 'Semana', month: 'Mês', year: 'Ano' };

  const myClasses = () => {
    const s = session(); if (!s) return [];
    if (s.role === 'parent') { const p = store.getPerson(s.personId); return [...new Set((p?.linkedStudentIds || []).map(id => store.getPerson(id)?.class).filter(Boolean))]; }
    if (s.role === 'teacher') return [s.class];
    return null;
  };

  const isUnread = n => { const s = session(); return s && s.role !== 'secretary' && !store.isRead(n, s.personId); };

  const responseZoneHTML = (n, s) => {
    if (!n.responseType || s?.role !== 'parent') return '';
    const mine = store.getMyResponse(n.id, s.personId);
    if (n.responseType === 'Sim/Não') return `<div class="response-zone mt-2"><small class="fw-bold">Responder:</small>
      <button class="btn btn-sm ms-2 ${mine?.value === 'sim' ? 'btn-success' : 'btn-outline-success'}" data-action="respond" data-notice="${n.id}" data-value="sim">Sim</button>
      <button class="btn btn-sm ms-1 ${mine?.value === 'nao' ? 'btn-danger' : 'btn-outline-danger'}" data-action="respond" data-notice="${n.id}" data-value="nao">Não</button>
      ${mine ? '<small class="text-muted ms-2">(resposta enviada)</small>' : ''}</div>`;
    return `<div class="response-zone mt-2"><small class="fw-bold">Responder por escrito:</small>
      <textarea class="form-control form-control-sm mt-1" rows="2" data-role="response-text" placeholder="Sua resposta...">${esc(mine?.value || '')}</textarea>
      <button class="btn btn-sm btn-success mt-1" data-action="respond-text" data-notice="${n.id}">Enviar resposta</button></div>`;
  };

  const renderFeed = (filter = 'all', containerId = 'carousel-inner-notifs') => {
    const c = el(containerId); if (!c) return;
    const s = session(); const cls = myClasses();
    let all = store.getNotifications();
    if (cls) all = all.filter(n => !n.targetClass || n.targetClass === 'all' || cls.includes(n.targetClass));
    const list = all.filter(n => filter === 'all' || n.type === filter);
    const isSecretary = s?.role === 'secretary';
    c.innerHTML = list.length ? list.map((n, i) => `
      <div class="carousel-item ${i === 0 ? 'active' : ''}">
        <div class="notify-card ${!isSecretary && isUnread(n) ? 'unread' : ''}" data-type="${esc(n.type)}">
          <div class="d-flex justify-content-between align-items-start mb-1"><h5 class="fw-bold mb-0">${esc(n.title)}</h5>
          <span class="badge ${!isSecretary && isUnread(n) ? 'bg-warning text-dark' : 'bg-secondary'}">${!isSecretary && isUnread(n) ? 'Novo' : (isSecretary ? 'Enviado' : 'Lido')}</span></div>
          <p class="text-muted mb-1 notify-body">${esc(n.body)}</p>${!isSecretary ? responseZoneHTML(n, s) : ''}
          <div class="d-flex justify-content-between align-items-center mt-auto gap-2"><small class="text-muted">${utils.formatDateTimeBR(n.date)}</small>
          ${!isSecretary && isUnread(n) ? `<button class="btn btn-sm btn-outline-primary" data-action="mark-read" data-item-id="${n.id}">Marcar como lido</button>` : ''}
          ${isSecretary ? `<span class="badge ${store.getResponsesForNotice(n.id).length ? 'bg-success' : 'bg-secondary'}">${store.getResponsesForNotice(n.id).length} resposta(s)</span>` : ''}</div>
        </div></div>`).join('')
      : '<div class="carousel-item active"><div class="notify-card"><div class="text-center text-muted">Nenhum comunicado encontrado.</div></div></div>';
    refreshCarousel(containerId.replace('inner-', ''));
  };
  const refreshCarousel = (id = 'notifications-carousel') => { const n = el(id); if (!n || !window.bootstrap?.Carousel) return; bootstrap.Carousel.getInstance(n)?.dispose(); new bootstrap.Carousel(n, { interval: 6000, ride: 'carousel' }); };

  const renderCalendarPreview = (id = 'cal-preview') => {
    const c = el(id); if (!c) return;
    const cls = myClasses(); const week = utils.getWeekDates();
    const agenda = store.getAgenda().filter(a => !cls || a.class === cls);
    const events = store.getEvents();
    c.innerHTML = `<div class="card-header hud-a py-2 d-flex justify-content-between align-items-center">
        <h5 class="mb-0 fs-6">Calendário</h5><small class="text-white-50">clique para expandir</small></div>
      <div class="card-body py-2"><div class="cal-chips">${week.map(d => {
        const on = store.isSchoolDay(d); const ag = on ? agenda.find(a => a.date === d) : null; const ev = events.find(e => e.date === d);
        return `<div class="cal-chip ${on ? '' : 'off'}"><div class="chip-day">${WEEKDAYS[utils.getWeekdayIndex(d)]} ${+d.slice(8)}</div>
          <div class="chip-icon">${on ? (ag ? esc(ag.icon || '📌') : '·') : (ev ? '📣' : '🚫')}</div>${ev ? '<span class="chip-dot" title="Evento"></span>' : ''}</div>`;
      }).join('')}</div></div>`;
  };

  const maxMode = () => {
    const s = session();
    if (s?.role === 'secretary') return 'year';
    return store.getCalendarAccess(s?.role || 'parent');
  };

  const navBar = (prefix, view, ref, allowed) => `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <button type="button" class="btn btn-sm btn-outline-secondary" data-action="${prefix}-prev">‹</button>
      ${allowed.length ? `<div class="btn-group btn-group-sm">${allowed.map(m => `<button type="button" class="btn ${view === m ? 'btn-success' : 'btn-outline-success'}" data-action="${prefix}-view" data-view="${m}">${MODE_LABEL[m]}</button>`).join('')}</div>` : '<span></span>'}
      <button type="button" class="btn btn-sm btn-outline-secondary" data-action="${prefix}-next">›</button>
    </div>`;

  const handleNav = (e, prefix, modalId, rerender) => {
    const btn = e.target.closest(`[data-action^="${prefix}-"]`); if (!btn) return false;
    const modal = el(modalId); if (!modal || !modal.classList.contains('active')) return false;
    const view = modal.dataset.view || 'week';
    const ref = utils.parseISO(modal.dataset.ref || utils.todayISO());
    const act = btn.dataset.action;
    if (act === `${prefix}-view`) { modal.dataset.view = btn.dataset.view; modal.dataset.ref = utils.toISODate(ref); }
    else {
      const dir = act.endsWith('next') ? 1 : -1;
      const maxLevel = maxMode();
      const levelIdx = { week: 0, month: 1, year: 2 };
      if (levelIdx[view] >= levelIdx[maxLevel]) return true;
      if (view === 'week') ref.setDate(ref.getDate() + 7 * dir);
      else if (view === 'month') ref.setMonth(ref.getMonth() + dir);
      else ref.setFullYear(ref.getFullYear() + dir);
      modal.dataset.ref = utils.toISODate(ref);
    }
    rerender(); return true;
  };

  const renderCalendarView = () => {
    const modal = el('calendarModal'), body = el('calendarViewBody'); if (!body) return;
    const mode = modal.dataset.view || 'week'; const ref = utils.parseISO(modal.dataset.ref || utils.todayISO());
    const allowed = MODES.slice(0, MODES.indexOf(maxMode()) + 1);
    const cls = myClasses();
    const agenda = store.getAgenda().filter(a => !cls || a.class === cls);
    const events = store.getEvents();
    const dates = mode === 'year' ? Array.from({ length: 12 }, (_, m) => utils.getMonthDates(ref.getFullYear(), m)).flat()
      : (mode === 'month' ? utils.getMonthDates(ref.getFullYear(), ref.getMonth()) : utils.getWeekDates(utils.mondayOf(ref)));
    body.innerHTML = dates.map(d => {
      const dt = utils.parseISO(d), on = store.isSchoolDay(d);
      const ag = on ? agenda.filter(a => a.date === d) : [];
      const ca = on ? store.getCardapio().filter(c => c.date === d && c.meal) : [];
      const ev = events.filter(x => x.date === d);
      const hasContent = ag.length || ca.length || ev.length;
      return `<div class="calendar-cell ${!on && !ev.length ? 'no-school' : (hasContent ? 'has-content' : '')}">
        <div class="cell-header"><small class="text-muted">${WEEKDAYS[dt.getDay()]}</small><strong>${dt.getDate()}/${String(dt.getMonth() + 1).padStart(2, '0')}</strong></div>
        ${!on && !ev.length ? '<div class="cell-item no-school">Sem aula</div>' : ''}
        ${ag.map(a => `<div class="cell-item agenda">${esc(a.icon || '')} ${esc(a.time)} ${esc(a.title)}${a.class ? ` <em>(${esc(a.class)})</em>` : ''}</div>`).join('')}
        ${ca.map(c => `<div class="cell-item cardapio">${esc(c.meal)}</div>`).join('')}
        ${ev.map(x => `<div class="cell-item event">📣 ${esc(x.title)}</div>`).join('')}</div>`;
    }).join('');
    const header = el('calendarViewHeader');
    header.innerHTML = `<button class="btn btn-sm btn-outline-secondary" data-action="cal-prev">‹</button>
      <div class="btn-group btn-group-sm">${allowed.map(m => `<button class="btn btn-outline-primary cal-mode-btn ${mode === m ? 'active' : ''}" data-action="cal-view" data-view="${m}">${MODE_LABEL[m]}</button>`).join('')}</div>
      <button class="btn btn-sm btn-outline-secondary" data-action="cal-next">›</button>`;
  };

  const renderAgenda = () => {
    const c = el('agenda-list'); if (!c) return;
    const cls = myClasses(); const week = utils.getWeekDates();
    const byDate = {}; store.getAgendaForWeek(cls, week).forEach(a => byDate[a.date] = a);
    c.innerHTML = week.map(d => {
      const wd = WEEKDAYS_LONG[utils.getWeekdayIndex(d)], dl = utils.formatDateBR(d);
      if (!store.isSchoolDay(d)) return `<div class="agenda-card no-school"><div class="flex-grow-1"><strong class="d-block text-muted" style="font-size:.9rem">Sem aula</strong><small class="text-muted">${wd} ${dl}</small></div></div>`;
      const it = byDate[d];
      if (!it || !it.title) return `<div class="agenda-card empty"><div class="flex-grow-1"><strong class="d-block text-muted" style="font-size:.9rem">(sem atividade)</strong><small class="text-muted">${wd} ${dl}</small></div></div>`;
      return `<div class="agenda-card"><div class="me-2 fs-4">${esc(it.icon || '')}</div><div class="flex-grow-1">
        <strong class="d-block text-primary" style="font-size:.9rem">${esc(it.title)}</strong><small class="text-muted">${wd} ${dl} • ${esc(it.time || '')}</small></div></div>`;
    }).join('');
  };

  const renderAgendaEditor = () => {
    const box = el('agendaEditorContainer'), modal = el('agendaEditorModal'); if (!box) return;
    const s = session(); const weekStart = modal.dataset.week || utils.toISODate(utils.getWeekStart());
    const week = utils.getWeekDates(weekStart); const byDate = {}; store.getAgendaForWeek(s.class, week).forEach(a => byDate[a.date] = a);
    box.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-2">
      <button type="button" class="btn btn-sm btn-outline-secondary" data-action="agenda-week-prev">‹</button>
      <strong class="small">Semana de ${utils.formatDateBR(week[0])} a ${utils.formatDateBR(week[5])}</strong>
      <button type="button" class="btn btn-sm btn-outline-secondary" data-action="agenda-week-next">›</button></div>` +
      week.map((d, i) => {
        const wd = WEEKDAYS[utils.getWeekdayIndex(d)];
        if (!store.isSchoolDay(d)) return `<div class="editor-item disabled-row"><input type="date" class="form-control form-control-sm" value="${d}" disabled style="width:140px"><span class="small text-muted">Sem aula (${wd})</span></div>`;
        const it = byDate[d] || { icon: '📌', title: '', time: '08:00' };
        return `<div class="editor-item" data-date="${d}"><input type="date" class="form-control form-control-sm" value="${d}" disabled style="width:140px">
          <span class="fs-4 agenda-icon-btn" data-index="${i}" data-date="${d}" title="Trocar emoji">${esc(it.icon || '📌')}</span>
          <input type="time" class="form-control form-control-sm" style="width:110px" value="${it.time || '08:00'}" data-field="time">
          <input type="text" class="form-control form-control-sm flex-grow-1" value="${esc(it.title || '')}" placeholder="Atividade" data-field="title">
          <button type="button" class="btn btn-danger btn-sm btn-remove" data-action="remove-agenda" data-date="${d}">×</button></div>
          <div class="icon-picker-container d-none" data-index="${i}"><div class="icon-picker">${ICONS.map(ic => `<div class="icon-option ${it.icon === ic ? 'selected' : ''}" data-action="pick-icon" data-icon="${ic}" data-date="${d}">${ic}</div>`).join('')}</div></div>`;
      }).join('');
  };
  const saveAgenda = () => {
    const modal = el('agendaEditorModal'), s = session();
    const week = utils.getWeekDates(modal.dataset.week || utils.toISODate(utils.getWeekStart()));
    const items = Array.from(document.querySelectorAll('#agendaEditorContainer .editor-item[data-date]')).map(r => ({
      class: s.class, date: r.dataset.date, time: r.querySelector('[data-field="time"]').value,
      title: r.querySelector('[data-field="title"]').value.trim(), icon: r.querySelector('.agenda-icon-btn').textContent.trim()
    })).filter(a => a.title);
    store.setAgendaWeek(s.class, week, items); renderAgenda(); renderCalendarPreview(); showToast('Agenda da semana salva.'); closeModal('agendaEditorModal');
  };

  const renderCardapio = () => {
    const c = el('cardapio-list'); if (!c) return;
    const byDate = {}; store.getCardapio().forEach(x => { if (x.meal && x.meal.trim()) byDate[x.date] = x; });
    c.innerHTML = utils.getWeekDates().map(d => {
      const wd = WEEKDAYS_LONG[utils.getWeekdayIndex(d)].slice(0, 3), dl = utils.formatDateBR(d);
      const head = `<div class="me-2" style="min-width:80px;font-size:.85rem"><div class="fw-bold ${store.isSchoolDay(d) ? 'text-success' : 'text-muted'}">${wd}</div><small class="text-muted">${dl}</small></div>`;
      if (!store.isSchoolDay(d)) return `<div class="cardapio-item no-school">${head}<div class="small text-muted fst-italic">Sem aula</div></div>`;
      const it = byDate[d];
      return `<div class="cardapio-item">${head}<div class="small text-muted">${it ? esc(it.meal) : '<em>não definido</em>'}</div></div>`;
    }).join('');
  };

  const renderCardapioEditor = () => {
    const box = el('cardapioEditorContainer'), modal = el('cardapioEditorModal'); if (!box) return;
    const view = modal.dataset.view || 'week', ref = utils.parseISO(modal.dataset.ref || utils.toISODate(utils.getWeekStart()));
    const byDate = {}; store.getCardapio().forEach(c => byDate[c.date] = c);
    let html = navBar('cd', view, ref, MODES);
    if (view === 'week') {
      const week = utils.getWeekDates(utils.mondayOf(ref));
      html += `<strong class="d-block small mb-2">Semana de ${utils.formatDateBR(week[0])} a ${utils.formatDateBR(week[5])}</strong>` + week.map(d => {
        const wd = WEEKDAYS[utils.getWeekdayIndex(d)];
        if (!store.isSchoolDay(d)) return `<div class="editor-item disabled-row"><input type="date" class="form-control form-control-sm" value="${d}" disabled style="width:140px"><span class="small text-muted">Sem aula (${wd})</span></div>`;
        return `<div class="editor-item" data-date="${d}"><input type="date" class="form-control form-control-sm" value="${d}" disabled style="width:140px">
          <input type="text" class="form-control form-control-sm flex-grow-1" value="${esc(byDate[d]?.meal || '')}" placeholder="Refeição do dia" data-field="meal" data-date="${d}">
          <button type="button" class="btn btn-danger btn-sm btn-remove" data-action="remove-cardapio" data-date="${d}">×</button></div>`;
      }).join('');
    } else if (view === 'month') {
      html += `<strong class="d-block small mb-2 text-capitalize">${ref.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</strong><div class="calendar-grid">` +
        utils.getMonthDates(ref.getFullYear(), ref.getMonth()).map(d => {
          const dt = utils.parseISO(d), on = store.isSchoolDay(d);
          return `<div class="calendar-cell ${on ? '' : 'no-school'}"><div class="cell-header"><small class="text-muted">${WEEKDAYS[dt.getDay()]}</small><strong>${dt.getDate()}</strong></div>
            ${on ? `<input type="text" class="form-control form-control-sm mt-1" data-field="meal" data-date="${d}" value="${esc(byDate[d]?.meal || '')}" placeholder="Refeição">` : '<div class="cell-item no-school">Sem aula</div>'}</div>`;
        }).join('') + '</div>';
    } else {
      html += `<strong class="d-block small mb-2">${ref.getFullYear()}</strong><div class="row g-2">` +
        Array.from({ length: 12 }, (_, m) => {
          const entries = utils.getMonthDates(ref.getFullYear(), m).map(d => byDate[d]).filter(c => c && c.meal);
          return `<div class="col-md-4"><div class="border rounded p-2 h-100"><div class="d-flex justify-content-between"><strong class="small text-capitalize">${new Date(ref.getFullYear(), m, 1).toLocaleString('pt-BR', { month: 'long' })}</strong>
            <button type="button" class="btn btn-sm btn-outline-success" data-action="cd-edit-month" data-month="${m}">Editar</button></div>
            <div class="small text-muted mt-1">${entries.length ? entries.slice(0, 4).map(c => `<div>${utils.formatDateBR(c.date)}: ${esc(c.meal)}</div>`).join('') : 'Nada definido.'}</div></div></div>`;
        }).join('') + '</div>';
    }
    box.innerHTML = html;
  };
  const saveCardapio = () => {
    const modal = el('cardapioEditorModal');
    if ((modal.dataset.view || 'week') === 'year') { showToast('Use Semana ou Mês para salvar.', 'warning'); return; }
    const entries = Array.from(document.querySelectorAll('#cardapioEditorContainer [data-field="meal"][data-date]')).map(i => ({ date: i.dataset.date, meal: i.value.trim() }));
    const dates = new Set(entries.map(e => e.date));
    store.setCardapio([...store.getCardapio().filter(c => !dates.has(c.date)), ...entries.filter(e => e.meal)]);
    renderCardapio(); renderCalendarPreview(); showToast('Cardápio atualizado.'); closeModal('cardapioEditorModal');
  };

  const renderSchoolCalendarEditor = () => {
    const body = el('schoolCalendarBody'), modal = el('schoolCalendarModal'); if (!body) return;
    const view = modal.dataset.view || 'week', ref = utils.parseISO(modal.dataset.ref || utils.todayISO());
    const cal = store.getSchoolCalendar(); const events = store.getEvents();
    let html = `<div class="mb-2"><small class="fw-bold">Dias padrão da semana:</small><div class="d-flex flex-wrap gap-2 mt-1">` +
      WEEKDAYS_LONG.map((label, idx) => `<div class="form-check form-check-inline"><input class="form-check-input school-day-check" type="checkbox" value="${idx}" id="sc-day-${idx}" ${cal.schoolDays.includes(idx) ? 'checked' : ''}><label class="form-check-label small" for="sc-day-${idx}">${WEEKDAYS[idx]}</label></div>`).join('') +
      `</div><small class="text-muted d-block mt-1">Clique nas datas para criar exceções (feriados, recessos, reposições).</small></div>
      <div class="mb-2 d-flex align-items-center gap-2"><small class="fw-bold">Pais e professores podem ver até:</small>
        <select class="form-select form-select-sm w-auto" data-action="set-access">
          <option value="week" ${cal.accessParent === 'week' ? 'selected' : ''}>Semana</option>
          <option value="month" ${cal.accessParent === 'month' ? 'selected' : ''}>Mês</option>
          <option value="year" ${cal.accessParent === 'year' ? 'selected' : ''}>Ano</option>
        </select></div>` + navBar('sc', view, ref, MODES);
    if (view === 'week') {
      html += utils.getWeekDates(utils.mondayOf(ref)).map(d => {
        const on = store.isSchoolDay(d);
        return `<div class="editor-item justify-content-between"><span class="small">${WEEKDAYS_LONG[utils.getWeekdayIndex(d)]} — ${utils.formatDateBR(d)}</span>
          <span><span class="badge ${on ? 'bg-success' : 'bg-secondary'} me-2">${on ? 'Com aula' : 'Sem aula'}</span>
          <button type="button" class="btn btn-sm ${on ? 'btn-outline-secondary' : 'btn-outline-success'}" data-action="toggle-school-day" data-date="${d}">${on ? 'Marcar sem aula' : 'Marcar com aula'}</button></span></div>`;
      }).join('');
    } else if (view === 'month') {
      html += `<div class="calendar-grid">` + utils.getMonthDates(ref.getFullYear(), ref.getMonth()).map(d => {
        const dt = utils.parseISO(d), on = store.isSchoolDay(d);
        return `<div class="calendar-cell ${on ? '' : 'no-school'}" style="cursor:pointer" data-action="toggle-school-day" data-date="${d}">
          <div class="cell-header"><small class="text-muted">${WEEKDAYS[dt.getDay()]}</small><strong>${dt.getDate()}</strong></div>
          <div class="cell-item ${on ? 'agenda' : 'no-school'}">${on ? 'Com aula' : 'Sem aula'}</div></div>`;
      }).join('') + '</div>';
    } else {
      html += `<div class="row g-2">` + Array.from({ length: 12 }, (_, m) => `<div class="col-md-4"><div class="border rounded p-2"><strong class="small text-capitalize">${new Date(ref.getFullYear(), m, 1).toLocaleString('pt-BR', { month: 'long' })}</strong>
        <div class="year-mini mt-1">` + utils.getMonthDates(ref.getFullYear(), m).map(d => {
          const dt = utils.parseISO(d), on = store.isSchoolDay(d);
          return `<div class="mini-cell ${on ? 'on' : 'off'}" data-action="toggle-school-day" data-date="${d}" title="${utils.formatDateBR(d)}">${dt.getDate()}</div>`;
        }).join('') + `</div></div></div>`).join('') + '</div>';
    }
    html += `<hr><h6 class="small fw-bold">Eventos do calendário (reuniões, atividades, datas comemorativas)</h6>
      <div class="d-flex gap-2 mb-2"><select class="form-select form-select-sm" id="ev-type">${Object.entries(EVENT_TYPES).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      <input type="date" class="form-control form-control-sm" id="ev-date" value="${utils.todayISO()}">
      <input type="text" class="form-control form-control-sm" id="ev-title" placeholder="Título do evento">
      <button type="button" class="btn btn-sm btn-success" data-action="add-event">+</button></div>
      ${events.map(e => `<div class="editor-item justify-content-between"><span class="small">${EVENT_TYPES[e.type] || e.type} — ${utils.formatDateBR(e.date)}: <strong>${esc(e.title)}</strong></span>
        <button type="button" class="btn btn-sm btn-outline-danger" data-action="remove-event" data-id="${e.id}">×</button></div>`).join('') || '<small class="text-muted">Nenhum evento cadastrado.</small>'}`;
    body.innerHTML = html;
  };

  const renderRoutineForParent = studentId => {
    const today = el('routine-today'), hist = el('routine-history'); if (!today) return;
    const routines = store.getRoutinesByStudent(studentId); const iso = utils.todayISO();
    const r = routines.find(x => x.date.startsWith(iso));
    if (!r) { today.innerHTML = '<p class="text-muted text-center mt-4">Nenhum registro de rotina para hoje ainda.</p>'; if (hist) hist.innerHTML = ''; return; }
    if (!r.attendance) { today.innerHTML = '<div class="absent-message"><div><div style="font-size:2.5rem">😷</div><div class="mt-2">A criança não foi hoje</div></div></div>'; if (hist) hist.innerHTML = ''; return; }
    const q = r.questions || {}, ic = v => v === 'sim' ? '<span class="text-success fw-bold">Sim</span>' : '<span class="text-danger fw-bold">Não</span>';
    today.innerHTML = `<div class="routine-grid">
      <div class="routine-item">Atenção: ${ic(q.attention)}</div><div class="routine-item">Deveres: ${ic(q.homework)}</div>
      <div class="routine-item">Colegas: ${ic(q.peers)}</div>
      <div class="routine-item" style="grid-column:1/-1">Alimentação: ${ic(q.food)}</div></div>
      ${r.comment ? '<div class="click-hint">Clique para ver detalhes</div>' : ''}`;
    today.onclick = () => openRoutineModal(r, ic);
    if (hist) {
      const h = routines.filter(x => !x.date.startsWith(iso)).slice(0, 10);
      hist.innerHTML = h.length ? '<h6 class="small fw-bold mb-2">Dias Anteriores:</h6>' + h.map(x => `<div class="border-bottom pb-2 mb-2 small"><div class="fw-bold text-muted">${utils.formatDateBR(x.date)} ${x.attendance === false ? '<span class="text-danger">(Faltou)</span>' : ''}</div><div>${esc(x.comment || 'Sem comentários.')}</div></div>`).join('') : '<p class="text-muted small mb-0">Sem histórico anterior.</p>';
    }
  };

  const openRoutineModal = (r, ic) => {
    const q = r.questions || {};
    el('routineModalContent').innerHTML = `<button class="modal-close" data-close="routineModal">×</button>
      <h4 class="mb-3">Rotina Completa de Hoje</h4>
      <div class="routine-grid mb-3"><div class="routine-item">Atenção: ${ic(q.attention)}</div>
      <div class="routine-item">Deveres: ${ic(q.homework)}</div><div class="routine-item">Colegas: ${ic(q.peers)}</div>
      <div class="routine-item" style="grid-column:1/-1">Alimentação: ${ic(q.food)}</div></div>
      ${r.comment ? `<div class="routine-comment"><strong>Comentário do professor:</strong><br>"${esc(r.comment)}"</div>` : '<p class="text-muted fst-italic">Sem comentários adicionais.</p>'}
      <div class="d-flex justify-content-between align-items-center mt-3"><small class="text-muted">Registrado em ${utils.formatDateTimeBR(r.date)}</small>
      <button class="btn btn-sm btn-outline-primary" data-action="print-day" data-id="${r.studentId}">🖨️ Imprimir dia</button></div>`;
    openModal('routineModal');
  };

  const renderTeacherDashboard = () => {
    const s = session(); if (!s || s.role !== 'teacher') return;
    const students = store.getStudents().filter(x => x.class === s.class);
    const sel = el('routineStudentSelect'); if (sel) sel.innerHTML = '<option value="">Escolha um aluno...</option>' + students.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
    const list = el('teacher-students-list');
    if (list) { const today = utils.todayISO();
      list.innerHTML = students.map(x => { const r = store.getRoutines().find(y => y.studentId === x.id && y.date.startsWith(today));
        const st = !r ? '<span class="text-muted small">—</span>' : r.attendance ? '<span class="text-success">Presente</span>' : '<span class="text-danger">Falta</span>';
        return `<tr data-action="open-student-view" data-id="${x.id}" style="cursor:pointer"><td class="small">${esc(x.name)}</td><td>${st}</td></tr>`; }).join(''); }
    const hist = el('teacher-routine-history');
    if (hist) { const all = store.getRoutines().filter(r => r.teacherPersonId === s.personId).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
      hist.innerHTML = all.length ? all.map(r => { const st = store.getPerson(r.studentId);
        return `<div class="p-3 border-bottom"><div class="d-flex justify-content-between"><strong class="small">${st ? esc(st.name) : 'Aluno removido'}</strong><small class="text-muted">${utils.formatDateBR(r.date)}</small></div>
        <small class="text-muted">${r.attendance ? 'Presente' : 'Falta'}</small>${r.comment ? `<p class="small mb-0 mt-1 text-muted">"${esc(r.comment)}"</p>` : ''}</div>`; }).join('') : '<p class="text-center text-muted p-3 small">Nenhum registro ainda.</p>'; }
  };
  const renderTeacherAllergies = () => {
    const c = el('teacher-allergy-list'); if (!c) return;
    const s = session(); const list = store.getStudents().filter(x => x.class === s.class && x.allergies && x.allergies.trim());
    c.innerHTML = list.length ? list.map(x => `<div class="allergy-alert"><strong>${esc(x.name)}:</strong> ${esc(x.allergies)}</div>`).join('') : '<small class="text-muted">Nenhum aluno com alergias nesta turma.</small>';
  };
  const openStudentView = id => {
    const s = store.getPerson(id); if (!s) return;
    el('studentViewBody').innerHTML = `<dl class="row small mb-2"><dt class="col-5">Nome</dt><dd class="col-7">${esc(s.name)}</dd>
      <dt class="col-5">Nascimento</dt><dd class="col-7">${utils.formatDateBR(s.birthDate)}</dd><dt class="col-5">Turma</dt><dd class="col-7">${esc(s.class)}</dd>
      <dt class="col-5">Alergias</dt><dd class="col-7">${esc(s.allergies || 'Nenhuma registrada')}</dd></dl>
      <h6 class="small fw-bold">Responsáveis</h6>` + ((s.guardians || []).filter(g => g.name || g.linkedPersonId).map(g => `<div class="border rounded p-2 mb-2 small"><strong>${esc(g.relation)}:</strong> ${esc(g.name || '—')}<br><small class="text-muted">${esc(g.phone || 'sem telefone')} • ${esc(g.email || 'sem e-mail')}</small></div>`).join('') || '<small class="text-muted">Nenhum responsável cadastrado.</small>') +
      `<button class="btn btn-sm btn-outline-primary mt-2" data-action="print-day" data-id="${s.id}">🖨️ Imprimir dia (agenda física)</button>`;
    openModal('studentViewModal');
  };

  const printDay = studentId => {
    const kid = store.getPerson(studentId); if (!kid) return;
    const iso = utils.todayISO(); const r = store.getRoutinesByStudent(studentId).find(x => x.date.startsWith(iso));
    const ag = store.getAgenda().find(a => a.date === iso && a.class === kid.class);
    const ca = store.getCardapio().find(c => c.date === iso);
    const ic = v => v === 'sim' ? '✔ Sim' : v === 'nao' ? '✘ Não' : '—';
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>CrecheNow — ${esc(kid.name)}</title><style>body{font-family:Arial,sans-serif;max-width:600px;margin:2rem auto}h1{font-size:1.2rem}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:6px;font-size:.9rem}.lbl{background:#eee}</style></head><body>
      <h1>CrecheNow — Resumo do dia</h1><p><strong>Aluno:</strong> ${esc(kid.name)} (Turma ${esc(kid.class)})<br><strong>Data:</strong> ${utils.formatDateBR(iso)}</p>
      <table><tr><td class="lbl">Presença</td><td>${r ? (r.attendance ? 'Presente' : 'Faltou') : 'Não registrado'}</td></tr>
      ${r && r.questions ? `<tr><td class="lbl">Atenção</td><td>${ic(r.questions.attention)}</td></tr>
      <tr><td class="lbl">Deveres</td><td>${ic(r.questions.homework)}</td></tr><tr><td class="lbl">Colegas</td><td>${ic(r.questions.peers)}</td></tr>
      <tr><td class="lbl">Alimentação</td><td>${ic(r.questions.food)}</td></tr>` : ''}
      ${r && r.comment ? `<tr><td class="lbl">Comentário</td><td>${esc(r.comment)}</td></tr>` : ''}
      ${ag ? `<tr><td class="lbl">Atividade do dia</td><td>${esc(ag.icon || '')} ${esc(ag.time || '')} ${esc(ag.title)}</td></tr>` : ''}
      ${ca ? `<tr><td class="lbl">Cardápio</td><td>${esc(ca.meal)}</td></tr>` : ''}
      ${kid.allergies ? `<tr><td class="lbl">Alergias</td><td>${esc(kid.allergies)}</td></tr>` : ''}</table>
      <p style="font-size:.75rem;color:#666">Impresso do CrecheNow em ${new Date().toLocaleString('pt-BR')} — válido como registro complementar à agenda física.</p></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  const guardianSlotHTML = (slot, i) => `<div class="border rounded p-2 mb-3" data-slot-block="${i}" data-linked="${slot.linkedPersonId || ''}">
    <div class="row g-2"><div class="col-4"><label class="form-label small fw-bold">Parentesco</label><select class="form-select form-select-sm" data-gfield="relation">${RELATIONSHIPS.map(r => `<option ${slot.relation === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
    <div class="col-8"><label class="form-label small fw-bold">Nome</label><input type="text" class="form-control form-control-sm" data-gfield="name" value="${esc(slot.name || '')}"></div>
    <div class="col-6"><label class="form-label small fw-bold">Telefone</label><input type="text" class="form-control form-control-sm" data-gfield="phone" value="${esc(slot.phone || '')}"></div>
    <div class="col-6"><label class="form-label small fw-bold">E-mail</label><input type="email" class="form-control form-control-sm" data-gfield="email" value="${esc(slot.email || '')}"></div></div>
    <div class="mt-2" data-role="linked-badge"></div><div class="mt-1" data-role="suggest"></div></div>`;
  const readSlots = root => Array.from(root.querySelectorAll('[data-slot-block]')).map(b => ({ relation: b.querySelector('[data-gfield="relation"]').value, name: b.querySelector('[data-gfield="name"]').value.trim(), phone: b.querySelector('[data-gfield="phone"]').value.trim(), email: b.querySelector('[data-gfield="email"]').value.trim(), linkedPersonId: b.dataset.linked || null }));
  const refreshSlotBadges = root => root.querySelectorAll('[data-slot-block]').forEach(b => {
    const linked = b.dataset.linked, badge = b.querySelector('[data-role="linked-badge"]');
    badge.innerHTML = linked ? `<span class="badge bg-success">Vinculado: ${esc(store.getPerson(linked)?.name || '?')}</span> <button type="button" class="btn btn-sm btn-outline-danger ms-1" data-action="unlink-guard" data-slot="${b.dataset.slotBlock}">Desvincular</button>` : '<small class="text-muted">Não vinculado a uma conta de responsável.</small>';
  });
  const parentMatches = (q, ex) => { const s = q.trim().toLowerCase(); return s.length < 3 ? [] : store.getParents().filter(p => !ex.includes(p.id) && (p.name.toLowerCase().includes(s) || (p.email || '').toLowerCase().includes(s))); };
  const syncParentLinks = (studentId, parentIds) => store.getParents().forEach(p => {
    const linked = p.linkedStudentIds || [], should = parentIds.includes(p.id), has = linked.includes(studentId);
    if (should && !has) store.updatePerson(p.id, { linkedStudentIds: [...linked, studentId] });
    else if (!should && has) store.updatePerson(p.id, { linkedStudentIds: linked.filter(x => x !== studentId) });
  });

  const openStudentDetail = id => {
    const s = store.getPerson(id); if (!s) return;
    const slots = (s.guardians && s.guardians.length ? s.guardians : []).slice(0, 2);
    while (slots.length < 2) slots.push({ relation: slots.length ? 'Mãe' : 'Pai', name: '', phone: '', email: '', linkedPersonId: null });
    el('studentDetailBody').innerHTML = `<input type="hidden" id="sd-id" value="${s.id}">
      <div class="mb-3"><label class="form-label small fw-bold">Nome Completo</label><input type="text" class="form-control" id="sd-name" value="${esc(s.name)}"></div>
      <div class="row"><div class="col-md-6 mb-3"><label class="form-label small fw-bold">Nascimento</label><input type="date" class="form-control" id="sd-birth" value="${s.birthDate || ''}"></div>
      <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Turma</label><select class="form-select" id="sd-class"><option value="A" ${s.class === 'A' ? 'selected' : ''}>A</option><option value="B" ${s.class === 'B' ? 'selected' : ''}>B</option></select></div></div>
      <div class="mb-3"><label class="form-label small fw-bold">Alergias / Observações de Saúde</label><textarea class="form-control" id="sd-allergies" rows="2">${esc(s.allergies || '')}</textarea></div>
      <h6 class="small fw-bold">Responsáveis (2 contatos)</h6><small class="text-muted d-block mb-2">Digite nome ou e-mail de um responsável já cadastrado para vinculá-lo (com confirmação).</small>
      ${slots.map((sl, i) => guardianSlotHTML(sl, i)).join('')}
      <div class="d-flex gap-2"><button class="btn btn-success flex-fill" data-action="save-student">Salvar</button><button class="btn btn-outline-danger" data-action="delete-student">Excluir</button></div>`;
    refreshSlotBadges(el('studentDetailBody')); openModal('studentDetailModal');
  };

  const renderStudentManagement = () => { const t = el('students-list'); if (!t) return; const st = store.getStudents();
    t.innerHTML = st.length ? st.map(s => `<tr data-action="open-student" data-id="${s.id}" style="cursor:pointer"><td class="small">${esc(s.name)}</td><td><span class="badge bg-info text-dark">Turma ${esc(s.class)}</span></td></tr>`).join('') : '<tr><td colspan="2" class="text-center text-muted py-3">Nenhum aluno cadastrado.</td></tr>'; };
  const renderTeachersList = () => { const t = el('teachers-list'); if (!t) return; const l = store.getTeachers();
    t.innerHTML = l.length ? l.map(x => `<tr data-action="open-person" data-id="${x.id}" style="cursor:pointer"><td class="small">${esc(x.name)}</td><td><span class="badge bg-warning text-dark">Turma ${esc(x.class)}</span></td></tr>`).join('') : '<tr><td colspan="2" class="text-center text-muted py-3 small">Nenhum professor.</td></tr>'; };
  const renderParentsList = () => { const t = el('parents-list'); if (!t) return; const l = store.getParents();
    t.innerHTML = l.length ? l.map(p => `<tr data-action="open-person" data-id="${p.id}" style="cursor:pointer"><td class="small">${esc(p.name)}</td><td class="small">${esc((p.linkedStudentIds || []).map(id => store.getPerson(id)?.name).filter(Boolean).join(', ') || '—')}</td></tr>`).join('') : '<tr><td colspan="2" class="text-center text-muted py-3 small">Nenhum responsável.</td></tr>'; };

  const renderPermissionsList = () => {
    const t = el('permissions-list'); if (!t) return;
    const cal = store.getSchoolCalendar();
    t.innerHTML = `
      <tr><td class="small fw-bold" colspan="3">📅 Permissões do Calendário</td></tr>
      <tr><td class="small">Calendário - Pais podem ver até</td><td><span class="badge bg-info">${MODE_LABEL[cal.accessParent || 'year']}</span></td>
        <td><button class="btn btn-sm btn-outline-primary" data-action="edit-access" data-role="parent">Alterar</button></td></tr>
      <tr><td class="small">Calendário - Professores podem ver até</td><td><span class="badge bg-info">${MODE_LABEL[cal.accessTeacher || 'year']}</span></td>
        <td><button class="btn btn-sm btn-outline-primary" data-action="edit-access" data-role="teacher">Alterar</button></td></tr>
      <tr><td colspan="3"><hr class="my-2"><h6 class="small fw-bold mb-2">🔑 Logins do Sistema</h6></td></tr>
      ${store.getLogins().map(l => { const p = store.getPerson(l.personId);
        return `<tr><td class="small">${esc(l.email)}</td><td><span class="badge bg-secondary">${esc(l.role)}${l.isJunior ? ' (júnior)' : ''}</span></td>
          <td><button class="btn btn-sm btn-outline-danger" data-action="delete-login" data-id="${l.personId}">×</button></td></tr>`;
      }).join('') || '<tr><td colspan="3" class="text-center text-muted py-2">Nenhum login.</td></tr>'}
      <tr><td colspan="3"><button class="btn btn-success w-100 mt-2" data-action="open-add-login">+ Novo Login</button></td></tr>`;
  };

  const renderLoginsList = () => { const t = el('logins-list'); if (!t) return;
    t.innerHTML = store.getLogins().map(l => { const p = store.getPerson(l.personId);
      return `<tr><td class="small">${esc(l.email)}</td><td><span class="badge bg-secondary">${esc(l.role)}${l.isJunior ? ' (júnior)' : ''}</span></td><td class="small">${p ? esc(p.name) : '(removido)'}</td><td><button class="btn btn-sm btn-outline-danger" data-action="delete-login" data-id="${l.personId}">×</button></td></tr>`; }).join('') || '<tr><td colspan="4" class="text-center text-muted py-3">Nenhum login.</td></tr>'; };

  const renderPersonCreateForm = type => {
    const c = el('personCreateBody'); if (!c) return;
    let html = `<input type="hidden" id="pc-type" value="${type}"><div class="mb-3"><label class="form-label small fw-bold">Nome Completo</label><input type="text" class="form-control" id="pc-name"></div>
      <div class="row"><div class="col-md-6 mb-3"><label class="form-label small fw-bold">Nascimento</label><input type="date" class="form-control" id="pc-birth"></div>
      <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Telefone</label><input type="text" class="form-control" id="pc-phone"></div></div>
      <div class="mb-3"><label class="form-label small fw-bold">E-mail</label><input type="email" class="form-control" id="pc-email"></div>`;
    if (type === 'student') html += `<div class="row"><div class="col-md-6 mb-3"><label class="form-label small fw-bold">Turma</label><select class="form-select" id="pc-class"><option value="A">A</option><option value="B">B</option></select></div>
      <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Alergias</label><input type="text" class="form-control" id="pc-allergies"></div></div><h6 class="small fw-bold">Responsável principal (opcional)</h6>` + guardianSlotHTML({ relation: 'Pai', name: '', phone: '', email: '', linkedPersonId: null }, 0);
    else if (type === 'parent') html += `<div class="mb-3"><label class="form-label small fw-bold">Vincular a uma criança (opcional)</label><input type="text" class="form-control" id="pc-child-query" placeholder="Digite o nome da criança..."><input type="hidden" id="pc-child-id" value=""><div id="pc-child-suggest" class="mt-1"></div></div>`;
    else if (type === 'teacher') html += `<div class="mb-3"><label class="form-label small fw-bold">Turma que leciona</label><select class="form-select" id="pc-class"><option value="A">A</option><option value="B">B</option></select></div>`;
    else if (type === 'secretary') html += `<div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="pc-junior"><label class="form-check-label small" for="pc-junior">Secretaria Júnior (sem permissão para cadastros/logins)</label></div>`;
    c.innerHTML = html + `<button type="button" class="btn btn-success w-100" data-action="create-person">Cadastrar</button>`;
    if (type === 'student') refreshSlotBadges(c);
  };

  const renderPersonEdit = id => {
    const p = store.getPerson(id); if (!p) return;
    let html = `<input type="hidden" id="pe-id" value="${p.id}"><div class="mb-3"><label class="form-label small fw-bold">Nome</label><input type="text" class="form-control" id="pe-name" value="${esc(p.name)}"></div>
      <div class="row"><div class="col-md-6 mb-3"><label class="form-label small fw-bold">Nascimento</label><input type="date" class="form-control" id="pe-birth" value="${p.birthDate || ''}"></div>
      <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Telefone</label><input type="text" class="form-control" id="pe-phone" value="${esc(p.phone || '')}"></div></div>
      <div class="mb-3"><label class="form-label small fw-bold">E-mail</label><input type="email" class="form-control" id="pe-email" value="${esc(p.email || '')}"></div>`;
    if (p.type === 'teacher') html += `<div class="mb-3"><label class="form-label small fw-bold">Turma que leciona</label><select class="form-select" id="pe-class"><option value="A" ${p.class === 'A' ? 'selected' : ''}>A</option><option value="B" ${p.class === 'B' ? 'selected' : ''}>B</option></select></div>`;
    if (p.type === 'parent') {
      const linked = store.getStudents().filter(s => (s.parentIds || []).includes(p.id));
      html += `<h6 class="small fw-bold">Crianças vinculadas</h6>` + (linked.map(s => `<div class="d-flex justify-content-between align-items-center border rounded p-1 mb-1 small">${esc(s.name)} — Turma ${esc(s.class)}<button type="button" class="btn btn-sm btn-outline-danger" data-action="unlink-child" data-child="${s.id}">Desvincular</button></div>`).join('') || '<small class="text-muted">Nenhuma criança vinculada.</small>') +
        `<input type="text" class="form-control form-control-sm mt-2" id="pe-child-query" placeholder="Digite o nome da criança para vincular..."><div id="pe-child-suggest" class="mt-1"></div>`;
    }
    html += `<button type="button" class="btn btn-success w-100 mb-2" data-action="update-person">Salvar alterações</button><button type="button" class="btn btn-outline-danger w-100" data-action="delete-person">Excluir cadastro</button>`;
    el('personEditBody').innerHTML = html; openModal('personEditModal');
  };

  const renderLoginForm = () => el('loginFormBody').innerHTML = `<div class="mb-3"><label class="form-label small fw-bold">Tipo de Conta</label><select class="form-select" id="lf-role"><option value="">Escolha...</option><option value="parent">Responsável</option><option value="teacher">Professor</option><option value="secretary">Secretaria</option></select></div>
    <div class="mb-3"><label class="form-label small fw-bold">Pessoa Vinculada</label><select class="form-select" id="lf-person"><option value="">Primeiro escolha o tipo</option></select></div>
    <div class="mb-3"><label class="form-label small fw-bold">E-mail (login)</label><input type="email" class="form-control" id="lf-email"></div>
    <div class="mb-3"><label class="form-label small fw-bold">Senha (mínimo 6)</label><input type="password" class="form-control" id="lf-senha" minlength="6"></div>
    <button type="button" class="btn btn-success w-100" data-action="create-login">Criar Login</button>`;
  const handleLoginRoleChange = () => {
    const role = el('lf-role').value, used = new Set(store.getLogins().map(l => l.personId));
    el('lf-person').innerHTML = '<option value="">Escolha a pessoa...</option>' + store.getPeople().filter(p => p.type === role && !used.has(p.id)).map(p => `<option value="${p.id}">${esc(p.name)} — ${esc(p.email || '(sem email)')}</option>`).join('');
  };

  const renderNoticeForm = () => {
    el('noticeFormBody').innerHTML = `<div class="mb-3"><label class="form-label small fw-bold">Tipo</label><select class="form-select" id="nf-type">${NOTICE_TYPES.map(t => `<option>${t}</option>`).join('')}</select></div>
      <div class="mb-3"><label class="form-label small fw-bold">Público-alvo</label><select class="form-select" id="nf-target"><option value="all">Todas as turmas</option><option value="A">Apenas Turma A</option><option value="B">Apenas Turma B</option></select></div>
      <div class="mb-3"><label class="form-label small fw-bold">Tipo de Resposta Esperada</label><select class="form-select" id="nf-response">${RESPONSE_TYPES.map(t => `<option>${t}</option>`).join('')}</select></div>
      <div class="mb-3"><label class="form-label small fw-bold">Título</label><input type="text" class="form-control" id="nf-title"></div>
      <div class="row mb-3"><div class="col-6"><label class="form-label small fw-bold">Data</label><input type="date" class="form-control" id="nf-date" value="${utils.todayISO()}"></div>
      <div class="col-6"><label class="form-label small fw-bold">Hora</label><input type="time" class="form-control" id="nf-time" value="${utils.pad(new Date().getHours())}:${utils.pad(new Date().getMinutes())}"></div></div>
      <div class="mb-3"><label class="form-label small fw-bold">Mensagem</label><textarea class="form-control" id="nf-body" rows="4"></textarea></div>
      <button type="button" class="btn btn-success w-100" data-action="send-notice">Enviar Comunicado</button>`;
  };
  const renderSent = () => {
    const t = el('sent-notifications'); if (!t) return; const n = store.getNotifications();
    t.innerHTML = n.length ? n.map(s => `<tr data-action="open-responses" data-id="${s.id}" style="cursor:pointer"><td class="small">${esc(s.title)}</td><td><span class="badge bg-light text-dark border">${esc(s.type)}</span></td><td class="small text-muted">${utils.formatDateTimeBR(s.date)}</td><td><span class="badge ${store.getResponsesForNotice(s.id).length ? 'bg-success' : 'bg-secondary'}">${store.getResponsesForNotice(s.id).length} resposta(s)</span></td></tr>`).join('') : '<tr><td colspan="4" class="text-center text-muted py-3 small">Nenhum envio.</td></tr>';
  };
  const openResponsesModal = id => {
    const n = store.getNotifications().find(x => x.id === +id); if (!n) return;
    const rs = store.getResponsesForNotice(n.id);
    el('noticeResponsesBody').innerHTML = `<p class="small"><strong>${esc(n.title)}</strong> — resposta esperada: ${esc(n.responseType || '—')}</p>` +
      (rs.length ? rs.map(r => { const p = store.getPerson(r.personId); const v = r.kind === 'yesno' ? (r.value === 'sim' ? 'Sim' : 'Não') : r.value;
        return `<div class="message-item mb-2"><div class="msg-header"><strong>${esc(p?.name || '?')}</strong><small>${utils.formatDateTimeBR(r.date)}</small></div><div class="msg-body">${esc(v)}</div></div>`; }).join('') : '<p class="text-muted small">Nenhuma resposta recebida ainda.</p>');
    openModal('noticeResponsesModal');
  };

  const renderMessageForm = () => {
    const s = session(), c = el('messageFormBody'); if (!c) return;
    let recipients = [];
    if (s.role === 'parent') {
      const cls = myClasses();
      recipients = store.getTeachers().filter(t => cls.includes(t.class)).map(t => ({ id: t.id, label: `Prof. ${t.name} (Turma ${t.class})` }));
      store.getPeople().filter(p => p.type === 'secretary').forEach(p => recipients.push({ id: p.id, label: `Secretaria — ${p.name}` }));
    } else if (s.role === 'teacher') {
      store.getStudents().filter(st => st.class === s.class).forEach(st => (st.parentIds || []).forEach(pid => { const p = store.getPerson(pid); if (p) recipients.push({ id: p.id, label: `${p.name} (resp. de ${st.name})`, childId: st.id }); }));
    } else {
      store.getTeachers().forEach(t => recipients.push({ id: t.id, label: `Prof. ${t.name} (Turma ${t.class})` }));
      store.getParents().forEach(p => recipients.push({ id: p.id, label: `${p.name} (responsável)` }));
    }
    c.innerHTML = `<div class="mb-3"><label class="form-label small fw-bold">Destinatário</label><select class="form-select" id="mf-recipient"><option value="">Escolha...</option>${recipients.map(r => `<option value="${r.id}" data-child="${r.childId || ''}">${esc(r.label)}</option>`).join('')}</select></div>
      <div class="mb-3"><label class="form-label small fw-bold">Mensagem</label><textarea class="form-control" id="mf-message" rows="5"></textarea></div>
      <button type="button" class="btn btn-success w-100" data-action="send-message">Enviar Recado</button>`;
  };
  const threadId = m => m.threadId || ('solo_' + m.id);
  const renderInbox = (tab = 'received') => {
    const c = el('inbox-content'); if (!c) return; const s = session(); const msgs = store.getMessages();
    if (tab === 'received') {
      let html = (s.role === 'parent' || s.role === 'teacher') ? store.getNotifications().filter(n => { const cls = myClasses(); return !cls || !n.targetClass || n.targetClass === 'all' || cls.includes(n.targetClass); }).map(n => `
        <div class="message-item ${isUnread(n) ? 'unread' : ''}"><div class="msg-header"><strong>[Comunicado] ${esc(n.title)}</strong><small>${utils.formatDateTimeBR(n.date)}</small></div>
        <div class="msg-body">${esc(n.body)}</div>${responseZoneHTML(n, s)}
        ${isUnread(n) ? `<button class="btn btn-sm btn-success mt-2" data-action="mark-read" data-item-id="${n.id}">Marcar como lido</button>` : '<span class="badge bg-success mt-2">Lido</span>'}</div>`).join('') : '';
      const map = new Map(); msgs.filter(m => m.toPersonId === s.personId).forEach(m => { const t = threadId(m); if (!map.has(t)) map.set(t, []); map.get(t).push(m); });
      html += [...map.entries()].sort((a, b) => new Date(b[1][b[1].length - 1].date) - new Date(a[1][a[1].length - 1].date)).map(([tid, list]) => {
        const last = list[list.length - 1], unread = list.filter(m => !m.read).length;
        return `<div class="message-item ${unread ? 'unread' : ''}"><div class="msg-header"><strong>Conversa com ${esc(last.fromName)}</strong><small>${utils.formatDateTimeBR(last.date)}</small></div>
        <div class="msg-body">${esc(last.message)}</div><div class="mt-2 d-flex gap-2 align-items-center"><button class="btn btn-sm btn-success" data-action="open-thread" data-thread="${tid}">Abrir e responder</button>${unread ? `<span class="badge bg-danger">${unread} nova(s)</span>` : ''}</div></div>`; }).join('');
      c.innerHTML = html || '<p class="text-center text-muted py-3">Nada recebido.</p>';
    } else {
      const sent = msgs.filter(m => m.fromPersonId === s.personId).sort((a, b) => new Date(b.date) - new Date(a.date));
      c.innerHTML = sent.length ? sent.map(m => `<div class="message-item sent"><div class="msg-header"><strong>Para: ${esc(m.toName)}</strong><small>${utils.formatDateTimeBR(m.date)}</small></div><div class="msg-body">${esc(m.message)}</div><button class="btn btn-sm btn-outline-success mt-2" data-action="open-thread" data-thread="${threadId(m)}">Abrir conversa</button></div>`).join('') : '<p class="text-center text-muted py-3">Nada enviado.</p>';
    }
  };
  const openThread = tid => {
    const s = session(); const list = store.getMessages().filter(m => threadId(m) === tid).sort((a, b) => new Date(a.date) - new Date(b.date)); if (!list.length) return;
    list.filter(m => m.toPersonId === s.personId && !m.read).forEach(m => store.markMessageAsRead(m.id));
    const otherId = list.find(m => m.fromPersonId !== s.personId)?.fromPersonId || list[0].toPersonId;
    const other = store.getPerson(otherId);
    el('threadModalBody').innerHTML = `<h6 class="small fw-bold mb-2">Conversa com ${esc(other?.name || '?')}</h6><div class="thread-list mb-3">` +
      list.map(m => `<div class="thread-bubble ${m.fromPersonId === s.personId ? 'mine' : ''}"><small class="text-muted">${esc(m.fromName)} • ${utils.formatDateTimeBR(m.date)}</small><div>${esc(m.message)}</div></div>`).join('') +
      `</div><textarea class="form-control mb-2" id="thread-reply" rows="3" placeholder="Escreva sua resposta..."></textarea>
      <button class="btn btn-success w-100" data-action="send-reply" data-thread="${tid}" data-to="${otherId}">Enviar resposta</button>`;
    openModal('threadModal'); updateInboxBadge();
  };
  const updateInboxBadge = () => {
    const b = el('inboxBadge'); if (!b) return; const s = session(); if (!s) return;
    let unread = store.getMessages().filter(m => m.toPersonId === s.personId && !m.read).length;
    if (s.role !== 'secretary') { const cls = myClasses(); unread += store.getNotifications().filter(n => !store.isRead(n, s.personId) && (!cls || !n.targetClass || n.targetClass === 'all' || cls.includes(n.targetClass))).length; }
    b.textContent = unread; b.style.display = unread ? 'inline-block' : 'none';
  };

  const renderMyData = () => {
    const s = session(); if (!s) return; const p = store.getPerson(s.personId);
    el('myDataBody').innerHTML = `<dl class="row small"><dt class="col-4">Nome</dt><dd class="col-8">${esc(p?.name || s.name)}</dd>
      <dt class="col-4">E-mail</dt><dd class="col-8">${esc(s.email)}</dd><dt class="col-4">Função</dt><dd class="col-8">${esc(s.role)}</dd>
      <dt class="col-4">Nascimento</dt><dd class="col-8">${utils.formatDateBR(p?.birthDate)}</dd><dt class="col-4">Telefone</dt><dd class="col-8">${esc(p?.phone || '—')}</dd></dl>
      <button class="btn btn-outline-secondary btn-sm w-100" data-action="export-my-data">Exportar JSON</button>`;
    openModal('myDataModal');
  };

  const TUTORIALS = {
    parent: ['Aqui você vê os comunicados da creche. Responda os que pedem confirmação.', 'A rotina de hoje do seu filho aparece no card verde — clique para detalhes.', 'O calendário mostra a semana; clique para expandir.', 'Use "Enviar Recado" para falar com o professor ou a secretaria.'],
    teacher: ['Registre a rotina diária de cada aluno no card central.', 'A aba Agenda publica as atividades da sua turma para os pais.', 'Clique em um aluno para ver a ficha e imprimir o dia.', 'Comunicados e recados ficam no topo e nos botões abaixo.'],
    secretary: ['Envie comunicados e acompanhe as respostas na tabela.', 'Edite cardápio e calendário de aulas abaixo da amostra do calendário.', 'Cadastre pessoas e logins na coluna da direita.', 'Restrinja o nível do calendário que pais/professores podem ver.']
  };
  const startTutorialIfFirstRun = () => {
    const s = session(); if (!s) return;
    const done = store.get('crechenow_tutorial_done') || {};
    if (!done[s.personId]) { window.__tutStep = 0; renderTutorial(0); }
  };

  const renderTutorial = step => {
    const s = session(); if (!s) return; const steps = TUTORIALS[s.role] || [];
    el('tutorialBody').innerHTML = `<h4 class="mb-3">Guia rápido — ${s.role === 'parent' ? 'Responsável' : s.role === 'teacher' ? 'Professor' : 'Secretaria'}</h4>
      <div class="tutorial-steps">${steps.map((_, i) => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}</div>
      <p class="mb-4">${esc(steps[step] || '')}</p>
      <div class="d-flex justify-content-between">
        <button class="btn btn-sm btn-outline-secondary" data-action="tutorial-skip">Pular</button>
        <div class="d-flex gap-2">
          ${step > 0 ? `<button class="btn btn-sm btn-outline-primary" data-action="tutorial-prev">Anterior</button>` : ''}
          <button class="btn btn-sm btn-success" data-action="tutorial-next">${step < steps.length - 1 ? 'Próximo' : 'Concluir'}</button>
        </div>
      </div>`;
    openModal('tutorialModal');
  };

  const notifyLocal = (title, body) => {
    if (!('serviceWorker' in navigator) || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, icon: CrecheNowConfig.BASE_PATH + 'assets/img/icons/icon-192x192.png' }));
  };

  const showToast = (msg, type = 'success') => {
    const c = el('toast-container') || document.body; const t = document.createElement('div');
    t.className = `toast align-items-center text-bg-${type} border-0 show`;
    t.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(msg)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    c.appendChild(t); setTimeout(() => t.remove(), 4000);
  };

  const activeFilter = () => document.querySelector('[data-filter].active')?.dataset.filter || 'all';
  const activeTab = () => document.querySelector('[data-inbox-tab].active')?.dataset.inboxTab || 'received';

  const ACTIONS = {
    'open-msg': () => { renderMessageForm(); openModal('messageFormModal'); },
    'send-message': () => { const sel = el('mf-recipient'), msg = el('mf-message').value.trim(), s = session();
      if (!sel.value || !msg) return showToast('Preencha todos os campos.', 'warning');
      const r = store.getPerson(sel.value);
      store.addMessage({ threadId: 't_' + Date.now(), fromPersonId: s.personId, toPersonId: sel.value, fromName: s.name, toName: r?.name || '', fromRole: s.role, toRole: r?.type || '', childId: sel.options[sel.selectedIndex].dataset.child || null, message: msg });
      showToast('Recado enviado.'); closeModal('messageFormModal'); updateInboxBadge(); },
    'open-inbox': () => { renderInbox('received'); openModal('inboxModal'); },
    'open-thread': t => openThread(t.dataset.thread),
    'send-reply': t => { const s = session(), v = el('thread-reply').value.trim(); if (!v) return showToast('Escreva sua resposta.', 'warning');
      const to = store.getPerson(t.dataset.to);
      store.addMessage({ threadId: t.dataset.thread, fromPersonId: s.personId, toPersonId: t.dataset.to, fromName: s.name, toName: to?.name || '', fromRole: s.role, toRole: to?.type || '', childId: null, message: v });
      showToast('Resposta enviada.'); openThread(t.dataset.thread); },
    'mark-read': t => { store.markAsRead(+t.dataset.itemId, session().personId); renderFeed(activeFilter()); renderInbox(activeTab()); updateInboxBadge(); },
    'respond': t => { const s = session(); store.addNoticeResponse({ noticeId: +t.dataset.notice, personId: s.personId, kind: 'yesno', value: t.dataset.value }); showToast('Resposta enviada.'); renderFeed(activeFilter()); },
    'respond-text': t => { const s = session(), v = t.closest('.response-zone').querySelector('[data-role="response-text"]').value.trim();
      if (!v) return showToast('Escreva sua resposta.', 'warning');
      store.addNoticeResponse({ noticeId: +t.dataset.notice, personId: s.personId, kind: 'text', value: v }); showToast('Resposta enviada.'); renderFeed(activeFilter()); },
    'open-calendar': () => { const m = el('calendarModal'); m.dataset.view = maxMode(); m.dataset.ref = utils.todayISO(); renderCalendarView(); openModal('calendarModal'); },
    'open-cardapio-editor': () => { const m = el('cardapioEditorModal'); m.dataset.view = 'week'; m.dataset.ref = utils.toISODate(utils.getWeekStart()); renderCardapioEditor(); openModal('cardapioEditorModal'); },
    'save-cardapio': saveCardapio,
    'remove-cardapio': t => { store.setCardapio(store.getCardapio().filter(c => c.date !== t.dataset.date)); renderCardapioEditor(); renderCardapio(); renderCalendarPreview(); showToast('Refeição removida.'); },
    'cd-edit-month': t => { const m = el('cardapioEditorModal'); m.dataset.view = 'month'; m.dataset.ref = utils.toISODate(new Date(utils.parseISO(m.dataset.ref).getFullYear(), +t.dataset.month, 1)); renderCardapioEditor(); },
    'open-school-calendar': () => { const m = el('schoolCalendarModal'); m.dataset.view = 'week'; m.dataset.ref = utils.todayISO(); renderSchoolCalendarEditor(); openModal('schoolCalendarModal'); },
    'toggle-school-day': t => { store.setSchoolCalendarOverride(t.dataset.date, !store.isSchoolDay(t.dataset.date)); renderSchoolCalendarEditor(); renderAgenda(); renderCardapio(); renderCalendarPreview(); },
    'add-event': () => { const title = el('ev-title').value.trim(), date = el('ev-date').value; if (!title || !date) return showToast('Preencha título e data.', 'warning');
      store.addEvent({ type: el('ev-type').value, date, title }); renderSchoolCalendarEditor(); renderCalendarPreview(); showToast('Evento adicionado.'); },
    'remove-event': t => { store.removeEvent(t.dataset.id); renderSchoolCalendarEditor(); renderCalendarPreview(); },
    'open-agenda-editor': () => { el('agendaEditorModal').dataset.week = utils.toISODate(utils.getWeekStart()); renderAgendaEditor(); openModal('agendaEditorModal'); },
    'save-agenda': saveAgenda,
    'remove-agenda': t => { const s = session(); store.setAgenda(store.getAgenda().filter(a => !(a.date === t.dataset.date && a.class === s.class))); renderAgendaEditor(); renderAgenda(); renderCalendarPreview(); showToast('Atividade removida.'); },
    'pick-icon': t => { const s = session(); const all = store.getAgenda(); const i = all.findIndex(a => a.date === t.dataset.date && a.class === s.class);
      if (i !== -1) all[i].icon = t.dataset.icon; else all.push({ class: s.class, date: t.dataset.date, icon: t.dataset.icon, title: '', time: '08:00' });
      store.setAgenda(all); renderAgendaEditor(); renderAgenda(); renderCalendarPreview(); },
    'open-student-view': t => openStudentView(t.dataset.id),
    'print-day': t => printDay(t.dataset.id),
    'open-notice': () => { renderNoticeForm(); openModal('noticeFormModal'); },
    'send-notice': () => { const title = el('nf-title').value.trim(), body = el('nf-body').value.trim();
      if (!title || !body) return showToast('Preencha título e mensagem.', 'warning');
      store.addNotification({ title, body, type: el('nf-type').value, targetClass: el('nf-target').value, responseType: el('nf-response').value, date: `${el('nf-date').value}T${el('nf-time').value}:00` });
      showToast('Comunicado enviado.'); renderSent(); renderFeed('all', 'staff-carousel-inner-notifs'); closeModal('noticeFormModal'); },
    'open-responses': t => openResponsesModal(t.dataset.id),
    'open-add-person': () => { renderPersonCreateForm('student'); openModal('personCreateModal'); },
    'create-person': () => { const type = el('pc-type').value, name = el('pc-name').value.trim(); if (!name) return showToast('Informe o nome.', 'warning');
      const base = { type, name, birthDate: el('pc-birth').value, phone: el('pc-phone').value.trim(), email: el('pc-email').value.trim() }; let created;
      if (type === 'student') { base.class = el('pc-class').value; base.allergies = el('pc-allergies').value.trim();
        const slots = readSlots(el('personCreateBody')).filter(s => s.name || s.linkedPersonId); base.guardians = slots; base.parentIds = slots.map(s => s.linkedPersonId).filter(Boolean);
        created = store.addPerson(base); syncParentLinks(created.id, base.parentIds); }
      else if (type === 'parent') { base.linkedStudentIds = []; created = store.addPerson(base);
        const cid = el('pc-child-id').value; if (cid) { store.updatePerson(created.id, { linkedStudentIds: [cid] }); const s = store.getPerson(cid); store.updatePerson(cid, { parentIds: [...(s.parentIds || []), created.id] }); } }
      else { if (type === 'teacher') base.class = el('pc-class').value; if (type === 'secretary') base.isJunior = el('pc-junior').checked; created = store.addPerson(base); }
      showToast('Cadastro realizado. Crie um login para esta pessoa.'); closeModal('personCreateModal'); renderStudentManagement(); renderTeachersList(); renderParentsList(); renderPermissionsList(); },
    'pick-guard': t => { const p = store.getPerson(t.dataset.person); if (!confirm(`Confirma que "${p.name}" é o responsável?`)) return;
      const b = el('personCreateBody').querySelector(`[data-slot-block="${t.dataset.slot}"]`); b.dataset.linked = p.id;
      if (!b.querySelector('[data-gfield="name"]').value) b.querySelector('[data-gfield="name"]').value = p.name;
      if (!b.querySelector('[data-gfield="email"]').value) b.querySelector('[data-gfield="email"]').value = p.email || '';
      if (!b.querySelector('[data-gfield="phone"]').value) b.querySelector('[data-gfield="phone"]').value = p.phone || '';
      b.querySelector('[data-role="suggest"]').innerHTML = ''; refreshSlotBadges(el('personCreateBody')); },
    'pick-child': t => { const s = store.getPerson(t.dataset.child); if (!confirm(`Confirma o vínculo com "${s.name}"?`)) return;
      el('pc-child-id').value = s.id; el('pc-child-suggest').innerHTML = `<span class="badge bg-success">Vinculado: ${esc(s.name)}</span>`; },
    'open-student': t => openStudentDetail(t.dataset.id),
    'link-guard': t => { const p = store.getPerson(t.dataset.person); if (!confirm(`Confirma que "${p.name}" (${p.email || 'sem email'}) é o responsável deste aluno?`)) return;
      const root = el('studentDetailBody'), id = el('sd-id').value, slots = readSlots(root), slot = slots[+t.dataset.slot];
      slot.linkedPersonId = p.id; if (!slot.name) slot.name = p.name; if (!slot.phone) slot.phone = p.phone || ''; if (!slot.email) slot.email = p.email || '';
      const parentIds = slots.map(s => s.linkedPersonId).filter(Boolean); store.updatePerson(id, { guardians: slots, parentIds }); syncParentLinks(id, parentIds); showToast('Responsável vinculado.'); openStudentDetail(id); },
    'unlink-guard': t => { const root = el('studentDetailBody'), id = el('sd-id').value, slots = readSlots(root);
      slots[+t.dataset.slot].linkedPersonId = null; const parentIds = slots.map(s => s.linkedPersonId).filter(Boolean);
      store.updatePerson(id, { guardians: slots, parentIds }); syncParentLinks(id, parentIds); showToast('Vínculo removido.'); openStudentDetail(id); },
    'save-student': () => { const id = el('sd-id').value, root = el('studentDetailBody'), slots = readSlots(root), parentIds = slots.map(s => s.linkedPersonId).filter(Boolean);
      store.updatePerson(id, { name: el('sd-name').value.trim(), birthDate: el('sd-birth').value, class: el('sd-class').value, allergies: el('sd-allergies').value.trim(), guardians: slots, parentIds });
      syncParentLinks(id, parentIds); renderStudentManagement(); renderCalendarPreview(); showToast('Aluno atualizado.'); closeModal('studentDetailModal'); },
    'delete-student': () => { const id = el('sd-id').value; if (!confirm('Remover este aluno do sistema?')) return; store.removePerson(id); renderStudentManagement(); showToast('Aluno removido.'); closeModal('studentDetailModal'); },
    'open-person': t => renderPersonEdit(t.dataset.id),
    'update-person': () => { const id = el('pe-id').value, patch = { name: el('pe-name').value.trim(), birthDate: el('pe-birth').value, phone: el('pe-phone').value.trim(), email: el('pe-email').value.trim() };
      if (el('pe-class')) patch.class = el('pe-class').value; store.updatePerson(id, patch); showToast('Cadastro atualizado.'); closeModal('personEditModal'); renderStudentManagement(); renderTeachersList(); renderParentsList(); renderPermissionsList(); },
    'delete-person': () => { const id = el('pe-id').value; if (!confirm('Excluir este cadastro? O login associado também será removido.')) return;
      store.removeLogin(id); store.removePerson(id); showToast('Cadastro excluído.'); closeModal('personEditModal'); renderStudentManagement(); renderTeachersList(); renderParentsList(); renderPermissionsList(); },
    'link-child': t => { const s = store.getPerson(t.dataset.child); if (!confirm(`Confirma o vínculo de "${s.name}" a este responsável?`)) return;
      const id = el('pe-id').value, p = store.getPerson(id); store.updatePerson(id, { linkedStudentIds: [...(p.linkedStudentIds || []), s.id] }); store.updatePerson(s.id, { parentIds: [...(s.parentIds || []), id] }); showToast('Criança vinculada.'); renderPersonEdit(id); renderParentsList(); },
    'unlink-child': t => { const cid = t.dataset.child, id = el('pe-id').value, p = store.getPerson(id), s = store.getPerson(cid);
      store.updatePerson(id, { linkedStudentIds: (p.linkedStudentIds || []).filter(x => x !== cid) }); store.updatePerson(cid, { parentIds: (s.parentIds || []).filter(x => x !== id) }); showToast('Vínculo removido.'); renderPersonEdit(id); renderParentsList(); },
    'open-add-login': () => { renderLoginForm(); openModal('loginFormModal'); },
    'create-login': () => { const role = el('lf-role').value, pid = el('lf-person').value, email = el('lf-email').value.trim(), senha = el('lf-senha').value;
      if (!role || !pid || !email || senha.length < 6) return showToast('Preencha todos os campos.', 'warning');
      const person = store.getPerson(pid); store.addLogin({ personId: pid, email, senha, role, isJunior: role === 'secretary' && person.isJunior });
      showToast('Login criado.'); closeModal('loginFormModal'); renderPermissionsList(); },
    'delete-login': t => { if (!confirm('Remover este login?')) return; store.removeLogin(t.dataset.id); renderPermissionsList(); showToast('Login removido.'); },
    'open-my-data': renderMyData,
    'export-my-data': () => { const s = session(); const blob = new Blob([JSON.stringify({ person: store.getPerson(s.personId) }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'meus-dados.json'; a.click(); URL.revokeObjectURL(url); },
    'tutorial-next': () => { const s = session(); const total = (TUTORIALS[s.role] || []).length;
      if ((window.__tutStep || 0) < total - 1) { window.__tutStep++; renderTutorial(window.__tutStep); }
      else { const done = store.get('crechenow_tutorial_done') || {}; done[s.personId] = true; store.set('crechenow_tutorial_done', done); closeModal('tutorialModal'); } },
    'tutorial-prev': () => { if ((window.__tutStep || 0) > 0) { window.__tutStep--; renderTutorial(window.__tutStep); } },
    'tutorial-skip': () => { const s = session(); const done = store.get('crechenow_tutorial_done') || {}; done[s.personId] = true; store.set('crechenow_tutorial_done', done); closeModal('tutorialModal'); },
    'repeat-tutorial': () => { window.__tutStep = 0; renderTutorial(0); },
    'edit-access': t => {
      const role = t.dataset.role;
      const current = store.getCalendarAccess(role);
      const levels = ['week', 'month', 'year'];
      const html = `<div class="mb-3"><label class="form-label small fw-bold">Nível máximo para ${role === 'parent' ? 'pais' : 'professores'}</label>
        <select class="form-select" id="access-level">${levels.map(l => `<option value="${l}" ${l === current ? 'selected' : ''}>${MODE_LABEL[l]}</option>`).join('')}</select></div>
        <button class="btn btn-success w-100" data-action="save-access" data-role="${role}">Salvar</button>`;
      el('personEditBody').innerHTML = html;
      openModal('personEditModal');
    },
    'save-access': t => {
      const role = t.dataset.role;
      const level = el('access-level').value;
      store.setCalendarAccess(role, level);
      showToast(`Permissão de ${role === 'parent' ? 'pais' : 'professores'} atualizada.`);
      closeModal('personEditModal');
      renderPermissionsList();
    },
    'logout': () => CrecheNowAuth.logout()
  };

  const handleClick = e => {
    const close = e.target.closest('[data-close]'); if (close) return closeModal(close.dataset.close);
    const overlay = e.target.closest('.modal-overlay'); if (overlay && e.target === overlay) return overlay.classList.remove('active');
    if (handleNav(e, 'cd', 'cardapioEditorModal', renderCardapioEditor)) return;
    if (handleNav(e, 'sc', 'schoolCalendarModal', renderSchoolCalendarEditor)) return;
    if (handleNav(e, 'cal', 'calendarModal', renderCalendarView)) return;
    const agNav = e.target.closest('[data-action="agenda-week-prev"], [data-action="agenda-week-next"]');
    if (agNav) { const m = el('agendaEditorModal'); const d = utils.parseISO(m.dataset.week); d.setDate(d.getDate() + (agNav.dataset.action.endsWith('next') ? 7 : -7)); m.dataset.week = utils.toISODate(d); renderAgendaEditor(); return; }
    if (e.target.closest('.agenda-icon-btn')) { document.querySelector(`.icon-picker-container[data-index="${e.target.closest('.agenda-icon-btn').dataset.index}"]`)?.classList.toggle('d-none'); return; }
    const staffTab = e.target.closest('[data-staff-tab]');
    if (staffTab) { document.querySelectorAll('[data-staff-tab]').forEach(b => b.classList.remove('active')); staffTab.classList.add('active');
      document.querySelectorAll('.staff-tab-panel').forEach(p => p.classList.add('d-none')); document.querySelector(`.staff-tab-panel[data-staff-panel="${staffTab.dataset.staffTab}"]`).classList.remove('d-none'); return; }
    const inboxTab = e.target.closest('[data-inbox-tab]');
    if (inboxTab) { document.querySelectorAll('[data-inbox-tab]').forEach(b => b.classList.remove('active')); inboxTab.classList.add('active'); renderInbox(inboxTab.dataset.inboxTab); return; }
    const filterBtn = e.target.closest('[data-filter]');
    if (filterBtn) { document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active')); filterBtn.classList.add('active'); renderFeed(filterBtn.dataset.filter); return; }
    const personType = e.target.closest('[data-person-type]'); if (personType) return renderPersonCreateForm(personType.dataset.personType);
    const btn = e.target.closest('[data-action]'); if (!btn) return;
    const act = ACTIONS[btn.dataset.action]; if (act) { e.preventDefault(); act(btn); }
  };

  const handleInput = e => {
    const g = e.target.closest('[data-gfield="name"], [data-gfield="email"]');
    if (g) { const block = g.closest('[data-slot-block]'), root = block.closest('.modal-box') || document;
      const exclude = Array.from(root.querySelectorAll('[data-slot-block]')).map(b => b.dataset.linked).filter(Boolean);
      block.querySelector('[data-role="suggest"]').innerHTML = parentMatches(g.value, exclude).map(p => `<div class="suggest-chip">Encontrado: <strong>${esc(p.name)}</strong> (${esc(p.email || 'sem email')}) <button type="button" class="btn btn-sm btn-success ms-1" data-action="pick-guard" data-slot="${block.dataset.slotBlock}" data-person="${p.id}">Vincular</button></div>`).join(''); return; }
    if (e.target.id === 'pc-child-query') { const q = e.target.value.trim().toLowerCase();
      el('pc-child-suggest').innerHTML = q.length >= 3 ? store.getStudents().filter(s => s.name.toLowerCase().includes(q)).map(s => `<div class="suggest-chip"><strong>${esc(s.name)}</strong> — Turma ${esc(s.class)} <button type="button" class="btn btn-sm btn-success ms-1" data-action="pick-child" data-child="${s.id}">Vincular</button></div>`).join('') : ''; }
    if (e.target.id === 'pe-child-query') { const p = store.getPerson(el('pe-id').value), q = e.target.value.trim().toLowerCase(), linked = p.linkedStudentIds || [];
      el('pe-child-suggest').innerHTML = q.length >= 3 ? store.getStudents().filter(s => !linked.includes(s.id) && s.name.toLowerCase().includes(q)).map(s => `<div class="suggest-chip"><strong>${esc(s.name)}</strong> — Turma ${esc(s.class)} <button type="button" class="btn btn-sm btn-success ms-1" data-action="link-child" data-child="${s.id}">Vincular</button></div>`).join('') : ''; }
  };

  const handleChange = e => {
    if (e.target.classList.contains('school-day-check')) { const cal = store.getSchoolCalendar(); cal.schoolDays = Array.from(document.querySelectorAll('.school-day-check:checked')).map(c => +c.value); store.setSchoolCalendar(cal); renderAgenda(); renderCardapio(); renderCalendarPreview(); showToast('Dias padrão atualizados.'); }
    if (e.target.dataset.action === 'set-access') { store.setCalendarAccess('parent', e.target.value); showToast('Permissão de calendário atualizada.'); }
    if (e.target.id === 'lf-role') handleLoginRoleChange();
  };

  const initRealTimeSync = () => {
    window.addEventListener('storage', e => {
      const s = session(); if (!s) return;
      if (e.key === 'crechenow_notifications') {
        if (s.role !== 'secretary') renderFeed(activeFilter());
        else renderFeed('all', 'staff-carousel-inner-notifs');
        updateInboxBadge();
      }
      if (e.key === 'crechenow_notice_responses' && s.role === 'secretary') renderSent();
      if (e.key === 'crechenow_messages') {
        try { const old = new Set((JSON.parse(e.oldValue || '[]') || []).map(m => m.id));
          const mine = (JSON.parse(e.newValue || '[]') || []).filter(m => !old.has(m.id) && m.toPersonId === s.personId);
          if (mine.length) { showToast(`Nova mensagem de ${mine[0].fromName}.`); notifyLocal('CrecheNow — nova mensagem', `De ${mine[0].fromName}`); } } catch {}
        if (el('inboxModal')?.classList.contains('active')) renderInbox(activeTab()); updateInboxBadge(); }
      if (e.key === 'crechenow_routines') { if (s.role === 'parent') { const sel = el('childSelect'); renderRoutineForParent(sel?.value || (store.getPerson(s.personId)?.linkedStudentIds || [])[0]); } else if (s.role === 'teacher') renderTeacherDashboard(); }
      if (e.key === 'crechenow_people' && s.role === 'secretary') { renderStudentManagement(); renderTeachersList(); renderParentsList(); renderPermissionsList(); }
      if (e.key === 'crechenow_agenda') { renderAgenda(); renderCalendarPreview(); }
      if (e.key === 'crechenow_cardapio') { renderCardapio(); renderCalendarPreview(); }
      if (e.key === 'crechenow_school_calendar' || e.key === 'crechenow_events') { renderAgenda(); renderCardapio(); renderCalendarPreview(); }
    });
  };

  const initRole = s => {
    if (s.role === 'parent') {
      const p = store.getPerson(s.personId); const kids = (p?.linkedStudentIds || []).map(id => store.getPerson(id)).filter(Boolean);
      const sel = el('childSelect');
      const render = kidId => { renderRoutineForParent(kidId); renderAgenda(); };
      if (sel && kids.length) { sel.innerHTML = kids.map(k => `<option value="${k.id}">${esc(k.name)} — Turma ${esc(k.class)}</option>`).join(''); sel.addEventListener('change', () => render(sel.value)); render(sel.value); }
      else { const any = store.getStudents()[0]; if (any) render(any.id); }
      renderFeed(); renderCardapio(); renderCalendarPreview(); updateInboxBadge();
    } else if (s.role === 'teacher') {
      el('teacherClassDisplay').textContent = s.class || '';
      renderFeed(); renderTeacherDashboard(); renderTeacherAllergies(); renderAgenda(); renderCardapio(); renderCalendarPreview(); updateInboxBadge();
    } else {
      if (CrecheNowAuth.canManagePeople()) { renderStudentManagement(); renderTeachersList(); renderParentsList(); renderPermissionsList(); }
      else ['open-add-person', 'open-add-login', 'open-cardapio-editor', 'open-school-calendar'].forEach(a => { const b = document.querySelector(`[data-action="${a}"]`); if (b) b.style.display = 'none'; });
      renderSent(); renderFeed('all', 'staff-carousel-inner-notifs'); renderCalendarPreview(); updateInboxBadge();
    }
  };

  return { init: () => { document.addEventListener('click', handleClick); document.addEventListener('input', handleInput); document.addEventListener('change', handleChange); initRealTimeSync(); },
    initRole, startTutorialIfFirstRun, showToast, renderFeed, renderAgenda, renderCardapio, renderCalendarPreview, renderCalendarView };
})();
