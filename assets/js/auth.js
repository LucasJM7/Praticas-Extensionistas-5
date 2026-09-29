const CrecheNowAuth = (() => {
  const VALID_USERS = [
    { email: 'pai@email.com', senha: '123456', role: 'parent', name: 'Responsável (João)' },
    { email: 'secretaria@municipal.gov', senha: 'admin123', role: 'secretary', name: 'Secretaria Geral' },
    { email: 'prof@municipal.gov', senha: 'prof123', role: 'teacher', name: 'Prof. Ana', class: 'A' }
  ];

  return {
    init: () => {
      const session = CrecheNowStorage.get('session');
      if (!session) return;
      if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        const roleMap = { 'parent': 'dashboard-parent.html', 'secretary': 'dashboard-staff.html', 'teacher': 'dashboard-teacher.html' };
        window.location.href = roleMap[session.role] || 'index.html';
      }
    },
    login: (email, senha, lgpdConsent) => {
      const user = VALID_USERS.find(u => u.email === email && u.senha === senha);
      if (!user) return { success: false, msg: 'Credenciais inválidas.' };
      if (!lgpdConsent) return { success: false, msg: 'Aceite a política de privacidade.' };

      CrecheNowStorage.set('session', { role: user.role, name: user.name, email: user.email, class: user.class || null });
      return { success: true };
    },
    logout: () => {
      CrecheNowStorage.set('session', null);
      window.location.href = 'index.html';
    },
    checkSession: () => {
      const session = CrecheNowStorage.get('session');
      if (!session && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
      }
    }
  };
})();
