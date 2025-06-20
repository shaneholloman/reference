const Utils = (function () {
  return {
    LIBRARY: {
      fuse: {
        lib: ['/js/fuse_7.1.0.js'],
        instance: 'Fuse',
        attr: { async: true }
      }
    },
    loadScripts(urls, callback, attr = {}, container = document.head) {
      const scripts = [];
      for (const i in urls) {
        scripts[i] = document.createElement('script');
        scripts[i].setAttribute('type', 'text/javascript');
        scripts[i].setAttribute('src', urls[i]);
        Object.keys(attr).forEach((key) => {
          scripts[i].setAttribute(key, attr[key]);
        });
      }
      function loadNextScript() {
        const script = scripts.shift();
        let loaded = false;
        container.appendChild(script);
        script.onload = script.onreadystatechange = function () {
          const rs = this.readyState;
          if (rs && rs !== 'complete' && rs !== 'loaded') {
            return;
          }
          if (loaded) {
            return;
          }
          loaded = true;
          if (scripts.length) {
            loadNextScript();
          } else {
            callback();
          }
        };
      }
      loadNextScript();
    },
    externalLibrary(library) {
      return new Promise((resolve) => {
        if (typeof window[library.instance] === 'undefined' || window[library.instance] === null) {
          this.loadScripts(
            library.lib,
            () => {
              resolve(window[library.instance]);
            },
            library.attr,
            library.container
          );
        } else {
          resolve(window[library.instance]);
        }
      });
    }
  };
})();

