const CrecheNowNotifications = (() => {
  return {
    renderFeed: (filter = 'all') => {
      const container = document.getElementById('notifications-feed');
      if (!container) return;
      container.innerHTML = '';
      
      const allNotifs = CrecheNowStorage.getNotifications();
      const filtered = allNotifs.filter(n => filter === 'all' || n.type === filter);

      if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-4">Nenhum comunicado encontrado.</div>';
        return;
      }

      filtered.forEach(n => {
        const el = document.createElement('div');
        el.className = `card notify-card mb-3 ${n.read ? '' : 'unread'}`;
        el.dataset.type = n.type;
        el.innerHTML = `
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start">
              <h5 class="card-title mb-1 fw-semibold">${n.title}</h5>
              <span class="badge ${n.read ? 'bg-secondary' : 'bg-warning text-dark'} badge-priority">${n.read ? 'Lido' : 'Novo'}</span>
            </div>
            <p class="card-text text-muted small mb-2">${n.body}</p>
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted">${CrecheNowNotifications.timeAgo(n.date)}</small>
              ${!n.read ? `<button class="btn btn-sm btn-outline-primary mark-read" data-id="${n.id}">Marcar como lido</button>` : ''}
            </div>
          </div>
        `;
        container.appendChild(el);
      });

      document.querySelectorAll('.mark-read').forEach(btn => {
        btn.addEventListener('click', () => {
          CrecheNowStorage.markAsRead(parseInt(btn.dataset.id));
          CrecheNowNotifications.renderFeed(filter);
          CrecheNowNotifications.showToast('Notificação marcada como lida.');
        });
      });
    },

    renderAgenda: () => {
      const container = document.getElementById('agenda-list');
      if (!container) return;
      const agenda = CrecheNowStorage.getAgenda();
      container.innerHTML = agenda.map(a => `
        <div class="agenda-card d-flex align-items-center p-2 mb-2 bg-white rounded shadow-sm">
          <div class="agenda-icon me-2 fs-5">${a.icon}</div>
          <div class="flex-grow-1">
            <strong class="d-block text-primary small">${a.title}</strong>
            <small class="text-muted" style="font-size: 0.7rem;">${a.day} • ${a.time}</small>
          </div>
        </div>
      `).join('');
    },

    renderCardapio: () => {
      const container = document.getElementById('cardapio-list');
      if (!container) return;
      const cardapio = CrecheNowStorage.getCardapio();
      container.innerHTML = cardapio.map(c => `
        <div class="cardapio-item d-flex align-items-start p-2 mb-2 bg-white rounded border-start border-4 border-success">
          <div class="fw-bold text-success me-2 small" style="min-width: 35px;">${c.day}</div>
          <div class="small text-muted">${c.meal}</div>
        </div>
      `).join('');
    },

    renderSent: () => {
      const tbody = document.getElementById('sent-notifications');
      if (!tbody) return;
      const notifs = CrecheNowStorage.getNotifications().filter(n => n.type !== 'mensagem_pai');
      tbody.innerHTML = notifs.length ? notifs.map(s => `
        <tr>
          <td>${s.title}</td>
          <td><span class="badge bg-light text-dark border">${s.type}</span></td>
          <td><span class="text-success fw-semibold">${s.readCount || 0}</span>/${s.targetCount || 24}</td>
          <td class="text-muted small">${new Date(s.date).toLocaleDateString('pt-BR')}</td>
        </tr>
      `).join('') : '<tr><td colspan="4" class="text-center text-muted py-3">Nenhum envio registrado</td></tr>';
    },

    renderParentMessages: () => {
      const tbody = document.getElementById('parent-messages-list');
      if (!tbody) return;
      const msgs = CrecheNowStorage.getMessages();
      tbody.innerHTML = msgs.length ? msgs.map(m => `
        <tr class="${m.read ? '' : 'table-warning'}">
          <td>${m.parentName}<br><small class="text-muted">Criança: ${m.childName}</small></td>
          <td>${m.message}</td>
          <td><small>${new Date(m.date).toLocaleString('pt-BR')}</small></td>
          <td class="text-center">
            ${!m.read ? `<button class="btn btn-sm btn-success mark-msg-read" data-id="${m.id}">✓</button>` : '<span class="text-muted small">Lido</span>'}
          </td>
        </tr>
      `).join('') : '<tr><td colspan="4" class="text-center text-muted py-3">Nenhum recado dos pais</td></tr>';

      document.querySelectorAll('.mark-msg-read').forEach(btn => {
        btn.addEventListener('click', () => {
          CrecheNowStorage.markMessageAsRead(parseInt(btn.dataset.id));
          CrecheNowNotifications.renderParentMessages();
        });
      });
    },

    showToast: (msg, type = 'success') => {
      const container = document.getElementById('toast-container') || document.body;
      const toastEl = document.createElement('div');
      toastEl.className = `toast align-items-center text-bg-${type} border-0 show`;
      toastEl.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button></div>`;
      container.appendChild(toastEl);
      setTimeout(() => toastEl.remove(), 4000);
    },

    timeAgo: (date) => {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      if (seconds < 60) return 'Agora';
      if (seconds < 3600) return `${Math.floor(seconds / 60)} min atrás`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)} h atrás`;
      return new Date(date).toLocaleDateString('pt-BR');
    },

    initRealTimeSync: () => {
      window.addEventListener('storage', (e) => {
        if (e.key === 'crechenow_notifications') CrecheNowNotifications.renderFeed();
        if (e.key === 'crechenow_parent_messages') CrecheNowNotifications.renderParentMessages();
        if (e.key === 'crechenow_agenda') CrecheNowNotifications.renderAgenda();
        if (e.key === 'crechenow_cardapio') CrecheNowNotifications.renderCardapio();
      });
    }
  };
})();
