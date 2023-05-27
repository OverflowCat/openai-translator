import { read } from 'fs'
import { BackgroundEventNames } from './eventnames'

export interface BackgroundFetchRequestMessage {
    type: 'open' | 'abort'
    details?: { url: string; options: RequestInit }
}

export interface BackgroundFetchResponseMessage
    extends Pick<Response, 'ok' | 'status' | 'statusText' | 'redirected' | 'type' | 'url'> {
    error?: { message: string; name: string }
    status: number
    data?: string
}

export async function backgroundFetch(
    input: string,
    options: RequestInit,
    buffer?: TransformStream<Uint8Array, Uint8Array>
) {
    return new Promise<Response>((resolve, reject) => {
        ;(async () => {
            const { signal, ...fetchOptions } = options
            if (signal?.aborted) {
                reject(new DOMException('Aborted', 'AbortError'))
                return
            }
            buffer = new TransformStream()
            const { readable } = buffer
            const { writable } = buffer
            const writer = writable.getWriter()
            const textEncoder = new TextEncoder()

            async function readText() {
                const decoder = new TextDecoderStream()
                const reader = readable.pipeThrough(decoder).getReader()
                let text = ''
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) {
                        break
                    }
                    text += value
                }
                return text
            }

            let resolved = false
            const browser = chrome
            const port = browser.runtime.connect({ name: BackgroundEventNames.fetch })
            const message: BackgroundFetchRequestMessage = {
                type: 'open',
                details: { url: input, options: fetchOptions },
            }
            console.log('114', { message })
            const headers = new Headers()
            headers.append('Access-Control-Allow-Origin', '*')
            port.onMessage.addListener((msg: BackgroundFetchResponseMessage) => {
                const { data, ...restResp } = msg
                console.log('118', { msg }) // this is okay!
                console.log(119)
                writer.write(textEncoder.encode(data))
                console.log(120)
                if (!resolved) {
                    const fakedresp = {
                        ...restResp,
                        body: readable,
                        text: readText,
                        json: async () => {
                            const text = await readText()
                            return JSON.parse(text)
                        },
                        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Not_a_valid_code_point',
                        headers,
                    } as Response
                    console.log('514', { fakedresp })
                    resolve(fakedresp)
                    resolved = true
                }
                console.log(130)
            })
            port.postMessage(message)

            function handleAbort() {
                port.postMessage({ type: 'abort' })
            }
            port.onDisconnect.addListener(() => {
                signal?.removeEventListener('abort', handleAbort)
                writer.close()
            })
            signal?.addEventListener('abort', handleAbort)
        })()
    })
}
