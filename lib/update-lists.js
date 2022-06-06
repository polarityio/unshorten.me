const childProcess = require('child_process');
const fs = require('fs');
const { promisify } = require('util');
const request = require('postman-request');
const { URL_LIST_FILE } = require('./constants');

const exec = promisify(childProcess.exec);

async function getUrlShortenerList() {
  let requestOptions = {
    uri: 'https://raw.githubusercontent.com/MISP/misp-warninglists/master/lists/url-shortener/list.json',
    method: 'GET',
    json: true
  };

  return new Promise((resolve, reject) => {
    request(requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      } else if (response.statusCode === 200 && body && Array.isArray(body.list)) {
        resolve(body.list);
      } else {
        reject({
          detail: `Unexpected HTTP Status Code ${response.statusCode}`,
          body
        });
      }
    });
  });
}

async function doesUserExist(user) {
  try {
    await exec(`id ${user}`);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Ensures the repo is owned by the polarityd user in prod environments
 *
 * @returns {Promise<string | Buffer>}
 */
async function setFilePermissions() {
  const userExists = await doesUserExist('polarityd');
  if (userExists) {
    const { stdout, stderr } = await exec(`chown polarityd:polarityd ${URL_LIST_FILE}`);
    if (stderr) {
      throw new Error(stderr);
    } else {
      return stdout;
    }
  } else {
    return 'Skipping setting permissions to polarityd user';
  }
}

async function writeUrlFile(list) {
  const listOutputStream = fs.createWriteStream(URL_LIST_FILE);

  list.forEach((url) => {
    listOutputStream.write(`${url}\n`);
  });
  listOutputStream.end();
}

async function run() {
  try {
    console.info(
      'Fetching latest MISP URL Shortener list from  https://raw.githubusercontent.com/MISP/misp-warninglists/master/lists/url-shortener/list.json'
    );
    let list = await getUrlShortenerList();
    const stdout = await setFilePermissions();
    console.info(stdout);
    await writeUrlFile(list);
    console.info('Finished generating URL Shortener file ("url-shortener-list.txt")');
  } catch (e) {
    console.error(e);
  }
}

module.exports = {
  run
};
