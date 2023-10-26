import {
  PrecacheController,
  type PrecacheEntry,
  type PrecacheRouteOptions,
  PrecacheRoute,
} from "workbox-precaching";
import { registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope;

export type PrecacheItem = PrecacheEntry | string;
export type PrecacheOptionConfigurer = () => PrecacheRouteOptions | undefined;

export interface PrecacheStripingOptions {
  optionResolver: PrecacheOptionConfigurer;
  splitEntries?: (entries: PrecacheItem[]) => Generator<PrecacheItem[]>;
}
/**
 * It returns generator which splits the entries.
 * ```
 * ex) 3 buckets for entries [a, b, c, d, e, f g, h]
 *     then generates
 *         [a, b, c], [d, e, f], [g, h]
 * ```
 * @param bucketSize number of buckets. Each bucket contains at least (total / bucketSize) entries
 * @returns generator which yields splitted entries
 */
export const splitByBucketSize = (bucketSize: number) =>
  function* (entries: PrecacheItem[]): Generator<PrecacheItem[]> {
    const size = entries.length;
    let pieces = size % bucketSize;
    const chunkSize = Math.floor(entries.length / bucketSize);
    let offset = 0;

    while (offset < size) {
      const limit = offset + chunkSize + (pieces-- > 0 ? 1 : 0);
      const end = Math.min(limit, size);
      console.log(`[${offset}, ${limit})`);
      yield entries.slice(offset, end);
      offset = end;
    }
  };

const DEFAULT_OPTION: PrecacheStripingOptions = {
  optionResolver: () => undefined,
  splitEntries: undefined,
};

export class PrecacheStriping {
  private _sharedCacheKeys: Map<string, string>;
  private option: PrecacheStripingOptions | undefined;
  constructor(option?: PrecacheStripingOptions) {
    this.option = option && { ...option };

    const leader = new PrecacheController();
    this._sharedCacheKeys = leader.getURLsToCacheKeys();
    self.addEventListener("activate", (e) => {
      leader.activate(e);
      this._bindRouting(leader);
    });
  }
  private _bindRouting(leaderController: PrecacheController) {
    const optionResolver =
      this.option?.optionResolver || DEFAULT_OPTION.optionResolver;
    registerRoute(new PrecacheRoute(leaderController, optionResolver()));
  }
  precache(entries: PrecacheItem[]) {
    const installer = new PrecacheController();
    /**
     * PrecacheController.precache(...) listens to 'activate' event,
     * which wipes out items loaded by other controllers
     */
    installer.addToCacheList(entries);
    self.addEventListener("install", (e: ExtendableEvent) =>
      installer.install(e).then(() => {
        const keys = installer.getURLsToCacheKeys();
        // putting all cache keys to leader controller
        // for cache cleaning on 'activate' event
        keys.forEach((value, key) => {
          this._sharedCacheKeys.set(key, value);
        });
      })
    );
  }
  /**
   * starts concurrent precache task.
   * @param entries
   * @param numOfStriping the number of concurrent precache task
   */
  precacheStriping(entries: (string | PrecacheEntry)[], numOfStriping = 4) {
    const splitter =
      this.option?.splitEntries || splitByBucketSize(numOfStriping);

    for (let chunks of splitter(entries)) {
      this.precache(chunks);
    }
  }
}
