import { writable } from 'svelte/store';

const storeTune = writable({
    show: false,
    config: {},
});

export { storeTune };
