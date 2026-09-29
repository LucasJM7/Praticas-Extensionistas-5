document.addEventListener('DOMContentLoaded', () => {
  CrecheNowAuth.init();
  CrecheNowAuth.checkSession();
  
  if (typeof CrecheNowNotifications !== 'undefined') {
    CrecheNowNotifications.initRealTimeSync();
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
        window.location.href = CrecheNowStorage.get('session').role === 'parent' ? 'dashboard-parent.html' : 'dashboard-staff.html';
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
      
      const targetVal = document.getElementById('notifyTarget').value;
      const newNotif = {
        title: document.getElementById('notifyTitle').value,
        type: document.getElementById('notifyType').value,
        target: targetVal,
        readCount: 0,
        targetCount: targetVal === 'all' ? 48 : 24
      };
      
      CrecheNowStorage.addNotification(newNotif);
      staffForm.reset(); 
      staffForm.classList.remove('was-validated');
      CrecheNowNotifications.showToast('Comunicado enviado com sucesso!');
      CrecheNowNotifications.renderSent();
    });
  }

  const parentMsgForm = document.getElementById('parentMsgForm');
  if (parentMsgForm) {
    parentMsgForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!parentMsgForm.checkValidity()) { parentMsgForm.classList.add('was-validated'); return; }
      
      const session = CrecheNowStorage.get('session');
      const newMsg = {
        parentName: session ? session.name : 'Responsável',
        message: document.getElementById('parentMessage').value,
        childName: document.getElementById('childName').value
      };
      
      CrecheNowStorage.addMessage(newMsg);
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

  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!document.getElementById('installBtn')) {
      const btn = document.createElement('button');
      btn.id = 'installBtn';
      btn.textContent = '📲 Instalar CrecheNow';
      btn.className = 'btn btn-sm btn-warning position-fixed bottom-0 start-50 translate-middle-x mb-3 shadow';
      btn.style.zIndex = '9999';
      btn.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((res) => {
          if (res.outcome === 'accepted') btn.remove();
          deferredPrompt = null;
        });
      });
      document.body.appendChild(btn);
    }
  });

  if (window.location.pathname.includes('dashboard')) {
    CrecheNowNotifications.renderFeed();
    CrecheNowNotifications.renderAgenda();
    CrecheNowNotifications.renderSent();
    CrecheNowNotifications.renderParentMessages(); // Renderiza novos recados
    setInterval(CrecheNowStorage.processQueue, 60000);
  }
});
