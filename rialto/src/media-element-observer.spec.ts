import('chai');
import('jasmine');

import MediaElementObserver from './media-element-observer';

import MediaElementMock from './mocks/html5-media-element-mock';

describe("MediaElementObserver", () => {

  let obs, mediaEl;
  let eventTranslatorCallbackArgs;

  beforeEach(() => {
    eventTranslatorCallbackArgs = [];
    mediaEl = new MediaElementMock();
    obs = new MediaElementObserver((eventReason) => {
      eventTranslatorCallbackArgs.push(eventReason);
    });
    obs.attachMedia(mediaEl);
  });

  afterEach(() => {
    mediaEl = null;
    obs = null;
    eventTranslatorCallbackArgs = null;
  });

  it('should not initialize without an eventTranslatorCallback argument', () => {
    (function() { new MediaElementObserver(undefined) }).should.throw(Error);
  });

  it('should initialize and attach to a media element', () => {
    obs.hasMedia.should.equal(true);
    obs.mediaEl.should.equal(mediaEl);
  });

  it('should apply callback once when media element dispatches an event', () => {

    mediaEl.dispatchEvent('readystatechange');

    eventTranslatorCallbackArgs.length.should.be.equal(1);

  });

});
