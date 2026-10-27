// Minimálny DOM pre testy: len toľko, koľko hry naozaj používajú.
// Nie je to náhrada prehliadača – cieľom je overiť hernú logiku, nie vykresľovanie.

class ClassList {
  constructor(el) { this.el = el; this.set = new Set(); }
  add(...c) { c.forEach(x => x && this.set.add(x)); }
  remove(...c) { c.forEach(x => this.set.delete(x)); }
  toggle(c, force) {
    const on = force === undefined ? !this.set.has(c) : !!force;
    if (on) this.set.add(c); else this.set.delete(c);
    return on;
  }
  contains(c) { return this.set.has(c); }
  get value() { return [...this.set].join(" "); }
  toString() { return this.value; }
}

class Element {
  constructor(tag, doc) {
    this.tagName = (tag || "div").toUpperCase();
    this.ownerDocument = doc;
    this.children = [];
    this.parentElement = null;
    this.attributes = {};
    this.dataset = {};
    this.style = new Proxy({ setProperty(k, v) { this[k] = v; }, getPropertyValue(k) { return this[k]; } }, {});
    this.classList = new ClassList(this);
    this._text = "";
    this.listeners = {};
    this.hidden = false;
    this.disabled = false;
  }
  // --- atribúty ---
  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k === "id") { this.id = String(v); this.ownerDocument?._index(this); }
    if (k === "class") { this.classList = new ClassList(this); String(v).split(/\s+/).filter(Boolean).forEach(c => this.classList.add(c)); }
    if (k.startsWith("data-")) this.dataset[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = String(v);
  }
  getAttribute(k) {
    if (k === "id") return this.id ?? null;
    if (k in this.attributes) return this.attributes[k];
    // data-* nastavené cez el.dataset.x = ... (bez setAttribute) – ako v prehliadači
    if (k.startsWith("data-")) {
      const v = this.dataset[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())];
      return v === undefined ? null : String(v);
    }
    return null;
  }
  removeAttribute(k) { delete this.attributes[k]; }
  get className() { return this.classList.value; }
  set className(v) { this.classList = new ClassList(this); String(v).split(/\s+/).filter(Boolean).forEach(c => this.classList.add(c)); }

  // --- strom ---
  appendChild(el) {
    if (el.parentElement) el.parentElement.removeChild(el);
    el.parentElement = this;
    this.children.push(el);
    this.ownerDocument?._index(el);
    return el;
  }
  removeChild(el) {
    const i = this.children.indexOf(el);
    if (i >= 0) this.children.splice(i, 1);
    el.parentElement = null;
    return el;
  }
  remove() { this.parentElement?.removeChild(this); }
  get firstChild() { return this.children[0] ?? null; }
  get childElementCount() { return this.children.length; }
  closest(sel) {
    let el = this;
    while (el) { if (el._matches(sel)) return el; el = el.parentElement; }
    return null;
  }

  // --- obsah ---
  get textContent() {
    // vlastný text + text potomkov (zmiešaný obsah ako `slovo <button>🔊</button>`)
    return this._text + this.children.map(c => c.textContent).join("");
  }
  set textContent(v) { this.children = []; this._text = String(v ?? ""); }
  get innerHTML() { return this._html ?? this.children.map(c => c.outerHTML).join(""); }
  set innerHTML(html) {
    this.children = [];
    this._text = "";
    this._html = String(html ?? "");
    // veľmi jednoduchý parser: stačí na <div class="x" id="y">text</div> vnorenia
    for (const el of parseHTML(String(html ?? ""), this.ownerDocument)) this.appendChild(el);
  }
  get outerHTML() {
    const attrs = Object.entries(this.attributes).map(([k, v]) => ` ${k}="${v}"`).join("");
    return `<${this.tagName.toLowerCase()}${attrs}>${this.innerHTML || this._text}</${this.tagName.toLowerCase()}>`;
  }
  get innerText() { return this.textContent; }

  // --- udalosti ---
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(f => f !== fn); }
  dispatchEvent(ev) {
    ev.target ||= this;
    let el = this;
    while (el) {
      (el.listeners[ev.type] || []).forEach(fn => fn.call(el, ev));
      el = ev.bubbles === false ? null : el.parentElement;
    }
    return true;
  }
  click() { this.dispatchEvent({ type: "click", bubbles: true, preventDefault() {}, stopPropagation() {} }); }
  blur() {}
  focus() {}
  animate() { return { cancel() {}, finished: Promise.resolve() }; }
  setPointerCapture() {}
  releasePointerCapture() {}
  getBoundingClientRect() { return { x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 }; }
  cloneNode() { const e = new Element(this.tagName, this.ownerDocument); e.className = this.className; e._text = this._text; return e; }

  // --- výber ---
  _matches(sel) {
    return sel.split(",").map(s => s.trim()).some(s => {
      const m = /^(\w+)?((?:[.#][\w-]+)*)(?:\[([\w-]+)="([^"]*)"\])?$/.exec(s);
      if (!m) return false;
      const [, tag, rest, attr, val] = m;
      if (tag && this.tagName !== tag.toUpperCase()) return false;
      for (const part of rest.match(/[.#][\w-]+/g) || []) {
        if (part[0] === "." && !this.classList.contains(part.slice(1))) return false;
        if (part[0] === "#" && this.id !== part.slice(1)) return false;
      }
      if (attr && this.getAttribute(attr) !== val) return false;
      return true;
    });
  }
  _all(out = []) { for (const c of this.children) { out.push(c); c._all(out); } return out; }
  querySelectorAll(sel) {
    // podpora "a b" (potomok) aj jednoduchých selektorov
    const parts = sel.split(",").map(s => s.trim());
    const res = new Set();
    for (const p of parts) {
      const chain = p.split(/\s+/);
      let cands = this._all();
      if (chain.length > 1) {
        const parentSel = chain.slice(0, -1).join(" ");
        cands = cands.filter(el => {
          let a = el.parentElement;
          while (a) { if (a._matches(chain[chain.length - 2])) return true; a = a.parentElement; }
          return false;
        });
        cands.filter(el => el._matches(chain[chain.length - 1])).forEach(el => res.add(el));
      } else {
        cands.filter(el => el._matches(p)).forEach(el => res.add(el));
      }
    }
    const arr = [...res];
    arr.forEach = Array.prototype.forEach.bind(arr);
    return arr;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
}

// Jednoduchý parser HTML fragmentu (postačuje na to, čo hry generujú).
function parseHTML(html, doc) {
  const out = [];
  const stack = [];
  const re = /<(\/)?(\w+)([^>]*?)(\/)?>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const [, close, tag, attrs, selfClose, text] = m;
    if (text) {
      const t = text.trim();
      if (t) {
        if (stack.length) stack[stack.length - 1]._text += text;
        else { const s = new Element("span", doc); s._text = text; out.push(s); }
      }
      continue;
    }
    if (close) { stack.pop(); continue; }
    const el = new Element(tag, doc);
    for (const a of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) el.setAttribute(a[1], a[2]);
    if (stack.length) stack[stack.length - 1].appendChild(el); else out.push(el);
    if (!selfClose && !["br", "img", "input", "circle", "rect", "line", "path", "polygon", "ellipse"].includes(tag)) stack.push(el);
  }
  return out;
}

class Document {
  constructor(html) {
    this.byId = new Map();
    this.documentElement = new Element("html", this);
    this.body = new Element("body", this);
    this.head = new Element("head", this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.listeners = {};
    this.title = "";
    if (html) {
      const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
      const inner = bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, "") : "";
      for (const el of parseHTML(inner, this)) this.body.appendChild(el);
      const titleMatch = /<title>([^<]*)<\/title>/i.exec(html);
      if (titleMatch) this.title = titleMatch[1];
    }
  }
  _index(el) {
    if (el.id) this.byId.set(el.id, el);
    el.children?.forEach(c => this._index(c));
  }
  createElement(tag) { return new Element(tag, this); }
  createElementNS(_ns, tag) { return new Element(tag, this); }
  createTextNode(text) { const e = new Element("span", this); e._text = text; return e; }
  getElementById(id) {
    const el = this.byId.get(id);
    if (el && this._attached(el)) return el;
    // fallback: prehľadaj strom (id sa mohlo pridať bez setAttribute)
    const found = this.body._all().find(e => e.id === id);
    return found ?? el ?? null;
  }
  _attached(el) { let a = el; while (a.parentElement) a = a.parentElement; return a === this.documentElement || a === this.body; }
  querySelector(sel) { return this.body.querySelector(sel); }
  querySelectorAll(sel) { return this.body.querySelectorAll(sel); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatchEvent(ev) { (this.listeners[ev.type] || []).forEach(fn => fn(ev)); return true; }
  createSVGPoint() { return { x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) }; }
  elementFromPoint() { return null; }
}

export function makeDocument(html) { return new Document(html); }
export { Element, Document };
