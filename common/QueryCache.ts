interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export class QueryCache {
    private cache = new Map<string, CacheEntry<any>>();

    /**
     * Lấy data từ Cache nếu còn tươi (fresh), nếu đã cũ (stale) thì mới gọi fetcher
     * @param key Unique key cho mỗi request
     * @param fetcher Hàm async thực thi lấy dữ liệu (API/HTML)
     * @param staleTime Thời gian cache còn tươi (ms). Mặc định 5 phút.
     */
    async fetchQuery<T>(key: string, fetcher: () => Promise<T>, staleTime: number = 5 * 60 * 1000): Promise<T> {
        const now = Date.now();
        const entry = this.cache.get(key);

        // Trả về cache nếu chưa quá staleTime
        if (entry && now - entry.timestamp < staleTime) {
            return entry.data as T;
        }

        // Gọi fetcher nếu chưa có cache hoặc cache đã quá hạn
        const freshData = await fetcher();

        if (freshData !== null && freshData !== undefined) {
            this.cache.set(key, {
                data: freshData,
                timestamp: now,
            });
        }

        return freshData;
    }

    // Xóa 1 key cụ thể
    invalidateQuery(key: string): void {
        this.cache.delete(key);
    }

    // Xóa toàn bộ cache
    clear(): void {
        this.cache.clear();
    }
}
