import { html, render, useState, useEffect, useCallback, useMemo } from 'https://cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.module.js';

// ── Verbindung ────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://tbecxlcmxfscrqcvicuw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZWN4bGNteGZzY3JxY3ZpY3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjQ4NjYsImV4cCI6MjEwNjQ0MDg2Nn0.Vrid2sOCKpLMOyYj6KIDx8vgEDaEzi-0zhOXPqERxrc';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// ── Konstanten & Helfer ───────────────────────────────────────────────
const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const TAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const NOTEN_ARTEN = ['Klassenarbeit', 'Test', 'Vokabeltest', 'Mündlich', 'Präsentation', 'Projekt', 'Diktat', 'Sonstige'];
const AUFGABEN_ARTEN = ['Aufgabe', 'Lernen', 'Vorbereitung', 'Mitbringen'];
const TERMIN_ARTEN = ['Klassenarbeit', 'Test', 'Vokabeltest', 'Referat', 'Elternabend', 'Ausflug', 'Ferien', 'Sonstige'];
const BEIDE = '#7C5CBF';
const KINDFARBEN = ['#2563eb', '#059669', '#D9822B', '#B54FA6', '#C23B3B', '#1E9BB0', '#6C5CE7', '#8A6D3B'];
const STANDARD_FAECHER = ['Deutsch', 'Mathe', 'Englisch', 'Französisch', 'Latein', 'Spanisch', 'Biologie', 'Chemie', 'Physik',
  'Geschichte', 'Erdkunde', 'Gemeinschaftskunde', 'Wirtschaft', 'Informatik', 'NwT', 'BNT', 'Ethik', 'Religion',
  'Musik', 'Bildende Kunst', 'Sport', 'AG'];
const KUERZEL = {
  Deutsch: 'De', Mathe: 'Ma', Englisch: 'En', Latein: 'La', Geschichte: 'Ge', Erdkunde: 'Ek',
  Chemie: 'Ch', Physik: 'Ph', Gemeinschaftskunde: 'Gk', Ethik: 'Et', Kunst: 'Ku', 'Bildende Kunst': 'BK',
  Musik: 'Mu', Sport: 'Sp', Biologie: 'Bio', Medienbildung: 'Med', Soko: 'Soko', AG: 'AG',
  Informatik: 'Inf', Sachkunde: 'Sk', 'Französisch': 'F', Spanisch: 'Spa', Religion: 'Rel', Wirtschaft: 'Wi', NwT: 'NwT', BNT: 'BNT',
};
const FACHFARBEN = ['#3B6FD8', '#D9822B', '#2E9E6A', '#B54FA6', '#C23B3B', '#1E9BB0', '#8A6D3B', '#6C5CE7', '#5E8C31', '#D35F8D', '#4A6A8A', '#B08900', '#7A7A7A'];

const heuteISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const tageBis = (iso) => Math.round((new Date(iso + 'T00:00') - new Date(heuteISO() + 'T00:00')) / 86400000);
const datum = (iso) => iso ? new Date(iso + 'T00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'ohne Datum';
const schnitt = (v) => v == null ? '–' : Number(v).toFixed(1).replace('.', ',');
const noteText = (label, value) => (label || String(value)).replace(/(\d)-(\d)/, '$1–$2').replace(/-$/, '−');
const notenFarbe = (v) => v == null ? 'var(--blei)' : v <= 1.5 ? '#1F8A4C' : v <= 2.5 ? '#5C9A2E' : v <= 3.5 ? '#C28A00' : v <= 4.5 ? '#D2691E' : '#C8323C';
const notenFarbeSkala = (v, punkte) => !punkte ? notenFarbe(v) : v == null ? 'var(--blei)'
  : v >= 13 ? '#1F8A4C' : v >= 10 ? '#5C9A2E' : v >= 7 ? '#C28A00' : v >= 4 ? '#D2691E' : '#C8323C';
const istPunkte = (enr) => enr?.grade_scale === 'punkte';
const alleLabel = (kinder) => (kinder.length === 2 ? 'Beide' : 'Alle');
const naechsteKlasse = (k) => (k || '').replace(/^(\d+)/, (m) => String(+m + 1));
const naechstesJahr = (label) => {
  const m = /^(\d{4})\/(\d{2})$/.exec(label || '');
  if (m) return `${+m[1] + 1}/${String((+m[2] + 1) % 100).padStart(2, '0')}`;
  const d = new Date(); const y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
};
const kuerzel = (name) => KUERZEL[name] || (name || '').slice(0, 3);
const merken = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const lesen = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

function faelligText(iso) {
  if (!iso) return { text: 'ohne Termin', rot: false };
  const n = tageBis(iso);
  if (n < 0) return { text: `überfällig seit ${datum(iso)}`, rot: true };
  if (n === 0) return { text: 'heute', rot: true };
  if (n === 1) return { text: 'morgen', rot: true };
  return { text: datum(iso), rot: false };
}

function noteBerechnen(basis, tendenz) {
  if (tendenz === '+') return { label: `${basis}+`, value: Math.max(1, +(basis - 0.3).toFixed(1)) };
  if (tendenz === '-') return { label: `${basis}-`, value: Math.min(6, +(basis + 0.3).toFixed(1)) };
  if (tendenz === 'bis' && basis < 6) return { label: `${basis}-${basis + 1}`, value: basis + 0.5 };
  return { label: String(basis), value: basis };
}

// ── Symbole ───────────────────────────────────────────────────────────
const Icon = {
  heute: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2"/></svg>`,
  woche: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/></svg>`,
  termine: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/></svg>`,
  zahnrad: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
  faecher: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 7h6M8 11h6"/></svg>`,
};

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  if (session === undefined) return html`<div class="laden">Lädt …</div>`;
  if (!session) return html`<${Login} />`;
  return html`<${Haupt} session=${session} />`;
}

// ── Login per E-Mail-Code ─────────────────────────────────────────────
function Login() {
  const [email, setEmail] = useState(lesen('email') || '');
  const [schritt, setSchritt] = useState('email');
  const [code, setCode] = useState('');
  const [fehler, setFehler] = useState('');
  const [busy, setBusy] = useState(false);

  async function senden(e) {
    e.preventDefault(); setBusy(true); setFehler('');
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname },
    });
    setBusy(false);
    if (error) {
      setFehler(/signup|not allowed|not found/i.test(error.message)
        ? 'Diese E-Mail ist nicht freigeschaltet.'
        : /rate|seconds/i.test(error.message)
          ? 'Zu viele Versuche. Bitte ein paar Minuten warten.'
          : `Senden fehlgeschlagen: ${error.message}`);
      return;
    }
    merken('email', email.trim());
    setSchritt('code');
  }

  async function pruefen(e) {
    e.preventDefault(); setBusy(true); setFehler('');
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setFehler('Der Code stimmt nicht oder ist abgelaufen. Neuen Code anfordern.');
  }

  return html`
    <div class="login">
      <h1>Schulapp</h1>
      ${schritt === 'email' ? html`
        <p>Melde dich mit deiner E-Mail an. Du bekommst einen Code zugeschickt.</p>
        <form onSubmit=${senden}>
          <label class="feld"><span>E-Mail</span>
            <input type="email" required autocomplete="email" value=${email} onInput=${(e) => setEmail(e.target.value)} />
          </label>
          ${fehler && html`<div class="fehler">${fehler}</div>`}
          <button class="knopf" disabled=${busy}>${busy ? 'Wird gesendet …' : 'Code senden'}</button>
        </form>` : html`
        <p>Code aus der E-Mail an ${email} eingeben.</p>
        <form onSubmit=${pruefen}>
          <label class="feld"><span>Code</span>
            <input class="code-eingabe" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required
              value=${code} onInput=${(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </label>
          ${fehler && html`<div class="fehler">${fehler}</div>`}
          <button class="knopf" disabled=${busy || code.length < 6}>${busy ? 'Wird geprüft …' : 'Anmelden'}</button>
        </form>
        <div class="fuss"><button onClick=${() => { setSchritt('email'); setCode(''); setFehler(''); }}>Andere E-Mail oder neuen Code anfordern</button></div>`}
    </div>`;
}

// ── Daten eines Schuljahres laden (mit Live-Aktualisierung) ───────────
function useJahresdaten(kindId, jahrId) {
  const [daten, setDaten] = useState(null);
  const [tick, setTick] = useState(0);
  const neuLaden = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!kindId || !jahrId) return;
    let aktiv = true;
    (async () => {
      const { data: enr, error } = await sb.from('enrollments').select('*')
        .eq('student_id', kindId).eq('school_year_id', jahrId).maybeSingle();
      if (!aktiv) return;
      if (error) { setDaten({ fehler: true }); return; }
      if (!enr) { setDaten({ enrollment: null, faecher: [], schnitte: {}, stunden: [], aufgaben: [] }); return; }
      const [f, s, t, a] = await Promise.all([
        sb.from('subjects').select('*').eq('enrollment_id', enr.id).order('sort'),
        sb.from('subject_averages').select('*').eq('enrollment_id', enr.id),
        sb.from('timetable_slots').select('*').eq('enrollment_id', enr.id),
        sb.from('tasks').select('*').eq('enrollment_id', enr.id).order('due_on', { ascending: true, nullsFirst: false }),
      ]);
      if (!aktiv) return;
      const faecher = (f.data || []).map((x, i) => ({ ...x, farbe: FACHFARBEN[i % FACHFARBEN.length] }));
      setDaten({
        enrollment: enr,
        faecher,
        schnitte: Object.fromEntries((s.data || []).map((x) => [x.subject_id, x])),
        stunden: t.data || [],
        aufgaben: a.data || [],
      });
    })();
    return () => { aktiv = false; };
  }, [kindId, jahrId, tick]);

  useEffect(() => {
    const kanal = sb.channel('aenderungen-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public' }, () => neuLaden())
      .subscribe();
    const sichtbar = () => { if (document.visibilityState === 'visible') neuLaden(); };
    document.addEventListener('visibilitychange', sichtbar);
    return () => { sb.removeChannel(kanal); document.removeEventListener('visibilitychange', sichtbar); };
  }, [neuLaden]);

  return [daten, neuLaden];
}

