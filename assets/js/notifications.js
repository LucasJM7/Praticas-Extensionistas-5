const CrecheNowNotifications = (() => {

  // ===== HELPERS DE MODAL =====
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

  // ===== CARROSSEL DE COMUNICADOS =====
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
        CrecheNowNotifications.showToast('Notificação marcada como lida.');
      });
    });
  };

  // ===== AGENDA E CARDÁPIO =====
  const renderAgenda = () => {
    const container = document.getElementById('agenda-list');
    if (!container) return;
    const agenda = CrecheNowStorage.getAgenda();
    container.innerHTML = agenda.map(a => `
      <div class="agenda-card">
        <div class="agenda-icon me-2 fs-4">${a.icon}</div>
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
    container.innerHTML = cardapio.map(c => `
      <div class="cardapio-item">
        <div class="fw-bold text-success me-2" style="min-width: 40px; font-size: 0.9rem;">${c.day}</div>
        <div class="small text-muted">${c.meal}</div>
      </div>
    `).join('');
  };

  // ===== ROTINA DIÁRIA (PAIS) =====
  const renderRoutineForParent = (studentId) => {
    const todayContainer = document.getElementById('routine-today');
    const historyContainer = document.getElementById('routine-history');
    if (!todayContainer) return;

    const routines = CrecheNowStorage.getRoutinesByStudent(studentId);
    const todayRoutine = routines.find(r => new Date(r.date).toDateString() === new Date().toDateString());

    if (!todayRoutine) {
      todayContainer.innerHTML = '<p class="text-muted text-center mt-4">Nenhum registro de rotina para hoje ainda.</p>';
      if (historyContainer) historyContainer.innerHTML = '';
      return;
    }

    // Se o aluno faltou
    if (!todayRoutine.attendance) {
      todayContainer.innerHTML = `
        <div class="absent-message">
          <div>
            <div style="font-size: 2.5rem;">😷</div>
            <div class="mt-2">A criança não foi hoje</div>
          </div>
        </div>
      `;
      if (historyContainer) historyContainer.innerHTML = '';
      return;
    }

    const q = todayRoutine.questions;
    const statusIcon = (val) => val === 'sim' 
      ? '<span class="text-success fw-bold">✅ Sim</span>' 
      : '<span class="text-danger fw-bold">❌ Não</span>';
    
    // Preview (sem comentário)
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

    // Clique para expandir
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

    // Histórico
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

  // ===== PAINEL DO PROFESSOR =====
  const renderTeacherDashboard = () => {
    const select = document.getElementById('routineStudentSelect');
    const historyDiv = document.getElementById('teacher-routine-history');
    const studentsList = document.getElementById('teacher-students-list');
    const session = CrecheNowStorage.get('session');
    if (!session || session.role !== 'teacher') return;

    const students = CrecheNowStorage.getStudents().filter(s => s.class === session.class);
    
    if (select) {
      select.innerHTML = '<option value="">Escolha um aluno...</option>' + 
        students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }

    // Lista de alunos da turma com status de hoje
    if (studentsList) {
      const todayStr = new Date().toDateString();
      studentsList.innerHTML = students.map(s => {
        const todayRoutine = CrecheNowStorage.getRoutines().find(r => r.studentId === s.id && new Date(r.date).toDateString() === todayStr);
        let status = '<span class="text-muted small">—</span>';
        if (todayRoutine) {
          status = todayRoutine.attendance 
            ? '<span class="text-success">✅</span>' 
            : '<span class="text-danger"></span>';
        }
        return `<tr><td class="small">${s.name}</td><td>${status}</td></tr>`;
      }).join('');
    }

    // Histórico de registros
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

  // ===== GESTÃO DE ALUNOS (SECRETARIA) =====
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
          <button class="btn btn-sm btn-outline-danger py-0" style="font-size: 0.75rem;" onclick="CrecheNowNotifications.deleteStudent(${s.id})">🗑️</button>
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

  // ===== MENSAGENS (PAIS E SECRETARIA) =====
  const renderInbox = (tab = 'received') => {
    const container = document.getElementById('inbox-content');
    if (!container) return;
    const session = CrecheNowStorage.get('session');
    
    if (tab === 'received') {
      // Pais veem comunicados; Secretaria vê recados dos pais
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
      // Mensagens enviadas (apenas pais têm)
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
        CrecheNowNotifications.renderParentMessagesForStaff();
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
    } else {
      unread = CrecheNowStorage.getMessages().filter(m => !m.read).length;
    }
    if (unread > 0) {
      badge.textContent = unread;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  };

  // ===== HISTÓRICO DE ENVIOS (SECRETARIA) =====
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

  // ===== TOAST E UTILS =====
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
    });
  };

  return {
    initModalHandlers,
    renderFeed, renderAgenda, renderCardapio,
    renderRoutineForParent, renderTeacherDashboard,
    renderStudentManagement, changeStudentClass, deleteStudent,
    renderInbox, renderParentMessagesForStaff, updateInboxBadge,
    renderSent, showToast, timeAgo, initRealTimeSync,
    openModal, closeModal
  };
})();
