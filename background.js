(function() {
    'use strict';

    // Template JS to update favicon
    function injectable(base64) {
        return `(function() {
      // Remove existing favicons
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
      existingFavicons.forEach(favicon => favicon.remove());

      // Create new favicon
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.href = 'data:image/png;base64,${base64}';
      link.setAttribute("x-what-is-this", 'This favicon was inserted by the "Custom Bookmark Favicon" Firefox extension.');

      // Add to document
      document.head.appendChild(link);
    })();`;
    }

    // Target tabID and change fav
    async function setTabFavicon(tabId, base64Image) {
        await browser.tabs.executeScript(tabId, { code: injectable(base64Image) });
        return true;
    }

    function matches(matcher, url, isRegex) {
        if (isRegex) {
            return new RegExp(matcher).test(url);
        } else {
            return (url === matcher);
        }
    }

    // Update favicons in all matching tabs
    async function applyFaviconMatcher(matcher, details) {
        const tabs = await browser.tabs.query({});

        for (const tab of tabs) {
            if (!tab.url) continue;

            if (matches(matcher, tab.url, details.isRegex)) {
                await setTabFavicon(tab.id, details.base64Image);
            }

        }
        return true;
    }

    async function applyAllMatchers() {
        const storage = await browser.storage.local.get('customFavicons');
        const customFavicons = storage.customFavicons || {};

        for (const [matcher, details] of Object.entries(customFavicons)) {
            applyFaviconMatcher(matcher, details);
        }
    }

    function intToBase26(num) {
        if (num === 0) return "a"; // handle zero explicitly

        let result = "";
        while (num > 0) {
            const remainder = num % 26;
            result = String.fromCharCode(97 + remainder) + result;
            num = Math.floor(num / 26);
        }
        return result;
    }

    function hashPrefix(url) {
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        return intToBase26(Math.abs(hash));
    }

    async function makeBookmarksUnique() {
        try {

            const bookmarkTree = await browser.bookmarks.getTree();
            const relayBookmarks = [];

            function findRelays(bookmarkNodes) {
                for (const node of bookmarkNodes) {
                    if (node.url) {
                        try {
                            const url = new URL(node.url);
                            if (url.hostname === '0xa.click' || url.hostname.endsWith('.0xa.click')) {
                                relayBookmarks.push(node);
                            }
                        } catch (err) {
                            continue;
                        }
                    }

                    if (node.children) {
                        findRelays(node.children);
                    }
                }
            }

            findRelays(bookmarkTree);

            if (relayBookmarks.length === 0) {
                return { success: true, updated: 0 };
            }

            for (let i = 0; i < relayBookmarks.length; i++) {
                const bookmark = relayBookmarks[i];
                const originalUrl = new URL(bookmark.url);
                const icon = originalUrl.searchParams.get("p");

                const subdomain = hashPrefix(icon);

                // Create new URL with unique subdomain
                const newUrl = new URL(bookmark.url);
                newUrl.hostname = `${subdomain}.0xa.click`;

                // Update the bookmark
                await browser.bookmarks.update(bookmark.id, {
                    url: newUrl.toString()
                });

                console.log(`Updated bookmark "${bookmark.title}" from ${originalUrl.hostname} to ${newUrl.hostname}`);
            }

        } catch (err) {
            console.error('Error in makeBookmarksUnique:', err);
        }
    }

    // Open a popup with a file input element
    async function openPopup() {
        const tabs = await new Promise(resolve => browser.tabs.query({ active: true, currentWindow: true }, resolve));
        const currentTabUrl = tabs[0].url; // This is the real page URL

        // Pass the URL to the popup via query string
        browser.windows.create({
                               url: browser.runtime.getURL(`popup.html?tabUrl=${encodeURIComponent(currentTabUrl)}`),
                               type: "popup",
                               width: 400,
                               height: 500
        });
    }

    // Listen for messages from frontend
    browser.runtime.onMessage.addListener(async (message, sender) => {
        if (message.action === 'newRule') {
            applyAllMatchers();
            makeBookmarksUnique();
        } else if (message.action === 'makeUnique') {
            makeBookmarksUnique();
        }
    });

    // Apply the matchers on lots of different events,
    // so hopefully it catches everything
    browser.tabs.onUpdated.addListener(applyAllMatchers);
    browser.tabs.onCreated.addListener(applyAllMatchers);
    browser.tabs.onActivated.addListener(applyAllMatchers);
    browser.browserAction.onClicked.addListener(openPopup);

    browser.runtime.onStartup.addListener(makeBookmarksUnique);
    browser.browserAction.onClicked.addListener(makeBookmarksUnique);

})();