// ── Termine der Familie (mit Live-Aktualisierung) ─────────────────────
function useTermine(familyId) {
  const [termine, setTermine] = useState(null);
  const [tick, setTick] = useState(0);
  const neuLaden = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!familyId) return;
    let aktiv = true;
    sb.from('events').select('*').eq('family_id', familyId).order('event_on').then(({ data, error }) => {
      if (aktiv) setTermine(error ? [] : data || []);
    });
    return () => { aktiv = false; };
  }, [familyId, tick]);
  useEffect(() => {
    const k = sb.channel('termine-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => neuLaden()).subscribe();
    return () => { sb.removeChannel(k); };
  }, [neuLaden]);
  return [termine, neuLaden];
}

function useAktuelleFaecher(aktuellId) {
  const [faecher, setFaecher] = useState({ byKind: {}, byId: {} });
  useEffect(() => {
    if (!aktuellId) return;
    (async () => {
      const { data: enr } = await sb.from('enrollments').select('id, student_id').eq('school_year_id', aktuellId);
      if (!enr?.length) return;
      const kindVon = Object.fromEntries(enr.map((e) => [e.id, e.student_id]));
      const { data: subs } = await sb.from('subjects').select('id, name, enrollment_id, sort')
        .in('enrollment_id', enr.map((e) => e.id)).order('sort');
      const byKind = {}; const byId = {};
      (subs || []).forEach((f) => { const k = kindVon[f.enrollment_id]; (byKind[k] ||= []).push(f); byId[f.id] = f; });
      setFaecher({ byKind, byId });
    })();
  }, [aktuellId]);
  return faecher;
}

// ── Hauptbereich ──────────────────────────────────────────────────────
function Haupt({ session }) {
  const [basis, setBasis] = useState(null);
  const [fehler, setFehler] = useState('');
  const [kindId, setKindId] = useState(lesen('kind'));
  const [jahrId, setJahrId] = useState(null);
  const [ansicht, setAnsicht] = useState('heute');
  const [fachId, setFachId] = useState(null);

  const basisLaden = useCallback(async () => {
    {
      const [m, s, y] = await Promise.all([
        sb.from('family_members').select('*').eq('user_id', session.user.id),
        sb.from('students').select('*').order('sort'),
        sb.from('school_years').select('*').order('label', { ascending: false }),
      ]);
      if (m.error || s.error || y.error) { setFehler('Die Daten konnten nicht geladen werden. Bitte die Internetverbindung prüfen.'); return; }
      if (!m.data.length) { setFehler(`Für ${session.user.email} ist noch kein Zugang eingerichtet.`); return; }
      const aktuell = y.data.find((j) => j.is_current) || y.data[0];
      setBasis({ mitglied: m.data[0], kinder: s.data, jahre: y.data, aktuellId: aktuell?.id });
      setJahrId(aktuell?.id);
      setKindId((k) => (s.data.some((x) => x.id === k) ? k : s.data[0]?.id));
    }
  }, []);
  useEffect(() => { basisLaden(); }, [basisLaden]);

  const jahrFuerAnsicht = ansicht === 'faecher' ? jahrId : basis?.aktuellId;
  const [daten, neuLaden] = useJahresdaten(kindId, jahrFuerAnsicht);
  const [termine, termineNeu] = useTermine(basis?.mitglied.family_id);
  const aktuelleFaecher = useAktuelleFaecher(basis?.aktuellId);

  if (fehler) return html`<div class="login"><h1>Schulapp</h1><p class="fehler">${fehler}</p>
    <button class="knopf zweit" onClick=${() => sb.auth.signOut()}>Abmelden</button></div>`;
  if (!basis) return html`<div class="laden">Lädt …</div>`;

  const kind = basis.kinder.find((k) => k.id === kindId) || basis.kinder[0] || null;
  const istEltern = basis.mitglied.role === 'parent';
  const ersteinrichtung = !kind || !basis.aktuellId;
  const sicht = ersteinrichtung ? 'einrichtung' : ansicht;
  const aktualisieren = async () => { await basisLaden(); neuLaden(); termineNeu(); };

  if (ersteinrichtung && !istEltern) return html`<div class="login"><h1>Schulapp</h1>
    <p>Deine Eltern richten die App gerade ein. Schau bald wieder vorbei.</p>
    <button class="knopf zweit" onClick=${() => sb.auth.signOut()}>Abmelden</button></div>`;
  const fach = daten?.faecher?.find((f) => f.id === fachId);

  const kindWechseln = (id) => { setKindId(id); merken('kind', id); setFachId(null); };
  const ansichtWechseln = (a) => { setAnsicht(a); setFachId(null); if (a !== 'faecher') setJahrId(basis.aktuellId); };

  return html`
    <div class="app" style=${`--kind:${sicht === 'termine' || !kind ? BEIDE : kind.color}`}>
      <header class="kopf">
        ${sicht === 'termine' ? html`<h1 style="margin:0;flex:1">Termine</h1>` : html`<div class="kinder">
          ${basis.kinder.map((k) => html`
            <button class=${'kind-knopf' + (k.id === kind?.id ? ' aktiv' : '')} style=${`--k:${k.color}`}
              onClick=${() => kindWechseln(k.id)} aria-pressed=${k.id === kind?.id}>${k.name}
              ${k.id === kind?.id && daten?.enrollment?.class_name && html`<span class="klasse">${daten.enrollment.class_name}</span>`}
            </button>`)}
        </div>`}
        ${istEltern && !ersteinrichtung && html`<button class=${'zahnrad' + (sicht === 'einrichtung' ? ' aktiv' : '')} aria-label="Einrichtung"
          onClick=${() => ansichtWechseln(sicht === 'einrichtung' ? 'heute' : 'einrichtung')}>${Icon.zahnrad}</button>`}
      </header>

      <${InstallHinweis} />

      ${sicht === 'einrichtung' ? html`<${Einrichtung} basis=${basis} kind=${kind} daten=${daten} aktualisieren=${aktualisieren}
            ersteinrichtung=${ersteinrichtung} email=${session.user.email} />`
        : sicht === 'termine' ? html`<${Termine} termine=${termine} kinder=${basis.kinder} istEltern=${istEltern}
            familyId=${basis.mitglied.family_id} aktuellId=${basis.aktuellId} faecher=${aktuelleFaecher} neuLaden=${termineNeu} />`
        : !daten ? html`<div class="laden" style="padding-top:20vh">Lädt …</div>`
        : daten.fehler ? html`<p class="fehler">Laden fehlgeschlagen. Bitte später erneut öffnen.</p>`
        : fach ? html`<${FachDetail} fach=${fach} daten=${daten} istEltern=${istEltern} onZurueck=${() => setFachId(null)} neuLaden=${neuLaden} />`
        : sicht === 'heute' ? html`<${Heute} kind=${kind} kinder=${basis.kinder} daten=${daten} termine=${termine} neuLaden=${neuLaden} onTermine=${() => ansichtWechseln('termine')} onFach=${(id) => { setAnsicht('faecher'); setFachId(id); }} />`
        : sicht === 'woche' ? html`<${Woche} daten=${daten} onFach=${(id) => { setAnsicht('faecher'); setFachId(id); }} />`
        : html`<${Faecher} daten=${daten} jahre=${basis.jahre} jahrId=${jahrId} aktuellId=${basis.aktuellId} setJahrId=${setJahrId} onFach=${setFachId} email=${session.user.email} />`}

      <nav class="unten" aria-label="Hauptnavigation">
        ${!ersteinrichtung && [['heute', 'Heute'], ['woche', 'Woche'], ['termine', 'Termine'], ['faecher', 'Fächer']].map(([id, name]) => html`
          <button class=${sicht === id ? 'aktiv' : ''} onClick=${() => ansichtWechseln(id)} aria-current=${sicht === id ? 'page' : null}>
            ${Icon[id]}<span>${name}</span>
          </button>`)}
      </nav>
    </div>`;
}

// ── Hinweis: Zum Home-Bildschirm ──────────────────────────────────────
function InstallHinweis() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const [weg, setWeg] = useState(lesen('install-hinweis') === 'weg');
  if (!ios || standalone || weg) return null;
  return html`<div class="hinweis">
    <div>Als App speichern: unten auf <strong>Teilen</strong> tippen, dann <strong>Zum Home-Bildschirm</strong>.</div>
    <button aria-label="Hinweis schließen" onClick=${() => { merken('install-hinweis', 'weg'); setWeg(true); }}>✕</button>
  </div>`;
}

