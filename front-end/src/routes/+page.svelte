<script>
    // @ts-nocheck

    import { mdiAccount } from '@mdi/js';
    import logo from '$lib/images/favicon-32x32.png';
    // console.log(mdiAccount);

    import TrunkBookmark from './components/TrunkBookmark.svelte';
    import TrunkApplication from './components/TrunkApplication.svelte';
    import TrunkServer from './components/TrunkServer.svelte';
    import './components/components.css';

    /** @type {import('./$types').PageData} */
    export let data;

    console.log(data);

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
    {#each data.dashboard.content as tree}
        <div class="tree">
            <div class="root">{tree.root}</div>

            <svelte:component this={trunkmapping[tree.root]} {tree} />

            <div class="placeholder" />
        </div>
    {/each}
</div>

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

    /* .shaking-leaves::after {
        content: '';
        position: absolute;
        width: 100%;
        transform: scaleX(0);
        height: 2px;
        bottom: -2px;
        left: 0;
        background-color: var(--color-accent-2);
        transform-origin: bottom right;
        transition: transform 0.25s ease-out;
    }

    .shaking-leaves:hover::after {
        transform: scaleX(1);
        transform-origin: bottom left;
    } */
</style>
