<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';

    // handleLogout
    export async function handleLogout() {
        document.cookie = `jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        goto('/login');
    }
</script>

<footer>
    <!-- logout -->
    {#if $page.url.pathname == '/'}
        <button id="settings">settings</button>
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