// ── Heute ─────────────────────────────────────────────────────────────
function Heute({ kind, kinder, daten, termine, neuLaden, onFach, onTermine }) {
  const wt = new Date().getDay();
  const schultag = wt >= 1 && wt <= 5;
  const tag = schultag ? wt : 1;
  const faecherById = Object.fromEntries(daten.faecher.map((f) => [f.id, f]));

  // Doppelstunden zusammenfassen
  const bloecke = [];
  daten.stunden.filter((s) => s.weekday === tag).sort((a, b) => a.period - b.period).forEach((s) => {
    const letzter = bloecke[bloecke.length - 1];
    if (letzter && letzter.subject_id === s.subject_id && letzter.label === s.label && letzter.is_lsp === s.is_lsp && letzter.bis === s.period - 1) {
      letzter.bis = s.period;
    } else bloecke.push({ ...s, von: s.period, bis: s.period });
  });

  const offen = daten.aufgaben.filter((a) => !a.done);
  const naechste = (termine || []).filter((t) => (t.student_id === kind.id || t.student_id === null)
    && tageBis(t.event_on) >= 0 && tageBis(t.event_on) <= 21).slice(0, 5);

  return html`
    <h1>${schultag ? `Heute, ${TAGE[tag - 1]}` : 'Nächster Schultag: Montag'}</h1>
    ${!daten.enrollment ? html`<p class="leise">Für dieses Schuljahr ist noch keine Klasse angelegt.</p>` : html`
      <div class="liste stunden">
        ${bloecke.length === 0 && html`<div class="leer">Kein Unterricht eingetragen.</div>`}
        ${bloecke.map((b) => {
          const f = faecherById[b.subject_id];
          return html`
            <div class=${'stunde' + (f ? '' : ' pause')} style=${f ? `--f:${f.farbe}` : ''}
              onClick=${f ? () => onFach(f.id) : null} role=${f ? 'button' : null}>
              <div class="nr">${b.von === b.bis ? `${b.von}.` : `${b.von}.–${b.bis}.`}</div>
              <div class="fach">${f ? f.name : b.label}${b.is_lsp && html`<span class="lsp">LSP</span>`}</div>
            </div>`;
        })}
      </div>`}

    <h2>Nächste Termine</h2>
    <div class="liste">
      ${naechste.length === 0 ? html`<div class="leer">In den nächsten drei Wochen steht nichts an.</div>`
        : naechste.map((t) => html`<${TerminZeile} t=${t} kinder=${kinder} faecherById=${Object.fromEntries(daten.faecher.map((f) => [f.id, f]))} onClick=${onTermine} />`)}
    </div>

    <h2>Offene Aufgaben</h2>
    <${AufgabenListe} aufgaben=${offen} faecher=${daten.faecher} neuLaden=${neuLaden} leerText=${`${kind.name} hat keine offenen Aufgaben.`} />`;
}

// ── Woche ─────────────────────────────────────────────────────────────
function Woche({ daten, onFach }) {
  if (!daten.enrollment) return html`<h1>Woche</h1><p class="leise">Kein Stundenplan für dieses Schuljahr.</p>`;
  const faecherById = Object.fromEntries(daten.faecher.map((f) => [f.id, f]));
  const maxStunde = Math.max(0, ...daten.stunden.map((s) => s.period));
  const zelle = (t, p) => daten.stunden.find((s) => s.weekday === t && s.period === p);
  const heuteTag = new Date().getDay();

  return html`
    <h1>Stundenplan</h1>
    <div class="woche">
      <table>
        <thead><tr><th class="nr"></th>${TAGE_KURZ.map((t, i) => html`<th style=${i + 1 === heuteTag ? 'color:var(--kind)' : ''}>${t}</th>`)}</tr></thead>
        <tbody>
          ${Array.from({ length: maxStunde }, (_, i) => i + 1).map((p) => html`
            <tr><td class="nr">${p}</td>
              ${[1, 2, 3, 4, 5].map((t) => {
                const s = zelle(t, p);
                if (!s) return html`<td></td>`;
                const f = faecherById[s.subject_id];
                const cls = 'z' + (s.is_lsp ? ' lsp-z' : '') + (!f ? ' label' : '') + (t === heuteTag ? ' heute-sp' : '');
                const text = f ? kuerzel(f.name) : (s.label || '').replace('LSP ', '').split('/').map((x) => KUERZEL[x] || x).join('/');
                return html`<td class=${cls} style=${f ? `--f:${f.farbe}` : ''} title=${f ? f.name : s.label}>
                  ${f ? html`<button class="zelle" onClick=${() => onFach(f.id)} aria-label=${`${f.name}${s.is_lsp ? ' (LSP)' : ''}`}>${text}</button>` : text}
                </td>`;
              })}
            </tr>`)}
        </tbody>
      </table>
    </div>
    <p class="leise klein">Gestrichelt = LSP-Stunde. Tippe auf ein Fach für Noten und Themen.</p>`;
}

// ── Fächer-Übersicht ──────────────────────────────────────────────────
function Faecher({ daten, jahre, jahrId, aktuellId, setJahrId, onFach, email }) {
  return html`
    <h1>Fächer</h1>
    <div class="jahre">
      ${jahre.map((j) => html`<button class=${j.id === jahrId ? 'aktiv' : ''} onClick=${() => setJahrId(j.id)}>
        ${j.label}${j.id !== aktuellId ? ' (Archiv)' : ''}</button>`)}
    </div>
    ${!daten.enrollment ? html`<p class="leise">In diesem Schuljahr ist keine Klasse angelegt.</p>` : html`
      <div class="liste">
        ${daten.faecher.map((f) => {
          const s = daten.schnitte[f.id];
          return html`<button class="zeile" onClick=${() => onFach(f.id)}>
            <div class="haupt"><div class="titel">${f.name}</div>
              <div class="sub">${s?.grade_count ? `${s.grade_count} ${s.grade_count === 1 ? 'Note' : 'Noten'}` : 'noch keine Noten'}</div></div>
            ${s?.average != null && html`<span class="note" style=${`--nf:${notenFarbeSkala(s.average, istPunkte(daten.enrollment))}`}>${schnitt(s.average)}</span>`}
          </button>`;
        })}
      </div>
      <p class="leise klein">${istPunkte(daten.enrollment) ? 'Punkte 0–15. ' : ''}Schnitt: Klassenarbeiten zählen doppelt.</p>`}
    <div class="fuss"><span class="leise klein">Angemeldet als ${email}</span><br />
      <button onClick=${() => sb.auth.signOut()}>Abmelden</button></div>`;
}

