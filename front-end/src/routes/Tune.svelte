<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { StoreTune } from '$lib/stores.js';

    /**
     * @type {{ show: boolean; config: object; }}
     */
    let settings;
    StoreTune.subscribe((value) => {
        settings = value;
    });

    // handleLogout
    export async function handleLogout() {
        document.cookie = `jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        goto('/login');
    }

    // openSettings
    export async function openSettings() {
        StoreTune.set({ show: true, config: {} });
    }

    export async function saveSettings() {
        StoreTune.set({
            show: false,
            config: {},
        });
    }

    export async function cancelSettings() {
        StoreTune.set({
            show: false,
            config: {},
        });
    }
</script>

<div id="tune">
    {#if $page.url.pathname == '/'}
        {#if !settings.show}
            <button id="settings" on:click={openSettings}>settings</button>
        {/if}
        {#if settings.show}
            <button id="logout" on:click={handleLogout}>logout</button>
            <button id="cancel" on:click={cancelSettings}>cancel</button>
            <button id="save" on:click={saveSettings}>save</button>
        {/if}
    {/if}
</div>

<style>
    #tune {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-end;
        height: 100%;
    }
    #tune button {
        all: unset;
        cursor: pointer;
        color: #666;
        margin: 7px 0;
    }

    #tune button:hover {
        color: #333;
        text-decoration: underline;
    }
</style>
