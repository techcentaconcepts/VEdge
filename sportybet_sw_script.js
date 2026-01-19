// whenever your update this file, please update sw.js query version on
// compile/lib/plugins/FTLPlugin.js line:45

const { registerRoute } = workbox.routing;
const {
  StaleWhileRevalidate,
  CacheFirst,
} = workbox.strategies;
const { CacheableResponsePlugin } = workbox.cacheableResponse;

const CACHE_NAME = 'localizations';
const EXPIRE_TIME = 60 * 60 * 24 * 7 * 1000; // 7 days
// sometimes, it may get empty keys object accidently
// but empty keys object doesn't mean wrong
// so empty keys object will only be cached 1 day
const EXPIRE_TIME_EMPTY_RESULT = 60 * 60 * 24 * 1 * 1000;
const CMS_URLS = {
  single: '/cms/pages/export',
  multiple: '/cms/pages/getPages',
};

/**
 * remember to init custom properties of `self`
 * because children iframes will run this script too but it won't call init post message
 */
self.context_version = checkContextVersionData(self.context_version);
self.addEventListener('message', event => {
  if (event.data && event.data.context_version) {
    self.context_version = checkContextVersionData(event.data.context_version);
  }
});

/** to ensure `self.context_version` is an object */
function checkContextVersionData(data = {}) {
  return typeof data === 'object' ? data : {};
}

function isEmptyObject(obj) {
  let key;
  for (key in obj) return false;
  return true;
}

function getPageNameFromSinglePath(path) {
  return path.split('/').pop();
}

registerRoute(
  new RegExp(`${CMS_URLS.single}/.*`),
  args => {
    const { event, url } = args;
    return caches.open(CACHE_NAME)
      .then(cache => cache.match(url)
        .then(async response => {
          const fetchRequest = () => fetch(event.request.clone()).then(response => {
            if (response.status === 200) {
              cache.put(url, response.clone());
            }
            // Return the original response object, which will be used to fulfill the resource request.
            return response;
          });

          if (!response) return fetchRequest();

          const tempResponse = response.clone();
          return tempResponse.json().then(data => {
            if (!data) {
              cache.delete(url);
              return fetchRequest();
            }

            // check expire time
            const cacheDate = new Date(response.headers.get('date'));
            if (!cacheDate) {
              cache.delete(url);
              return fetchRequest();
            }
            const cacheTime = cacheDate.getTime();
            const now = new Date().getTime();
            const expireTime = isEmptyObject(data.keys)
              ? EXPIRE_TIME_EMPTY_RESULT
              : EXPIRE_TIME;
            if (now - cacheTime > expireTime) {
              cache.delete(url);
              return fetchRequest();
            }

            // check vesrion
            const pageName = getPageNameFromSinglePath(url.pathname);
            if (!self.context_version[pageName] || +data.version < +self.context_version[pageName]) {
              cache.delete(url);
              return fetchRequest();
            }

            // use cache
            return response;
          });
        }));
  },
);

function getCacheKeyName({ pageName, country, locale = '' }) {
  let cmsSingleUrl = `/${country}/m${CMS_URLS.single}/${pageName}`;
  if (locale && locale !== 'en') cmsSingleUrl += `?locale=${locale}`;
  return cmsSingleUrl;
}
/**
 * type pageItems = {
 *   {
 *     page: string;
 *     version: number;
 *     keys: {
 *      [keyName]: {},
 *     };
 *   }
 * }[];
 */
registerRoute(
  new RegExp(`${CMS_URLS.multiple}.*`),
  async args => {
    const { event, url } = args;

    const cacheContainer = await caches.open(CACHE_NAME);
    const {
      locale = '',
      country = 'ng',
      pages: bodyPages = [],
    } = await event.request.clone().json();

    const uncachedPages = []; // the pages that haven't been cached and have new version
    const cachedPages = []; // cahced pages response
    const promises = bodyPages.map(async pageName => {
      const cmsSingleUrl = getCacheKeyName({ pageName, country, locale });
      const cachedRes = await cacheContainer.match(cmsSingleUrl);
      if (!cachedRes) uncachedPages.push(pageName);
      else {
        const cachedPage = await cachedRes.json();
        if (!self.context_version[pageName] || +cachedPage.version < +self.context_version[pageName]) uncachedPages.push(pageName);
        else {
          cachedPages.push({
            page: pageName,
            keys: cachedPage.keys,
            version: cachedPage.version || 0,
          });
        }
      }
    });
    await Promise.all(promises);

    if (!uncachedPages.length) return new Response(JSON.stringify(cachedPages));
    const res = await fetch(url, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        country,
        locale,
        pages: uncachedPages,
      }),
    });

    if (!res.ok) return res;

    const data = await res.json();

    async function cacheHandler() {
      try {
        const pageItems = data;
        cachedPages.forEach(cp => pageItems.push(cp));
        if (!pageItems.length) return;

        pageItems.forEach(async pageItem => {
          const cmsSingleUrl = getCacheKeyName({ pageName: pageItem.page, country, locale });
          const cachedRes = await cacheContainer.match(cmsSingleUrl);
          if (!cachedRes || +cachedRes.version < +pageItem.version) {
            const mockPageRes = new Response(
              JSON.stringify({
                keys: pageItem.keys,
                version: pageItem.version || 0,
              }),
              { status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' } },
            );

            cacheContainer.put(cmsSingleUrl, mockPageRes);
          }
        });
      } catch (e) {
        console.log(e);
      }
    }

    cacheHandler();

    return new Response(
      JSON.stringify(data.concat(cachedPages)),
      { status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' } },
    );
  },
  'POST',
);
