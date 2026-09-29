const CrecheNowStorage = (() => {
  const QUEUE_KEY = 'crechenow_offline_queue';

  const DEFAULT_AGENDA = [
    { day: 'Seg', time: '08:00', title: 'Roda de conversa', icon: '🎵' },
    { day: 'Ter', time: '10:30', title: 'Psicomotora', icon: '' },
    { day: 'Qua', time: '14:00', title: 'Soneca & Histórias', icon: '' },
    { day: 'Qui', time: '09:00', title: 'Artes e pintura', icon: '🎨' },
    { day: 'Sex', time: '15:00', title: 'Dia da Família', icon: '👨‍👩‍👧‍👦' }
  ];

  const DEFAULT_CARDPIO = [
    { day: 'Seg', meal: 'Arroz, feijão, frango grelhado e salada.' },
    { day: 'Ter', meal: 'Macarrão ao sugo, carne moída e legumes.' },
    { day: 'Qua', meal: 'Arroz, lentilha, peixe assado e brócolis.' },
    { day: 'Qui', meal: 'Risoto de legumes com frango desfiado.' },
    { day: 'Sex', meal: 'Feijoada light, arroz e couve refogada.' }
  ];

  return {
    get: (key) => {
      try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
    },
    set: (key, value) => {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    },
    clear: () => localStorage.clear(),
    
    getNotifications: () => CrecheNowStorage.get('crechenow_notifications') || [],
    addNotification: (notif) => {
      const notifs = CrecheNowStorage.getNotifications();
      notifs.unshift({ ...notif, id: Date.now(), read: false, date: new Date() });
      CrecheNowStorage.set('crechenow_notifications', notifs);
    },
    markAsRead: (id) => {
      const notifs = CrecheNowStorage.getNotifications();
      const item = notifs.find(n => n.id === id);
      if (item) { item.read = true; CrecheNowStorage.set('crechenow_notifications', notifs); }
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
      if (item) { item.read = true; CrecheNowStorage.set('crechenow_parent_messages', msgs); }
    },

    // Novos métodos para Agenda e Cardápio
    getAgenda: () => CrecheNowStorage.get('crechenow_agenda') || DEFAULT_AGENDA,
    setAgenda: (agenda) => CrecheNowStorage.set('crechenow_agenda', agenda),
    
    getCardapio: () => CrecheNowStorage.get('crechenow_cardapio') || DEFAULT_CARDPIO,
    setCardapio: (cardapio) => CrecheNowStorage.set('crechenow_cardapio', cardapio),
    
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