window.addEventListener('load', () => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  if (!isDarkMode) {
    const icon = document.querySelector('#darkMode > i').classList;
    icon.toggle('icon-light');
    icon.toggle('icon-dark');
  }
  document.querySelector('#darkMode').addEventListener('click', () => {
    const html = document.documentElement.classList;
    html.toggle('dark');
    const icon = document.querySelector('#darkMode > i').classList;
    icon.toggle('icon-light');
    icon.toggle('icon-dark');
    const isDarkMode = html.contains('dark');
    localStorage.theme = isDarkMode ? 'dark' : '';
  });

  /******** List Collapsible ***********/
  document.querySelectorAll('ul.collapsible > li > strong').forEach((strong) => {
    const li = strong.parentElement;
    li.classList.add('active');
    strong.classList.toggle('arrow-down');
    strong.addEventListener('click', function () {
      li.classList.toggle('active');
      this.classList.toggle('arrow-down');
    });
  });

  /******** Remove bottom border noise ********/
  document.querySelectorAll('.h3-wrap ul').forEach((ul) => {
    const length = ul.querySelectorAll('li').length;
    const matches = ul.className.match('cols-([0-9]+)');
    const cols = matches === null ? 1 : parseInt(matches[1]);
    const no_border_length = length === 1 || length % cols === 0 ? cols : length % cols;
    for (let j = 1; j <= no_border_length; j++) {
      const element = ul.querySelector(`li:nth-last-child(${j})`);
      if (element !== null) {
        element.style.borderBottom = 'none';
      }
    }
  });

  /******** h3-wrap blink ***********/
  function blinkSection() {
    const hash = window.location.hash;
    const anchor = document.querySelector(`a[class="h-anchor"][href="${hash}"]`);
    if (anchor !== null) {
      const anchorSection = anchor.parentElement.parentElement;
      document.querySelectorAll('.boxed').forEach((e) => {
        e.classList.remove('boxed');
      });
      const timer = setTimeout(() => {
        anchorSection.classList.add('boxed');
        clearTimeout(timer);
      }, 100);
    }
  }

  blinkSection();
  window.addEventListener('popstate', blinkSection);

  /******** Search ***********/
  function SearchEngine(options) {
    const settings = options ? options : {};
    const defaultOptions = {
      trigger: '#mysearch-trigger',
      container: '#mysearch',
      dbPath: `${location.protocol}//${location.host}/search.json?v=1.0`
    };
    this.container =
      typeof settings.container !== 'undefined' ? settings.container : defaultOptions.container;
    this.trigger =
      typeof settings.trigger !== 'undefined' ? settings.trigger : defaultOptions.trigger;
    this.dbPath = typeof settings.dbPath !== 'undefined' ? settings.dbPath : defaultOptions.dbPath;

    this.lastSearch = {};

    window.search = this;
  }
  SearchEngine.prototype = {
    start() {
      const _this = this;

      _this.fetchData(); // Prepare search data
      this.search = document.querySelector(this.container);
      this.box = document.querySelector('#mysearch-box');
      this.input = document.querySelector('#mysearch-input');
      this.result = document.querySelector('#mysearch-list');
      this.lastSearch.query = this.input.value;

      this.detectModal();

      // Cancel button
      const cancel = document.querySelector('.cancel');
      cancel.addEventListener('click', () => {
        _this.closeModal(true);
      });

      // Clear button
      const clear = document.querySelector('#mysearch-clear');
      clear.addEventListener('click', () => {
        _this.doSearch('', true).then();
      });

      // Search trigger
      const trigger = document.querySelector(_this.trigger);
      trigger.addEventListener('click', () => {
        _this.openModal(true);
      });

      document.body.addEventListener('click', (e) => {
        if (_this.isOpened()) {
          if (!_this.box.contains(e.target) && !trigger.contains(e.target)) {
            _this.closeModal();
          }
        }
      });

      // Search input event
      this.input.addEventListener('keyup', () => {
        const value = _this.input.value;
        if (value === _this.lastSearch.query) {
          return;
        }
        _this.doSearch(value, true).then();
      });

      document.body.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          if (_this.isOpened()) {
            _this.moveItem(false);
            e.preventDefault();
            e.stopPropagation();
          }
        } else if (e.key === 'ArrowUp') {
          if (_this.isOpened()) {
            _this.moveItem(true);
            e.preventDefault();
            e.stopPropagation();
          }
        } else if (e.key === 'Enter') {
          if (_this.isOpened()) {
            const active = _this.result.querySelector('li.active > a');
            if (active !== null) {
              window.location.href = active.getAttribute('href');
            }
          }
          e.preventDefault();
          e.stopPropagation();
        } else if (e.key === 'Escape') {
          _this.closeModal();
          e.preventDefault();
          e.stopPropagation();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          _this.toggleModal();
          e.preventDefault();
          e.stopPropagation();
        }
      });
    },

    moveItem(up) {
      const current = this.result.querySelector('li.active');
      const next = up ? current.previousElementSibling : current.nextElementSibling;
      if (next !== null) {
        current.classList.remove('active');
        current.classList.add('inactive');
        next.classList.remove('inactive');
        next.classList.add('active');
        this.renderPreview();
      }
    },
    detectModal() {
      const url_string = window.location.href;
      const url = new URL(url_string);
      const query = url.searchParams.get('q');
      if (query !== null) {
        this.input.value = query;
        this.openModal(false);
      }
    },
    isOpened() {
      return this.search.classList.contains('block');
    },
    toggleModal() {
      if (this.isOpened()) {
        this.closeModal();
      } else {
        this.openModal();
      }
    },
    openModal(reset) {
      this.search.classList.remove('hidden');
      this.search.classList.add('block');
      if (reset) {
        this.input.value = '';
      }
      document.body.classList.add('overflow-hidden');
      this.doSearch(this.input.value, false);
      this.input.focus();
    },
    closeModal(reset) {
      this.search.classList.remove('block');
      this.search.classList.add('hidden');
      if (reset) {
        this.input.value = '';
      }
      document.body.classList.remove('overflow-hidden');
      this.input.blur();
    },
    changeUrl(params) {
      const baseURL = `${location.protocol}//${location.host}${location.pathname}`;
      let newURL = baseURL;
      if (params !== '' && params !== null) {
        newURL = `${baseURL}?${params}`;
      }
      history.pushState({}, null, newURL);
    },
    async fetchData() {
      const _this = this;
      if (_this.index !== undefined) {
        return;
      }
      return await fetch(_this.dbPath)
        .then((resp) => resp.text())
        .then((resp) => {
          _this.db = JSON.parse(resp);
          _this.index = new Fuse(_this.db, {
            // isCaseSensitive: false,
            includeScore: false,
            shouldSort: true,
            includeMatches: true,
            matchEmptyQuery: true,
            // minMatchCharLength: 1,
            // location: 0,
            threshold: 0.1,
            // distance: 100,
            // useExtendedSearch: false,
            // ignoreLocation: true,
            // ignoreFieldNorm: false,
            keys: [
              { name: 'title', weight: 12 },
              { name: 'tags', weight: 6 },
              { name: 'categories', weight: 6 },
              { name: 'sections.h3.title', weight: 5 },
              { name: 'sections.h2.title', weight: 1 },
              { name: 'intro', weight: 1 }
            ]
          });
          // default return all
          _this.lastSearch.whole = _this.db.map((doc, idx) => ({
            item: doc,
            score: 1,
            refIndex: idx
          }));
          return resp;
        });
    },
    async doSearch(value, history) {
      const _this = this;
      await _this.fetchData().then(() => {
        if (this.lastSearch.query === value && this.lastSearch.resp !== undefined) {
          this.renderResult(this.lastSearch.resp);
          this.renderPreview();
        } else {
          const results = value !== '' ? _this.index.search(`${value}`) : _this.lastSearch.whole;
          if (history) {
            this.changeUrl(value === '' ? null : `q=${value}`);
          }
          this.lastSearch.query = value;
          this.lastSearch.resp = results;
          this.renderResult(results);
          this.renderPreview();
        }
      });
    },
    addEventToResult() {
      const _this = this;
      this.result.querySelectorAll('li').forEach((li) => {
        li.addEventListener('mouseover', function () {
          if (_this.isOpened()) {
            _this.result.querySelectorAll('li').forEach((e) => {
              e.classList.remove('active');
              e.classList.add('inactive');
            });
            this.classList.remove('inactive');
            this.classList.add('active');
            _this.renderPreview();
          }
        });
      });
    },
    mark(text, matches) {
      const result = [];
      let pair = matches.shift();
      // Build the formatted string
      for (let i = 0; i < text.length; i++) {
        const char = text.charAt(i);
        if (pair && i === pair[0]) {
          result.push('<mark>');
        }
        result.push(char);
        if (pair && i === pair[1]) {
          result.push('</mark>');
          pair = matches.shift();
        }
      }
      return result.join('');
    },
    highlightMatches(result) {
      if (result.matches === undefined || result.item.length === 0) {
        return;
      }
      const _this = this;
      result.item = JSON.parse(JSON.stringify(_this.db[result.refIndex]));
      result.matches.forEach((m) => {
        switch (m.key) {
          case 'tags':
          case 'categories':
            result.item[m.key][m.refIndex] = _this.mark(m.value, m.indices);
            break;
          case 'sections.h2.title':
            result.item.sections[m.refIndex].h2.title = _this.mark(m.value, m.indices);
            break;
          case 'sections.h3.title': {
            let currLength = 0;
            let lastLength = 0;
            for (let i = 0; i < result.item.sections.length; i++) {
              const subArr = result.item.sections[i].h3;
              currLength += subArr.length;
              if (m.refIndex >= lastLength && m.refIndex < currLength) {
                result.item.sections[i].h3[m.refIndex - lastLength].title = _this.mark(
                  m.value,
                  m.indices
                );
                break;
              }
              lastLength += subArr.length;
            }
            break;
          }
          default:
            result.item[m.key] = _this.mark(m.value, m.indices);
            break;
        }
      });
    },
    renderResult(results) {
      const _this = this;
      let liHtml = '';
      let index = 0;
      results.forEach((result, itemIndex) => {
        let activeStr = 'inactive';
        if (index === 0) {
          activeStr = 'active';
        }

        _this.highlightMatches(result);

        const hit = result.item;
        const tags = hit.tags || [];
        const categories = hit.categories || [];
        const tagStr = tags.join("<span class='text-slate-300 px-1'>•</span>");
        let tagsHTML = '';
        if (tagStr !== '') {
          tagsHTML = `<div class="w-px h-3 bg-slate-300 mr-2"></div><span class="mr-2">${tagStr}</span>`;
        }
        liHtml += `<li class="group ${activeStr} m-3 fadeIn" data-index="${itemIndex}">
                                <a href="${hit.path}" class="flex justify-between items-center rounded-lg py-1 px-4 transition-colors duration-100 ease-in-out overflow-hidden">
                                    <div class="flex items-start">
                                        <div class="flex justify-center items-center w-5 mr-5 mt-2 flex-none">
                                            <i class="icon text-2xl">${hit.icon}</i>
                                        </div>
                                        <div class="flex flex-col truncate">
                                            <span class="font-semibold dark:text-slate-300 dark:group-hover:text-white">${hit.title}</span>
                                            <div class="sub-intro flex items-center text-sm leading-tight mt-4 xl:mt-2 mb-2">
                                                <span class="mr-2">${categories[0]}</span>
                                                ${tagsHTML}
                                            </div>
                                        </div>
                                    </div>
                                    <i class="w-6 ml-8 p-2 icon icon-enter"></i>
                                </a>
                            </li>`;
        index++;
      });

      this.result.innerHTML = liHtml;
      this.addEventToResult();
    },
    renderPreview() {
      const active = this.search.querySelector('li.active');
      if (active === null) {
        return;
      }
      const _this = this;
      const itemIndex = active.getAttribute('data-index');
      const hit = _this.lastSearch.resp[parseInt(itemIndex)].item;

      let olInnerHtml = '';

      hit.sections.forEach((section) => {
        let h3HTML = '';
        section.h3.forEach((h3) => {
          const anchor = hit.path + h3.anchor;
          h3HTML += `<a href="${anchor}" class="inline-block mr-1 px-2 p-0.5 transition duration-200 ease-in-out rounded-full hover:bg-emerald-500 text-slate-500 dark:text-slate-300 hover:text-slate-50">${h3.title.toLowerCase()}</a>`;
        });
        const anchor = hit.path + section.h2.anchor;
        olInnerHtml += `<li class="text-slate-700 dark:text-slate-300 hover:underline hover:text-slate-900 mt-3 mb-2">
                                <a href="${anchor}"> ${section.h2.title}</a>
                            </li>
                            <span>${h3HTML}</span>`;
      });

      document.querySelector('.preview-panel').innerHTML = `<section class="w-full py-3 px-5">
                <div class="flex justify-center pt-1 pb-4">
                    <div class="flex justify-center items-center w-8 h-8 rounded ${hit.background === undefined ? 'bg-emerald-500' : hit.background} shadow-lg">
                        <i class="text-2xl text-slate-100">${hit.icon}</i>
                    </div>
                </div>
                <div class="flex justify-center items-center font-medium flex-wrap dark:text-slate-200">${hit.title}</div>
                <ol class="list-inside mt-4 pt-2 text-sm list-decimal">${olInnerHtml}</ol>
            </section>`;
    }
  };

  // Start search
  Utils.externalLibrary(Utils.LIBRARY.fuse)
    .then((Fuse) => {
      if (typeof Fuse === 'undefined') {
        console.error('Fuse.js library failed to load');
        return;
      }
      new SearchEngine().start();
    })
    .catch((error) => {
      console.error('Failed to load search library:', error);
    });
});
