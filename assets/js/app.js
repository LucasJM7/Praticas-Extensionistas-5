document.addEventListener('DOMContentLoaded', () => {
  const el = id => document.getElementById(id);
  CrecheNowAuth.init(); CrecheNowAuth.checkSession();
  CrecheNowNotifications.init();
  const s = CrecheNowStorage.getSession();
  document.body.dataset.role = s?.role || 'guest';
  const nameEl = el('userNameDisplay') || el('teacherInfo');
  if (s && nameEl) nameEl.textContent = s.name + (s.class ? ` (Turma ${s.class})` : '') + (s.isJunior ? ' [Júnior]' : '');
  if (s) { CrecheNowNotifications.initRole(s); CrecheNowNotifications.startTutorialIfFirstRun(); }

  const loginForm = el('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!loginForm.checkValidity()) { loginForm.classList.add('was-validated'); return; }
      const res = CrecheNowAuth.login(el('email').value.trim(), el('senha').value, el('lgpdConsent').checked);
      if (res.success) { const map = { parent: 'dashboard-parent.html', secretary: 'dashboard-staff.html', teacher: 'dashboard-teacher.html' }; location.href = CrecheNowConfig.BASE_PATH + map[CrecheNowStorage.getSession().role]; }
      else CrecheNowNotifications.showToast(res.msg, 'danger');
    });
    el('demoAccess')?.addEventListener('click', e => { e.preventDefault(); el('email').value = 'pai@email.com'; el('senha').value = '123456'; el('lgpdConsent').checked = true; });
  }

  const main = document.querySelector('.dashboard-main');
  if (main) {
    const cols = main.querySelectorAll('.dashboard-row > *');
    if (cols.length) {
      const bar = document.createElement('div'); bar.className = 'mobile-switcher';
      cols.forEach((c, i) => { c.dataset.mobilePanel = i; const b = document.createElement('button'); b.className = 'btn btn-sm btn-outline-primary mobile-switch-btn'; b.textContent = c.dataset.mobileLabel || 'Seção ' + (i + 1); b.dataset.mobilePanel = i; bar.appendChild(b); });
      main.prepend(bar);
      const activate = i => { cols.forEach(c => c.classList.toggle('mobile-active', c.dataset.mobilePanel === i)); bar.querySelectorAll('.mobile-switch-btn').forEach(b => b.classList.toggle('active', b.dataset.mobilePanel === i)); };
      bar.addEventListener('click', e => { const b = e.target.closest('.mobile-switch-btn'); if (b) activate(b.dataset.mobilePanel); });
      activate(cols.length > 1 ? '1' : '0');
    }
  }

  document.querySelectorAll('[data-teacher-view]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.teacher-view').forEach(v => v.style.display = 'none');
    document.querySelectorAll('[data-teacher-view]').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); document.querySelector(`.teacher-view[data-view="${b.dataset.teacherView}"]`).style.display = 'flex';
  }));

  el('teacherRoutineForm')?.addEventListener('submit', e => {
    e.preventDefault(); const s = CrecheNowStorage.getSession();
    const studentId = el('routineStudentSelect').value, att = el('routineAttendance').value;
    if (!studentId) return CrecheNowNotifications.showToast('Selecione um aluno.', 'warning');
    if (!att) return CrecheNowNotifications.showToast('Marque presença ou falta.', 'warning');
    if (CrecheNowStorage.hasRoutineTodayForStudent(studentId) && !confirm('Já existe registro de rotina para este aluno hoje. Sobrescrever?')) return;
    const gr = n => document.querySelector(`input[name="${n}"]:checked`)?.value || 'nao';
    const isPresent = att === 'present';
    CrecheNowStorage.addRoutine({ studentId, teacherPersonId: s.personId, attendance: isPresent,
      questions: isPresent ? { attention: gr('q2'), homework: gr('q3'), peers: gr('q4'), food: gr('q5') } : null,
      comment: isPresent ? el('routineComment').value : '' });
    e.target.reset(); el('routineQuestionsContainer').classList.add('d-none');
    CrecheNowNotifications.showToast('Rotina registrada.'); CrecheNowNotifications.initRole(s);
  });
  el('routineAttendance')?.addEventListener('change', e => el('routineQuestionsContainer').classList.toggle('d-none', e.target.value !== 'present'));
  el('toggleRoutineHistory')?.addEventListener('click', () => el('routine-history').classList.toggle('d-none'));

  if (location.pathname.includes('dashboard')) setInterval(CrecheNowStorage.processQueue, 60000);

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') { e.preventDefault(); if (confirm('MODO TESTE: Limpar todos os dados salvos e recarregar?')) { localStorage.clear(); location.reload(); } }
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register(CrecheNowConfig.BASE_PATH + 'service-worker.js', { scope: CrecheNowConfig.BASE_PATH });
});
