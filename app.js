(() => {
  const $ = id => document.getElementById(id);
  let unit = 'cm';
  let famCount = 0;
  const heightFields = new Set();

  const toFtIn = cm => {
    const totalHundredths = Math.round(cm / 2.54 * 100);
    const ft = Math.floor(totalHundredths / 1200);
    return { ft, inch: (totalHundredths - ft * 1200) / 100 };
  };
  const fmtCm = cm => `${Number(cm.toFixed(2))} cm`;
  const fmtFt = cm => {
    const parts = toFtIn(cm);
    return `${parts.ft}'${parts.inch}"`;
  };
  const fmt = cm => unit === 'cm' ? fmtCm(cm) : fmtFt(cm);
  const fmtOther = cm => unit === 'cm' ? fmtFt(cm) : fmtCm(cm);
  const fmtAmount = cm => unit === 'cm' ? `${Number(cm.toFixed(2))} cm` : `${Number((cm / 2.54).toFixed(2))} in`;

  function makeHeight(id, labelText, value) {
    const el = document.createElement('div');
    el.className = 'hf';
    const label = document.createElement('label');
    label.htmlFor = `${id}-cm`;
    label.textContent = labelText;
    const cmBox = document.createElement('div');
    cmBox.className = 'unitbox';
    const cm = Object.assign(document.createElement('input'), { id: `${id}-cm`, type: 'number', inputMode: 'decimal', min: 40, max: 240, step: 'any' });
    cm.setAttribute('aria-label', `${labelText} in centimetres`);
    const cmText = document.createElement('span'); cmText.textContent = 'cm';
    cmBox.append(cm, cmText);
    const ftBox = document.createElement('div');
    ftBox.className = 'unitbox';
    const ft = Object.assign(document.createElement('input'), { id: `${id}-ft`, type: 'number', inputMode: 'numeric', min: 1, max: 7 });
    ft.setAttribute('aria-label', `${labelText}, feet`);
    const ftText = document.createElement('span'); ftText.textContent = 'ft';
    const inch = Object.assign(document.createElement('input'), { id: `${id}-in`, type: 'number', inputMode: 'decimal', min: 0, max: 11.9, step: 'any' });
    inch.setAttribute('aria-label', `${labelText}, inches`);
    const inText = document.createElement('span'); inText.textContent = 'in';
    ftBox.append(ft, ftText, inch, inText);
    el.append(label, cmBox, ftBox);
    el._parts = { label, cmBox, ftBox, cm, ft, inch };
    /* Keeps the exact height when switching units, until someone types a new one. */
    let exact = null;
    [cm, ft, inch].forEach(box => box.addEventListener('input', () => { exact = null; }));
    el.getCm = () => {
      if (exact != null) return exact;
      if (unit === 'cm') { const v = parseFloat(cm.value); return Number.isFinite(v) ? v : null; }
      const f = parseFloat(ft.value), i = parseFloat(inch.value);
      if (!Number.isFinite(f) && !Number.isFinite(i)) return null;
      return ((Number.isFinite(f) ? f : 0) * 12 + (Number.isFinite(i) ? i : 0)) * 2.54;
    };
    el.setCm = v => {
      exact = v;
      if (v == null) { cm.value = ft.value = inch.value = ''; return; }
      cm.value = Math.round(v * 100) / 100;
      const parts = toFtIn(v); ft.value = parts.ft; inch.value = parts.inch;
    };
    el.syncUnit = () => {
      cmBox.hidden = unit !== 'cm'; ftBox.hidden = unit === 'cm';
      label.htmlFor = unit === 'cm' ? `${id}-cm` : `${id}-ft`;
    };
    el.setCm(value);
    el.syncUnit();
    heightFields.add(el);
    return el;
  }

  const current = makeHeight('current', 'Your height now (optional)', 162);
  const mum = makeHeight('mum', "Mum's height", 165);
  const dad = makeHeight('dad', "Dad's height", 180);
  $('slot-current').append(current);
  $('slot-mum').append(mum);
  $('slot-dad').append(dad);

  const relations = ['Brother', 'Sister', 'Grandad', 'Gran', 'Uncle', 'Aunt'];
  function addFamily(relation, value) {
    if ($('family').children.length >= 6) return;
    const n = ++famCount;
    const row = document.createElement('div');
    row.className = 'famrow';
    const relBox = document.createElement('div');
    const relLabel = document.createElement('label');
    relLabel.htmlFor = `fam-rel-${n}`; relLabel.textContent = 'Who';
    const select = document.createElement('select');
    select.id = `fam-rel-${n}`;
    relations.forEach(r => select.add(new Option(r, r)));
    select.value = relation;
    relBox.append(relLabel, select);
    const h = makeHeight(`fam-${n}`, 'Adult height', value);
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'ghost remove'; remove.textContent = 'Remove';
    remove.setAttribute('aria-label', 'Remove this family member');
    remove.onclick = () => { heightFields.delete(h); row.remove(); touched(); update(); };
    row.append(relBox, h, remove);
    row._rel = select; row._height = h;
    $('family').append(row);
    syncAddButton();
  }
  function syncAddButton() { $('add-family').disabled = $('family').children.length >= 6; }
  addFamily('Grandad', 175);
  addFamily('Brother', 178);

  function touched() { $('example').hidden = true; }

  function calculate() {
    const m = mum.getCm(), d = dad.getCm(), cur = current.getCm();
    const sex = $('sex').value, stage = $('stage').value;
    /* 14.8 means 14 years 8 months here, not 14.8 years. */
    const bloom = $('bloom').value;
    const ageText = $('age').value.trim();
    const shorthand = ageText.match(/^(\d+)\.(\d{1,2})$/);
    const monthsBox = parseFloat($('age-months').value);
    const extraMonths = Number.isFinite(monthsBox) ? Math.max(0, Math.min(11, monthsBox)) : 0;
    const age = shorthand && Number(shorthand[2]) <= 11
      ? Number(shorthand[1]) + Number(shorthand[2]) / 12
      : parseFloat(ageText) + extraMonths / 12;
    const valid = v => v != null && v >= 120 && v <= 240;
    const validCur = cur == null || (cur >= 40 && cur <= 240);
    const notes = [];
    if (!validCur) notes.push('Check your current height. It looks out of range, so it has been left out.');
    const curOk = validCur ? cur : null;

    if (stage === 'stopped' && curOk != null) {
      notes.push("Your height hasn't changed for over a year, so your growth plates have probably closed. Expect little or no more growth.");
      if (valid(m) && valid(d)) {
        const parentEst = (m + d + (sex === 'male' ? 13 : -13)) / 2;
        notes.push(`For comparison, your parents' heights point to about ${fmt(parentEst)}.`);
      }
      return { kicker: 'Your adult height', est: curOk, low: curOk, high: curOk + 1, cur: curOk, notes };
    }
    if (!valid(m) || !valid(d)) {
      notes.push(`Add both parents' heights to get an estimate. They need to be between ${fmt(120)} and ${fmt(240)}.`);
      return { kicker: 'Estimated adult height', est: null, cur: curOk, notes };
    }

    const mid = (m + d + (sex === 'male' ? 13 : -13)) / 2;
    const familyResult = familyEstimate(mid, m, d, sex);
    const projected = projectFromCurrent(curOk, age, sex, bloom, stage);
    let est = projected == null ? familyResult.cm : (familyResult.cm + projected) / 2;
    let low = est - 3, high = est + 5;
    notes.push(familyResult.basis === 'male'
      ? `Based on your dad and any brothers, grandads and uncles you added, because your mum is ${fmt(163)} or taller.`
      : `Based on both parents, because your mum is under ${fmt(163)}.`);
    const limitsAt = whichAge => {
      let limits = { before: [15, Infinity], during: [6, 15], slowing: [1, 6] }[stage];
      if (Number.isFinite(whichAge)) {
        const growthAge = sex === 'male' ? whichAge : whichAge + 2;
        const between = (from, to, start, end) => start + (end - start) * Math.min(1, Math.max(0, (growthAge - from) / (to - from)));
        let ageMax = growthAge >= 18 ? 3 : growthAge >= 17 ? between(17, 18, 4, 3) : growthAge >= 16 ? between(16, 17, 5, 4) : null;
        /* Teens well below their family-based height get some catch-up room at 16 to 17. */
        if (ageMax != null && curOk != null) {
          const catchUpShare = growthAge >= 18 ? 0 : growthAge >= 17 ? between(17, 18, .25, 0) : between(16, 17, .5, .25);
          ageMax += Math.min(10, catchUpShare * Math.max(0, familyResult.cm - curOk - ageMax));
        }
        if (ageMax != null) {
          const least = limits ? limits[0] : 0;
          const most = limits ? limits[1] : Infinity;
          const capped = Math.min(most, ageMax);
          limits = [least < capped ? least : 0, capped];
        } else if (stage !== 'slowing' && growthAge >= 14) {
          limits = growthAge < 15
            ? [between(14, 15, 5, 3), between(14, 15, 30, 15)]
            : [between(15, 16, 3, 0), between(15, 16, 15, 5 + (curOk != null ? Math.min(10, .5 * Math.max(0, familyResult.cm - curOk - 5)) : 0))];
        } else if (stage !== 'slowing' && growthAge >= 8) {
          limits = [growthAge < 12 ? 15 : growthAge < 13 ? between(12, 13, 15, 9) : between(13, 14, 9, 5), Infinity];
        }
        /* A growth spurt still to come means more growth left than usual for this age. */
        if (stage === 'before' && limits) {
          const spurtMinimum = growthAge < 15 ? 15 : between(15, 16, 15, 5);
          limits = [Math.max(limits[0], growthAge < 16 ? spurtMinimum : 0), limits[1] * 1.5];
        }
      }
      if (limits && bloom === 'early') limits = [limits[0] / 2, limits[1]];
      if (limits && bloom === 'late' && stage !== 'slowing') limits = [limits[0] * 1.5, limits[1] * 1.5];
      return limits;
    };
    const stageLimits = limitsAt(age);
    /* Older ages cap younger ones, so the prediction falls by at most this much a year, spread evenly across the months. */
    const MAX_DROP_PER_YEAR = 3.6;
    const rawAt = whichAge => {
      const fromHeight = projectFromCurrent(curOk, whichAge, sex, bloom, stage);
      const blended = fromHeight == null ? familyResult.cm : (familyResult.cm + fromHeight) / 2;
      const limits = limitsAt(whichAge);
      return curOk != null && limits ? Math.min(curOk + limits[1], Math.max(curOk + limits[0], blended)) : blended;
    };
    const capStartAge = sex === 'male' ? 16 : 14;
    if (curOk != null && Number.isFinite(age) && age >= 8 && age < capStartAge) {
      const nextBirthday = Math.ceil(age);
      let capAhead = rawAt(capStartAge);
      for (let year = capStartAge - 1; year >= nextBirthday; year--) capAhead = Math.min(rawAt(year), capAhead + MAX_DROP_PER_YEAR);
      est = Math.min(rawAt(age), capAhead + MAX_DROP_PER_YEAR * (nextBirthday - age));
      low = est - 3;
      high = est + 5;
    }
    if (curOk != null && stageLimits) {
      const least = Number(stageLimits[0].toFixed(2));
      const most = stageLimits[1] === Infinity ? Infinity : Number(stageLimits[1].toFixed(2));
      notes.push(`Based on your age and growth stage, Heightline allows ${most === Infinity ? `at least ${fmtAmount(least)}` : least === 0 ? `up to ${fmtAmount(most)}` : `${fmtAmount(least)} to ${fmtAmount(most)}`} more than your height now.`);
    }
    if (curOk != null && stageLimits) {
      const least = curOk + stageLimits[0], most = curOk + stageLimits[1];
      est = Math.min(most, Math.max(least, est));
      low = Math.max(est - 3, least);
      high = Math.min(est + 5, most);
    }
    if (curOk != null) {
      if (curOk >= est) {
        est = curOk;
        if (!stageLimits) high = curOk + 5;
        notes.push("You're already at or above your parents-based estimate. You may still grow, but this formula can't tell you how much.");
      } else {
        notes.push(`That's about ${fmtAmount(est - curOk)} more than your height now. This is an estimate, so the real number could be quite different.`);
      }
      low = Math.max(low, curOk);
      high = Math.max(high, curOk);
    }
    if (curOk == null && (stage === 'before' || stage === 'during' || stage === 'slowing')) notes.push('Add your height now so Heightline can use your age and growth stage.');
    if (stage === 'stopped') notes.push("Add your current height, since it's the best answer once you've stopped growing.");
    if (Number.isFinite(age) && age >= 18 && stage !== 'stopped') notes.push('Most people have stopped growing or nearly stopped by 18, so your current height is probably close to final.');
    if (Number.isFinite(age) && age < 2) notes.push('This estimate is designed for children aged 2 and over.');
    return { kicker: 'Estimated adult height', est, low, high, cur: curOk, mid, basis: familyResult.basis, familyCm: familyResult.cm, projected, limits: curOk != null ? stageLimits : null, age, notes };
  }

  function svg(tag, attrs, parent) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    parent.append(el);
    return el;
  }

  function drawFrame(r) {
    const frame = $('frame');
    frame.replaceChildren();
    const fam = [...$('family').children]
      .map(row => ({ name: row._rel.value, cm: row._height.getCm() }))
      .filter(f => f.cm != null && f.cm >= 40 && f.cm <= 240);
    const marks = [
      ...(r.familyEst != null ? [{ name: 'Parents method', cm: r.familyEst }] : []),
      ...(r.cur != null && r.est !== r.cur ? [{ name: 'You now', cm: r.cur }] : []),
      ...(mum.getCm() >= 120 && mum.getCm() <= 240 ? [{ name: 'Mum', cm: mum.getCm() }] : []),
      ...(dad.getCm() >= 120 && dad.getCm() <= 240 ? [{ name: 'Dad', cm: dad.getCm() }] : []),
      ...fam
    ];
    const all = [...marks.map(m => m.cm), ...(r.est != null ? [r.est, r.low, r.high] : [])];
    if (!all.length) return;
    const min = Math.floor((Math.min(...all) - 6) / 10) * 10;
    const max = Math.ceil((Math.max(...all) + 6) / 10) * 10;
    const top = 16, bottom = 414, W = 340, left = 50, frameRight = 142;
    const y = cm => bottom - (cm - min) / (max - min) * (bottom - top);

    if (r.est != null && r.high > r.low) {
      svg('rect', { class: 'band', x: left, y: y(r.high), width: frameRight - left, height: y(r.low) - y(r.high) }, frame);
    }
    const step = max - min > 70 ? 20 : 10;
    for (let c = min; c <= max; c += step) {
      svg('line', { class: 'tick', x1: left - 8, x2: left, y1: y(c), y2: y(c) }, frame);
      const label = svg('text', { class: 'ticktext', x: left - 12, y: y(c) + 4, 'text-anchor': 'end' }, frame);
      label.textContent = unit === 'cm' ? c : fmtFt(c);
      if (unit !== 'cm') label.style.fontSize = '10px';
    }
    svg('line', { class: 'tick', x1: left, x2: left, y1: top, y2: bottom }, frame);

    const labels = marks.map(m => ({ text: `${m.name} ${fmt(m.cm)}`, cm: m.cm, cls: 'famlabel', line: 'famline' }));
    if (r.est != null) labels.push({ text: `${r.kicker === 'Your adult height' ? 'You' : 'Estimate'} ${fmt(r.est)}`, cm: r.est, cls: 'mainlabel', line: 'main' });
    labels.sort((a, b) => b.cm - a.cm);
    const gap = 22, labelX = 154;
    let cursor = top + 6;
    labels.forEach(l => { l.ly = Math.max(y(l.cm), cursor); cursor = l.ly + gap; });
    const overflow = labels.length ? labels[labels.length - 1].ly - (bottom - 2) : 0;
    if (overflow > 0) {
      let limit = bottom - 2;
      for (let i = labels.length - 1; i >= 0; i--) {
        labels[i].ly = Math.min(labels[i].ly, limit);
        limit = labels[i].ly - gap;
      }
    }
    labels.forEach(l => {
      svg('line', { class: l.line, x1: left + 12, x2: frameRight, y1: y(l.cm), y2: y(l.cm) }, frame);
      svg('line', { class: 'leader', x1: frameRight, x2: labelX - 4, y1: y(l.cm), y2: l.ly - 5 }, frame);
      const t = svg('text', { class: l.cls, x: labelX, y: l.ly }, frame);
      t.textContent = l.text;
      if (l.text.length > 18) t.setAttribute('style', 'font-size:15px');
    });
    frame.setAttribute('viewBox', `0 0 ${W} 430`);
  }

  let lastShare = '';
  let lastResult = null;
  /* Rough average share of adult height reached at each whole age, blended evenly between birthdays. */
  const adultShare = {
    male: { 8: 72, 9: 75, 10: 78, 11: 81.1, 12: 84.2, 13: 87.3, 14: 91.5, 15: 96.1, 16: 98.3, 17: 99.3, 18: 99.8 },
    female: { 8: 77, 9: 80, 10: 83.2, 11: 86.2, 12: 90.6, 13: 95, 14: 97.4, 15: 98.6, 16: 99.3, 17: 99.7, 18: 99.9 }
  };
  function projectFromCurrent(cur, age, sex, bloom, stage) {
    if (cur == null || !Number.isFinite(age) || age < 8) return null;
    const table = adultShare[sex];
    const share = whole => {
      const base = whole >= 18 ? table[18] : table[whole];
      const shift = (bloom === 'early' ? 2 : bloom === 'late' ? -2 : 0) + (stage === 'before' ? -3 : 0);
      return Math.min(100, base + shift);
    };
    const year = Math.min(18, Math.floor(age));
    const thisYear = cur / (share(year) / 100);
    if (year >= 18) return thisYear;
    const nextYear = cur / (share(year + 1) / 100);
    const fraction = age - Math.floor(age);
    return thisYear + (nextYear - thisYear) * fraction;
  }
  function renderTech(r) {
    const tech = $('tech');
    tech.hidden = r.mid == null;
    if (r.mid == null) return;
    const rows = [
      ['Method used', r.basis === 'male' ? 'Male relatives average' : 'Both parents'],
      ['Standard parents method', fmt(r.mid)],
      ['Family-based height', fmt(r.familyCm)],
      ...(r.projected != null ? [['Projected from height now', fmt(r.projected)], ['Blend of both, before limits', fmt((r.familyCm + r.projected) / 2)]] : [])
    ];
    if (Number.isFinite(r.age)) {
      const years = Math.floor(r.age);
      rows.push(['Age used', `${years} years ${Math.round((r.age - years) * 12)} months`]);
    }
    if (r.limits) {
      const [least, most] = r.limits;
      rows.push(['Growth allowed', most === Infinity ? `At least ${fmtAmount(least)}` : least === 0 ? `Up to ${fmtAmount(most)}` : `${fmtAmount(least)} to ${fmtAmount(most)}`]);
    }
    if (r.cur != null) {
      rows.push(['Height now', fmt(r.cur)]);
      rows.push(['Growth left', fmtAmount(r.est - r.cur)]);
    }
    rows.push(['Final estimate', fmt(r.est)]);
    rows.push(['Best-guess zone', `${fmt(r.low)} to ${fmt(r.high)}`]);
    $('tech-list').replaceChildren(...rows.flatMap(([name, value]) => {
      const term = document.createElement('dt'); term.textContent = name;
      const detail = document.createElement('dd'); detail.textContent = value;
      return [term, detail];
    }));
  }
  /* Experimental and deliberately separate from the mid-parental estimate. */
  function familyEstimate(mid, mumCm, dadCm, sex) {
    if (mumCm < 163) return { cm: mid, basis: 'both' };
    const weights = { Brother: .25, Grandad: .125, Uncle: .125 };
    let total = .5, sum = dadCm * .5;
    [...$('family').children].forEach(row => {
      const cm = row._height.getCm();
      const weight = weights[row._rel.value];
      if (cm == null || cm < 120 || cm > 240 || !weight) return;
      sum += cm * weight;
      total += weight;
    });
    return { cm: sum / total + (sex === 'male' ? 0 : -13), basis: 'male' };
  }
  function fmtFamilyShift(shift) {
    if (unit === 'cm') {
      const rounded = Math.round(shift);
      return rounded === 0 ? 'about the same' : `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)} cm`;
    }
    const inches = Math.round(Math.abs(shift) / 2.54 * 100) / 100;
    return inches === 0 ? 'about the same' : `${shift > 0 ? '+' : '−'}${inches} in`;
  }
  let renderTrackerHook = null;
  function update() {
    const r = calculate();
    $('kicker').textContent = r.kicker;
    const family = r.basis === 'male' ? { cm: r.mid, shift: r.mid - r.est } : null;
    r.familyEst = family ? family.cm : null;
    $('family-line').hidden = !family;
    $('family-est').textContent = family ? `Standard parents method: about ${fmt(family.cm)} (${fmtFamilyShift(family.shift)})` : '';
    if (r.est == null) {
      $('big').textContent = '—'; $('alt').textContent = ''; $('range').textContent = '';
      lastShare = '';
    } else {
      $('big').textContent = `${r.high > r.low ? 'Around ' : ''}${fmt(r.est)}`;
      $('alt').textContent = fmtOther(r.est);
      $('range').textContent = r.high > r.low ? `Best-guess zone: ${fmt(r.low)} to ${fmt(r.high)}` : '';
      lastShare = r.high > r.low
        ? `My estimated adult height on Heightline: around ${fmt(r.est)}, best-guess zone ${fmt(r.low)} to ${fmt(r.high)}. It's only an estimate!`
        : `My height on Heightline: ${fmt(r.est)}.`;
    }
    $('copy').disabled = !lastShare;
    $('copied').textContent = '';
    const notes = $('notes');
    notes.replaceChildren(...r.notes.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    renderTech(r);
    drawFrame(r);
    lastResult = r;
    if (renderTrackerHook) renderTrackerHook();
  }

  function setUnit(next) {
    if (next === unit) return;
    const values = new Map([...heightFields].map(f => [f, f.getCm()]));
    unit = next;
    heightFields.forEach(f => { f.setCm(values.get(f)); f.syncUnit(); });
    $('unit-cm').setAttribute('aria-pressed', unit === 'cm');
    $('unit-ft').setAttribute('aria-pressed', unit === 'ft');
    update();
  }

  $('unit-cm').onclick = () => setUnit('cm');
  $('unit-ft').onclick = () => setUnit('ft');
  $('add-family').onclick = () => { touched(); addFamily('Sister', null); update(); };
  $('form').addEventListener('input', () => { touched(); update(); });
  $('form').addEventListener('submit', e => e.preventDefault());
  $('copy').onclick = () => {
    const done = () => { $('copied').textContent = 'Copied'; };
    const fail = () => { $('copied').textContent = lastShare; };
    try {
      const p = navigator.clipboard && navigator.clipboard.writeText(lastShare);
      if (p) p.then(done, fail); else fail();
    } catch { fail(); }
  };
  update();

  /* Growth tracker: one private document per measured date, under the viewer's own subtree. */
  const entryHeight = makeHeight('entry', 'Height', null);
  $('slot-entry').append(entryHeight);
  const DAY = 86400000;
  const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
  const stamp = s => Date.parse(`${s}T00:00:00Z`);
  const niceDate = (s, opts) => new Date(stamp(s)).toLocaleDateString(undefined, { timeZone: 'UTC', ...(opts || { day: 'numeric', month: 'short', year: 'numeric' }) });
  const localToday = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const today = localToday();
  $('entry-date').value = today;
  $('entry-date').max = today;

  let entries = [];
  let store = null;
  let col = null;
  let firstData = true;
  let armedRemove = null;

  const setStatus = text => { $('entry-status').textContent = text; };
  const signedDelta = cm => {
    if (Math.abs(cm) < 0.05) return 'No change';
    const v = unit === 'cm' ? `${Number(Math.abs(cm).toFixed(2))} cm` : `${Number((Math.abs(cm) / 2.54).toFixed(2))} in`;
    return `${cm > 0 ? '+' : '−'}${v}`;
  };
  const fmtEntry = cm => unit === 'cm' ? `${Number(cm.toFixed(2))} cm` : fmtFt(cm);

  function drawGrowth() {
    const chart = $('growth');
    chart.replaceChildren();
    chart.toggleAttribute('hidden', !entries.length);
    if (!entries.length) return;
    const W = Math.max(300, Math.floor(chart.parentElement.clientWidth) || 620);
    const H = 270, L = 52, R = W - 18, T = 16, B = H - 28;
    chart.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const r = lastResult;
    const hasTarget = r && r.est != null && r.high > r.low;
    const values = [...entries.map(e => e.cm), ...(hasTarget ? [r.low, r.high] : [])];
    const min = Math.floor((Math.min(...values) - 3) / 5) * 5;
    const max = Math.ceil((Math.max(...values) + 3) / 5) * 5;
    const y = cm => B - (cm - min) / (max - min) * (B - T);
    const t0 = stamp(entries[0].date), t1 = stamp(entries[entries.length - 1].date);
    const x = s => t1 === t0 ? (L + R) / 2 : L + 10 + (stamp(s) - t0) / (t1 - t0) * (R - L - 20);

    if (hasTarget) svg('rect', { class: 'band', x: L, y: y(r.high), width: R - L, height: y(r.low) - y(r.high) }, chart);
    const span = max - min;
    const step = span > 80 ? 20 : span > 40 ? 10 : 5;
    for (let c = Math.ceil(min / step) * step; c <= max; c += step) {
      svg('line', { class: 'tick', x1: L, x2: R, y1: y(c), y2: y(c) }, chart);
      const label = svg('text', { class: 'ticktext', x: L - 8, y: y(c) + 4, 'text-anchor': 'end' }, chart);
      label.textContent = unit === 'cm' ? c : fmtFt(c);
      if (unit !== 'cm') label.style.fontSize = '10px';
    }
    if (hasTarget) {
      svg('line', { class: 'target', x1: L, x2: R, y1: y(r.est), y2: y(r.est) }, chart);
      const label = svg('text', { class: 'targettext', x: R - 4, y: y(r.est) - 6, 'text-anchor': 'end' }, chart);
      label.textContent = `Estimate ${fmt(r.est)}`;
    }
    if (entries.length > 1) svg('polyline', { class: 'path', points: entries.map(e => `${x(e.date)},${y(e.cm)}`).join(' ') }, chart);
    entries.forEach(e => {
      const dot = svg('circle', { class: 'dot', cx: x(e.date), cy: y(e.cm), r: 5 }, chart);
      const tip = svg('title', {}, dot);
      tip.textContent = `${niceDate(e.date)}: ${fmtEntry(e.cm)}`;
    });
    const first = svg('text', { class: 'ticktext', x: L, y: H - 8 }, chart);
    first.textContent = niceDate(entries[0].date, { month: 'short', year: 'numeric' });
    if (t1 !== t0) {
      const last = svg('text', { class: 'ticktext', x: R, y: H - 8, 'text-anchor': 'end' }, chart);
      last.textContent = niceDate(entries[entries.length - 1].date, { month: 'short', year: 'numeric' });
    }
  }

  function renderSummary() {
    const summary = $('track-summary'), detail = $('track-detail');
    if (!entries.length) {
      summary.textContent = 'No measurements yet';
      detail.textContent = 'Add your height today, then come back in a few months to see your growth line.';
      return;
    }
    const first = entries[0], latest = entries[entries.length - 1];
    if (entries.length === 1) {
      summary.textContent = `${fmtEntry(latest.cm)} on ${niceDate(latest.date)}`;
      detail.textContent = 'Add another measurement in a few months to see how much you have grown.';
      return;
    }
    const days = (stamp(latest.date) - stamp(first.date)) / DAY;
    const months = Math.max(1, Math.round(days / 30.44));
    const change = latest.cm - first.cm;
    summary.textContent = `${signedDelta(change)} in ${months} ${months === 1 ? 'month' : 'months'}`;
    const parts = [];
    if (days >= 90) {
      const perYear = change / days * 365.25;
      parts.push(`That's about ${unit === 'cm' ? `${Math.max(0, perYear).toFixed(1)} cm` : `${(Math.max(0, perYear) / 2.54).toFixed(1)} in`} a year.`);
    } else {
      parts.push('Give it at least 3 months before reading much into the speed. Small differences can just be measuring error.');
    }
    const yearAgo = [...entries].reverse().find(e => stamp(latest.date) - stamp(e.date) >= 365 * DAY);
    if (yearAgo && Math.abs(latest.cm - yearAgo.cm) <= 1) {
      parts.push("Your height has barely changed for over a year, so you may have finished growing. You can update your growth stage in the calculator.");
    }
    detail.textContent = parts.join(' ');
  }

  function renderHistory() {
    const list = $('history');
    const rows = entries.map((entry, i) => ({ entry, prev: entries[i - 1] })).reverse();
    list.replaceChildren(...rows.map(({ entry, prev }) => {
      const li = document.createElement('li');
      const when = document.createElement('span'); when.textContent = niceDate(entry.date);
      const height = document.createElement('strong'); height.textContent = fmtEntry(entry.cm);
      const delta = document.createElement('span'); delta.className = 'delta';
      delta.textContent = prev ? signedDelta(entry.cm - prev.cm) : 'First entry';
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'ghost';
      remove.textContent = armedRemove === entry.date ? 'Confirm' : 'Remove';
      remove.setAttribute('aria-label', `${remove.textContent} measurement from ${niceDate(entry.date)}`);
      remove.onclick = () => removeEntry(entry.date);
      li.append(when, height, delta, remove);
      return li;
    }));
  }

  function renderTracker() { renderSummary(); drawGrowth(); renderHistory(); renderPhotos(); renderWrapped(); renderHabits(); }
  renderTrackerHook = renderTracker;

  function explain(error) {
    const code = error && error.code;
    if (error && error.name === 'QuotaExceededError') return 'This device is out of storage space. Remove some photos and try again.';
    if (code === 'quota_exceeded') return "There's no room left to save more measurements. Remove some older ones and try again.";
    if (code === 'resource_exhausted') return 'Too many saves at once. Wait a minute and try again.';
    if (code === 'revoked' || code === 'not_granted') return 'Saving is no longer available on this page.';
    return "That didn't save. Check your connection and try again.";
  }

  async function withRetry(action) {
    try { return await action(); }
    catch (error) {
      if (error && error.code === 'unavailable') {
        await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 800));
        return action();
      }
      throw error;
    }
  }

  async function removeEntry(date) {
    if (armedRemove !== date) { armedRemove = date; renderHistory(); return; }
    armedRemove = null;
    try {
      await withRetry(() => col.doc(`h-${date}`).delete());
      setStatus('Measurement removed.');
    } catch (error) { setStatus(explain(error)); }
    renderHistory();
  }

  $('entry-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!col) return;
    const date = $('entry-date').value;
    const cm = entryHeight.getCm();
    if (!isDate(date)) { setStatus('Choose the date you measured.'); return; }
    if (date > localToday()) { setStatus("The date can't be in the future."); return; }
    if (cm == null || cm < 40 || cm > 240) { setStatus('Enter a height between 40 and 240 cm (about 1\'4" to 7\'10").'); return; }
    const value = Math.round(cm * 100) / 100;
    const existed = entries.some(e => e.date === date);
    $('entry-save').disabled = true;
    try {
      await withRetry(() => col.doc(`h-${date}`).set({ date, cm: value }));
      setStatus(existed ? 'Updated that date.' : 'Saved.');
      entryHeight.setCm(null);
      const newest = [...entries.filter(e => e.date !== date), { date, cm: value }].sort((a, b) => stamp(a.date) - stamp(b.date)).pop();
      current.setCm(newest.cm);
      update();
    } catch (error) { setStatus(explain(error)); }
    finally { $('entry-save').disabled = false; }
  });

  /* Door photos: re-encoded through canvas (drops EXIF, including GPS) and kept only in this browser. */
  let photos = [];
  let photoDb = null;
  let armedPhoto = null;
  let flipTimer = null;
  $('photo-date').value = today;
  $('photo-date').max = today;

  const idbRequest = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const photoStore = mode => photoDb.transaction('photos', mode).objectStore('photos');
  /* Measurements and check-ins, stored only in this browser. */
  function localCollection(db) {
    const listeners = new Set();
    const snapshot = async () => {
      const rows = await idbRequest(db.transaction('records').objectStore('records').getAll());
      const docs = rows.map(row => ({ id: row.id, exists: true, data: () => row.data }));
      return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false, hasPendingWrites: false } };
    };
    const emit = async () => {
      const latest = await snapshot();
      listeners.forEach(listener => listener(latest));
    };
    return {
      doc: id => ({
        set: async data => { await idbRequest(db.transaction('records', 'readwrite').objectStore('records').put({ id, data })); await emit(); },
        delete: async () => { await idbRequest(db.transaction('records', 'readwrite').objectStore('records').delete(id)); await emit(); }
      }),
      onSnapshot: (next, onError) => {
        listeners.add(next);
        snapshot().then(next, onError);
        return () => listeners.delete(next);
      }
    };
  }
  function saveFile(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function openPhotoDb() {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open('heightline', 2);
      open.onupgradeneeded = () => {
        ['photos', 'records'].forEach(name => {
          if (!open.result.objectStoreNames.contains(name)) open.result.createObjectStore(name, { keyPath: 'id' });
        });
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
  }
  async function compressPhoto(file) {
    const source = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82));
      if (!blob) throw new Error('encode failed');
      return blob;
    } finally { URL.revokeObjectURL(source); }
  }
  function heightNear(date) {
    let best = null, bestGap = Infinity;
    entries.forEach(e => {
      const gap = Math.abs(stamp(e.date) - stamp(date));
      if (gap < bestGap) { best = e; bestGap = gap; }
    });
    return best && bestGap <= 45 * DAY ? best : null;
  }
  const photoStatus = text => { $('photo-status').textContent = text; };

  function fillPhotoSelect(select, preferred) {
    const keep = photos.some(p => p.id === select.value) ? select.value : preferred;
    select.replaceChildren(...photos.map(p => new Option(niceDate(p.date), p.id)));
    if (keep) select.value = keep;
  }
  function showCompare() {
    const a = photos.find(p => p.id === $('then-photo').value);
    const b = photos.find(p => p.id === $('now-photo').value);
    if (!a || !b) return;
    $('then-img').src = a.url; $('then-img').alt = `Door photo from ${niceDate(a.date)}`;
    $('now-img').src = b.url; $('now-img').alt = `Door photo from ${niceDate(b.date)}`;
    const ha = heightNear(a.date), hb = heightNear(b.date);
    $('compare-text').textContent = ha && hb && ha !== hb
      ? `${signedDelta(hb.cm - ha.cm)} between these photos`
      : 'Save measurements around these dates to see the difference';
  }
  function stopFlip() {
    if (flipTimer) clearInterval(flipTimer);
    flipTimer = null;
    $('flip-play').textContent = 'Play timeline';
  }
  function renderPhotos() {
    const strip = $('photo-strip');
    strip.replaceChildren(...photos.map(photo => {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      image.src = photo.url; image.alt = `Door photo from ${niceDate(photo.date)}`;
      const caption = document.createElement('figcaption');
      const near = heightNear(photo.date);
      caption.textContent = near ? `${niceDate(photo.date)} · ${fmtEntry(near.cm)}` : niceDate(photo.date);
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'ghost';
      remove.textContent = armedPhoto === photo.id ? 'Confirm' : 'Remove';
      remove.setAttribute('aria-label', `${remove.textContent} photo from ${niceDate(photo.date)}`);
      remove.onclick = () => removePhoto(photo.id);
      figure.append(image, caption, remove);
      return figure;
    }));
    $('photo-empty').hidden = photos.length > 0;
    const canCompare = photos.length >= 2;
    $('compare-area').hidden = !canCompare;
    if (canCompare) {
      fillPhotoSelect($('then-photo'), photos[0].id);
      fillPhotoSelect($('now-photo'), photos[photos.length - 1].id);
      showCompare();
    } else stopFlip();
  }
  async function removePhoto(id) {
    if (armedPhoto !== id) { armedPhoto = id; renderPhotos(); return; }
    armedPhoto = null;
    stopFlip();
    try {
      await idbRequest(photoStore('readwrite').delete(id));
      const gone = photos.find(p => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      photos = photos.filter(p => p.id !== id);
      photoStatus('Photo removed from this device.');
      renderPhotos();
      renderWrapped();
    } catch { photoStatus("That photo couldn't be removed. Try again."); }
  }
  $('photo-form').addEventListener('submit', async event => {
    event.preventDefault();
    const file = $('photo-file').files[0];
    const date = $('photo-date').value;
    if (!photoDb) { photoStatus("Photos can't be saved in this browser. Private browsing can block them."); return; }
    if (!isDate(date) || date > localToday()) { photoStatus('Choose the date the photo was taken. It can\'t be in the future.'); return; }
    if (!file) { photoStatus('Choose a photo first.'); return; }
    $('photo-save').disabled = true;
    photoStatus('Adding photo…');
    try {
      const blob = await compressPhoto(file);
      await idbRequest(photoStore('readwrite').put({ id: date, date, blob }));
      const old = photos.find(p => p.id === date);
      if (old) URL.revokeObjectURL(old.url);
      photos = [...photos.filter(p => p.id !== date), { id: date, date, blob, url: URL.createObjectURL(blob) }]
        .sort((a, b) => stamp(a.date) - stamp(b.date));
      $('photo-file').value = '';
      if (photos.length >= 2) $('now-photo').value = photos[photos.length - 1].id;
      photoStatus(old ? 'Replaced the photo for that date.' : 'Photo added to this device.');
      renderPhotos();
      renderWrapped();
    } catch (error) {
      photoStatus(error && error.name === 'QuotaExceededError'
        ? 'This device is out of space for photos. Remove some and try again.'
        : "That photo couldn't be added. Try a JPG or PNG.");
    } finally { $('photo-save').disabled = false; }
  });
  $('then-photo').onchange = () => { stopFlip(); showCompare(); };
  $('now-photo').onchange = () => { stopFlip(); showCompare(); };
  $('flip-play').onclick = () => {
    if (flipTimer) { stopFlip(); return; }
    let index = 0;
    $('then-photo').value = photos[0].id;
    $('now-photo').value = photos[0].id;
    showCompare();
    $('flip-play').textContent = 'Stop';
    flipTimer = setInterval(() => {
      index++;
      if (index >= photos.length) { stopFlip(); return; }
      $('now-photo').value = photos[index].id;
      showCompare();
    }, 800);
  };
  async function startPhotos() {
    try {
      photoDb = await openPhotoDb();
      const rows = await idbRequest(photoStore('readonly').getAll());
      photos = rows
        .filter(row => row && isDate(row.date) && row.blob instanceof Blob)
        .map(row => ({ ...row, url: URL.createObjectURL(row.blob) }))
        .sort((a, b) => stamp(a.date) - stamp(b.date));
      renderPhotos();
      renderWrapped();
    } catch {
      photoDb = null;
      photoStatus("Photos can't be saved in this browser. Private browsing can block them.");
      $('photo-save').disabled = true;
    }
    $('wrapped-save').hidden = false;
  }

  /* Growth Wrapped: a fixed-colour share card drawn from measurements only. */
  function wrappedStats(year) {
    const rows = entries.filter(e => e.date.startsWith(`${year}-`));
    if (rows.length < 2) return null;
    const first = rows[0], last = rows[rows.length - 1];
    let jump = null;
    rows.slice(1).forEach((row, i) => {
      const change = row.cm - rows[i].cm;
      if (change > 0 && (!jump || change > jump.change)) jump = { change, from: rows[i].date, to: row.date };
    });
    return { year, rows, first, last, change: last.cm - first.cm, jump, photoCount: photos.filter(p => p.date.startsWith(`${year}-`)).length };
  }
  const coinLine = change => {
    const coins = Math.round(change / .28);
    return coins >= 1 ? `That's about ${coins} £1 coins stacked up` : '';
  };
  function drawWrapped(stats) {
    const canvas = $('wrapped-card');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, pad = 84;
    const display = '"Bricolage Grotesque","Trebuchet MS",sans-serif';
    const body = '"Atkinson Hyperlegible","Segoe UI",Arial,sans-serif';
    const hand = '"Gochi Hand","Comic Sans MS",cursive';
    ctx.fillStyle = '#17495c';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f4fafc';
    ctx.fillRect(W - 170, 0, 170, H);
    ctx.strokeStyle = '#17495c';
    ctx.lineWidth = 4;
    for (let i = 1; i < 14; i++) {
      const y = i * H / 14, len = i % 2 ? 34 : 68;
      ctx.beginPath(); ctx.moveTo(W - 170, y); ctx.lineTo(W - 170 + len, y); ctx.stroke();
    }
    const steady = Math.abs(stats.change) < .3;
    ctx.strokeStyle = '#d9772b';
    ctx.lineWidth = 10;
    const markY = steady ? H * .5 : H * .34;
    ctx.beginPath(); ctx.moveTo(W - 160, markY); ctx.lineTo(W - 12, markY); ctx.stroke();
    if (!steady && stats.change > 0) {
      ctx.strokeStyle = '#6d7f87';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(W - 160, H * .62); ctx.lineTo(W - 12, H * .62); ctx.stroke();
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 58px ${display}`;
    ctx.fillText('Growth Wrapped', pad, 150);
    ctx.font = `800 150px ${display}`;
    ctx.fillText(String(stats.year), pad, 300);
    ctx.font = `400 46px ${body}`;
    ctx.fillText(steady ? 'This year you stayed at' : stats.change > 0 ? 'This year you grew' : 'Your measurements changed', pad, 500);
    const headline = steady ? fmtEntry(stats.last.cm) : signedDelta(stats.change);
    let size = 170;
    do { ctx.font = `800 ${size}px ${display}`; size -= 6; } while (ctx.measureText(headline).width > W - 170 - pad - 30 && size > 60);
    ctx.fillStyle = '#ffc48a';
    ctx.fillText(headline, pad, 680);
    ctx.fillStyle = '#ffffff';
    ctx.font = `400 46px ${body}`;
    ctx.fillText(`${fmtEntry(stats.first.cm)} to ${fmtEntry(stats.last.cm)}`, pad, 770);
    const lines = [];
    if (stats.change > 0 && !steady) lines.push(coinLine(stats.change));
    lines.push(`${stats.rows.length} measurements logged`);
    if (stats.jump && !steady) lines.push(`Biggest jump: ${signedDelta(stats.jump.change)}`);
    ctx.font = `400 42px ${body}`;
    lines.filter(Boolean).forEach((line, i) => ctx.fillText(line, pad, 880 + i * 66));
    ctx.font = `400 54px ${hand}`;
    ctx.fillStyle = '#ffc48a';
    ctx.fillText('Heightline', pad, H - 80);
    canvas.setAttribute('aria-label', wrappedText(stats));
  }
  function wrappedText(stats) {
    if (Math.abs(stats.change) < .3) return `My ${stats.year} Growth Wrapped: I stayed at ${fmtEntry(stats.last.cm)} with ${stats.rows.length} measurements logged on Heightline.`;
    return `My ${stats.year} Growth Wrapped: ${signedDelta(stats.change)}, from ${fmtEntry(stats.first.cm)} to ${fmtEntry(stats.last.cm)}, with ${stats.rows.length} measurements logged on Heightline.`;
  }
  function renderWrapped() {
    const years = [...new Set(entries.map(e => e.date.slice(0, 4)))]
      .filter(year => wrappedStats(year))
      .sort((a, b) => b.localeCompare(a));
    const select = $('wrapped-year');
    const keep = years.includes(select.value) ? select.value : years[0];
    select.replaceChildren(...years.map(year => new Option(year, year)));
    if (keep) select.value = keep;
    $('wrapped-grid').hidden = !years.length;
    $('wrapped-empty').hidden = years.length > 0;
    if (years.length) drawWrapped(wrappedStats(select.value));
  }
  $('wrapped-year').onchange = () => { $('wrapped-status').textContent = ''; renderWrapped(); };
  $('wrapped-copy').onclick = () => {
    const stats = wrappedStats($('wrapped-year').value);
    if (!stats) return;
    const text = wrappedText(stats);
    const fail = () => { $('wrapped-status').textContent = text; };
    try {
      const copied = navigator.clipboard && navigator.clipboard.writeText(text);
      if (copied) copied.then(() => { $('wrapped-status').textContent = 'Copied.'; }, fail); else fail();
    } catch { fail(); }
  };
  $('wrapped-save').onclick = async () => {
    const year = $('wrapped-year').value;
    const blob = await new Promise(resolve => $('wrapped-card').toBlob(resolve, 'image/png'));
    if (!blob) return;
    try {
      saveFile(`heightline-wrapped-${year}.png`, blob);
      $('wrapped-status').textContent = 'Saved.';
    } catch (error) {
      if (error && error.code === 'declined') return;
      $('wrapped-status').textContent = error && error.code === 'rate_limited'
        ? 'A save prompt is already open. Finish that one, then try again.'
        : "The image couldn't be saved here. Use Copy text instead.";
    }
  };
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('800 58px "Bricolage Grotesque"'),
      document.fonts.load('400 46px "Atkinson Hyperlegible"'),
      document.fonts.load('400 54px "Gochi Hand"')
    ]).then(renderWrapped, renderWrapped);
  }

  /* Growth habits: one private document per day, written one at a time. */
  let habits = {};
  let habitWrite = Promise.resolve();
  const routineTasks = ['exercise', 'hang', 'milk', 'stretch', 'calves'];
  const shiftDate = (date, days) => new Date(stamp(date) + days * DAY).toISOString().slice(0, 10);
  const tasksDone = date => habits[date] ? routineTasks.filter(task => habits[date].tasks[task]).length : 0;
  const habitCount = date => tasksDone(date) || (habits[date] && habits[date].older ? 1 : 0);

  function renderHabits() {
    const day = localToday();
    const todayTasks = habits[day] ? habits[day].tasks : {};
    routineTasks.forEach(task => {
      const box = $(`task-${task}`);
      box.checked = !!todayTasks[task];
      box.disabled = !col;
    });
    const week = Array.from({ length: 7 }, (_, i) => shiftDate(day, i - 6));
    $('habit-week').replaceChildren(...week.map(date => {
      const cell = document.createElement('div'); cell.className = 'day';
      const pips = document.createElement('div'); pips.className = 'pips';
      const done = habitCount(date);
      for (let i = routineTasks.length - 1; i >= 0; i--) {
        const pip = document.createElement('div');
        pip.className = i < done ? 'pip on' : 'pip';
        pips.append(pip);
      }
      const name = document.createElement('span');
      name.textContent = niceDate(date, { weekday: 'narrow' });
      cell.append(pips, name);
      return cell;
    }));
    const total = week.reduce((sum, date) => sum + habitCount(date), 0);
    const weekTotal = routineTasks.length * 7;
    const weekDone = week.reduce((sum, date) => sum + tasksDone(date), 0);
    $('habit-week').setAttribute('aria-label', `${weekDone} of ${weekTotal} tasks done in the last 7 days`);
    $('habit-detail').textContent = weekDone ? `Last 7 days: ${weekDone} of ${weekTotal} tasks done. Rest days are part of a good routine too.` : '';
    let streak = 0;
    let cursor = habitCount(day) ? day : shiftDate(day, -1);
    while (habitCount(cursor)) { streak++; cursor = shiftDate(cursor, -1); }
    $('habit-summary').textContent = streak
      ? `${streak}-day check-in streak`
      : weekDone ? `${weekDone} of ${weekTotal} tasks this week` : 'Start your first check-in';
  }

  routineTasks.forEach(task => {
    $(`task-${task}`).addEventListener('change', () => {
      if (!col) return;
      const date = localToday();
      const tasks = {};
      routineTasks.forEach(name => { tasks[name] = $(`task-${name}`).checked; });
      const anyDone = routineTasks.some(name => tasks[name]);
      habits = { ...habits, [date]: { tasks, older: false } };
      renderHabits();
      habitWrite = habitWrite.then(async () => {
        try {
          const ref = col.doc(`d-${date}`);
          await withRetry(() => anyDone ? ref.set({ date, tasks }) : ref.delete());
          $('habit-status').textContent = 'Saved.';
        } catch (error) { $('habit-status').textContent = explain(error); }
      });
    });
  });

  function disableTracker(message) {
    $('entry-save').disabled = true;
    setStatus(message);
  }

  async function startTracker() {
    $('entry-save').disabled = true;
    setStatus('Loading your measurements…');
    try {
      col = localCollection(await openPhotoDb());
    } catch {
      disableTracker("Your browser is blocking saving on this device. Private browsing can do this. The calculator still works.");
      return;
    }
    let confirmed = false;
    const timer = setTimeout(() => {
      if (!confirmed) setStatus("Your saved measurements can't be reached yet. They may be out of date.");
    }, 10000);
    $('entry-save').disabled = false;
    col.onSnapshot(snapshot => {
      habits = {};
      snapshot.docs.filter(doc => doc.id.startsWith('d-')).forEach(doc => {
        const day = doc.data();
        if (!day || !isDate(day.date)) return;
        const tasks = {};
        routineTasks.forEach(task => { tasks[task] = !!(day.tasks && day.tasks[task] === true); });
        /* Check-ins saved before the routine still count towards the streak. */
        const older = !day.tasks && (day.sleep === true || day.food === true || day.move === true || day.sleepHours != null || day.meals != null || !!day.exercise);
        habits[day.date] = { tasks, older };
      });
      entries = snapshot.docs
        .filter(doc => doc.id.startsWith('h-'))
        .map(doc => doc.data())
        .filter(e => e && isDate(e.date) && typeof e.cm === 'number' && e.cm >= 40 && e.cm <= 240)
        .map(e => ({ date: e.date, cm: e.cm }))
        .sort((a, b) => stamp(a.date) - stamp(b.date));
      if (!snapshot.metadata.fromCache && !confirmed) {
        confirmed = true;
        clearTimeout(timer);
        if ($('entry-status').textContent.startsWith('Loading') || $('entry-status').textContent.startsWith('Your saved')) setStatus('');
      }
      if (firstData && entries.length) {
        firstData = false;
        current.setCm(entries[entries.length - 1].cm);
        update();
      } else {
        renderTracker();
      }
    }, error => {
      clearTimeout(timer);
      disableTracker(explain(error));
    });
  }

  if (typeof ResizeObserver === 'function') {
    let lastWidth = 0;
    new ResizeObserver(records => {
      const width = Math.floor(records[0].contentRect.width);
      if (width !== lastWidth) { lastWidth = width; drawGrowth(); }
    }).observe($('growth').parentElement);
  }
  renderTracker();
  startTracker();
  startPhotos();

  /* Backup, restore and delete: the only copies of this data live on this device. */
  const dataStatus = text => { $('data-status').textContent = text; };
  const readAll = (db, name) => idbRequest(db.transaction(name).objectStore(name).getAll());
  const blobToDataUrl = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const dataUrlToBlob = url => {
    const bytes = atob(url.slice(url.indexOf(',') + 1));
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
    return new Blob([buffer], { type: 'image/jpeg' });
  };
  $('backup-download').onclick = async () => {
    try {
      const db = await openPhotoDb();
      const records = await readAll(db, 'records');
      const storedPhotos = await readAll(db, 'photos');
      const photoList = [];
      for (const photo of storedPhotos) photoList.push({ date: photo.date, image: await blobToDataUrl(photo.blob) });
      const backup = { app: 'heightline', version: 1, exportedAt: new Date().toISOString(), records, photos: photoList };
      saveFile(`heightline-backup-${localToday()}.json`, new Blob([JSON.stringify(backup)], { type: 'application/json' }));
      dataStatus(`Backup created with ${records.length} saved entries and ${photoList.length} photos. Keep this file private.`);
    } catch { dataStatus("The backup couldn't be created. Try again."); }
  };
  $('backup-file').addEventListener('change', async () => {
    const file = $('backup-file').files[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (!backup || backup.app !== 'heightline' || !Array.isArray(backup.records) || !Array.isArray(backup.photos)) throw new Error('format');
      const records = backup.records.filter(row => row && /^(h|d)-\d{4}-\d{2}-\d{2}$/.test(row.id) && row.data && typeof row.data === 'object');
      const restoredPhotos = backup.photos
        .filter(photo => photo && isDate(photo.date) && typeof photo.image === 'string' && photo.image.startsWith('data:image/jpeg;base64,'))
        .map(photo => ({ id: photo.date, date: photo.date, blob: dataUrlToBlob(photo.image) }));
      const db = await openPhotoDb();
      const tx = db.transaction(['records', 'photos'], 'readwrite');
      records.forEach(row => tx.objectStore('records').put({ id: row.id, data: row.data }));
      restoredPhotos.forEach(photo => tx.objectStore('photos').put(photo));
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      dataStatus(`Restored ${records.length} saved entries and ${restoredPhotos.length} photos. Reloading…`);
      setTimeout(() => location.reload(), 800);
    } catch { dataStatus("That file couldn't be restored. Choose a Heightline backup file."); }
    $('backup-file').value = '';
  });
  let deleteArmed = false;
  $('data-delete').onclick = async () => {
    if (!deleteArmed) {
      deleteArmed = true;
      $('data-delete').textContent = 'Confirm: delete everything';
      dataStatus('This removes your measurements, routine and photos from this device. It can\'t be undone without a backup.');
      return;
    }
    try {
      const db = await openPhotoDb();
      const tx = db.transaction(['records', 'photos'], 'readwrite');
      tx.objectStore('records').clear();
      tx.objectStore('photos').clear();
      await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
      dataStatus('Your data has been deleted from this device. Reloading…');
      setTimeout(() => location.reload(), 800);
    } catch { dataStatus("Your data couldn't be deleted. Try again."); }
  };

  /* One section at a time, driven by the page hash so tabs can be bookmarked. */
  const viewNames = ['predict', 'track', 'habits', 'photos', 'wrapped'];
  function showView(scrollUp) {
    const hash = location.hash.slice(1);
    const name = viewNames.includes(hash) ? hash : 'predict';
    document.querySelectorAll('[data-view]').forEach(el => { el.hidden = el.dataset.view !== name; });
    document.querySelectorAll('[data-tab]').forEach(tab => {
      if (tab.dataset.tab === name) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    if (scrollUp) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', () => showView(true));
  showView(false);
})();
