# Custom Bookmark Favicon - Firefox Add-on
![Mozilla Add-on Version](https://img.shields.io/amo/v/custom-bookmark-favicon) ![Mozilla Add-on Downloads](https://img.shields.io/amo/dw/custom-bookmark-favicon) ![Mozilla Add-on Stars](https://img.shields.io/amo/stars/custom-bookmark-favicon)

## Install
You can install this add-on from the official `addons.mozilla.org` listing: [Custom Bookmark Favicon](https://addons.mozilla.org/en-US/firefox/addon/custom-bookmark-favicon/)

## About

<p align="center"><img alt="tabs" style="display:inline-block;margin:0 auto" src="https://github.com/user-attachments/assets/4c035567-072a-48e7-854d-2329ba3020a2" /></p>

Many users like to use **custom favicons** to visually identify common sites, for instance to differentiate between email accounts or to make a certain page stand out in the tab bar. There's plenty of extensions that do this, but none support the **bookmarks bar** because of the way that Firefox fetches bookmark favicons.

This extension provides the same functionality as those other extensions (with the addition of supporting arbitrary regular expressions to match URLs), but **also supports bookmarks** via the usage of a stateless AWS Lambda API (hosted by extension author at 0xA.click) that will serve your custom favicon and redirect to your target page.

**No logs are kept by this service**, and the Cache-Control header is set so that your browser will only need to hit the service **once per calendar year**. This also means your bookmarks should work offline as well. This service will remain available and free so long as total usage is below 24M requests/year, which I think is a pretty safe bet at one request per bookmark per user per year.

**Free Support:** If you try this out and anything goes wrong, please shoot me an email at **alexaschor+favicon@gmail.com**, and I'll do my best to help. I aim to respond to all queries and bug reports within 48 business hours.
