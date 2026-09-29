document.addEventListener('DOMContentLoaded', () => {
  CrecheNowAuth.init();
  CrecheNowAuth.checkSession();
  
  if (typeof CrecheNowNotifications !== 'undefined') {
    CrecheNowNotifications.initRealTimeSync();
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
    });
    CrecheNowNotifications.renderStudentManagement();
  }

  // --- PROFESSOR: Rotina Diária ---
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
      CrecheNowNotifications.showToast('Rotina registrada com sucesso!');
      CrecheNowNotifications.renderTeacherDashboard();
    });
  }

  if (session?.role === 'parent') {
    // Simulação: pega o primeiro aluno vinculado ao e-mail do pai (em app real viria do backend)
    const student = CrecheNowStorage.getStudents().find(s => s.parentEmail === session.email) || CrecheNowStorage.getStudents()[0];
    if (student) {
      document.getElementById('childName').value = student.name; // Auto-preenche para facilitar teste
      CrecheNowNotifications.renderRoutineForParent(student.id);
    }

    document.getElementById('toggleRoutineHistory')?.addEventListener('click', () => {
      const hist = document.getElementById('routine-history');
      hist.classList.toggle('d-none');
    });
  }

  const parentMsgForm = document.getElementById('parentMsgForm');
  if (parentMsgForm) {
    parentMsgForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!parentMsgForm.checkValidity()) { parentMsgForm.classList.add('was-validated'); return; }
      
      CrecheNowStorage.addMessage({
        parentName: session ? session.name : 'Responsável',
        message: document.getElementById('parentMessage').value,
        childName: document.getElementById('childName').value
      });
      parentMsgForm.reset();
      parentMsgForm.classList.remove('was-validated');
      CrecheNowNotifications.showToast('Recado enviado para a creche!');
    });
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
  });
});
