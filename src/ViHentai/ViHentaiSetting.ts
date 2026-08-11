import { DUIButton, DUINavigationButton, SourceStateManager } from '@paperback/types';

const DEFAULT_BASE_URL = 'https://vi-hentai.pro';
const DEFAULT_PASSWORD = '5';

// --- HELPERS RETRIEVE STATE ---
export const getDomain = async (stateManager: SourceStateManager): Promise<string> => {
    if (typeof stateManager?.retrieve === 'function') {
        const domain = await stateManager.retrieve('baseUrl');
        return (domain as string) ?? DEFAULT_BASE_URL;
    }
    return DEFAULT_BASE_URL;
};

export const getPassword = async (stateManager: SourceStateManager): Promise<string> => {
    if (typeof stateManager?.retrieve === 'function') {
        const pwd = await stateManager.retrieve('password');
        return (pwd as string) ?? DEFAULT_PASSWORD;
    }
    return DEFAULT_PASSWORD;
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
                                    await stateManager.store('baseUrl', trimmed);
                                },
                            }),
                        }),
                    ],
                }),
            ],
        }),
    });
};

export const passwordSettings = (stateManager: SourceStateManager): DUINavigationButton => {
    return App.createDUINavigationButton({
        id: 'password_settings',
        label: 'Thay đổi mật khẩu',
        form: App.createDUIForm({
            sections: async () => [
                App.createDUISection({
                    isHidden: false,
                    id: 'content',
                    rows: async () => [
                        App.createDUIInputField({
                            id: 'password',
                            label: 'Thay đổi mật khẩu',
                            value: App.createDUIBinding({
                                get: async () => await getPassword(stateManager),
                                set: async (value: string) => {
                                    await stateManager.store('password', value.trim());
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
            await stateManager.store('password', DEFAULT_PASSWORD);
        },
    });
}
