<script>
    // @ts-nocheck

    export let tree;
    let branches = tree.branches;

    import { flip } from 'svelte/animate';
    import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
    const flipDurationMs = 200;

    import { StoreSettings, StoreKomorebi } from '$lib/stores.js';
    let settings;
    let branchDragDisabled = true;
    let leafDragDisabled = true;
    let hoveredBranchId = null;

    StoreSettings.subscribe((value) => {
        settings = value;
        leafDragDisabled = !value.show;
    });

    function handleDndConsiderColumns(e) {
        // console.log('consider', e.detail);
        branches = e.detail.items;

        // Ensure dragging is stopped on drag finish via keyboard
        if (
            e.detail.info.source === SOURCES.KEYBOARD &&
            e.detail.info.trigger === TRIGGERS.DRAG_STOPPED
        ) {
            branchDragDisabled = true;
        }
    }
    function handleDndFinalizeColumns(e) {
        // console.log('finalize', e.detail);
        branches = e.detail.items;

        // Ensure dragging is stopped on drag finish via pointer (mouse, touch)
        if (e.detail.info.source === SOURCES.POINTER) {
            branchDragDisabled = true;
        }
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
    
    function handleClick(e, leaf) {
        if (!settings.show) return;
        const rect = e.currentTarget.getBoundingClientRect();

        // set #komorebi to the position of the rect
        const komorebi = document.getElementById('komorebi');
        komorebi.style.left = Math.round(rect.left + 30) + 'px';
        komorebi.style.top = Math.round(rect.top) + 'px';
        komorebi.style.width = Math.round(rect.width - 30) + 'px';
        komorebi.style.display = 'flex';

        StoreKomorebi.set(leaf);
    }

    // functions for drag handle
    function startDrag(e) {
        // preventing default to prevent lag on touch devices (because of the browser checking for screen scrolling)
        e.preventDefault();

        // prevent branch dragging if the leaf is not active
        if (!leafDragDisabled) branchDragDisabled = false;
    }
    function handleKeyDown(e) {
        if ((e.key === 'Enter' || e.key === ' ') && branchDragDisabled) branchDragDisabled = false;
    }
</script>

<div
    class="trunk"
    use:dndzone={{
        items: branches,
        flipDurationMs,
        type: 'columns',
        dragDisabled: branchDragDisabled,
        dropTargetStyle: {},
    }}
    on:consider={handleDndConsiderColumns}
    on:finalize={handleDndFinalizeColumns}
>
    {#each branches as branch (branch.id)}
        <div
            class="branch"
            class:pruning-branch={settings.show}
            class:active={hoveredBranchId === branch.id}
            animate:flip={{ duration: flipDurationMs }}
        >
            <div
                class="branch-name"
                aria-label="drag-handle"
                on:mousedown={startDrag}
                on:touchstart={startDrag}
                on:keydown={handleKeyDown}
                on:mouseenter={() => (hoveredBranchId = branch.id)}
                on:mouseleave={() => (hoveredBranchId = null)}
            >
                {branch.name}
            </div>
            <div
                class="branch-leaves"
                use:dndzone={{
                    items: branch.leaves,
                    flipDurationMs,
                    dragDisabled: leafDragDisabled,
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
                        on:click={(e) => handleClick(e, leaf)}
                    >
                        <div class="leaf-bm-icon">
                            {@html leaf.icon}
                        </div>
                        <div class="leaf-bm-name">
                            {leaf.name}
                        </div>
                    </div>
                {/each}
            </div>
            <div class="leaf bud {settings.show ? 'show-bud' : ''}">
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
    {/each}
</div>
