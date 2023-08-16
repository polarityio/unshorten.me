module.exports = {
  /**
   * Name of the integration which is displayed in the Polarity integrations user interface
   *
   * @type String
   * @required
   */
  name: 'Unshorten.me',
  /**
   * The acronym that appears in the notification window when information from this integration
   * is displayed.  Note that the acronym is included as part of each "tag" in the summary information
   * for the integration.  As a result, it is best to keep it to 4 or less characters.  The casing used
   * here will be carried forward into the notification window.
   *
   * @type String
   * @required
   */
  acronym: 'UME',
  onDemandOnly: true,
  /**
   * Description for this integration which is displayed in the Polarity integrations user interface
   *
   * @type String
   * @optional
   */
  description: 'Un-Shorten URLs created by URL shortening services using the unshorten.me API.',
  customTypes: [
    {
      key: 'domain-url',
      regex: /((https|http)?:\/\/)?([a-zA-Z0-9-]{1,256})\.([a-z]{2,10})\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
    }
  ],
  defaultColor: 'light-gray',
  /**
   * Provide custom component logic and template for rendering the integration details block.  If you do not
   * provide a custom template and/or component then the integration will display data as a table of key value
   * pairs.
   *
   * @type Object
   * @optional
   */
  block: {
    component: {
      file: './components/block.js'
    },
    template: {
      file: './templates/block.hbs'
    }
  },
  styles: ['./styles/styles.less'],
  request: {
    // Provide the path to your certFile. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    cert: '',
    // Provide the path to your private key. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    key: '',
    // Provide the key passphrase if required.  Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    passphrase: '',
    // Provide the Certificate Authority. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    ca: '',
    // An HTTP proxy to be used. Supports proxy Auth with Basic Auth, identical to support for
    // the url parameter (by embedding the auth info in the uri)
    proxy: ''
  },
  logging: {
    level: 'info' //trace, debug, info, warn, error, fatal
  },
  options: [
    {
      key: 'autoUpdate',
      name: 'Enable Auto Update',
      description:
        'If checked, the integration will automatically update the list of valid url-shortener services from the MISP github repository every Sunday at 11:00 PM (polarity server time). This setting must be set to "Only admins can view and edit". The integration must be able to issue a GET request to the MISP github repo located at `https://github.com/MISP/misp-warninglists` for auto updating to work.',
      default: true,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: true
    }
  ]
};