// ── Fach-Detail ───────────────────────────────────────────────────────
function FachDetail({ fach, daten, istEltern, onZurueck, neuLaden }) {
  const [reiter, setReiter] = useState('noten');
  const [noten, setNoten] = useState(null);
  const [themen, setThemen] = useState(null);
  const [formular, setFormular] = useState(null);
  const [tick, setTick] = useState(0);
  const schnittWert = daten.schnitte[fach.id]?.average;
  const punkte = istPunkte(daten.enrollment);
  const nf = (v) => notenFarbeSkala(v, punkte);
  const aufgaben = daten.aufgaben.filter((a) => a.subject_id === fach.id);

  useEffect(() => {
    let aktiv = true;
    Promise.all([
      sb.from('grades').select('*').eq('subject_id', fach.id).order('graded_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
      sb.from('topics').select('*').eq('subject_id', fach.id).order('noted_on', { ascending: false }),
    ]).then(([g, t]) => { if (aktiv) { setNoten(g.data || []); setThemen(t.data || []); } });
    return () => { aktiv = false; };
  }, [fach.id, tick, daten]);

  const fertig = () => { setFormular(null); setTick((t) => t + 1); neuLaden(); };

  async function loeschen(tabelle, id, frage) {
    if (!confirm(frage)) return;
    const { error } = await sb.from(tabelle).delete().eq('id', id);
    if (error) alert('Löschen fehlgeschlagen: ' + error.message);
    fertig();
  }

  const darfHinzufuegen = reiter !== 'noten' || istEltern;

  return html`
    <button class="zurueck" onClick=${onZurueck}>‹ Zurück</button>
    <div class="fach-kopf">
      <h1>${fach.name}</h1>
      <span class="note gross" style=${`--nf:${nf(schnittWert)}`} aria-label="Schnitt">${schnitt(schnittWert)}</span>
    </div>

    <div class="reiter" role="tablist">
      ${[['noten', 'Noten'], ['themen', 'Themen'], ['aufgaben', 'Aufgaben']].map(([id, name]) => html`
        <button role="tab" aria-selected=${reiter === id} class=${reiter === id ? 'aktiv' : ''} onClick=${() => setReiter(id)}>${name}</button>`)}
    </div>

    ${reiter === 'noten' && html`
      <div class="liste">
        ${noten === null ? html`<div class="leer">Lädt …</div>`
          : noten.length === 0 ? html`<div class="leer">Noch keine Noten.${istEltern ? ' Mit + die erste eintragen.' : ''}</div>`
          : noten.map((n) => html`
            <div class="zeile">
              <span class="note" style=${`--nf:${nf(n.value)}`}>${noteText(n.label, n.value)}</span>
              <div class="haupt">
                <div class="titel">${n.kind}${Number(n.weight) === 2 && html`<span class="gewicht">×2</span>`}</div>
                <div class="sub">${[datum(n.graded_on), n.note].filter(Boolean).join(', ')}</div>
              </div>
              ${istEltern && html`<button class="loeschen" aria-label="Note löschen" onClick=${() => loeschen('grades', n.id, `Note ${noteText(n.label, n.value)} (${n.kind}) löschen?`)}>✕</button>`}
            </div>`)}
      </div>`}

    ${reiter === 'themen' && html`
      <div class="liste">
        ${themen === null ? html`<div class="leer">Lädt …</div>`
          : themen.length === 0 ? html`<div class="leer">Noch keine Themen. Mit + das aktuelle Thema eintragen.</div>`
          : themen.map((t) => html`
            <div class="zeile">
              <div class="haupt"><div class="titel">${t.title}</div>
                <div class="sub">${datum(t.noted_on)}${t.note ? `, ${t.note}` : ''}</div></div>
              <button class="loeschen" aria-label="Thema löschen" onClick=${() => loeschen('topics', t.id, `Thema „${t.title}“ löschen?`)}>✕</button>
            </div>`)}
      </div>`}

    ${reiter === 'aufgaben' && html`
      <${AufgabenListe} aufgaben=${aufgaben} faecher=${daten.faecher} neuLaden=${fertig} leerText="Keine Aufgaben in diesem Fach." loeschbar=${true} />`}

    ${darfHinzufuegen && html`<button class="plus" aria-label="Hinzufügen" onClick=${() => setFormular(reiter)}>+</button>`}

    ${formular === 'noten' && html`<${NotenFormular} fach=${fach} punkte=${punkte} onFertig=${fertig} onAbbrechen=${() => setFormular(null)} />`}
    ${formular === 'themen' && html`<${ThemaFormular} fach=${fach} onFertig=${fertig} onAbbrechen=${() => setFormular(null)} />`}
    ${formular === 'aufgaben' && html`<${AufgabeFormular} fach=${fach} enrollmentId=${daten.enrollment.id} onFertig=${fertig} onAbbrechen=${() => setFormular(null)} />`}`;
}

// ── Termine ───────────────────────────────────────────────────────────
function TerminZeile({ t, kinder, faecherById, onClick }) {
  const kind = kinder.find((k) => k.id === t.student_id);
  const f = faecherById[t.subject_id];
  const n = tageBis(t.event_on);
  const wann = n === 0 ? 'heute' : n === 1 ? 'morgen' : datum(t.event_on);
  return html`<button class="zeile termin" style=${`--f:${kind ? kind.color : BEIDE}`} onClick=${onClick} disabled=${!onClick}>
    <span class="balken"></span>
    <div class="haupt">
      <div class="titel">${t.important && html`<span class="stern" aria-label="wichtig">★ </span>`}${t.title}</div>
      <div class="sub"><span class=${n >= 0 && n <= 1 ? 'faellig-rot' : ''}>${wann}</span>, ${[kind ? kind.name : alleLabel(kinder), f?.name, t.kind !== 'Sonstige' ? t.kind : null].filter((x, i) => x && (i === 0 || !t.title.includes(x))).join(', ')}</div>
      ${t.note && html`<div class="sub">${t.note}</div>`}
    </div>
  </button>`;
}

function Termine({ termine, kinder, istEltern, familyId, aktuellId, faecher, neuLaden }) {
  const [ansicht, setAnsicht] = useState(lesen('termin-ansicht') || 'liste');
  const [filter, setFilter] = useState('alle');
  const [vergangene, setVergangene] = useState(false);
  const [monat, setMonat] = useState(heuteISO().slice(0, 7));
  const [gewaehlt, setGewaehlt] = useState(heuteISO());
  const [formular, setFormular] = useState(null);

  if (!termine) return html`<div class="laden" style="padding-top:20vh">Lädt …</div>`;
  const passt = (t) => filter === 'alle' || (filter === 'wichtig' ? t.important : (t.student_id === filter || t.student_id === null));
  const liste = termine.filter(passt);
  const kommend = liste.filter((t) => tageBis(t.event_on) >= 0);
  const vorbei = liste.filter((t) => tageBis(t.event_on) < 0).reverse();
  const bearbeiten = istEltern ? (t) => () => setFormular({ termin: t }) : () => null;
  const ansichtSetzen = (a) => { setAnsicht(a); merken('termin-ansicht', a); };
  const fertig = () => { setFormular(null); neuLaden(); };

  // Kalender
  const [j, m] = monat.split('-').map(Number);
  const tageImMonat = new Date(j, m, 0).getDate();
  const versatz = (new Date(j, m - 1, 1).getDay() + 6) % 7;
  const monatName = new Date(j, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const blaettern = (d) => { const x = new Date(j, m - 1 + d, 1); setMonat(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`); };
  const proTag = {}; liste.forEach((t) => { (proTag[t.event_on] ||= []).push(t); });
  const farbeVon = (t) => kinder.find((k) => k.id === t.student_id)?.color || BEIDE;

  return html`
    <div class="reiter" role="tablist">
      <button role="tab" aria-selected=${ansicht === 'liste'} class=${ansicht === 'liste' ? 'aktiv' : ''} onClick=${() => ansichtSetzen('liste')}>Liste</button>
      <button role="tab" aria-selected=${ansicht === 'kalender'} class=${ansicht === 'kalender' ? 'aktiv' : ''} onClick=${() => ansichtSetzen('kalender')}>Kalender</button>
    </div>
    <div class="jahre filter">
      ${[['alle', 'Alle', 'var(--tinte)'], ['wichtig', '★ Wichtig', 'var(--stern)'], ...kinder.map((k) => [k.id, k.name, k.color])].map(([id, name, c]) => html`
        <button class=${filter === id ? 'aktiv' : ''} style=${`--k:${c}`} onClick=${() => setFilter(id)} aria-pressed=${filter === id}>${name}</button>`)}
    </div>

    ${ansicht === 'liste' ? html`
      <div class="liste">
        ${kommend.length === 0 ? html`<div class="leer">Keine anstehenden Termine.${istEltern ? ' Mit + den ersten eintragen.' : ''}</div>`
          : kommend.map((t) => html`<${TerminZeile} t=${t} kinder=${kinder} faecherById=${faecher.byId} onClick=${bearbeiten(t)} />`)}
      </div>
      ${vorbei.length > 0 && html`
        <div class="fuss" style="margin-top:16px"><button onClick=${() => setVergangene(!vergangene)}>${vergangene ? 'Vergangene ausblenden' : `Vergangene anzeigen (${vorbei.length})`}</button></div>
        ${vergangene && html`<div class="liste vergangen">${vorbei.map((t) => html`<${TerminZeile} t=${t} kinder=${kinder} faecherById=${faecher.byId} onClick=${bearbeiten(t)} />`)}</div>`}`}
    ` : html`
      <div class="monat-kopf">
        <button onClick=${() => blaettern(-1)} aria-label="Vorheriger Monat">‹</button>
        <strong>${monatName}</strong>
        <button onClick=${() => blaettern(1)} aria-label="Nächster Monat">›</button>
      </div>
      <div class="kal">
        ${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => html`<div class="wt">${d}</div>`)}
        ${Array.from({ length: versatz }, () => html`<div></div>`)}
        ${Array.from({ length: tageImMonat }, (_, i) => {
          const iso = `${monat}-${String(i + 1).padStart(2, '0')}`;
          const ts = proTag[iso] || [];
          const wtag = (versatz + i) % 7;
          const cls = 'tag' + (iso === heuteISO() ? ' heute' : '') + (iso === gewaehlt ? ' gewaehlt' : '') + (wtag >= 5 ? ' wochenende' : '');
          return html`<button class=${cls} onClick=${() => setGewaehlt(iso)} aria-label=${`${datum(iso)}, ${ts.length} Termine`}>
            <span>${i + 1}</span>
            <span class="punkte">${ts.slice(0, 3).map((t) => html`<span class=${'punkt' + (t.important ? ' wichtig' : '')} style=${`--f:${farbeVon(t)}`}></span>`)}</span>
          </button>`;
        })}
      </div>
      <h2>${new Date(gewaehlt + 'T00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
      <div class="liste">
        ${(proTag[gewaehlt] || []).length === 0 ? html`<div class="leer">Keine Termine an diesem Tag.</div>`
          : proTag[gewaehlt].map((t) => html`<${TerminZeile} t=${t} kinder=${kinder} faecherById=${faecher.byId} onClick=${bearbeiten(t)} />`)}
      </div>`}

    ${istEltern && html`<button class="plus" aria-label="Termin eintragen" onClick=${() => setFormular({ datum: ansicht === 'kalender' ? gewaehlt : null })}>+</button>`}
    ${formular && html`<${TerminFormular} termin=${formular.termin} datumVorgabe=${formular.datum} kinder=${kinder} faecher=${faecher}
        familyId=${familyId} aktuellId=${aktuellId} onFertig=${fertig} onAbbrechen=${() => setFormular(null)} />`}`;
}

function TerminFormular({ termin, datumVorgabe, kinder, faecher, familyId, aktuellId, onFertig, onAbbrechen }) {
  const [titel, setTitel] = useState(termin?.title || '');
  const [tag, setTag] = useState(termin?.event_on || datumVorgabe || heuteISO());
  const [art, setArt] = useState(termin?.kind || 'Klassenarbeit');
  const [fuer, setFuer] = useState(termin ? (termin.student_id || 'beide') : kinder[0].id);
  const [fachId, setFachId] = useState(termin?.subject_id || '');
  const [wichtig, setWichtig] = useState(termin ? termin.important : true);
  const [notiz, setNotiz] = useState(termin?.note || '');
  const { busy, fehler, speichern } = useSpeichern(onFertig);
  const faecherListe = fuer === 'beide' ? [] : (faecher.byKind[fuer] || []);
  const fachName = faecher.byId[fachId]?.name;
  const titelFertig = titel.trim() || [fachName, art !== 'Sonstige' ? art : null].filter(Boolean).join(' ');

  const artWaehlen = (a) => { setArt(a); if (!termin) setWichtig(['Klassenarbeit', 'Elternabend'].includes(a)); };
  const zeile = () => ({
    family_id: familyId, school_year_id: aktuellId,
    student_id: fuer === 'beide' ? null : fuer,
    subject_id: fuer === 'beide' ? null : (fachId || null),
    title: titelFertig, kind: art, event_on: tag, important: wichtig, note: notiz.trim() || null,
  });
  async function loeschen() {
    if (!confirm(`Termin „${termin.title}“ löschen?`)) return;
    speichern(() => sb.from('events').delete().eq('id', termin.id));
  }

  return html`<${Sheet} titel=${termin ? 'Termin bearbeiten' : 'Termin eintragen'} onAbbrechen=${onAbbrechen}>
    <div class="feld"><span>Für wen?</span>
      <div class="wahl">
        ${kinder.map((k) => html`<button type="button" class=${fuer === k.id ? 'aktiv' : ''} style=${fuer === k.id ? `background:${k.color};border-color:${k.color}` : ''}
          onClick=${() => { setFuer(k.id); setFachId(''); }}>${k.name}</button>`)}
        <button type="button" class=${fuer === 'beide' ? 'aktiv' : ''} style=${fuer === 'beide' ? `background:${BEIDE};border-color:${BEIDE}` : ''}
          onClick=${() => { setFuer('beide'); setFachId(''); }}>${alleLabel(kinder)}</button>
      </div>
    </div>
    <div class="feld"><span>Art</span>
      <div class="wahl">${TERMIN_ARTEN.map((a) => html`<button type="button" class=${art === a ? 'aktiv' : ''} onClick=${() => artWaehlen(a)}>${a}</button>`)}</div>
    </div>
    ${faecherListe.length > 0 && html`<label class="feld"><span>Fach (optional)</span>
      <select value=${fachId} onChange=${(e) => setFachId(e.target.value)}>
        <option value="">– kein Fach –</option>
        ${faecherListe.map((f) => html`<option value=${f.id}>${f.name}</option>`)}
      </select></label>`}
    <label class="feld"><span>Datum</span><input type="date" value=${tag} onInput=${(e) => setTag(e.target.value)} /></label>
    <label class="feld"><span>Titel</span><input value=${titel} onInput=${(e) => setTitel(e.target.value)}
      placeholder=${titelFertig || 'z. B. Elternabend Klasse 6b'} /></label>
    <label class="feld"><span>Notiz (optional)</span><input value=${notiz} onInput=${(e) => setNotiz(e.target.value)} placeholder="z. B. Kapitel 3 und 4" /></label>
    <label class="zeile schalter">
      <input type="checkbox" class="check" checked=${wichtig} onChange=${(e) => setWichtig(e.target.checked)} />
      <div class="haupt"><div class="titel">★ Wichtig</div><div class="sub">Wird hervorgehoben</div></div>
    </label>
    ${fehler && html`<div class="fehler">${fehler}</div>`}
    <div class="aktionen">
      <button class="knopf zweit" onClick=${onAbbrechen}>Abbrechen</button>
      <button class="knopf" disabled=${busy || !titelFertig || !tag} onClick=${() => speichern(() => termin
        ? sb.from('events').update(zeile()).eq('id', termin.id)
        : sb.from('events').insert(zeile()))}>${busy ? 'Speichert …' : 'Termin speichern'}</button>
    </div>
    ${termin && html`<div class="fuss"><button style="color:var(--rot)" onClick=${loeschen}>Termin löschen</button></div>`}
  <//>`;
}

// ── Einrichtung ───────────────────────────────────────────────────────
function Einrichtung({ basis, kind, daten, aktualisieren, ersteinrichtung, email }) {
  const [sheet, setSheet] = useState(null);
  const aktuell = basis.jahre.find((j) => j.id === basis.aktuellId);
  const enr = daten?.enrollment;
  const faecher = daten?.faecher || [];
  const fertig = async () => { setSheet(null); await aktualisieren(); };

  async function klasseAnlegen() {
    const { error } = await sb.from('enrollments').insert({ student_id: kind.id, school_year_id: aktuell.id, class_name: null });
    if (error) alert('Anlegen fehlgeschlagen: ' + error.message);
    await aktualisieren();
    setSheet({ typ: 'klasse' });
  }

  async function verschieben(i, d) {
    const a = faecher[i]; const b = faecher[i + d];
    await Promise.all([
      ...faecher.map((f, idx) => (f.sort !== idx + 1 && f !== a && f !== b) ? sb.from('subjects').update({ sort: idx + 1 }).eq('id', f.id) : null).filter(Boolean),
      sb.from('subjects').update({ sort: i + d + 1 }).eq('id', a.id),
      sb.from('subjects').update({ sort: i + 1 }).eq('id', b.id),
    ]);
    aktualisieren();
  }

  return html`
    <h1>${ersteinrichtung ? 'Willkommen!' : 'Einrichtung'}</h1>
    ${ersteinrichtung && html`<p class="leise">Lege zuerst eure Kinder an, dann das aktuelle Schuljahr. Danach kommen Fächer und Stundenplan.</p>`}

    <h2>Kinder</h2>
    <div class="liste">
      ${basis.kinder.map((k) => html`
        <button class="zeile" onClick=${() => setSheet({ typ: 'kind', kind: k })}>
          <span class="farbpunkt" style=${`--f:${k.color}`}></span>
          <div class="haupt"><div class="titel">${k.name}</div></div>
          <span class="leise klein">Bearbeiten</span>
        </button>`)}
      <button class="zeile hinzu" onClick=${() => setSheet({ typ: 'kind' })}>+ Kind hinzufügen</button>
    </div>

    ${!aktuell ? html`
      <h2>Schuljahr</h2>
      <div class="liste"><div class="leer">Noch kein Schuljahr angelegt.</div></div>
      <div style="margin-top:12px">
        <button class="knopf" disabled=${!basis.kinder.length} onClick=${() => setSheet({ typ: 'wechsel' })}>Erstes Schuljahr anlegen</button>
        ${!basis.kinder.length && html`<p class="leise klein">Zuerst mindestens ein Kind hinzufügen.</p>`}
      </div>`
    : kind && html`
      <h2>Schuljahr ${aktuell.label} · ${kind.name}</h2>
      ${!daten ? html`<div class="leer">Lädt …</div>` : !enr ? html`
        <div class="liste"><div class="leer">${kind.name} ist für ${aktuell.label} noch nicht angelegt.</div></div>
        <div style="margin-top:12px"><button class="knopf" onClick=${klasseAnlegen}>${kind.name} für ${aktuell.label} anlegen</button></div>` : html`
        <div class="liste">
          <button class="zeile" onClick=${() => setSheet({ typ: 'klasse' })}>
            <div class="haupt"><div class="titel">Klasse ${enr.class_name || '–'}</div>
              <div class="sub">${istPunkte(enr) ? 'Punkte 0–15 (Oberstufe)' : 'Noten 1–6'}</div></div>
            <span class="leise klein">Ändern</span>
          </button>
        </div>
        <p class="leise klein">Mit den Knöpfen oben wählst du, für welches Kind du Fächer und Stundenplan bearbeitest.</p>

        <h2>Fächer</h2>
        <div class="liste">
          ${faecher.map((f, i) => html`
            <div class="zeile">
              <span class="farbpunkt" style=${`--f:${f.farbe}`}></span>
              <div class="haupt"><div class="titel">${f.name}</div></div>
              <button class="mini" disabled=${i === 0} onClick=${() => verschieben(i, -1)} aria-label=${`${f.name} nach oben`}>↑</button>
              <button class="mini" disabled=${i === faecher.length - 1} onClick=${() => verschieben(i, 1)} aria-label=${`${f.name} nach unten`}>↓</button>
              <button class="mini" onClick=${() => setSheet({ typ: 'fach', fach: f })} aria-label=${`${f.name} bearbeiten`}>✎</button>
            </div>`)}
          <button class="zeile hinzu" onClick=${() => setSheet({ typ: 'fach' })}>+ Fächer hinzufügen</button>
        </div>

        <h2>Stundenplan</h2>
        ${faecher.length === 0 ? html`<p class="leise">Lege zuerst Fächer an.</p>`
          : html`<${StundenplanEditor} daten=${daten} onZelle=${(tag, std, slot) => setSheet({ typ: 'stunde', tag, std, slot })} />`}
      `}

      <h2>Neues Schuljahr</h2>
      <p class="leise klein">Legt ${naechstesJahr(aktuell.label)} an, übernimmt die Fächer und stellt ${aktuell.label} ins Archiv. Noten, Themen und Termine bleiben dort erhalten.</p>
      <button class="knopf zweit" onClick=${() => setSheet({ typ: 'wechsel' })}>Schuljahreswechsel starten</button>`}

    <div class="fuss"><span class="leise klein">Angemeldet als ${email}</span><br />
      <button onClick=${() => sb.auth.signOut()}>Abmelden</button></div>

    ${sheet?.typ === 'kind' && html`<${KindFormular} k=${sheet.kind} familyId=${basis.mitglied.family_id} anzahl=${basis.kinder.length} onFertig=${fertig} onAbbrechen=${() => setSheet(null)} />`}
    ${sheet?.typ === 'klasse' && enr && html`<${KlasseFormular} enr=${enr} kind=${kind} onFertig=${fertig} onAbbrechen=${() => setSheet(null)} />`}
    ${sheet?.typ === 'fach' && html`<${FachFormular} fach=${sheet.fach} enr=${enr} faecher=${faecher} schnitte=${daten?.schnitte || {}} onFertig=${fertig} onAbbrechen=${() => setSheet(null)} />`}
    ${sheet?.typ === 'stunde' && html`<${StundeFormular} ...${sheet} enr=${enr} faecher=${faecher} stunden=${daten.stunden} onFertig=${fertig} onAbbrechen=${() => setSheet(null)} />`}
    ${sheet?.typ === 'wechsel' && html`<${WechselFormular} basis=${basis} aktuell=${aktuell} onFertig=${fertig} onAbbrechen=${() => setSheet(null)} />`}`;
}

function StundenplanEditor({ daten, onZelle }) {
  const maxStunde = Math.max(0, ...daten.stunden.map((s) => s.period));
  const [zeilen, setZeilen] = useState(Math.max(6, maxStunde));
  const faecherById = Object.fromEntries(daten.faecher.map((f) => [f.id, f]));
  const zelle = (t, p) => daten.stunden.find((s) => s.weekday === t && s.period === p);
  return html`
    <div class="woche editor">
      <table>
        <thead><tr><th class="nr"></th>${TAGE_KURZ.map((t) => html`<th>${t}</th>`)}</tr></thead>
        <tbody>
          ${Array.from({ length: Math.max(zeilen, maxStunde) }, (_, i) => i + 1).map((p) => html`
            <tr><td class="nr">${p}</td>
              ${[1, 2, 3, 4, 5].map((t) => {
                const s = zelle(t, p);
                const f = s && faecherById[s.subject_id];
                const cls = 'z' + (!s ? ' frei' : '') + (s?.is_lsp ? ' lsp-z' : '') + (s && !f ? ' label' : '');
                return html`<td class=${cls} style=${f ? `--f:${f.farbe}` : ''}>
                  <button class="zelle" onClick=${() => onZelle(t, p, s)} aria-label=${`${TAGE[t - 1]}, ${p}. Stunde: ${f ? f.name : s?.label || 'frei'}`}>
                    ${f ? kuerzel(f.name) : s ? (s.label || '').replace('LSP ', '') : '+'}
                  </button></td>`;
              })}
            </tr>`)}
        </tbody>
      </table>
    </div>
    ${zeilen < 12 && html`<div class="fuss" style="margin:8px 0 0"><button onClick=${() => setZeilen(Math.max(zeilen, maxStunde) + 1)}>+ weitere Stunde</button></div>`}
    <p class="leise klein">Tippe auf ein Feld, um es zu belegen oder zu ändern.</p>`;
}

function KindFormular({ k, familyId, anzahl, onFertig, onAbbrechen }) {
  const [name, setName] = useState(k?.name || '');
  const [farbe, setFarbe] = useState(k?.color || KINDFARBEN[anzahl % KINDFARBEN.length]);
  const { busy, fehler, speichern } = useSpeichern(onFertig);
  return html`<${Sheet} titel=${k ? `${k.name} bearbeiten` : 'Kind hinzufügen'} onAbbrechen=${onAbbrechen}>
    <label class="feld"><span>Vorname</span><input value=${name} onInput=${(e) => setName(e.target.value)} autocomplete="off" /></label>
    <div class="feld"><span>Farbe</span>
      <div class="farbwahl">${KINDFARBEN.map((c) => html`<button type="button" class=${farbe === c ? 'aktiv' : ''} style=${`--f:${c}`}
        onClick=${() => setFarbe(c)} aria-label=${`Farbe ${c}`} aria-pressed=${farbe === c}></button>`)}</div>
    </div>
    ${fehler && html`<div class="fehler">${fehler}</div>`}
    <div class="aktionen">
      <button class="knopf zweit" onClick=${onAbbrechen}>Abbrechen</button>
      <button class="knopf" style=${`background:${farbe}`} disabled=${busy || !name.trim()} onClick=${() => speichern(() => k
        ? sb.from('students').update({ name: name.trim(), color: farbe }).eq('id', k.id)
        : sb.from('students').insert({ family_id: familyId, name: name.trim(), color: farbe, sort: anzahl + 1 }))}>Speichern</button>
    </div>
  <//>`;
}

function KlasseFormular({ enr, kind, onFertig, onAbbrechen }) {
  const [klasse, setKlasse] = useState(enr.class_name || '');
  const [skala, setSkala] = useState(enr.grade_scale || 'noten');
  const { busy, fehler, speichern } = useSpeichern(onFertig);
  return html`<${Sheet} titel=${`Klasse von ${kind.name}`} onAbbrechen=${onAbbrechen}>
    <label class="feld"><span>Klasse</span><input value=${klasse} onInput=${(e) => setKlasse(e.target.value)} placeholder="z. B. 6b" /></label>
    <div class="feld"><span>Notensystem</span>
      <div class="wahl">
        <button type="button" class=${skala === 'noten' ? 'aktiv' : ''} onClick=${() => setSkala('noten')}>Noten 1–6</button>
        <button type="button" class=${skala === 'punkte' ? 'aktiv' : ''} onClick=${() => setSkala('punkte')}>Punkte 0–15</button>
      </div>
    </div>
    ${fehler && html`<div class="fehler">${fehler}</div>`}
    <div class="aktionen">
      <button class="knopf zweit" onClick=${onAbbrechen}>Abbrechen</button>
      <button class="knopf" disabled=${busy} onClick=${() => speichern(() => sb.from('enrollments')
        .update({ class_name: klasse.trim() || null, grade_scale: skala }).eq('id', enr.id))}>Speichern</button>
    </div>
  <//>`;
}

function FachFormular({ fach, enr, faecher, schnitte, onFertig, onAbbrechen }) {
  const [name, setName] = useState(fach?.name || '');
  const [auswahl, setAuswahl] = useState([]);
  const { busy, fehler, speichern } = useSpeichern(onFertig);
  const vorhanden = new Set(faecher.map((f) => f.name.toLowerCase()));
  const vorschlaege = STANDARD_FAECHER.filter((f) => !vorhanden.has(f.toLowerCase()));
  const umschalten = (f) => setAuswahl((a) => (a.includes(f) ? a.filter((x) => x !== f) : [...a, f]));
  const neu = [...auswahl, ...(name.trim() && !vorhanden.has(name.trim().toLowerCase()) ? [name.trim()] : [])];
  const anzahlNoten = fach ? (schnitte[fach.id]?.grade_count || 0) : 0;

  async function loeschen() {
    const warnung = anzahlNoten > 0
      ? `„${fach.name}“ löschen? Dabei werden auch ${anzahlNoten} Noten und alle Themen dieses Fachs gelöscht.`
      : `„${fach.name}“ löschen?`;
    if (!confirm(warnung)) return;
    speichern(() => sb.from('subjects').delete().eq('id', fach.id));
  }

  if (fach) return html`<${Sheet} titel=${`${fach.name} bearbeiten`} onAbbrechen=${onAbbrechen}>
    <label class="feld"><span>Name</span><input value=${name} onInput=${(e) => setName(e.target.value)} /></label>
    ${fehler && html`<div class="fehler">${/duplicate|unique/i.test(fehler) ? 'Dieses Fach gibt es schon.' : fehler}</div>`}
    <div class="aktionen">
      <button class="knopf zweit" onClick=${onAbbrechen}>Abbrechen</button>
      <button class="knopf" disabled=${busy || !name.trim()} onClick=${() => speichern(() => sb.from('subjects').update({ name: name.trim() }).eq('id', fach.id))}>Speichern</button>
    </div>
    <div class="fuss"><button style="color:var(--rot)" onClick=${loeschen}>Fach löschen</button></div>
  <//>`;

  return html`<${Sheet} titel="Fächer hinzufügen" onAbbrechen=${onAbbrechen}>
    ${vorschlaege.length > 0 && html`<div class="feld"><span>Antippen zum Auswählen</span>
      <div class="wahl">${vorschlaege.map((f) => html`<button type="button" class=${auswahl.includes(f) ? 'aktiv' : ''} onClick=${() => umschalten(f)} aria-pressed=${auswahl.includes(f)}>${f}</button>`)}</div>
    </div>`}
    <label class="feld"><span>Anderes Fach</span><input value=${name} onInput=${(e) => setName(e.target.value)} placeholder="z. B. Soko, Medienbildung" /></label>
    ${fehler && html`<div class="fehler">${/duplicate|unique/i.test(fehler) ? 'Eines der Fächer gibt es schon.' : fehler}</div>`}
    <div class="aktionen">
      <button class="knopf zweit" onClick=${onAbbrechen}>Abbrechen</button>
      <button class="knopf" disabled=${busy || neu.length === 0} onClick=${() => speichern(() => sb.from('subjects').insert(
        neu.map((n, i) => ({ enrollment_id: enr.id, name: n, sort: faecher.length + i + 1 }))))}>
        ${neu.length > 1 ? `${neu.length} Fächer hinzufügen` : 'Hinzufügen'}</button>
    </div>
  <//>`;
}

function StundeFormular({ tag, std, slot, enr, faecher, stunden, onFertig, onAbbrechen }) {
  const [fachId, setFachId] = useState(slot?.subject_id || (slot ? '' : faecher[0]?.id || ''));
  const [label, setLabel] = useState(slot && !slot.subject_id ? slot.label || '' : '');
  const [modus, setModus] = useState(slot && !slot.subject_id ? 'sonstiges' : 'fach');
  const [lsp, setLsp] = useState(slot?.is_lsp || false);
  const [doppel, setDoppel] = useState(false);
  const { busy, fehler, speichern } = useSpeichern(onFertig);
  const naechsteBelegt = stunden.some((s) => s.weekday === tag && s.period === std + 1);

  const zeile = (p) => ({
    enrollment_id: enr.id, weekday: tag, period: p, is_lsp: lsp,
    subject_id: modus === 'fach' ? fachId || null : null,
    label: modus === 'sonstiges' ? label.trim() || null : null,
  });
  const gueltig = modus === 'fach' ? !!fachId : !!label.trim();

  return html`<${Sheet} titel=${`${TAGE[tag - 1]}, ${std}. Stunde`} onAbbrechen=${onAbbrechen}>
    <div class="reiter">
      <button class=${modus === 'fach' ? 'aktiv' : ''} onClick=${() => setModus('fach')}>Fach</button>
      <button class=${modus === 'sonstiges' ? 'aktiv' : ''} onClick=${() => setModus('sonstiges')}>Sonstiges</button>
    </div>
    ${modus === 'fach' ? html`<div class="feld"><div class="wahl">
        ${faecher.map((f) => html`<button type="button" class=${fachId === f.id ? 'aktiv' : ''} onClick=${() => setFachId(f.id)}>${f.name}</button>`)}
      </div></div>`
    : html`<label class="feld"><span>Bezeichnung</span><input value=${label} onInput=${(e) => setLabel(e.target.value)} placeholder="z. B. Essen, Mittagspause" /></label>
      <div class="wahl" style="margin:-6px 0 14px">${['Essen', 'Mittagspause', 'Förderunterricht'].map((x) => html`<button type="button" onClick=${() => setLabel(x)}>${x}</button>`)}</div>`}
    <label class="zeile schalter">
      <input type="checkbox" class="check" checked=${lsp} onChange=${(e) => setLsp(e.target.checked)} />
      <div class="haupt"><div class="titel">LSP-Stunde</div><div class="sub">Wird gestrichelt angezeigt</div></div>
    </label>
    ${!slot && std < 12 && html`<label class="zeile schalter">
      <input type="checkbox" class="check" checked=${doppel} onChange=${(e) => setDoppel(e.target.checked)} />
      <div class="haupt"><div class="titel">Doppelstunde</div><div class="sub">Auch die ${std + 1}. Stunde gleich belegen${naechsteBelegt ? ' (überschreibt sie)' : ''}</div></div>
    </label>`}
    ${fehler && html`<div class="fehler">${fehler}</div>`}
    <div class="aktionen">
      <button class="knopf zweit" onClick=${onAbbrechen}>Abbrechen</button>
      <button class="knopf" disabled=${busy || !gueltig} onClick=${() => speichern(() => sb.from('timetable_slots')
        .upsert(doppel ? [zeile(std), zeile(std + 1)] : [zeile(std)], { onConflict: 'enrollment_id,weekday,period' }))}>Speichern</button>
    </div>
    ${slot && html`<div class="fuss"><button style="color:var(--rot)" onClick=${() => speichern(() => sb.from('timetable_slots').delete().eq('id', slot.id))}>Stunde freimachen</button></div>`}
  <//>`;
}

function WechselFormular({ basis, aktuell, onFertig, onAbbrechen }) {
  const [label, setLabel] = useState(naechstesJahr(aktuell?.label));
  const [klassen, setKlassen] = useState(null);
  const [stundenplan, setStundenplan] = useState(false);
  const [bestaetigt, setBestaetigt] = useState(!aktuell);
  const { busy, fehler, speichern } = useSpeichern(onFertig);

  useEffect(() => {
    (async () => {
      let alt = [];
      if (aktuell) ({ data: alt } = await sb.from('enrollments').select('*').eq('school_year_id', aktuell.id));
      setKlassen(Object.fromEntries(basis.kinder.map((k) => {
        const e = (alt || []).find((x) => x.student_id === k.id);
        return [k.id, { dabei: true, klasse: aktuell ? naechsteKlasse(e?.class_name || '') : '', skala: e?.grade_scale || 'noten' }];
      })));
    })();
  }, []);

  const setzen = (id, feld, wert) => setKlassen((k) => ({ ...k, [id]: { ...k[id], [feld]: wert } }));
  const doppelt = basis.jahre.some((j) => j.label === label.trim());
  const auswahl = klassen ? Object.entries(klassen).filter(([, v]) => v.dabei) : [];

  return html`<${Sheet} titel=${aktuell ? 'Schuljahreswechsel' : 'Erstes Schuljahr anlegen'} onAbbrechen=${onAbbrechen}>
    <label class="feld"><span>Schuljahr</span><input value=${label} onInput=${(e) => setLabel(e.target.value)} placeholder="z. B. 2027/28" /></label>
    ${doppelt && html`<div class="fehler">Dieses Schuljahr gibt es schon.</div>`}
    ${!klassen ? html`<div class="leer">Lädt …</div>` : html`
      <div class="feld"><span>Kinder und neue Klassen</span>
        <div class="liste">
          ${basis.kinder.map((k) => html`<div class="zeile wechsel-zeile">
            <input type="checkbox" class="check" checked=${klassen[k.id].dabei} onChange=${(e) => setzen(k.id, 'dabei', e.target.checked)} aria-label=${`${k.name} übernehmen`} />
            <div class="haupt"><div class="titel" style=${`color:${k.color}`}>${k.name}</div>
              <select value=${klassen[k.id].skala} onChange=${(e) => setzen(k.id, 'skala', e.target.value)} disabled=${!klassen[k.id].dabei} class="skala">
                <option value="noten">Noten 1–6</option><option value="punkte">Punkte 0–15</option>
              </select></div>
            <input class="klasse-feld" value=${klassen[k.id].klasse} onInput=${(e) => setzen(k.id, 'klasse', e.target.value)}
              placeholder="Klasse" disabled=${!klassen[k.id].dabei} aria-label=${`Klasse ${k.name}`} />
          </div>`)}
        </div>
      </div>`}
    ${aktuell && html`
      <label class="zeile schalter">
        <input type="checkbox" class="check" checked=${stundenplan} onChange=${(e) => setStundenplan(e.target.checked)} />
        <div class="haupt"><div class="titel">Stundenplan übernehmen</div><div class="sub">Meist ändert er sich. Dann aus lassen und neu eintragen.</div></div>
      </label>
      <p class="leise klein">Die Fächer werden übernommen und lassen sich danach anpassen. ${aktuell.label} wandert ins Archiv, alle Noten, Themen und Termine bleiben dort erhalten.</p>
      <label class="zeile schalter">
        <input type="checkbox" class="check" checked=${bestaetigt} onChange=${(e) => setBestaetigt(e.target.checked)} />
        <div class="haupt"><div class="titel">Ja, neues Schuljahr ${label} starten</div></div>
      </label>`}
    ${fehler && html`<div class="fehler">${fehler}</div>`}
    <div class="aktionen">
      <button class="knopf zweit" onClick=${onAbbrechen}>Abbrechen</button>
      <button class="knopf" disabled=${busy || !bestaetigt || doppelt || !label.trim() || auswahl.length === 0} onClick=${() => speichern(() => sb.rpc('schuljahr_wechseln', {
        p_family: basis.mitglied.family_id, p_label: label.trim(), p_stundenplan: stundenplan,
        p_klassen: Object.fromEntries(auswahl.map(([id, v]) => [id, { klasse: v.klasse.trim(), skala: v.skala }])),
      }))}>${busy ? 'Wird angelegt …' : aktuell ? 'Schuljahr wechseln' : 'Anlegen'}</button>
    </div>
  <//>`;
}

// ── Aufgabenliste (Heute + Fach) ──────────────────────────────────────
function AufgabenListe({ aufgaben, faecher, neuLaden, leerText, loeschbar }) {
  const fachName = (id) => faecher.find((f) => f.id === id)?.name;
  async function umschalten(a) {
    await sb.from('tasks').update({ done: !a.done }).eq('id', a.id);
    neuLaden();
  }
  async function loeschen(a) {
    if (!confirm(`Aufgabe „${a.title}“ löschen?`)) return;
    await sb.from('tasks').delete().eq('id', a.id);
    neuLaden();
  }
  return html`<div class="liste">
    ${aufgaben.length === 0 ? html`<div class="leer">${leerText}</div>` : aufgaben.map((a) => {
      const f = faelligText(a.due_on);
      return html`<div class=${'zeile' + (a.done ? ' erledigt' : '')}>
        <input type="checkbox" class="check" checked=${a.done} onChange=${() => umschalten(a)} aria-label=${`${a.title} erledigt`} />
        <div class="haupt">
          <div class="titel">${a.title}</div>
          <div class="sub">${[fachName(a.subject_id), a.kind !== 'Aufgabe' ? a.kind : null].filter(Boolean).join(', ')}${(fachName(a.subject_id) || a.kind !== 'Aufgabe') ? ' – ' : ''}<span class=${f.rot && !a.done ? 'faellig-rot' : ''}>${f.text}</span></div>
          ${a.description && html`<div class="sub">${a.description}</div>`}
        </div>
        ${loeschbar && html`<button class="loeschen" aria-label="Aufgabe löschen" onClick=${() => loeschen(a)}>✕</button>`}
      </div>`;
    })}
  </div>`;
}

// ── Formulare ─────────────────────────────────────────────────────────
function Sheet({ titel, children, onAbbrechen }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onAbbrechen(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []);
  return html`<div class="schleier" onClick=${(e) => { if (e.target === e.currentTarget) onAbbrechen(); }}>
    <div class="sheet" role="dialog" aria-modal="true" aria-label=${titel}><h2>${titel}</h2>${children}</div>
  </div>`;
}

function useSpeichern(onFertig) {
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState('');
  const speichern = async (fn) => {
    setBusy(true); setFehler('');
    const { error } = await fn();
    setBusy(false);
    if (error) setFehler('Speichern fehlgeschlagen: ' + error.message);
    else onFertig();
  };
  return { busy, fehler, speichern };
}

function NotenFormular({ fach, punkte, onFertig, onAbbrechen }) {
  const [art, setArt] = useState('Klassenarbeit');
  const [basis, setBasis] = useState(2);
  const [tendenz, setTendenz] = useState('');
  const [tag, setTag] = useState(heuteISO());
  const [info, setInfo] = useState('');
  const { busy, fehler, speichern } = useSpeichern(onFertig);
  const [pkt, setPkt] = useState(10);
  const n = punkte ? { label: String(pkt), value: pkt } : noteBerechnen(basis, tendenz);

  return html`<${Sheet} titel=${`Note in ${fach.name}`} onAbbrechen=${onAbbrechen}>
    <div class="feld"><span>Art</span>
      <div class="wahl">${NOTEN_ARTEN.map((a) => html`<button type="button" class=${art === a ? 'aktiv' : ''} onClick=${() => setArt(a)}>${a}</button>`)}</div>
    </div>
    ${punkte ? html`<div class="feld"><span>Punkte</span>
      <div class="wahl ziffern punkte">${Array.from({ length: 16 }, (_, i) => 15 - i).map((z) => html`<button type="button" class=${pkt === z ? 'aktiv' : ''} onClick=${() => setPkt(z)}>${z}</button>`)}</div>
    </div>` : html`
    <div class="feld"><span>Note</span>
      <div class="wahl ziffern">${[1, 2, 3, 4, 5, 6].map((z) => html`<button type="button" class=${basis === z ? 'aktiv' : ''} onClick=${() => { setBasis(z); if (z === 6 && tendenz === 'bis') setTendenz(''); }}>${z}</button>`)}</div>
    </div>
    <div class="feld"><span>Tendenz</span>
      <div class="wahl">
        ${[['', 'glatt'], ['+', `${basis}+`], ['-', `${basis}−`], ...(basis < 6 ? [['bis', `${basis}–${basis + 1}`]] : [])].map(([id, t]) =>
          html`<button type="button" class=${tendenz === id ? 'aktiv' : ''} onClick=${() => setTendenz(id)}>${t}</button>`)}
      </div>
    </div>`}
    <p class="leise klein">Wird gespeichert als <strong>${noteText(n.label, n.value)}${punkte ? ' Punkte' : ''}</strong>${punkte ? '' : ` (Wert ${String(n.value).replace('.', ',')})`}${art === 'Klassenarbeit' ? ', zählt doppelt' : ''}.</p>
    <label class="feld"><span>Datum</span><input type="date" value=${tag} onInput=${(e) => setTag(e.target.value)} /></label>
    <label class="feld"><span>Bemerkung (optional)</span><input value=${info} onInput=${(e) => setInfo(e.target.value)} placeholder="z. B. Thema der Arbeit" /></label>
    ${fehler && html`<div class="fehler">${fehler}</div>`}
    <div class="aktionen">
      <button class="knopf zweit" onClick=${onAbbrechen}>Abbrechen</button>
      <button class="knopf" disabled=${busy} onClick=${() => speichern(() => sb.from('grades').insert({
        subject_id: fach.id, kind: art, label: n.label, value: n.value, graded_on: tag || null, note: info.trim() || null,
      }))}>${busy ? 'Speichert …' : 'Note speichern'}</button>
    </div>
  <//>`;
}

function ThemaFormular({ fach, onFertig, onAbbrechen }) {
  const [titel, setTitel] = useState('');
  const [tag, setTag] = useState(heuteISO());
  const [info, setInfo] = useState('');
  const { busy, fehler, speichern } = useSpeichern(onFertig);
  return html`<${Sheet} titel=${`Thema in ${fach.name}`} onAbbrechen=${onAbbrechen}>
    <label class="feld"><span>Thema</span><input value=${titel} onInput=${(e) => setTitel(e.target.value)} placeholder="z. B. Bruchrechnung" /></label>
    <label class="feld"><span>Datum</span><input type="date" value=${tag} onInput=${(e) => setTag(e.target.value)} /></label>
    <label class="feld"><span>Notizen (optional)</span><textarea rows="3" value=${info} onInput=${(e) => setInfo(e.target.value)} placeholder="Buchseiten, Stichworte"></textarea></label>
    ${fehler && html`<div class="fehler">${fehler}</div>`}
    <div class="aktionen">
      <button class="knopf zweit" onClick=${onAbbrechen}>Abbrechen</button>
      <button class="knopf" disabled=${busy || !titel.trim()} onClick=${() => speichern(() => sb.from('topics').insert({
        subject_id: fach.id, title: titel.trim(), noted_on: tag || heuteISO(), note: info.trim() || null,
      }))}>${busy ? 'Speichert …' : 'Thema speichern'}</button>
    </div>
  <//>`;
}

function AufgabeFormular({ fach, enrollmentId, onFertig, onAbbrechen }) {
  const [titel, setTitel] = useState('');
  const [art, setArt] = useState('Aufgabe');
  const [faellig, setFaellig] = useState('');
  const [info, setInfo] = useState('');
  const { busy, fehler, speichern } = useSpeichern(onFertig);
  return html`<${Sheet} titel=${`Aufgabe in ${fach.name}`} onAbbrechen=${onAbbrechen}>
    <label class="feld"><span>Was ist zu tun?</span><input value=${titel} onInput=${(e) => setTitel(e.target.value)} placeholder="z. B. Vokabeln S. 45 lernen" /></label>
    <div class="feld"><span>Art</span>
      <div class="wahl">${AUFGABEN_ARTEN.map((a) => html`<button type="button" class=${art === a ? 'aktiv' : ''} onClick=${() => setArt(a)}>${a}</button>`)}</div>
    </div>
    <label class="feld"><span>Fällig am (optional)</span><input type="date" value=${faellig} onInput=${(e) => setFaellig(e.target.value)} /></label>
    <label class="feld"><span>Details (optional)</span><textarea rows="2" value=${info} onInput=${(e) => setInfo(e.target.value)}></textarea></label>
    ${fehler && html`<div class="fehler">${fehler}</div>`}
    <div class="aktionen">
      <button class="knopf zweit" onClick=${onAbbrechen}>Abbrechen</button>
      <button class="knopf" disabled=${busy || !titel.trim()} onClick=${() => speichern(() => sb.from('tasks').insert({
        enrollment_id: enrollmentId, subject_id: fach.id, title: titel.trim(), kind: art, due_on: faellig || null, description: info.trim() || null,
      }))}>${busy ? 'Speichert …' : 'Aufgabe speichern'}</button>
    </div>
  <//>`;
}

render(html`<${App} />`, document.getElementById('app'));
