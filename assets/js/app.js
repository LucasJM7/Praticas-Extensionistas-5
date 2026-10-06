document.addEventListener('DOMContentLoaded', () => {
  const { utils } = CrecheNowConfig;
  CrecheNowAuth.init();
  CrecheNowAuth.checkSession();
  CrecheNowNotifications.initModalHandlers();
  CrecheNowNotifications.initRealTimeSync();

  const session = CrecheNowStorage.getSession();
  const nameDisplay = document.getElementById('userNameDisplay') || document.getElementById('teacherInfo');
  if (session && nameDisplay) {
    nameDisplay.textContent = session.name + (session.class ? ` (Turma ${session.class})` : '') + (session.isJunior ? ' [Júnior]' : '');
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!loginForm.checkValidity()) { loginForm.classList.add('was-validated'); return; }
      const res = CrecheNowAuth.login(
        document.getElementById('email').value.trim(),
        document.getElementById('senha').value,
        document.getElementById('lgpdConsent').checked
      );
      if (res.success) {
        const s = CrecheNowStorage.getSession();
        const map = { parent: 'dashboard-parent.html', secretary: 'dashboard-staff.html', teacher: 'dashboard-teacher.html' };
        window.location.href = CrecheNowConfig.BASE_PATH + map[s.role];
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

  if (session?.role === 'parent') {
    const parent = CrecheNowStorage.getPerson(session.personId);
    const kids = (parent?.linkedStudentIds || []).map(id => CrecheNowStorage.getPerson(id)).filter(Boolean);
    const childSelect = document.getElementById('childSelect');
    if (childSelect && kids.length) {
      childSelect.innerHTML = kids.map(k => `<option value="${k.id}">${utils.escapeHtml(k.name)} — Turma ${utils.escapeHtml(k.class)}</option>`).join('');
      childSelect.addEventListener('change', () => CrecheNowNotifications.renderRoutineForParent(childSelect.value));
      CrecheNowNotifications.renderRoutineForParent(childSelect.value);
    } else {
      const any = CrecheNowStorage.getStudents()[0];
      if (any) CrecheNowNotifications.renderRoutineForParent(any.id);
    }

    document.getElementById('toggleRoutineHistory')?.addEventListener('click', () => {
      document.getElementById('routine-history').classList.toggle('d-none');
    });

    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        CrecheNowNotifications.renderFeed(btn.dataset.filter);
      });
    });

    document.getElementById('openMsgModalBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderMessageForm();
      CrecheNowNotifications.openModal('messageFormModal');
    });
    document.getElementById('messageFormBody')?.addEventListener('click', CrecheNowNotifications.handleSendMessage);

    document.getElementById('openInboxModalBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderInbox('received');
      CrecheNowStorage.getNotifications().filter(n => !n.read).forEach(n => CrecheNowStorage.markAsRead(n.id));
      CrecheNowNotifications.updateInboxBadge();
      CrecheNowNotifications.openModal('inboxModal');
    });
    document.querySelectorAll('[data-inbox-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-inbox-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        CrecheNowNotifications.renderInbox(btn.dataset.inboxTab);
      });
    });

    document.getElementById('openMyDataBtn')?.addEventListener('click', CrecheNowNotifications.renderMyData);
    document.getElementById('myDataBody')?.addEventListener('click', CrecheNowNotifications.handleExportMyData);

    CrecheNowNotifications.renderFeed();
    CrecheNowNotifications.renderAgenda();
    CrecheNowNotifications.renderCardapio();
    CrecheNowNotifications.updateInboxBadge();
  }

  if (session?.role === 'secretary') {
    // Comunicados
    document.getElementById('openNoticeBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderNoticeForm();
      CrecheNowNotifications.openModal('noticeFormModal');
    });
    document.getElementById('noticeFormBody')?.addEventListener('click', CrecheNowNotifications.handleSendNotice);

    document.getElementById('openMessageBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderMessageForm();
      CrecheNowNotifications.openModal('messageFormModal');
    });
    document.getElementById('messageFormBody')?.addEventListener('click', CrecheNowNotifications.handleSendMessage);

    document.getElementById('openParentMsgsBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderParentMessagesForStaff();
      CrecheNowNotifications.openModal('parentMsgsModal');
    });

    document.getElementById('openAgendaEditorBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderAgendaEditor();
      CrecheNowNotifications.openModal('agendaEditorModal');
    });
    document.getElementById('agendaEditorContainer')?.addEventListener('click', CrecheNowNotifications.handleAgendaEditorDelegation);
    document.getElementById('agendaEditorForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      CrecheNowNotifications.saveAgendaFromEditor();
    });

    document.getElementById('openCardapioEditorBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderCardapioEditor();
      CrecheNowNotifications.openModal('cardapioEditorModal');
    });
    document.getElementById('cardapioEditorContainer')?.addEventListener('click', CrecheNowNotifications.handleCardapioEditorDelegation);
    document.getElementById('cardapioEditorForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      CrecheNowNotifications.saveCardapioFromEditor();
    });

    document.getElementById('openSchoolCalendarBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderSchoolCalendarEditor();
      CrecheNowNotifications.openModal('schoolCalendarModal');
    });
    document.getElementById('schoolCalendarBody')?.addEventListener('click', CrecheNowNotifications.saveSchoolCalendar);

    document.getElementById('openCalendarBtn')?.addEventListener('click', () => {
      const body = document.getElementById('calendarViewBody');
      body.dataset.mode = 'month';
      body.dataset.ref = utils.todayISO();
      CrecheNowNotifications.renderCalendarView('month');
      CrecheNowNotifications.openModal('calendarModal');
    });
    document.getElementById('calendarViewHeader')?.addEventListener('click', CrecheNowNotifications.handleCalendarDelegation);
    document.getElementById('calendarViewBody')?.addEventListener('click', CrecheNowNotifications.handleCalendarDelegation);
    document.getElementById('cal-mode-month')?.addEventListener('click', () => {
      document.getElementById('calendarViewBody').dataset.mode = 'month';
      CrecheNowNotifications.renderCalendarView('month');
    });
    document.getElementById('cal-mode-year')?.addEventListener('click', () => {
      document.getElementById('calendarViewBody').dataset.mode = 'year';
      CrecheNowNotifications.renderCalendarView('year');
    });

    if (CrecheNowAuth.canManagePeople()) {
      CrecheNowNotifications.renderStudentManagement();
      CrecheNowNotifications.renderTeachersList();
      CrecheNowNotifications.renderParentsList();
      CrecheNowNotifications.renderLoginsList();

      document.getElementById('students-list')?.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-action="open-student"]');
        if (row) CrecheNowNotifications.openStudentDetail(row.dataset.id);
      });
      document.getElementById('studentDetailBody')?.addEventListener('click', CrecheNowNotifications.handleStudentDetailDelegation);

      document.getElementById('teachers-list')?.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-action="open-person"]');
        if (row) CrecheNowNotifications.openPersonDetail(row.dataset.id);
      });
      document.getElementById('parents-list')?.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-action="open-person"]');
        if (row) CrecheNowNotifications.openPersonDetail(row.dataset.id);
      });
      document.getElementById('personFormBody')?.addEventListener('click', (e) => {
        CrecheNowNotifications.handlePersonFormDelegation(e);
        CrecheNowNotifications.handlePersonFormUpdateDelete(e);
      });
      document.querySelectorAll('[data-person-type]').forEach(btn => {
        btn.addEventListener('click', () => {
          CrecheNowNotifications.renderPersonForm(btn.dataset.personType);
          CrecheNowNotifications.openModal('personFormModal');
        });
      });

      document.getElementById('openAddLoginBtn')?.addEventListener('click', () => {
        CrecheNowNotifications.renderLoginForm();
        CrecheNowNotifications.openModal('loginFormModal');
      });
      document.getElementById('loginFormBody')?.addEventListener('click', CrecheNowNotifications.handleCreateLogin);
      document.getElementById('loginFormBody')?.addEventListener('change', (e) => {
        if (e.target.id === 'lf-role') CrecheNowNotifications.handleLoginRoleChange();
      });
      document.getElementById('logins-list')?.addEventListener('click', CrecheNowNotifications.handleDeleteLogin);
    } else {
      ['openAddPersonBtn', 'openAddLoginBtn', 'openSchoolCalendarBtn', 'openAgendaEditorBtn', 'openCardapioEditorBtn']
        .forEach(id => { const b = document.getElementById(id); if (b) b.style.display = 'none'; });
    }

    CrecheNowNotifications.renderSent();
    CrecheNowNotifications.updateInboxBadge();
  }

  if (session?.role === 'teacher') {
    document.getElementById('teacherClassDisplay').textContent = session.class || '';
    CrecheNowNotifications.renderTeacherDashboard();
    CrecheNowNotifications.renderAgenda();
    CrecheNowNotifications.renderCardapio();

    const attendance = document.getElementById('routineAttendance');
    const questions = document.getElementById('routineQuestionsContainer');
    const updateVisibility = () => {
      questions.classList.toggle('d-none', attendance.value !== 'present');
    };
    attendance.addEventListener('change', updateVisibility);
    updateVisibility();

    document.getElementById('teacherRoutineForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const studentId = document.getElementById('routineStudentSelect').value;
      if (!studentId) { CrecheNowNotifications.showToast('Selecione um aluno.', 'warning'); return; }
      if (attendance.value === '') { CrecheNowNotifications.showToast('Marque presença ou falta.', 'warning'); return; }
      if (CrecheNowStorage.hasRoutineTodayForStudent(studentId) &&
          !confirm('Já existe um registro de rotina para este aluno hoje. Sobrescrever?')) return;

      const getRadio = (n) => document.querySelector(`input[name="${n}"]:checked`)?.value || 'nao';
      const isPresent = attendance.value === 'present';
      CrecheNowStorage.addRoutine({
        studentId,
        teacherPersonId: session.personId,
        attendance: isPresent,
        questions: isPresent ? {
          behaved: getRadio('q1'), attention: getRadio('q2'),
          homework: getRadio('q3'), peers: getRadio('q4'), food: getRadio('q5')
        } : null,
        comment: isPresent ? document.getElementById('routineComment').value : ''
      });
      e.target.reset();
      updateVisibility();
      CrecheNowNotifications.showToast('Rotina registrada.');
      CrecheNowNotifications.renderTeacherDashboard();
    });

    document.getElementById('openTeacherMsgModalBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderMessageForm();
      CrecheNowNotifications.openModal('messageFormModal');
    });
    document.getElementById('messageFormBody')?.addEventListener('click', CrecheNowNotifications.handleSendMessage);

    document.getElementById('openTeacherInboxModalBtn')?.addEventListener('click', () => {
      CrecheNowNotifications.renderInbox('received');
      CrecheNowStorage.getMessages().filter(m => m.toPersonId === session.personId && !m.read)
        .forEach(m => CrecheNowStorage.markMessageAsRead(m.id));
      CrecheNowNotifications.updateInboxBadge();
      CrecheNowNotifications.openModal('inboxModal');
    });
    document.querySelectorAll('[data-inbox-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-inbox-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        CrecheNowNotifications.renderInbox(btn.dataset.inboxTab);
      });
    });

    CrecheNowNotifications.updateInboxBadge();
  }

  document.getElementById('logoutBtn')?.addEventListener('click', CrecheNowAuth.logout);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(CrecheNowConfig.BASE_PATH + 'service-worker.js', { scope: CrecheNowConfig.BASE_PATH })
      .then(() => console.log('SW registrado'))
      .catch(err => console.error('SW falha:', err));
  }

  if (window.location.pathname.includes('dashboard')) {
    setInterval(CrecheNowStorage.processQueue, 60000);
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      if (confirm('MODO TESTE: Limpar todos os dados salvos e recarregar?')) {
        localStorage.clear();
        window.location.reload();
      }
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
  });
});
