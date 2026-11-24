const CrecheNowAuth = (() => {
  const rolePage = role => ({ parent: 'dashboard-parent.html', secretary: 'dashboard-staff.html', teacher: 'dashboard-teacher.html' }[role] || 'index.html');
  return {
    init: () => { const s = CrecheNowStorage.getSession(); if (s && (location.pathname.endsWith('index.html') || location.pathname.endsWith('/'))) location.href = CrecheNowConfig.BASE_PATH + rolePage(s.role); },
    login: (email, senha, lgpd) => {
      if (!lgpd) return { success: false, msg: 'Aceite a política de privacidade.' };
      const r = CrecheNowStorage.authenticate(email, senha);
      if (!r) return { success: false, msg: 'Credenciais inválidas.' };
      CrecheNowStorage.setSession({ loginId: r.login.id, personId: r.person.id, role: r.login.role, name: r.person.name, email: r.login.email, class: r.person.class || null, isJunior: !!r.login.isJunior });
      return { success: true };
    },
    logout: () => { CrecheNowStorage.set('crechenow_session', null); location.href = CrecheNowConfig.BASE_PATH + 'index.html'; },
    checkSession: () => { if (!CrecheNowStorage.getSession() && !location.pathname.endsWith('index.html')) location.href = CrecheNowConfig.BASE_PATH + 'index.html'; },
    canManagePeople: () => { const s = CrecheNowStorage.getSession(); return !!s && s.role === 'secretary' && !s.isJunior; }
  };
})();
