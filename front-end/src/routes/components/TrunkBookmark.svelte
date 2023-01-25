<script>
    // @ts-nocheck

    export let tree;
    let branches = tree.branches;

    import { flip } from 'svelte/animate';
    import { dndzone } from 'svelte-dnd-action';
    const flipDurationMs = 200;

    import { StoreSettings } from '$lib/stores.js';
    let settings;
    let dragDisabled;

    StoreSettings.subscribe((value) => {
        settings = value;
        dragDisabled = !value.show;
    });

    function handleDndConsiderColumns(e) {
        branches = e.detail.items;
    }
    function handleDndFinalizeColumns(e) {
        branches = e.detail.items;
    }
    function handleDndConsiderCards(cid, e) {
        const colIdx = branches.findIndex((c) => c.id === cid);
        branches[colIdx].leaves = e.detail.items;
        branches = [...branches];
    }
    function handleDndFinalizeCards(cid, e) {
        const colIdx = branches.findIndex((c) => c.id === cid);
        branches[colIdx].leaves = e.detail.items;
        branches = [...branches];
    }
    function handleClick(e) {
        alert('dragabble elements are still clickable :)');
    }
</script>

<div
    class="trunk"
    use:dndzone={{
        items: branches,
        flipDurationMs,
        type: 'columns',
        dragDisabled,
        dropTargetStyle: {},
    }}
    on:consider={handleDndConsiderColumns}
    on:finalize={handleDndFinalizeColumns}
>
    {#each branches as branch (branch.id)}
        <div
            class="branch {settings.show ? 'pruning-branch' : ''}"
            animate:flip={{ duration: flipDurationMs }}
        >
            <div class="branch-name">{branch.name}</div>
            <div
                class="branch-leaves"
                use:dndzone={{
                    items: branch.leaves,
                    flipDurationMs,
                    dragDisabled,
                    dropTargetStyle: {},
                }}
                on:consider={(e) => handleDndConsiderCards(branch.id, e)}
                on:finalize={(e) => handleDndFinalizeCards(branch.id, e)}
            >
                {#each branch.leaves as leaf (leaf.id)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        class="leaf"
                        animate:flip={{ duration: flipDurationMs }}
                        on:click={handleClick}
                    >
                        <div class="leaf-bm-icon">
                            {@html leaf.icon}
                        </div>
                        <div class="leaf-bm-name">
                            {leaf.name}
                        </div>
                    </div>
                {/each}
                <div class="leaf add-leaf {settings.show ? 'show-leaf' : ''}">
                    <div class="leaf-bm-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            ><title>plus</title><path
                                d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"
                            /></svg
                        >
                    </div>
                    <div class="leaf-bm-name" />
                </div>
            </div>
        </div>
    {/each}
</div>
