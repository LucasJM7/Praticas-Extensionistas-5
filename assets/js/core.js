window.CrecheNowConfig = (() => {
  const pad = n => String(n).padStart(2, '0');
  const toISODate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = iso => { const [y, m, d] = String(iso).split('T')[0].split('-').map(Number); return new Date(y, m - 1, d); };

  return {
    BASE_PATH: location.pathname.replace(/[^/]*$/, ''),
    SESSION_TTL_HOURS: 12,
    NOTICE_TYPES: ['Eventos', 'Avisos', 'Bilhetes'],
    RESPONSE_TYPES: ['Mensagem escrita', 'Sim/Não'],
    EVENT_TYPES: { reuniao: 'Reunião', atividade: 'Atividade', comemorativa: 'Data comemorativa' },
    RELATIONSHIPS: ['Pai', 'Mãe', 'Tio', 'Tia', 'Avô', 'Avó', 'Outro responsável'],
    WEEKDAYS: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    WEEKDAYS_LONG: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    utils: {
      pad, toISODate, parseISO,
      nowLocalISO: () => { const d = new Date(); return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; },
      todayISO: () => toISODate(new Date()),
      getWeekStart: () => { const d = new Date(); d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay())); d.setHours(0, 0, 0, 0); return d; },
      mondayOf: ref => { const d = new Date(ref); d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay())); return toISODate(d); },
      getWeekDates: mondayISO => { const base = mondayISO ? parseISO(mondayISO) : getWeekStart0(); return Array.from({ length: 6 }, (_, i) => { const d = new Date(base); d.setDate(d.getDate() + i); return toISODate(d); }); },
      getMonthDates: (y, m) => { const dates = [], d = new Date(y, m, 1); while (d.getMonth() === m) { dates.push(toISODate(d)); d.setDate(d.getDate() + 1); } return dates; },
      getWeekdayIndex: iso => parseISO(iso).getDay(),
      escapeHtml: str => str == null ? '' : String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'),
      formatDateBR: iso => { if (!iso) return '—'; const [y, m, d] = String(iso).split('T')[0].split('-'); return `${d}/${m}/${y}`; },
      formatDateTimeBR: iso => !iso ? '—' : new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  };
  function getWeekStart0() { return new Date(); }
})();
