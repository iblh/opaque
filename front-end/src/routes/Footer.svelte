<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { StoreSettings } from '$lib/stores.js';

    // handleLogout
    export async function handleLogout() {
        document.cookie = `jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        goto('/login');
    }

    // handleSettings
    export async function handleSettings() {
        StoreSettings.set({ show: true });
    }
    
    // TODO: show "save", "cancel" when settings.show == true
</script>

<footer>
    <!-- logout -->
    {#if $page.url.pathname == '/'}
        <button id="settings" on:click={handleSettings}>settings</button>
        <button id="logout" on:click={handleLogout}>logout</button>
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
        font-size: 12px;
        margin: 7px 0;
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
