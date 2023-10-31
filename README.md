A module to handle concurrent requests with worbox-precaching

# 1. Installation

```bash
$ npm install precache-striping
```

#### Peer Dependencies

You need to install the following dependencies

```json
{
  "peerDependencies": {
    "workbox-precaching": ">=6.5.0",
    "workbox-routing": ">=6.5.0"
  }
}
```

- `6.5.x` ~ `7.x.x`

If you don't install them, run the fowlling command

```bash
$ npm install workobx-routing working-precaching
```

# 2. How to use it

Your service worker(normally named `sw.js` or `service-worker.js`) might cache the assets files using [workbox-precaching](https://www.npmjs.com/package/workbox-precaching) like this.

```typescript
// in sw.js
import { precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope; // to prevent type error

precacheAndRoute(self.__WB_MANIFEST);
```

- see [#precaching-with-injectmanifest](https://developer.chrome.com/docs/workbox/precaching-with-workbox/#precaching-with-injectmanifest)

## 2.1. Caching concurrently

```typescript
// in sw.js
// import { precacheAndRoute } from "workbox-precaching";
// precacheAndRoute(self.__WB_MANIFEST);
import { PrecacheStriping } from "precache-striping";

const controller = new PrecacheStriping();
controller.precacheStriping(self.__WB_MANIFEST);
```

- It splits the assets into four buckets and they are executed concurrently
- Each bucket is executed sequentally like `precacheAndRoute(...)`

## 2.2. Bucket size

You can change bucket size

```typescript
controller.precacheStriping(self.__WB_MANIFEST, 6);
// bucket0: [...].length 17
// bucket1: [...].length 17
// bucket2: [...].length 17
// bucket3: [...].length 17
// bucket4: [...].length 16
// bucket5: [...].length 16
```

If 100 assets are given, each bucket contains 16 or 17 assets

## 2.3. Routing Option

If you want pass a custom routing option,

```typescript
// in sw.js
import { PrecacheStriping } from "precache-striping";
import { type PrecacheRouteOptions} from 'workbox-precaching'

const precachController = new PrecacheStriping({
  optionResolver: () => ({
    cleanURLs: ...,
    directoryIndex: ...,
    ignoreURLParametersMatching: ...,
    urlManipulation: ...
  } as PrecacheRouteOptions),
});
controller.precacheStriping(self.__WB_MANIFEST);
```

## 2.4. Don't

You should not use this module in conjunction with the `{ precacheAndRoute, precache }` in `workbox-precaching` module.

The following sample code deletes all cached assets.

```typescript
// in sw.js
import { precacheAndRoute, type PrecacheEntry } from "workbox-precaching";
import { PrecacheStriping } from "precache-striping";

const controller = new PrecacheStriping();
controller.precacheStriping(self.__WB_MANIFEST);

const moreAssets: PrecacheEntriy[] = [...]
precacheAndRoute(someMoreAssets); // (X)
```

- `precache-striping` deletes the assets cached by `workbox-precaching`
- `workbox-precaching` deletes the assets cached by `precache-striping`

Instead, call `PrecacheStriping.precache()` as shown in the code below

```typescript
import { type PrecacheEntry } from "workbox-precaching";
import { PrecacheStriping } from "precache-striping";

const controller = new PrecacheStriping();
controller.precacheStriping(self.__WB_MANIFEST);

const moreAssets: PrecacheEntriy[] = [...]
// precacheAndRoute(someMoreAssets);
controller.precache(moreAssets)
```

## 2.5. cleanupOutdatedCaches

`cleanupOutdatedCaches()` in `workbox-precaching` can be used together.

```typescript
import {cleanupOutdatedCaches, type PrecacheEntry } from "workbox-precaching";

const controller = new PrecacheStriping();
controller.precacheStriping(self.__WB_MANIFEST);

const moreAssets: PrecacheEntriy[] = [...]
controller.precach(moreAssets)

cleanupOutdatedCaches()
```

After updating service worker(say `sw#2`), browser detects changes and then tries to install `sw#2` and `cleanupOutdatedCaches()` clear outdated assets cached by `sw#1`

# 3. Samples

### 3.1. Basic example

```typescript
import { cleanupOutdatedCaches, type PrecacheEntry } from "workbox-precaching";
import { PrecacheStriping } from "precache-striping";

declare let self: ServiceWorkerGlobalScope;

const staticAssets: (string | PrecacheEntry)[] = self.__WB_MANIFEST;

const controller = new PrecacheStriping();
controller.precacheStriping(staticAssets, 8);
cleanupOutdatedCaches();
```
