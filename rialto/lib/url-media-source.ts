class URLMediaSource {

  private mediaSource_: MediaSource;
  private url_: string;
  private mimeType_: string;

  constructor(uriOrMediaSource: string | MediaSource, mimeType: string) {
    if (typeof uriOrMediaSource === 'object') {
      this.mediaSource_ = uriOrMediaSource
    } else if(typeof uriOrMediaSource === 'string') {
      this.url_ = uriOrMediaSource
    }
    this.mimeType_ = mimeType
  }

  /**
	 * @returns {string}
	 */
  getURL() {
    if (this.url_) {
      return this.url_
    } else if (this.mediaSource_) {
      return URL.createObjectURL(this.mediaSource_)
    }
  }

  /**
	 * @returns {string}
	 */
  getMimeType() {
    return this.mimeType_
  }
}
