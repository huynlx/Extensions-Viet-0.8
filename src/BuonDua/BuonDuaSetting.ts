import { DUIButton, DUINavigationButton, SourceStateManager } from '@paperback/types';

const DEFAULT_BASE_URL = 'https://buondua.com';
const DEFAULT_CDN_SERVER = '0'; // 0: Mặc định, 1: Server dự phòng 1, 2: Server dự phòng 2

// --- HELPERS RETRIEVE STATE ---

export const getDomain = async (stateManager: SourceStateManager): Promise<string> => {
    return ((await stateManager.retrieve('baseUrl')) as string) ?? DEFAULT_BASE_URL;
};

export const getCdnServer = async (stateManager: SourceStateManager): Promise<string> => {
    return ((await stateManager.retrieve('cdnServer')) as string) ?? DEFAULT_CDN_SERVER;
};

// --- SETTING COMPONENTS ---

export const domainSettings = (stateManager: SourceStateManager): DUINavigationButton => {
    return App.createDUINavigationButton({
        id: 'domain_settings',
        label: 'Thay đổi tên miền',
        form: App.createDUIForm({
            sections: async () => [
                App.createDUISection({
                    isHidden: false,
                    id: 'content',
                    rows: async () => [
                        App.createDUIInputField({
                            id: 'baseUrl',
                            label: 'Thay đổi tên miền',
                            value: App.createDUIBinding({
                                get: async () => await getDomain(stateManager),
                                set: async (value: string) => {
                                    const trimmed = value.trim().replace(/\/$/, '');
                                    await stateManager.store('baseUrl', trimmed || DEFAULT_BASE_URL);
                                },
                            }),
                        }),
                    ],
                }),
            ],
        }),
    });
};

export const cdnSettings = (stateManager: SourceStateManager): DUINavigationButton => {
    return App.createDUINavigationButton({
        id: 'cdn_settings',
        label: 'Cấu hình Server Ảnh (CDN)',
        form: App.createDUIForm({
            sections: async () => [
                App.createDUISection({
                    isHidden: false,
                    id: 'cdn_section',
                    rows: async () => [
                        App.createDUISelect({
                            id: 'cdnServer',
                            label: 'Chọn Server tải ảnh',
                            options: ['Mặc định (CDN 1)', 'Dự phòng (CDN 2)', 'Dự phòng (CDN 3)'],
                            value: App.createDUIBinding({
                                get: async () => {
                                    const val = await getCdnServer(stateManager);
                                    return [val];
                                },
                                set: async (value: string[]) => {
                                    await stateManager.store('cdnServer', value[0] ?? DEFAULT_CDN_SERVER);
                                },
                            }),
                            allowsMultiselect: false,
                        }),
                    ],
                }),
            ],
        }),
    });
};

export function testConnectionButton(stateManager: SourceStateManager): DUIButton {
    return App.createDUIButton({
        id: 'test_connection',
        label: 'Kiểm tra kết nối Domain',
        onTap: async () => {
            const baseUrl = await getDomain(stateManager);
            try {
                const request = App.createRequest({
                    url: baseUrl,
                    method: 'GET',
                });
                const requestManager = App.createRequestManager({ requestsPerSecond: 1 });
                const response = await requestManager.schedule(request, 1);

                if (response.status === 200) {
                    App.createDUISection({
                        id: 'status',
                        header: 'Kết nối thành công! (HTTP 200)',
                        rows: async () => [],
                        isHidden: false,
                    });
                } else {
                    throw new Error(`Mã phản hồi: ${response.status}`);
                }
            } catch (error: any) {
                throw new Error(`Không thể kết nối tới ${baseUrl}. Lỗi: ${error?.message ?? 'Chặn Cloudflare hoặc sai URL'}`);
            }
        },
    });
}

export function resetSettings(stateManager: SourceStateManager): DUIButton {
    return App.createDUIButton({
        id: 'reset',
        label: 'Đặt lại mặc định',
        onTap: async () => {
            await stateManager.store('baseUrl', DEFAULT_BASE_URL);
            await stateManager.store('cdnServer', DEFAULT_CDN_SERVER);
        },
    });
}
