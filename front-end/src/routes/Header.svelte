<script>
    import { page } from '$app/stores';
    import logo from '$lib/images/favicon-32x32.png';
    import github from '$lib/images/github.svg';
</script>

<header>
    {#if $page.url.pathname === '/login'}
        <!-- <img src={logo} alt="logo" /> -->
        <div id="logo">OPAGUE</div>
    {/if}
    {#if $page.url.pathname == '/'}
        <nav>
            <!-- search -->
            <input id="search" type="text" placeholder="OPAGUE" autocomplete="off" />
        </nav>
    {/if}
</header>

<style>
    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 28px;
    }

    #search {
        all: unset;
        height: 30px;
        border-bottom: 1px solid #ccc;
        width: 200px;
    }
</style>
