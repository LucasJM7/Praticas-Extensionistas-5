const CrecheNowStorage = (() => {
  const QUEUE_KEY = 'crechenow_offline_queue';

  return {
    get: (key) => {
      try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
    },
    set: (key, value) => {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    },
    clear: () => localStorage.clear(),
    
    // Métodos para o "Banco de Dados" Local
    getNotifications: () => CrecheNowStorage.get('crechenow_notifications') || [],
    addNotification: (notif) => {
      const notifs = CrecheNowStorage.getNotifications();
      notifs.unshift({ ...notif, id: Date.now(), read: false, date: new Date() });
      CrecheNowStorage.set('crechenow_notifications', notifs);
    },
    markAsRead: (id) => {
      const notifs = CrecheNowStorage.getNotifications();
      const item = notifs.find(n => n.id === id);
      if (item) {
        item.read = true;
        CrecheNowStorage.set('crechenow_notifications', notifs);
      }
    },
    getMessages: () => CrecheNowStorage.get('crechenow_parent_messages') || [],
    addMessage: (msg) => {
      const msgs = CrecheNowStorage.getMessages();
      msgs.unshift({ ...msg, id: Date.now(), read: false, date: new Date() });
      CrecheNowStorage.set('crechenow_parent_messages', msgs);
    },
    markMessageAsRead: (id) => {
      const msgs = CrecheNowStorage.getMessages();
      const item = msgs.find(m => m.id === id);
      if (item) {
        item.read = true;
        CrecheNowStorage.set('crechenow_parent_messages', msgs);
      }
    },
    
    queueAction: (action) => {
      const queue = CrecheNowStorage.get(QUEUE_KEY) || [];
      queue.push({ ...action, timestamp: Date.now() });
      CrecheNowStorage.set(QUEUE_KEY, queue);
    },
    processQueue: async () => {
      const queue = CrecheNowStorage.get(QUEUE_KEY) || [];
      if (!queue.length || !navigator.onLine) return;
      console.log('Sincronizando fila offline:', queue.length, 'ações');
      CrecheNowStorage.set(QUEUE_KEY, []);
    }
  };
})();
