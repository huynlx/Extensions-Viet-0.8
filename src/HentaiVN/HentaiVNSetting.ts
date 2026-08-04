import { DUIButton, DUINavigationButton, SourceStateManager } from '@paperback/types';

const DEFAULT_BASE_URL = 'https://hentaivnreal.com';
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
