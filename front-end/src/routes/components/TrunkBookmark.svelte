<script>
    // @ts-nocheck

    // export let mirage;
    export let tree;
    // let branches = tree.branches;

    import { flip } from 'svelte/animate';
    import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
    const flipDurationMs = 200;

    import { StoreTune, StoreKomorebi } from '$lib/stores.js';
    let settings;
    let branchDragDisabled = true;
    let leafDragDisabled = true;
    let hoveredBranchId = null;

    StoreTune.subscribe((value) => {
        settings = value;
        leafDragDisabled = !value.show;
    });

    function handleDndConsiderColumns(e) {
        tree.branches = e.detail.items;

        // Ensure dragging is stopped on drag finish via keyboard
        if (
            e.detail.info.source === SOURCES.KEYBOARD &&
            e.detail.info.trigger === TRIGGERS.DRAG_STOPPED
        ) {
            branchDragDisabled = true;
        }
    }

    function handleDndFinalizeColumns(e) {
        tree.branches = e.detail.items;

        // Ensure dragging is stopped on drag finish via pointer (mouse, touch)
        if (e.detail.info.source === SOURCES.POINTER) {
            branchDragDisabled = true;
        }
    }
    function handleDndConsiderCards(branchId, e) {
        const colIdx = tree.branches.findIndex((c) => c.id === branchId);
        tree.branches[colIdx].leaves = e.detail.items;
        // branches = [...branches];
    }
    function handleDndFinalizeCards(branchId, e) {
        const colIdx = tree.branches.findIndex((c) => c.id === branchId);
        tree.branches[colIdx].leaves = e.detail.items;
        // branches = [...branches];
    }

    function handleClick(e, leaf) {
        if (settings.show) {
            const rect = e.currentTarget.getBoundingClientRect();

            // set #komorebi to the position of the rect
            const komorebi = document.getElementById('komorebi');
            komorebi.style.left = Math.round(rect.left + 30) + 'px';
            komorebi.style.top = Math.round(rect.top) + 'px';
            komorebi.style.width = Math.round(rect.width - 30) + 'px';
            komorebi.style.display = 'flex';

            console.log(leaf);
            let _leaf = { ...leaf };
            StoreKomorebi.set(_leaf);
        } else {
            return;
        }
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
        items: tree.branches,
        flipDurationMs,
        type: 'columns',
        dragDisabled: branchDragDisabled,
        dropTargetStyle: {},
    }}
    on:consider={handleDndConsiderColumns}
    on:finalize={handleDndFinalizeColumns}
>
    {#each tree.branches as branch (branch.id)}
        <div
            class="branch"
            class:pruning-branch={settings.show}
            class:hovered={hoveredBranchId === branch.id}
            id={branch.id}
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
                    <svelte:element
                        this={settings.show ? 'div' : 'a'}
                        id={leaf.id}
                        class="leaf"
                        href={leaf.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        animate:flip={{ duration: flipDurationMs }}
                        on:click={(e) => handleClick(e, leaf)}
                        on:keydown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') handleClick(e, leaf);
                        }}
                    >
                        <div class="leaf-bm-icon">
                            {@html leaf.icon}
                        </div>
                        <div class="leaf-bm-name">
                            {leaf.name}
                        </div>
                    </svelte:element>
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
