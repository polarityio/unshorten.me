'use strict';

const fs = require('fs');

const request = require('postman-request');
const schedule = require('node-schedule');
const async = require('async');

const config = require('./config/config');
const { loadUrls } = require('./lib/list-loader');
const updateList = require('./lib/update-lists');

let Logger;
let requestWithDefaults;
let urlShorteners;
let previousAutoUpdate;
let updateListJob = null;

const MAX_PARALLEL_LOOKUPS = 10;

/**
 *
 * @param entities
 * @param options
 * @param cb
 */
function startup(logger) {
  return async (cb) => {
    let defaults = {};
    Logger = logger;

    const { cert, key, passphrase, ca, proxy, rejectUnauthorized } = config.request;

    if (typeof cert === 'string' && cert.length > 0) {
      defaults.cert = fs.readFileSync(cert);
    }

    if (typeof key === 'string' && key.length > 0) {
      defaults.key = fs.readFileSync(key);
    }

    if (typeof passphrase === 'string' && passphrase.length > 0) {
      defaults.passphrase = passphrase;
    }

    if (typeof ca === 'string' && ca.length > 0) {
      defaults.ca = fs.readFileSync(ca);
    }

    if (typeof proxy === 'string' && proxy.length > 0) {
      defaults.proxy = proxy;
    }

    if (typeof rejectUnauthorized === 'boolean') {
      defaults.rejectUnauthorized = rejectUnauthorized;
    }

    requestWithDefaults = request.defaults(defaults);

    urlShorteners = await loadUrls();

    cb(null);
  };
}

function _getUrlShortener(url) {
  // strip off the http:// or https://
  let urlWithoutSchema = url.replace(/(http:\/\/|https:\/\/)/, '');
  // Split on `/` to get the FQDN which will be the first token
  let tokens = urlWithoutSchema.split('/');

  // If something goes wrong so just return an empty string
  return tokens.length > 0 ? tokens[0].trim().toLowerCase().split('.').slice(-2).join('.') : '';
}

function doLookup(entities, options, cb) {
  let lookupResults = [];
  let tasks = [];

  Logger.trace({ entities }, 'doLookup');

  if (previousAutoUpdate === true && options.autoUpdate === false && updateListJob !== null) {
    // User switched from auto updating to turning it off so we need
    // to cancel the `updateListJob` if it has been set
    Logger.info('Cancelling automatic updating of MISP urlshortener list data');
    updateListJob.cancel();
    updateListJob = null;
  }

  if (options.autoUpdate && updateListJob === null) {
    Logger.info('Enabled auto update to run every Sunday at 11:00 PM (server time)');
    const rule = new schedule.RecurrenceRule();
    rule.dayOfWeek = [0]; // Sunday
    rule.hour = 23; // 11:00 PM
    rule.minute = 0; // 11:00 PM

    updateListJob = schedule.scheduleJob(rule, async () => {
      Logger.info('Running automatic updating of MISP urlshortener list data');
      await updateList.run();
      urlShorteners = await loadUrls();
      Logger.info(`Loaded ${urlShorteners.size} url shorteners`);
    });
  }

  entities.forEach((entity) => {
    const shortenerFqdn = _getUrlShortener(entity.value);
    if (!urlShorteners.has(shortenerFqdn)) {
      Logger.debug(
        { entity: entity.value, fqdn: shortenerFqdn, urlShorteners: [...urlShorteners] },
        'Ignoring non-shortened URL'
      );
      return;
    }

    const requestOptions = {
      method: 'GET',
      uri: `https://unshorten.me/json/${entity.value}`,
      json: true
    };

    Logger.trace({ uri: requestOptions }, 'Request URI');

    tasks.push(function (done) {
      requestWithDefaults(requestOptions, function (error, res, body) {
        if (error) {
          return done({
            detail: 'HTTP Request Error',
            error
          });
        }

        Logger.trace({ body, statusCode: res ? res.statusCode : 'N/A' }, 'Result of Lookup');

        if (res.statusCode === 200) {
          if (body && body.success === true) {
            // Got a result
            return done(null, {
              entity,
              body
            });
          }

          if (body && body.success === false && body.error === 'Usage Limit Reached') {
            // API Limit Reached
            return done({
              detail: 'Usage Limit Reached'
            });
          }

          // anything else we consider a miss
          return done(null, {
            entity,
            body: null
          });
        } else {
          // non 200 HTTP code we consider it an error
          return done({
            detail: `Unexpected HTTP Status Code ${res.statusCode}`,
            body
          });
        }
      });
    });
  });

  async.parallelLimit(tasks, MAX_PARALLEL_LOOKUPS, (err, results) => {
    if (err) {
      Logger.error({ err: err }, 'Error');
      cb(err);
      return;
    }

    results.forEach((result) => {
      if (result.body === null) {
        lookupResults.push({
          entity: result.entity,
          data: null
        });
      } else {
        lookupResults.push({
          entity: result.entity,
          data: {
            summary: [result.body.resolved_url],
            details: result.body
          }
        });
      }
    });

    Logger.debug({ lookupResults }, 'Results');
    previousAutoUpdate = options.autoUpdate;
    cb(null, lookupResults);
  });
}

module.exports = {
  doLookup,
  startup
};
