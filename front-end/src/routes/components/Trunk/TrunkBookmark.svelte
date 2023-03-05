<script>
    // @ts-nocheck

    // export let mirage;
    export let tree;
    // let branches = tree.branches;

    import { flip } from 'svelte/animate';
    import { v4 as uuidv4 } from 'uuid';
    import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
    // import KomorebiBookmark from '../Komorebi/KomorebiBookmark.svelte';
    const flipDurationMs = 200;

    import { storeTune } from '$lib/stores.js';
    let settings;
    // let komorebi = { id: '', name: '', url: '', icon: '' };
    let branchDragDisabled = true;
    let leafDragDisabled = true;
    let hoveredBranchId = null;
    let editingBranchId = null;
    let hoveredLeafId = null;
    let editingLeafId = null;
    let tempBranchName = '';

    storeTune.subscribe((value) => {
        settings = value;
        leafDragDisabled = !value.show;
    });

    function handleDndConsiderColumns(event) {
        tree.branches = event.detail.items;

        // Ensure dragging is stopped on drag finish via keyboard
        if (
            event.detail.info.source === SOURCES.KEYBOARD &&
            event.detail.info.trigger === TRIGGERS.DRAG_STOPPED
        ) {
            branchDragDisabled = true;
        }
    }

    function handleDndFinalizeColumns(event) {
        tree.branches = event.detail.items;

        // Ensure dragging is stopped on drag finish via pointer (mouse, touch)
        if (event.detail.info.source === SOURCES.POINTER) {
            branchDragDisabled = true;
        }
    }
    function handleDndConsiderCards(branchId, event) {
        const colIdx = tree.branches.findIndex((c) => c.id === branchId);
        tree.branches[colIdx].leaves = event.detail.items;
        tree.branches = [...tree.branches];
    }
    function handleDndFinalizeCards(branchId, event) {
        const colIdx = tree.branches.findIndex((c) => c.id === branchId);
        tree.branches[colIdx].leaves = event.detail.items;
        tree.branches = [...tree.branches];

        // get count of leaves according to branchId
        const count = tree.branches[colIdx].leaves.length;
    }

    function handleLeafClick(event, leaf) {
        if (settings.show) {
            editingLeafId = leaf.id;
            leafDragDisabled = true;

            const elLeaf = document.getElementById(leaf.id);
            const elLeafWrapper = elLeaf.querySelector('.leaf-wrapper');
            const elLeafPlaceholder = elLeaf.querySelector('.leaf-placeholder');

            // elLeaf.style.overflow = 'visible';
            // elLeafWrapper.style.position = 'absolute';
            // elLeafWrapper.style.maxHeight = '144px';
            // elLeafWrapper.style.zIndex = '99';
            // elLeafPlaceholder.style.display = 'block';
        } else {
            return;
        }
    }

    function clickLeafOutside(node) {
        const handleClick = (event) => {
            if (
                node &&
                !node.contains(event.target) &&
                !event.defaultPrevented &&
                node.classList.contains('editing')
            ) {
                node.dispatchEvent(new CustomEvent('leaf_click_outside', node));
            }
        };

        document.addEventListener('mousedown', handleClick, true);

        return {
            destroy() {
                document.removeEventListener('mousedown', handleClick, true);
            },
        };
    }

    function handleCancelLeafEditing(event, leaf) {
        event.preventDefault();
        editingLeafId = null;
        leafDragDisabled = false;

        const elLeaf = document.getElementById(leaf.id);
        const elLeafWrapper = elLeaf.querySelector('.leaf-wrapper');
        const elLeafPlaceholder = elLeaf.querySelector('.leaf-placeholder');

        // elLeafWrapper.style.position = 'relative';
        // elLeafWrapper.style.maxHeight = '21px';
        // elLeafWrapper.style.zIndex = '0';
        // elLeafPlaceholder.style.display = 'none';
    }

    function handleBranchClick(event, branchId, branchName) {
        if (settings.show) {
            editingBranchId = branchId;
            branchDragDisabled = true;
            tempBranchName = branchName;
        }
    }

    // functions for drag handle
    function startDrag(event) {
        // preventing default to prevent lag on touch devices (because of the browser checking for screen scrolling)
        event.preventDefault();

        // prevent branch dragging if the leaf is not active
        if (!leafDragDisabled) branchDragDisabled = false;
    }
    function handleKeyDown(event) {
        if ((event.key === 'Enter' || event.key === ' ') && branchDragDisabled)
            branchDragDisabled = false;
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
    tabindex="-1"
>
    {#each tree.branches as branch (branch.id)}
        <div
            class="branch"
            class:pruning-branch={settings.show}
            class:hovered={settings.show & (hoveredBranchId === branch.id)}
            id={branch.id}
            animate:flip={{ duration: flipDurationMs }}
            tabindex="-1"
        >
            <div
                class="branch-name-wrapper"
                class:editing={settings.show & (editingBranchId === branch.id)}
                aria-label="drag-handle"
                on:mouseenter={() => (hoveredBranchId = branch.id)}
                on:mouseleave={() => (hoveredBranchId = null)}
            >
                <div
                    class="branch-name"
                    on:mousedown={startDrag}
                    on:touchstart={startDrag}
                    on:keydown={handleKeyDown}
                    on:click={(event) => handleBranchClick(event, branch.id, branch.name)}
                >
                    {branch.name}
                </div>
                <input
                    type="text"
                    name="branch-name"
                    class="branch-name-input"
                    bind:value={branch.name}
                    on:mouseleave={() => {
                        editingBranchId = null;
                        if (branch.name === '') branch.name = 'undefined';
                    }}
                    on:keydown={(event) => {
                        if (event.key === 'Enter') {
                            editingBranchId = null;
                            if (branch.name === '') branch.name = 'undefined';
                        } else if (event.key === 'Escape') {
                            editingBranchId = null;
                            branch.name = tempBranchName;
                        }
                    }}
                />
                <div class="line" />
            </div>
            <div
                class="branch-leaves"
                tabindex="-1"
                use:dndzone={{
                    items: branch.leaves,
                    flipDurationMs,
                    dragDisabled: leafDragDisabled,
                    dropTargetStyle: {},
                }}
                on:consider={(event) => handleDndConsiderCards(branch.id, event)}
                on:finalize={(event) => handleDndFinalizeCards(branch.id, event)}
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
                        tabindex="-1"
                    >
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            class="leaf-wrapper"
                            class:hovered={settings.show & (hoveredLeafId === leaf.id)}
                            class:editing={settings.show & (editingLeafId === leaf.id)}
                            use:clickLeafOutside
                            on:click={(event) => handleLeafClick(event, leaf)}
                            on:mouseenter={() => {
                                hoveredLeafId = leaf.id;
                            }}
                            on:mouseleave={() => {
                                hoveredLeafId = null;
                            }}
                            on:leaf_click_outside={(event) => handleCancelLeafEditing(event, leaf)}
                        >
                            <div class="leaf-bm">
                                <div class="leaf-bm-icon">
                                    {@html leaf.icon}
                                </div>
                                <div class="leaf-bm-name">
                                    {leaf.name}
                                </div>
                            </div>
                            <form
                                class="leaf-bm-form"
                                class:displayed={settings.show & (editingLeafId === leaf.id)}
                            >
                                <div class="row">
                                    <div class="icon">
                                        {@html leaf.icon}
                                    </div>
                                    <input
                                        type="text"
                                        class="value"
                                        id="komorebi-name-input"
                                        name="name"
                                        placeholder="Name"
                                        autocomplete="off"
                                        value={leaf.name}
                                    />
                                </div>
                                <div class="row">
                                    <div class="icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                            <path
                                                d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"
                                            />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        class="value"
                                        id="komorebi-url-input"
                                        name="url"
                                        placeholder="URL"
                                        autocomplete="off"
                                        value={leaf.url}
                                    />
                                </div>
                                <div class="row">
                                    <div class="icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                            <path
                                                d="M12.12,18.46L18.3,12.28C16.94,12.59 15.31,13.2 14.07,14.46C13.04,15.5 12.39,16.83 12.12,18.46M20.75,10H21.05C21.44,10 21.79,10.27 21.93,10.64C22.07,11 22,11.43 21.7,11.71L11.7,21.71C11.5,21.9 11.26,22 11,22L10.64,21.93C10.27,21.79 10,21.44 10,21.05C9.84,17.66 10.73,14.96 12.66,13.03C15.5,10.2 19.62,10 20.75,10M12,2C16.5,2 20.34,5 21.58,9.11L20,9H19.42C18.24,6.07 15.36,4 12,4A8,8 0 0,0 4,12C4,15.36 6.07,18.24 9,19.42C8.97,20.13 9,20.85 9.11,21.57C5,20.33 2,16.5 2,12C2,6.47 6.5,2 12,2Z"
                                            />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        class="value"
                                        id="komorebi-icon-input"
                                        name="icon"
                                        placeholder="Icon"
                                        autocomplete="off"
                                        value={leaf.icon}
                                    />
                                </div>
                                <div class="ctrl">
                                    <div class="flex">
                                        <!-- confirm btn -->
                                        <button type="submit" class="btn" id="komorebi-confirm">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
                                                />
                                            </svg>
                                        </button>
                                        <!-- cancel btn -->
                                        <button
                                            class="btn"
                                            id="komorebi-cancel"
                                            style="margin-left: 7px;"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                    <button type="button" class="btn" id="komorebi-delete">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                            <path d="M19,13H5V11H19V13Z" />
                                        </svg>
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div class="leaf-placeholder" />
                    </svelte:element>
                {/each}
            </div>
            <div class="leaf bud {settings.show ? 'show-bud' : ''}">
                <div class="bud-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                    </svg>
                </div>
                <!-- <div class="leaf-bm-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path
                            d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z"
                        />
                    </svg>
                </div> -->
                <div class="bud-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M19,13H5V11H19V13Z" />
                    </svg>
                </div>
            </div>
        </div>
    {/each}

    <!-- new branch btn -->
    <div class="branch bud {settings.show ? 'show-bud' : ''}">
        <div class="branch-name-wrapper" aria-label="drag-handle">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="branch-name"
                on:click={() => {
                    tree.branches.push({
                        id: uuidv4(),
                        name: 'undefined',
                        leaves: [],
                    });
                    tree.branches = [...tree.branches];
                }}
            >
                <div class="bud-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                    </svg>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- <KomorebiBookmark bind:komorebi /> -->
