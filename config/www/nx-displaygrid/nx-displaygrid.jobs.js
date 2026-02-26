/* nx-displaygrid - persistent mutation jobs
 * SPDX-License-Identifier: MIT
 */
import {
    makeScopedKey,
    readJsonLocal,
    writeJsonLocal,
    removeLocalKey,
} from './util/scoped-storage.util.js';

const JOB_QUEUE_MAX_ATTEMPTS = 5;
const JOB_QUEUE_RETRY_BASE_MS = 1_000;
const JOB_QUEUE_RETRY_CAP_MS = 15_000;
const MUTATION_JOB_TYPE_SERVICE = 'service';
const MUTATION_JOB_TYPE_WS = 'ws';

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cloneJsonSafe(value, fallback = {}) {
    try {
        const text = JSON.stringify(value);
        if (!text) return asObject(fallback);
        return asObject(JSON.parse(text));
    } catch {
        return asObject(fallback);
    }
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function applyJobs(FamilyBoardCard) {
    Object.assign(FamilyBoardCard.prototype, {
        _mutationHass() {
            const hass = this._hass;
            if (!hass || typeof hass !== 'object') return hass;
            if (this._mutationHassSource === hass && this._mutationHassProxy) {
                return this._mutationHassProxy;
            }
            const card = this;
            this._mutationHassSource = hass;
            this._mutationHassProxy = new Proxy(hass, {
                get(target, prop, receiver) {
                    if (prop === 'queueCallService') {
                        return (domain, service, serviceData = {}, options = {}) =>
                            card._queueCallService(domain, service, serviceData, options);
                    }
                    if (prop === 'queueCallWs') {
                        return (message, options = {}) => card._queueCallWs(message, options);
                    }
                    return Reflect.get(target, prop, receiver);
                },
            });
            return this._mutationHassProxy;
        },

        _mutationJobQueueKey() {
            const userId = this._hass?.user?.id || 'unknown';
            return makeScopedKey('nx-displaygrid:mutation-jobs', userId);
        },

        _loadMutationJobQueue() {
            const raw = readJsonLocal(this._mutationJobQueueKey(), []);
            const list = Array.isArray(raw) ? raw : [];
            return list
                .map((job) => {
                    if (!job || typeof job !== 'object') return null;
                    const attemptsRaw = Number(job.attempts || 0);
                    const attempts =
                        Number.isFinite(attemptsRaw) && attemptsRaw > 0 ? Math.trunc(attemptsRaw) : 0;
                    const jobTypeRaw = String(job.jobType || '').trim().toLowerCase();
                    const jobType =
                        jobTypeRaw === MUTATION_JOB_TYPE_WS
                            ? MUTATION_JOB_TYPE_WS
                            : MUTATION_JOB_TYPE_SERVICE;
                    if (jobType === MUTATION_JOB_TYPE_WS) {
                        const wsMessage = cloneJsonSafe(job.wsMessage, {});
                        const wsType = String(wsMessage.type || '').trim();
                        if (!wsType) return null;
                        const defaultLabel = `ws:${wsType}`;
                        return {
                            id: String(job.id || `job_${Date.now().toString(36)}`),
                            jobType,
                            wsMessage,
                            label: String(job.label || defaultLabel).trim() || defaultLabel,
                            attempts,
                            createdAt: Number(job.createdAt || Date.now()),
                            updatedAt: Number(job.updatedAt || Date.now()),
                            lastError: String(job.lastError || ''),
                        };
                    }
                    const domain = String(job.domain || '').trim();
                    const service = String(job.service || '').trim();
                    if (!domain || !service) return null;
                    const defaultLabel = `${domain}.${service}`;
                    return {
                        id: String(job.id || `job_${Date.now().toString(36)}`),
                        jobType,
                        domain,
                        service,
                        serviceData: cloneJsonSafe(job.serviceData, {}),
                        label: String(job.label || defaultLabel).trim() || defaultLabel,
                        attempts,
                        createdAt: Number(job.createdAt || Date.now()),
                        updatedAt: Number(job.updatedAt || Date.now()),
                        lastError: String(job.lastError || ''),
                    };
                })
                .filter(Boolean);
        },

        _saveMutationJobQueue(queue) {
            const list = Array.isArray(queue) ? queue : [];
            if (!list.length) {
                removeLocalKey(this._mutationJobQueueKey());
                return;
            }
            writeJsonLocal(this._mutationJobQueueKey(), list);
        },

        _mutationJobQueueState() {
            const key = this._mutationJobQueueKey();
            if (this._mutationJobQueueKeyCached !== key || !Array.isArray(this._mutationJobQueue)) {
                this._mutationJobQueueKeyCached = key;
                this._mutationJobQueue = this._loadMutationJobQueue();
            }
            return this._mutationJobQueue;
        },

        _persistMutationJobQueueState() {
            this._saveMutationJobQueue(this._mutationJobQueueState());
        },

        _resolveMutationJobWaiter(jobId, value) {
            const waiters =
                this._mutationJobWaiters && this._mutationJobWaiters instanceof Map
                    ? this._mutationJobWaiters
                    : null;
            if (!waiters) return;
            const waiter = waiters.get(jobId);
            if (!waiter) return;
            waiters.delete(jobId);
            try {
                waiter.resolve(value);
            } catch {
                // no-op
            }
        },

        _rejectMutationJobWaiter(jobId, error) {
            const waiters =
                this._mutationJobWaiters && this._mutationJobWaiters instanceof Map
                    ? this._mutationJobWaiters
                    : null;
            if (!waiters) return;
            const waiter = waiters.get(jobId);
            if (!waiter) return;
            waiters.delete(jobId);
            try {
                waiter.reject(error);
            } catch {
                // no-op
            }
        },

        _queueCallService(domain, service, serviceData = {}, options = {}) {
            const safeDomain = String(domain || '').trim();
            const safeService = String(service || '').trim();
            if (!safeDomain || !safeService) {
                return Promise.reject(new Error('Missing service domain or service name'));
            }
            const queue = this._mutationJobQueueState();
            const label =
                String(options?.label || `${safeDomain}.${safeService}`).trim() ||
                `${safeDomain}.${safeService}`;
            const job = {
                id: `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
                jobType: MUTATION_JOB_TYPE_SERVICE,
                domain: safeDomain,
                service: safeService,
                serviceData: cloneJsonSafe(serviceData, {}),
                label,
                attempts: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastError: '',
            };
            queue.push(job);
            this._persistMutationJobQueueState();
            if (!this._mutationJobWaiters || !(this._mutationJobWaiters instanceof Map)) {
                this._mutationJobWaiters = new Map();
            }
            const promise = new Promise((resolve, reject) => {
                this._mutationJobWaiters.set(job.id, { resolve, reject });
            });
            this._processMutationJobQueue();
            return promise;
        },

        _queueCallWs(message = {}, options = {}) {
            const wsMessage = cloneJsonSafe(message, {});
            const wsType = String(wsMessage.type || '').trim();
            if (!wsType) {
                return Promise.reject(new Error('Missing websocket message type'));
            }
            const queue = this._mutationJobQueueState();
            const label = String(options?.label || `ws:${wsType}`).trim() || `ws:${wsType}`;
            const job = {
                id: `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
                jobType: MUTATION_JOB_TYPE_WS,
                wsMessage,
                label,
                attempts: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastError: '',
            };
            queue.push(job);
            this._persistMutationJobQueueState();
            if (!this._mutationJobWaiters || !(this._mutationJobWaiters instanceof Map)) {
                this._mutationJobWaiters = new Map();
            }
            const promise = new Promise((resolve, reject) => {
                this._mutationJobWaiters.set(job.id, { resolve, reject });
            });
            this._processMutationJobQueue();
            return promise;
        },

        _resumeMutationJobQueue() {
            const queue = this._mutationJobQueueState();
            if (!queue.length) return;
            this._processMutationJobQueue();
        },

        _processMutationJobQueue() {
            if (this._mutationJobQueueRunning) {
                return this._mutationJobQueueWorker || Promise.resolve();
            }
            this._mutationJobQueueRunning = true;
            this._mutationJobQueueWorker = (async () => {
                while (true) {
                    const queue = this._mutationJobQueueState();
                    const job = queue[0];
                    if (!job) break;
                    if (!this._hass || typeof this._hass.callService !== 'function') break;
                    try {
                        if (job.jobType === MUTATION_JOB_TYPE_WS) {
                            if (typeof this._hass.callWS !== 'function') {
                                throw new Error('Websocket API unavailable');
                            }
                            await this._hass.callWS(job.wsMessage || {});
                        } else {
                            await this._hass.callService(job.domain, job.service, job.serviceData || {});
                        }
                        queue.shift();
                        this._persistMutationJobQueueState();
                        this._resolveMutationJobWaiter(job.id, true);
                    } catch (error) {
                        const attempts = Number(job.attempts || 0) + 1;
                        job.attempts = attempts;
                        job.updatedAt = Date.now();
                        job.lastError = String(error?.message || error || 'Unknown error');
                        if (attempts >= JOB_QUEUE_MAX_ATTEMPTS) {
                            queue.shift();
                            this._persistMutationJobQueueState();
                            this._rejectMutationJobWaiter(job.id, error);
                            this._showToast?.(
                                'Action failed',
                                `${job.label} failed after ${JOB_QUEUE_MAX_ATTEMPTS} attempts`
                            );
                            this._reportError?.('Mutation queue', error);
                        } else {
                            this._persistMutationJobQueueState();
                            const retryDelay = Math.min(
                                JOB_QUEUE_RETRY_CAP_MS,
                                JOB_QUEUE_RETRY_BASE_MS * 2 ** (attempts - 1)
                            );
                            await delay(retryDelay);
                        }
                    }
                }
            })().finally(() => {
                this._mutationJobQueueRunning = false;
                this._mutationJobQueueWorker = null;
            });
            return this._mutationJobQueueWorker;
        },
    });
}
