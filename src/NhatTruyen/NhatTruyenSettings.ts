import {
    DUIButton,
    DUIForm,
    DUINavigationButton,
    DUISection,
    SourceStateManager
} from '@paperback/types'

export const DEFAULT_DOMAIN = 'https://nhattruyenqq.us'

// ----- state helpers -----
export async function getDomain(stateManager: SourceStateManager): Promise<string> {
    const domain = (await stateManager.retrieve('domain')) as string | undefined
    return (domain && domain.length > 0 ? domain : DEFAULT_DOMAIN).replace(/\/+$/, '')
}

export async function setDomain(stateManager: SourceStateManager, value: string): Promise<void> {
    await stateManager.store('domain', value.trim().replace(/\/+$/, ''))
}

// ----- settings UI (getSourceMenu) -----
export function contentSettings(stateManager: SourceStateManager): DUINavigationButton {
    return App.createDUINavigationButton({
        id: 'content_settings',
        label: 'Cài đặt tên miền',
        form: App.createDUIForm({
            sections: async () => [
                App.createDUISection({
                    id: 'domain_section',
                    header: 'Tên miền (Base URL)',
                    footer: 'Nhập đầy đủ, ví dụ: https://nhattruyenqq.us',
                    isHidden: false,
                    rows: async () => [
                        App.createDUIInputField({
                            id: 'domain',
                            label: 'Domain',
                            value: App.createDUIBinding({
                                get: async () => await getDomain(stateManager),
                                set: async (newValue) => {
                                    await setDomain(stateManager, `${newValue}`)
                                }
                            })
                        })
                    ]
                })
            ]
        })
    })
}

export function resetSettingsButton(stateManager: SourceStateManager): DUIButton {
    return App.createDUIButton({
        id: 'reset_domain',
        label: 'Đặt lại tên miền mặc định',
        onTap: async () => {
            await setDomain(stateManager, DEFAULT_DOMAIN)
        }
    })
}
