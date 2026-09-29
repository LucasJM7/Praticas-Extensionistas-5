const CrecheNowNotifications = (() => {

  const AVAILABLE_ICONS = ['🎵', '', '📚', '🎨', '👨‍👩‍👧‍👦'];

  const openModal = (id) => document.getElementById(id)?.classList.add('active');
  const closeModal = (id) => document.getElementById(id)?.classList.remove('active');

  const initModalHandlers = () => {
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });
  };

  const getTodayStr = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const getWeekday = (dateStr) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const date = new Date(dateStr + 'T12:00:00');
    return days[date.getDay()];
  };

  const renderFeed = (filter = 'all') => {
    const container = document.getElementById('carousel-inner-notifs');
    if (!container) return;
    container.innerHTML = '';
    
    const allNotifs = CrecheNowStorage.getNotifications();
    const filtered = allNotifs.filter(n => filter === 'all' || n.type === filter);

    if (filtered.length === 0) {
      container.innerHTML = '<div class="carousel-item active"><div class="notify-card"><div class="text-center text-muted">Nenhum comunicado encontrado.</div></div></div>';
      return;
    }

    filtered.forEach((n, index) => {
      const isActive = index === 0 ? 'active' : '';
      const el = document.createElement('div');
      el.className = `carousel-item ${isActive}`;
      el.innerHTML = `
        <div class="notify-card ${n.read ? '' : 'unread'}" data-type="${n.type}">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="fw-bold mb-0" style="font-size: 1.1rem;">${n.title}</h5>
            <span class="badge ${n.read ? 'bg-secondary' : 'bg-warning text-dark'}">${n.read ? 'Lido' : 'Novo'}</span>
          </div>
          <p class="text-muted mb-2" style="font-size: 0.95rem;">${n.body}</p>
          <div class="d-flex justify-content-between align-items-center mt-auto">
            <small class="text-muted">${CrecheNowNotifications.timeAgo(n.date)}</small>
            ${!n.read ? `<button class="btn btn-sm btn-outline-primary mark-read" data-id="${n.id}">Marcar como lido</button>` : ''}
          </div>
        </div>
      `;
      container.appendChild(el);
    });

    document.querySelectorAll('.mark-read').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        CrecheNowStorage.markAsRead(parseInt(btn.dataset.id));
        CrecheNowNotifications.renderFeed(filter);
        CrecheNowNotifications.updateInboxBadge();
        CrecheNowNotifications.showToast('Notificação marcada como lida.');
      });
    });
  };

  const renderAgenda = () => {
    const container = document.getElementById('agenda-list');
    if (!container) return;
    const agenda = CrecheNowStorage.getAgenda();
    container.innerHTML = agenda.map(a => `
      <div class="agenda-card">
        <div class="agenda-icon me-2 fs-4">${a.icon || '📌'}</div>
        <div class="flex-grow-1">
          <strong class="d-block text-primary" style="font-size: 0.9rem;">${a.title}</strong>
          <small class="text-muted">${a.day} • ${a.time}</small>
        </div>
      </div>
    `).join('');
  };

  const renderCardapio = () => {
    const container = document.getElementById('cardapio-list');
    if (!container) return;
    const cardapio = CrecheNowStorage.getCardapio();
    // Filtrar apenas itens que têm meal preenchido
    const filtered = cardapio.filter(c => c.meal && c.meal.trim() !== '');
    
    if (filtered.length === 0) {
      container.innerHTML = '<p class="text-muted text-center mt-4">Cardápio ainda não foi preenchido.</p>';
      return;
    }
    
    container.innerHTML = filtered.map(c => `
      <div class="cardapio-item">
        <div class="fw-bold text-success me-2" style="min-width: 40px; font-size: 0.9rem;">${c.day}</div>
        <div class="small text-muted">${c.meal}</div>
      </div>
    `).join('');
  };

  const renderAgendaEditor = () => {
    const container = document.getElementById('agendaEditorContainer');
    if (!container) return;
    const agenda = CrecheNowStorage.getAgenda();
    container.innerHTML = agenda.map((a, i) => `
      <div class="editor-item" data-index="${i}">
        <input type="date" class="form-control form-control-sm agenda-date" style="width: 140px;" value="${a.date || getTodayStr()}" data-index="${i}">
        <span class="day-preview">${a.day || getWeekday(a.date || getTodayStr())}</span>
        <input type="time" class="form-control form-control-sm" style="width: 110px;" value="${a.time || '08:00'}" data-field="time">
        <input type="text" class="form-control form-control-sm flex-grow-1" value="${a.title || ''}" placeholder="Atividade" data-field="title">
        <span class="fs-4 icon-preview" data-index="${i}">${a.icon || '🎵'}</span>
        <button type="button" class="btn btn-outline-secondary btn-sm btn-select-icon" data-index="${i}">🎨</button>
        <button type="button" class="btn btn-danger btn-sm btn-remove" onclick="CrecheNowNotifications.removeAgendaItem(${i})">🗑️</button>
      </div>
      <div class="icon-picker-container d-none" data-index="${i}">
        <div class="icon-picker">
          ${AVAILABLE_ICONS.map(icon => `
            <div class="icon-option ${a.icon === icon ? 'selected' : ''}" data-icon="${icon}" data-index="${i}">${icon}</div>
          `).join('')}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.agenda-date').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        const agenda = CrecheNowStorage.getAgenda();
        if (agenda[idx]) {
          agenda[idx].date = e.target.value;
          agenda[idx].day = getWeekday(e.target.value);
          CrecheNowStorage.setAgenda(agenda);
          renderAgendaEditor();
          renderAgenda();
          syncCardapioWithAgenda();
        }
      });
    });

    container.querySelectorAll('.btn-select-icon').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.index;
        const pickerContainer = container.querySelector(`.icon-picker-container[data-index="${idx}"]`);
        pickerContainer.classList.toggle('d-none');
      });
    });

    container.querySelectorAll('.icon-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const idx = opt.dataset.index;
        const icon = opt.dataset.icon;
        const agenda = CrecheNowStorage.getAgenda();
        if (agenda[idx]) {
          agenda[idx].icon = icon;
          CrecheNowStorage.setAgenda(agenda);
          renderAgendaEditor();
          renderAgenda();
        }
      });
    });
  };

  const renderCardapioEditor = () => {
    const container = document.getElementById('cardapioEditorContainer');
    if (!container) return;
    const cardapio = CrecheNowStorage.getCardapio();
    container.innerHTML = cardapio.map((c, i) => `
      <div class="editor-item" data-index="${i}">
        <input type="date" class="form-control form-control-sm cardapio-date" style="width: 140px;" value="${c.date || getTodayStr()}" data-index="${i}">
        <span class="day-preview">${c.day || getWeekday(c.date || getTodayStr())}</span>
        <input type="text" class="form-control form-control-sm flex-grow-1" value="${c.meal || ''}" placeholder="Refeição (deixe vazio se não houver aula)" data-field="meal">
        <button type="button" class="btn btn-danger btn-sm btn-remove" onclick="CrecheNowNotifications.removeCardapioItem(${i})">️</button>
      </div>
    `).join('');

    container.querySelectorAll('.cardapio-date').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        const cardapio = CrecheNowStorage.getCardapio();
        if (cardapio[idx]) {
          cardapio[idx].date = e.target.value;
          cardapio[idx].day = getWeekday(e.target.value);
          CrecheNowStorage.setCardapio(cardapio);
          renderCardapioEditor();
          renderCardapio();
        }
      });
    });
  };

  const syncCardapioWithAgenda = () => {
    const agenda = CrecheNowStorage.getAgenda();
    const cardapio = CrecheNowStorage.getCardapio();
    
    // Pegar datas únicas da agenda
    const agendaDates = [...new Set(agenda.map(a => a.date).filter(d => d))];
    const cardapioDates = cardapio.map(c => c.date);
    
    let changed = false;
    agendaDates.forEach(date => {
      if (!cardapioDates.includes(date)) {
        cardapio.push({
          date: date,
          day: getWeekday(date),
          meal: '' // vazio, será preenchido depois
        });
        changed = true;
      }
    });
    
    if (changed) {
      CrecheNowStorage.setCardapio(cardapio);
      renderCardapioEditor();
      renderCardapio();
    }
  };

  const removeAgendaItem = (index) => {
    const agenda = CrecheNowStorage.getAgenda();
    agenda.splice(index, 1);
    CrecheNowStorage.setAgenda(agenda);
    renderAgendaEditor();
    renderAgenda();
    CrecheNowNotifications.showToast('Item removido da agenda.');
  };

  const removeCardapioItem = (index) => {
    const cardapio = CrecheNowStorage.getCardapio();
    cardapio.splice(index, 1);
    CrecheNowStorage.setCardapio(cardapio);
    renderCardapioEditor();
    renderCardapio();
    CrecheNowNotifications.showToast('Item removido do cardápio.');
  };

  const renderRoutineForParent = (studentId) => {
    const todayContainer = document.getElementById('routine-today');
    const historyContainer = document.getElementById('routine-history');
    if (!todayContainer) return;

    const routines = CrecheNowStorage.getRoutinesByStudent(studentId);
    const todayRoutine = routines.find(r => new Date(r.date).toDateString() === new Date().toDateString());

    if (!todayRoutine) {
      todayContainer.innerHTML = '<p class="text-muted text-center mt-4">Nenhum registro de rotina para hoje ainda.</p>';
      todayContainer.onclick = null;
      if (historyContainer) historyContainer.innerHTML = '';
      return;
    }

    if (!todayRoutine.attendance) {
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

    const q = todayRoutine.questions;
    const statusIcon = (val) => val === 'sim' 
      ? '<span class="text-success fw-bold">✅ Sim</span>' 
      : '<span class="text-danger fw-bold">❌ Não</span>';
    
    todayContainer.innerHTML = `
      <div class="routine-grid">
        <div class="routine-item">Comportamento: ${statusIcon(q.behaved)}</div>
        <div class="routine-item">Atenção: ${statusIcon(q.attention)}</div>
        <div class="routine-item">Deveres: ${statusIcon(q.homework)}</div>
        <div class="routine-item">Colegas: ${statusIcon(q.peers)}</div>
        <div class="routine-item" style="grid-column: 1 / -1;">Alimentação: ${statusIcon(q.food)}</div>
      </div>
      ${todayRoutine.comment ? `<div class="click-hint">👆 Clique para ver detalhes</div>` : ''}
    `;

    todayContainer.onclick = () => {
      const modalContent = document.getElementById('routineModalContent');
      modalContent.innerHTML = `
        <button class="modal-close" onclick="document.getElementById('routineModal').classList.remove('active')">&times;</button>
        <h4 class="mb-3">👶 Rotina Completa de Hoje</h4>
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
            "${todayRoutine.comment}"
          </div>
        ` : '<p class="text-muted fst-italic">Sem comentários adicionais.</p>'}
        <div class="text-end mt-3">
          <small class="text-muted">Registrado em ${new Date(todayRoutine.date).toLocaleString('pt-BR')}</small>
        </div>
      `;
      openModal('routineModal');
    };
    todayContainer.style.cursor = todayRoutine.comment ? 'pointer' : 'default';

    if (historyContainer) {
      const historyRoutines = routines.slice(1);
      if (historyRoutines.length > 0) {
        historyContainer.innerHTML = '<h6 class="small fw-bold mb-2">Dias Anteriores:</h6>' + 
          historyRoutines.map(r => `
            <div class="border-bottom pb-2 mb-2 small">
              <div class="fw-bold text-muted">${new Date(r.date).toLocaleDateString('pt-BR')} ${!r.attendance ? '<span class="text-danger">(Faltou)</span>' : ''}</div>
              <div>${r.comment || 'Sem comentários.'}</div>
            </div>
          `).join('');
      } else {
        historyContainer.innerHTML = '<p class="text-muted small mb-0">Sem histórico anterior.</p>';
      }
    }
  };

  const renderTeacherDashboard = () => {
    const select = document.getElementById('routineStudentSelect');
    const msgStudentSelect = document.getElementById('teacherMsgStudent');
    const historyDiv = document.getElementById('teacher-routine-history');
    const studentsList = document.getElementById('teacher-students-list');
    const session = CrecheNowStorage.get('session');
    if (!session || session.role !== 'teacher') return;

    const students = CrecheNowStorage.getStudents().filter(s => s.class === session.class);
    
    const optionsHtml = '<option value="">Escolha um aluno...</option>' + 
      students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    if (select) select.innerHTML = optionsHtml;
    if (msgStudentSelect) msgStudentSelect.innerHTML = optionsHtml;

    if (studentsList) {
      const todayStr = new Date().toDateString();
      studentsList.innerHTML = students.map(s => {
        const todayRoutine = CrecheNowStorage.getRoutines().find(r => r.studentId === s.id && new Date(r.date).toDateString() === todayStr);
        let status = '<span class="text-muted small">—</span>';
        if (todayRoutine) {
          status = todayRoutine.attendance 
            ? '<span class="text-success">✅</span>' 
            : '<span class="text-danger">❌</span>';
        }
        return `<tr><td class="small">${s.name}</td><td>${status}</td></tr>`;
      }).join('');
    }

    if (historyDiv) {
      const allRoutines = CrecheNowStorage.getRoutines()
        .filter(r => r.teacherEmail === session.email)
        .sort((a,b) => new Date(b.date) - new Date(a.date))
        .slice(0, 15);
      
      historyDiv.innerHTML = allRoutines.length ? allRoutines.map(r => {
        const student = students.find(s => s.id === r.studentId);
        return `
          <div class="p-3 border-bottom">
            <div class="d-flex justify-content-between">
              <strong class="small">${student ? student.name : 'Aluno removido'}</strong>
              <small class="text-muted">${new Date(r.date).toLocaleDateString('pt-BR')}</small>
            </div>
            <small class="text-muted">${r.attendance ? '✅ Presente' : '❌ Falta'}</small>
            ${r.comment ? `<p class="small mb-0 mt-1 text-muted">"${r.comment}"</p>` : ''}
          </div>
        `;
      }).join('') : '<p class="text-center text-muted p-3 small">Nenhum registro ainda.</p>';
    }
  };

  const renderStudentManagement = () => {
    const tbody = document.getElementById('students-list');
    if (!tbody) return;
    const students = CrecheNowStorage.getStudents();
    tbody.innerHTML = students.map(s => `
      <tr>
        <td class="small">${s.name}</td>
        <td><span class="badge bg-info text-dark">Turma ${s.class}</span></td>
        <td>
          <select class="form-select form-select-sm d-inline-block w-auto me-1" style="font-size: 0.75rem;" onchange="CrecheNowNotifications.changeStudentClass(${s.id}, this.value)">
            <option value="A" ${s.class === 'A' ? 'selected' : ''}>A</option>
            <option value="B" ${s.class === 'B' ? 'selected' : ''}>B</option>
          </select>
          <button class="btn btn-sm btn-outline-danger py-0" style="font-size: 0.75rem;" onclick="CrecheNowNotifications.deleteStudent(${s.id})">️</button>
        </td>
      </tr>
    `).join('');
  };

  const changeStudentClass = (id, newClass) => {
    CrecheNowStorage.updateStudentClass(id, newClass);
    CrecheNowNotifications.showToast(`Aluno movido para Turma ${newClass}`);
    CrecheNowNotifications.renderStudentManagement();
  };

  const deleteStudent = (id) => {
    if(confirm('Tem certeza que deseja remover este aluno?')) {
      CrecheNowStorage.removeStudent(id);
      CrecheNowNotifications.renderStudentManagement();
      CrecheNowNotifications.showToast('Aluno removido.');
    }
  };

  const renderInbox = (tab = 'received') => {
    const container = document.getElementById('inbox-content');
    if (!container) return;
    const session = CrecheNowStorage.get('session');
    
    if (tab === 'received') {
      let items = [];
      if (session?.role === 'parent') {
        items = CrecheNowStorage.getNotifications();
      } else {
        items = CrecheNowStorage.getMessages();
      }
      
      container.innerHTML = items.length ? items.map(m => `
        <div class="message-item ${m.read ? '' : 'unread'}">
          <div class="msg-header">
            <strong>${m.title || m.parentName || 'Remetente'}</strong>
            <small>${CrecheNowNotifications.timeAgo(m.date)}</small>
          </div>
          <div class="msg-body">${m.body || m.message}</div>
          ${m.childName ? `<small class="text-muted">Criança: ${m.childName}</small>` : ''}
        </div>
      `).join('') : '<p class="text-center text-muted">Nenhuma mensagem recebida.</p>';
    } else {
      const sent = CrecheNowStorage.getMessages().filter(m => m.parentEmail === session?.email);
      container.innerHTML = sent.length ? sent.map(m => `
        <div class="message-item sent">
          <div class="msg-header">
            <strong>Para: Creche</strong>
            <small>${CrecheNowNotifications.timeAgo(m.date)}</small>
          </div>
          <div class="msg-body">${m.message}</div>
          <small class="text-muted">Criança: ${m.childName}</small>
        </div>
      `).join('') : '<p class="text-center text-muted">Nenhuma mensagem enviada.</p>';
    }
  };

  const renderTeacherInbox = (tab = 'received') => {
    const container = document.getElementById('teacher-inbox-content');
    if (!container) return;
    const session = CrecheNowStorage.get('session');
    
    if (tab === 'received') {
      const myStudents = CrecheNowStorage.getStudents().filter(s => s.class === session.class);
      const myStudentIds = myStudents.map(s => s.id);
      const items = CrecheNowStorage.getMessages().filter(m => myStudentIds.includes(parseInt(m.childId)));
      
      container.innerHTML = items.length ? items.map(m => {
        const student = myStudents.find(s => s.id === parseInt(m.childId));
        return `
          <div class="message-item ${m.read ? '' : 'unread'}">
            <div class="msg-header">
              <strong>${m.parentName}</strong>
              <small>${CrecheNowNotifications.timeAgo(m.date)}</small>
            </div>
            <div class="msg-body">${m.message}</div>
            <small class="text-muted">Criança: ${student ? student.name : m.childName}</small>
            ${!m.read ? `<button class="btn btn-sm btn-success mt-2 mark-teacher-msg-read" data-id="${m.id}">✓ Marcar como lido</button>` : '<span class="badge bg-success mt-2">Lido</span>'}
          </div>
        `;
      }).join('') : '<p class="text-center text-muted">Nenhuma mensagem recebida.</p>';

      container.querySelectorAll('.mark-teacher-msg-read').forEach(btn => {
        btn.addEventListener('click', () => {
          CrecheNowStorage.markMessageAsRead(parseInt(btn.dataset.id));
          renderTeacherInbox(tab);
          updateTeacherInboxBadge();
          CrecheNowNotifications.showToast('Mensagem marcada como lida.');
        });
      });
    } else {
      const sent = CrecheNowStorage.getMessages().filter(m => m.teacherEmail === session?.email);
      container.innerHTML = sent.length ? sent.map(m => {
        const student = CrecheNowStorage.getStudents().find(s => s.id === parseInt(m.childId));
        return `
          <div class="message-item sent">
            <div class="msg-header">
              <strong>Para: Responsável de ${student ? student.name : 'aluno'}</strong>
              <small>${CrecheNowNotifications.timeAgo(m.date)}</small>
            </div>
            <div class="msg-body">${m.message}</div>
          </div>
        `;
      }).join('') : '<p class="text-center text-muted">Nenhuma mensagem enviada.</p>';
    }
  };

  const renderParentMessagesForStaff = () => {
    const container = document.getElementById('parent-messages-list');
    if (!container) return;
    const msgs = CrecheNowStorage.getMessages();
    container.innerHTML = msgs.length ? msgs.map(m => `
      <div class="message-item ${m.read ? '' : 'unread'} mb-2">
        <div class="msg-header">
          <strong>${m.parentName}</strong>
          <small>${new Date(m.date).toLocaleString('pt-BR')}</small>
        </div>
        <div class="msg-body">${m.message}</div>
        <small class="text-muted">Criança: ${m.childName}</small>
        ${!m.read ? `<button class="btn btn-sm btn-success mt-2 mark-msg-read" data-id="${m.id}">✓ Marcar como lido</button>` : '<span class="badge bg-success mt-2">Lido</span>'}
      </div>
    `).join('') : '<p class="text-center text-muted">Nenhum recado dos pais.</p>';

    container.querySelectorAll('.mark-msg-read').forEach(btn => {
      btn.addEventListener('click', () => {
        CrecheNowStorage.markMessageAsRead(parseInt(btn.dataset.id));
        renderParentMessagesForStaff();
        updateInboxBadge();
        CrecheNowNotifications.showToast('Recado marcado como lido.');
      });
    });
  };

  const updateInboxBadge = () => {
    const badge = document.getElementById('inboxBadge');
    if (!badge) return;
    const session = CrecheNowStorage.get('session');
    let unread = 0;
    if (session?.role === 'parent') {
      unread = CrecheNowStorage.getNotifications().filter(n => !n.read).length;
    }
    if (unread > 0) {
      badge.textContent = unread;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  };

  const updateTeacherInboxBadge = () => {
    const badge = document.getElementById('teacherInboxBadge');
    if (!badge) return;
    const session = CrecheNowStorage.get('session');
    if (!session || session.role !== 'teacher') return;
    
    const myStudents = CrecheNowStorage.getStudents().filter(s => s.class === session.class);
    const myStudentIds = myStudents.map(s => s.id);
    const unread = CrecheNowStorage.getMessages().filter(m => 
      myStudentIds.includes(parseInt(m.childId)) && !m.read
    ).length;
    
    if (unread > 0) {
      badge.textContent = unread;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  };

  const renderSent = () => {
    const tbody = document.getElementById('sent-notifications');
    if (!tbody) return;
    const notifs = CrecheNowStorage.getNotifications();
    tbody.innerHTML = notifs.length ? notifs.map(s => `
      <tr>
        <td class="small">${s.title}</td>
        <td><span class="badge bg-light text-dark border">${s.type}</span></td>
        <td class="small text-muted">${new Date(s.date).toLocaleDateString('pt-BR')}</td>
      </tr>
    `).join('') : '<tr><td colspan="3" class="text-center text-muted py-3 small">Nenhum envio registrado</td></tr>';
  };

  const showToast = (msg, type = 'success') => {
    const container = document.getElementById('toast-container') || document.body;
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${type} border-0 show`;
    toastEl.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button></div>`;
    container.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 4000);
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Agora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h atrás`;
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const initRealTimeSync = () => {
    window.addEventListener('storage', (e) => {
      if (e.key === 'crechenow_notifications') {
        renderFeed();
        updateInboxBadge();
      }
      if (e.key === 'crechenow_parent_messages') {
        renderParentMessagesForStaff();
        updateInboxBadge();
        updateTeacherInboxBadge();
      }
      if (e.key === 'crechenow_routines') {
        const session = CrecheNowStorage.get('session');
        if (session?.role === 'parent') {
           const student = CrecheNowStorage.getStudents().find(s => s.parentEmail === session.email);
           if(student) renderRoutineForParent(student.id);
        }
        if (session?.role === 'teacher') renderTeacherDashboard();
      }
      if (e.key === 'crechenow_students') renderStudentManagement();
      if (e.key === 'crechenow_agenda') { 
        renderAgenda(); 
        renderAgendaEditor(); 
        syncCardapioWithAgenda();
      }
      if (e.key === 'crechenow_cardapio') { 
        renderCardapio(); 
        renderCardapioEditor(); 
      }
    });
  };

  return {
    initModalHandlers,
    renderFeed, renderAgenda, renderCardapio,
    renderAgendaEditor, renderCardapioEditor,
    removeAgendaItem, removeCardapioItem,
    syncCardapioWithAgenda,
    renderRoutineForParent, renderTeacherDashboard,
    renderStudentManagement, changeStudentClass, deleteStudent,
    renderInbox, renderTeacherInbox, renderParentMessagesForStaff,
    updateInboxBadge, updateTeacherInboxBadge,
    renderSent, showToast, timeAgo, initRealTimeSync,
    openModal, closeModal
  };
})();
