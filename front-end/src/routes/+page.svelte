<script>
    import { mdiAccount } from '@mdi/js';
    import logo from '$lib/images/favicon-32x32.png';
    // console.log(mdiAccount);

    /** @type {import('./$types').PageData} */
    export let data;

    console.log(data);
</script>

<svelte:head>
    <title>OPAGUE</title>
    <meta name="description" content="OPAQUE" />
</svelte:head>

<div id="dashboard">
    {#each data.dashboard.content as item}
        <div class="tree">
            <div class="root">{item.root}</div>

            <div class="trunk">
                {#if item.root === 'bookmarks'}
                    {#each item.branches as branch}
                        <div class="branch">
                            <div class="branch-name">{branch.name}</div>
                            {#each branch.leaves as leaf}
                                <div class="leaf">
                                    <div class="leaf-bm-icon">
                                        {@html leaf.icon}
                                    </div>
                                    <div class="leaf-bm-name">
                                        {leaf.name}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/each}
                {/if}

                {#if item.root === 'applications'}
                    {#each item.branches as branch}
                        <div class="branch">
                            <div class="branch-name">{branch.name}</div>
                            {#each branch.leaves as leaf}
                                <div class="leaf ">
                                    <div class="leaf-app-icon">
                                        {@html leaf.icon}
                                    </div>
                                    <div class="leaf-app-info">
                                        <div class="leaf-app-name">
                                            {leaf.name}
                                        </div>
                                        <div class="leaf-app-url">
                                            <!-- remove protocol -->
                                            {leaf.url.replace(/(^\w+:|^)\/\//, '')}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/each}
                {/if}

                {#if item.root === 'servers'}
                    {#each item.twigs as twig}
                        <div class="twig">
                            <div class="twig-icon">
                                {@html twig.icon}
                            </div>
                            <div class="twig-info">
                                <div class="twig-name">
                                    {twig.name}
                                </div>

                                <div class="twig-url">
                                    <!-- remove protocol -->
                                    {twig.url.replace(/(^\w+:|^)\/\//, '')}
                                </div>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>

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
        padding: 0 35px;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
    }

    .branch {
        padding: 0 14px;
        margin: 0 7px;
        margin-bottom: 42px;
    }

    .branch-name {
        font-weight: bold;
        color: #333;
        margin-bottom: 21px;
    }

    .leaf {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        cursor: pointer;
    }

    .leaf .leaf-bm-icon {
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .leaf .leaf-bm-name {
        font-size: 14px;
        margin-left: 6px;
    }

    .leaf .leaf-app-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .leaf .leaf-app-info {
        margin-left: 12px;
    }

    .leaf .leaf-app-name {
        font-size: 14px;
    }

    .leaf .leaf-app-url {
        font-size: 12px;
        color: #aaa;
        margin-top: 2px;
    }

    .twig {
        padding: 0 14px;
        margin: 0 7px;
        margin-bottom: 42px;
        display: flex;
    }

    .twig .twig-icon {
        width: 35px;
        height: 35px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .twig .twig-info {
        margin-left: 13px;
    }

    .twig .twig-name {
        font-weight: bold;
    }

    .twig .twig-url {
        font-size: 14px;
        color: #aaa;
        margin-top: 2px;
    }

    .pruning-branch {
        cursor: crosshair;
        box-shadow: 0px 0px 10px 0px #efead8;
    }

    .pruning-branch .branch-name {
        cursor: pointer;
    }

    .shaking-leaves:hover {
        /* text-decoration: underline; */
        /* position: relative; */
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
