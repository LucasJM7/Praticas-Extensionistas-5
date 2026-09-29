document.addEventListener('DOMContentLoaded', () => {
  CrecheNowAuth.init();
  CrecheNowAuth.checkSession();
  
  if (typeof CrecheNowNotifications !== 'undefined') {
    CrecheNowNotifications.initRealTimeSync();
    CrecheNowNotifications.initModalHandlers();
  }

  const session = CrecheNowStorage.get('session');
  if (session) {
    const nameDisplay = document.getElementById('userNameDisplay') || document.getElementById('teacherInfo');
    if (nameDisplay) nameDisplay.textContent = session.name + (session.class ? ` (Turma ${session.class})` : '');
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!loginForm.checkValidity()) { loginForm.classList.add('was-validated'); return; }
      const email = document.getElementById('email').value;
      const senha = document.getElementById('senha').value;
      const lgpd = document.getElementById('lgpdConsent').checked;
      const res = CrecheNowAuth.login(email, senha, lgpd);
      if (res.success) {
        const newSession = CrecheNowStorage.get('session');
        const roleMap = { 'parent': 'dashboard-parent.html', 'secretary': 'dashboard-staff.html', 'teacher': 'dashboard-teacher.html' };
        window.location.href = roleMap[newSession.role];
      } else {
        CrecheNowNotifications.showToast(res.msg, 'danger');
      }
    });
    document.getElementById('demoAccess')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('email').value = 'pai@email.com';
      document.getElementById('senha').value = '123456';
      document.getElementById('lgpdConsent').checked = true;
    });
  }

  const staffForm = document.getElementById('staffForm');
  if (staffForm) {
    staffForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!staffForm.checkValidity()) { staffForm.classList.add('was-validated'); return; }
      const newNotif = {
        title: document.getElementById('notifyTitle').value,
        body: document.getElementById('notifyBody').value,
        type: document.getElementById('notifyType').value,
        target: document.getElementById('notifyTarget').value,
      };
      CrecheNowStorage.addNotification(newNotif);
      staffForm.reset(); 
      staffForm.classList.remove('was-validated');
      CrecheNowNotifications.showToast('Comunicado enviado!');
      CrecheNowNotifications.renderSent();
    });
  }

  const addStudentForm = document.getElementById('addStudentForm');
  if (addStudentForm) {
    addStudentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      CrecheNowStorage.addStudent({
        name: document.getElementById('newStudentName').value,
        class: document.getElementById('newStudentClass').value,
        parentEmail: document.getElementById('newStudentParentEmail').value
      });
      addStudentForm.reset();
      CrecheNowNotifications.showToast('Aluno cadastrado com sucesso!');
      CrecheNowNotifications.renderStudentManagement();
      CrecheNowNotifications.closeModal('addStudentModal');
    });
    CrecheNowNotifications.renderStudentManagement();
  }

  document.getElementById('openAddStudentBtn')?.addEventListener('click', () => {
    CrecheNowNotifications.openModal('addStudentModal');
  });

  const agendaEditorForm = document.getElementById('agendaEditorForm');
  if (agendaEditorForm) {
    CrecheNowNotifications.renderAgendaEditor();
    
    document.getElementById('openAgendaEditorBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderAgendaEditor();
      CrecheNowNotifications.openModal('agendaEditorModal');
    });

    document.getElementById('addAgendaItemBtn')?.addEventListener('click', () => {
      const agenda = CrecheNowStorage.getAgenda();
      agenda.push({ day: 'Seg', time: '08:00', title: 'Nova atividade', icon: '📌' });
      CrecheNowStorage.setAgenda(agenda);
      CrecheNowNotifications.renderAgendaEditor();
    });

    agendaEditorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const items = document.querySelectorAll('#agendaEditorContainer .editor-item');
      const newAgenda = Array.from(items).map(item => ({
        day: item.querySelector('[data-field="day"]').value,
        time: item.querySelector('[data-field="time"]').value,
        title: item.querySelector('[data-field="title"]').value,
        icon: item.querySelector('[data-field="icon"]').value
      }));
      CrecheNowStorage.setAgenda(newAgenda);
      CrecheNowNotifications.showToast('Agenda atualizada!');
      CrecheNowNotifications.closeModal('agendaEditorModal');
    });
  }

  const cardapioEditorForm = document.getElementById('cardapioEditorForm');
  if (cardapioEditorForm) {
    CrecheNowNotifications.renderCardapioEditor();
    
    document.getElementById('openCardapioEditorBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderCardapioEditor();
      CrecheNowNotifications.openModal('cardapioEditorModal');
    });

    document.getElementById('addCardapioItemBtn')?.addEventListener('click', () => {
      const cardapio = CrecheNowStorage.getCardapio();
      cardapio.push({ day: 'Seg', meal: 'Nova refeição' });
      CrecheNowStorage.setCardapio(cardapio);
      CrecheNowNotifications.renderCardapioEditor();
    });

    cardapioEditorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const items = document.querySelectorAll('#cardapioEditorContainer .editor-item');
      const newCardapio = Array.from(items).map(item => ({
        day: item.querySelector('[data-field="day"]').value,
        meal: item.querySelector('[data-field="meal"]').value
      }));
      CrecheNowStorage.setCardapio(newCardapio);
      CrecheNowNotifications.showToast('Cardápio atualizado!');
      CrecheNowNotifications.closeModal('cardapioEditorModal');
    });
  }

  const teacherRoutineForm = document.getElementById('teacherRoutineForm');
  if (teacherRoutineForm) {
    document.getElementById('teacherClassDisplay').textContent = session?.class || '';
    CrecheNowNotifications.renderTeacherDashboard();

    teacherRoutineForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const studentId = parseInt(document.getElementById('routineStudentSelect').value);
      if (!studentId) {
        CrecheNowNotifications.showToast('Selecione um aluno.', 'warning');
        return;
      }

      const getRadio = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value || 'nao';

      const newRoutine = {
        studentId: studentId,
        teacherEmail: session.email,
        attendance: document.getElementById('routineAttendance').checked,
        questions: {
          behaved: getRadio('q1'),
          attention: getRadio('q2'),
          homework: getRadio('q3'),
          peers: getRadio('q4'),
          food: getRadio('q5')
        },
        comment: document.getElementById('routineComment').value
      };

      CrecheNowStorage.addRoutine(newRoutine);
      teacherRoutineForm.reset();
      document.getElementById('routineAttendance').checked = true;
      CrecheNowNotifications.showToast('Rotina registrada com sucesso!');
      CrecheNowNotifications.renderTeacherDashboard();
    });
  }

  if (session?.role === 'parent') {
    const student = CrecheNowStorage.getStudents().find(s => s.parentEmail === session.email) || CrecheNowStorage.getStudents()[0];
    if (student) {
      document.getElementById('childName').value = student.name;
      CrecheNowNotifications.renderRoutineForParent(student.id);
    }

    document.getElementById('openMsgModalBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.openModal('msgModal');
    });

    document.getElementById('openInboxModalBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderInbox('received');
      CrecheNowNotifications.openModal('inboxModal');
    });

    document.querySelectorAll('[data-inbox-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-inbox-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        CrecheNowNotifications.renderInbox(btn.dataset.inboxTab);
      });
    });

    document.getElementById('toggleRoutineHistory')?.addEventListener('click', () => {
      const hist = document.getElementById('routine-history');
      hist.classList.toggle('d-none');
    });

    const parentMsgForm = document.getElementById('parentMsgForm');
    if (parentMsgForm) {
      parentMsgForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!parentMsgForm.checkValidity()) { parentMsgForm.classList.add('was-validated'); return; }
        
        CrecheNowStorage.addMessage({
          parentName: session.name,
          parentEmail: session.email,
          message: document.getElementById('parentMessage').value,
          childName: document.getElementById('childName').value
        });
        parentMsgForm.reset();
        parentMsgForm.classList.remove('was-validated');
        CrecheNowNotifications.showToast('Recado enviado para a creche!');
        CrecheNowNotifications.closeModal('msgModal');
      });
    }

    CrecheNowNotifications.updateInboxBadge();
  }

  if (session?.role === 'secretary') {
    const header = document.querySelector('.card-header.bg-primary');
    if (header && !document.getElementById('openParentMsgsBtn')) {
      const btn = document.createElement('button');
      btn.id = 'openParentMsgsBtn';
      btn.className = 'btn btn-sm btn-light';
      btn.textContent = '📬 Recados';
      btn.addEventListener('click', () => {
        CrecheNowNotifications.renderParentMessagesForStaff();
        CrecheNowNotifications.openModal('parentMsgsModal');
      });
      header.appendChild(btn);
    }
    CrecheNowNotifications.renderSent();
    CrecheNowNotifications.updateInboxBadge();
  }

  document.getElementById('logoutBtn')?.addEventListener('click', CrecheNowAuth.logout);

  document.querySelectorAll('[data-filter]')?.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      CrecheNowNotifications.renderFeed(btn.dataset.filter);
    });
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log('SW registrado'))
      .catch(err => console.error('SW falha:', err));
  }

  if (window.location.pathname.includes('dashboard')) {
    CrecheNowNotifications.renderFeed();
    CrecheNowNotifications.renderAgenda();
    CrecheNowNotifications.renderCardapio();
    setInterval(CrecheNowStorage.processQueue, 60000);
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      if (confirm('⚠️ MODO TESTE: Limpar todos os dados salvos e recarregar?')) {
        localStorage.clear();
        window.location.reload();
      }
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
  });
});
