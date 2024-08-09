polarity.export = PolarityComponent.extend({
  showCopyMessage: false,
  details: Ember.computed.alias('block.data.details'),
  actions: {
    copyData: function () {
      Ember.run.scheduleOnce('afterRender', this, this.copyElementToClipboard);
    }
  },
  copyElementToClipboard() {
    let url = this.get('details.resolved_url').trim();
    let defangedUrl = url.replace(/\./g, '[.]');
    defangedUrl = defangedUrl.replace(/^http/, 'hxxp');

    navigator.clipboard.writeText(defangedUrl).then(() => {
      this.set('showCopyMessage', true);

      setTimeout(() => {
        if (!this.isDestroyed) {
          this.set('showCopyMessage', false);
        }
      }, 2000);
    });
  }
});
