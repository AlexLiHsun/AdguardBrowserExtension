/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Adguard Browser Extension.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * adguard.integration is used for integration of Adguard extension and Adguard for Windows/Mac/Android versions.
 * This api implements work with native host messaging
 */
adguard.integration = (function (adguard) {

    // TODO check if app with native host is installed
    // TODO handle switch when app would uninstall or turn off or there are errors
    const nativeHostApi = (() => {
        const API_VERSION = '1';
        const NATIVE_HOST_NAME = 'com.adguard.browser_extension_host.nm';
        const requestIdPrefix = 'ADG_';

        const params = {
            version: adguard.app.getVersion(),
            apiVersion: API_VERSION,
            userAgent: window.navigator.userAgent,
            type: 'nativeAssistant', // TODO change in desktop app to "browserAssistant"
        };

        const REQUEST_TYPES = {
            init: 'init',
            getCurrentAppState: 'getCurrentAppState',
            getCurrentFilteringState: 'getCurrentFilteringState',
            setProtectionStatus: 'setProtectionStatus',
            setFilteringStatus: 'setFilteringStatus',
            addRule: 'addRule',
            removeRule: 'removeRule',
            removeCustomRules: 'removeCustomRules',
            openOriginalCert: 'openOriginalCert',
            reportSite: 'reportSite',
            openFilteringLog: 'openFilteringLog',
            openSettings: 'openSettings',
            updateApp: 'updateApp',
        };

        let port;
        let nativeHostApiVersion;
        let isValidatedOnHost;

        // TODO is not the same turn off integration, or migrate
        const areApiVersionsUpToDate = () => {
            return API_VERSION <= nativeHostApiVersion;
        };

        const generateRandomId = () => {
            return Math.random().toString(36).substr(2, 9);
        };

        const generateRequestId = () => {
            const id = generateRandomId();
            return `${requestIdPrefix}${id}`;
        };

        const HOST_RESPONSE_TYPES = {
            OK: 'ok',
            ERROR: 'error',
        };

        const makeSingleRequest = async (params) => {
            const REQUEST_TIMEOUT_MS = 1000; // TODO is this enough?

            const outgoingRequestId = generateRequestId();

            return new Promise((resolve, reject) => {
                const messageHandler = (response) => {
                    const { requestId, result } = response;

                    const timerId = setTimeout(() => {
                        reject(new Error('Native host is not responding'));
                        this.port.onMessage.removeListener(messageHandler);
                    }, REQUEST_TIMEOUT_MS);

                    if (outgoingRequestId === requestId) {
                        this.port.onMessage.removeListener(messageHandler);
                        clearTimeout(timerId);

                        switch (result) {
                            case HOST_RESPONSE_TYPES.OK:
                                return resolve(response);
                            case HOST_RESPONSE_TYPES.ERROR:
                                return reject(new Error(`Native host responded with error: ${result}`));
                            default:
                                return reject(new Error(`Undefined host response type: ${result}`));
                        }
                    }
                };

                this.port.onMessage.addListener(messageHandler);
                this.port.postMessage({ id: outgoingRequestId, ...params });
            });
        };

        const makeRequestWithRetry = async (params, n) => {
            try {
                return await makeSingleRequest(params);
            } catch (error) {
                if (n === 1) {
                    throw error;
                }
                await reconnect();
                return await makeRequestWithRetry(params, n - 1);
            }
        };

        const makeRequest = (params) => {
            const MAX_REQUEST_RETRIES = 5;
            return makeRequestWithRetry(params, MAX_REQUEST_RETRIES);
        };

        const makeInitRequest = async () => {
            return makeRequest({
                type: REQUEST_TYPES.init,
                parameters: {
                    ...params,
                },
            });
        };

        // TODO figure out how to use information from this handler
        const appStateHandler = (response) => {
            console.log(response);
        };

        const reconnect = async () => {
            disconnect();
            await connect();
        };

        const connect = async () => {
            port = adguard.runtime.connectNative(NATIVE_HOST_NAME);
            port.onMessage.addListener(appStateHandler);
            const initResponse = await makeInitRequest();
            const { parameters } = initResponse;
            nativeHostApiVersion = parameters.apiVersion;
            isValidatedOnHost = parameters.isValidatedOnHost;
            port.onDisconnect.addListener(reconnect);
        };

        const disconnect = () => {
            if (!port) {
                return;
            }
            port.onMessage.removeListener(appStateHandler);
            port.disconnect();
            log.info('Extension has disconnected from application');
        };


        // initialize, connect to native host api
        connect().then(() => {
            log.info('native host api initialized');
        });

        // TODO expose methods with ability to call host api
        return {

        };
    })();
})(adguard);
