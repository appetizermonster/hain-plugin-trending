'use strict';

const _ = require('lodash');
const co = require('co');
const trending = require('github-trending');
const shell = require('electron').shell;

const TEMP_ID = '__trending';
const CACHE_DURATION_SEC = 30 * 60; // 30 mins

const LANG_COLORS = {
  'c': '#ff5252',
  'c#': '#ff4081',
  'c++': '#e040fb',
  'css': '#7c4dff',
  'html': '#303f9f',
  'javascript': '#1976d2',
  'python': '#0288d1',
  'java': '#0097a7',
  'go': '#00796b',
  'swift': '#2e7d32'
};

module.exports = (context) => {

  let cachedRepos = [];
  let lastFetchTime = 0;

  function fetchRepos(callback) {
    if (cachedRepos) {
      const diff = (Date.now() - lastFetchTime) / 1000;
      if (diff <= CACHE_DURATION_SEC) {
        return callback(cachedRepos);
      }
    }

    trending((err, repos) => {
      if (err) {
        return callback(null);
      }
      cachedRepos = repos;
      lastFetchTime = Date.now();
      return callback(repos);
    });
  }

  function* startup() {
    fetchRepos(() => {});
  }

  function* search(query, reply) {
    reply([{
      id: TEMP_ID,
      title: 'fetching...',
      desc: 'from Github.com',
      icon: '#fa fa-circle-o-notch fa-spin'
    }]);

    const ret = yield new Promise((resolve, reject) => {
      fetchRepos((repos) => {
        if (repos === null)
          return reject();
        return resolve(repos);
      });
    });

    reply({ remove: TEMP_ID });
    return ret.map((x) => {
      let lang = x.language;
      if (lang.length === 0) {
        lang = 'None';
      }
      const langColor = _.get(LANG_COLORS, lang.toLowerCase(), '#e65100');
      return {
        id: x.url,
        title: `<b>${x.title}</b> by ${x.owner}`,
        desc: `<span style='border-radius: 5px; background-color: ${langColor}; color: #ffffff; padding: 2px'>${lang}</span> / ${x.star} / ${x.description}`
      };
    });
  }

  function* execute(id, payload) {
    if (id === TEMP_ID)
      return;
    shell.openExternal(id);
  }

  return {
    startup: co.wrap(startup),
    search: co.wrap(search),
    execute: co.wrap(execute)
  };
};
