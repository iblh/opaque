<script>
    // @ts-nocheck

	import { get } from 'svelte/store'
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { StoreOnAir, StoreSettings } from '$lib/stores.js';

    let settings;
    StoreSettings.subscribe((value) => {
        settings = value;
    });

    // handleLogout
    export async function handleLogout() {
        document.cookie = `jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        goto('/login');
    }

    // openSettings
    export async function openSettings() {
        const onair = get(StoreOnAir);
        StoreSettings.set({ show: true, config: onair.config });
    }

    export async function saveSettings() {
        StoreSettings.set({ show: false });
    }

    export async function cancelSettings() {
        StoreSettings.set({ show: false });
    }
</script>

<footer>
    {#if $page.url.pathname == '/'}
        {#if !settings.show}
            <button id="settings" on:click={openSettings}>settings</button>
            <button id="logout" on:click={handleLogout}>logout</button>
        {/if}
        {#if settings.show}
            <button id="save" on:click={saveSettings}>save</button>
            <button id="cancel" on:click={cancelSettings}>cancel</button>
        {/if}
    {/if}
    <p id="copyright">© OPAGUE</p>
</footer>

<style>
    footer {
        display: flex;
        flex: 1;
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-end;
        padding: 28px;
    }

    #copyright {
        font-size: 14px;
        margin: 7px 0;
        cursor: default;
    }

    footer button {
        all: unset;
        cursor: pointer;
        color: #666;
        margin: 7px 0;
    }

    footer button:hover {
        color: #333;
        text-decoration: underline;
    }
</style>
