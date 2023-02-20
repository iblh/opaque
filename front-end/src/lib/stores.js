import { writable } from 'svelte/store';

const StoreOnAir = writable({ forest: {}, config: {} });
const StoreSettings = writable({ show: false, config: {} });
const StoreKomorebi = writable({ id: '', name: '', url: '', icon: '' });

export { StoreOnAir, StoreSettings, StoreKomorebi };
