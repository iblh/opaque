import { writable } from 'svelte/store';

const StoreOnAir = writable({ forest: {}, config: {} });
const StoreSettings = writable({ show: false, forest: {}, config: {} });
const StoreKomorebi = writable({ name: '', url: '', icon: '' });

export { StoreOnAir, StoreSettings, StoreKomorebi };
