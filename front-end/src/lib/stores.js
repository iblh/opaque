import { writable } from 'svelte/store';

const StoreOnAir = writable();
const StoreTune = writable({ show: false, config: {}, forest: {} });
const StoreKomorebi = writable({ id: '', name: '', url: '', icon: '' });

export { StoreOnAir, StoreTune, StoreKomorebi };
