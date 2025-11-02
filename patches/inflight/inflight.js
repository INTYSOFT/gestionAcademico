'use strict';

const once = require('once');
const wrappy = require('wrappy');

const pending = new Map();

module.exports = wrappy(inflight);

function inflight(key, cb) {
    if (typeof key !== 'string' || key.length === 0) {
        throw new TypeError('inflight key must be a non-empty string');
    }

    if (typeof cb !== 'function') {
        throw new TypeError('inflight callback must be a function');
    }

    const entry = pending.get(key);

    if (entry) {
        if (entry.result !== null && entry.processing === false) {
            schedule(() => cb.apply(null, entry.result));
            return null;
        }

        entry.callbacks.push(cb);
        return null;
    }

    const newEntry = {
        callbacks: [cb],
        processing: false,
        result: null,
        resolver: null,
    };

    newEntry.resolver = createResolver(key, newEntry);
    pending.set(key, newEntry);

    return newEntry.resolver;
}

function createResolver(key, entry) {
    return once(function resolve() {
        entry.result = slice(arguments);

        if (entry.processing) {
            return;
        }

        entry.processing = true;

        try {
            while (entry.callbacks.length > 0) {
                const fn = entry.callbacks.shift();

                try {
                    fn.apply(null, entry.result);
                } catch (error) {
                    schedule(() => {
                        throw error;
                    });
                }
            }
        } finally {
            entry.processing = false;
            entry.result = null;
            entry.callbacks.length = 0;
            pending.delete(key);
        }
    });
}

function slice(args) {
    const length = args.length;
    const array = new Array(length);

    for (let index = 0; index < length; index++) {
        array[index] = args[index];
    }

    return array;
}

const schedule =
    typeof queueMicrotask === 'function'
        ? queueMicrotask
        : (cb) => process.nextTick(cb);
