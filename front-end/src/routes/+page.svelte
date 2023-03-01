<script>
    // @ts-nocheck

    import logo from '$lib/images/favicon-32x32.png';

    import TrunkBookmark from './components/Trunk/TrunkBookmark.svelte';
    import TrunkApplication from './components/Trunk/TrunkApplication.svelte';
    import TrunkServer from './components/Trunk/TrunkServer.svelte';
    import Tune from './Tune.svelte';
    import './components/components.css';

    /** @type {import('./$types').PageData} */
    export let data;

    console.log(data);
    let mirage = structuredClone(data);

    const trunkmapping = {
        bookmarks: TrunkBookmark,
        applications: TrunkApplication,
        servers: TrunkServer,
    };
</script>

<svelte:head>
    <title>OPAGUE</title>
    <meta name="description" content="OPAQUE" />
</svelte:head>

<div id="dashboard">
    {#each data.dashboard.forest as tree}
        <div class="tree">
            <div class="root">{tree.root}</div>

            <svelte:component this={trunkmapping[tree.root]} bind:tree />

            <div class="placeholder" />
        </div>
    {/each}
    <!-- <button
        on:click={() => {
            console.log(data.dashboard.forest[0].branches);
            console.log(mirage.dashboard.forest[0].branches);
            data = structuredClone(mirage);
        }}
        >reset
    </button> -->
</div>
<Tune bind:data bind:mirage/>

<style>
    #dashboard {
        display: flex;
        flex-direction: column;
        padding: 28px 0;
    }

    .placeholder {
        width: 200px;
    }

    .root {
        width: 200px;
        padding: 7px 0;
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
</style>
