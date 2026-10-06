const CrecheNowNotifications = (() => {
  const { utils, NOTICE_TYPES, RESPONSE_TYPES, WEEKDAYS, WEEKDAYS_LONG } = CrecheNowConfig;
  const AVAILABLE_ICONS = ['🎵', '🤸', '🎨', '👨‍👩‍👧‍👦', '🎭', '⚽', '🌳', '🎲', '🎂'];

  const openModal = (id) => document.getElementById(id)?.classList.add('active');
  const closeModal = (id) => document.getElementById(id)?.classList.remove('active');

  const initModalHandlers = () => {
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    });
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
      if (myClasses.length) {
        all = all.filter(n => !n.targetClass || n.targetClass === 'all' || myClasses.includes(n.targetClass));
      }
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
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="fw-bold mb-0" style="font-size: 1.1rem;">${utils.escapeHtml(n.title)}</h5>
            <span class="badge ${n.read ? 'bg-secondary' : 'bg-warning text-dark'}">${n.read ? 'Lido' : 'Novo'}</span>
          </div>
          <p class="text-muted mb-2" style="font-size: 0.95rem;">${utils.escapeHtml(n.body)}</p>
          <div class="d-flex justify-content-between align-items-center mt-auto gap-2">
            <small class="text-muted">${utils.formatDateTimeBR(n.date)}</small>
            ${!n.read ? `<button class="btn btn-sm btn-outline-primary mark-read" data-id="${n.id}">Marcar como lido</button>` : ''}
          </div>
        </div>
      `;
      container.appendChild(el);
    });

    container.querySelectorAll('.mark-read').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        CrecheNowStorage.markAsRead(parseInt(btn.dataset.id));
        renderFeed(filter);
        updateInboxBadge();
        showToast('Notificação marcada como lida.');
      });
    });
    _refreshCarouselInstance();
  };

  const _refreshCarouselInstance = () => {
    const el = document.getElementById('notifications-carousel');
    if (!el || !window.bootstrap?.Carousel) return;
    bootstrap.Carousel.getInstance(el)?.dispose();
    new bootstrap.Carousel(el, { interval: 5000, ride: 'carousel' });
  };

  const renderAgenda = () => {
    const container = document.getElementById('agenda-list');
    if (!container) return;
    const agendaByDate = {};
    CrecheNowStorage.getAgenda().forEach(a => { agendaByDate[a.date] = a; });

    container.innerHTML = utils.getWeekDates().map(date => {
      const weekday = WEEKDAYS_LONG[utils.getWeekdayIndex(date)];
      const dateLabel = utils.formatDateBR(date);

      if (!CrecheNowStorage.isSchoolDay(date)) {
        return `
          <div class="agenda-card no-school">
            <div class="flex-grow-1">
              <strong class="d-block text-muted" style="font-size: 0.9rem;">Sem aula</strong>
              <small class="text-muted">${weekday} ${dateLabel}</small>
            </div>
          </div>
        `;
      }

      const item = agendaByDate[date];
      if (!item || !item.title) {
        return `
          <div class="agenda-card empty">
            <div class="flex-grow-1">
              <strong class="d-block text-muted" style="font-size: 0.9rem;">(sem atividade)</strong>
              <small class="text-muted">${weekday} ${dateLabel}</small>
            </div>
          </div>
        `;
      }

      return `
        <div class="agenda-card">
          <div class="agenda-icon me-2 fs-4">${utils.escapeHtml(item.icon || '')}</div>
          <div class="flex-grow-1">
            <strong class="d-block text-primary" style="font-size: 0.9rem;">${utils.escapeHtml(item.title)}</strong>
            <small class="text-muted">${weekday} ${dateLabel} &bull; ${utils.escapeHtml(item.time || '')}</small>
          </div>
        </div>
      `;
    }).join('');
  };

  const renderCardapio = () => {
    const container = document.getElementById('cardapio-list');
    if (!container) return;
    const cardapioByDate = {};
    CrecheNowStorage.getCardapio().forEach(c => { if (c.meal && c.meal.trim()) cardapioByDate[c.date] = c; });

    container.innerHTML = utils.getWeekDates().map(date => {
      const weekday = WEEKDAYS_LONG[utils.getWeekdayIndex(date)].slice(0, 3);
      const dateLabel = utils.formatDateBR(date);
      const head = `
        <div class="me-2" style="min-width: 90px; font-size: 0.85rem;">
          <div class="fw-bold ${CrecheNowStorage.isSchoolDay(date) ? 'text-success' : 'text-muted'}">${weekday}</div>
          <small class="text-muted">${dateLabel}</small>
        </div>
      `;

      if (!CrecheNowStorage.isSchoolDay(date)) {
        return `<div class="cardapio-item no-school">${head}<div class="small text-muted fst-italic">Sem aula</div></div>`;
      }
      const item = cardapioByDate[date];
      if (!item) {
        return `<div class="cardapio-item empty">${head}<div class="small text-muted fst-italic">(não definido)</div></div>`;
      }
      return `<div class="cardapio-item">${head}<div class="small text-muted">${utils.escapeHtml(item.meal)}</div></div>`;
    }).join('');
  };

  const renderAgendaEditor = () => {
    const container = document.getElementById('agendaEditorContainer');
    if (!container) return;
    const agendaByDate = {};
    CrecheNowStorage.getAgenda().forEach(a => { agendaByDate[a.date] = a; });

    container.innerHTML = utils.getWeekDates().map((date, i) => {
      const weekday = WEEKDAYS[utils.getWeekdayIndex(date)];
      const dateLabel = utils.formatDateBR(date);

      if (!CrecheNowStorage.isSchoolDay(date)) {
        return `
          <div class="editor-item disabled-row">
            <input type="date" class="form-control form-control-sm" value="${date}" disabled style="width: 140px;">
            <span class="small text-muted">Sem aula (${weekday} ${dateLabel})</span>
          </div>
        `;
      }

      const item = agendaByDate[date] || { icon: '📌', title: '', time: '08:00' };
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
            ${AVAILABLE_ICONS.map(icon => `
              <div class="icon-option ${item.icon === icon ? 'selected' : ''}" data-icon="${icon}" data-date="${date}">${icon}</div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  };

  const handleAgendaEditorDelegation = (e) => {
    const btn = e.target.closest('[data-action], .agenda-icon-btn, .icon-option');
    if (!btn) return;

    if (btn.classList.contains('agenda-icon-btn')) {
      const container = document.getElementById('agendaEditorContainer');
      container.querySelector(`.icon-picker-container[data-index="${btn.dataset.index}"]`).classList.toggle('d-none');
      return;
    }
    if (btn.classList.contains('icon-option')) {
      const date = btn.dataset.date;
      const agenda = CrecheNowStorage.getAgenda();
      const i = agenda.findIndex(a => a.date === date);
      if (i !== -1) agenda[i].icon = btn.dataset.icon;
      else agenda.push({ date, icon: btn.dataset.icon, title: '', time: '08:00' });
      CrecheNowStorage.setAgenda(agenda);
      renderAgendaEditor();
      renderAgenda();
      document.querySelectorAll('.icon-picker-container').forEach(p => p.classList.add('d-none'));
      return;
    }
    if (btn.dataset.action === 'remove-agenda') {
      CrecheNowStorage.setAgenda(CrecheNowStorage.getAgenda().filter(a => a.date !== btn.dataset.date));
      renderAgendaEditor();
      renderAgenda();
      showToast('Atividade removida do dia.');
    }
  };

  const saveAgendaFromEditor = () => {
    const rows = document.querySelectorAll('#agendaEditorContainer .editor-item[data-date]');
    const newAgenda = Array.from(rows).map(row => ({
      date: row.dataset.date,
      time: row.querySelector('[data-field="time"]').value,
      title: row.querySelector('[data-field="title"]').value.trim(),
      icon: row.querySelector('.agenda-icon-btn').textContent.trim()
    })).filter(a => a.title !== '');
    CrecheNowStorage.setAgenda(newAgenda);
    renderAgenda();
    showToast('Agenda atualizada.');
    closeModal('agendaEditorModal');
  };

  const renderCardapioEditor = () => {
    const container = document.getElementById('cardapioEditorContainer');
    if (!container) return;
    const cardapioByDate = {};
    CrecheNowStorage.getCardapio().forEach(c => { cardapioByDate[c.date] = c; });

    container.innerHTML = utils.getWeekDates().map(date => {
      const weekday = WEEKDAYS[utils.getWeekdayIndex(date)];
      const dateLabel = utils.formatDateBR(date);

      if (!CrecheNowStorage.isSchoolDay(date)) {
        return `
          <div class="editor-item disabled-row">
            <input type="date" class="form-control form-control-sm" value="${date}" disabled style="width: 140px;">
            <span class="small text-muted">Sem aula (${weekday} ${dateLabel})</span>
          </div>
        `;
      }
      const item = cardapioByDate[date] || { meal: '' };
      return `
        <div class="editor-item" data-date="${date}">
          <input type="date" class="form-control form-control-sm" value="${date}" disabled style="width: 140px;">
          <input type="text" class="form-control form-control-sm flex-grow-1" value="${utils.escapeHtml(item.meal || '')}" placeholder="Refeição do dia" data-field="meal">
          <button type="button" class="btn btn-danger btn-sm btn-remove" data-action="remove-cardapio" data-date="${date}">×</button>
        </div>
      `;
    }).join('');
  };

  const handleCardapioEditorDelegation = (e) => {
    const btn = e.target.closest('[data-action="remove-cardapio"]');
    if (!btn) return;
    CrecheNowStorage.setCardapio(CrecheNowStorage.getCardapio().filter(c => c.date !== btn.dataset.date));
    renderCardapioEditor();
    renderCardapio();
    showToast('Refeição removida do dia.');
  };

  const saveCardapioFromEditor = () => {
    const rows = document.querySelectorAll('#cardapioEditorContainer .editor-item[data-date]');
    const newCardapio = Array.from(rows).map(row => ({
      date: row.dataset.date,
      meal: row.querySelector('[data-field="meal"]').value.trim()
    })).filter(c => c.meal !== '');
    CrecheNowStorage.setCardapio(newCardapio);
    renderCardapio();
    showToast('Cardápio atualizado.');
    closeModal('cardapioEditorModal');
  };

  const renderSchoolCalendarEditor = () => {
    const container = document.getElementById('schoolCalendarBody');
    if (!container) return;
    const cal = CrecheNowStorage.getSchoolCalendar();
    container.innerHTML = WEEKDAYS_LONG.map((label, idx) => `
      <div class="form-check mb-2">
        <input class="form-check-input school-day-check" type="checkbox" value="${idx}" id="school-day-${idx}" ${cal.schoolDays.includes(idx) ? 'checked' : ''}>
        <label class="form-check-label" for="school-day-${idx}">${label}</label>
      </div>
    `).join('') + `
      <button type="button" class="btn btn-primary w-100 mt-3" data-action="save-school-calendar">Salvar Calendário de Aulas</button>
    `;
  };

  const saveSchoolCalendar = (e) => {
    if (!e.target.closest('[data-action="save-school-calendar"]')) return;
    const checked = Array.from(document.querySelectorAll('.school-day-check:checked')).map(cb => parseInt(cb.value));
    CrecheNowStorage.setSchoolCalendar({ schoolDays: checked });
    renderAgenda();
    renderCardapio();
    showToast('Calendário de aulas atualizado.');
    closeModal('schoolCalendarModal');
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
      return `
        <div class="calendar-cell ${!hasSchool ? 'no-school' : (ag.length || ca.length ? 'has-content' : '')}">
          <div class="cell-header">
            <small class="text-muted">${WEEKDAYS[dateObj.getDay()]}</small>
            <strong>${dateObj.getDate()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}</strong>
          </div>
          <div class="cell-body">
            ${!hasSchool ? '<div class="cell-item no-school">Sem aula</div>' : ''}
            ${ag.map(a => `<div class="cell-item agenda">${utils.escapeHtml(a.icon || '')} ${utils.escapeHtml(a.time)} ${utils.escapeHtml(a.title)}</div>`).join('')}
            ${ca.map(c => `<div class="cell-item cardapio">${utils.escapeHtml(c.meal)}</div>`).join('')}
          </div>
        </div>
      `;
    }).join('');

    const header = document.getElementById('calendarViewHeader');
    if (header) {
      const label = mode === 'month'
        ? ref.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
        : String(ref.getFullYear());
      header.innerHTML = `
        <button class="btn btn-sm btn-outline-primary" data-action="cal-prev">‹</button>
        <strong class="text-capitalize">${label}</strong>
        <button class="btn btn-sm btn-outline-primary" data-action="cal-next">›</button>
      `;
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
      todayContainer.innerHTML = `
        <div class="absent-message">
          <div>
            <div style="font-size: 2.5rem;">😷</div>
            <div class="mt-2">A criança não foi hoje</div>
          </div>
        </div>
      `;
      todayContainer.onclick = null;
      if (historyContainer) historyContainer.innerHTML = '';
      return;
    }

    const q = todayRoutine.questions || {};
    const statusIcon = (val) => val === 'sim'
      ? '<span class="text-success fw-bold">Sim</span>'
      : '<span class="text-danger fw-bold">Não</span>';

    todayContainer.innerHTML = `
      <div class="routine-grid">
        <div class="routine-item">Comportamento: ${statusIcon(q.behaved)}</div>
        <div class="routine-item">Atenção: ${statusIcon(q.attention)}</div>
        <div class="routine-item">Deveres: ${statusIcon(q.homework)}</div>
        <div class="routine-item">Colegas: ${statusIcon(q.peers)}</div>
        <div class="routine-item" style="grid-column: 1 / -1;">Alimentação: ${statusIcon(q.food)}</div>
      </div>
      ${todayRoutine.comment ? '<div class="click-hint">Clique para ver detalhes</div>' : ''}
    `;

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
        ${todayRoutine.comment ? `
          <div class="routine-comment">
            <strong>Comentário do professor:</strong><br>
            "${utils.escapeHtml(todayRoutine.comment)}"
          </div>
        ` : '<p class="text-muted fst-italic">Sem comentários adicionais.</p>'}
        <div class="text-end mt-3">
          <small class="text-muted">Registrado em ${utils.formatDateTimeBR(todayRoutine.date)}</small>
        </div>
      `;
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
            </div>
          `).join('')
        : '<p class="text-muted small mb-0">Sem histórico anterior.</p>';
    }
  };

  const renderTeacherDashboard = () => {
    const session = CrecheNowStorage.getSession();
    if (!session || session.role !== 'teacher') return;
    const students = CrecheNowStorage.getStudents().filter(s => s.class === session.class);

    const optionsHtml = '<option value="">Escolha um aluno...</option>' +
      students.map(s => `<option value="${s.id}">${utils.escapeHtml(s.name)}</option>`).join('');
    const select = document.getElementById('routineStudentSelect');
    const msgStudentSelect = document.getElementById('teacherMsgStudent');
    if (select) select.innerHTML = optionsHtml;
    if (msgStudentSelect) msgStudentSelect.innerHTML = optionsHtml;

    const studentsList = document.getElementById('teacher-students-list');
    if (studentsList) {
      const today = utils.todayISO();
      studentsList.innerHTML = students.map(s => {
        const r = CrecheNowStorage.getRoutines().find(x => x.studentId === s.id && x.date.startsWith(today));
        const status = !r ? '<span class="text-muted small">—</span>'
          : r.attendance === true ? '<span class="text-success">Presente</span>'
          : '<span class="text-danger">Falta</span>';
        return `<tr><td class="small">${utils.escapeHtml(s.name)}</td><td>${status}</td></tr>`;
      }).join('');
    }

    const historyDiv = document.getElementById('teacher-routine-history');
    if (historyDiv) {
      const all = CrecheNowStorage.getRoutines()
        .filter(r => r.teacherPersonId === session.personId)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 15);
      historyDiv.innerHTML = all.length ? all.map(r => {
        const student = CrecheNowStorage.getPerson(r.studentId);
        return `
          <div class="p-3 border-bottom">
            <div class="d-flex justify-content-between">
              <strong class="small">${student ? utils.escapeHtml(student.name) : 'Aluno removido'}</strong>
              <small class="text-muted">${utils.formatDateBR(r.date)}</small>
            </div>
            <small class="text-muted">${r.attendance === true ? 'Presente' : 'Falta'}</small>
            ${r.comment ? `<p class="small mb-0 mt-1 text-muted">"${utils.escapeHtml(r.comment)}"</p>` : ''}
          </div>
        `;
      }).join('') : '<p class="text-center text-muted p-3 small">Nenhum registro ainda.</p>';
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
      </tr>
    `).join('') : '<tr><td colspan="2" class="text-center text-muted py-3">Nenhum aluno cadastrado.</td></tr>';
  };

  const openStudentDetail = (id) => {
    const s = CrecheNowStorage.getPerson(id);
    if (!s) return;
    document.getElementById('studentDetailBody').innerHTML = `
      <input type="hidden" id="sd-id" value="${s.id}">
      <div class="mb-3">
        <label class="form-label small fw-bold">Nome Completo</label>
        <input type="text" class="form-control" id="sd-name" value="${utils.escapeHtml(s.name)}" required>
      </div>
      <div class="row">
        <div class="col-md-6 mb-3">
          <label class="form-label small fw-bold">Data de Nascimento</label>
          <input type="date" class="form-control" id="sd-birth" value="${s.birthDate || ''}">
        </div>
        <div class="col-md-6 mb-3">
          <label class="form-label small fw-bold">Turma</label>
          <select class="form-select" id="sd-class">
            <option value="A" ${s.class === 'A' ? 'selected' : ''}>A</option>
            <option value="B" ${s.class === 'B' ? 'selected' : ''}>B</option>
          </select>
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label small fw-bold">Nome dos Pais</label>
        <input type="text" class="form-control" id="sd-parents" value="${utils.escapeHtml(s.parentNames || '')}" placeholder="Ex.: João Silva, Maria Silva">
      </div>
      <div class="row">
        <div class="col-md-6 mb-3">
          <label class="form-label small fw-bold">Telefone</label>
          <input type="text" class="form-control" id="sd-phone" value="${utils.escapeHtml(s.phone || '')}">
        </div>
        <div class="col-md-6 mb-3">
          <label class="form-label small fw-bold">E-mail</label>
          <input type="email" class="form-control" id="sd-email" value="${utils.escapeHtml(s.email || '')}">
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label small fw-bold">Alergias / Observações de Saúde</label>
        <textarea class="form-control" id="sd-allergies" rows="2">${utils.escapeHtml(s.allergies || '')}</textarea>
      </div>
      <div class="mb-3">
        <label class="form-label small fw-bold">Responsáveis vinculados</label>
        <select multiple class="form-select" id="sd-parents-linked" size="3">
          ${CrecheNowStorage.getParents().map(p => `
            <option value="${p.id}" ${(s.parentIds || []).includes(p.id) ? 'selected' : ''}>${utils.escapeHtml(p.name)} — ${utils.escapeHtml(p.email || '')}</option>
          `).join('')}
        </select>
        <small class="text-muted">Segure Ctrl/Cmd para selecionar mais de um.</small>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-primary flex-fill" data-action="save-student">Salvar</button>
        <button class="btn btn-outline-danger" data-action="delete-student">Excluir</button>
      </div>
    `;
    openModal('studentDetailModal');
  };

  const handleStudentDetailDelegation = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = document.getElementById('sd-id').value;

    if (btn.dataset.action === 'save-student') {
      const selectedParents = Array.from(document.getElementById('sd-parents-linked').selectedOptions).map(o => o.value);
      CrecheNowStorage.updatePerson(id, {
        name: document.getElementById('sd-name').value.trim(),
        birthDate: document.getElementById('sd-birth').value,
        class: document.getElementById('sd-class').value,
        parentNames: document.getElementById('sd-parents').value.trim(),
        phone: document.getElementById('sd-phone').value.trim(),
        email: document.getElementById('sd-email').value.trim(),
        allergies: document.getElementById('sd-allergies').value.trim(),
        parentIds: selectedParents
      });
      CrecheNowStorage.getParents().forEach(p => {
        const linked = p.linkedStudentIds || [];
        const should = selectedParents.includes(p.id);
        const has = linked.includes(id);
        if (should && !has) CrecheNowStorage.updatePerson(p.id, { linkedStudentIds: [...linked, id] });
        else if (!should && has) CrecheNowStorage.updatePerson(p.id, { linkedStudentIds: linked.filter(x => x !== id) });
      });
      renderStudentManagement();
      showToast('Aluno atualizado.');
      closeModal('studentDetailModal');
    }
    if (btn.dataset.action === 'delete-student' && confirm('Remover este aluno do sistema?')) {
      CrecheNowStorage.removePerson(id);
      renderStudentManagement();
      showToast('Aluno removido.');
      closeModal('studentDetailModal');
    }
  };

  const renderTeachersList = () => {
    const tbody = document.getElementById('teachers-list');
    if (!tbody) return;
    const list = CrecheNowStorage.getTeachers();
    tbody.innerHTML = list.length ? list.map(t => `
      <tr data-action="open-person" data-id="${t.id}" style="cursor:pointer;">
        <td class="small">${utils.escapeHtml(t.name)}</td>
        <td><span class="badge bg-warning text-dark">Turma ${utils.escapeHtml(t.class)}</span></td>
      </tr>
    `).join('') : '<tr><td colspan="2" class="text-center text-muted py-3 small">Nenhum professor.</td></tr>';
  };

  const renderParentsList = () => {
    const tbody = document.getElementById('parents-list');
    if (!tbody) return;
    const list = CrecheNowStorage.getParents();
    tbody.innerHTML = list.length ? list.map(p => {
      const kids = (p.linkedStudentIds || []).map(id => CrecheNowStorage.getPerson(id)?.name).filter(Boolean);
      return `
        <tr data-action="open-person" data-id="${p.id}" style="cursor:pointer;">
          <td class="small">${utils.escapeHtml(p.name)}</td>
          <td class="small">${utils.escapeHtml(kids.join(', ') || '—')}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="2" class="text-center text-muted py-3 small">Nenhum responsável.</td></tr>';
  };

  const openPersonDetail = (id) => {
    const p = CrecheNowStorage.getPerson(id);
    if (!p) return;
    document.getElementById('personFormBody').innerHTML = `
      <input type="hidden" id="pf-type" value="${p.type}">
      <input type="hidden" id="pf-edit-id" value="${p.id}">
      <p class="small text-muted">Editando cadastro existente.</p>
      <div class="mb-3"><label class="form-label small fw-bold">Nome</label><input type="text" class="form-control" id="pf-name" value="${utils.escapeHtml(p.name)}"></div>
      <div class="row">
        <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Nascimento</label><input type="date" class="form-control" id="pf-birth" value="${p.birthDate || ''}"></div>
        <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Telefone</label><input type="text" class="form-control" id="pf-phone" value="${utils.escapeHtml(p.phone || '')}"></div>
      </div>
      <div class="mb-3"><label class="form-label small fw-bold">E-mail</label><input type="email" class="form-control" id="pf-email" value="${utils.escapeHtml(p.email || '')}"></div>
      <button type="button" class="btn btn-primary w-100 mb-2" data-action="update-person">Salvar alterações</button>
      <button type="button" class="btn btn-outline-danger w-100" data-action="delete-person">Excluir cadastro</button>
    `;
    openModal('personFormModal');
  };

  const renderPersonForm = (type) => {
    const container = document.getElementById('personFormBody');
    const students = CrecheNowStorage.getStudents();

    let html = `<input type="hidden" id="pf-type" value="${type}">`;
    html += `<div class="mb-3"><label class="form-label small fw-bold">Nome Completo</label><input type="text" class="form-control" id="pf-name" required></div>`;
    html += `<div class="row"><div class="col-md-6 mb-3"><label class="form-label small fw-bold">Data de Nascimento</label><input type="date" class="form-control" id="pf-birth"></div>`;
    html += `<div class="col-md-6 mb-3"><label class="form-label small fw-bold">Telefone</label><input type="text" class="form-control" id="pf-phone"></div></div>`;
    html += `<div class="mb-3"><label class="form-label small fw-bold">E-mail</label><input type="email" class="form-control" id="pf-email"></div>`;

    if (type === 'student') {
      html += `<div class="row"><div class="col-md-6 mb-3"><label class="form-label small fw-bold">Turma</label>
        <select class="form-select" id="pf-class"><option value="A">A</option><option value="B">B</option></select></div>
        <div class="col-md-6 mb-3"><label class="form-label small fw-bold">Nome dos Pais</label><input type="text" class="form-control" id="pf-parents"></div></div>`;
      html += `<div class="mb-3"><label class="form-label small fw-bold">Alergias / Observações</label><textarea class="form-control" id="pf-allergies" rows="2"></textarea></div>`;
    } else if (type === 'parent') {
      html += `<div class="mb-3">
        <label class="form-label small fw-bold">Criança vinculada (opcional)</label>
        <select class="form-select" id="pf-student">
          <option value="">— Não vincular —</option>
          ${students.map(s => `<option value="${s.id}">${utils.escapeHtml(s.name)} — Turma ${s.class}</option>`).join('')}
        </select>
        <small class="text-muted">O vínculo é manual para evitar associações incorretas.</small>
      </div>`;
    } else if (type === 'teacher') {
      html += `<div class="mb-3"><label class="form-label small fw-bold">Turma que leciona</label>
        <select class="form-select" id="pf-class"><option value="A">A</option><option value="B">B</option></select></div>`;
    } else if (type === 'secretary') {
      html += `<div class="form-check mb-3">
        <input class="form-check-input" type="checkbox" id="pf-junior">
        <label class="form-check-label small" for="pf-junior">Secretaria Júnior (sem permissão para cadastrar pessoas/logins nem alterar alunos)</label>
      </div>`;
    }

    html += `<button type="button" class="btn btn-primary w-100" data-action="save-person">Cadastrar</button>`;
    container.innerHTML = html;
  };

  const handlePersonFormDelegation = (e) => {
    if (!e.target.closest('[data-action="save-person"]')) return;
    const type = document.getElementById('pf-type').value;
    const name = document.getElementById('pf-name').value.trim();
    if (!name) { showToast('Informe o nome.', 'warning'); return; }

    const base = {
      type, name,
      birthDate: document.getElementById('pf-birth')?.value || '',
      phone: document.getElementById('pf-phone')?.value.trim() || '',
      email: document.getElementById('pf-email')?.value.trim() || ''
    };
    if (type === 'student') {
      base.class = document.getElementById('pf-class').value;
      base.parentNames = document.getElementById('pf-parents').value.trim();
      base.allergies = document.getElementById('pf-allergies').value.trim();
      base.parentIds = [];
    }
    if (type === 'teacher') base.class = document.getElementById('pf-class').value;
    if (type === 'secretary') base.isJunior = document.getElementById('pf-junior').checked;

    const created = CrecheNowStorage.addPerson(base);

    if (type === 'parent') {
      const studentId = document.getElementById('pf-student')?.value;
      if (studentId) {
        CrecheNowStorage.updatePerson(created.id, { linkedStudentIds: [studentId] });
        const s = CrecheNowStorage.getPerson(studentId);
        CrecheNowStorage.updatePerson(studentId, { parentIds: [...(s.parentIds || []), created.id] });
      }
    }

    showToast('Cadastro realizado. Agora crie um login para esta pessoa.');
    closeModal('personFormModal');
    renderStudentManagement(); renderTeachersList(); renderParentsList();
  };

  const handlePersonFormUpdateDelete = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'update-person') {
      const id = document.getElementById('pf-edit-id').value;
      CrecheNowStorage.updatePerson(id, {
        name: document.getElementById('pf-name').value.trim(),
        birthDate: document.getElementById('pf-birth').value,
        phone: document.getElementById('pf-phone').value.trim(),
        email: document.getElementById('pf-email').value.trim()
      });
      showToast('Cadastro atualizado.');
      closeModal('personFormModal');
      renderStudentManagement(); renderTeachersList(); renderParentsList();
    }
    if (btn.dataset.action === 'delete-person' && confirm('Excluir este cadastro? O login associado também será removido.')) {
      const id = document.getElementById('pf-edit-id').value;
      CrecheNowStorage.removeLogin(id);
      CrecheNowStorage.removePerson(id);
      showToast('Cadastro excluído.');
      closeModal('personFormModal');
      renderStudentManagement(); renderTeachersList(); renderParentsList();
    }
  };

  const renderLoginForm = () => {
    document.getElementById('loginFormBody').innerHTML = `
      <div class="mb-3">
        <label class="form-label small fw-bold">Tipo de Conta</label>
        <select class="form-select" id="lf-role" required>
          <option value="">Escolha...</option>
          <option value="parent">Responsável</option>
          <option value="teacher">Professor</option>
          <option value="secretary">Secretaria</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label small fw-bold">Pessoa Vinculada</label>
        <select class="form-select" id="lf-person" required>
          <option value="">Primeiro escolha o tipo</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label small fw-bold">E-mail (login)</label>
        <input type="email" class="form-control" id="lf-email" required>
      </div>
      <div class="mb-3">
        <label class="form-label small fw-bold">Senha (mínimo 6)</label>
        <input type="password" class="form-control" id="lf-senha" minlength="6" required>
      </div>
      <button type="button" class="btn btn-primary w-100" data-action="create-login">Criar Login</button>
    `;
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
    showToast('Login criado com sucesso.');
    closeModal('loginFormModal');
    renderLoginsList();
  };

  const renderLoginsList = () => {
    const tbody = document.getElementById('logins-list');
    if (!tbody) return;
    tbody.innerHTML = CrecheNowStorage.getLogins().map(l => {
      const p = CrecheNowStorage.getPerson(l.personId);
      return `
        <tr>
          <td class="small">${utils.escapeHtml(l.email)}</td>
          <td><span class="badge bg-secondary">${utils.escapeHtml(l.role)}${l.isJunior ? ' (júnior)' : ''}</span></td>
          <td class="small">${p ? utils.escapeHtml(p.name) : '(removido)'}</td>
          <td><button class="btn btn-sm btn-outline-danger" data-action="delete-login" data-id="${l.personId}">×</button></td>
        </tr>
      `;
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

  const renderNoticeForm = () => {
    document.getElementById('noticeFormBody').innerHTML = `
      <div class="mb-3">
        <label class="form-label small fw-bold">Tipo de Comunicado</label>
        <select class="form-select" id="nf-type" required>
          ${NOTICE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label small fw-bold">Público-alvo</label>
        <select class="form-select" id="nf-target" required>
          <option value="all">Todas as turmas</option>
          <option value="A">Apenas Turma A</option>
          <option value="B">Apenas Turma B</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label small fw-bold">Tipo de Resposta Esperada</label>
        <select class="form-select" id="nf-response">
          ${RESPONSE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label small fw-bold">Título</label>
        <input type="text" class="form-control" id="nf-title" required>
      </div>
      <div class="row mb-3">
        <div class="col-6"><label class="form-label small fw-bold">Data</label><input type="date" class="form-control" id="nf-date"></div>
        <div class="col-6"><label class="form-label small fw-bold">Hora</label><input type="time" class="form-control" id="nf-time"></div>
      </div>
      <div class="mb-3">
        <label class="form-label small fw-bold">Mensagem</label>
        <textarea class="form-control" id="nf-body" rows="4" required></textarea>
      </div>
      <button type="button" class="btn btn-primary w-100" data-action="send-notice">Enviar Comunicado</button>
    `;
    document.getElementById('nf-date').value = utils.todayISO();
    document.getElementById('nf-time').value = (() => { const d = new Date(); return `${utils.pad(d.getHours())}:${utils.pad(d.getMinutes())}`; })();
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
    tbody.innerHTML = notifs.length ? notifs.map(s => `
      <tr>
        <td class="small">${utils.escapeHtml(s.title)}</td>
        <td><span class="badge bg-light text-dark border">${utils.escapeHtml(s.type)}</span></td>
        <td class="small text-muted">${utils.formatDateTimeBR(s.date)}</td>
        <td class="small">${utils.escapeHtml(s.responseType || '—')}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" class="text-center text-muted py-3 small">Nenhum envio.</td></tr>';
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
      recipients = CrecheNowStorage.getTeachers().filter(t => classes.includes(t.class))
        .map(t => ({ id: t.id, label: `Prof. ${t.name} (Turma ${t.class})` }));
      CrecheNowStorage.getPeople().filter(p => p.type === 'secretary')
        .forEach(p => recipients.push({ id: p.id, label: `Secretaria — ${p.name}` }));
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
      <div class="mb-3">
        <label class="form-label small fw-bold">Destinatário</label>
        <select class="form-select" id="mf-recipient" required>
          <option value="">Escolha...</option>
          ${recipients.map(r => `<option value="${r.id}" data-child="${r.childId || ''}">${utils.escapeHtml(r.label)}</option>`).join('')}
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label small fw-bold">Mensagem</label>
        <textarea class="form-control" id="mf-message" rows="5" required></textarea>
      </div>
      <button type="button" class="btn btn-primary w-100" data-action="send-message">Enviar Recado</button>
    `;
  };

  const handleSendMessage = (e) => {
    if (!e.target.closest('[data-action="send-message"]')) return;
    const sel = document.getElementById('mf-recipient');
    const message = document.getElementById('mf-message').value.trim();
    if (!sel.value || !message) { showToast('Preencha todos os campos.', 'warning'); return; }
    const session = CrecheNowStorage.getSession();
    const recipient = CrecheNowStorage.getPerson(sel.value);
    CrecheNowStorage.addMessage({
      fromPersonId: session.personId,
      toPersonId: sel.value,
      fromName: session.name,
      toName: recipient?.name || '',
      fromRole: session.role,
      toRole: recipient?.type || '',
      childId: sel.options[sel.selectedIndex].dataset.child || null,
      message
    });
    showToast('Recado enviado.');
    closeModal('messageFormModal');
    updateInboxBadge();
  };

  const renderInbox = (tab = 'received') => {
    const container = document.getElementById('inbox-content');
    if (!container) return;
    const session = CrecheNowStorage.getSession();
    const msgs = CrecheNowStorage.getMessages();

    if (tab === 'received') {
      let items = [];
      if (session.role === 'parent') {
        items = [
          ...CrecheNowStorage.getNotifications().map(n => ({ ...n, _kind: 'notice' })),
          ...msgs.filter(m => m.toPersonId === session.personId).map(m => ({ ...m, _kind: 'message' }))
        ];
      } else {
        items = msgs.filter(m => m.toPersonId === session.personId).map(m => ({ ...m, _kind: 'message' }));
      }
      items.sort((a, b) => new Date(b.date) - new Date(a.date));

      container.innerHTML = items.length ? items.map(m => {
        const title = m._kind === 'notice' ? `[Comunicado] ${m.title}` : `De: ${m.fromName}`;
        const body = m._kind === 'notice' ? m.body : m.message;
        return `
          <div class="message-item ${m.read ? '' : 'unread'}">
            <div class="msg-header">
              <strong>${utils.escapeHtml(title)}</strong>
              <small>${utils.formatDateTimeBR(m.date)}</small>
            </div>
            <div class="msg-body">${utils.escapeHtml(body)}</div>
            ${!m.read ? `<button class="btn btn-sm btn-success mt-2" data-action="mark-read" data-item-id="${m.id}" data-kind="${m._kind}">Marcar como lido</button>` : '<span class="badge bg-success mt-2">Lido</span>'}
          </div>
        `;
      }).join('') : '<p class="text-center text-muted py-3">Nada recebido.</p>';

      container.querySelectorAll('[data-action="mark-read"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.itemId);
          btn.dataset.kind === 'notice' ? CrecheNowStorage.markAsRead(id) : CrecheNowStorage.markMessageAsRead(id);
          renderInbox(tab);
          updateInboxBadge();
          showToast('Marcado como lido.');
        });
      });
    } else {
      const sent = msgs.filter(m => m.fromPersonId === session.personId).sort((a, b) => new Date(b.date) - new Date(a.date));
      container.innerHTML = sent.length ? sent.map(m => `
        <div class="message-item sent">
          <div class="msg-header">
            <strong>Para: ${utils.escapeHtml(m.toName)}</strong>
            <small>${utils.formatDateTimeBR(m.date)}</small>
          </div>
          <div class="msg-body">${utils.escapeHtml(m.message)}</div>
        </div>
      `).join('') : '<p class="text-center text-muted py-3">Nada enviado.</p>';
    }
  };

  const renderParentMessagesForStaff = () => {
    const container = document.getElementById('parent-messages-list');
    if (!container) return;
    const msgs = CrecheNowStorage.getMessages();
    container.innerHTML = msgs.length ? msgs.map(m => `
      <div class="message-item ${m.read ? '' : 'unread'} mb-2">
        <div class="msg-header">
          <strong>${utils.escapeHtml(m.fromName)}</strong>
          <small>${utils.formatDateTimeBR(m.date)}</small>
        </div>
        <div class="msg-body">${utils.escapeHtml(m.message)}</div>
        <small class="text-muted">Para: ${utils.escapeHtml(m.toName)}</small>
        ${!m.read ? `<button class="btn btn-sm btn-success mt-2" data-action="mark-msg-read" data-id="${m.id}">Marcar como lido</button>` : '<span class="badge bg-success mt-2">Lido</span>'}
      </div>
    `).join('') : '<p class="text-center text-muted py-3">Nenhum recado.</p>';

    container.querySelectorAll('[data-action="mark-msg-read"]').forEach(btn => {
      btn.addEventListener('click', () => {
        CrecheNowStorage.markMessageAsRead(parseInt(btn.dataset.id));
        renderParentMessagesForStaff();
        updateInboxBadge();
        showToast('Recado marcado como lido.');
      });
    });
  };

  const updateInboxBadge = () => {
    const badge = document.getElementById('inboxBadge');
    if (!badge) return;
    const session = CrecheNowStorage.getSession();
    if (!session) return;
    let unread = CrecheNowStorage.getMessages().filter(m => m.toPersonId === session.personId && !m.read).length;
    if (session.role === 'parent') {
      unread += CrecheNowStorage.getNotifications().filter(n => !n.read).length;
    }
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'inline-block' : 'none';
  };

  const renderMyData = () => {
    const session = CrecheNowStorage.getSession();
    if (!session) return;
    const p = CrecheNowStorage.getPerson(session.personId);
    document.getElementById('myDataBody').innerHTML = `
      <p class="small text-muted">Seus dados armazenados localmente neste dispositivo:</p>
      <dl class="row small">
        <dt class="col-4">Nome</dt><dd class="col-8">${utils.escapeHtml(p?.name || session.name)}</dd>
        <dt class="col-4">E-mail</dt><dd class="col-8">${utils.escapeHtml(session.email)}</dd>
        <dt class="col-4">Função</dt><dd class="col-8">${utils.escapeHtml(session.role)}</dd>
        <dt class="col-4">Nascimento</dt><dd class="col-8">${utils.formatDateBR(p?.birthDate)}</dd>
        <dt class="col-4">Telefone</dt><dd class="col-8">${utils.escapeHtml(p?.phone || '—')}</dd>
      </dl>
      <p class="small text-muted">Para solicitar exclusão total, entre em contato com a creche. A sessão expira após ${CrecheNowConfig.SESSION_TTL_HOURS}h.</p>
      <button class="btn btn-outline-secondary btn-sm w-100" data-action="export-my-data">Exportar JSON</button>
    `;
    openModal('myDataModal');
  };

  const handleExportMyData = (e) => {
    if (!e.target.closest('[data-action="export-my-data"]')) return;
    const session = CrecheNowStorage.getSession();
    const data = { person: CrecheNowStorage.getPerson(session.personId) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
      if (e.key === 'crechenow_notifications') { renderFeed(); updateInboxBadge(); renderSent(); }
      if (e.key === 'crechenow_messages') { renderInbox('received'); updateInboxBadge(); renderParentMessagesForStaff(); }
      if (e.key === 'crechenow_routines') {
        const session = CrecheNowStorage.getSession();
        if (session?.role === 'parent') {
          const sel = document.getElementById('childSelect');
          const parent = CrecheNowStorage.getPerson(session.personId);
          const kid = sel?.value || (parent?.linkedStudentIds || [])[0];
          if (kid) renderRoutineForParent(kid);
        }
        if (session?.role === 'teacher') renderTeacherDashboard();
      }
      if (e.key === 'crechenow_people') { renderStudentManagement(); renderTeachersList(); renderParentsList(); }
      if (e.key === 'crechenow_agenda') { renderAgenda(); renderAgendaEditor(); }
      if (e.key === 'crechenow_cardapio') { renderCardapio(); renderCardapioEditor(); }
      if (e.key === 'crechenow_school_calendar') { renderAgenda(); renderCardapio(); }
    });
  };

  return {
    openModal, closeModal, initModalHandlers,
    renderFeed, renderAgenda, renderCardapio,
    renderAgendaEditor, handleAgendaEditorDelegation, saveAgendaFromEditor,
    renderCardapioEditor, handleCardapioEditorDelegation, saveCardapioFromEditor,
    renderSchoolCalendarEditor, saveSchoolCalendar,
    renderCalendarView, handleCalendarDelegation,
    renderRoutineForParent, renderTeacherDashboard,
    renderStudentManagement, openStudentDetail, handleStudentDetailDelegation,
    renderPersonForm, handlePersonFormDelegation, renderTeachersList, renderParentsList,
    openPersonDetail, handlePersonFormUpdateDelete,
    renderLoginForm, handleLoginRoleChange, handleCreateLogin, renderLoginsList, handleDeleteLogin,
    renderNoticeForm, handleSendNotice, renderSent,
    renderMessageForm, handleSendMessage, renderInbox, renderParentMessagesForStaff,
    updateInboxBadge, renderMyData, handleExportMyData,
    showToast, initRealTimeSync
  };
})();
