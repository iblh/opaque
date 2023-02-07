import { writable } from 'svelte/store';

const StoreSettings = writable({ show: false });
const StoreKomorebi = writable({name: '', url: '', icon: ''});

export { StoreSettings, StoreKomorebi };