import { writable } from 'svelte/store';

const StoreTune = writable({ show: false, config: {} });
const StoreKomorebi = writable({ id: '', name: '', url: '', icon: '' });

export { StoreTune, StoreKomorebi };
