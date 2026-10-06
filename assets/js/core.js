window.CrecheNowConfig = (() => {
  const pad = (n) => String(n).padStart(2, '0');
  const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (iso) => {
    const [y, m, d] = String(iso).split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const nowLocalISO = () => {
    const d = new Date();
    return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const getWeekStart = () => {
    const d = new Date();
    const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const getWeekDates = (mondayISO) => {
    const base = mondayISO ? parseISO(mondayISO) : getWeekStart();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return toISODate(d);
    });
  };
  const getMonthDates = (year, month) => {
    const dates = [];
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) { dates.push(toISODate(d)); d.setDate(d.getDate() + 1); }
    return dates;
  };
  const mondayOf = (refDate) => {
    const d = new Date(refDate);
    const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    d.setDate(d.getDate() + diff);
    return toISODate(d);
  };

  return {
    BASE_PATH: '/Praticas-Extensionistas-5/', // manter igual ao BASE do service-worker.js
    SESSION_TTL_HOURS: 12,
    NOTICE_TYPES: ['Eventos', 'Avisos', 'Bilhetes'],
    RESPONSE_TYPES: ['Mensagem escrita', 'Sim/Não'],
    RELATIONSHIPS: ['Pai', 'Mãe', 'Tio', 'Tia', 'Avô', 'Avó', 'Outro responsável'],
    WEEKDAYS: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    WEEKDAYS_LONG: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    utils: {
      pad, toISODate, parseISO, nowLocalISO, getWeekStart, getWeekDates, getMonthDates, mondayOf,
      getWeekdayIndex: (iso) => parseISO(iso).getDay(),
      todayISO: () => toISODate(new Date()),
      escapeHtml: (str) => {
        if (str === null || str === undefined) return '';
        return String(str)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
      },
      formatDateBR: (iso) => {
        if (!iso) return '—';
        const [y, m, d] = String(iso).split('T')[0].split('-');
        return `${d}/${m}/${y}`;
      },
      formatDateTimeBR: (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    }
  };
})();
