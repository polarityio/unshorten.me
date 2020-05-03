const fs = require('fs');
const readline = require('readline');
const { URL_LIST_FILE } = require('./constants');

async function loadUrls() {
  let urlShorteners = new Set();

  const rl = readline.createInterface({
    input: fs.createReadStream(URL_LIST_FILE)
  });

  rl.on('line', (url) => {
    const trimmedUrl = url.trim();
    if (trimmedUrl.length > 0) {
      urlShorteners.add(trimmedUrl.toLowerCase());
    }
  });

  return new Promise((resolve, reject) => {
    rl.on('close', () => {
      resolve(urlShorteners);
    });
  });
}

module.exports = {
  loadUrls
};
