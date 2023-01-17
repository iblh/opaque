<script>
    // @ts-nocheck

    export let tree;
    let branches = tree.branches;

    import { flip } from 'svelte/animate';
    import { dndzone } from 'svelte-dnd-action';
    const flipDurationMs = 200;

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
    use:dndzone={{ items: branches, flipDurationMs, type: 'columns' }}
    on:consider={handleDndConsiderColumns}
    on:finalize={handleDndFinalizeColumns}
>
    {#each branches as branch (branch.id)}
        <div class="branch" animate:flip={{ duration: flipDurationMs }}>
            <div class="branch-name">{branch.name}</div>
            <div
                class="branch-leaves"
                use:dndzone={{ items: branch.leaves, flipDurationMs }}
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
            </div>
        </div>
    {/each}
</div>
