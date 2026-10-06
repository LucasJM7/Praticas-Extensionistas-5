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
      } else CrecheNowNotifications.showToast(res.msg, 'danger');
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
    const renderChildData = (kidId) => {
      const kid = CrecheNowStorage.getPerson(kidId);
      CrecheNowNotifications.renderRoutineForParent(kidId);
      CrecheNowNotifications.renderAgenda('agenda-list', kid?.class || null);
    };
    if (childSelect && kids.length) {
      childSelect.innerHTML = kids.map(k => `<option value="${k.id}">${utils.escapeHtml(k.name)} — Turma ${utils.escapeHtml(k.class)}</option>`).join('');
      childSelect.addEventListener('change', () => renderChildData(childSelect.value));
      renderChildData(childSelect.value);
    } else {
      const any = CrecheNowStorage.getStudents()[0];
      if (any) { renderChildData(any.id); }
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

    document.getElementById('notifications-carousel')?.addEventListener('click', CrecheNowNotifications.handleResponseDelegation);
    document.getElementById('inbox-content')?.addEventListener('click', CrecheNowNotifications.handleResponseDelegation);

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
    CrecheNowNotifications.renderCardapio();
    CrecheNowNotifications.updateInboxBadge();
  }

  if (session?.role === 'secretary') {
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

    document.getElementById('sent-notifications')?.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-action="open-responses"]');
      if (row) CrecheNowNotifications.openResponsesModal(row.dataset.id);
    });

    document.getElementById('openCardapioEditorBtn')?.addEventListener('click', () => {
      const modal = document.getElementById('cardapioEditorModal');
      modal.dataset.view = 'week';
      modal.dataset.ref = utils.toISODate(utils.getWeekStart());
      CrecheNowNotifications.renderCardapioEditor();
      CrecheNowNotifications.openModal('cardapioEditorModal');
    });
    document.getElementById('cardapioEditorContainer')?.addEventListener('click', CrecheNowNotifications.handleCardapioEditorDelegation);
    document.getElementById('cardapioEditorForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      CrecheNowNotifications.saveCardapioFromEditor();
    });

    // Calendário de aulas
    document.getElementById('openSchoolCalendarBtn')?.addEventListener('click', () => {
      const modal = document.getElementById('schoolCalendarModal');
      modal.dataset.view = 'week';
      modal.dataset.ref = utils.todayISO();
      CrecheNowNotifications.renderSchoolCalendarEditor();
      CrecheNowNotifications.openModal('schoolCalendarModal');
    });
    document.getElementById('schoolCalendarBody')?.addEventListener('click', CrecheNowNotifications.handleSchoolCalendarDelegation);
    document.getElementById('schoolCalendarBody')?.addEventListener('change', CrecheNowNotifications.handleSchoolCalendarChange);

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

      document.getElementById('openAddPersonBtn')?.addEventListener('click', () => {
        CrecheNowNotifications.renderPersonCreateForm('student');
        CrecheNowNotifications.openModal('personCreateModal');
      });
      document.querySelectorAll('[data-person-type]').forEach(btn => {
        btn.addEventListener('click', () => CrecheNowNotifications.renderPersonCreateForm(btn.dataset.personType));
      });
      document.getElementById('personCreateBody')?.addEventListener('click', CrecheNowNotifications.handlePersonCreateDelegation);
      document.getElementById('personCreateBody')?.addEventListener('input', CrecheNowNotifications.handlePersonCreateInput);

      document.getElementById('students-list')?.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-action="open-student"]');
        if (row) CrecheNowNotifications.openStudentDetail(row.dataset.id);
      });
      document.getElementById('studentDetailBody')?.addEventListener('click', CrecheNowNotifications.handleStudentDetailDelegation);
      document.getElementById('studentDetailBody')?.addEventListener('input', CrecheNowNotifications.handleStudentDetailInput);

      const openEdit = (e) => {
        const row = e.target.closest('tr[data-action="open-person"]');
        if (row) CrecheNowNotifications.renderPersonEdit(row.dataset.id);
      };
      document.getElementById('parents-list')?.addEventListener('click', openEdit);
      document.getElementById('teachers-list')?.addEventListener('click', openEdit);
      document.getElementById('personEditBody')?.addEventListener('click', CrecheNowNotifications.handlePersonEditDelegation);
      document.getElementById('personEditBody')?.addEventListener('input', CrecheNowNotifications.handlePersonEditInput);

      // Logins
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
      ['openAddPersonBtn', 'openAddLoginBtn', 'openSchoolCalendarBtn', 'openCardapioEditorBtn']
        .forEach(id => { const b = document.getElementById(id); if (b) b.style.display = 'none'; });
    }

    CrecheNowNotifications.renderSent();
    CrecheNowNotifications.updateInboxBadge();
  }

  if (session?.role === 'teacher') {
    document.getElementById('teacherClassDisplay').textContent = session.class || '';
    CrecheNowNotifications.renderTeacherDashboard();
    CrecheNowNotifications.renderTeacherAllergies();
    CrecheNowNotifications.renderAgenda('agenda-list', session.class);
    CrecheNowNotifications.renderCardapio();

    const attendance = document.getElementById('routineAttendance');
    const questions = document.getElementById('routineQuestionsContainer');
    const updateVisibility = () => questions.classList.toggle('d-none', attendance.value !== 'present');
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
        studentId, teacherPersonId: session.personId, attendance: isPresent,
        questions: isPresent ? { behaved: getRadio('q1'), attention: getRadio('q2'), homework: getRadio('q3'), peers: getRadio('q4'), food: getRadio('q5') } : null,
        comment: isPresent ? document.getElementById('routineComment').value : ''
      });
      e.target.reset();
      updateVisibility();
      CrecheNowNotifications.showToast('Rotina registrada.');
      CrecheNowNotifications.renderTeacherDashboard();
    });

    document.getElementById('teacher-students-list')?.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-action="open-student-view"]');
      if (row) CrecheNowNotifications.openStudentView(row.dataset.id);
    });

    document.getElementById('openAgendaEditorBtn')?.addEventListener('click', () => {
      document.getElementById('agendaEditorModal').dataset.week = utils.toISODate(utils.getWeekStart());
      CrecheNowNotifications.renderTeacherAgendaEditor();
      CrecheNowNotifications.openModal('agendaEditorModal');
    });
    document.getElementById('agendaEditorContainer')?.addEventListener('click', CrecheNowNotifications.handleAgendaEditorDelegation);
    document.getElementById('agendaEditorForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      CrecheNowNotifications.saveTeacherAgendaFromEditor();
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
  if (window.location.pathname.includes('dashboard')) setInterval(CrecheNowStorage.processQueue, 60000);

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      if (confirm('MODO TESTE: Limpar todos os dados salvos e recarregar?')) { localStorage.clear(); window.location.reload(); }
    }
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  });
});
