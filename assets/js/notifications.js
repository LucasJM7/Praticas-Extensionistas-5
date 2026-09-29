const CrecheNowNotifications = (() => {
  return {
    renderFeed: (filter = 'all') => {
      const container = document.getElementById('carousel-inner-notifs');
      if (!container) return;
      container.innerHTML = '';
      
      const allNotifs = CrecheNowStorage.getNotifications();
      const filtered = allNotifs.filter(n => filter === 'all' || n.type === filter);

      if (filtered.length === 0) {
        container.innerHTML = '<div class="carousel-item active"><div class="card-body text-center text-muted py-5">Nenhum comunicado encontrado.</div></div>';
        return;
      }

      filtered.forEach((n, index) => {
        const isActive = index === 0 ? 'active' : '';
        const el = document.createElement('div');
        el.className = `carousel-item ${isActive}`;
        el.innerHTML = `
          <div class="card border-0 rounded-0 notify-card ${n.read ? '' : 'unread'}" style="min-height: 150px;">
            <div class="card-body p-4 d-flex flex-column justify-content-center">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="card-title fw-bold mb-0">${n.title}</h5>
                <span class="badge ${n.read ? 'bg-secondary' : 'bg-warning text-dark'}">${n.read ? 'Lido' : 'Novo'}</span>
              </div>
              <p class="card-text text-muted mb-3">${n.body}</p>
              <div class="d-flex justify-content-between align-items-center mt-auto">
                <small class="text-muted">${CrecheNowNotifications.timeAgo(n.date)}</small>
                ${!n.read ? `<button class="btn btn-sm btn-outline-primary mark-read" data-id="${n.id}">Marcar como lido</button>` : ''}
              </div>
            </div>
          </div>
        `;
        container.appendChild(el);
      });

      document.querySelectorAll('.mark-read').forEach(btn => {
        btn.addEventListener('click', () => {
          CrecheNowStorage.markAsRead(parseInt(btn.dataset.id));
          CrecheNowNotifications.renderFeed(filter);
          CrecheNowNotifications.showToast('Notificação marcada como lida.');
        });
      });
    },

    renderAgenda: () => {
      const container = document.getElementById('agenda-list');
      if (!container) return;
      const agenda = CrecheNowStorage.getAgenda();
      container.innerHTML = agenda.map(a => `
        <div class="agenda-card d-flex align-items-center p-2 mb-2 bg-white rounded shadow-sm">
          <div class="agenda-icon me-2 fs-4">${a.icon}</div>
          <div class="flex-grow-1">
            <strong class="d-block text-primary small">${a.title}</strong>
            <small class="text-muted" style="font-size: 0.75rem;">${a.day} • ${a.time}</small>
          </div>
        </div>
      `).join('');
    },

    renderCardapio: () => {
      const container = document.getElementById('cardapio-list');
      if (!container) return;
      const cardapio = CrecheNowStorage.getCardapio();
      container.innerHTML = cardapio.map(c => `
        <div class="cardapio-item d-flex align-items-start p-2 mb-2 bg-white rounded border-start border-3 border-success">
          <div class="fw-bold text-success me-2 small" style="min-width: 40px;">${c.day}</div>
          <div class="small text-muted">${c.meal}</div>
        </div>
      `).join('');
    },

    // --- NOVAS FUNÇÕES DE ROTINA ---
    renderRoutineForParent: (studentId) => {
      const todayContainer = document.getElementById('routine-today');
      const historyContainer = document.getElementById('routine-history');
      if (!todayContainer) return;

      const routines = CrecheNowStorage.getRoutinesByStudent(studentId);
      const todayRoutine = routines.find(r => new Date(r.date).toDateString() === new Date().toDateString());

      if (!todayRoutine) {
        todayContainer.innerHTML = '<p class="text-muted small text-center mb-0">Nenhum registro de rotina para hoje ainda.</p>';
        historyContainer.innerHTML = '';
        return;
      }

      const q = todayRoutine.questions;
      const statusIcon = (val) => val === 'sim' ? '<span class="text-success">✅ Sim</span>' : '<span class="text-danger">❌ Não</span>';
      
      todayContainer.innerHTML = `
        <div class="row g-2 small">
          <div class="col-6">Comportamento: ${statusIcon(q.behaved)}</div>
          <div class="col-6">Atenção: ${statusIcon(q.attention)}</div>
          <div class="col-6">Deveres: ${statusIcon(q.homework)}</div>
          <div class="col-6">Colegas: ${statusIcon(q.peers)}</div>
          <div class="col-12">Alimentação: ${statusIcon(q.food)}</div>
          ${todayRoutine.comment ? `<div class="col-12 mt-2 p-2 bg-light rounded"><em>"${todayRoutine.comment}"</em></div>` : ''}
        </div>
      `;

      // Histórico
      const historyRoutines = routines.slice(1); // Pula o de hoje
      if (historyRoutines.length > 0) {
        historyContainer.innerHTML = '<h6 class="small fw-bold mb-2">Dias Anteriores:</h6>' + 
          historyRoutines.map(r => `
            <div class="border-bottom pb-2 mb-2 small">
              <div class="fw-bold text-muted">${new Date(r.date).toLocaleDateString('pt-BR')}</div>
              <div>${r.comment || 'Sem comentários.'}</div>
            </div>
          `).join('');
      } else {
        historyContainer.innerHTML = '<p class="text-muted small">Sem histórico anterior.</p>';
      }
    },

    renderTeacherDashboard: () => {
      const select = document.getElementById('routineStudentSelect');
      const historyDiv = document.getElementById('teacher-routine-history');
      const session = CrecheNowStorage.get('session');
      if (!select || !session || session.role !== 'teacher') return;

      const students = CrecheNowStorage.getStudents().filter(s => s.class === session.class);
      select.innerHTML = '<option value="">Escolha um aluno...</option>' + 
        students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

      const allRoutines = CrecheNowStorage.getRoutines().filter(r => r.teacherEmail === session.email).slice(0, 10);
      historyDiv.innerHTML = allRoutines.length ? allRoutines.map(r => {
        const student = students.find(s => s.id === r.studentId);
        return `
          <div class="p-3 border-bottom">
            <div class="d-flex justify-content-between">
              <strong>${student ? student.name : 'Aluno removido'}</strong>
              <small class="text-muted">${new Date(r.date).toLocaleDateString('pt-BR')}</small>
            </div>
            <small class="text-muted">Presença: ${r.attendance ? '✅' : '❌'}</small>
            ${r.comment ? `<p class="small mb-0 mt-1 text-muted">"${r.comment}"</p>` : ''}
          </div>
        `;
      }).join('') : '<p class="text-center text-muted p-3">Nenhum registro ainda.</p>';
    },

    renderStudentManagement: () => {
      const tbody = document.getElementById('students-list');
      if (!tbody) return;
      const students = CrecheNowStorage.getStudents();
      tbody.innerHTML = students.map(s => `
        <tr>
          <td>${s.name}</td>
          <td><span class="badge bg-info text-dark">Turma ${s.class}</span></td>
          <td class="small text-muted">${s.parentEmail}</td>
          <td>
            <select class="form-select form-select-sm d-inline-block w-auto me-1" onchange="CrecheNowNotifications.changeStudentClass(${s.id}, this.value)">
              <option value="A" ${s.class === 'A' ? 'selected' : ''}>A</option>
              <option value="B" ${s.class === 'B' ? 'selected' : ''}>B</option>
            </select>
            <button class="btn btn-sm btn-outline-danger" onclick="CrecheNowNotifications.deleteStudent(${s.id})">🗑️</button>
          </td>
        </tr>
      `).join('');
    },

    changeStudentClass: (id, newClass) => {
      CrecheNowStorage.updateStudentClass(id, newClass);
      CrecheNowNotifications.showToast(`Aluno movido para Turma ${newClass}`);
      CrecheNowNotifications.renderStudentManagement();
    },

    deleteStudent: (id) => {
      if(confirm('Tem certeza que deseja remover este aluno?')) {
        CrecheNowStorage.removeStudent(id);
        CrecheNowNotifications.renderStudentManagement();
        CrecheNowNotifications.showToast('Aluno removido.');
      }
    },

    showToast: (msg, type = 'success') => {
      const container = document.getElementById('toast-container') || document.body;
      const toastEl = document.createElement('div');
      toastEl.className = `toast align-items-center text-bg-${type} border-0 show`;
      toastEl.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button></div>`;
      container.appendChild(toastEl);
      setTimeout(() => toastEl.remove(), 4000);
    },

    timeAgo: (date) => {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      if (seconds < 60) return 'Agora';
      if (seconds < 3600) return `${Math.floor(seconds / 60)} min atrás`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)} h atrás`;
      return new Date(date).toLocaleDateString('pt-BR');
    },

    initRealTimeSync: () => {
      window.addEventListener('storage', (e) => {
        if (e.key === 'crechenow_notifications') CrecheNowNotifications.renderFeed();
        if (e.key === 'crechenow_routines') {
          const session = CrecheNowStorage.get('session');
          if (session?.role === 'parent') {
             // Em um app real, filtraríamos pelo ID da criança da sessão
             const student = CrecheNowStorage.getStudents().find(s => s.parentEmail === session.email);
             if(student) CrecheNowNotifications.renderRoutineForParent(student.id);
          }
          if (session?.role === 'teacher') CrecheNowNotifications.renderTeacherDashboard();
        }
        if (e.key === 'crechenow_students') CrecheNowNotifications.renderStudentManagement();
      });
    }
  };
})();
