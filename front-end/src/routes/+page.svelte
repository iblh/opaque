<script>
    import { mdiAccount } from '@mdi/js';
    // import Counter from './Counter.svelte';
    // console.log(mdiAccount);

    import { goto } from '$app/navigation';

    /** @type {import('./$types').PageData} */
    export let data;

    console.log(data);

    // handleLogout
    export async function handleLogout() {
        document.cookie = `jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        goto('/login');
    }
</script>

<svelte:head>
    <title>OPAQUE</title>
    <meta name="description" content="OPAQUE" />
</svelte:head>

<div id="nav">
    <!-- search -->
    <input id="search" type="text" placeholder="search" />

    <!-- <Counter /> -->

    <!-- logout -->
    <button id="logout" on:click={handleLogout}>logout</button>
</div>
<div id="dashboard">
    <!-- {#each data.dashboard.content as item}
        <div class="branches">
            {#if item.root === 'bookmarks'}
                {#each item.branches as branch}
                    <div class="branch">
                        <div class="branch-name">{branch.name}</div>
                        {#each branch.leaves as leaf}
                            <div class="leaf">{leaf.name}</div>
                        {/each}
                    </div>
                {/each}
            {/if}

            {#if item.root === 'applications'}
                {#each item.branches as branch}
                    <div class="branch">
                        <div class="branch-name">{branch.name}</div>
                        {#each branch.leaves as leaf}
                            <div class="leaf">{leaf.name}</div>
                        {/each}
                    </div>
                {/each}
            {/if}

            {#if item.root === 'servers'}
                {#each item.leaves as leaf}
                    <div class="branch">{leaf.name}</div>
                {/each}
            {/if}
        </div>
    {/each} -->
    {#each data.dashboard.content as item}
        <div class="tree">
            <div class="root">{item.root}</div>

            <div class="trunk">
                {#if item.root === 'bookmarks'}
                    {#each item.branches as branch}
                        <div class="branch">
                            <div class="twig">{branch.name}</div>
                            {#each branch.leaves as leaf}
                                <div class="leaf">
                                    <span class="mdi mdi-cube" />
                                    {leaf.name}
                                </div>
                            {/each}
                        </div>
                    {/each}
                {/if}

                {#if item.root === 'applications'}
                    {#each item.branches as branch}
                        <div class="branch">
                            <div class="twig">{branch.name}</div>
                            {#each branch.leaves as leaf}
                                <div class="leaf">{leaf.name}</div>
                            {/each}
                        </div>
                    {/each}
                {/if}

                {#if item.root === 'servers'}
                    {#each item.leaves as leaf}
                        <div class="branch">
                            <div class="twig">{leaf.name}</div>
                        </div>
                    {/each}
                {/if}
            </div>

            <div class="placeholder" />
        </div>
    {/each}
</div>

<style>
    #nav {
        display: flex;
        justify-content: space-between;
        padding: 28px 0;
    }

    #logout {
        all: unset;
        cursor: pointer;
        color: #ccc;
    }

    #logout:hover {
        color: #666;
        text-decoration: underline;
    }

    #search {
        all: unset;
        height: 30px;
        border-bottom: 1px solid #ccc;
        width: 200px;
    }

    #dashboard {
        display: flex;
        box-sizing: border-box;
        flex-direction: column;
        padding: 28px 0;
    }

    .placeholder {
        width: 200px;
    }

    .root {
        width: 200px;
        display: flex;
        justify-content: flex-end;
        text-transform: uppercase;
        font-weight: bold;
        color: #666;
    }

    .tree {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        margin: 10px 0;
    }

    .trunk {
        width: calc(100% - 200px);
        max-width: 1440px;
        padding: 0 20px;
        display: grid;
        box-sizing: border-box;
        grid-template-columns: repeat(4, 1fr);
    }

    .branch {
        margin-bottom: 42px;
    }

    .twig {
        font-weight: bold;
        color: #333;
        margin-bottom: 21px;
    }
</style>
