<script>
    import Counter from './Counter.svelte';

    /** @type {import('./$types').PageData} */
    export let data;

    console.log(data);
</script>

<svelte:head>
    <title>OPAQUE</title>
    <meta name="description" content="OPAQUE" />
</svelte:head>

<div id="nav">
    <!-- search -->
    <input id="search" type="text" placeholder="search" />

    <!-- <Counter /> -->
</div>
<div id="dashboard">
    {#each data.dashboard.content as item}
        <div class="section">
            <div class="sec-title">{item.root}</div>

            <!-- if root is bookmarks, loop -->
            {#if item.root === 'bookmarks'}
                {#each item.branches as branch}
                    <div class="branch">{branch.name}</div>
                {/each}
            {/if}

            {#if item.root === 'applications'}
                {#each item.branches as branch}
                    <div class="branch">{branch.name}</div>
                {/each}
            {/if}

            {#if item.root === 'servers'}
                {#each item.leaves as leaf}
                    <div class="leaf">{leaf.name}</div>
                {/each}
            {/if}
        </div>
    {/each}
</div>

<style>
    #nav {
        display: flex;
    }
    #search {
        all: unset;
        width: 100%;
        height: 30px;
        border-bottom: 1px solid #ccc;
        padding: 0 10px;
    }

    .section {
        display: flex;
        flex-direction: row;
        margin: 10px 0;
    }
</style>
