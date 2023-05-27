import { backgroundFetch } from './background/fetch'
import { userscriptFetch } from './polyfills/userscript'
import { isDesktopApp, isUserscript } from './utils'

export function getUniversalFetch() {
    if (isUserscript()) {
        return userscriptFetch
    } else if (isDesktopApp()) {
        return window.fetch
    } else {
        return backgroundFetch
    }
}
