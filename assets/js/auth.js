const CrecheNowAuth = (() => {
  const rolePage = (role) => ({
    parent: 'dashboard-parent.html',
    secretary: 'dashboard-staff.html',
    teacher: 'dashboard-teacher.html'
  })[role] || 'index.html';

  return {
    init: () => {
      const s = CrecheNowStorage.getSession();
      if (!s) return;
      if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        window.location.href = CrecheNowConfig.BASE_PATH + rolePage(s.role);
      }
    },
    login: (email, senha, lgpdConsent) => {
      if (!lgpdConsent) return { success: false, msg: 'Aceite a política de privacidade.' };
      const r = CrecheNowStorage.authenticate(email, senha);
      if (!r) return { success: false, msg: 'Credenciais inválidas.' };
      CrecheNowStorage.setSession({
        loginId: r.login.id,
        personId: r.person.id,
        role: r.login.role,
        name: r.person.name,
        email: r.login.email,
        class: r.person.class || null,
        isJunior: !!r.login.isJunior
      });
      return { success: true };
    },
    logout: () => {
      CrecheNowStorage.set('crechenow_session', null);
      window.location.href = CrecheNowConfig.BASE_PATH + 'index.html';
    },
    checkSession: () => {
      const s = CrecheNowStorage.getSession();
      if (!s && !window.location.pathname.endsWith('index.html')) {
        window.location.href = CrecheNowConfig.BASE_PATH + 'index.html';
      }
    },
    canManagePeople: () => {
      const s = CrecheNowStorage.getSession();
      return !!s && s.role === 'secretary' && !s.isJunior;
    }
  };
})();
