define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/Deferred",
  "dojo/query",
  "dojo/on",
  "dojo/dom",
  "esri/request",
  "esri/urlUtils",
  "dijit/focus",
  "dijit/TooltipDialog",
  "dijit/popup",
], function (
  declare, lang,
  Deferred, query, on,
  dom,
  esriRequest, urlUtils, focusUtil,
  TooltipDialog, popup
) {
  return declare(null, {

    constructor: function (parameters) {
      var defaults = {
        config: {},
        title: window.document.title,
        summary: "",
        hashtags: "",
        image: "",
        map: null,
        url: window.location.href,
        bitlyAPI: "https://arcg.is/prod/shorten",
        facebookURL: "https://www.facebook.com/sharer/sharer.php?s=100&p[url]={url}&p[images][0]={image}&p[title]={title}&p[summary]={summary}",
        twitterURL: "https://twitter.com/intent/tweet?url={url}&text={title}&hashtags={hashtags}",
      };

      lang.mixin(this, defaults, parameters);

      this.tooltipDialog = new TooltipDialog({
        id: "tooltip",
        tabIndex: 0
      });
      this.tooltipDialog.startup();


    },

    /* Public Methods */

    shareLink: function (clickNode) {


      this._getUrl().then(lang.hitch(this, function (response) {
        if (response) {
          var fullLink;
          var shareObj = {
            url: encodeURIComponent(response),
            title: encodeURIComponent(this.title),
            image: encodeURIComponent(this.image),
            summary: encodeURIComponent(this.summary),
            hashtags: encodeURIComponent(this.hashtags)
          };

          var node = clickNode.target || clickNode.srcElement;
          var type = node.id;
          if (type === "facebook") {
            fullLink = lang.replace(this.facebookURL, shareObj);
            window.open(fullLink, "share", true);
          } else if (type === "twitter") {
            fullLink = lang.replace(this.twitterURL, shareObj);
            window.open(fullLink, "share", true);
          } else {
            fullLink = response;
            this.tooltipDialog.setContent("<input class='tip' type='text' value='" + fullLink + "' readonly/>");
            popup.open({
              popup: this.tooltipDialog,
              x: clickNode.pageX,
              y: clickNode.pageY
            });
            query(".tip").forEach(lang.hitch(this, function (node) {
              node.select();
              focusUtil.focus(node);
            }));
            on.once(this.tooltipDialog, "blur", lang.hitch(this, function () {
              popup.close(this.tooltipDialog);
            }));


          }
        }
      }));
    },

    /* Private Methods */

    //optional array of additional search layers to configure from the application config process
    _getUrl: function () {
      var deferred = new Deferred();
      var urlObject = urlUtils.urlToObject(window.location.href);
      urlObject.query = urlObject.query || {};
      // Remove locale from url params
      if (urlObject.query.locale) {
        delete urlObject.query.locale;
      }
      // Add current extent to url 
      var gExtent, url, useSeparator;
      gExtent = this.map.geographicExtent;
      if (gExtent) {
        urlObject.query.extent = gExtent.xmin.toFixed(4) + ',' + gExtent.ymin.toFixed(4) + ',' + gExtent.xmax.toFixed(4) + ',' + gExtent.ymax.toFixed(4);
      }
      url = window.location.protocol + "//" + window.location.host + window.location.pathname;
      // append params
      for (var i in urlObject.query) {
        if (urlObject.query[i]) {
          // use separator 
          if (useSeparator) {
            url += '&';
          } else {
            url += '?';
            useSeparator = true;
          }
          url += i + '=' + urlObject.query[i];
        }
      }

      // shorten the link 
      esriRequest({
        url: this.bitlyAPI,
        callbackParamName: "callback",
        content: {
          longUrl: url,
          f: "json"
        },
        load: lang.hitch(this, function (response) {
          if (response && response.data && response.data.url) {
            deferred.resolve(response.data.url);
          } else {
            deferred.resolve(null);
          }
        }),
        error: function (error) {
          console.log(error);
          deferred.resolve(null);
        }
      });

      return deferred.promise;
    }

  });
});