document.addEventListener('DOMContentLoaded', () => {
  CrecheNowAuth.init();
  CrecheNowAuth.checkSession();
  
  if (typeof CrecheNowNotifications !== 'undefined') {
    CrecheNowNotifications.initRealTimeSync();
  }

  // Preenche formulários de edição se estiver no painel da creche
  const fillEditForms = () => {
    const agenda = CrecheNowStorage.getAgenda();
    const agendaContainer = document.getElementById('agendaInputsContainer');
    if (agendaContainer) {
      agendaContainer.innerHTML = agenda.map((a, i) => `
        <div class="row g-2 mb-2 align-items-end">
          <div class="col-3"><input type="text" class="form-control form-control-sm" id="agendaDay${i+1}" value="${a.day}" required></div>
          <div class="col-3"><input type="time" class="form-control form-control-sm" id="agendaTime${i+1}" value="${a.time}" required></div>
          <div class="col-4"><input type="text" class="form-control form-control-sm" id="agendaTitle${i+1}" value="${a.title}" required></div>
          <div class="col-2"><input type="text" class="form-control form-control-sm" id="agendaIcon${i+1}" value="${a.icon}" placeholder="Emoji"></div>
        </div>
      `).join('');
    }

    const cardapio = CrecheNowStorage.getCardapio();
    const cardapioContainer = document.getElementById('cardapioInputsContainer');
    if (cardapioContainer) {
      cardapioContainer.innerHTML = cardapio.map((c, i) => `
        <div class="row g-2 mb-2 align-items-center">
          <div class="col-2"><input type="text" class="form-control form-control-sm" id="cardapioDay${i+1}" value="${c.day}" required></div>
          <div class="col-10"><input type="text" class="form-control form-control-sm" id="cardapioMeal${i+1}" value="${c.meal}" required></div>
        </div>
      `).join('');
    }
  };

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
        body: document.getElementById('notifyBody').value,
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

  // Salvar Agenda editada
  const agendaForm = document.getElementById('agendaEditForm');
  if (agendaForm) {
    agendaForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newAgenda = [];
      for(let i=1; i<=5; i++) {
        newAgenda.push({
          day: document.getElementById(`agendaDay${i}`).value,
          time: document.getElementById(`agendaTime${i}`).value,
          title: document.getElementById(`agendaTitle${i}`).value,
          icon: document.getElementById(`agendaIcon${i}`).value
        });
      }
      CrecheNowStorage.setAgenda(newAgenda);
      CrecheNowNotifications.showToast('Agenda atualizada!');
    });
  }

  // Salvar Cardápio editado
  const cardapioForm = document.getElementById('cardapioEditForm');
  if (cardapioForm) {
    cardapioForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newCardapio = [];
      for(let i=1; i<=5; i++) {
        newCardapio.push({
          day: document.getElementById(`cardapioDay${i}`).value,
          meal: document.getElementById(`cardapioMeal${i}`).value
        });
      }
      CrecheNowStorage.setCardapio(newCardapio);
      CrecheNowNotifications.showToast('Cardápio atualizado!');
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
    CrecheNowNotifications.renderCardapio();
    CrecheNowNotifications.renderSent();
    CrecheNowNotifications.renderParentMessages();
    fillEditForms(); // Preenche os formulários de edição da creche
    setInterval(CrecheNowStorage.processQueue, 60000);
  }

  // Atalho de teclado para desenvolvedor: Ctrl + Shift + L para limpar tudo
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
