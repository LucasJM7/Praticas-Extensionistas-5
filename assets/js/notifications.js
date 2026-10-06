const CrecheNowNotifications = (() => {
  const { utils, NOTICE_TYPES, RESPONSE_TYPES, WEEKDAYS, WEEKDAYS_LONG, RELATIONSHIPS } = CrecheNowConfig;
  const AVAILABLE_ICONS = ['🎵', '🤸', '📚', '🎭', '⚽', '🍎', '🎲', '🎂'];

  const openModal = (id) => document.getElementById(id)?.classList.add('active');
  const closeModal = (id) => document.getElementById(id)?.classList.remove('active');

  const initModalHandlers = () => {
    document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    });
  };

  const responseZoneHTML = (n, session) => {
    if (!n.responseType || session?.role !== 'parent') return '';
    const mine = CrecheNowStorage.getMyResponse(n.id, session.personId);
    if (n.responseType === 'Sim/Não') {
      return `
        <div class="response-zone mt-2">
          <small class="fw-bold">Responder:</small>
          <button class="btn btn-sm ms-2 ${mine?.value === 'sim' ? 'btn-success' : 'btn-outline-success'}" data-action="respond-yesno" data-notice="${n.id}" data-value="sim">Sim</button>
          <button class="btn btn-sm ms-1 ${mine?.value === 'nao' ? 'btn-danger' : 'btn-outline-danger'}" data-action="respond-yesno" data-notice="${n.id}" data-value="nao">Não</button>
          ${mine ? '<small class="text-muted ms-2">(resposta enviada)</small>' : ''}
        </div>`;
    }
    return `
      <div class="response-zone mt-2">
        <small class="fw-bold">Responder por escrito:</small>
        <textarea class="form-control form-control-sm mt-1" rows="2" data-role="response-text" placeholder="Sua resposta...">${utils.escapeHtml(mine?.value || '')}</textarea>
        <button class="btn btn-sm btn-success mt-1" data-action="respond-text" data-notice="${n.id}">Enviar resposta</button>
      </div>`;
  };

  const renderFeed = (filter = 'all') => {
    const container = document.getElementById('carousel-inner-notifs');
    if (!container) return;
    const session = CrecheNowStorage.getSession();

    let all = CrecheNowStorage.getNotifications();
    if (session?.role === 'parent') {
      const parent = CrecheNowStorage.getPerson(session.personId);
      const linked = (parent?.linkedStudentIds || []).map(id => CrecheNowStorage.getPerson(id)).filter(Boolean);
      const myClasses = [...new Set(linked.map(s => s.class).filter(Boolean))];
      if (myClasses.length) all = all.filter(n => !n.targetClass || n.targetClass === 'all' || myClasses.includes(n.targetClass));
    }
    const filtered = all.filter(n => filter === 'all' || n.type === filter);

    container.innerHTML = '';
    if (filtered.length === 0) {
      container.innerHTML = '<div class="carousel-item active"><div class="notify-card"><div class="text-center text-muted">Nenhum comunicado encontrado.</div></div></div>';
      _refreshCarouselInstance();
      return;
    }

    filtered.forEach((n, index) => {
      const el = document.createElement('div');
      el.className = `carousel-item ${index === 0 ? 'active' : ''}`;
      el.innerHTML = `
        <div class="notify-card ${n.read ? '' : 'unread'}" data-type="${utils.escapeHtml(n.type)}">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <h5 class="fw-bold mb-0">${utils.escapeHtml(n.title)}</h5>
            <span class="badge ${n.read ? 'bg-secondary' : 'bg-warning text-dark'}">${n.read ? 'Lido' : 'Novo'}</span>
          </div>
          <p class="text-muted mb-1 notify-body">${utils.escapeHtml(n.body)}</p>
          ${responseZoneHTML(n, session)}
          <div class="d-flex justify-content-between align-items-center mt-auto gap-2">
            <small class="text-muted">${utils.formatDateTimeBR(n.date)}</small>
            ${!n.read ? `<button class="btn btn-sm btn-outline-primary mark-read" data-id="${n.id}">Marcar como lido</button>` : ''}
          </div>
        </div>`;
      container.appendChild(el);
    });

    container.querySelectorAll('.mark-read').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        CrecheNowStorage.markAsRead(parseInt(btn.dataset.id));
        renderFeed(filter);
        updateInboxBadge();
      });
    });
    _refreshCarouselInstance();
  };

  const _refreshCarouselInstance = () => {
    const el = document.getElementById('notifications-carousel');
    if (!el || !window.bootstrap?.Carousel) return;
    bootstrap.Carousel.getInstance(el)?.dispose();
    new bootstrap.Carousel(el, { interval: 6000, ride: 'carousel' });
  };

  const handleResponseDelegation = (e) => {
    const btn = e.target.closest('[data-action="respond-yesno"], [data-action="respond-text"]');
    if (!btn) return;
    const session = CrecheNowStorage.getSession();
    const noticeId = parseInt(btn.dataset.notice);
    if (btn.dataset.action === 'respond-yesno') {
      CrecheNowStorage.addNoticeResponse({ noticeId, personId: session.personId, kind: 'yesno', value: btn.dataset.value });
    } else {
      const value = btn.closest('.response-zone').querySelector('[data-role="response-text"]').value.trim();
      if (!value) { showToast('Escreva sua resposta.', 'warning'); return; }
      CrecheNowStorage.addNoticeResponse({ noticeId, personId: session.personId, kind: 'text', value });
    }
    showToast('Resposta enviada.');
    const active = document.querySelector('[data-filter].active');
    renderFeed(active?.dataset.filter || 'all');
  };

  const renderAgenda = (containerId = 'agenda-list', cls = null) => {
    window.__cnAgendaClass = cls;
    const container = document.getElementById(containerId);
    if (!container) return;
    const week = utils.getWeekDates();
    const byDate = {};
    CrecheNowStorage.getAgendaForWeek(cls, week).forEach(a => { byDate[a.date] = a; });

    container.innerHTML = week.map(date => {
      const weekday = WEEKDAYS_LONG[utils.getWeekdayIndex(date)];
      const dateLabel = utils.formatDateBR(date);
      if (!CrecheNowStorage.isSchoolDay(date)) {
        return `<div class="agenda-card no-school"><div class="flex-grow-1">
          <strong class="d-block text-muted" style="font-size: 0.9rem;">Sem aula</strong>
          <small class="text-muted">${weekday} ${dateLabel}</small></div></div>`;
      }
      const item = byDate[date];
      if (!item || !item.title) {
        return `<div class="agenda-card empty"><div class="flex-grow-1">
          <strong class="d-block text-muted" style="font-size: 0.9rem;">(sem atividade)</strong>
          <small class="text-muted">${weekday} ${dateLabel}</small></div></div>`;
      }
      return `<div class="agenda-card">
        <div class="agenda-icon me-2 fs-4">${utils.escapeHtml(item.icon || '')}</div>
        <div class="flex-grow-1">
          <strong class="d-block text-primary" style="font-size: 0.9rem;">${utils.escapeHtml(item.title)}</strong>
          <small class="text-muted">${weekday} ${dateLabel} &bull; ${utils.escapeHtml(item.time || '')}</small>
        </div></div>`;
    }).join('');
  };

  const renderTeacherAgendaEditor = () => {
    const container = document.getElementById('agendaEditorContainer');
    const modal = document.getElementById('agendaEditorModal');
    if (!container || !modal) return;
    const session = CrecheNowStorage.getSession();
    const weekStart = modal.dataset.week || utils.toISODate(utils.getWeekStart());
    const week = utils.getWeekDates(weekStart);
    const byDate = {};
    CrecheNowStorage.getAgendaForWeek(session.class, week).forEach(a => { byDate[a.date] = a; });

    let html = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" data-action="agenda-week-prev">‹</button>
        <strong class="small">Semana de ${utils.formatDateBR(week[0])} a ${utils.formatDateBR(week[5])}</strong>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-action="agenda-week-next">›</button>
      </div>`;

    html += week.map((date, i) => {
      const weekday = WEEKDAYS[utils.getWeekdayIndex(date)];
      if (!CrecheNowStorage.isSchoolDay(date)) {
        return `<div class="editor-item disabled-row">
          <input type="date" class="form-control form-control-sm" value="${date}" disabled style="width: 140px;">
          <span class="small text-muted">Sem aula (${weekday})</span></div>`;
      }
      const item = byDate[date] || { icon: '📌', title: '', time: '08:00' };
      return `
        <div class="editor-item" data-date="${date}">
          <input type="date" class="form-control form-control-sm" value="${date}" disabled style="width: 140px;">
          <span class="fs-4 agenda-icon-btn" data-index="${i}" title="Clique no emoji para trocar">${utils.escapeHtml(item.icon || '📌')}</span>
          <input type="time" class="form-control form-control-sm" style="width: 110px;" value="${item.time || '08:00'}" data-field="time">
          <input type="text" class="form-control form-control-sm flex-grow-1" value="${utils.escapeHtml(item.title || '')}" placeholder="Atividade" data-field="title">
          <button type="button" class="btn btn-danger btn-sm btn-remove" data-action="remove-agenda" data-date="${date}">×</button>
        </div>
        <div class="icon-picker-container d-none" data-index="${i}">
          <div class="icon-picker">
            ${AVAILABLE_ICONS.map(icon => `<div class="icon-option ${item.icon === icon ? 'selected' : ''}" data-icon="${icon}" data-date="${date}">${icon}</div>`).join('')}
          </div>
        </div>`;
    }).join('');
    container.innerHTML = html;
  };

  const handleAgendaEditorDelegation = (e) => {
    const modal = document.getElementById('agendaEditorModal');
    const navPrev = e.target.closest('[data-action="agenda-week-prev"]');
    const navNext = e.target.closest('[data-action="agenda-week-next"]');
    if (navPrev || navNext) {
      const cur = utils.parseISO(modal.dataset.week || utils.toISODate(utils.getWeekStart()));
      cur.setDate(cur.getDate() + (navNext ? 7 : -7));
      modal.dataset.week = utils.toISODate(cur);
      renderTeacherAgendaEditor();
      return;
    }
    const btn = e.target.closest('[data-action], .agenda-icon-btn, .icon-option');
    if (!btn) return;
    if (btn.classList.contains('agenda-icon-btn')) {
      document.getElementById('agendaEditorContainer')
        .querySelector(`.icon-picker-container[data-index="${btn.dataset.index}"]`).classList.toggle('d-none');
      return;
    }
    if (btn.classList.contains('icon-option')) {
      const date = btn.dataset.date;
      const session = CrecheNowStorage.getSession();
      const all = CrecheNowStorage.getAgenda();
      const i = all.findIndex(a => a.date === date && a.class === session.class);
      if (i !== -1) all[i].icon = btn.dataset.icon;
      else all.push({ class: session.class, date, icon: btn.dataset.icon, title: '', time: '08:00' });
      CrecheNowStorage.setAgenda(all);
      renderTeacherAgendaEditor();
      renderAgenda('agenda-list', session.class);
      document.querySelectorAll('.icon-picker-container').forEach(p => p.classList.add('d-none'));
      return;
    }
    if (btn.dataset.action === 'remove-agenda') {
      const session = CrecheNowStorage.getSession();
      CrecheNowStorage.setAgenda(CrecheNowStorage.getAgenda().filter(a => !(a.date === btn.dataset.date && a.class === session.class)));
      renderTeacherAgendaEditor();
      renderAgenda('agenda-list', session.class);
      showToast('Atividade removida.');
    }
  };

  const saveTeacherAgendaFromEditor = () => {
    const modal = document.getElementById('agendaEditorModal');
    const session = CrecheNowStorage.getSession();
    const week = utils.getWeekDates(modal.dataset.week || utils.toISODate(utils.getWeekStart()));
    const rows = document.querySelectorAll('#agendaEditorContainer .editor-item[data-date]');
    const items = Array.from(rows).map(row => ({
      class: session.class,
      date: row.dataset.date,
      time: row.querySelector('[data-field="time"]').value,
      title: row.querySelector('[data-field="title"]').value.trim(),
      icon: row.querySelector('.agenda-icon-btn').textContent.trim()
    })).filter(a => a.title !== '');
    CrecheNowStorage.setAgendaWeek(session.class, week, items);
    renderAgenda('agenda-list', session.class);
    showToast('Agenda da semana salva.');
    closeModal('agendaEditorModal');
  };

  const renderCardapio = (containerId = 'cardapio-list') => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const byDate = {};
    CrecheNowStorage.getCardapio().forEach(c => { if (c.meal && c.meal.trim()) byDate[c.date] = c; });

    container.innerHTML = utils.getWeekDates().map(date => {
      const weekday = WEEKDAYS_LONG[utils.getWeekdayIndex(date)].slice(0, 3);
      const dateLabel = utils.formatDateBR(date);
      const head = `<div class="me-2" style="min-width: 90px; font-size: 0.85rem;">
        <div class="fw-bold ${CrecheNowStorage.isSchoolDay(date) ? 'text-success' : 'text-muted'}">${weekday}</div>
        <small class="text-muted">${dateLabel}</small></div>`;
      if (!CrecheNowStorage.isSchoolDay(date)) return `<div class="cardapio-item no-school">${head}<div class="small text-muted fst-italic">Sem aula</div></div>`;
      const item = byDate[date];
      if (!item) return `<div class="cardapio-item empty">${head}<div class="small text-muted fst-italic">(não definido)</div></div>`;
      return `<div class="cardapio-item">${head}<div class="small text-muted">${utils.escapeHtml(item.meal)}</div></div>`;
    }).join('');
  };

  const renderCardapioEditor = () => {
    const container = document.getElementById('cardapioEditorContainer');
    const modal = document.getElementById('cardapioEditorModal');
    if (!container || !modal) return;
    const view = modal.dataset.view || 'week';
    const ref = utils.parseISO(modal.dataset.ref || utils.toISODate(utils.getWeekStart()));
    const byDate = {};
    CrecheNowStorage.getCardapio().forEach(c => { byDate[c.date] = c; });

    let html = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" data-action="cd-prev">‹</button>
        <div class="btn-group btn-group-sm">
          <button type="button" class="btn ${view === 'week' ? 'btn-success' : 'btn-outline-success'}" data-action="cd-view-week">Semana</button>
          <button type="button" class="btn ${view === 'month' ? 'btn-success' : 'btn-outline-success'}" data-action="cd-view-month">Mês</button>
          <button type="button" class="btn ${view === 'year' ? 'btn-success' : 'btn-outline-success'}" data-action="cd-view-year">Ano</button>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-action="cd-next">›</button>
      </div>`;

    if (view === 'week') {
      const week = utils.getWeekDates(utils.mondayOf(ref));
      html += `<strong class="d-block small mb-2">Semana de ${utils.formatDateBR(week[0])} a ${utils.formatDateBR(week[5])}</strong>`;
      html += week.map(date => {
        const weekday = WEEKDAYS[utils.getWeekdayIndex(date)];
        if (!CrecheNowStorage.isSchoolDay(date)) {
          return `<div class="editor-item disabled-row">
            <input type="date" class="form-control form-control-sm" value="${date}" disabled style="width: 140px;">
            <span class="small text-muted">Sem aula (${weekday})</span></div>`;
        }
        return `<div class="editor-item" data-date="${date}">
          <input type="date" class="form-control form-control-sm" value="${date}" disabled style="width: 140px;">
          <input type="text" class="form-control form-control-sm flex-grow-1" value="${utils.escapeHtml(byDate[date]?.meal || '')}" placeholder="Refeição do dia" data-field="meal">
          <button type="button" class="btn btn-danger btn-sm btn-remove" data-action="remove-cardapio" data-date="${date}">×</button>
        </div>`;
      }).join('');
    } else if (view === 'month') {
      html += `<strong class="d-block small mb-2 text-capitalize">${ref.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</strong><div class="calendar-grid">`;
      html += utils.getMonthDates(ref.getFullYear(), ref.getMonth()).map(date => {
        const d = utils.parseISO(date);
        const on = CrecheNowStorage.isSchoolDay(date);
        return `<div class="calendar-cell ${on ? 'school-on' : 'school-off'}">
          <div class="cell-header"><small class="text-muted">${WEEKDAYS[d.getDay()]}</small><strong>${d.getDate()}</strong></div>
          ${on
            ? `<input type="text" class="form-control form-control-sm mt-1" data-field="meal" data-date="${date}" value="${utils.escapeHtml(byDate[date]?.meal || '')}" placeholder="Refeição">`
            : '<div class="cell-item no-school">Sem aula</div>'}
        </div>`;
      }).join('');
      html += '</div>';
    } else {
      html += `<strong class="d-block small mb-2">${ref.getFullYear()}</strong><div class="row g-2">`;
      for (let m = 0; m < 12; m++) {
        const dates = utils.getMonthDates(ref.getFullYear(), m);
        const entries = dates.map(d => byDate[d]).filter(c => c && c.meal);
        html += `<div class="col-md-4"><div class="border rounded p-2 h-100">
          <div class="d-flex justify-content-between align-items-center">
            <strong class="small text-capitalize">${new Date(ref.getFullYear(), m, 1).toLocaleString('pt-BR', { month: 'long' })}</strong>
            <button type="button" class="btn btn-sm btn-outline-success" data-action="cd-edit-month" data-month="${m}">Editar</button>
          </div>
          <div class="small text-muted mt-1">${entries.length ? entries.slice(0, 4).map(c => `<div>${utils.formatDateBR(c.date)}: ${utils.escapeHtml(c.meal)}</div>`).join('') + (entries.length > 4 ? `<div>… +${entries.length - 4}</div>` : '') : 'Nada definido.'}</div>
        </div></div>`;
      }
      html += '</div>';
    }
    container.innerHTML = html;
  };

  const handleCardapioEditorDelegation = (e) => {
    const modal = document.getElementById('cardapioEditorModal');
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const view = modal.dataset.view || 'week';
    const ref = utils.parseISO(modal.dataset.ref || utils.toISODate(utils.getWeekStart()));

    if (btn.dataset.action === 'cd-view-week') { modal.dataset.view = 'week'; modal.dataset.ref = utils.toISODate(utils.getWeekStart()); renderCardapioEditor(); return; }
    if (btn.dataset.action === 'cd-view-month') { modal.dataset.view = 'month'; renderCardapioEditor(); return; }
    if (btn.dataset.action === 'cd-view-year') { modal.dataset.view = 'year'; renderCardapioEditor(); return; }
    if (btn.dataset.action === 'cd-edit-month') { modal.dataset.view = 'month'; modal.dataset.ref = utils.toISODate(new Date(ref.getFullYear(), parseInt(btn.dataset.month), 1)); renderCardapioEditor(); return; }
    if (btn.dataset.action === 'cd-prev' || btn.dataset.action === 'cd-next') {
      const dir = btn.dataset.action === 'cd-next' ? 1 : -1;
      if (view === 'week') ref.setDate(ref.getDate() + 7 * dir);
      else if (view === 'month') ref.setMonth(ref.getMonth() + dir);
      else ref.setFullYear(ref.getFullYear() + dir);
      modal.dataset.ref = utils.toISODate(ref);
      renderCardapioEditor();
      return;
    }
    if (btn.dataset.action === 'remove-cardapio') {
      CrecheNowStorage.setCardapio(CrecheNowStorage.getCardapio().filter(c => c.date !== btn.dataset.date));
      renderCardapioEditor();
      renderCardapio();
      showToast('Refeição removida.');
    }
  };

  const saveCardapioFromEditor = () => {
    const modal = document.getElementById('cardapioEditorModal');
    const view = modal.dataset.view || 'week';
    if (view === 'year') { showToast('Use a visão Semana ou Mês para salvar.', 'warning'); return; }
    const entries = Array.from(document.querySelectorAll('#cardapioEditorContainer [data-field="meal"][data-date]'))
      .map(inp => ({ date: inp.dataset.date, meal: inp.value.trim() }));
    const dates = new Set(entries.map(e => e.date));
    const rest = CrecheNowStorage.getCardapio().filter(c => !dates.has(c.date));
    CrecheNowStorage.setCardapio([...rest, ...entries.filter(e => e.meal)]);
    renderCardapio();
    showToast('Cardápio atualizado.');
    closeModal('cardapioEditorModal');
  };

  const renderSchoolCalendarEditor = () => {
    const body = document.getElementById('schoolCalendarBody');
    const modal = document.getElementById('schoolCalendarModal');
    if (!body || !modal) return;
    const view = modal.dataset.view || 'week';
    const ref = utils.parseISO(modal.dataset.ref || utils.todayISO());
    const cal = CrecheNowStorage.getSchoolCalendar();

    let html = `
      <div class="mb-2">
        <small class="fw-bold">Dias padrão da semana:</small>
        <div class="d-flex flex-wrap gap-2 mt-1">
          ${WEEKDAYS_LONG.map((label, idx) => `
            <div class="form-check form-check-inline">
              <input class="form-check-input school-day-check" type="checkbox" value="${idx}" id="sc-day-${idx}" ${cal.schoolDays.includes(idx) ? 'checked' : ''}>
              <label class="form-check-label small" for="sc-day-${idx}">${WEEKDAYS[idx]}</label>
            </div>`).join('')}
        </div>
        <small class="text-muted">Clique nas datas abaixo para criar exceções (feriados, recessos, reposições).</small>
      </div>
      <div class="d-flex justify-content-between align-items-center mb-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" data-action="sc-prev">‹</button>
        <div class="btn-group btn-group-sm">
          <button type="button" class="btn ${view === 'week' ? 'btn-success' : 'btn-outline-success'}" data-action="sc-view-week">Semana</button>
          <button type="button" class="btn ${view === 'month' ? 'btn-success' : 'btn-outline-success'}" data-action="sc-view-month">Mês</button>
          <button type="button" class="btn ${view === 'year' ? 'btn-success' : 'btn-outline-success'}" data-action="sc-view-year">Ano</button>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-action="sc-next">›</button>
      </div>`;

    if (view === 'week') {
      const week = utils.getWeekDates(utils.mondayOf(ref));
      html += `<strong class="d-block small mb-2">Semana de ${utils.formatDateBR(week[0])} a ${utils.formatDateBR(week[5])}</strong>`;
      html += week.map(date => {
        const on = CrecheNowStorage.isSchoolDay(date);
        return `<div class="editor-item justify-content-between">
          <span class="small">${WEEKDAYS_LONG[utils.getWeekdayIndex(date)]} — ${utils.formatDateBR(date)}</span>
          <span>
            <span class="badge ${on ? 'bg-success' : 'bg-secondary'} me-2">${on ? 'Com aula' : 'Sem aula'}</span>
            <button type="button" class="btn btn-sm ${on ? 'btn-outline-secondary' : 'btn-outline-success'}" data-action="toggle-school-day" data-date="${date}">${on ? 'Marcar sem aula' : 'Marcar com aula'}</button>
          </span></div>`;
      }).join('');
    } else if (view === 'month') {
      html += `<strong class="d-block small mb-2 text-capitalize">${ref.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</strong><div class="calendar-grid">`;
      html += utils.getMonthDates(ref.getFullYear(), ref.getMonth()).map(date => {
        const d = utils.parseISO(date);
        const on = CrecheNowStorage.isSchoolDay(date);
        return `<div class="calendar-cell ${on ? 'school-on' : 'school-off'}" style="cursor:pointer;" data-action="toggle-school-day" data-date="${date}" title="Clique para alternar">
          <div class="cell-header"><small class="text-muted">${WEEKDAYS[d.getDay()]}</small><strong>${d.getDate()}</strong></div>
          <div class="cell-item ${on ? 'agenda' : 'no-school'}">${on ? 'Com aula' : 'Sem aula'}</div></div>`;
      }).join('');
      html += '</div>';
    } else {
      html += `<strong class="d-block small mb-2">${ref.getFullYear()}</strong><div class="row g-2">`;
      for (let m = 0; m < 12; m++) {
        html += `<div class="col-md-4"><div class="border rounded p-2">
          <strong class="small text-capitalize">${new Date(ref.getFullYear(), m, 1).toLocaleString('pt-BR', { month: 'long' })}</strong>
          <div class="year-mini mt-1">`;
        utils.getMonthDates(ref.getFullYear(), m).forEach(date => {
          const d = utils.parseISO(date);
          const on = CrecheNowStorage.isSchoolDay(date);
          html += `<div class="mini-cell ${on ? 'on' : 'off'}" data-action="toggle-school-day" data-date="${date}" title="${utils.formatDateBR(date)}">${d.getDate()}</div>`;
        });
        html += '</div></div></div>';
      }
      html += '</div>';
    }
    body.innerHTML = html;
  };

  const handleSchoolCalendarDelegation = (e) => {
    const modal = document.getElementById('schoolCalendarModal');
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const view = modal.dataset.view || 'week';
    const ref = utils.parseISO(modal.dataset.ref || utils.todayISO());

    if (btn.dataset.action === 'sc-view-week') { modal.dataset.view = 'week'; renderSchoolCalendarEditor(); return; }
    if (btn.dataset.action === 'sc-view-month') { modal.dataset.view = 'month'; renderSchoolCalendarEditor(); return; }
    if (btn.dataset.action === 'sc-view-year') { modal.dataset.view = 'year'; renderSchoolCalendarEditor(); return; }
    if (btn.dataset.action === 'sc-prev' || btn.dataset.action === 'sc-next') {
      const dir = btn.dataset.action === 'sc-next' ? 1 : -1;
      if (view === 'week') ref.setDate(ref.getDate() + 7 * dir);
      else if (view === 'month') ref.setMonth(ref.getMonth() + dir);
      else ref.setFullYear(ref.getFullYear() + dir);
      modal.dataset.ref = utils.toISODate(ref);
      renderSchoolCalendarEditor();
      return;
    }
    if (btn.dataset.action === 'toggle-school-day') {
      const date = btn.dataset.date;
      CrecheNowStorage.setSchoolCalendarOverride(date, !CrecheNowStorage.isSchoolDay(date));
      renderSchoolCalendarEditor();
      renderAgenda('agenda-list', window.__cnAgendaClass ?? null);
      renderCardapio();
    }
  };

  const handleSchoolCalendarChange = (e) => {
    if (!e.target.classList.contains('school-day-check')) return;
    const cal = CrecheNowStorage.getSchoolCalendar();
    cal.schoolDays = Array.from(document.querySelectorAll('.school-day-check:checked')).map(cb => parseInt(cb.value));
    CrecheNowStorage.setSchoolCalendar(cal);
    renderAgenda('agenda-list', window.__cnAgendaClass ?? null);
    renderCardapio();
    showToast('Dias padrão atualizados.');
  };

  const renderCalendarView = (mode = 'month') => {
    const container = document.getElementById('calendarViewBody');
    if (!container) return;
    const agendaByDate = {};
    CrecheNowStorage.getAgenda().forEach(a => { (agendaByDate[a.date] = agendaByDate[a.date] || []).push(a); });
    const cardapioByDate = {};
    CrecheNowStorage.getCardapio().forEach(c => { (cardapioByDate[c.date] = cardapioByDate[c.date] || []).push(c); });

    const ref = utils.parseISO(container.dataset.ref || utils.todayISO());
    let dates = [];
    if (mode === 'month') dates = utils.getMonthDates(ref.getFullYear(), ref.getMonth());
    else for (let m = 0; m < 12; m++) dates.push(...utils.getMonthDates(ref.getFullYear(), m));

    container.innerHTML = dates.map(d => {
      const dateObj = utils.parseISO(d);
      const hasSchool = CrecheNowStorage.isSchoolDay(d);
      const ag = agendaByDate[d] || [];
      const ca = (cardapioByDate[d] || []).filter(c => c.meal);
      return `<div class="calendar-cell ${!hasSchool ? 'no-school' : (ag.length || ca.length ? 'has-content' : '')}">
        <div class="cell-header"><small class="text-muted">${WEEKDAYS[dateObj.getDay()]}</small><strong>${dateObj.getDate()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}</strong></div>
        <div class="cell-body">
          ${!hasSchool ? '<div class="cell-item no-school">Sem aula</div>' : ''}
          ${ag.map(a => `<div class="cell-item agenda">${utils.escapeHtml(a.icon || '')} ${utils.escapeHtml(a.time)} ${utils.escapeHtml(a.title)} <em>(${utils.escapeHtml(a.class || '')})</em></div>`).join('')}
          ${ca.map(c => `<div class="cell-item cardapio">${utils.escapeHtml(c.meal)}</div>`).join('')}
        </div></div>`;
    }).join('');

    const header = document.getElementById('calendarViewHeader');
    if (header) {
      const label = mode === 'month' ? ref.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) : String(ref.getFullYear());
      header.innerHTML = `
        <button class="btn btn-sm btn-outline-primary" data-action="cal-prev">‹</button>
        <strong class="text-capitalize">${label}</strong>
        <button class="btn btn-sm btn-outline-primary" data-action="cal-next">›</button>`;
    }
  };

  const handleCalendarDelegation = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const body = document.getElementById('calendarViewBody');
    const mode = body.dataset.mode || 'month';
    const ref = utils.parseISO(body.dataset.ref || utils.todayISO());
    if (btn.dataset.action === 'cal-prev') mode === 'month' ? ref.setMonth(ref.getMonth() - 1) : ref.setFullYear(ref.getFullYear() - 1);
    if (btn.dataset.action === 'cal-next') mode === 'month' ? ref.setMonth(ref.getMonth() + 1) : ref.setFullYear(ref.getFullYear() + 1);
    body.dataset.ref = utils.toISODate(ref);
    renderCalendarView(mode);
  };

  const renderRoutineForParent = (studentId) => {
    const todayContainer = document.getElementById('routine-today');
    const historyContainer = document.getElementById('routine-history');
    if (!todayContainer) return;
    const routines = CrecheNowStorage.getRoutinesByStudent(studentId);
    const todayISO = utils.todayISO();
    const todayRoutine = routines.find(r => r.date.startsWith(todayISO));

    if (!todayRoutine) {
      todayContainer.innerHTML = '<p class="text-muted text-center mt-4">Nenhum registro de rotina para hoje ainda.</p>';
      todayContainer.onclick = null;
      if (historyContainer) historyContainer.innerHTML = '';
      return;
    }
    if (todayRoutine.attendance === false) {
      todayContainer.innerHTML = '<div class="absent-message"><div><div style="font-size: 2.5rem;">😷</div><div class="mt-2">A criança não foi hoje</div></div></div>';
      todayContainer.onclick = null;
      if (historyContainer) historyContainer.innerHTML = '';
      return;
    }
    const q = todayRoutine.questions || {};
    const statusIcon = (val) => val === 'sim' ? '<span class="text-success fw-bold">Sim</span>' : '<span class="text-danger fw-bold">Não</span>';

    todayContainer.innerHTML = `
      <div class="routine-grid">
        <div class="routine-item">Comportamento: ${statusIcon(q.behaved)}</div>
        <div class="routine-item">Atenção: ${statusIcon(q.attention)}</div>
        <div class="routine-item">Deveres: ${statusIcon(q.homework)}</div>
        <div class="routine-item">Colegas: ${statusIcon(q.peers)}</div>
        <div class="routine-item" style="grid-column: 1 / -1;">Alimentação: ${statusIcon(q.food)}</div>
      </div>
      ${todayRoutine.comment ? '<div class="click-hint">Clique para ver detalhes</div>' : ''}`;

    todayContainer.onclick = () => {
      document.getElementById('routineModalContent').innerHTML = `
        <button class="modal-close" data-close="routineModal">×</button>
        <h4 class="mb-3">Rotina Completa de Hoje</h4>
        <div class="routine-grid mb-3">
          <div class="routine-item">Comportamento: ${statusIcon(q.behaved)}</div>
          <div class="routine-item">Atenção: ${statusIcon(q.attention)}</div>
          <div class="routine-item">Deveres: ${statusIcon(q.homework)}</div>
          <div class="routine-item">Colegas: ${statusIcon(q.peers)}</div>
          <div class="routine-item" style="grid-column: 1 / -1;">Alimentação: ${statusIcon(q.food)}</div>
        </div>
        ${todayRoutine.comment ? `<div class="routine-comment"><strong>Comentário do professor:</strong><br>"${utils.escapeHtml(todayRoutine.comment)}"</div>` : '<p class="text-muted fst-italic">Sem comentários adicionais.</p>'}
        <div class="text-end mt-3"><small class="text-muted">Registrado em ${utils.formatDateTimeBR(todayRoutine.date)}</small></div>`;
      openModal('routineModal');
    };
    todayContainer.style.cursor = todayRoutine.comment ? 'pointer' : 'default';

    if (historyContainer) {
      const history = routines.filter(r => !r.date.startsWith(todayISO)).slice(0, 10);
      historyContainer.innerHTML = history.length
        ? '<h6 class="small fw-bold mb-2">Dias Anteriores:</h6>' + history.map(r => `
            <div class="border-bottom pb-2 mb-2 small">
              <div class="fw-bold text-muted">${utils.formatDateBR(r.date)} ${r.attendance === false ? '<span class="text-danger">(Faltou)</span>' : ''}</div>
              <div>${utils.escapeHtml(r.comment || 'Sem comentários.')}</div>
            </div>`).join('')
        : '<p class="text-muted small mb-0">Sem histórico anterior.</p>';
    }
  };

  const renderTeacherDashboard = () => {
    const session = CrecheNowStorage.getSession();
    if (!session || session.role !== 'teacher') return;
    const students = CrecheNowStorage.getStudents().filter(s => s.class === session.class);
    const optionsHtml = '<option value="">Escolha um aluno...</option>' + students.map(s => `<option value="${s.id}">${utils.escapeHtml(s.name)}</option>`).join('');
    const select = document.getElementById('routineStudentSelect');
    if (select) select.innerHTML = optionsHtml;

    const studentsList = document.getElementById('teacher-students-list');
    if (studentsList) {
      const today = utils.todayISO();
      studentsList.innerHTML = students.map(s => {
        const r = CrecheNowStorage.getRoutines().find(x => x.studentId === s.id && x.date.startsWith(today));
        const status = !r ? '<span class="text-muted small">—</span>' : r.attendance === true ? '<span class="text-success">Presente</span>' : '<span class="text-danger">Falta</span>';
        return `<tr data-action="open-student-view" data-id="${s.id}" style="cursor:pointer;"><td class="small">${utils.escapeHtml(s.name)}</td><td>${status}</td></tr>`;
      }).join('');
    }

    const historyDiv = document.getElementById('teacher-routine-history');
    if (historyDiv) {
      const all = CrecheNowStorage.getRoutines().filter(r => r.teacherPersonId === session.personId)
        .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
      historyDiv.innerHTML = all.length ? all.map(r => {
        const student = CrecheNowStorage.getPerson(r.studentId);
        return `<div class="p-3 border-bottom">
          <div class="d-flex justify-content-between"><strong class="small">${student ? utils.escapeHtml(student.name) : 'Aluno removido'}</strong><small class="text-muted">${utils.formatDateBR(r.date)}</small></div>
          <small class="text-muted">${r.attendance === true ? 'Presente' : 'Falta'}</small>
          ${r.comment ? `<p class="small mb-0 mt-1 text-muted">"${utils.escapeHtml(r.comment)}"</p>` : ''}</div>`;
      }).join('') : '<p class="text-center text-muted p-3 small">Nenhum registro ainda.</p>';
    }
  };

  const renderTeacherAllergies = () => {
    const container = document.getElementById('teacher-allergy-list');
    if (!container) return;
    const session = CrecheNowStorage.getSession();
    const list = CrecheNowStorage.getStudents().filter(s => s.class === session.class && s.allergies && s.allergies.trim());
    container.innerHTML = list.length
      ? list.map(s => `<div class="allergy-alert"><strong>${utils.escapeHtml(s.name)}:</strong> ${utils.escapeHtml(s.allergies)}</div>`).join('')
      : '<small class="text-muted">Nenhum aluno com alergias nesta turma.</small>';
  };

  const openStudentView = (id) => {
    const s = CrecheNowStorage.getPerson(id);
    if (!s) return;
    document.getElementById('studentViewBody').innerHTML = `
      <dl class="row small mb-2">
        <dt class="col-5">Nome</dt><dd class="col-7">${utils.escapeHtml(s.name)}</dd>
        <dt class="col-5">Nascimento</dt><dd class="col-7">${utils.formatDateBR(s.birthDate)}</dd>
        <dt class="col-5">Turma</dt><dd class="col-7">${utils.escapeHtml(s.class)}</dd>
        <dt class="col-5">Alergias</dt><dd class="col-7">${utils.escapeHtml(s.allergies || 'Nenhuma registrada')}</dd>
      </dl>
      <h6 class="small fw-bold">Responsáveis</h6>
      ${(s.guardians || []).filter(g => g.name || g.linkedPersonId).map(g => `
        <div class="border rounded p-2 mb-2 small">
          <strong>${utils.escapeHtml(g.relation)}:</strong> ${utils.escapeHtml(g.name || '—')}<br>
          <small class="text-muted">${utils.escapeHtml(g.phone || 'sem telefone')} &bull; ${utils.escapeHtml(g.email || 'sem e-mail')}</small>
        </div>`).join('') || '<small class="text-muted">Nenhum responsável cadastrado.</small>'}`;
    openModal('studentViewModal');
  };

  const guardianSlotHTML = (slot, i) => `
    <div class="border rounded p-2 mb-3" data-slot-block="${i}" data-linked="${slot.linkedPersonId || ''}">
      <div class="row g-2">
        <div class="col-4">
          <label class="form-label small fw-bold">Parentesco</label>
          <select class="form-select form-select-sm" data-gfield="relation">
            ${RELATIONSHIPS.map(r => `<option ${slot.relation === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="col-8">
          <label class="form-label small fw-bold">Nome</label>
          <input type="text" class="form-control form-control-sm" data-gfield="name" value="${utils.escapeHtml(slot.name || '')}">
        </div>
        <div class="col-6">
          <label class="form-label small fw-bold">Telefone</label>
          <input type="text" class="form-control form-control-sm" data-gfield="phone" value="${utils.escapeHtml(slot.phone || '')}">
        </div>
        <div class="col-6">
          <label class="form-label small fw-bold">E-mail</label>
          <input type="email" class="form-control form-control-sm" data-gfield="email" value="${utils.escapeHtml(slot.email || '')}">
        </div>
      </div>
      <div class="mt-2" data-role="linked-badge"></div>
      <div class="mt-1" data-role="suggest"></div>
    </div>`;

  const readGuardianSlots = (root) => Array.from(root.querySelectorAll('[data-slot-block]')).map(block => ({
    relation: block.querySelector('[data-gfield="relation"]').value,
    name: block.querySelector('[data-gfield="name"]').value.trim(),
    phone: block.querySelector('[data-gfield="phone"]').value.trim(),
    email: block.querySelector('[data-gfield="email"]').value.trim(),
    linkedPersonId: block.dataset.linked || null
  }));

  const refreshSlotBadges = (root) => {
    root.querySelectorAll('[data-slot-block]').forEach(block => {
      const linked = block.dataset.linked;
      const badge = block.querySelector('[data-role="linked-badge"]');
      if (linked) {
        const p = CrecheNowStorage.getPerson(linked);
        badge.innerHTML = `<span class="badge bg-success">Vinculado: ${utils.escapeHtml(p?.name || '?')}</span>
          <button type="button" class="btn btn-sm btn-outline-danger ms-1" data-action="unlink-guard" data-slot="${block.dataset.slotBlock}">Desvincular</button>`;
      } else {
        badge.innerHTML = '<small class="text-muted">Não vinculado a uma conta de responsável.</small>';
      }
    });
  };

  const parentMatches = (q, excludeIds) => {
    const query = q.trim().toLowerCase();
    if (query.length < 3) return [];
    return CrecheNowStorage.getParents().filter(p =>
      !excludeIds.includes(p.id) &&
      (p.name.toLowerCase().includes(query) || (p.email || '').toLowerCase().includes(query)));
  };

  const openStudentDetail = (id) => {
    const s = CrecheNowStorage.getPerson(id);
    if (!s) return;
    const slots = s.guardians && s.guardians.length ? s.guardians : [
      { relation: 'Pai', name: '', phone: '', email: '', linkedPersonId: null },
      { relation: 'Mãe', name: '', phone: '', email: '', linkedPersonId: null }
    ];
    while (slots.length < 2) slots.push({ relation: 'Mãe', name: '', phone: '', email: '', linkedPersonId: null });

    document.getElementById('studentDetailBody').innerHTML = `
      <input type="hidden" id="sd-id" value="${s.id}">
      <div class="mb-3"><label class="form-label small fw-bold">Nome Completo</label>
        <input type="text" class="form-control" id="sd-name" value="${utils.escapeHtml(s.name)}"></div>
      <div class="row">
        <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Data de Nascimento</label>
          <input type="date" class="form-control" id="sd-birth" value="${s.birthDate || ''}"></div>
        <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Turma</label>
          <select class="form-select" id="sd-class"><option value="A" ${s.class === 'A' ? 'selected' : ''}>A</option><option value="B" ${s.class === 'B' ? 'selected' : ''}>B</option></select></div>
      </div>
      <div class="mb-3"><label class="form-label small fw-bold">Alergias / Observações de Saúde</label>
        <textarea class="form-control" id="sd-allergies" rows="2">${utils.escapeHtml(s.allergies || '')}</textarea></div>
      <h6 class="small fw-bold">Responsáveis (2 contatos)</h6>
      <small class="text-muted d-block mb-2">Digite nome ou e-mail de um responsável já cadastrado para vinculá-lo (com confirmação).</small>
      ${slots.map((slot, i) => guardianSlotHTML(slot, i)).join('')}
      <div class="d-flex gap-2">
        <button class="btn btn-success flex-fill" data-action="save-student">Salvar</button>
        <button class="btn btn-outline-danger" data-action="delete-student">Excluir</button>
      </div>`;
    refreshSlotBadges(document.getElementById('studentDetailBody'));
    openModal('studentDetailModal');
  };

  const handleStudentDetailInput = (e) => {
    const target = e.target.closest('[data-gfield="name"], [data-gfield="email"]');
    if (!target) return;
    const block = target.closest('[data-slot-block]');
    const suggest = block.querySelector('[data-role="suggest"]');
    const root = document.getElementById('studentDetailBody');
    const exclude = Array.from(root.querySelectorAll('[data-slot-block]')).map(b => b.dataset.linked).filter(Boolean);
    const matches = parentMatches(target.value, exclude);
    suggest.innerHTML = matches.length
      ? matches.map(p => `<div class="suggest-chip">Encontrado: <strong>${utils.escapeHtml(p.name)}</strong> (${utils.escapeHtml(p.email || 'sem email')})
          <button type="button" class="btn btn-sm btn-success ms-1" data-action="link-guard" data-slot="${block.dataset.slotBlock}" data-person="${p.id}">Vincular</button></div>`).join('')
      : '';
  };

  const syncParentLinks = (studentId, parentIds) => {
    CrecheNowStorage.getParents().forEach(p => {
      const linked = p.linkedStudentIds || [];
      const should = parentIds.includes(p.id);
      const has = linked.includes(studentId);
      if (should && !has) CrecheNowStorage.updatePerson(p.id, { linkedStudentIds: [...linked, studentId] });
      else if (!should && has) CrecheNowStorage.updatePerson(p.id, { linkedStudentIds: linked.filter(x => x !== studentId) });
    });
  };

  const handleStudentDetailDelegation = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const root = document.getElementById('studentDetailBody');
    const id = document.getElementById('sd-id').value;

    if (btn.dataset.action === 'link-guard') {
      const person = CrecheNowStorage.getPerson(btn.dataset.person);
      if (!confirm(`Confirma que "${person.name}" (${person.email || 'sem email'}) é o responsável deste aluno?`)) return;
      const slots = readGuardianSlots(root);
      const slot = slots[parseInt(btn.dataset.slot)];
      slot.linkedPersonId = person.id;
      if (!slot.name) slot.name = person.name;
      if (!slot.phone) slot.phone = person.phone || '';
      if (!slot.email) slot.email = person.email || '';
      const parentIds = slots.map(s => s.linkedPersonId).filter(Boolean);
      CrecheNowStorage.updatePerson(id, { guardians: slots, parentIds });
      syncParentLinks(id, parentIds);
      showToast('Responsável vinculado.');
      openStudentDetail(id);
      return;
    }
    if (btn.dataset.action === 'unlink-guard') {
      const slots = readGuardianSlots(root);
      slots[parseInt(btn.dataset.slot)].linkedPersonId = null;
      const parentIds = slots.map(s => s.linkedPersonId).filter(Boolean);
      CrecheNowStorage.updatePerson(id, { guardians: slots, parentIds });
      syncParentLinks(id, parentIds);
      showToast('Vínculo removido.');
      openStudentDetail(id);
      return;
    }
    if (btn.dataset.action === 'save-student') {
      const slots = readGuardianSlots(root);
      const parentIds = slots.map(s => s.linkedPersonId).filter(Boolean);
      CrecheNowStorage.updatePerson(id, {
        name: document.getElementById('sd-name').value.trim(),
        birthDate: document.getElementById('sd-birth').value,
        class: document.getElementById('sd-class').value,
        allergies: document.getElementById('sd-allergies').value.trim(),
        guardians: slots,
        parentIds
      });
      syncParentLinks(id, parentIds);
      renderStudentManagement();
      showToast('Aluno atualizado.');
      closeModal('studentDetailModal');
      return;
    }
    if (btn.dataset.action === 'delete-student' && confirm('Remover este aluno do sistema?')) {
      CrecheNowStorage.removePerson(id);
      renderStudentManagement();
      showToast('Aluno removido.');
      closeModal('studentDetailModal');
    }
  };

  const renderStudentManagement = () => {
    const tbody = document.getElementById('students-list');
    if (!tbody) return;
    const students = CrecheNowStorage.getStudents();
    tbody.innerHTML = students.length ? students.map(s => `
      <tr data-action="open-student" data-id="${s.id}" style="cursor: pointer;">
        <td class="small">${utils.escapeHtml(s.name)}</td>
        <td><span class="badge bg-info text-dark">Turma ${utils.escapeHtml(s.class)}</span></td>
      </tr>`).join('')
      : '<tr><td colspan="2" class="text-center text-muted py-3">Nenhum aluno cadastrado.</td></tr>';
  };

  const renderTeachersList = () => {
    const tbody = document.getElementById('teachers-list');
    if (!tbody) return;
    const list = CrecheNowStorage.getTeachers();
    tbody.innerHTML = list.length ? list.map(t => `
      <tr data-action="open-person" data-id="${t.id}" style="cursor:pointer;">
        <td class="small">${utils.escapeHtml(t.name)}</td>
        <td><span class="badge bg-warning text-dark">Turma ${utils.escapeHtml(t.class)}</span></td>
      </tr>`).join('')
      : '<tr><td colspan="2" class="text-center text-muted py-3 small">Nenhum professor.</td></tr>';
  };

  const renderParentsList = () => {
    const tbody = document.getElementById('parents-list');
    if (!tbody) return;
    const list = CrecheNowStorage.getParents();
    tbody.innerHTML = list.length ? list.map(p => {
      const kids = (p.linkedStudentIds || []).map(id => CrecheNowStorage.getPerson(id)?.name).filter(Boolean);
      return `<tr data-action="open-person" data-id="${p.id}" style="cursor:pointer;">
        <td class="small">${utils.escapeHtml(p.name)}</td>
        <td class="small">${utils.escapeHtml(kids.join(', ') || '—')}</td></tr>`;
    }).join('')
      : '<tr><td colspan="2" class="text-center text-muted py-3 small">Nenhum responsável.</td></tr>';
  };

  const renderLoginsList = () => {
    const tbody = document.getElementById('logins-list');
    if (!tbody) return;
    tbody.innerHTML = CrecheNowStorage.getLogins().map(l => {
      const p = CrecheNowStorage.getPerson(l.personId);
      return `<tr>
        <td class="small">${utils.escapeHtml(l.email)}</td>
        <td><span class="badge bg-secondary">${utils.escapeHtml(l.role)}${l.isJunior ? ' (júnior)' : ''}</span></td>
        <td class="small">${p ? utils.escapeHtml(p.name) : '(removido)'}</td>
        <td><button class="btn btn-sm btn-outline-danger" data-action="delete-login" data-id="${l.personId}">×</button></td></tr>`;
    }).join('') || '<tr><td colspan="4" class="text-center text-muted py-3">Nenhum login.</td></tr>';
  };

  const handleDeleteLogin = (e) => {
    const btn = e.target.closest('[data-action="delete-login"]');
    if (!btn) return;
    if (confirm('Remover este login?')) {
      CrecheNowStorage.removeLogin(btn.dataset.id);
      renderLoginsList();
      showToast('Login removido.');
    }
  };

  const renderPersonCreateForm = (type) => {
    const container = document.getElementById('personCreateBody');
    if (!container) return;
    let html = `<input type="hidden" id="pc-type" value="${type}">`;
    html += `<div class="mb-3"><label class="form-label small fw-bold">Nome Completo</label><input type="text" class="form-control" id="pc-name"></div>`;
    html += `<div class="row"><div class="col-md-6 mb-3"><label class="form-label small fw-bold">Nascimento</label><input type="date" class="form-control" id="pc-birth"></div>
      <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Telefone</label><input type="text" class="form-control" id="pc-phone"></div></div>`;
    html += `<div class="mb-3"><label class="form-label small fw-bold">E-mail</label><input type="email" class="form-control" id="pc-email"></div>`;

    if (type === 'student') {
      html += `<div class="row"><div class="col-md-6 mb-3"><label class="form-label small fw-bold">Turma</label>
        <select class="form-select" id="pc-class"><option value="A">A</option><option value="B">B</option></select></div>
        <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Alergias</label><input type="text" class="form-control" id="pc-allergies"></div></div>`;
      html += `<h6 class="small fw-bold">Responsável principal (opcional)</h6>` + guardianSlotHTML({ relation: 'Pai', name: '', phone: '', email: '', linkedPersonId: null }, 0);
    } else if (type === 'parent') {
      html += `<div class="mb-3"><label class="form-label small fw-bold">Vincular a uma criança (opcional)</label>
        <input type="text" class="form-control" id="pc-child-query" placeholder="Digite o nome da criança...">
        <input type="hidden" id="pc-child-id" value="">
        <div id="pc-child-suggest" class="mt-1"></div></div>`;
    } else if (type === 'teacher') {
      html += `<div class="mb-3"><label class="form-label small fw-bold">Turma que leciona</label>
        <select class="form-select" id="pc-class"><option value="A">A</option><option value="B">B</option></select></div>`;
    } else if (type === 'secretary') {
      html += `<div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="pc-junior">
        <label class="form-check-label small" for="pc-junior">Secretaria Júnior (sem permissão para cadastros/logins)</label></div>`;
    }
    html += `<button type="button" class="btn btn-success w-100" data-action="create-person">Cadastrar</button>`;
    container.innerHTML = html;
    if (type === 'student') refreshSlotBadges(container);
  };

  const handlePersonCreateInput = (e) => {
    const slotTarget = e.target.closest('[data-gfield="name"], [data-gfield="email"]');
    if (slotTarget) {
      const block = slotTarget.closest('[data-slot-block]');
      const suggest = block.querySelector('[data-role="suggest"]');
      const root = block.closest('.modal-box') || document;
      const exclude = Array.from(root.querySelectorAll('[data-slot-block]')).map(b => b.dataset.linked).filter(Boolean);
      const matches = parentMatches(slotTarget.value, exclude);
      suggest.innerHTML = matches.map(p => `<div class="suggest-chip">Encontrado: <strong>${utils.escapeHtml(p.name)}</strong> (${utils.escapeHtml(p.email || 'sem email')})
        <button type="button" class="btn btn-sm btn-success ms-1" data-action="pick-guard" data-slot="${block.dataset.slotBlock}" data-person="${p.id}">Vincular</button></div>`).join('');
      return;
    }
    if (e.target.id === 'pc-child-query') {
      const q = e.target.value.trim().toLowerCase();
      const box = document.getElementById('pc-child-suggest');
      const matches = q.length >= 3 ? CrecheNowStorage.getStudents().filter(s => s.name.toLowerCase().includes(q)) : [];
      box.innerHTML = matches.map(s => `<div class="suggest-chip"><strong>${utils.escapeHtml(s.name)}</strong> — Turma ${utils.escapeHtml(s.class)}
        <button type="button" class="btn btn-sm btn-success ms-1" data-action="pick-child" data-child="${s.id}">Vincular</button></div>`).join('');
    }
  };

  const handlePersonCreateDelegation = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const container = document.getElementById('personCreateBody');

    if (btn.dataset.action === 'pick-guard') {
      const person = CrecheNowStorage.getPerson(btn.dataset.person);
      if (!confirm(`Confirma que "${person.name}" é o responsável?`)) return;
      const block = container.querySelector(`[data-slot-block="${btn.dataset.slot}"]`);
      block.dataset.linked = person.id;
      if (!block.querySelector('[data-gfield="name"]').value) block.querySelector('[data-gfield="name"]').value = person.name;
      if (!block.querySelector('[data-gfield="email"]').value) block.querySelector('[data-gfield="email"]').value = person.email || '';
      if (!block.querySelector('[data-gfield="phone"]').value) block.querySelector('[data-gfield="phone"]').value = person.phone || '';
      block.querySelector('[data-role="suggest"]').innerHTML = '';
      refreshSlotBadges(container);
      return;
    }
    if (btn.dataset.action === 'unlink-guard') {
      container.querySelector(`[data-slot-block="${btn.dataset.slot}"]`).dataset.linked = '';
      refreshSlotBadges(container);
      return;
    }
    if (btn.dataset.action === 'pick-child') {
      const s = CrecheNowStorage.getPerson(btn.dataset.child);
      if (!confirm(`Confirma o vínculo com a criança "${s.name}"?`)) return;
      document.getElementById('pc-child-id').value = s.id;
      document.getElementById('pc-child-suggest').innerHTML = `<span class="badge bg-success">Vinculado: ${utils.escapeHtml(s.name)}</span>`;
      return;
    }
    if (btn.dataset.action === 'create-person') {
      const type = document.getElementById('pc-type').value;
      const name = document.getElementById('pc-name').value.trim();
      if (!name) { showToast('Informe o nome.', 'warning'); return; }
      const base = {
        type, name,
        birthDate: document.getElementById('pc-birth').value,
        phone: document.getElementById('pc-phone').value.trim(),
        email: document.getElementById('pc-email').value.trim()
      };
      let created;
      if (type === 'student') {
        base.class = document.getElementById('pc-class').value;
        base.allergies = document.getElementById('pc-allergies').value.trim();
        const slots = readGuardianSlots(container);
        const filled = slots.filter(s => s.name || s.linkedPersonId);
        base.guardians = filled;
        base.parentIds = filled.map(s => s.linkedPersonId).filter(Boolean);
        created = CrecheNowStorage.addPerson(base);
        syncParentLinks(created.id, base.parentIds);
      } else if (type === 'parent') {
        base.linkedStudentIds = [];
        created = CrecheNowStorage.addPerson(base);
        const childId = document.getElementById('pc-child-id').value;
        if (childId) {
          CrecheNowStorage.updatePerson(created.id, { linkedStudentIds: [childId] });
          const s = CrecheNowStorage.getPerson(childId);
          CrecheNowStorage.updatePerson(childId, { parentIds: [...(s.parentIds || []), created.id] });
        }
      } else {
        if (type === 'teacher') base.class = document.getElementById('pc-class').value;
        if (type === 'secretary') base.isJunior = document.getElementById('pc-junior').checked;
        created = CrecheNowStorage.addPerson(base);
      }
      showToast('Cadastro realizado. Crie um login para esta pessoa.');
      closeModal('personCreateModal');
      renderStudentManagement(); renderTeachersList(); renderParentsList();
    }
  };

  const renderPersonEdit = (id) => {
    const p = CrecheNowStorage.getPerson(id);
    if (!p) return;
    let html = `
      <input type="hidden" id="pe-id" value="${p.id}">
      <div class="mb-3"><label class="form-label small fw-bold">Nome</label><input type="text" class="form-control" id="pe-name" value="${utils.escapeHtml(p.name)}"></div>
      <div class="row">
        <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Nascimento</label><input type="date" class="form-control" id="pe-birth" value="${p.birthDate || ''}"></div>
        <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Telefone</label><input type="text" class="form-control" id="pe-phone" value="${utils.escapeHtml(p.phone || '')}"></div>
      </div>
      <div class="mb-3"><label class="form-label small fw-bold">E-mail</label><input type="email" class="form-control" id="pe-email" value="${utils.escapeHtml(p.email || '')}"></div>`;

    if (p.type === 'teacher') {
      html += `<div class="mb-3"><label class="form-label small fw-bold">Turma que leciona</label>
        <select class="form-select" id="pe-class">
          <option value="A" ${p.class === 'A' ? 'selected' : ''}>A</option>
          <option value="B" ${p.class === 'B' ? 'selected' : ''}>B</option>
        </select></div>`;
    }

    if (p.type === 'parent') {
      const linked = CrecheNowStorage.getStudents().filter(s => (s.parentIds || []).includes(p.id));
      html += `<h6 class="small fw-bold">Crianças vinculadas</h6>
        <div id="pe-linked-list">${linked.map(s => `
          <div class="d-flex justify-content-between align-items-center border rounded p-1 mb-1 small">
            ${utils.escapeHtml(s.name)} — Turma ${utils.escapeHtml(s.class)}
            <button type="button" class="btn btn-sm btn-outline-danger" data-action="unlink-child" data-child="${s.id}">Desvincular</button>
          </div>`).join('') || '<small class="text-muted">Nenhuma criança vinculada.</small>'}</div>
        <input type="text" class="form-control form-control-sm mt-2" id="pe-child-query" placeholder="Digite o nome da criança para vincular...">
        <div id="pe-child-suggest" class="mt-1"></div>`;
    }
    html += `<button type="button" class="btn btn-success w-100 mb-2" data-action="update-person">Salvar alterações</button>
      <button type="button" class="btn btn-outline-danger w-100" data-action="delete-person">Excluir cadastro</button>`;
    document.getElementById('personEditBody').innerHTML = html;
    openModal('personEditModal');
  };

  const handlePersonEditInput = (e) => {
    if (e.target.id !== 'pe-child-query') return;
    const q = e.target.value.trim().toLowerCase();
    const p = CrecheNowStorage.getPerson(document.getElementById('pe-id').value);
    const linkedIds = p.linkedStudentIds || [];
    const matches = q.length >= 3 ? CrecheNowStorage.getStudents().filter(s => !linkedIds.includes(s.id) && s.name.toLowerCase().includes(q)) : [];
    document.getElementById('pe-child-suggest').innerHTML = matches.map(s => `
      <div class="suggest-chip"><strong>${utils.escapeHtml(s.name)}</strong> — Turma ${utils.escapeHtml(s.class)}
        <button type="button" class="btn btn-sm btn-success ms-1" data-action="link-child" data-child="${s.id}">Vincular</button></div>`).join('');
  };

  const handlePersonEditDelegation = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = document.getElementById('pe-id').value;

    if (btn.dataset.action === 'link-child') {
      const s = CrecheNowStorage.getPerson(btn.dataset.child);
      if (!confirm(`Confirma o vínculo de "${s.name}" a este responsável?`)) return;
      const p = CrecheNowStorage.getPerson(id);
      CrecheNowStorage.updatePerson(id, { linkedStudentIds: [...(p.linkedStudentIds || []), s.id] });
      CrecheNowStorage.updatePerson(s.id, { parentIds: [...(s.parentIds || []), id] });
      showToast('Criança vinculada.');
      renderPersonEdit(id);
      renderParentsList();
      return;
    }
    if (btn.dataset.action === 'unlink-child') {
      const childId = btn.dataset.child;
      const p = CrecheNowStorage.getPerson(id);
      CrecheNowStorage.updatePerson(id, { linkedStudentIds: (p.linkedStudentIds || []).filter(x => x !== childId) });
      const s = CrecheNowStorage.getPerson(childId);
      CrecheNowStorage.updatePerson(childId, { parentIds: (s.parentIds || []).filter(x => x !== id) });
      showToast('Vínculo removido.');
      renderPersonEdit(id);
      renderParentsList();
      return;
    }
    if (btn.dataset.action === 'update-person') {
      const patch = {
        name: document.getElementById('pe-name').value.trim(),
        birthDate: document.getElementById('pe-birth').value,
        phone: document.getElementById('pe-phone').value.trim(),
        email: document.getElementById('pe-email').value.trim()
      };
      const classSel = document.getElementById('pe-class');
      if (classSel) patch.class = classSel.value;
      CrecheNowStorage.updatePerson(id, patch);
      showToast('Cadastro atualizado.');
      closeModal('personEditModal');
      renderStudentManagement(); renderTeachersList(); renderParentsList();
      return;
    }
    if (btn.dataset.action === 'delete-person' && confirm('Excluir este cadastro? O login associado também será removido.')) {
      CrecheNowStorage.removeLogin(id);
      CrecheNowStorage.removePerson(id);
      showToast('Cadastro excluído.');
      closeModal('personEditModal');
      renderStudentManagement(); renderTeachersList(); renderParentsList();
    }
  };

  const renderLoginForm = () => {
    document.getElementById('loginFormBody').innerHTML = `
      <div class="mb-3"><label class="form-label small fw-bold">Tipo de Conta</label>
        <select class="form-select" id="lf-role"><option value="">Escolha...</option>
          <option value="parent">Responsável</option><option value="teacher">Professor</option><option value="secretary">Secretaria</option></select></div>
      <div class="mb-3"><label class="form-label small fw-bold">Pessoa Vinculada</label>
        <select class="form-select" id="lf-person"><option value="">Primeiro escolha o tipo</option></select></div>
      <div class="mb-3"><label class="form-label small fw-bold">E-mail (login)</label><input type="email" class="form-control" id="lf-email"></div>
      <div class="mb-3"><label class="form-label small fw-bold">Senha (mínimo 6)</label><input type="password" class="form-control" id="lf-senha" minlength="6"></div>
      <button type="button" class="btn btn-success w-100" data-action="create-login">Criar Login</button>`;
  };

  const handleLoginRoleChange = () => {
    const role = document.getElementById('lf-role').value;
    const usedIds = new Set(CrecheNowStorage.getLogins().map(l => l.personId));
    const available = CrecheNowStorage.getPeople().filter(p => p.type === role && !usedIds.has(p.id));
    document.getElementById('lf-person').innerHTML = '<option value="">Escolha a pessoa...</option>' +
      available.map(p => `<option value="${p.id}">${utils.escapeHtml(p.name)} — ${utils.escapeHtml(p.email || '(sem email)')}</option>`).join('');
  };

  const handleCreateLogin = (e) => {
    if (!e.target.closest('[data-action="create-login"]')) return;
    const role = document.getElementById('lf-role').value;
    const personId = document.getElementById('lf-person').value;
    const email = document.getElementById('lf-email').value.trim();
    const senha = document.getElementById('lf-senha').value;
    if (!role || !personId || !email || senha.length < 6) { showToast('Preencha todos os campos.', 'warning'); return; }
    const person = CrecheNowStorage.getPerson(personId);
    CrecheNowStorage.addLogin({ personId, email, senha, role, isJunior: role === 'secretary' && person.isJunior });
    showToast('Login criado.');
    closeModal('loginFormModal');
    renderLoginsList();
  };

  const renderNoticeForm = () => {
    document.getElementById('noticeFormBody').innerHTML = `
      <div class="mb-3"><label class="form-label small fw-bold">Tipo de Comunicado</label>
        <select class="form-select" id="nf-type">${NOTICE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}</select></div>
      <div class="mb-3"><label class="form-label small fw-bold">Público-alvo</label>
        <select class="form-select" id="nf-target"><option value="all">Todas as turmas</option><option value="A">Apenas Turma A</option><option value="B">Apenas Turma B</option></select></div>
      <div class="mb-3"><label class="form-label small fw-bold">Tipo de Resposta Esperada</label>
        <select class="form-select" id="nf-response">${RESPONSE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}</select></div>
      <div class="mb-3"><label class="form-label small fw-bold">Título</label><input type="text" class="form-control" id="nf-title"></div>
      <div class="row mb-3">
        <div class="col-6"><label class="form-label small fw-bold">Data</label><input type="date" class="form-control" id="nf-date"></div>
        <div class="col-6"><label class="form-label small fw-bold">Hora</label><input type="time" class="form-control" id="nf-time"></div></div>
      <div class="mb-3"><label class="form-label small fw-bold">Mensagem</label><textarea class="form-control" id="nf-body" rows="4"></textarea></div>
      <button type="button" class="btn btn-success w-100" data-action="send-notice">Enviar Comunicado</button>`;
    document.getElementById('nf-date').value = utils.todayISO();
    const d = new Date();
    document.getElementById('nf-time').value = `${utils.pad(d.getHours())}:${utils.pad(d.getMinutes())}`;
  };

  const handleSendNotice = (e) => {
    if (!e.target.closest('[data-action="send-notice"]')) return;
    const title = document.getElementById('nf-title').value.trim();
    const body = document.getElementById('nf-body').value.trim();
    if (!title || !body) { showToast('Preencha título e mensagem.', 'warning'); return; }
    CrecheNowStorage.addNotification({
      title, body,
      type: document.getElementById('nf-type').value,
      targetClass: document.getElementById('nf-target').value,
      responseType: document.getElementById('nf-response').value,
      date: `${document.getElementById('nf-date').value}T${document.getElementById('nf-time').value}:00`
    });
    showToast('Comunicado enviado.');
    renderSent();
    closeModal('noticeFormModal');
    renderNoticeForm();
  };

  const renderSent = () => {
    const tbody = document.getElementById('sent-notifications');
    if (!tbody) return;
    const notifs = CrecheNowStorage.getNotifications();
    tbody.innerHTML = notifs.length ? notifs.map(s => {
      const count = CrecheNowStorage.getResponsesForNotice(s.id).length;
      return `<tr data-action="open-responses" data-id="${s.id}" style="cursor:pointer;">
        <td class="small">${utils.escapeHtml(s.title)}</td>
        <td><span class="badge bg-light text-dark border">${utils.escapeHtml(s.type)}</span></td>
        <td class="small text-muted">${utils.formatDateTimeBR(s.date)}</td>
        <td><span class="badge ${count ? 'bg-success' : 'bg-secondary'}">${count} resposta(s)</span></td></tr>`;
    }).join('') : '<tr><td colspan="4" class="text-center text-muted py-3 small">Nenhum envio.</td></tr>';
  };

  const openResponsesModal = (noticeId) => {
    const n = CrecheNowStorage.getNotifications().find(x => x.id === parseInt(noticeId));
    if (!n) return;
    const responses = CrecheNowStorage.getResponsesForNotice(n.id);
    document.getElementById('noticeResponsesBody').innerHTML = `
      <p class="small"><strong>${utils.escapeHtml(n.title)}</strong> — resposta esperada: ${utils.escapeHtml(n.responseType || '—')}</p>
      ${responses.length ? responses.map(r => {
        const p = CrecheNowStorage.getPerson(r.personId);
        const value = r.kind === 'yesno' ? (r.value === 'sim' ? 'Sim' : 'Não') : r.value;
        return `<div class="message-item mb-2">
          <div class="msg-header"><strong>${utils.escapeHtml(p?.name || '?')}</strong><small>${utils.formatDateTimeBR(r.date)}</small></div>
          <div class="msg-body">${utils.escapeHtml(value)}</div></div>`;
      }).join('') : '<p class="text-muted small">Nenhuma resposta recebida ainda.</p>'}`;
    openModal('noticeResponsesModal');
  };

  const renderMessageForm = () => {
    const session = CrecheNowStorage.getSession();
    const container = document.getElementById('messageFormBody');
    if (!container) return;
    let recipients = [];
    if (session.role === 'parent') {
      const parent = CrecheNowStorage.getPerson(session.personId);
      const linked = (parent?.linkedStudentIds || []).map(id => CrecheNowStorage.getPerson(id)).filter(Boolean);
      const classes = [...new Set(linked.map(s => s.class).filter(Boolean))];
      recipients = CrecheNowStorage.getTeachers().filter(t => classes.includes(t.class)).map(t => ({ id: t.id, label: `Prof. ${t.name} (Turma ${t.class})` }));
      CrecheNowStorage.getPeople().filter(p => p.type === 'secretary').forEach(p => recipients.push({ id: p.id, label: `Secretaria — ${p.name}` }));
    } else if (session.role === 'teacher') {
      CrecheNowStorage.getStudents().filter(s => s.class === session.class).forEach(s => {
        (s.parentIds || []).forEach(pid => {
          const p = CrecheNowStorage.getPerson(pid);
          if (p) recipients.push({ id: p.id, label: `${p.name} (responsável por ${s.name})`, childId: s.id });
        });
      });
    } else {
      CrecheNowStorage.getTeachers().forEach(t => recipients.push({ id: t.id, label: `Prof. ${t.name} (Turma ${t.class})` }));
      CrecheNowStorage.getParents().forEach(p => recipients.push({ id: p.id, label: `${p.name} (responsável)` }));
    }
    container.innerHTML = `
      <div class="mb-3"><label class="form-label small fw-bold">Destinatário</label>
        <select class="form-select" id="mf-recipient"><option value="">Escolha...</option>
          ${recipients.map(r => `<option value="${r.id}" data-child="${r.childId || ''}">${utils.escapeHtml(r.label)}</option>`).join('')}</select></div>
      <div class="mb-3"><label class="form-label small fw-bold">Mensagem</label><textarea class="form-control" id="mf-message" rows="5"></textarea></div>
      <button type="button" class="btn btn-success w-100" data-action="send-message">Enviar Recado</button>`;
  };

  const handleSendMessage = (e) => {
    if (!e.target.closest('[data-action="send-message"]')) return;
    const sel = document.getElementById('mf-recipient');
    const message = document.getElementById('mf-message').value.trim();
    if (!sel.value || !message) { showToast('Preencha todos os campos.', 'warning'); return; }
    const session = CrecheNowStorage.getSession();
    const recipient = CrecheNowStorage.getPerson(sel.value);
    CrecheNowStorage.addMessage({
      threadId: 't_' + Date.now(),
      fromPersonId: session.personId, toPersonId: sel.value,
      fromName: session.name, toName: recipient?.name || '',
      fromRole: session.role, toRole: recipient?.type || '',
      childId: sel.options[sel.selectedIndex].dataset.child || null,
      message
    });
    showToast('Recado enviado.');
    closeModal('messageFormModal');
    updateInboxBadge();
  };

  const _threadIdOf = (m) => m.threadId || ('solo_' + m.id);

  const renderInbox = (tab = 'received') => {
    const container = document.getElementById('inbox-content');
    if (!container) return;
    const session = CrecheNowStorage.getSession();
    const msgs = CrecheNowStorage.getMessages();

    if (tab === 'received') {
      let html = '';
      if (session.role === 'parent') {
        html += CrecheNowStorage.getNotifications().map(n => `
          <div class="message-item ${n.read ? '' : 'unread'}">
            <div class="msg-header"><strong>[Comunicado] ${utils.escapeHtml(n.title)}</strong><small>${utils.formatDateTimeBR(n.date)}</small></div>
            <div class="msg-body">${utils.escapeHtml(n.body)}</div>
            ${responseZoneHTML(n, session)}
            ${!n.read ? `<button class="btn btn-sm btn-success mt-2" data-action="mark-read" data-item-id="${n.id}">Marcar como lido</button>` : '<span class="badge bg-success mt-2">Lido</span>'}
          </div>`).join('');
      }
      const threadsMap = new Map();
      msgs.filter(m => m.toPersonId === session.personId).forEach(m => {
        const t = _threadIdOf(m);
        if (!threadsMap.has(t)) threadsMap.set(t, []);
        threadsMap.get(t).push(m);
      });
      const threads = [...threadsMap.entries()].sort((a, b) => new Date(b[1][b[1].length - 1].date) - new Date(a[1][a[1].length - 1].date));
      html += threads.map(([tid, list]) => {
        const last = list[list.length - 1];
        const unread = list.filter(m => !m.read).length;
        return `<div class="message-item ${unread ? 'unread' : ''}">
          <div class="msg-header"><strong>Conversa com ${utils.escapeHtml(last.fromName)}</strong><small>${utils.formatDateTimeBR(last.date)}</small></div>
          <div class="msg-body">${utils.escapeHtml(last.message)}</div>
          <div class="mt-2 d-flex gap-2 align-items-center">
            <button class="btn btn-sm btn-success" data-action="open-thread" data-thread="${tid}">Abrir e responder</button>
            ${unread ? `<span class="badge bg-danger">${unread} nova(s)</span>` : ''}
          </div></div>`;
      }).join('');
      container.innerHTML = html || '<p class="text-center text-muted py-3">Nada recebido.</p>';
    } else {
      const sent = msgs.filter(m => m.fromPersonId === session.personId).sort((a, b) => new Date(b.date) - new Date(a.date));
      container.innerHTML = sent.length ? sent.map(m => `
        <div class="message-item sent">
          <div class="msg-header"><strong>Para: ${utils.escapeHtml(m.toName)}</strong><small>${utils.formatDateTimeBR(m.date)}</small></div>
          <div class="msg-body">${utils.escapeHtml(m.message)}</div>
          <button class="btn btn-sm btn-outline-success mt-2" data-action="open-thread" data-thread="${_threadIdOf(m)}">Abrir conversa</button>
        </div>`).join('')
        : '<p class="text-center text-muted py-3">Nada enviado.</p>';
    }
  };

  const handleInboxDelegation = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'mark-read') {
      CrecheNowStorage.markAsRead(parseInt(btn.dataset.itemId));
      const active = document.querySelector('[data-inbox-tab].active');
      renderInbox(active?.dataset.inboxTab || 'received');
      updateInboxBadge();
    }
    if (btn.dataset.action === 'open-thread') openThread(btn.dataset.thread);
  };

  const openThread = (tid) => {
    const session = CrecheNowStorage.getSession();
    const list = CrecheNowStorage.getMessages()
      .filter(m => _threadIdOf(m) === tid)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!list.length) return;
    list.filter(m => m.toPersonId === session.personId && !m.read).forEach(m => CrecheNowStorage.markMessageAsRead(m.id));
    const otherId = list.find(m => m.fromPersonId !== session.personId)?.fromPersonId || list[0].toPersonId;
    const other = CrecheNowStorage.getPerson(otherId);
    document.getElementById('threadModalBody').innerHTML = `
      <h6 class="small fw-bold mb-2">Conversa com ${utils.escapeHtml(other?.name || '?')}</h6>
      <div class="thread-list mb-3">${list.map(m => `
        <div class="thread-bubble ${m.fromPersonId === session.personId ? 'mine' : ''}">
          <small class="text-muted">${utils.escapeHtml(m.fromName)} • ${utils.formatDateTimeBR(m.date)}</small>
          <div>${utils.escapeHtml(m.message)}</div>
        </div>`).join('')}</div>
      <textarea class="form-control mb-2" id="thread-reply" rows="3" placeholder="Escreva sua resposta..."></textarea>
      <button class="btn btn-success w-100" data-action="send-reply" data-thread="${tid}" data-to="${otherId}">Enviar resposta</button>`;
    openModal('threadModal');
    updateInboxBadge();
  };

  const handleThreadDelegation = (e) => {
    const btn = e.target.closest('[data-action="send-reply"]');
    if (!btn) return;
    const session = CrecheNowStorage.getSession();
    const value = document.getElementById('thread-reply').value.trim();
    if (!value) { showToast('Escreva sua resposta.', 'warning'); return; }
    const to = CrecheNowStorage.getPerson(btn.dataset.to);
    CrecheNowStorage.addMessage({
      threadId: btn.dataset.thread,
      fromPersonId: session.personId, toPersonId: btn.dataset.to,
      fromName: session.name, toName: to?.name || '',
      fromRole: session.role, toRole: to?.type || '',
      childId: null, message: value
    });
    showToast('Resposta enviada.');
    openThread(btn.dataset.thread);
    updateInboxBadge();
  };

  const updateInboxBadge = () => {
    const badge = document.getElementById('inboxBadge');
    if (!badge) return;
    const session = CrecheNowStorage.getSession();
    if (!session) return;
    let unread = CrecheNowStorage.getMessages().filter(m => m.toPersonId === session.personId && !m.read).length;
    if (session.role === 'parent') unread += CrecheNowStorage.getNotifications().filter(n => !n.read).length;
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'inline-block' : 'none';
  };

  const renderMyData = () => {
    const session = CrecheNowStorage.getSession();
    if (!session) return;
    const p = CrecheNowStorage.getPerson(session.personId);
    document.getElementById('myDataBody').innerHTML = `
      <dl class="row small">
        <dt class="col-4">Nome</dt><dd class="col-8">${utils.escapeHtml(p?.name || session.name)}</dd>
        <dt class="col-4">E-mail</dt><dd class="col-8">${utils.escapeHtml(session.email)}</dd>
        <dt class="col-4">Função</dt><dd class="col-8">${utils.escapeHtml(session.role)}</dd>
        <dt class="col-4">Nascimento</dt><dd class="col-8">${utils.formatDateBR(p?.birthDate)}</dd>
        <dt class="col-4">Telefone</dt><dd class="col-8">${utils.escapeHtml(p?.phone || '—')}</dd></dl>
      <button class="btn btn-outline-secondary btn-sm w-100" data-action="export-my-data">Exportar JSON</button>`;
    openModal('myDataModal');
  };

  const handleExportMyData = (e) => {
    if (!e.target.closest('[data-action="export-my-data"]')) return;
    const session = CrecheNowStorage.getSession();
    const blob = new Blob([JSON.stringify({ person: CrecheNowStorage.getPerson(session.personId) }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'meus-dados.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const showToast = (msg, type = 'success') => {
    const container = document.getElementById('toast-container') || document.body;
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${type} border-0 show`;
    toastEl.innerHTML = `<div class="d-flex"><div class="toast-body">${utils.escapeHtml(msg)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button></div>`;
    container.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 4000);
  };

  const initRealTimeSync = () => {
    window.addEventListener('storage', (e) => {
      const session = CrecheNowStorage.getSession();
      if (e.key === 'crechenow_notifications') { renderFeed(); updateInboxBadge(); renderSent(); }
      if (e.key === 'crechenow_notice_responses') { renderSent(); }
      if (e.key === 'crechenow_messages') {
        // aviso de nova mensagem para a outra parte
        try {
          const oldIds = new Set((JSON.parse(e.oldValue || '[]') || []).map(m => m.id));
          const fresh = (JSON.parse(e.newValue || '[]') || []).filter(m => !oldIds.has(m.id));
          const mine = fresh.filter(m => m.toPersonId === session?.personId);
          if (mine.length) showToast(`Nova mensagem de ${mine[0].fromName}.`);
        } catch {}
        const inboxOpen = document.getElementById('inboxModal')?.classList.contains('active');
        if (inboxOpen) {
          const active = document.querySelector('[data-inbox-tab].active');
          renderInbox(active?.dataset.inboxTab || 'received');
        }
        updateInboxBadge();
      }
      if (e.key === 'crechenow_routines') {
        if (session?.role === 'parent') {
          const sel = document.getElementById('childSelect');
          const parent = CrecheNowStorage.getPerson(session.personId);
          const kid = sel?.value || (parent?.linkedStudentIds || [])[0];
          if (kid) renderRoutineForParent(kid);
        }
        if (session?.role === 'teacher') renderTeacherDashboard();
      }
      if (e.key === 'crechenow_people') { renderStudentManagement(); renderTeachersList(); renderParentsList(); }
      if (e.key === 'crechenow_agenda') renderAgenda('agenda-list', window.__cnAgendaClass ?? null);
      if (e.key === 'crechenow_cardapio') renderCardapio();
      if (e.key === 'crechenow_school_calendar') { renderAgenda('agenda-list', window.__cnAgendaClass ?? null); renderCardapio(); }
    });
  };

  return {
    openModal, closeModal, initModalHandlers,
    renderFeed, handleResponseDelegation,
    renderAgenda, renderTeacherAgendaEditor, handleAgendaEditorDelegation, saveTeacherAgendaFromEditor,
    renderCardapio, renderCardapioEditor, handleCardapioEditorDelegation, saveCardapioFromEditor,
    renderSchoolCalendarEditor, handleSchoolCalendarDelegation, handleSchoolCalendarChange,
    renderCalendarView, handleCalendarDelegation,
    renderRoutineForParent,
    renderTeacherDashboard, renderTeacherAllergies, openStudentView,
    renderStudentManagement, openStudentDetail, handleStudentDetailDelegation, handleStudentDetailInput,
    renderPersonCreateForm, handlePersonCreateDelegation, handlePersonCreateInput,
    renderPersonEdit, handlePersonEditDelegation, handlePersonEditInput,
    renderTeachersList, renderParentsList, renderLoginsList, handleDeleteLogin,
    renderLoginForm, handleLoginRoleChange, handleCreateLogin,
    renderNoticeForm, handleSendNotice, renderSent, openResponsesModal,
    renderMessageForm, handleSendMessage, renderInbox, handleInboxDelegation,
    openThread, handleThreadDelegation,
    updateInboxBadge, renderMyData, handleExportMyData,
    showToast, initRealTimeSync
  };
})();
